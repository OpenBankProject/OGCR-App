import type { PageServerLoad } from './$types';
import { OBPRequestError } from '$lib/obp/errors';
import { getChainSyncStatus, getChainTokens, type ChainSection } from '$lib/chain/onChain';
import { deriveHeartbeat, type Heartbeat } from '$lib/chain/heartbeat';
import { env } from '$env/dynamic/public';
import { normalizeExplorerBase } from '$lib/chain/explorer';

/** Public: the chain mirror and its sync status are public dynamic entities, so the
 *  page is read anonymously and needs no login. */
export const load: PageServerLoad = async () => {
	// A private chain has no explorer unless someone is running one, so
	// transaction links are opt-in configuration rather than an assumption.
	const explorerBase = normalizeExplorerBase(env.PUBLIC_CHAIN_EXPLORER_URL);

	try {
		// The status is what the heartbeat is built on, so a failure to read it is
		// a page-level error. The tokens are read separately so a mirror that cannot
		// be read cannot take the heartbeat down with it.
		const [status, sections] = await Promise.all([
			getChainSyncStatus(),
			getChainTokens().catch(() => [] as ChainSection[])
		]);

		return {
			heartbeat: deriveHeartbeat(status),
			sections,
			explorerBase,
			error: null
		};
	} catch (error) {
		const message =
			error instanceof OBPRequestError
				? error.message
				: error instanceof Error
					? error.message
					: 'Unknown error';
		return {
			heartbeat: deriveHeartbeat(null) as Heartbeat,
			sections: [] as ChainSection[],
			explorerBase,
			error: message,
			errorDetails: error instanceof OBPRequestError ? error.toJSON() : undefined
		};
	}
};
