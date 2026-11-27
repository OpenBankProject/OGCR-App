/**
 * Guards against open-redirect: only same-origin relative paths are allowed
 * as a post-login/post-action redirect target. Rejects absolute URLs,
 * protocol-relative URLs (`//evil.com`), and backslash variants (`/\evil.com`)
 * that browsers also treat as protocol-relative.
 */
export function isSafeRelativePath(path: string | null | undefined): path is string {
	if (!path) return false;
	if (!path.startsWith('/')) return false;
	if (path.startsWith('//')) return false;
	if (path.startsWith('/\\')) return false;
	if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false;
	return true;
}
