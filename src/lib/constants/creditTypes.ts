// The four CRCF carbon-credit unit categories (per OGCR D6.5), plus an
// "Uncategorized" fallback for activity `type` values that don't map cleanly.
// `badgeClass` uses Skeleton tonal presets for colour-coding.

export type CreditCategoryKey =
	| 'permanent_carbon_removal'
	| 'soil_emission_reduction'
	| 'carbon_farming_sequestration'
	| 'carbon_storage_in_product'
	| 'uncategorized';

export interface CreditCategory {
	key: CreditCategoryKey;
	label: string;
	badgeClass: string;
}

export const CREDIT_CATEGORIES: CreditCategory[] = [
	{
		key: 'permanent_carbon_removal',
		label: 'Permanent Carbon Removal',
		badgeClass: 'preset-tonal-primary'
	},
	{
		key: 'soil_emission_reduction',
		label: 'Soil Emission Reduction',
		badgeClass: 'preset-tonal-warning'
	},
	{
		key: 'carbon_farming_sequestration',
		label: 'Carbon Farming Sequestration',
		badgeClass: 'preset-tonal-success'
	},
	{
		key: 'carbon_storage_in_product',
		label: 'Carbon Storage in Product',
		badgeClass: 'preset-tonal-tertiary'
	}
];

export const UNCATEGORIZED: CreditCategory = {
	key: 'uncategorized',
	label: 'Uncategorized',
	badgeClass: 'preset-tonal-surface'
};

const byKey = new Map<CreditCategoryKey, CreditCategory>(
	[...CREDIT_CATEGORIES, UNCATEGORIZED].map((c) => [c.key, c])
);

/**
 * Map a free-text activity `type` (e.g. "CARBON_FARMING") onto one of the four
 * CRCF categories. Returns the Uncategorized fallback when nothing matches.
 */
export function categorizeActivityType(type?: string | null): CreditCategory {
	const t = (type ?? '').toLowerCase();
	if (!t) return UNCATEGORIZED;
	if (t.includes('storage') || t.includes('product')) return byKey.get('carbon_storage_in_product')!;
	if (t.includes('soil')) return byKey.get('soil_emission_reduction')!;
	if (t.includes('farming') || t.includes('sequestration'))
		return byKey.get('carbon_farming_sequestration')!;
	if (t.includes('permanent') || t.includes('removal'))
		return byKey.get('permanent_carbon_removal')!;
	if (t.includes('reduction') || t.includes('emission'))
		return byKey.get('soil_emission_reduction')!;
	return UNCATEGORIZED;
}
