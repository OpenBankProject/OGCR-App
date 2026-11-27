/**
 * The chain mirror as a status-page service.
 *
 * The app cannot check the chain directly — it has no RPC client, by design —
 * so what it can honestly report is whether OGCR-chain-cache is still putting
 * chain state into OBP. The head block in that record doubles as evidence the
 * chain itself is producing blocks.
 *
 * Unlike the other checks this cannot run on a background timer: reading the
 * status record needs a user's OBP credentials, so it is evaluated per request
 * on the status page.
 */

import type { HealthCheckSnapshot } from '$lib/health-check';
import { formatAge, totalMirrored, type Heartbeat } from '$lib/chain/heartbeat';

export const CHAIN_MIRROR_SERVICE = 'Chain mirror (OGCR-chain-cache)';

/**
 * Map a heartbeat onto the status page's vocabulary.
 *
 * `degraded` stays degraded rather than being rounded to healthy: a run that
 * failed to write some records means the mirror is not fully doing its job, and
 * a status page that called that healthy would be hiding exactly what it exists
 * to surface. Nor is it unhealthy: the mirror is running and the chain is
 * reachable, which is a different situation from a mirror that has stopped.
 * `never` maps to unknown instead, because a mirror that has not run yet is
 * unconfigured rather than broken.
 */
export function chainMirrorSnapshot(
	heartbeat: Heartbeat,
	now: Date = new Date()
): HealthCheckSnapshot {
	const s = heartbeat.status;

	const details: Record<string, string | number> = {};
	if (s?.chain_id !== undefined) details['Chain ID'] = s.chain_id;
	if (s?.head_block !== undefined) details['Head block'] = s.head_block;
	if (heartbeat.ageSeconds !== null) details['Last sync'] = `${formatAge(heartbeat.ageSeconds)} ago`;
	if (s?.interval_seconds) details['Sync interval'] = `${s.interval_seconds}s`;
	if (s?.mirrored_types) details['Mirrors'] = s.mirrored_types;
	if (s) details['Records last run'] = totalMirrored(s);

	let status: HealthCheckSnapshot['status'];
	let error: string | undefined;
	let warning: string | undefined;

	switch (heartbeat.state) {
		case 'live':
			status = 'healthy';
			break;
		case 'degraded':
			status = 'degraded';
			warning = heartbeat.message;
			break;
		case 'stale':
			status = 'unhealthy';
			error = heartbeat.message;
			break;
		case 'never':
			status = 'unknown';
			error = heartbeat.message;
			break;
		default:
			status = 'unknown';
			error = heartbeat.message;
	}

	return {
		service: CHAIN_MIRROR_SERVICE,
		status,
		lastChecked: now.toISOString(),
		conecutiveFailures: status === 'unhealthy' ? 1 : 0,
		// The mirror's own cadence is the meaningful staleness window; without one
		// declared, fall back to the same default the heartbeat uses.
		intervalMs: heartbeat.staleAfterSeconds * 1000,
		...(error ? { error } : {}),
		...(warning ? { warning } : {}),
		details
	};
}

/** Snapshot for when the mirror could not be checked at all. */
export function chainMirrorUncheckable(reason: string, now: Date = new Date()): HealthCheckSnapshot {
	return {
		service: CHAIN_MIRROR_SERVICE,
		status: 'unknown',
		lastChecked: now.toISOString(),
		conecutiveFailures: 0,
		error: reason,
		details: {}
	};
}
