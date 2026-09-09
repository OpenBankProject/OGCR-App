import { describe, it, expect, vi, beforeEach } from 'vitest';

// Entity lists keyed by entity name. Numbers are strings on purpose: OBP returns
// integer-typed dynamic entity fields as strings, which is what the real API
// does and what the mapping has to survive.
const lists: Record<string, any[]> = {};

vi.mock('$lib/obp/requests', () => ({
	obp_requests: {
		get: async (endpoint: string) => {
			const entity = endpoint.replace('/obp/dynamic-entity/', '');
			if (lists[entity] === undefined) throw new Error(`no fixture for ${entity}`);
			return { [`${entity}_list`]: lists[entity] };
		}
	}
}));

const { getRecentChainEvents, getChainSyncStatus } = await import('./onChain');

beforeEach(() => {
	for (const k of Object.keys(lists)) delete lists[k];
	lists['parcel_on_chain'] = [];
	lists['activity_on_chain'] = [];
	lists['certification_on_chain'] = [];
	lists['carbon_credit_batch_on_chain'] = [];
	lists['chain_sync_status'] = [];
});

describe('getRecentChainEvents', () => {
	it('links an activity token to its page in this app', async () => {
		lists['activity_on_chain'] = [
			{
				activity_id: 'activity_local_1',
				token_id: '1',
				name: 'Local Fixture Activity 1',
				activity_url: 'http://localhost:8080/obp/dynamic-entity/activity/activity_local_1',
				owner_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
				tx_hash: '0x20ec',
				block_number: '2'
			}
		];
		const [e] = await getRecentChainEvents('token');
		expect(e.kind).toBe('Activity');
		expect(e.href).toBe('/activities/activity_local_1');
		expect(e.blockNumber).toBe(2);
		expect(e.tokenId).toBe(1);
	});

	it('resolves a credit batch to its activity page via the activity NFT id', async () => {
		lists['activity_on_chain'] = [{ activity_id: 'activity_local_1', token_id: '1', block_number: '2' }];
		lists['carbon_credit_batch_on_chain'] = [
			{
				batch_key: '1:permanent_carbon_removal',
				credit_type: 'permanent_carbon_removal',
				token_id: '1',
				activity_nft_id: '1',
				certification_url: 'http://localhost:8080/obp/dynamic-entity/certificate_of_compliance/coc_local_1',
				block_number: '2'
			}
		];
		const batch = (await getRecentChainEvents('token')).find((e) => e.kind === 'Credit Batch')!;
		expect(batch.label).toBe('permanent_carbon_removal');
		expect(batch.href).toBe('/activities/activity_local_1');
	});

	it('leaves href null when the activity NFT id matches nothing', async () => {
		lists['carbon_credit_batch_on_chain'] = [
			{ batch_key: '9:x', credit_type: 'x', token_id: '9', activity_nft_id: '9', block_number: '1' }
		];
		const [e] = await getRecentChainEvents('token');
		expect(e.href).toBeNull();
	});

	it('falls back to the on-chain registry URL for records with no page', async () => {
		lists['parcel_on_chain'] = [
			{
				parcel_id: 'parcel_local_2',
				token_id: '2',
				parcel_uri: 'http://localhost:8080/obp/dynamic-entity/parcel/parcel_local_2',
				block_number: '2'
			}
		];
		const [e] = await getRecentChainEvents('token');
		expect(e.kind).toBe('Parcel');
		expect(e.href).toBeNull();
		expect(e.registryUrl).toBe('http://localhost:8080/obp/dynamic-entity/parcel/parcel_local_2');
	});

	it('orders newest block first and respects the limit', async () => {
		lists['parcel_on_chain'] = [
			{ parcel_id: 'a', token_id: '1', block_number: '5' },
			{ parcel_id: 'b', token_id: '2', block_number: '9' },
			{ parcel_id: 'c', token_id: '3', block_number: '7' }
		];
		const events = await getRecentChainEvents('token', 2);
		expect(events.map((e) => e.blockNumber)).toEqual([9, 7]);
	});

	it('still returns the other mirrors when one is unavailable', async () => {
		delete lists['parcel_on_chain']; // makes that fetch throw
		lists['activity_on_chain'] = [{ activity_id: 'a1', token_id: '1', block_number: '3' }];
		const events = await getRecentChainEvents('token');
		expect(events).toHaveLength(1);
		expect(events[0].kind).toBe('Activity');
	});
});

describe('getChainSyncStatus', () => {
	it('returns null when the mirror has never run', async () => {
		expect(await getChainSyncStatus('token')).toBeNull();
	});

	it('picks the most recently synced record if several ever exist', async () => {
		lists['chain_sync_status'] = [
			{ sync_key: 'chain-2025', synced_at: '2026-09-09T05:00:00Z' },
			{ sync_key: 'chain-2025', synced_at: '2026-09-09T05:30:43Z' }
		];
		const s = await getChainSyncStatus('token');
		expect(s?.synced_at).toBe('2026-09-09T05:30:43Z');
	});
});
