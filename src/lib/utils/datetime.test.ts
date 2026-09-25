import { describe, it, expect } from 'vitest';
import { formatUtc, formatLocal } from './datetime';

describe('formatUtc', () => {
	it('renders the instant in UTC and says so', () => {
		const out = formatUtc('2026-09-09T06:52:38Z')!;
		// Deliberately not asserting the month abbreviation: ICU renders
		// September as "Sep" or "Sept" depending on its version, and pinning that
		// makes the test fail on a Node upgrade for no useful reason.
		expect(out).toMatch(/^9 \w+ 2026, 06:52:38 UTC$/);
	});

	it('is independent of the offset in the input, since it is the same instant', () => {
		expect(formatUtc('2026-09-09T08:52:38+02:00')).toBe(formatUtc('2026-09-09T06:52:38Z'));
	});

	it('returns null rather than "Invalid Date" for unusable input', () => {
		expect(formatUtc(null)).toBeNull();
		expect(formatUtc(undefined)).toBeNull();
		expect(formatUtc('')).toBeNull();
		expect(formatUtc('not-a-date')).toBeNull();
	});
});

describe('formatLocal', () => {
	it('formats a valid instant', () => {
		expect(formatLocal('2026-09-09T06:52:38Z')).toContain('2026');
	});

	it('returns null for unusable input', () => {
		expect(formatLocal('nope')).toBeNull();
	});
});
