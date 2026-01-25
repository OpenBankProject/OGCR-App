import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_PROJECT, ENTITY_PREFIX } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			projects: null,
			error: null,
			projectIdField: `${ENTITY_PREFIX}projectId`
		};
	}

	try {
		const response = await obp_requests.get(
			`/obp/dynamic-entity/${ENTITY_PROJECT}`,
			accessToken
		);

		return {
			isAuthenticated: true,
			projects: response[`${ENTITY_PROJECT}_list`] || [],
			rawResponse: response,
			error: null,
			projectIdField: `${ENTITY_PREFIX}projectId`
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				projects: null,
				error: error.message,
				errorDetails: error.toJSON(),
				projectIdField: `${ENTITY_PREFIX}projectId`
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			projects: null,
			error: errorMessage,
			projectIdField: `${ENTITY_PREFIX}projectId`
		};
	}
};
