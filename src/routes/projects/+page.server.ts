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
			error: null
		};
	}

	try {
		const response = await obp_requests.get(
			`/obp/dynamic-entity/${ENTITY_PROJECT}`,
			accessToken
		);

		// Extract project list and normalize the ID field for easier template access
		const projectIdField = `${ENTITY_PREFIX}project_id`;
		const rawProjects = response[`${ENTITY_PROJECT}_list`] || [];
		const projects = rawProjects.map((p: Record<string, unknown>) => ({
			...p,
			project_id: p[projectIdField]
		}));

		return {
			isAuthenticated: true,
			projects,
			rawResponse: response,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				projects: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			projects: null,
			error: errorMessage
		};
	}
};
