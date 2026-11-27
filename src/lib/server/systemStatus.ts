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
	/** False when the viewer has no OBP credentials, so the backlog could not be read. */
	backlogChecked: boolean;
	backlog: Backlog | null;
	backlogError: string | null;
};

export async function buildSystemStatus(accessToken: string | undefined): Promise<SystemStatusData> {
	const snapshots = { ...healthCheckRegistry.getSnapshots() };

	// The chain mirror's sync status is a public dynamic entity, so it is checked
	// for every visitor, logged in or not. It is read here, per request, so the
	// page always shows the mirror's latest run.
	try {
		const status = await getChainSyncStatus();
		const snapshot = chainMirrorSnapshot(deriveHeartbeat(status));
		snapshots[snapshot.service] = snapshot;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		const snapshot = chainMirrorUncheckable(`Could not read the chain mirror: ${message}`);
		snapshots[snapshot.service] = snapshot;
	}

	// The backlog still needs OBP credentials: it compares the chain mirror with
	// registry records (verifications, certificates) that are not public.
	let backlog: Backlog | null = null;
	let backlogError: string | null = null;

	if (accessToken) {
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
		backlogChecked: !!accessToken,
		backlog,
		backlogError
	};
}
