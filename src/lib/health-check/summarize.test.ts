import { describe, it, expect } from 'vitest';
import { summarizeHealth } from './summarize';
import type { HealthCheckSnapshot } from './state/HealthCheckState';

const NOW = new Date('2026-09-25T12:00:00Z');

function snap(service: string, status: HealthCheckSnapshot['status']): HealthCheckSnapshot {
	return { service, status, lastChecked: NOW.toISOString(), conecutiveFailures: 0 };
}

describe('summarizeHealth with degraded services', () => {
	it('is degraded, not healthy, when a service is degraded and the rest are healthy', () => {
		const s = summarizeHealth({ a: snap('a', 'healthy'), b: snap('b', 'degraded') }, NOW);
		expect(s.overallStatus).toBe('degraded');
		expect(s.summary.degraded).toBe(1);
		expect(s.summary.healthy).toBe(1);
	});

	it('is unhealthy when another service is down, whatever else is degraded', () => {
		const s = summarizeHealth({ a: snap('a', 'unhealthy'), b: snap('b', 'degraded') }, NOW);
		expect(s.overallStatus).toBe('unhealthy');
	});
});
