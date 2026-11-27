import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_OPERATOR, entityPath } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

// Public directory of registry operators: only public facts, no contact details.
export interface OperatorSummary {
	operator_id: string;
	legal_name: string | null;
	country_id: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return { isAuthenticated: false, operators: [] as OperatorSummary[], error: null };
	}

	try {
		const response = await obp_requests.get(entityPath(ENTITY_OPERATOR), accessToken);
		const records = (response[`${ENTITY_OPERATOR}_list`] || []) as Array<Record<string, unknown>>;
		const operators: OperatorSummary[] = records
			.filter((r) => typeof r.operator_id === 'string')
			.map((r) => ({
				operator_id: r.operator_id as string,
				legal_name: typeof r.legal_name === 'string' ? r.legal_name : null,
				country_id: typeof r.country_id === 'string' ? r.country_id : null
			}))
			.sort((a, b) => (a.legal_name ?? '').localeCompare(b.legal_name ?? ''));

		return { isAuthenticated: true, operators, error: null };
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				operators: [] as OperatorSummary[],
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { isAuthenticated: true, operators: [] as OperatorSummary[], error: message };
	}
};
