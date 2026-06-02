import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';
import { tradingPaths } from '$lib/obp/trading';
import {
	fetchBanks,
	getCurrentBankField,
	saveCurrentBankField,
	type BankOption
} from '$lib/obp/currentBank';

interface AccountView {
	view_id: string;
	short_name?: string;
}

interface MyAccount {
	account_id: string;
	bank_id: string;
	label?: string;
	account_type?: string;
	views?: AccountView[];
}

/** Trading activity per account, keyed by `${bank_id}:${account_id}`. */
export type TradingActivity = Record<string, { offers: number | null }>;

/**
 * For each account, count its trading offers so the UI can flag which accounts
 * have actually been used for trading. Runs in parallel; a per-account failure
 * (e.g. no trading view, endpoint not enabled) is recorded as `null` (unknown)
 * rather than failing the whole page.
 */
async function buildTradingActivity(
	accounts: MyAccount[],
	accessToken: string
): Promise<TradingActivity> {
	const entries = await Promise.all(
		accounts.map(async (acc) => {
			const key = `${acc.bank_id}:${acc.account_id}`;
			const views = acc.views ?? [];
			const view = views.find((v) => v.view_id === 'owner') ?? views[0];
			if (!view) {
				return [key, { offers: null }] as const;
			}
			const ctx = { bankId: acc.bank_id, accountId: acc.account_id, viewId: view.view_id };
			const offers = await obp_requests
				.get(tradingPaths.offers(ctx), accessToken)
				.then((r) => (r.offers ?? []).length as number)
				.catch(() => null);
			return [key, { offers }] as const;
		})
	);
	return Object.fromEntries(entries);
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	const defaults = {
		bank_id: env.PUBLIC_DEFAULT_BANK_ID ?? '',
		account_id: env.PUBLIC_DEFAULT_ACCOUNT_ID ?? '',
		view_id: env.PUBLIC_DEFAULT_VIEW_ID ?? 'owner'
	};

	if (!accessToken) {
		return {
			isAuthenticated: false,
			defaults,
			accounts: null,
			activity: {} as TradingActivity,
			banks: [] as BankOption[],
			currentBankId: '',
			error: null
		};
	}

	// Fetch banks and the stored current bank in parallel. Either may fail
	// independently without blocking the accounts list below.
	const [banks, current] = await Promise.all([
		fetchBanks(accessToken).catch(() => [] as BankOption[]),
		getCurrentBankField(accessToken).catch(() => ({ bankId: null, attributeId: null }))
	]);

	// Selection precedence: stored CURRENT_BANK_ID -> env default -> first bank.
	const currentBankId =
		current.bankId || defaults.bank_id || (banks.length > 0 ? banks[0].bank_id : '');

	try {
		// v7.0.0 returns explicit `account_id`/`view_id` (v3.0.0 returned generic `id`).
		const response = await obp_requests.get('/obp/v7.0.0/my/accounts', accessToken);
		const accounts = (response.accounts ?? []) as MyAccount[];
		const activity = await buildTradingActivity(accounts, accessToken);
		return {
			isAuthenticated: true,
			defaults: { ...defaults, bank_id: currentBankId || defaults.bank_id },
			accounts,
			activity,
			banks,
			currentBankId,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				defaults: { ...defaults, bank_id: currentBankId || defaults.bank_id },
				accounts: null,
				activity: {} as TradingActivity,
				banks,
				currentBankId,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			defaults: { ...defaults, bank_id: currentBankId || defaults.bank_id },
			accounts: null,
			activity: {} as TradingActivity,
			banks,
			currentBankId,
			error: errorMessage
		};
	}
};

export const actions: Actions = {
	setBank: async ({ request, locals }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;

		if (!accessToken) {
			return { success: false, error: 'Not authenticated' };
		}

		const formData = await request.formData();
		const bankId = (formData.get('bank_id') as string)?.trim() ?? '';

		if (!bankId) {
			return { success: false, error: 'No bank selected' };
		}

		try {
			// Re-read the field to get the current attribute id, so we update
			// rather than duplicate it (and avoid trusting a stale hidden value).
			const { attributeId } = await getCurrentBankField(accessToken);
			await saveCurrentBankField(accessToken, bankId, attributeId);
			return { success: true, currentBankId: bankId };
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return { success: false, error: error.message, errorDetails: error.toJSON() };
			}
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return { success: false, error: errorMessage };
		}
	}
};
