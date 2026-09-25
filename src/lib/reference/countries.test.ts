import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('$lib/obp/requests', () => ({
	obp_requests: { get }
}));

const { getCountries } = await import('./countries');

describe('getCountries', () => {
	beforeEach(() => vi.clearAllMocks());

	it('reads the country entity list and sorts by name', async () => {
		get.mockResolvedValueOnce({
			country_list: [
				{ country_id: 'DE', country_name: 'Germany' },
				{ country_id: 'AT', country_name: 'Austria' }
			]
		});

		expect(await getCountries('tok')).toEqual([
			{ country_id: 'AT', country_name: 'Austria' },
			{ country_id: 'DE', country_name: 'Germany' }
		]);
		expect(get).toHaveBeenCalledWith('/obp/dynamic-entity/country', 'tok');
	});

	it('drops records without a country_id and falls back to the id for a missing name', async () => {
		get.mockResolvedValueOnce({
			country_list: [{ country_name: 'Nowhere' }, { country_id: 'FR' }]
		});

		expect(await getCountries('tok')).toEqual([{ country_id: 'FR', country_name: 'FR' }]);
	});

	it('returns an empty list when the entity has no records', async () => {
		get.mockResolvedValueOnce({});
		expect(await getCountries('tok')).toEqual([]);
	});
});
