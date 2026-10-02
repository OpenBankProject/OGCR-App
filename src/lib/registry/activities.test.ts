import { describe, expect, it } from 'vitest';
import { inlineTokenMetadata, mintedAtIso } from './activities';

describe('mintedAtIso', () => {
	it('reads activity_on_chain.minted_at as Unix seconds', () => {
		expect(mintedAtIso(1779280448)).toBe('2026-05-20T12:34:08.000Z');
	});

	it('is null until the activity is minted', () => {
		expect(mintedAtIso(null)).toBeNull();
		expect(mintedAtIso(undefined)).toBeNull();
	});
});

describe('inlineTokenMetadata', () => {
	it('decodes a base64 data URI', () => {
		expect(inlineTokenMetadata('data:application/json;base64,eyJuYW1lIjoiQ2FyYm9uIn0=')).toBe(
			'{"name":"Carbon"}'
		);
	});

	it('decodes UTF-8 in a base64 data URI', () => {
		const payload = Buffer.from('{"name":"Évora"}').toString('base64');
		expect(inlineTokenMetadata(`data:application/json;base64,${payload}`)).toBe('{"name":"Évora"}');
	});

	it('decodes a percent-encoded data URI', () => {
		expect(inlineTokenMetadata('data:application/json,%7B%22a%22%3A1%7D')).toBe('{"a":1}');
	});

	it('is null for a URI that links to the metadata', () => {
		expect(inlineTokenMetadata('ipfs://bafy/1.json')).toBeNull();
		expect(inlineTokenMetadata('https://example.org/1.json')).toBeNull();
		expect(inlineTokenMetadata(null)).toBeNull();
	});
});
