import { describe, expect, it } from 'vitest';
import { publicGets } from './domainApi';

const login = [{ DirectLogin: [] }, { OAuth2: [] }];

describe('publicGets', () => {
	it('keeps the GETs without a security requirement or a path parameter', () => {
		const gets = publicGets({
			paths: {
				'/public/country/{countryid}': { get: { summary: 'Get country by id' } },
				'/public/country': { get: { summary: 'Get countries' } },
				'/operator': { get: { summary: 'Get operators', security: login } },
				'/registry/activity-query': { get: { summary: 'Get one activity' } },
				'/public/activity': { post: { summary: 'not a GET' } } as never
			}
		});
		expect(gets).toEqual([
			{ path: '/public/country', summary: 'Get countries' },
			{ path: '/registry/activity-query', summary: 'Get one activity' }
		]);
	});

	it("falls back to the document's security, and an empty one means public", () => {
		expect(publicGets({ security: login, paths: { '/a': { get: {} } } })).toEqual([]);
		expect(publicGets({ security: login, paths: { '/a': { get: { security: [] } } } })).toEqual([
			{ path: '/a', summary: '' }
		]);
	});

	it('copes with a document without paths', () => {
		expect(publicGets({})).toEqual([]);
	});
});
