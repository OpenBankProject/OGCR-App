/**
 * What the /setup page shows: whether each thing this app needs is in place.
 *
 * Three groups:
 *   - the app's own settings (environment variables), shown as set or not set. A secret
 *     or a client id is never shown, only whether it is there;
 *   - OBP-API and the login providers, as this server sees them now;
 *   - the registry in OBP-API: the space, the Dynamic Entities the app reads and writes,
 *     and the Dynamic Queries the public registry pages call without a token.
 *
 * Everything here is public (resource docs, the bank, anonymous Query calls), so the
 * page needs no login. Each check stands alone: one failing never hides the others.
 */

import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { ENTITY_CONSTANTS, ENTITY_ROLE_BANK_ID, ENTITY_SPACE_ID } from '$lib/constants/entities';
import { REGISTRY_ACTIVITIES_PATH } from '$lib/registry/activities';
import {
	REGISTRY_ACTIVITY_CERTIFICATES_PATH,
	REGISTRY_ACTIVITY_PATH,
	REGISTRY_ACTIVITY_PRACTICES_PATH,
	REGISTRY_ACTIVITY_SDGS_PATH
} from '$lib/registry/activityDetail';
import { oauth2ProviderManager, type ProviderStatus } from '$lib/oauth/providerManager';
import { hasClientFor } from '$lib/oauth/clientConfig';

/**
 * ok: in place. missing: needed and not there. off: optional and not set up.
 * unknown: could not be checked, for example because OBP-API did not answer.
 */
export type SetupState = 'ok' | 'missing' | 'off' | 'unknown';

export interface SetupItem {
	name: string;
	state: SetupState;
	/** What was found, or what to do about it. */
	detail: string;
}

export interface SetupSection {
	title: string;
	description: string;
	items: SetupItem[];
}

export interface SetupReport {
	sections: SetupSection[];
	counts: Record<SetupState, number>;
}

/** The Queries the public registry pages call, with the script name that deploys each. */
export const REGISTRY_QUERIES: { path: string; source: string; usedBy: string }[] = [
	{ path: REGISTRY_ACTIVITIES_PATH, source: 'registry_activities_query', usedBy: 'Registry list' },
	{
		path: REGISTRY_ACTIVITY_PATH,
		source: 'registry_activity_query',
		usedBy: 'Activity page and registry map'
	},
	{
		path: REGISTRY_ACTIVITY_PRACTICES_PATH,
		source: 'registry_activity_practices_query',
		usedBy: 'Activity page: practices'
	},
	{
		path: REGISTRY_ACTIVITY_SDGS_PATH,
		source: 'registry_activity_sdgs_query',
		usedBy: 'Activity page: Sustainable Development Goals'
	},
	{
		path: REGISTRY_ACTIVITY_CERTIFICATES_PATH,
		source: 'registry_activity_certificates_query',
		usedBy: 'Activity page: certificates'
	}
];

const isSet = (value: string | undefined) => !!value && value.trim() !== '';

/** A setting the app cannot work without. */
function required(name: string, value: string | undefined, shown: boolean): SetupItem {
	if (!isSet(value)) return { name, state: 'missing', detail: 'Not set.' };
	return { name, state: 'ok', detail: shown ? value!.trim() : 'Set.' };
}

/** A setting that turns on something extra. */
function optional(name: string, value: string | undefined, whenOff: string): SetupItem {
	if (!isSet(value)) return { name, state: 'off', detail: `Not set. ${whenOff}` };
	return { name, state: 'ok', detail: value!.trim() };
}

/** A login client: an id and a secret, both needed, neither shown. */
function client(name: string, id: string | undefined, secret: string | undefined): SetupItem {
	if (isSet(id) && isSet(secret))
		return { name, state: 'ok', detail: 'Client id and secret are set.' };
	if (isSet(id) || isSet(secret)) {
		return {
			name,
			state: 'missing',
			detail: `Only the ${isSet(id) ? 'client id' : 'secret'} is set; both are needed.`
		};
	}
	return { name, state: 'off', detail: 'Not set. People cannot log in with this provider.' };
}

