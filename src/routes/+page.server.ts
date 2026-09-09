import type { PageServerLoad } from './$types';
import { getChainSyncStatus } from '$lib/chain/onChain';
import { deriveHeartbeat } from '$lib/chain/heartbeat';

export const load: PageServerLoad = async ({ locals }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	if (!accessToken) {
		return { heartbeat: null };
	}

	// The landing page should still render if the mirror is unreachable, so a
	// failure here degrades to no indicator rather than an error page.
	try {
		const status = await getChainSyncStatus(accessToken);
		return { heartbeat: deriveHeartbeat(status) };
	} catch {
		return { heartbeat: null };
	}
};
