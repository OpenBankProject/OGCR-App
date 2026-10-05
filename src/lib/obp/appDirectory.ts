import { env } from '$env/dynamic/public';

/**
 * Where the other apps of this OBP deployment live (API Manager, MCP server, Portal…),
 * as OBP-API publishes them at GET /obp/v6.0.0/app-directory. Public: no access token.
 *
 * Asking OBP rather than configuring each URL here keeps the app pointing at the same
 * deployment as the OBP it already talks to, with one source of truth for the links.
 */
export const APP_DIRECTORY_PATH = '/obp/v6.0.0/app-directory';

/** The app-directory names this app links to. */
export const API_EXPLORER_URL = 'public_obp_api_explorer_url';
export const API_MANAGER_URL = 'public_obp_api_manager_url';
export const MCP_URL = 'public_obp_mcp_url';
export const PORTAL_URL = 'public_obp_portal_url';

/** The Portal's guide to authenticating against OBP (OAuth2 / OpenID Connect). */
export const PORTAL_AUTHENTICATION_PATH = '/developers/oauth2-oidc';

/** name -> URL, for the entries that hold an http(s) URL. */
export type AppDirectory = Record<string, string>;

/** Turns the endpoint's `{ app_directory: [{ name, value }] }` into a lookup, dropping
 *  anything that is not an http(s) URL so it can be used as a link as-is. */
export function parseAppDirectory(body: unknown): AppDirectory {
	const entries = (body as { app_directory?: unknown })?.app_directory;
	const directory: AppDirectory = {};
	if (!Array.isArray(entries)) return directory;
	for (const entry of entries) {
		const { name, value } = (entry ?? {}) as { name?: unknown; value?: unknown };
		if (typeof name === 'string' && typeof value === 'string' && /^https?:\/\//i.test(value)) {
			directory[name] = value;
		}
	}
	return directory;
}

/**
 * Fetch the app directory. Never throws: the links it feeds are extras, so an OBP that
 * is down or too old to have the endpoint just means they are not shown.
 *
 * Pass the `fetch` from a SvelteKit `load` so the request participates in SSR.
 */
export async function getAppDirectory(fetchFn: typeof fetch = fetch): Promise<AppDirectory> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	try {
		const response = await fetchFn(`${base}${APP_DIRECTORY_PATH}`);
		if (!response.ok) return {};
		return parseAppDirectory(await response.json());
	} catch {
		return {};
	}
}
