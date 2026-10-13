/**
 * Reading a Domain API's OpenAPI document (BASE_PATH/openapi.json), which OBP serves with only
 * that Domain API's endpoints, at their published paths.
 */

/** A GET endpoint anyone may call, at its path under the Domain API's base path. */
export type PublicGet = {
	path: string;
	summary: string;
};

type Operation = { summary?: string; security?: unknown[] };
type OpenApiDocument = {
	security?: unknown[];
	paths?: Record<string, { get?: Operation }>;
};

/**
 * The GET endpoints that need no login and no path parameter, so each can be opened as it
 * stands. OBP leaves `security` out of an operation anyone may call and lists its login schemes
 * on the others; an operation without its own falls back to the document's, as OpenAPI defines.
 * Sorted by path.
 */
export function publicGets(document: OpenApiDocument): PublicGet[] {
	return Object.entries(document.paths ?? {})
		.flatMap(([path, item]) => {
			const get = item?.get;
			if (!get || /\{[^}]+\}/.test(path)) return [];
			const security = get.security ?? document.security;
			if (security && security.length > 0) return [];
			return [{ path, summary: get.summary ?? '' }];
		})
		.sort((a, b) => a.path.localeCompare(b.path));
}
