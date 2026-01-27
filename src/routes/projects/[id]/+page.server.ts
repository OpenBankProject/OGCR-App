import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_PROJECT, ENTITY_PARCEL, ENTITY_PREFIX } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const projectId = params.id;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			project: null,
			parcels: null,
			error: null
		};
	}

	try {
		// Fetch project and parcels in parallel
		const [projectResponse, parcelsResponse] = await Promise.all([
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PROJECT}/${projectId}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PARCEL}?${ENTITY_PREFIX}project_id=${projectId}`,
				accessToken
			)
		]);

		// Unwrap project response
		const project = projectResponse[ENTITY_PROJECT] || projectResponse;

		const parcelIdField = `${ENTITY_PREFIX}parcel_id`;
		const rawParcels = parcelsResponse[`${ENTITY_PARCEL}_list`] || [];
		const parcels = rawParcels.map((p: Record<string, unknown>) => ({
			...p,
			parcel_id: p[parcelIdField]
		}));

		return {
			isAuthenticated: true,
			project,
			parcels,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				project: null,
				parcels: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			project: null,
			parcels: null,
			error: errorMessage
		};
	}
};
