import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_ACTIVITY,
	ENTITY_OPERATOR,
	ENTITY_ACTIVITY_VERIFICATION
} from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getAllListings, type ActivityListing } from '$lib/marketplace/listings';

interface OperatorRecord {
	operator_id?: string;
	legal_name?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			activities: null,
			verifiedActivityIds: [] as string[],
			referencedActivityIds: [] as string[],
			error: null
		};
	}

	try {
		const response = await obp_requests.get(`/obp/dynamic-entity/${ENTITY_ACTIVITY}`, accessToken);
		const activities = (response[`${ENTITY_ACTIVITY}_list`] || []) as Array<
			Record<string, unknown> & { operator_id?: string }
		>;

		// Resolve operator names via activity.operator_id -> operator.legal_name.
		// Kept in its own try so an operator-fetch failure still renders the activities.
		const operatorNames = new Map<string, string>();
		try {
			const opResponse = await obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_OPERATOR}`,
				accessToken
			);
			const operators = (opResponse[`${ENTITY_OPERATOR}_list`] || []) as OperatorRecord[];
			for (const op of operators) {
				if (op.operator_id && op.legal_name) operatorNames.set(op.operator_id, op.legal_name);
			}
		} catch {
			// Operators unavailable — cards fall back to "Unknown operator".
		}

		// Resolve verification status per activity via activity_verification.activity_id.
		// verifiedActivityIds  = referenced by a verification whose status_code is "verified".
		// referencedActivityIds = referenced by ANY verification (used to derive "unverified").
		// Kept in its own try so a verification-fetch failure still renders the activities.
		const verifiedActivityIds = new Set<string>();
		const referencedActivityIds = new Set<string>();
		try {
			const verResponse = await obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY_VERIFICATION}`,
				accessToken
			);
			const verifications = (verResponse[`${ENTITY_ACTIVITY_VERIFICATION}_list`] || []) as Array<{
				activity_id?: string;
				status_code?: string;
			}>;
			for (const v of verifications) {
				if (!v.activity_id) continue;
				referencedActivityIds.add(v.activity_id);
				if (v.status_code === 'verified') verifiedActivityIds.add(v.activity_id);
			}
		} catch {
			// Verifications unavailable — the verification filter falls back to "All".
		}

		// Merge the marketplace listing overlay (marketing + commercial terms).
		// The registry is the boss of the activity's facts; our DB is the boss of
		// price/credits and the marketing presentation. Kept in its own try so a
		// listings-store failure still renders the registry activities.
		let listings = new Map<string, ActivityListing>();
		try {
			listings = await getAllListings();
		} catch {
			// Listings unavailable — cards fall back to registry-only data.
		}

		const enriched = activities.map((a) => {
			const listing = a.activity_id ? listings.get(a.activity_id as string) : undefined;
			return {
				...a,
				operator_name: a.operator_id ? (operatorNames.get(a.operator_id) ?? null) : null,
				// Listing overlay wins for marketing + commercial fields.
				summary: listing?.summary ?? a.summary,
				image: listing?.image ?? a.image,
				price_per_credit: listing?.price_per_credit ?? null,
				credits_available: listing?.credits_available ?? null,
				listed: listing?.listed ?? false
			};
		});

		return {
			isAuthenticated: true,
			activities: enriched,
			verifiedActivityIds: [...verifiedActivityIds],
			referencedActivityIds: [...referencedActivityIds],
			rawResponse: response,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				activities: null,
				verifiedActivityIds: [] as string[],
				referencedActivityIds: [] as string[],
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			activities: null,
			verifiedActivityIds: [] as string[],
			referencedActivityIds: [] as string[],
			error: errorMessage
		};
	}
};
