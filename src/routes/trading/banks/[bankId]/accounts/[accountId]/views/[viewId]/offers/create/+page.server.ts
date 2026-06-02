import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';
import { tradingPaths } from '$lib/obp/trading';

export const load: PageServerLoad = async ({ locals, params }) => {
	const accessToken = locals.session.data.oauth?.access_token;

	if (!accessToken) {
		return { isAuthenticated: false, settlementAccounts: [], accountsError: null };
	}

	try {
		// v7.0.0 returns explicit `account_id` (v3.0.0 returned a generic `id`).
		const response = await obp_requests.get('/obp/v7.0.0/my/accounts', accessToken);
		const all = (response.accounts ?? []) as Array<{
			account_id: string;
			label?: string;
			bank_id: string;
		}>;
		const settlementAccounts = all
			.filter((a) => a.bank_id === params.bankId)
			.map((a) => ({ account_id: a.account_id, label: a.label ?? '' }));
		return { isAuthenticated: true, settlementAccounts, accountsError: null };
	} catch (error) {
		const accountsError =
			error instanceof OBPRequestError
				? error.message
				: error instanceof Error
					? error.message
					: 'Unknown error';
		return { isAuthenticated: true, settlementAccounts: [], accountsError };
	}
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const accessToken = locals.session.data.oauth?.access_token;
		if (!accessToken) {
			return { success: false, error: 'Not authenticated', values: {} as Record<string, string> };
		}

		const ctx = {
			bankId: params.bankId,
			accountId: params.accountId,
			viewId: params.viewId
		};

		const formData = await request.formData();
		const values: Record<string, string> = {
			offer_type: (formData.get('offer_type') as string) ?? '',
			asset_code: (formData.get('asset_code') as string) ?? '',
			asset_amount: (formData.get('asset_amount') as string) ?? '',
			price_currency: (formData.get('price_currency') as string) ?? '',
			price_amount: (formData.get('price_amount') as string) ?? '',
			settlement_account_id: (formData.get('settlement_account_id') as string) ?? '',
			expiry_datetime: (formData.get('expiry_datetime') as string) ?? '',
			minimum_fill: (formData.get('minimum_fill') as string) ?? ''
		};

		// The API expects amounts as decimal strings (e.g. "100.00"), not numbers.
		const body: Record<string, unknown> = {
			offer_type: values.offer_type,
			asset_code: values.asset_code,
			asset_amount: values.asset_amount || undefined,
			price_currency: values.price_currency,
			price_amount: values.price_amount || undefined,
			settlement_account_id: values.settlement_account_id
		};
		if (values.expiry_datetime) body.expiry_datetime = values.expiry_datetime;
		if (values.minimum_fill) body.minimum_fill = values.minimum_fill;

		for (const key of Object.keys(body)) {
			if (body[key] === '' || body[key] === null || body[key] === undefined) {
				delete body[key];
			}
		}

		try {
			const response = await obp_requests.post(tradingPaths.offers(ctx), body, accessToken);
			return { success: true, response };
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return {
					success: false,
					error: error.message,
					errorDetails: error.toJSON(),
					values
				};
			}
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return { success: false, error: errorMessage, values };
		}
	}
};