export function settingsSection(): SetupSection {
	const secret = privateEnv.SESSION_SECRET;
	const sessionSecret: SetupItem = !isSet(secret)
		? {
				name: 'SESSION_SECRET',
				state: 'missing',
				detail: 'Not set. Sessions are not signed safely.'
			}
		: secret!.length < 16
			? { name: 'SESSION_SECRET', state: 'missing', detail: 'Set, but shorter than 16 characters.' }
			: { name: 'SESSION_SECRET', state: 'ok', detail: 'Set.' };

	return {
		title: 'App settings',
		description:
			'Environment variables this app reads. Secrets and client ids are never shown, only whether they are set.',
		items: [
			required('PUBLIC_OBP_BASE_URL', publicEnv.PUBLIC_OBP_BASE_URL, true),
			required('APP_CALLBACK_URL', privateEnv.APP_CALLBACK_URL, true),
			sessionSecret,
			{
				name: 'OBP_ENTITY_SPACE_ID',
				state: 'ok',
				detail: ENTITY_SPACE_ID
					? `Space ${ENTITY_SPACE_ID}${isSet(privateEnv.OBP_ENTITY_SPACE_ID) ? '' : ' (the default)'}.`
					: 'Empty: the entities are at system level.'
			},
			client(
				'OBP-OIDC client (OBP_OAUTH_CLIENT_ID, OBP_OAUTH_CLIENT_SECRET)',
				privateEnv.OBP_OAUTH_CLIENT_ID,
				privateEnv.OBP_OAUTH_CLIENT_SECRET
			),
			client(
				'Keycloak client (KEYCLOAK_OAUTH_CLIENT_ID, KEYCLOAK_OAUTH_CLIENT_SECRET)',
				privateEnv.KEYCLOAK_OAUTH_CLIENT_ID,
				privateEnv.KEYCLOAK_OAUTH_CLIENT_SECRET
			),
			client(
				'Google client (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET)',
				privateEnv.GOOGLE_OAUTH_CLIENT_ID,
				privateEnv.GOOGLE_OAUTH_CLIENT_SECRET
			),
			optional('REDIS_HOST', privateEnv.REDIS_HOST, 'The app uses its default Redis host.'),
			optional(
				'PUBLIC_CHAIN_EXPLORER_URL',
				publicEnv.PUBLIC_CHAIN_EXPLORER_URL,
				'Chain values on /chain are plain text, not links.'
			),
			optional(
				'TOKENIZER_HEALTH_URL',
				privateEnv.TOKENIZER_HEALTH_URL,
				'The tokenizer is not shown on /status.'
			)
		]
	};
}

interface ResourceDoc {
	request_verb?: string;
	specified_url?: string;
}

/** The entity names that have a create endpoint in the space's resource docs. */
export function entitiesInResourceDocs(docs: ResourceDoc[]): Set<string> {
	const names = new Set<string>();
	for (const doc of docs) {
		if (doc.request_verb !== 'POST') continue;
		const match = /\/dynamic-entity\/(?:banks\/[^/]+\/)?([^/{}]+)$/.exec(doc.specified_url ?? '');
		if (match) names.add(match[1]);
	}
	return names;
}

/** One item per entity the app uses, from the names the space's resource docs list. */
export function entityItems(present: Set<string> | null, why: string): SetupItem[] {
	const wanted = [...new Set(Object.values(ENTITY_CONSTANTS))].sort();
	return wanted.map((entityName) =>
		present === null
			? { name: entityName, state: 'unknown', detail: why }
			: present.has(entityName)
				? { name: entityName, state: 'ok', detail: 'Defined in the space.' }
				: {
						name: entityName,
						state: 'missing',
						detail: 'Not defined. Create it with OGCR-DynamicEntities.'
					}
	);
}

/**
 * One item per login provider. People can log in with a provider only when OBP-API lists
 * it at /obp/v5.1.0/well-known (it then has a url), this app has a client for it, and
 * the app could start it. A provider OBP-API does not list, or one this app has no
 * client for, is simply not used. People need at least one that works.
 */
export function loginItems(
	providers: ProviderStatus[],
	hasClient: Record<string, boolean>
): SetupItem[] {
	const items = providers.map((provider): SetupItem => {
		const name = `Login with ${provider.provider}`;
		if (!provider.url) return { name, state: 'off', detail: 'OBP-API does not list it.' };
		if (!hasClient[provider.provider]) {
			return { name, state: 'off', detail: 'OBP-API lists it, but this app has no client for it.' };
		}
		if (provider.status === 'available') return { name, state: 'ok', detail: 'Ready.' };
		return { name, state: 'missing', detail: provider.error ?? 'Could not start.' };
	});
	if (!items.some((item) => item.state === 'ok')) {
		items.unshift({
			name: 'Login',
			state: 'missing',
			detail: 'No login provider is ready, so nobody can log in.'
		});
	}
	return items;
}

export function countStates(sections: SetupSection[]): Record<SetupState, number> {
	const counts: Record<SetupState, number> = { ok: 0, missing: 0, off: 0, unknown: 0 };
	for (const section of sections) for (const item of section.items) counts[item.state] += 1;
	return counts;
}

function errorText(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown error';
}

