import { createLogger } from '$lib/utils/logger';
const logger = createLogger('HooksServer');
import type { Handle } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { sveltekitSessionHandle } from 'svelte-kit-sessions';
import RedisStore from 'svelte-kit-connect-redis';

import { oauth2ProviderManager } from '$lib/oauth/providerManager';
import { SessionOAuthHelper } from '$lib/oauth/sessionHelper';
import { redisService } from '$lib/redis/services/RedisService';
import { healthCheckRegistry, OIDCHealthCheckService } from '$lib/health-check';
import { RedisHealthCheckService } from '$lib/server/health-check/RedisHealthCheckService';
import { PUBLIC_OBP_BASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

// Constants
// Dev server port, must match `server.port` in vite.config.ts and the OAuth callback URL.
const DEFAULT_PORT = 5200;

// Check if the dev server is running on a port other than the one the OAuth callback
// URL was registered for. Skipped in production, where PORT is set by the container.
function checkServerPort() {
	if (process.env.NODE_ENV === 'production') return;
	const envPort = process.env.PORT || process.env.VITE_PORT || process.env.SERVER_PORT;

	if (envPort && parseInt(envPort) !== DEFAULT_PORT) {
		logger.warn(
			`Server is configured to run on port ${envPort}, but the default port is ${DEFAULT_PORT}.`
		);
		logger.warn(`This may cause issues with OAuth callbacks and other integrations.`);
	}
}

// Session cookie signing secret. Must be set in production; in development a fixed
// insecure default keeps `npm run dev` working without extra setup.
function resolveSessionSecret(): string {
	const secret = env.SESSION_SECRET;
	if (secret && secret.length >= 16) return secret;
	if (process.env.NODE_ENV === 'production' && !building) {
		throw new Error(
			'SESSION_SECRET must be set (at least 16 characters) in production. ' +
				'Generate one with: openssl rand -hex 32'
		);
	}
	logger.warn('SESSION_SECRET is not set (or too short). Using an insecure development default.');
	return 'ogcr-app-insecure-dev-session-secret';
}

// Startup scripts
checkServerPort();
const sessionSecret = resolveSessionSecret();

// Init Redis
const redisClient = redisService.getClient();

await oauth2ProviderManager.start();

function initHealthChecks() {
	healthCheckRegistry.register({
		serviceName: 'OBP API',
		url: `${PUBLIC_OBP_BASE_URL}/obp/v5.1.0/root`,
		details: {
			PUBLIC_OBP_BASE_URL
		}
	});

	// Sessions are stored in Redis, so its health belongs on the status page too
	healthCheckRegistry.register(new RedisHealthCheckService(redisService));

	// The tokenizer, if it exposes its health endpoint. It writes to the chain
	// and never to OBP, so nothing on the OBP side reveals whether it is
	// running: the chain mirror runs the opposite way, and a tokenization
	// backlog of zero on a dead tokenizer with no new work looks like success.
	// Optional, because the tokenizer is not part of every deployment; without
	// the URL it is simply not monitored rather than permanently unhealthy.
	const tokenizerHealthUrl = env.TOKENIZER_HEALTH_URL;
	if (tokenizerHealthUrl) {
		healthCheckRegistry.register({
			serviceName: 'OGCR Tokenizer',
			url: tokenizerHealthUrl,
			details: {
				TOKENIZER_HEALTH_URL: tokenizerHealthUrl
			}
		});
	}

	const testTokenDisabled = env.OIDC_HEALTHCHECK_TEST_TOKEN === 'false';
	const testTokenStrict = env.OIDC_HEALTHCHECK_TEST_TOKEN_STRICT === 'true';

	const credentialsFor = (provider: string): { clientId?: string; clientSecret?: string } => {
		if (testTokenDisabled) return {};
		switch (provider) {
			case 'obp-oidc':
				return { clientId: env.OBP_OAUTH_CLIENT_ID, clientSecret: env.OBP_OAUTH_CLIENT_SECRET };
			case 'keycloak':
				return {
					clientId: env.KEYCLOAK_OAUTH_CLIENT_ID,
					clientSecret: env.KEYCLOAK_OAUTH_CLIENT_SECRET
				};
			default:
				// Google does not support the client_credentials grant — skip the token test
				return {};
		}
	};

	// Register every known provider — including ones that failed to initialize —
	// so /status shows the full OIDC picture, not only the working providers.
	// The providerStatus callback reads live manager state, so a provider that
	// comes up (or dies) after boot flips on the status page without a restart.
	for (const p of oauth2ProviderManager.getAllProviders()) {
		const { clientId, clientSecret } = credentialsFor(p.provider);
		healthCheckRegistry.register(
			new OIDCHealthCheckService({
				serviceName: `OAuth2: ${p.provider}`,
				providerStatus: () => oauth2ProviderManager.getProviderStatus(p.provider),
				clientId,
				clientSecret,
				strictClientCredentials: testTokenStrict
			})
		);
	}

	healthCheckRegistry.startAll();
}

initHealthChecks();

function needsAuthorization(routeId: string): boolean {
	// protected routes are put in the /(protected)/ route group
	return routeId.startsWith('/(protected)/');
}

const checkSessionValidity: Handle = async ({ event, resolve }) => {
	const session = event.locals.session;
	if (session.data.user) {
		const sessionOAuth = SessionOAuthHelper.getSessionOAuth(session);
		if (!sessionOAuth) {
			logger.warn('No valid OAuth data found in session. Destroying session.');
			await session.destroy();
			throw redirect(302, event.url.pathname);
		}

		const sessionExpired = await sessionOAuth.client.checkAccessTokenExpiration(
			sessionOAuth.accessToken
		);

		if (sessionExpired) {
			try {
				await SessionOAuthHelper.refreshAccessToken(session);
				return await resolve(event);
			} catch (error) {
				logger.info(
					'Token refresh failed - redirecting user to login (normal OAuth behavior):',
					error
				);
				logger.info('Destroying expired session.');
				await session.destroy();
				throw redirect(302, event.url.pathname);
			}
		}

		logger.debug('Session is valid for user:', session.data.user?.username);
		return await resolve(event);
	}

	return await resolve(event);
};

// Middleware to check user authorization
const checkAuthorization: Handle = async ({ event, resolve }) => {
	const session = event.locals.session;
	const routeId = event.route.id;

	if (!!routeId && needsAuthorization(routeId)) {
		logger.debug('Checking authorization for user route:', event.url.pathname);
		if (!oauth2ProviderManager.isReady()) {
			logger.warn('OAuth2 providers not ready');
			throw error(503, 'Service Unavailable. Please try again later.');
		}

		if (!session || !session.data.user) {
			const targetLocation = encodeURIComponent(event.url.pathname + event.url.search);
			return new Response(null, {
				status: 302,
				headers: {
					Location: `/login?target_location=${targetLocation}`
				}
			});
		} else {
			logger.debug('User is authenticated:', session.data.user);
		}
	}

	const response = await resolve(event);
	return response;
};

// Init SvelteKitSessions
export const handle: Handle = sequence(
	sveltekitSessionHandle({
		name: 'ogcr-app-connect.sid',
		secret: sessionSecret,
		store: new RedisStore({
			client: redisClient,
			prefix: 'ogcr-app-session:'
		})
	}),
	checkSessionValidity,
	checkAuthorization
);

// Declare types for the Session
declare module 'svelte-kit-sessions' {
	interface SessionData {
		user?: {
			user_id: string;
			email: string;
			username: string;
			entitlements: {
				list: Array<{
					entitlement_id: string;
					role_name: string;
					bank_id: string;
				}>;
			};
			views: {
				list: object[];
			};
		};
		oauth?: {
			access_token: string;
			refresh_token?: string;
			provider: string;
		};
		target_location?: string;
	}
}
