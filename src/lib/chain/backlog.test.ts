import { describe, it, expect } from 'vitest';
import { diffIds, summarizeBacklog, MAX_PENDING_LISTED } from './backlog';

describe('diffIds', () => {
	it('reports nothing pending when everything is tokenized', () => {
		const e = diffIds('Parcels', 'rule', ['p1', 'p2'], ['p1', 'p2']);
		expect(e.expected).toBe(2);
		expect(e.onChain).toBe(2);
		expect(e.pending).toEqual([]);
		expect(e.unexpected).toEqual([]);
	});

	it('lists registry records that have not reached the chain', () => {
		const e = diffIds('Parcels', 'rule', ['p1', 'p2', 'p3'], ['p2']);
		expect(e.pending).toEqual(['p1', 'p3']);
	});

	it('separates chain records the registry does not justify from a backlog', () => {
		const e = diffIds('Parcels', 'rule', ['p1'], ['p1', 'ghost']);
		expect(e.pending).toEqual([]);
		expect(e.unexpected).toEqual(['ghost']);
	});

	it('ignores blank identifiers rather than counting them as work', () => {
		const e = diffIds('Parcels', 'rule', ['p1', '', ''], ['p1']);
		expect(e.expected).toBe(1);
		expect(e.pending).toEqual([]);
	});

	it('de-duplicates, since several verifications can name one record', () => {
		const e = diffIds('Parcels', 'rule', ['p1', 'p1', 'p2'], ['p1']);
		expect(e.expected).toBe(2);
		expect(e.pending).toEqual(['p2']);
	});

	it('sorts so the list does not reshuffle between reloads', () => {
		const e = diffIds('Parcels', 'rule', ['c', 'a', 'b'], []);
		expect(e.pending).toEqual(['a', 'b', 'c']);
	});

	it('caps the listed identifiers', () => {
		const many = Array.from({ length: MAX_PENDING_LISTED + 10 }, (_, i) => `p${String(i).padStart(3, '0')}`);
		const e = diffIds('Parcels', 'rule', many, []);
		expect(e.pending).toHaveLength(MAX_PENDING_LISTED);
	});
});

describe('summarizeBacklog', () => {
	it('is up to date only when nothing is pending anywhere', () => {
		const ok = summarizeBacklog([diffIds('A', 'r', ['x'], ['x']), diffIds('B', 'r', ['y'], ['y'])]);
		expect(ok.upToDate).toBe(true);
		expect(ok.totalPending).toBe(0);

		const behind = summarizeBacklog([diffIds('A', 'r', ['x'], ['x']), diffIds('B', 'r', ['y'], [])]);
		expect(behind.upToDate).toBe(false);
		expect(behind.totalPending).toBe(1);
	});
});