export async function buildSetupReport(fetchFn: typeof fetch = fetch): Promise<SetupReport> {
	const base = publicEnv.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';

	// OBP-API itself. If it does not answer, the registry checks below are unknown.
	let apiItem: SetupItem;
	let apiAnswered = false;
	try {
		const response = await fetchFn(`${base}/obp/v5.1.0/root`);
		if (response.ok) {
			apiAnswered = true;
			const root = (await response.json()) as { version?: string; git_commit?: string };
			const commit = root.git_commit ? `, commit ${root.git_commit.slice(0, 8)}` : '';
			apiItem = {
				name: 'OBP-API',
				state: 'ok',
				detail: `Answered at ${base} (${root.version ?? 'unknown version'}${commit}).`
			};
		} else {
			apiItem = {
				name: 'OBP-API',
				state: 'missing',
				detail: `HTTP ${response.status} from ${base}/obp/v5.1.0/root.`
			};
		}
	} catch (error) {
		apiItem = {
			name: 'OBP-API',
			state: 'missing',
			detail: `Could not reach ${base}: ${errorText(error)}`
		};
	}

	const providers = oauth2ProviderManager.getAllProviders();
	const providerItems = loginItems(
		providers,
		Object.fromEntries(
			providers.map((provider) => [provider.provider, hasClientFor(provider.provider)])
		)
	);

	const unreachable = 'OBP-API did not answer, so this could not be checked.';

	// The space (bank). System level entities have no bank to check.
	let spaceItem: SetupItem;
	if (!ENTITY_SPACE_ID) {
		spaceItem = { name: 'Space', state: 'ok', detail: 'System level: no bank needed.' };
	} else if (!apiAnswered) {
		spaceItem = { name: `Space ${ENTITY_SPACE_ID}`, state: 'unknown', detail: unreachable };
	} else {
		try {
			const response = await fetchFn(
				`${base}/obp/v5.1.0/banks/${encodeURIComponent(ENTITY_SPACE_ID)}`
			);
			spaceItem = response.ok
				? { name: `Space ${ENTITY_SPACE_ID}`, state: 'ok', detail: 'The bank exists in OBP-API.' }
				: {
						name: `Space ${ENTITY_SPACE_ID}`,
						state: 'missing',
						detail: `HTTP ${response.status}: the bank does not exist. Create it with OGCR-DynamicEntities.`
					};
		} catch (error) {
			spaceItem = { name: `Space ${ENTITY_SPACE_ID}`, state: 'unknown', detail: errorText(error) };
		}
	}

	// The Dynamic Entities, from the space's public resource docs.
	let present: Set<string> | null = null;
	let entitiesWhy = unreachable;
	if (apiAnswered) {
		const docsPath = `/obp/v6.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/resource-docs/v6.0.0/obp?content=dynamic`;
		try {
			const response = await fetchFn(`${base}${docsPath}`);
			if (response.ok) {
				const body = (await response.json()) as { resource_docs?: ResourceDoc[] };
				present = entitiesInResourceDocs(body.resource_docs ?? []);
			} else {
				entitiesWhy = `HTTP ${response.status} from ${docsPath}.`;
			}
		} catch (error) {
			entitiesWhy = errorText(error);
		}
	}

	// The Queries, called exactly as the public pages call them: no token.
	const queryItems = await Promise.all(
		REGISTRY_QUERIES.map(async (query): Promise<SetupItem> => {
			const name = query.path.replace(/^.*\/dynamic-resource-doc/, '');
			if (!apiAnswered) return { name, state: 'unknown', detail: unreachable };
			try {
				const response = await fetchFn(`${base}${query.path}`);
				await response.body?.cancel();
				if (response.ok)
					return { name, state: 'ok', detail: `${query.usedBy}. Answers without a token.` };
				const fix = `Deploy it with: python3 dynamic_resource_docs.py create ${query.source}`;
				if (response.status === 404)
					return {
						name,
						state: 'missing',
						detail: `${query.usedBy}. Not deployed (HTTP 404). ${fix}`
					};
				return {
					name,
					state: 'missing',
					detail: `${query.usedBy}. HTTP ${response.status} without a token.`
				};
			} catch (error) {
				return { name, state: 'unknown', detail: errorText(error) };
			}
		})
	);

	const sections: SetupSection[] = [
		settingsSection(),
		{
			title: 'OBP-API and login',
			description: 'What this server sees right now.',
			items: [apiItem, ...providerItems]
		},
		{
			title: 'Registry space',
			description: `The bank that holds the registry, and the Dynamic Entities this app reads and writes there (space ${ENTITY_ROLE_BANK_ID}).`,
			items: [spaceItem, ...entityItems(present, entitiesWhy)]
		},
		{
			title: 'Registry Queries',
			description:
				'Dynamic Queries the public registry pages call without a token. Each is deployed from OGCR-DynamicEntities.',
			items: queryItems
		}
	];

	return { sections, counts: countStates(sections) };
}
