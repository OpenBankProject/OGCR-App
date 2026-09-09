import { describe, it, expect, vi, beforeEach } from 'vitest';

const lists: Record<string, any[]> = {};

vi.mock('$lib/obp/requests', () => ({
	obp_requests: {
		get: async (endpoint: string) => {
			const entity = endpoint.replace('/obp/dynamic-entity/', '');
			return { [`${entity}_list`]: lists[entity] ?? [] };
		}
	}
}));

const { getTokenizationBacklog } = await import('./onChain');

beforeEach(() => {
	for (const k of Object.keys(lists)) delete lists[k];
});

describe('credit batch backlog', () => {
	it('expects one batch per positive benefit amount, keyed by the activity NFT id', async () => {
		lists['activity_monitoring_period_verification'] = [
			{
				activity_monitoring_period_verification_id: 'mv1',
				activity_id: 'a1',
				status_code: 'verified',
				permanent_net_carbon_removal_benefit: 6,
				carbon_farming_net_soil_emission_reduction_benefit: 4,
				// zero and absent fields are not work
				carbon_farming_temporary_net_carbon_removal_benefit: 0
			}
		];
		lists['activity_on_chain'] = [{ activity_id: 'a1', token_id: '7' }];
		lists['carbon_credit_batch_on_chain'] = [
			{ batch_key: '7:permanent_net_carbon_removal_benefit' }
		];

		const b = await getTokenizationBacklog('token');
		const batches = b.entries.find((e) => e.label === 'Credit batches')!;
		expect(batches.expected).toBe(2);
		expect(batches.onChain).toBe(1);
		expect(batches.pending).toEqual(['7:carbon_farming_net_soil_emission_reduction_benefit']);
	});

	it('shows a batch as blocked when its activity is not tokenized yet', async () => {
		lists['activity_monitoring_period_verification'] = [
			{ activity_id: 'a2', status_code: 'verified', permanent_net_carbon_removal_benefit: 3 }
		];
		lists['activity_on_chain'] = []; // ActivityNFT not minted, tokenizer defers

		const b = await getTokenizationBacklog('token');
		const batches = b.entries.find((e) => e.label === 'Credit batches')!;
		expect(batches.pending).toEqual(['a2:permanent_net_carbon_removal_benefit (awaiting ActivityNFT)']);
	});

	it('ignores unverified monitoring periods', async () => {
		lists['activity_monitoring_period_verification'] = [
			{ activity_id: 'a3', status_code: 'pending', permanent_net_carbon_removal_benefit: 5 }
		];
		const b = await getTokenizationBacklog('token');
		expect(b.entries.find((e) => e.label === 'Credit batches')!.expected).toBe(0);
	});

	it('covers all four token types', async () => {
		const b = await getTokenizationBacklog('token');
		expect(b.entries.map((e) => e.label)).toEqual([
			'Parcels',
			'Activities',
			'Certificates',
			'Credit batches'
		]);
	});

	it('no longer calls the activity rule an assumption', async () => {
		const b = await getTokenizationBacklog('token');
		const activities = b.entries.find((e) => e.label === 'Activities')!;
		expect(activities.rule).not.toMatch(/assum/i);
	});
});
