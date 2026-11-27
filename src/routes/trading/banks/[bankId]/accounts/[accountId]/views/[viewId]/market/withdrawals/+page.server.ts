import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';
import { tradingPaths } from '$lib/obp/trading';

export const load: PageServerLoad = async ({ locals }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	return { isAuthenticated: !!accessToken };
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
			address: (formData.get('address') as string) ?? '',
			amount: (formData.get('amount') as string) ?? '',
			settlement_account_id: (formData.get('settlement_account_id') as string) ?? ''
		};

		// The API expects amounts as decimal strings (e.g. "50.0"), not numbers.
		const body: Record<string, unknown> = {
			address: values.address,
			amount: values.amount || undefined,
			settlement_account_id: values.settlement_account_id
		};
		for (const key of Object.keys(body)) {
			if (body[key] === '' || body[key] === null || body[key] === undefined) {
				delete body[key];
			}
		}

		try {
			const response = await obp_requests.post(tradingPaths.withdrawals(ctx), body, accessToken);
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
