/**
 * Chain heartbeat: is the marketplace actually connected to the chain right now?
 *
 * The app has no blockchain client and should not grow one — it reads OBP, and
 * OGCR-chain-cache is what puts chain state there. That means "is the connection
 * alive" cannot be answered from the mirrored tokens themselves: those record
 * when a token was *minted*, so on a chain where nothing has been minted for a
 * week, a healthy mirror and a mirror that died a week ago look identical.
 *
 * The cacher therefore writes a `chain_sync_status` record at the end of every
 * run. Freshness of that record is the heartbeat; the tokens are only the
 * secondary "recent activity" signal.
 */

/** The `chain_sync_status` record, as written by OGCR-chain-cache. */
export interface ChainSyncStatus {
	sync_key?: string;
	chain_id?: number;
	head_block?: number;
	/** RFC-3339 UTC, e.g. "2026-09-08T20:27:20Z". */
	synced_at?: string;
	/** "ok" when every configured mirror completed cleanly, else "partial". */
	run_status?: string;
	mirrored_types?: string;
	/** Seconds the cacher expects between runs; 0 when it was run by hand. */
	interval_seconds?: number;
	error_count?: number;
	parcel_count?: number;
	activity_count?: number;
	certification_count?: number;
	credit_batch_count?: number;
	credit_balance_count?: number;
}

export type HeartbeatState = 'live' | 'degraded' | 'stale' | 'never' | 'unknown';

export interface Heartbeat {
	state: HeartbeatState;
	/** Seconds since the last recorded run, or null when never/unknown. */
	ageSeconds: number | null;
	/** Seconds after which a record is considered stale. */
	staleAfterSeconds: number;
	status: ChainSyncStatus | null;
	/** One line explaining the state, safe to show to a user. */
	message: string;
}

/**
 * How long a record may go unrefreshed before it counts as stale.
 *
 * A single missed run is normal — a slow scan, a blip. Three intervals is late
 * enough to mean something is actually wrong. The floor keeps a very short
 * interval from making the indicator flap, and the fallback covers a cacher run
 * by hand, which declares no interval at all.
 */
export const STALE_INTERVAL_MULTIPLE = 3;
export const MIN_STALE_SECONDS = 90;
export const DEFAULT_STALE_SECONDS = 300;

export function staleAfterSeconds(intervalSeconds: number | undefined | null): number {
	if (!intervalSeconds || intervalSeconds <= 0) return DEFAULT_STALE_SECONDS;
	return Math.max(intervalSeconds * STALE_INTERVAL_MULTIPLE, MIN_STALE_SECONDS);
}

/**
 * Derive the heartbeat from a sync status record.
 *
 * `now` is injectable so this stays a pure function and can be tested without
 * mocking the clock.
 */
export function deriveHeartbeat(
	status: ChainSyncStatus | null | undefined,
	now: Date = new Date()
): Heartbeat {
	if (!status) {
		return {
			state: 'never',
			ageSeconds: null,
			staleAfterSeconds: DEFAULT_STALE_SECONDS,
			status: null,
			message: 'The chain mirror has never run, so no chain data has reached the registry.'
		};
	}

	const threshold = staleAfterSeconds(status.interval_seconds);
	const syncedAt = status.synced_at ? Date.parse(status.synced_at) : NaN;

	if (Number.isNaN(syncedAt)) {
		// A record with no usable timestamp cannot be aged, and guessing would be
		// worse than admitting it: claiming "live" here could mask a dead mirror.
		return {
			state: 'unknown',
			ageSeconds: null,
			staleAfterSeconds: threshold,
			status,
			message: 'The chain mirror reported no readable sync time.'
		};
	}

	const ageSeconds = Math.max(0, Math.round((now.getTime() - syncedAt) / 1000));

	if (ageSeconds > threshold) {
		return {
			state: 'stale',
			ageSeconds,
			staleAfterSeconds: threshold,
			status,
			message: `No chain sync for ${formatAge(ageSeconds)}. The mirror may have stopped.`
		};
	}

	if ((status.error_count ?? 0) > 0 || status.run_status === 'partial') {
		return {
			state: 'degraded',
			ageSeconds,
			staleAfterSeconds: threshold,
			status,
			message: `Syncing, but the last run reported ${status.error_count ?? 0} error(s). Some chain data may be out of date.`
		};
	}

	return {
		state: 'live',
		ageSeconds,
		staleAfterSeconds: threshold,
		status,
		message: `Connected to chain ${status.chain_id ?? '?'} at block ${status.head_block ?? '?'}.`
	};
}

/** Compact relative age, e.g. "12s", "4m", "2h", "3d". */
export function formatAge(seconds: number | null): string {
	if (seconds === null) return 'never';
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	return `${Math.floor(seconds / 86400)}d`;
}

/** Total records mirrored in the last run, across every entity. */
export function totalMirrored(status: ChainSyncStatus | null | undefined): number {
	if (!status) return 0;
	return (
		(status.parcel_count ?? 0) +
		(status.activity_count ?? 0) +
		(status.certification_count ?? 0) +
		(status.credit_batch_count ?? 0) +
		(status.credit_balance_count ?? 0)
	);
}
