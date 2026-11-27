import { describe, it, expect } from 'vitest';
import {
	deriveHeartbeat,
	staleAfterSeconds,
	formatAge,
	totalMirrored,
	DEFAULT_STALE_SECONDS,
	MIN_STALE_SECONDS,
	type ChainSyncStatus
} from './heartbeat';

const NOW = new Date('2026-09-08T12:00:00Z');

function statusAgedSeconds(seconds: number, extra: Partial<ChainSyncStatus> = {}): ChainSyncStatus {
	return {
		sync_key: 'chain-2025',
		chain_id: 2025,
		head_block: 41208,
		synced_at: new Date(NOW.getTime() - seconds * 1000).toISOString(),
		run_status: 'ok',
		interval_seconds: 30,
		error_count: 0,
		...extra
	};
}

describe('staleAfterSeconds', () => {
	it('scales with the declared interval', () => {
		expect(staleAfterSeconds(60)).toBe(180);
	});

	it('applies a floor so a fast interval does not make the indicator flap', () => {
		expect(staleAfterSeconds(5)).toBe(MIN_STALE_SECONDS);
	});

	it('falls back when the cacher declares no interval', () => {
		expect(staleAfterSeconds(0)).toBe(DEFAULT_STALE_SECONDS);
		expect(staleAfterSeconds(undefined)).toBe(DEFAULT_STALE_SECONDS);
	});
});

describe('deriveHeartbeat', () => {
	it('reports never when the mirror has not run', () => {
		const hb = deriveHeartbeat(null, NOW);
		expect(hb.state).toBe('never');
		expect(hb.ageSeconds).toBeNull();
	});

	it('reports live for a recent clean run', () => {
		const hb = deriveHeartbeat(statusAgedSeconds(12), NOW);
		expect(hb.state).toBe('live');
		expect(hb.ageSeconds).toBe(12);
		expect(hb.message).toContain('41208');
	});

	it('tolerates a couple of missed runs before calling it stale', () => {
		// interval 30 -> stale after 90
		expect(deriveHeartbeat(statusAgedSeconds(89), NOW).state).toBe('live');
		expect(deriveHeartbeat(statusAgedSeconds(91), NOW).state).toBe('stale');
	});

	it('reports degraded when a fresh run had errors', () => {
		const hb = deriveHeartbeat(statusAgedSeconds(10, { error_count: 3, run_status: 'partial' }), NOW);
		expect(hb.state).toBe('degraded');
	});

	it('prefers stale over degraded, because an old record is the bigger problem', () => {
		const hb = deriveHeartbeat(statusAgedSeconds(600, { error_count: 3, run_status: 'partial' }), NOW);
		expect(hb.state).toBe('stale');
	});

	it('refuses to claim live when the timestamp is unreadable', () => {
		const hb = deriveHeartbeat(statusAgedSeconds(10, { synced_at: 'not-a-date' }), NOW);
		expect(hb.state).toBe('unknown');
	});

	it('does not report a negative age when a clock runs ahead', () => {
		const hb = deriveHeartbeat(statusAgedSeconds(-30), NOW);
		expect(hb.ageSeconds).toBe(0);
		expect(hb.state).toBe('live');
	});
});

describe('formatAge', () => {
	it('scales the unit with the magnitude', () => {
		expect(formatAge(12)).toBe('12s');
		expect(formatAge(300)).toBe('5m');
		expect(formatAge(7200)).toBe('2h');
		expect(formatAge(172800)).toBe('2d');
		expect(formatAge(null)).toBe('never');
	});
});

describe('totalMirrored', () => {
	it('sums every entity count and tolerates missing ones', () => {
		expect(totalMirrored({ parcel_count: 2, activity_count: 2, credit_balance_count: 5 })).toBe(9);
		expect(totalMirrored(null)).toBe(0);
	});
});
