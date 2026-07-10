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
			order_id: (formData.get('order_id') as string) ?? '',
			counter_order_id: (formData.get('counter_order_id') as string) ?? '',
			price: (formData.get('price') as string) ?? '',
			amount: (formData.get('amount') as string) ?? ''
		};

		// The API expects amounts as decimal strings (e.g. "25.0"), not numbers.
		const body: Record<string, unknown> = {
			order_id: values.order_id,
			counter_order_id: values.counter_order_id,
			price: values.price || undefined,
			amount: values.amount || undefined
		};
		for (const key of Object.keys(body)) {
			if (body[key] === '' || body[key] === null || body[key] === undefined) {
				delete body[key];
			}
		}

		try {
			const response = await obp_requests.post(tradingPaths.matches(ctx), body, accessToken);
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
