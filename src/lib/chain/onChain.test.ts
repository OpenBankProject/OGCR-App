import { describe, it, expect, vi, beforeEach } from 'vitest';

// Entity lists keyed by entity name. Numbers are strings on purpose: OBP returns
// integer-typed dynamic entity fields as strings, which is what the real API
// does and what the mapping has to survive.
const lists: Record<string, any[]> = {};

vi.mock('$lib/obp/requests', () => ({
	obp_requests: {
		// The chain page reads the public v7.0.0 endpoints, whose list items are wrapped
		// as `{ "<entity>": record, "metadata": ... }`.
		get: async (endpoint: string) => {
			const entity = endpoint.replace(
				/^\/obp\/v7\.0\.0\/banks\/[^/]+\/dynamic-entities\/public\//,
				''
			);
			if (lists[entity] === undefined) throw new Error(`no fixture for ${entity}`);
			return {
				[`${entity}_list`]: lists[entity].map((record) => ({ [entity]: record, metadata: {} }))
			};
		}
	}
}));

const { getChainTokens, getChainSyncStatus, formatUnits, idFromUri } = await import('./onChain');

beforeEach(() => {
	for (const k of Object.keys(lists)) delete lists[k];
	lists['parcel_on_chain'] = [];
	lists['activity_on_chain'] = [];
	lists['certification_on_chain'] = [];
	lists['carbon_credit_batch_on_chain'] = [];
	lists['carbon_credit_balance_on_chain'] = [];
	lists['chain_sync_status'] = [];
});

