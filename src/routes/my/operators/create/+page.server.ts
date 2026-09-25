import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_OPERATOR } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { linkUserToOperator } from '$lib/marketplace/ownership';
import { getCountries, type CountryRecord } from '$lib/reference/countries';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return { isAuthenticated: false };
	}

	// The country picker offers country_name and submits country_id. Tolerant: if
	// the reference list can't be fetched the form falls back to a free-text code.
	let countries: CountryRecord[] = [];
	try {
		countries = await getCountries(accessToken);
	} catch {
		// No list available — the country field still accepts a typed ISO code.
	}

	// Default the operator email to the logged-in user's email as a convenience.
	return {
		isAuthenticated: true,
		userEmail: session.data.user?.email ?? '',
		countries
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;
		const userId = session.data.user?.user_id ?? null;

		if (!accessToken || !userId) {
			return {
				success: false,
				error: 'Not authenticated',
				values: {} as Record<string, string>
			};
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

		// Operator body — no operator_id; OBP generates it and returns it.
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

		let operatorId: string | undefined;
		try {
			const response = await obp_requests.post(
				`/obp/dynamic-entity/${ENTITY_OPERATOR}`,
				body,
				accessToken
			);
			const operator = (response[ENTITY_OPERATOR] || response) as { operator_id?: string };
			operatorId = operator.operator_id;

			if (!operatorId) {
				// Operator created but we can't link it without an id.
				return {
					success: true,
					linked: false,
					operator,
					linkError:
						'Operator created, but no operator_id was returned, so it could not be linked to your user.'
				};
			}
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return { success: false, error: error.message, errorDetails: error.toJSON(), values };
			}
			const message = error instanceof Error ? error.message : 'Unknown error';
			return { success: false, error: message, values };
		}

		// Link the new operator to the logged-in user.
		try {
			const relationship = await linkUserToOperator(accessToken, {
				userId,
				operatorId,
				relationship: values.relationship || 'Owner'
			});
			return {
				success: true,
				linked: true,
				operator: { operator_id: operatorId, ...body },
				relationship
			};
		} catch (error) {
			const linkError =
				error instanceof OBPRequestError
					? error.message
					: error instanceof Error
						? error.message
						: 'Unknown error';
			// The operator exists; only the link failed. Report both so it's recoverable.
			return {
				success: true,
				linked: false,
				operator: { operator_id: operatorId, ...body },
				linkError,
				linkErrorDetails: error instanceof OBPRequestError ? error.toJSON() : undefined
			};
		}
	}
};
