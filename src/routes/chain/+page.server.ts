import type { PageServerLoad } from './$types';
import { OBPRequestError } from '$lib/obp/errors';
import { getChainSyncStatus, getRecentChainEvents, type ChainEvent } from '$lib/chain/onChain';
import { deriveHeartbeat, type Heartbeat } from '$lib/chain/heartbeat';
import { env } from '$env/dynamic/public';
import { normalizeExplorerBase } from '$lib/chain/explorer';

export const load: PageServerLoad = async ({ locals }) => {
	const accessToken = locals.session.data.oauth?.access_token;

	// A private chain has no explorer unless someone is running one, so
	// transaction links are opt-in configuration rather than an assumption.
	const explorerBase = normalizeExplorerBase(env.PUBLIC_CHAIN_EXPLORER_URL);

	if (!accessToken) {
		return {
			isAuthenticated: false,
			heartbeat: deriveHeartbeat(null) as Heartbeat,
			events: [] as ChainEvent[],
			explorerBase,
			error: null
		};
	}

	try {
		// The status is what the heartbeat is built on, so a failure to read it is
		// a page-level error. Recent events are decoration and are fetched
		// separately below so they cannot take the heartbeat down with them.
		const status = await getChainSyncStatus(accessToken);
		const events = await getRecentChainEvents(accessToken).catch(() => [] as ChainEvent[]);

		return {
			isAuthenticated: true,
			heartbeat: deriveHeartbeat(status),
			events,
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
			isAuthenticated: true,
			heartbeat: deriveHeartbeat(null),
			events: [] as ChainEvent[],
			explorerBase,
			error: message,
			errorDetails: error instanceof OBPRequestError ? error.toJSON() : undefined
		};
	}
};