describe('getChainTokens', () => {
	const section = async (key: string) => (await getChainTokens()).find((s) => s.key === key)!;

	it('returns a section per type, in chain-of-records order', async () => {
		expect((await getChainTokens()).map((s) => s.key)).toEqual([
			'parcel',
			'activity',
			'certification',
			'batch',
			'balance'
		]);
	});

	it('links an activity token to its registry pages, scheme and parcel token', async () => {
		lists['parcel_on_chain'] = [{ parcel_id: 'p1', token_id: '4', block_number: '1' }];
		lists['activity_on_chain'] = [
			{
				activity_on_chain_id: 'aoc_1',
				activity_id: 'activity_local_1',
				name: 'Local Fixture Activity 1',
				operator_id: 'op_1',
				operator_name: 'Op One',
				certification_scheme_id: 'cs_1',
				parcel_ids: 'p1, p2',
				token_id: '1',
				block_number: '2'
			}
		];
		const [t] = (await section('activity')).tokens;
		expect(t.anchor).toBe('activity-token-1');
		expect(t.title).toBe('Local Fixture Activity 1');
		expect(t.publicRecordUrl).toMatch(/\/dynamic-entities\/public\/activity_on_chain\/aoc_1$/);
		const byLabel = (label: string) => t.links.filter((l) => l.label === label);
		expect(byLabel('Activity')[0].href).toBe('/registry/activities/activity_local_1');
		expect(byLabel('Operator')[0]).toMatchObject({
			text: 'Op One',
			href: '/registry/operators/op_1'
		});
		expect(byLabel('Certification scheme')[0].href).toBe('/registry/certification-schemes/cs_1');
		// Both link to the (login-only) parcel page; only p1 has a token on the page.
		expect(byLabel('Parcel').map((l) => l.href)).toEqual(['/parcels/p1', '/parcels/p2']);
		expect(byLabel('Parcel token')).toEqual([
			{ label: 'Parcel token', text: 'p1', href: '#parcel-token-4', external: false }
		]);
	});

	it('links a certification to its certificate page and activity token, audit report as text', async () => {
		lists['activity_on_chain'] = [{ activity_id: 'a1', token_id: '2', block_number: '1' }];
		lists['certification_on_chain'] = [
			{
				certificate_of_compliance_id: 'coc_1',
				activity_id: 'a1',
				activity_nft_id: '2',
				certification_body_name: 'Body',
				certification_body_uri: 'http://obp/obp/dynamic-entity/banks/ogcr/certification_body/cb_1',
				audit_report_uri: 'http://obp/obp/dynamic-entity/banks/ogcr/audit_report/ar_1',
				token_id: '1',
				block_number: '3'
			}
		];
		const [t] = (await section('certification')).tokens;
		const byLabel = (label: string) => t.links.find((l) => l.label === label)!;
		expect(byLabel('Certificate').href).toBe('/registry/certificates/coc_1');
		expect(byLabel('Activity token').href).toBe('#activity-token-2');
		expect(byLabel('Certification body')).toMatchObject({
			text: 'Body',
			href: '/registry/certification-bodies/cb_1'
		});
		expect(byLabel('Audit report')).toMatchObject({ text: 'ar_1', href: null });
	});

	it('does not link to a token that is not on the page', async () => {
		lists['carbon_credit_batch_on_chain'] = [
			{ carbon_credit_batch_id: 'b1', activity_nft_id: '9', token_id: '1', block_number: '1' }
		];
		const [t] = (await section('batch')).tokens;
		expect(t.links.find((l) => l.label === 'Activity token')).toBeUndefined();
	});

	it('shows batch amounts in tonnes and links a balance to its batch token', async () => {
		lists['carbon_credit_batch_on_chain'] = [
			{
				carbon_credit_batch_id: 'b1',
				amount: '6500000000000000000',
				credit_decimals: '18',
				token_id: '3',
				block_number: '1'
			}
		];
		lists['carbon_credit_balance_on_chain'] = [
			{
				balance: '5500000000000000000',
				decimals: '18',
				symbol: 'CC',
				batch_token_id: '3',
				block_number: '2'
			}
		];
		const [batch] = (await section('batch')).tokens;
		expect(batch.details).toContainEqual({ label: 'Issued', value: '6.5 tCO₂e' });
		const [balance] = (await section('balance')).tokens;
		expect(balance.title).toBe('5.5 CC');
		expect(balance.links[0]).toMatchObject({ label: 'Batch token', href: '#batch-token-3' });
	});

	it('orders each section newest block first', async () => {
		lists['parcel_on_chain'] = [
			{ parcel_id: 'a', token_id: '1', block_number: '5' },
			{ parcel_id: 'b', token_id: '2', block_number: '9' },
			{ parcel_id: 'c', token_id: '3', block_number: '7' }
		];
		expect((await section('parcel')).tokens.map((t) => t.blockNumber)).toEqual([9, 7, 5]);
	});

	it('leaves a section empty when its mirror cannot be read', async () => {
		delete lists['certification_on_chain'];
		expect((await section('certification')).tokens).toEqual([]);
	});
});

describe('formatUnits', () => {
	it('scales base units by the decimals and trims trailing zeros', () => {
		expect(formatUnits('6500000000000000000', 18)).toBe('6.5');
		expect(formatUnits('1000000000000000000', '18')).toBe('1');
		expect(formatUnits('0', 18)).toBe('0');
		expect(formatUnits(null, 18)).toBeNull();
	});
});

describe('idFromUri', () => {
	it('takes the last path segment', () => {
		expect(idFromUri('https://x/obp/dynamic-entity/banks/ogcr/operator/op_1')).toBe('op_1');
		expect(idFromUri('not a url')).toBeNull();
		expect(idFromUri(undefined)).toBeNull();
	});
});

describe('getChainSyncStatus', () => {
	it('returns null when the mirror has never run', async () => {
		expect(await getChainSyncStatus()).toBeNull();
	});

	it('picks the most recently synced record if several ever exist', async () => {
		lists['chain_sync_status'] = [
			{ sync_key: 'chain-2025', synced_at: '2026-09-09T05:00:00Z' },
			{ sync_key: 'chain-2025', synced_at: '2026-09-09T05:30:43Z' }
		];
		const s = await getChainSyncStatus();
		expect(s?.synced_at).toBe('2026-09-09T05:30:43Z');
	});
});
