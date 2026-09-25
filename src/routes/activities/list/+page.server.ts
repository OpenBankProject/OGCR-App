import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getOperatorsForUser, operatorIdSet } from '$lib/marketplace/ownership';
import { getAllListings } from '$lib/marketplace/listings';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const userEmail = session.data.user?.email ?? null;

	if (!accessToken) {
		return { isAuthenticated: false };
	}

	try {
		// Ownership gate: which operators does this user control?
		const operators = await getOperatorsForUser(accessToken, userEmail);

		if (operators.length === 0) {
			return {
				isAuthenticated: true,
				userEmail,
				operators: [],
				activities: [],
				error: null
			};
		}

		const ownedOperatorIds = operatorIdSet(operators);

		// Only the user's own registry activities can be listed.
		const [activitiesResponse, listings] = await Promise.all([
			obp_requests.get(`/obp/dynamic-entity/${ENTITY_ACTIVITY}`, accessToken),
			getAllListings()
		]);

		const allActivities = (activitiesResponse[`${ENTITY_ACTIVITY}_list`] || []) as Array<
			Record<string, unknown> & { activity_id?: string; operator_id?: string }
		>;

		const activities = allActivities
			.filter((a) => a.operator_id && ownedOperatorIds.has(a.operator_id))
			.map((a) => {
				const listing = a.activity_id ? listings.get(a.activity_id) : undefined;
				return {
					activity_id: a.activity_id,
					name: a.name,
					activity_type: a.activity_type,
					city: a.city,
					country_id: a.country_id,
					operator_id: a.operator_id,
					listed: listing?.listed ?? false,
					price_per_credit: listing?.price_per_credit ?? null,
					credits_available: listing?.credits_available ?? null
				};
			});

		return {
			isAuthenticated: true,
			userEmail,
			operators: operators.map((op) => ({
				operator_id: op.operator_id,
				legal_name: op.legal_name,
				email: op.email
			})),
			activities,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				userEmail,
				operators: [],
				activities: [],
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { isAuthenticated: true, userEmail, operators: [], activities: [], error: message };
	}
};
