import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY, ENTITY_OPERATOR } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

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

		const enriched = activities.map((a) => ({
			...a,
			operator_name: a.operator_id ? operatorNames.get(a.operator_id) ?? null : null
		}));

		return {
			isAuthenticated: true,
			activities: enriched,
			rawResponse: response,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				activities: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			activities: null,
			error: errorMessage
		};
	}
};
