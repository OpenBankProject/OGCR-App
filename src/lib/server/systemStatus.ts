/**
 * Everything the status page shows, built in one place.
 *
 * The page loader and `/backend/status` (which the page's auto-refresh polls)
 * both call this. When they were separate, the refresh returned only the
 * background checks, so the chain mirror and the backlog vanished from the page
 * thirty seconds after it loaded.
 */

import { healthCheckRegistry, summarizeHealth, type HealthSummary } from '$lib/health-check';
import { getChainSyncStatus, getTokenizationBacklog } from '$lib/chain/onChain';
import type { Backlog } from '$lib/chain/backlog';
import { deriveHeartbeat } from '$lib/chain/heartbeat';
import { chainMirrorSnapshot, chainMirrorUncheckable } from '$lib/chain/mirrorHealth';

export type SystemStatusData = HealthSummary & {
	chainMirrorChecked: boolean;
	backlog: Backlog | null;
	backlogError: string | null;
};

export async function buildSystemStatus(accessToken: string | undefined): Promise<SystemStatusData> {
	const snapshots = { ...healthCheckRegistry.getSnapshots() };

	// The chain mirror cannot be polled in the background like the other checks:
	// reading its status record needs OBP credentials, which only a request
	// carries. So it is evaluated here, per request, and only when we have a
	// token to do it with. Adding an always-unknown entry for logged-out
	// visitors would drag the whole page's overall status to unknown while
	// telling them nothing.
	let backlog: Backlog | null = null;
	let backlogError: string | null = null;

	if (accessToken) {
		try {
			const status = await getChainSyncStatus(accessToken);
			const snapshot = chainMirrorSnapshot(deriveHeartbeat(status));
			snapshots[snapshot.service] = snapshot;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			const snapshot = chainMirrorUncheckable(`Could not read the chain mirror: ${message}`);
			snapshots[snapshot.service] = snapshot;
		}

		// Deliberately NOT folded into summarizeHealth. A backlog is a measurement,
		// not a health state: a snapshot cannot tell a queue being worked through
		// from one that is stuck, so forcing it into healthy/unhealthy would either
		// cry wolf on normal lag or hide a genuinely stalled tokenizer.
		try {
			backlog = await getTokenizationBacklog(accessToken);
		} catch (error) {
			backlogError = error instanceof Error ? error.message : 'Unknown error';
		}
	}

	return {
		...summarizeHealth(snapshots),
		chainMirrorChecked: !!accessToken,
		backlog,
		backlogError
	};
}
