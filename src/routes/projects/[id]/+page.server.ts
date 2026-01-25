import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_PROJECT } from '$lib/constants/entities';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const projectId = params.id;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			project: null,
			error: null
		};
	}

	try {
		const response = await obp_requests.get(
			`/obp/v5.1.0/management/system-dynamic-entities/${ENTITY_PROJECT}/${projectId}`,
			accessToken
		);

		return {
			isAuthenticated: true,
			project: response,
			error: null
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			project: null,
			error: errorMessage
		};
	}
};
