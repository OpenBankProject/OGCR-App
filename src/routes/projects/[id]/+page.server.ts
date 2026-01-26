import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_PROJECT } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

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
		// Use the dynamic entity endpoint to get a single project by ID
		const response = await obp_requests.get(
			`/obp/dynamic-entity/${ENTITY_PROJECT}/${projectId}`,
			accessToken
		);

		// Response is wrapped in entity name, e.g. { ogcr5_project: { ... } }
		// Unwrap to get the actual project object
		const project = response[ENTITY_PROJECT] || response;

		return {
			isAuthenticated: true,
			project,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				project: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			project: null,
			error: errorMessage
		};
	}
};
