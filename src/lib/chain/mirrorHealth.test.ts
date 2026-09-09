import { describe, it, expect } from 'vitest';
import { chainMirrorSnapshot, chainMirrorUncheckable, CHAIN_MIRROR_SERVICE } from './mirrorHealth';
import { deriveHeartbeat, type ChainSyncStatus } from './heartbeat';

const NOW = new Date('2026-09-09T12:00:00Z');

function status(seconds: number, extra: Partial<ChainSyncStatus> = {}): ChainSyncStatus {
	return {
		chain_id: 2025,
		head_block: 41208,
		synced_at: new Date(NOW.getTime() - seconds * 1000).toISOString(),
		run_status: 'ok',
		interval_seconds: 30,
		error_count: 0,
		parcel_count: 1,
		activity_count: 1,
		credit_balance_count: 5,
		mirrored_types: 'parcel,activity',
		...extra
	};
}

describe('chainMirrorSnapshot', () => {
	it('is healthy when the mirror is live', () => {
		const snap = chainMirrorSnapshot(deriveHeartbeat(status(10), NOW), NOW);
		expect(snap.service).toBe(CHAIN_MIRROR_SERVICE);
		expect(snap.status).toBe('healthy');
		expect(snap.error).toBeUndefined();
		expect(snap.details?.['Head block']).toBe(41208);
		expect(snap.details?.['Records last run']).toBe(7);
	});

	it('is unhealthy when the mirror has stalled, and says why', () => {
		const snap = chainMirrorSnapshot(deriveHeartbeat(status(3600), NOW), NOW);
		expect(snap.status).toBe('unhealthy');
		expect(snap.error).toContain('No chain sync');
	});

	it('is unhealthy when a fresh run had errors, rather than hiding them', () => {
		const snap = chainMirrorSnapshot(
			deriveHeartbeat(status(10, { error_count: 2, run_status: 'partial' }), NOW),
			NOW
		);
		expect(snap.status).toBe('unhealthy');
	});

	it('is unknown rather than unhealthy when the mirror has never run', () => {
		const snap = chainMirrorSnapshot(deriveHeartbeat(null, NOW), NOW);
		expect(snap.status).toBe('unknown');
	});

	it('carries the mirror cadence so the status page can age it correctly', () => {
		const snap = chainMirrorSnapshot(deriveHeartbeat(status(10), NOW), NOW);
		expect(snap.intervalMs).toBe(90_000);
	});
});

describe('chainMirrorUncheckable', () => {
	it('reports unknown with the reason', () => {
		const snap = chainMirrorUncheckable('Not logged in', NOW);
		expect(snap.status).toBe('unknown');
		expect(snap.error).toBe('Not logged in');
	});
});
