import { describe, expect, it } from 'vitest';
import { countStates, entitiesInResourceDocs, entityItems, loginItems } from './setup';

describe('entitiesInResourceDocs', () => {
	it('names the entities that have a create endpoint, at bank or system level', () => {
		const names = entitiesInResourceDocs([
			{ request_verb: 'POST', specified_url: '/obp/dynamic-entity/banks/ogcr/activity' },
			{ request_verb: 'POST', specified_url: '/obp/dynamic-entity/country' },
			{ request_verb: 'GET', specified_url: '/obp/dynamic-entity/banks/ogcr/parcel' },
			{
				request_verb: 'PUT',
				specified_url: '/obp/dynamic-entity/banks/ogcr/operator/{operator_id}'
			},
			{
				request_verb: 'GET',
				specified_url:
					'/obp/dynamic-endpoint/banks/ogcr/dynamic-resource-doc/registry/activity-query'
			}
		]);
		expect([...names].sort()).toEqual(['activity', 'country']);
	});
});

describe('entityItems', () => {
	it('marks each entity the app uses as there or missing', () => {
		const items = entityItems(new Set(['activity']), 'unused');
		expect(items.find((item) => item.name === 'activity')?.state).toBe('ok');
		expect(items.find((item) => item.name === 'parcel')?.state).toBe('missing');
	});

	it('says unknown, with the reason, when the resource docs could not be read', () => {
		const items = entityItems(null, 'OBP-API did not answer');
		expect(
			items.every((item) => item.state === 'unknown' && item.detail === 'OBP-API did not answer')
		).toBe(true);
	});
});

describe('loginItems', () => {
	const allClients = { 'obp-oidc': true, keycloak: true, google: true };

	it('is ready only when OBP-API lists the provider, the app has a client and it started', () => {
		const items = loginItems(
			[
				{ provider: 'obp-oidc', url: 'https://oidc/.well-known', status: 'available' },
				{ provider: 'google', status: 'unavailable' },
				{
					provider: 'keycloak',
					url: 'https://kc/.well-known',
					status: 'unavailable',
					error: 'timeout'
				}
			],
			allClients
		);
		expect(items.map((item) => item.state)).toEqual(['ok', 'off', 'missing']);
	});

	it('treats a listed provider the app has no client for as not used', () => {
		const items = loginItems(
			[
				{ provider: 'obp-oidc', url: 'https://oidc/.well-known', status: 'available' },
				{ provider: 'google', url: 'https://google/.well-known', status: 'unavailable' }
			],
			{ 'obp-oidc': true }
		);
		expect(items.map((item) => item.state)).toEqual(['ok', 'off']);
	});

	it('adds a missing Login item when no provider is ready', () => {
		const items = loginItems(
			[{ provider: 'obp-oidc', url: 'https://oidc/.well-known', status: 'available' }],
			{}
		);
		expect(items[0]).toMatchObject({ name: 'Login', state: 'missing' });
	});
});

describe('countStates', () => {
	it('counts items across sections', () => {
		const counts = countStates([
			{
				title: 'a',
				description: '',
				items: [
					{ name: 'x', state: 'ok', detail: '' },
					{ name: 'y', state: 'off', detail: '' }
				]
			},
			{ title: 'b', description: '', items: [{ name: 'z', state: 'ok', detail: '' }] }
		]);
		expect(counts).toEqual({ ok: 2, missing: 0, off: 1, unknown: 0 });
	});
});
