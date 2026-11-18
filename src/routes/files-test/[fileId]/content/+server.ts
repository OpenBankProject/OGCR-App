import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';

/**
 * Passes a file's content through from OBP-API, so the test page can show or download it: a browser
 * link cannot send the token itself. OBP's own headers are kept, including the nosniff and sandbox
 * Content-Security-Policy that stop a file running as a page of this site.
 *
 * A public file is served to anyone, logged in or not, from OBP's anonymous public-files endpoint,
 * which serves public files only. A logged-in user is first tried on the role-guarded endpoint, which
 * also serves their private files and files shared with them; if that refuses, the public endpoint
 * is tried, so a public file someone else owns still opens.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const accessToken = locals.session.data.oauth?.access_token;

	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const inline = url.searchParams.get('inline') === 'true' ? '?inline=true' : '';
	const contentPath = (collection: 'files' | 'public-files') =>
		`/obp/v7.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/${collection}/${encodeURIComponent(params.fileId)}/content${inline}`;

	let response: Response | undefined;
	if (accessToken) {
		response = await fetch(`${base}${contentPath('files')}`, { headers: { Authorization: `Bearer ${accessToken}` } });
	}
	if (!response?.ok) {
		const publicResponse = await fetch(`${base}${contentPath('public-files')}`);
		if (publicResponse.ok) {
			response = publicResponse;
		} else if (!response) {
			// Not logged in and the file is not public (or does not exist)
			error(401, 'This file is not public. Log in to see it.');
		}
		// Otherwise keep OBP's refusal from the role-guarded endpoint, which says why
	}

	const headers = new Headers();
	for (const name of ['content-type', 'content-disposition', 'etag', 'x-content-type-options', 'content-security-policy', 'cache-control']) {
		const value = response!.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(response!.body, { status: response!.status, headers });
};
