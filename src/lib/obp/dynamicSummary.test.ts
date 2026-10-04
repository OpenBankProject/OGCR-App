import { describe, expect, it } from 'vitest';
import { categorize, summarizeResourceDocs } from './dynamicSummary';

function entityDocs(name: string, fields: string[], bank = 'ogcr') {
	const base = `/obp/dynamic-entity/banks/${bank}/${name}`;
	const properties = Object.fromEntries(fields.map((f) => [f, { type: 'string' }]));
	const role = (verb: string) => [{ role: `Can${verb}DynamicEntityRecord_${name}` }];
	return [
		{
			request_verb: 'POST',
			specified_url: base,
			roles: role('Create'),
			typed_request_body: { type: 'object', properties }
		},
		{ request_verb: 'GET', specified_url: base, roles: role('Get') },
		{ request_verb: 'GET', specified_url: `${base}/${name.toUpperCase()}_ID`, roles: role('Get') },
		{
			request_verb: 'PUT',
			specified_url: `${base}/${name.toUpperCase()}_ID`,
			roles: role('Update'),
			typed_request_body: { properties }
		},
		{
			request_verb: 'DELETE',
			specified_url: `${base}/${name.toUpperCase()}_ID`,
			roles: role('Delete')
		}
	];
}

const shape = (name: string, ...fields: string[]) => ({ name, fields });

describe('categorize', () => {
	it('puts entities with fewer than 4 columns in lookup tables', () => {
		expect(categorize(shape('country', 'country_id', 'country_name'))).toBe('lookup');
		expect(categorize(shape('x', 'x_id', 'a', 'b'))).toBe('lookup');
		expect(categorize(shape('x', 'x_id', 'a', 'b', 'c'))).toBe('main');
	});

	it('puts entities made only of *_id columns in link tables', () => {
		expect(categorize(shape('parcel_activity', 'parcel_id', 'activity_id'))).toBe('link');
		expect(categorize(shape('wide_link', 'a_id', 'b_id', 'c_id', 'd_id'))).toBe('link');
	});

	it('does not call a table with one id, or an id plus a value, a link table', () => {
		expect(categorize(shape('only_id', 'only_id_id'))).toBe('lookup');
		expect(
			categorize(
				shape('user_operator_relationship', 'user_id', 'operator_id', 'relationship_to_operator')
			)
		).toBe('lookup');
	});

	it('treats a *_on_chain entity as on-chain whatever its columns', () => {
		expect(categorize(shape('activity_on_chain', 'activity_id', 'token_id', 'minted_at'))).toBe(
			'onChain'
		);
		expect(categorize(shape('link_on_chain', 'a_id', 'b_id'))).toBe('onChain');
	});
});

describe('summarizeResourceDocs', () => {
	const docs = [
		...entityDocs('country', ['country_id', 'country_name']),
		...entityDocs('parcel_activity', ['parcel_id', 'activity_id']),
		...entityDocs('activity', ['activity_id', 'name', 'summary', 'city', 'country_id']),
		...entityDocs('activity_on_chain', ['activity_id', 'token_id', 'minted_at', 'token_uri']),
		{
			request_verb: 'GET',
			specified_url: '/obp/dynamic-endpoint/dynamic-resource-doc/registry/activities-query',
			roles: []
		},
		{
			request_verb: 'GET',
			specified_url: '/obp/dynamic-endpoint/dynamic-resource-doc/registry/private',
			roles: [{ role: 'CanReadRegistry' }]
		}
	];
	const summary = summarizeResourceDocs(docs);

	it('sorts each entity into its category with its column count', () => {
		expect(summary.entities).toEqual({
			lookup: [{ name: 'country', columns: 2 }],
			link: [{ name: 'parcel_activity', columns: 2 }],
			main: [{ name: 'activity', columns: 5 }],
			onChain: [{ name: 'activity_on_chain', columns: 4 }]
		});
	});

	it('counts entity and resource doc endpoints apart', () => {
		expect(summary.endpoints).toEqual({ entity: 20, resourceDoc: 2 });
	});

	it('counts distinct roles, and none for a public endpoint', () => {
		// Create, Get, Update, Delete per entity; GET-by-id shares Get.
		expect(summary.roles).toEqual({ entity: 16, resourceDoc: 1 });
	});

	it('reads system-level entity URLs, which have no bank segment', () => {
		const system = summarizeResourceDocs([
			{
				request_verb: 'POST',
				specified_url: '/obp/dynamic-entity/parcel',
				typed_request_body: { properties: { a: {}, b: {}, c: {}, d: {} } }
			}
		]);
		expect(system.entities.main).toEqual([{ name: 'parcel', columns: 4 }]);
	});
});
