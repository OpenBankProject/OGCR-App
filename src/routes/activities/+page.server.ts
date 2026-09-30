import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_ACTIVITY,
	ENTITY_OPERATOR,
	ENTITY_ACTIVITY_VERIFICATION,
	entityPathV7,
	unwrapV7List
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

const VALID_VERIFICATION_FILTERS = new Set(['all', 'verified', 'unverified']);

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	const rawVerification = url.searchParams.get('verification') ?? 'all';
	const verificationFilter = VALID_VERIFICATION_FILTERS.has(rawVerification) ? rawVerification : 'all';

	if (!accessToken) {
		return {
			isAuthenticated: false,
			activities: null,
			verificationFilter,
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

	// Push the verification filter down to OBP via a one-hop join query instead of
	// fetching every activity and filtering client-side — the activity table can be
	// far too large to hold in the browser/server-render memory in one go.
	// Requires activity.activity_id, activity_verification.activity_id, and
	// activity_verification.status_code to all be declared `indexed: true` — see
	// [[ogcr-dynamic-entity-join-queries]] memory for why, and the OBP-API bug this
	// tripped over.
	let activityEndpoint = entityPathV7(ENTITY_ACTIVITY);
	if (verificationFilter !== 'all') {
		const quantifier = verificationFilter === 'verified' ? 'obp_exists' : 'obp_not_exists';
		const joinParams = new URLSearchParams();
		joinParams.set(`${quantifier}[${ENTITY_ACTIVITY_VERIFICATION}]`, 'filter[status_code]=eq:verified');
		activityEndpoint = `${activityEndpoint}?${joinParams.toString()}`;
	}

	try {
		const response = await debugGet('Activities', activityEndpoint);
		const activities = unwrapV7List<Record<string, unknown> & { operator_id?: string }>(
			response,
			ENTITY_ACTIVITY
		);

		// Resolve operator names via activity.operator_id -> operator.legal_name.
		// Kept in its own try so an operator-fetch failure still renders the activities.
		const operatorNames = new Map<string, string>();
		try {
			const opResponse = await debugGet('Operators', entityPathV7(ENTITY_OPERATOR));
			const operators = unwrapV7List<OperatorRecord>(opResponse, ENTITY_OPERATOR);
			for (const op of operators) {
				if (op.operator_id && op.legal_name) operatorNames.set(op.operator_id, op.legal_name);
			}
		} catch {
			// Operators unavailable — cards fall back to "Unknown operator".
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
			verificationFilter,
			debugCalls,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				activities: null,
				verificationFilter,
				debugCalls,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			activities: null,
			verificationFilter,
			debugCalls,
			error: errorMessage
		};
	}
};
