import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY, ENTITY_OPERATOR, entityPath } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getOperatorsForUserId } from '$lib/marketplace/ownership';

// Public, read-only view of a registry operator. Anyone logged in can see the
// operator's public facts and the activities it operates; contact details are
// only shown to users linked to the operator, who also get an Edit link to
// /my/operators/[operatorId]. The registry record is never written from here.

export interface PublicOperator {
	operator_id: string;
	legal_name: string | null;
	country_id: string | null;
	ogcr_wallet_address: string | null;
}

export interface OperatorContact {
	email: string | null;
	phone: string | null;
	address_line_1: string | null;
	address_line_2: string | null;
	postcode: string | null;
}

export interface OperatorActivity {
	activity_id: string;
	name: string | null;
	activity_type: string | null;
	city: string | null;
	country_id: string | null;
}

function str(record: Record<string, unknown>, key: string): string | null {
	const value = record[key];
	return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const userId = session.data.user?.user_id ?? null;
	const operatorId = params.operatorId;

	if (!accessToken) {
		return { isAuthenticated: false, operator: null, contact: null, activities: [], owned: false };
	}

	try {
		const operatorResponse = await obp_requests.get(
			`${entityPath(ENTITY_OPERATOR)}/${operatorId}`,
			accessToken
		);
		const record = (operatorResponse[ENTITY_OPERATOR] || operatorResponse) as Record<
			string,
			unknown
		>;

		const operator: PublicOperator = {
			operator_id: operatorId,
			legal_name: str(record, 'legal_name'),
			country_id: str(record, 'country_id'),
			ogcr_wallet_address: str(record, 'ogcr_wallet_address')
		};

		// Is the viewer linked to this operator? Decides whether contact details and
		// the Edit link are shown. Tolerant: a failure here just means "not owned".
		let owned = false;
		try {
			const mine = await getOperatorsForUserId(accessToken, userId);
			owned = mine.some((o) => o.operator_id === operatorId);
		} catch {
			// Relationship lookup unavailable — treat as not owned.
		}

		const contact: OperatorContact | null = owned
			? {
					email: str(record, 'email'),
					phone: str(record, 'phone'),
					address_line_1: str(record, 'address_line_1'),
					address_line_2: str(record, 'address_line_2'),
					postcode: str(record, 'postcode')
				}
			: null;

		// Activities operated by this operator. Uses the bare-parameter filter and
		// filters again in memory in case the server ignores it. Kept in its own try
		// so an activity-fetch failure still renders the operator.
		let activities: OperatorActivity[] = [];
		try {
			const params = new URLSearchParams({ operator_id: operatorId });
			const activitiesResponse = await obp_requests.get(
				`${entityPath(ENTITY_ACTIVITY)}?${params.toString()}`,
				accessToken
			);
			const all = (activitiesResponse[`${ENTITY_ACTIVITY}_list`] || []) as Array<
				Record<string, unknown>
			>;
			activities = all
				.filter((a) => a.operator_id === operatorId && typeof a.activity_id === 'string')
				.map((a) => ({
					activity_id: a.activity_id as string,
					name: str(a, 'name'),
					activity_type: str(a, 'activity_type'),
					city: str(a, 'city'),
					country_id: str(a, 'country_id')
				}));
		} catch {
			// Activities unavailable — the page shows the operator without them.
		}

		return { isAuthenticated: true, operator, contact, activities, owned };
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				operator: null,
				contact: null,
				activities: [],
				owned: false,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			operator: null,
			contact: null,
			activities: [],
			owned: false,
			error: message
		};
	}
};
