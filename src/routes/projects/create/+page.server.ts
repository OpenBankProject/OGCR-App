import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_PROJECT, ENTITY_PREFIX } from '$lib/constants/entities';
import { redirect } from '@sveltejs/kit';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false
		};
	}

	return {
		isAuthenticated: true,
		entityPrefix: ENTITY_PREFIX
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;

		if (!accessToken) {
			return {
				success: false,
				error: 'Not authenticated'
			};
		}

		const formData = await request.formData();
		const project_owner = formData.get('project_owner') as string;

		const projectIdField = `${ENTITY_PREFIX}projectId`;
		const body = {
			[ENTITY_PROJECT]: {
				[projectIdField]: crypto.randomUUID(),
				project_owner
			}
		};

		try {
			const response = await obp_requests.post(
				`/obp/dynamic-entity/${ENTITY_PROJECT}`,
				body,
				accessToken
			);

			return {
				success: true,
				response
			};
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return {
					success: false,
					error: error.message,
					errorDetails: error.toJSON()
				};
			}
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return {
				success: false,
				error: errorMessage
			};
		}
	}
};
