import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import type { DynamicEntityDefinition } from '$lib/obp/types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			dynamicEntities: null,
			error: null
		};
	}

	try {
		// Fetch dynamic entities from OBP API
		const response = await obp_requests.get('/obp/v5.1.0/management/dynamic-entities', accessToken);

		return {
			isAuthenticated: true,
			dynamicEntities: response.dynamic_entities as DynamicEntityDefinition[],
			error: null
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			dynamicEntities: null,
			error: errorMessage
		};
	}
};
