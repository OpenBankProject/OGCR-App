import { describe, expect, it } from 'vitest';
import {
	areaHa,
	buildGarden,
	categoryOf,
	kindOf,
	netBenefit,
	ringsOf,
	totalOf,
	type GardenActivityRow,
	type GardenParcelRow
} from './build';

const square = (lon: number, lat: number, size = 0.01) => ({
	type: 'MultiPolygon',
	coordinates: [
		[
			[
				[lon, lat],
				[lon + size, lat],
				[lon + size, lat + size],
				[lon, lat + size],
				[lon, lat]
			]
		]
	]
});

const activity = (overrides: Partial<GardenActivityRow> = {}): GardenActivityRow => ({
	activity_id: 'act-1',
	name: 'Beauce soil carbon',
	summary: 'Cover crops on arable land',
	activity_type: 'CARBON_FARMING',
	unit_types: 'removal_shortlived',
	city: 'Orléans',
	country_id: 'fr',
	multipolygon_coordinates: square(2, 48),
	start_date: '2026-01-01',
	end_date: '2030-12-31',
	plans: [
		{
			date_submitted: '2025-06-01',
			expected_total_carbon_removals: 100,
			expected_total_soil_emissions: 10,
			expected_net_benefit: 90
		},
		{
			date_submitted: '2025-09-01',
			expected_total_carbon_removals: '120.5',
			expected_total_soil_emissions: null,
			expected_net_benefit: null
		}
	],
	certificates: [
		{
			certification_status: 'Certified',
			issue_date: '2027-01-01T00:00:00Z',
			expiry_date: null,
			carbon_farming_temporary_net_carbon_removal_benefit: 80,
			carbon_farming_net_soil_emission_reduction_benefit: '20.5'
		}
	],
	verifications: [
		{ parcel_id: 'p-1', status_code: 'in_progress', permanent_net_carbon_removal_benefit: 40 },
		{ parcel_id: 'p-1', status_code: 'verified', permanent_net_carbon_removal_benefit: 50 },
		{ parcel_id: 'p-2', status_code: 'failed', permanent_net_carbon_removal_benefit: 30 }
	],
	batches: [
		{ amount: 10, status_code: 'issued', issue_date: '2028-01-01' },
		{ amount: '5', status_code: 'cancelled', issue_date: '2028-01-01' }
	],
	...overrides
});

describe('ringsOf', () => {
	it('reads a MultiPolygon, a JSON string and a FeatureCollection', () => {
		expect(ringsOf(square(2, 48))).toHaveLength(1);
		expect(ringsOf(JSON.stringify(square(2, 48)))).toHaveLength(1);
		expect(
			ringsOf({
				type: 'FeatureCollection',
				features: [
					{ type: 'Feature', geometry: square(2, 48) },
					{ type: 'Feature', geometry: square(3, 48) }
				]
			})
		).toHaveLength(2);
	});

	it('is empty for nothing usable', () => {
		expect(ringsOf(null)).toEqual([]);
		expect(ringsOf('not json')).toEqual([]);
	});
});

describe('areaHa', () => {
	it('measures a 0.01 degree square near 48N as about 82 ha', () => {
		expect(areaHa(ringsOf(square(2, 48)))).toBeGreaterThan(78);
		expect(areaHa(ringsOf(square(2, 48)))).toBeLessThan(86);
	});
});

describe('categoryOf and kindOf', () => {
	it('treats an emission reduction unit as avoided emissions', () => {
		expect(categoryOf('CARBON_FARMING', 'Soil Emission Reduction')).toBe('avoid');
		expect(categoryOf('PERMANENT_CARBON_REMOVAL', null)).toBe('permanent');
		expect(categoryOf('CARBON_STORAGE_IN_PRODUCTS', null)).toBe('product');
		expect(categoryOf('CARBON_FARMING', 'removal_shortlived')).toBe('farming');
	});

	it('picks the scene from the practices before the activity name', () => {
		expect(kindOf(['Peatland Rewetting'], 'forest', 'farming')).toBe('peat');
		expect(kindOf(['Agroforestry'], '', 'farming')).toBe('agro');
		expect(kindOf([], 'New forest on old pasture', 'farming')).toBe('forest');
		expect(kindOf([], '', 'permanent')).toBe('biochar');
		expect(kindOf([], '', 'farming')).toBe('field');
	});
});

