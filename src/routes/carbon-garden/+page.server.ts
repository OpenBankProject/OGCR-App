import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCarbonGarden } from '$lib/registry/carbonGarden';

/**
 * For logged in users only: the Carbon Garden reads plans and parcels, which are not public. Someone not logged in is sent to log in and brought back here. Reads the Queries once with the user's token and hands the whole picture to the browser, which animates it.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	if (!accessToken) {
		redirect(302, `/login?target_location=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return getCarbonGarden(accessToken);
};
