import { obp_requests } from '$lib/obp/requests';
import { ENTITY_COUNTRY } from '$lib/constants/entities';
import type { CountryRecord } from './options';

export type { CountryRecord };

/**
 * The countries the registry knows about, from the `country` dynamic entity.
 *
 * `country_id` is the value stored on other entities (operator, activity), so a
 * form offers `country_name` and submits `country_id`. Sorted by name, since
 * that is the order a picker reads in.
 */
export async function getCountries(accessToken: string): Promise<CountryRecord[]> {
	const response = await obp_requests.get(`/obp/dynamic-entity/${ENTITY_COUNTRY}`, accessToken);
	const records = (response?.[`${ENTITY_COUNTRY}_list`] || []) as Array<Record<string, unknown>>;

	return records
		.map((record) => ({
			country_id: typeof record.country_id === 'string' ? record.country_id : '',
			country_name: typeof record.country_name === 'string' ? record.country_name : ''
		}))
		.filter((country) => country.country_id !== '')
		.map((country) => ({ ...country, country_name: country.country_name || country.country_id }))
		.sort((a, b) => a.country_name.localeCompare(b.country_name));
}
