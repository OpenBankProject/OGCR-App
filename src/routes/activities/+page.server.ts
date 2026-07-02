import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_ACTIVITY,
	ENTITY_OPERATOR,
	ENTITY_ACTIVITY_VERIFICATION
} from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getAllListings, type ActivityListing } from '$lib/marketplace/listings';
import { env } from '$env/dynamic/public';

interface OperatorRecord {
	operator_id?: string;
	legal_name?: string;
}

interface DebugCall {
	label: string;
	request: {
		method: string;
		url: string;
		headers: Record<string, string>;
		body: unknown;
	};
	response?: unknown;
	error?: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			activities: null,
			verifiedActivityIds: [] as string[],
			debugCalls: [] as DebugCall[],
			error: null
		};
	}

	// Every GET made during this load() is recorded here (request + response/error) so the
	// page's debug panel can show exactly what was sent and received, without re-exposing
	// the real access token. Mirrors OBPRequests.get()'s own URL/header construction
	// (src/lib/obp/requests.ts).
	const debugCalls: DebugCall[] = [];
	async function debugGet(label: string, endpoint: string): Promise<any> {
		const request = {
			method: 'GET',
			url: `${env.PUBLIC_OBP_BASE_URL}${endpoint}`,
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer [REDACTED]'
			},
			body: null
		};
		try {
			const response = await obp_requests.get(endpoint, accessToken);
			debugCalls.push({ label, request, response });
			return response;
		} catch (error) {
			debugCalls.push({
				label,
				request,
				error: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
	}

	try {
		const response = await debugGet('Activities', `/obp/dynamic-entity/${ENTITY_ACTIVITY}`);
		const activities = (response[`${ENTITY_ACTIVITY}_list`] || []) as Array<
			Record<string, unknown> & { operator_id?: string }
		>;

		// Resolve operator names via activity.operator_id -> operator.legal_name.
		// Kept in its own try so an operator-fetch failure still renders the activities.
		const operatorNames = new Map<string, string>();
		try {
			const opResponse = await debugGet('Operators', `/obp/dynamic-entity/${ENTITY_OPERATOR}`);
			const operators = (opResponse[`${ENTITY_OPERATOR}_list`] || []) as OperatorRecord[];
			for (const op of operators) {
				if (op.operator_id && op.legal_name) operatorNames.set(op.operator_id, op.legal_name);
			}
		} catch {
			// Operators unavailable — cards fall back to "Unknown operator".
		}

		// Resolve verification status via OBP's one-hop join query: ask for activities
		// that EXIST alongside an activity_verification whose status_code is "verified",
		// instead of fetching the whole activity_verification table and joining in JS.
		// Requires activity.activity_id, activity_verification.activity_id, and
		// activity_verification.status_code to all be declared `indexed: true` — see
		// [[ogcr-dynamic-entity-join-queries]] memory for why, and the OBP-API bug this
		// tripped over. Everything not in this set (no record, in_progress, failed)
		// counts as "unverified". Kept in its own try so a failure still renders activities.
		const verifiedActivityIds = new Set<string>();
		try {
			const joinParams = new URLSearchParams();
			joinParams.set(`obp_exists[${ENTITY_ACTIVITY_VERIFICATION}]`, 'filter[status_code]=eq:verified');
			const verResponse = await debugGet(
				'Verified activities (join query)',
				`/obp/dynamic-entity/${ENTITY_ACTIVITY}?${joinParams.toString()}`
			);
			const verified = (verResponse[`${ENTITY_ACTIVITY}_list`] || []) as Array<{
				activity_id?: string;
			}>;
			for (const a of verified) {
				if (a.activity_id) verifiedActivityIds.add(a.activity_id);
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
			debugCalls,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				activities: null,
				verifiedActivityIds: [] as string[],
				debugCalls,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			activities: null,
			verifiedActivityIds: [] as string[],
			debugCalls,
			error: errorMessage
		};
	}
};
