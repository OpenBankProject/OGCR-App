import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_PARCEL,
	ENTITY_PARCEL_ACTIVITY,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	entityPathV7,
	unwrapV7List
} from '$lib/constants/entities';

/**
 * The original (off-chain) parcel record. Parcels are not public, so this needs a login;
 * the chain page links here from a parcel token and from an activity token's parcels.
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	const parcelId = params.id;

	if (!accessToken) {
		return { isAuthenticated: false, parcelId, parcel: null, error: null };
	}

	const byParcel = `?parcel_id=${encodeURIComponent(parcelId)}`;
	try {
		const [parcelResponse, ownerVerResponse, activityLinkResponse] = await Promise.all([
			obp_requests.get(
				`${entityPathV7(ENTITY_PARCEL)}/${encodeURIComponent(parcelId)}`,
				accessToken
			),
			obp_requests.get(
				`${entityPathV7(ENTITY_PARCEL_OWNERSHIP_VERIFICATION)}${byParcel}`,
				accessToken
			),
			obp_requests.get(`${entityPathV7(ENTITY_PARCEL_ACTIVITY)}${byParcel}`, accessToken)
		]);

		const parcel = (parcelResponse?.[ENTITY_PARCEL] ?? parcelResponse) as Record<string, unknown>;
		const activityIds = [
			...new Set(
				unwrapV7List(activityLinkResponse, ENTITY_PARCEL_ACTIVITY)
					.map((link) => link.activity_id)
					.filter((id): id is string => typeof id === 'string' && id !== '')
			)
		];

		return {
			isAuthenticated: true,
			parcelId,
			parcel,
			ownerVerifications: unwrapV7List(ownerVerResponse, ENTITY_PARCEL_OWNERSHIP_VERIFICATION),
			activityIds,
			error: null
		};
	} catch (error) {
		return {
			isAuthenticated: true,
			parcelId,
			parcel: null,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
};
