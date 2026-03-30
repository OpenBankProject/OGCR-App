import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			activities: null,
			error: null
		};
	}

	try {
		const response = await obp_requests.get(
			`/obp/dynamic-entity/${ENTITY_ACTIVITY}`,
			accessToken
		);

		const activities = response[`${ENTITY_ACTIVITY}_list`] || [];

		return {
			isAuthenticated: true,
			activities,
			rawResponse: response,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				activities: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			activities: null,
			error: errorMessage
		};
	}
};
