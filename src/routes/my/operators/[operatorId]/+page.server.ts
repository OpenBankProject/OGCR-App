import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_OPERATOR } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getOperatorsForUserId, updateUserOperatorRelationship } from '$lib/marketplace/ownership';
import { getCountries, type CountryRecord } from '$lib/reference/countries';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const userId = session.data.user?.user_id ?? null;

	if (!accessToken) {
		return { isAuthenticated: false, owned: false, operator: null };
	}

	// The country picker offers country_name and submits country_id. Tolerant: if
	// the reference list can't be fetched the form falls back to a free-text code.
	let countries: CountryRecord[] = [];
	try {
		countries = await getCountries(accessToken);
	} catch {
		// No list available — the country field still accepts a typed ISO code.
	}

	try {
		// Resolve the user's operators; ownership = the target is among them.
		// The resolved record already carries the operator fields + relationship.
		const operators = await getOperatorsForUserId(accessToken, userId);
		const operator = operators.find((o) => o.operator_id === params.operatorId) ?? null;

		return { isAuthenticated: true, owned: !!operator, operator, countries };
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				owned: false,
				operator: null,
				countries,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { isAuthenticated: true, owned: false, operator: null, countries, error: message };
	}
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;
		const userId = session.data.user?.user_id ?? null;
		const operatorId = params.operatorId;

		if (!accessToken || !userId) {
			return { success: false, error: 'Not authenticated', values: {} as Record<string, string> };
		}

		const formData = await request.formData();
		const values: Record<string, string> = {
			legal_name: (formData.get('legal_name') as string) ?? '',
			email: (formData.get('email') as string) ?? '',
			phone: (formData.get('phone') as string) ?? '',
			address_line_1: (formData.get('address_line_1') as string) ?? '',
			address_line_2: (formData.get('address_line_2') as string) ?? '',
			postcode: (formData.get('postcode') as string) ?? '',
			country_id: (formData.get('country_id') as string) ?? '',
			ogcr_wallet_address: (formData.get('ogcr_wallet_address') as string) ?? '',
			relationship: (formData.get('relationship') as string) ?? ''
		};

		try {
			// Re-verify ownership server-side before writing.
			const operators = await getOperatorsForUserId(accessToken, userId);
			const current = operators.find((o) => o.operator_id === operatorId);
			if (!current) {
				return {
					success: false,
					error: 'This operator is not linked to your user, so you cannot edit it.',
					values
				};
			}

			const body: Record<string, unknown> = {
				legal_name: values.legal_name,
				email: values.email,
				phone: values.phone,
				address_line_1: values.address_line_1,
				address_line_2: values.address_line_2,
				postcode: values.postcode,
				country_id: values.country_id,
				ogcr_wallet_address: values.ogcr_wallet_address
			};
			for (const key of Object.keys(body)) {
				if (body[key] === '' || body[key] === null) delete body[key];
			}

			const response = await obp_requests.put(
				`/obp/dynamic-entity/${ENTITY_OPERATOR}/${operatorId}`,
				body,
				accessToken
			);

			// Update the relationship text too, if it changed and we have its id.
			const newRelationship = values.relationship.trim();
			if (
				newRelationship &&
				newRelationship !== (current.relationship ?? '') &&
				current.user_operator_relationship_id
			) {
				await updateUserOperatorRelationship(accessToken, current.user_operator_relationship_id, {
					userId,
					operatorId,
					relationship: newRelationship
				});
			}

			return { success: true, response };
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return { success: false, error: error.message, errorDetails: error.toJSON(), values };
			}
			const message = error instanceof Error ? error.message : 'Unknown error';
			return { success: false, error: message, values };
		}
	}
};
