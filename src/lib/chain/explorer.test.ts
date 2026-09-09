import { describe, it, expect } from 'vitest';
import { normalizeExplorerBase, explorerLinks, shortenHex } from './explorer';

describe('normalizeExplorerBase', () => {
	it('trims trailing slashes', () => {
		expect(normalizeExplorerBase('https://blockscout.example/')).toBe('https://blockscout.example');
		expect(normalizeExplorerBase('http://localhost:4000//')).toBe('http://localhost:4000');
	});

	it('treats unset or blank as no explorer', () => {
		expect(normalizeExplorerBase(undefined)).toBeNull();
		expect(normalizeExplorerBase('   ')).toBeNull();
	});

	it('rejects a value that is not an http(s) URL rather than building broken links', () => {
		expect(normalizeExplorerBase('blockscout.example')).toBeNull();
		expect(normalizeExplorerBase('javascript:alert(1)')).toBeNull();
	});
});

describe('explorerLinks', () => {
	it('reports unavailable and returns no links when unconfigured', () => {
		const l = explorerLinks(null);
		expect(l.available).toBe(false);
		expect(l.tx('0xabc')).toBeNull();
		expect(l.block(12)).toBeNull();
		expect(l.address('0xdef')).toBeNull();
	});

	it('builds explorer paths when configured', () => {
		const l = explorerLinks('https://blockscout.example');
		expect(l.available).toBe(true);
		expect(l.tx('0xabc')).toBe('https://blockscout.example/tx/0xabc');
		expect(l.block(12)).toBe('https://blockscout.example/block/12');
		expect(l.address('0xdef')).toBe('https://blockscout.example/address/0xdef');
	});

	it('returns null for missing values even when configured', () => {
		const l = explorerLinks('https://blockscout.example');
		expect(l.tx(null)).toBeNull();
		expect(l.block(null)).toBeNull();
		expect(l.block(undefined)).toBeNull();
	});

	it('links block zero, which is a real block', () => {
		expect(explorerLinks('https://x.example').block(0)).toBe('https://x.example/block/0');
	});
});

describe('shortenHex', () => {
	it('keeps both ends recognisable', () => {
		expect(shortenHex('0x1234567890abcdef1234567890abcdef')).toBe('0x12345678…abcdef');
	});

	it('leaves short values alone and handles missing ones', () => {
		expect(shortenHex('0xabc')).toBe('0xabc');
		expect(shortenHex(null)).toBe('—');
	});
});
