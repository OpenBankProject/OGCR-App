import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY, entityPathV7 } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getOperatorsForUser, operatorIdSet } from '$lib/marketplace/ownership';
import { getListing, saveListing } from '$lib/marketplace/listings';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const userEmail = session.data.user?.email ?? null;
	const activityId = params.id;

	if (!accessToken) {
		return { isAuthenticated: false };
	}

	try {
		const operators = await getOperatorsForUser(accessToken, userEmail);
		const ownedOperatorIds = operatorIdSet(operators);

		const activityResponse = await obp_requests.get(
			`${entityPathV7(ENTITY_ACTIVITY)}/${activityId}`,
			accessToken
		);
		const activity = (activityResponse[ENTITY_ACTIVITY] || activityResponse) as Record<
			string,
			unknown
		> & { operator_id?: string };

		// Ownership gate: you can only list an activity operated by you.
		const owned = !!activity.operator_id && ownedOperatorIds.has(activity.operator_id);
		if (!owned) {
			return {
				isAuthenticated: true,
				owned: false,
				activity,
				listing: null,
				error: null
			};
		}

		const listing = await getListing(activityId);

		return {
			isAuthenticated: true,
			owned: true,
			activity,
			listing,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				owned: false,
				activity: null,
				listing: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { isAuthenticated: true, owned: false, activity: null, listing: null, error: message };
	}
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;
		const userEmail = session.data.user?.email ?? null;
		const activityId = params.id;

		if (!accessToken) {
			return { success: false, error: 'Not authenticated' };
		}

		try {
			// Re-verify ownership server-side before writing — never trust the form alone.
			const operators = await getOperatorsForUser(accessToken, userEmail);
			const ownedOperatorIds = operatorIdSet(operators);

			const activityResponse = await obp_requests.get(
				`${entityPathV7(ENTITY_ACTIVITY)}/${activityId}`,
				accessToken
			);
			const activity = (activityResponse[ENTITY_ACTIVITY] || activityResponse) as {
				operator_id?: string;
			};

			if (!activity.operator_id || !ownedOperatorIds.has(activity.operator_id)) {
				return {
					success: false,
					error: 'You are not the operator of this activity, so you cannot list it.'
				};
			}

			const formData = await request.formData();
			const str = (k: string) => ((formData.get(k) as string) ?? '').trim();
			const numOrUndef = (k: string) => {
				const raw = str(k);
				if (raw === '') return undefined;
				const n = Number(raw);
				return Number.isFinite(n) ? n : undefined;
			};

			const listing = await saveListing(activityId, {
				operator_id: activity.operator_id,
				listed: formData.get('listed') === 'on',
				// Marketing overlay
				summary: str('summary') || undefined,
				image: str('image') || undefined,
				media_links: str('media_links') || undefined,
				website: str('website') || undefined,
				// Commercial terms (marketplace-owned)
				price_per_credit: numOrUndef('price_per_credit'),
				credits_available: numOrUndef('credits_available'),
				listed_by_email: userEmail ?? undefined
			});

			return { success: true, listing };
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return { success: false, error: error.message, errorDetails: error.toJSON() };
			}
			const message = error instanceof Error ? error.message : 'Unknown error';
			return { success: false, error: message };
		}
	}
};
