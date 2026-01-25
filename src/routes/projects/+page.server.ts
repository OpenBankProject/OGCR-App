import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_PROJECT } from '$lib/constants/entities';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			projects: null,
			error: null
		};
	}

	try {
		const response = await obp_requests.get(
			`/obp/v5.1.0/management/system-dynamic-entities/${ENTITY_PROJECT}`,
			accessToken
		);

		return {
			isAuthenticated: true,
			projects: response[`${ENTITY_PROJECT}_list`] || [],
			error: null
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			projects: null,
			error: errorMessage
		};
	}
};