describe('netBenefit and totalOf', () => {
	it('adds the net benefit fields that have a value', () => {
		expect(
			netBenefit({
				permanent_net_carbon_removal_benefit: 1,
				carbon_storage_temporary_net_carbon_removal_benefit: '2'
			})
		).toBe(3);
		expect(netBenefit({ permanent_net_carbon_removal_benefit: null })).toBeNull();
	});

	it('prefers the latest plan, then the latest certificate, then parcel verifications, then issued credits', () => {
		expect(totalOf(activity())).toEqual({ total: 120.5, source: 'plan', issued: 10 });
		expect(totalOf(activity({ plans: [] }))).toEqual({
			total: 100.5,
			source: 'certificate',
			issued: 10
		});
		// p-1 counts its largest figure once; p-2 counts too.
		expect(totalOf(activity({ plans: null, certificates: [] }))).toEqual({
			total: 80,
			source: 'verification',
			issued: 10
		});
		expect(totalOf(activity({ plans: null, certificates: [], verifications: [] }))).toEqual({
			total: 10,
			source: 'issued',
			issued: 10
		});
		expect(
			totalOf(activity({ plans: null, certificates: null, verifications: null, batches: null }))
		).toEqual({ total: null, source: null, issued: null });
	});
});

describe('buildGarden', () => {
	const parcel = (activityId: string, parcelId: string): GardenParcelRow => ({
		activity_id: activityId,
		parcel_id: parcelId,
		multipolygon_coordinates: square(2, 48)
	});

	it('uses the latest plan, its parcels, certificates and practices', () => {
		const garden = buildGarden(
			[activity()],
			[parcel('act-1', 'p-1'), parcel('act-1', 'p-2')],
			[{ activity_id: 'act-1', practice_name: 'Cover Cropping' }]
		);
		expect(garden.parcels.map((p) => p.st)).toEqual(['verified', 'failed']);
		const [act] = garden.acts;
		expect(act.total).toBe(120.5);
		expect(act.source).toBe('plan');
		expect(act.est).toBe(false);
		expect(act.plan).toBe('2025-09-01');
		expect(act.issued).toBe(10);
		expect(act.parcelChecks).toEqual({ verified: 1, draft: 0, failed: 1 });
		expect(act.iso).toBe('FR');
		expect(act.certs).toEqual([['2027-01-01', null, 'certified']]);
		expect(act.practices).toEqual(['Cover Cropping']);
		expect(act.par).toEqual([0, 1]);
	});

	it('shares one parcel between activities that link to it', () => {
		const garden = buildGarden(
			[
				activity({ activity_id: 'a', verifications: [] }),
				activity({ activity_id: 'b', verifications: [] })
			],
			[parcel('a', 'p-shared'), parcel('b', 'p-shared')],
			[]
		);
		expect(garden.parcels).toHaveLength(1);
		expect(garden.acts.map((a) => a.par)).toEqual([[0], [0]]);
		expect(garden.parcels[0].st).toBe('none');
	});

	it("falls back to the activity's own area when no parcel can be read", () => {
		const garden = buildGarden([activity()], [], []);
		expect(garden.parcels[0].id).toBe('activity:act-1');
		expect(garden.parcels[0].st).toBe('verified');
	});

	it('draws an activity with no carbon figure but stores nothing for it', () => {
		const garden = buildGarden(
			[activity({ plans: [], certificates: [], verifications: [], batches: [] })],
			[],
			[]
		);
		expect(garden.acts[0].est).toBe(true);
		expect(garden.acts[0].total).toBe(0);
		expect(garden.acts[0].source).toBeNull();
		expect(garden.acts[0].plan).toBeNull();
	});

	it('leaves out and counts activities with no dates or no area', () => {
		const garden = buildGarden(
			[
				activity({ activity_id: 'no-dates', start_date: null }),
				activity({ activity_id: 'backwards', start_date: '2030-01-01', end_date: '2029-01-01' }),
				activity({ activity_id: 'no-area', multipolygon_coordinates: null })
			],
			[],
			[]
		);
		expect(garden.acts).toEqual([]);
		expect(garden.skipped).toEqual({ noDates: 2, noArea: 1 });
	});
});
