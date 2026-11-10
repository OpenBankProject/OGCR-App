import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';

/**
 * Passes a file's content through from OBP-API with the session's token, so the test page can show
 * or download it: a browser link cannot send the token itself. OBP's own headers are kept, including
 * the nosniff and sandbox Content-Security-Policy that stop a file running as a page of this site.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	if (!accessToken) error(401, 'Log in to see the file.');

	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const inline = url.searchParams.get('inline') === 'true' ? '?inline=true' : '';
	const path = `/obp/v7.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/files/${encodeURIComponent(params.fileId)}/content${inline}`;
	const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });

	const headers = new Headers();
	for (const name of ['content-type', 'content-disposition', 'etag', 'x-content-type-options', 'content-security-policy', 'cache-control']) {
		const value = response.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(response.body, { status: response.status, headers });
};
