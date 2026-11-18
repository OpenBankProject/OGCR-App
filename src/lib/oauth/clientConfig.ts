import { env } from '$env/dynamic/private';

/**
 * Whether this app has a client (id and secret) for a login provider.
 *
 * OBP-API lists the providers people may log in with at /obp/v5.1.0/well-known. A provider
 * it lists but this app has no client for is not used here: it is neither healthy nor
 * unhealthy, so /status does not check it and /setup shows it as not used.
 */
export function hasClientFor(provider: string): boolean {
	const set = (value: string | undefined) => !!value && value.trim() !== '';
	switch (provider) {
		case 'obp-oidc':
			return set(env.OBP_OAUTH_CLIENT_ID) && set(env.OBP_OAUTH_CLIENT_SECRET);
		case 'keycloak':
			return set(env.KEYCLOAK_OAUTH_CLIENT_ID) && set(env.KEYCLOAK_OAUTH_CLIENT_SECRET);
		case 'google':
			return set(env.GOOGLE_OAUTH_CLIENT_ID) && set(env.GOOGLE_OAUTH_CLIENT_SECRET);
		default:
			return false;
	}
}
