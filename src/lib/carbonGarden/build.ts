/**
 * Turns registry rows into what the Carbon Garden canvas draws.
 *
 * Pure functions, so they can be unit tested; the page's loader runs them on the
 * server. The rows come from the registry Queries read by $lib/registry/carbonGarden,
 * which need a logged in user.
 *
 * An activity's total is the best figure the registry has for it, in this order: its
 * latest plan's expected total carbon removals, the net benefit on its latest
 * certificate of compliance, the net benefit verified for its parcels, or the carbon
 * credits issued for it. The total is spread over the activity's start and end dates
 * with a growth curve chosen from its practices, so the timing is a picture, not a
 * measurement. An activity with none of these figures is still drawn, but it stores
 * nothing; the page says so instead of inventing a figure.
 *
 * Each parcel is outlined by its verification status in activity_verification. An
 * activity with no readable parcel is drawn on its own area.
 */
import { toGeoJson } from '$lib/registry/activityAreas';
import { verificationStatus } from '$lib/registry/activityDetail';
import { certificateStatus, type CertificateStatus } from '$lib/registry/registryStatus';

/** The four net benefit fields that certificates and parcel verifications share. */
export interface NetBenefitFields {
	permanent_net_carbon_removal_benefit?: number | string | null;
	carbon_farming_temporary_net_carbon_removal_benefit?: number | string | null;
	carbon_farming_net_soil_emission_reduction_benefit?: number | string | null;
	carbon_storage_temporary_net_carbon_removal_benefit?: number | string | null;
}

/** One row of registry_carbon_garden_query. */
export interface GardenActivityRow {
	activity_id: string | null;
	name: string | null;
	summary: string | null;
	activity_type: string | null;
	unit_types: string | null;
	city: string | null;
	country_id: string | null;
	multipolygon_coordinates: unknown;
	start_date: string | null;
	end_date: string | null;
	plans:
		| {
				date_submitted: string | null;
				expected_total_carbon_removals: number | string | null;
				expected_total_soil_emissions: number | string | null;
				expected_net_benefit: number | string | null;
		  }[]
		| null;
	certificates:
		| (NetBenefitFields & {
				certification_status: string | null;
				issue_date: string | null;
				expiry_date: string | null;
		  })[]
		| null;
	verifications:
		| (NetBenefitFields & { parcel_id: string | null; status_code: string | null })[]
		| null;
	batches:
		| { amount: number | string | null; status_code: string | null; issue_date: string | null }[]
		| null;
}

/** One row of registry_carbon_garden_parcels_query. */
export interface GardenParcelRow {
	activity_id: string | null;
	parcel_id: string | null;
	multipolygon_coordinates: unknown;
}

/** One row of registry_activity_practices_query. */
export interface GardenPracticeRow {
	activity_id: string | null;
	practice_name: string | null;
}

/** What the scene draws inside a parcel. */
export type GardenKind =
	| 'field'
	| 'peat'
	| 'forest'
	| 'agro'
	| 'silvo'
	| 'hedge'
	| 'biochar'
	| 'dac'
	| 'timber'
	| 'hemp'
	| 'olive'
	| 'rice'
	| 'cows';

/** removal kinds are drawn as orbs falling in; `avoid` as puffs of avoided emissions. */
export type GardenCategory = 'farming' | 'permanent' | 'product' | 'avoid';

/** Growth curve: S-curve, fast start then flattening, even, or front-loaded. */
export type GardenShape = 's' | 'sat' | 'lin' | 'front';

/** How a parcel stands in activity_verification: `verified`, `draft` (in progress),
 *  `failed`, or `none` when it has no verification (or the shape is the activity's own
 *  area and the activity has none). */
export type GardenOwnerStatus = 'verified' | 'failed' | 'draft' | 'none';

/** Where an activity's total comes from; null when the registry has no figure. */
export type GardenTotalSource = 'plan' | 'certificate' | 'verification' | 'issued';

export interface GardenParcel {
	id: string;
	/** Every ring of every polygon, as [longitude, latitude] pairs. */
	rings: [number, number][][];
	ha: number;
	st: GardenOwnerStatus;
}

export interface GardenActivity {
	id: string;
	name: string;
	summary: string;
	city: string;
	iso: string;
	lat: number;
	lon: number;
	type: string;
	kind: GardenKind;
	cat: GardenCategory;
	shape: GardenShape;
	/** YYYY-MM-DD */
	start: string;
	/** YYYY-MM-DD */
	end: string;
	/** Date the latest plan was submitted, YYYY-MM-DD, or null with no plan. */
	plan: string | null;
	ha: number;
	/** tCO₂e, from `source`; 0 when there is none. */
	total: number;
	source: GardenTotalSource | null;
	/** True when the registry has no figure, so the activity stores nothing. */
	est: boolean;
	/** From the latest plan, tCO₂e. */
	soil: number | null;
	net: number | null;
	/** Carbon credits issued and not cancelled, tCO₂e; null with no batches. */
	issued: number | null;
	/** Parcels by verification status, counted once per parcel. */
	parcelChecks: { verified: number; draft: number; failed: number };
	/** [issue date, expiry date or null, status] */
	certs: [string, string | null, CertificateStatus][];
	practices: string[];
	/** Indexes into GardenData.parcels. */
	par: number[];
}

export interface GardenData {
	acts: GardenActivity[];
	parcels: GardenParcel[];
	/** Activities left out, and why. */
	skipped: { noDates: number; noArea: number };
}

const date = (value: string | null | undefined): string | null => {
	const day = value?.trim().slice(0, 10) ?? '';
	return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) ? day : null;
};

const num = (value: unknown): number | null => {
	if (value === null || value === undefined || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
};

/** Every ring of every polygon in a geometry, Feature or FeatureCollection. */
export function ringsOf(raw: unknown): [number, number][][] {
	const geo = toGeoJson(raw) as Record<string, any> | null;
	const out: [number, number][][] = [];
	const ring = (r: unknown) => {
		if (!Array.isArray(r)) return;
		const pts = r
			.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
			.map((p) => [Number(p[0]), Number(p[1])] as [number, number]);
		if (pts.length >= 3) out.push(pts);
	};
	const walk = (g: Record<string, any> | null | undefined) => {
		if (!g) return;
		if (g.type === 'FeatureCollection') (g.features ?? []).forEach(walk);
		else if (g.type === 'Feature') walk(g.geometry);
		else if (g.type === 'GeometryCollection') (g.geometries ?? []).forEach(walk);
		else if (g.type === 'Polygon') (g.coordinates ?? []).forEach(ring);
		else if (g.type === 'MultiPolygon')
			(g.coordinates ?? []).forEach((poly: unknown[]) => (poly ?? []).forEach(ring));
	};
	walk(geo);
	return out;
}

/** Area in hectares, on a local flat projection: close enough for parcels. The first
 *  ring of each polygon adds and the rest subtract, so treat this as an estimate when
 *  the rings came from several polygons. */
export function areaHa(rings: [number, number][][]): number {
	let total = 0;
	for (const ring of rings) {
		const lat0 = (ring.reduce((s, p) => s + p[1], 0) / ring.length) * (Math.PI / 180);
		const kx = 111320 * Math.cos(lat0);
		const ky = 110540;
		let a = 0;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			a += ring[j][0] * kx * (ring[i][1] * ky) - ring[i][0] * kx * (ring[j][1] * ky);
		}
		total += Math.abs(a) / 2;
	}
	return total / 1e4;
}

/** Category from the activity type and unit types. */
export function categoryOf(activityType: string | null, unitTypes: string | null): GardenCategory {
	const text = `${activityType ?? ''} ${unitTypes ?? ''}`.toLowerCase().replace(/_/g, ' ');
	if (/emission reduction/.test(text) && !/removal|sequestration/.test(text)) return 'avoid';
	if (/permanent/.test(text)) return 'permanent';
	if (/product/.test(text)) return 'product';
	return 'farming';
}

const KIND_RULES: [RegExp, GardenKind][] = [
	[/peat|wetland/, 'peat'],
	[/biochar/, 'biochar'],
	[/direct air|dacs|beccs|biogenic emissions|geological/, 'dac'],
	[/wood based|timber/, 'timber'],
	[/bio based construction|hemp/, 'hemp'],
	[/agroforest/, 'agro'],
	[/silvopast/, 'silvo'],
	[/hedge|landscape feature/, 'hedge'],
	[/afforest|reforest|forest/, 'forest'],
	[/graz|livestock|grassland/, 'cows'],
	[/rice/, 'rice'],
	[/olive/, 'olive']
];

/** What to draw, from the practices first and then the activity's own words. */
export function kindOf(practices: string[], words: string, category: GardenCategory): GardenKind {
	for (const text of [practices.join(' '), words]) {
		const lower = text.toLowerCase().replace(/_/g, ' ');
		for (const [rule, kind] of KIND_RULES) if (rule.test(lower)) return kind;
	}
	if (category === 'permanent') return 'biochar';
	if (category === 'product') return 'timber';
	return 'field';
}

const SHAPE_BY_KIND: Record<GardenKind, GardenShape> = {
	forest: 's',
	agro: 's',
	silvo: 's',
	hedge: 's',
	olive: 's',
	field: 'sat',
	cows: 'sat',
	rice: 'sat',
	peat: 'sat',
	biochar: 'lin',
	dac: 'lin',
	timber: 'front',
	hemp: 'front'
};

const OWNER_STATUS = {
	verified: 'verified',
	failed: 'failed',
	in_progress: 'draft'
} as const;

/** The sum of the net benefit fields that have a value, or null when none has. */
export function netBenefit(row: NetBenefitFields): number | null {
	const values = [
		row.permanent_net_carbon_removal_benefit,
		row.carbon_farming_temporary_net_carbon_removal_benefit,
		row.carbon_farming_net_soil_emission_reduction_benefit,
		row.carbon_storage_temporary_net_carbon_removal_benefit
	]
		.map(num)
		.filter((value): value is number => value !== null);
	return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

/** The latest plan by submission date; one with no date comes last. */
export function latestPlan(row: GardenActivityRow) {
	return [...(row.plans ?? [])].sort((a, b) =>
		(date(b.date_submitted) ?? '').localeCompare(date(a.date_submitted) ?? '')
	)[0];
}

/** The activity's total and where it comes from. */
export function totalOf(row: GardenActivityRow): {
	total: number | null;
	source: GardenTotalSource | null;
	issued: number | null;
} {
	const issuedBatches = (row.batches ?? []).filter((batch) => batch.status_code !== 'cancelled');
	const amounts = issuedBatches.map((batch) => num(batch.amount)).filter((n) => n !== null);
	const issued = amounts.length ? amounts.reduce((sum, n) => sum + n, 0) : null;

	const planTotal = num(latestPlan(row)?.expected_total_carbon_removals);
	if (planTotal !== null && planTotal > 0) return { total: planTotal, source: 'plan', issued };

	const latestCertificate = [...(row.certificates ?? [])]
		.filter((certificate) => netBenefit(certificate) !== null)
		.sort((a, b) => (date(b.issue_date) ?? '').localeCompare(date(a.issue_date) ?? ''))[0];
	if (latestCertificate)
		return { total: netBenefit(latestCertificate), source: 'certificate', issued };

	// One figure per parcel: a parcel verified more than once counts its largest figure.
	const byParcel = new Map<string, number>();
	for (const verification of row.verifications ?? []) {
		const value = netBenefit(verification);
		if (value === null) continue;
		const parcelId = verification.parcel_id ?? `row:${byParcel.size}`;
		byParcel.set(parcelId, Math.max(byParcel.get(parcelId) ?? -Infinity, value));
	}
	if (byParcel.size)
		return {
			total: [...byParcel.values()].reduce((sum, n) => sum + n, 0),
			source: 'verification',
			issued
		};

	if (issued !== null) return { total: issued, source: 'issued', issued };
	return { total: null, source: null, issued };
}

function groupBy<T>(rows: T[], key: (row: T) => string | null): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const row of rows) {
		const k = key(row);
		if (!k) continue;
		const list = map.get(k);
		if (list) list.push(row);
		else map.set(k, [row]);
	}
	return map;
}

export function buildGarden(
	activityRows: GardenActivityRow[],
	parcelRows: GardenParcelRow[],
	practiceRows: GardenPracticeRow[]
): GardenData {
	const parcels: GardenParcel[] = [];
	const parcelIndex = new Map<string, number>();
	const parcelsByActivity = groupBy(parcelRows, (row) => row.activity_id);
	const practicesByActivity = groupBy(practiceRows, (row) => row.activity_id);
	// A parcel's status from every activity's verifications of it.
	const verificationsByParcel = groupBy(
		activityRows.flatMap((row) => row.verifications ?? []),
		(v) => v.parcel_id
	);
	const acts: GardenActivity[] = [];
	const skipped = { noDates: 0, noArea: 0 };

	for (const row of activityRows) {
		const activityId = row.activity_id;
		if (!activityId) continue;
		const start = date(row.start_date);
		const end = date(row.end_date);
		if (!start || !end || end < start) {
			skipped.noDates++;
			continue;
		}

		// Parcels linked to the activity; the activity's own area when none can be read.
		const par: number[] = [];
		for (const parcelRow of parcelsByActivity.get(activityId) ?? []) {
			const parcelId = parcelRow.parcel_id;
			if (!parcelId) continue;
			let index = parcelIndex.get(parcelId);
			if (index === undefined) {
				const rings = ringsOf(parcelRow.multipolygon_coordinates);
				if (!rings.length) continue;
				const status = verificationStatus(verificationsByParcel.get(parcelId));
				index = parcels.length;
				parcels.push({
					id: parcelId,
					rings,
					ha: areaHa(rings),
					st: status ? OWNER_STATUS[status] : 'none'
				});
				parcelIndex.set(parcelId, index);
			}
			if (!par.includes(index)) par.push(index);
		}
		if (!par.length) {
			const rings = ringsOf(row.multipolygon_coordinates);
			if (!rings.length) {
				skipped.noArea++;
				continue;
			}
			const status = verificationStatus(row.verifications);
			par.push(parcels.length);
			parcels.push({
				id: `activity:${activityId}`,
				rings,
				ha: areaHa(rings),
				st: status ? OWNER_STATUS[status] : 'none'
			});
		}

		// Each parcel counted once, by its best status.
		const parcelChecks = { verified: 0, draft: 0, failed: 0 };
		for (const checks of groupBy(row.verifications ?? [], (v) => v.parcel_id).values()) {
			const status = verificationStatus(checks);
			if (status) parcelChecks[OWNER_STATUS[status]]++;
		}

		const points = par.flatMap((index) => parcels[index].rings[0]);
		const lon = points.reduce((s, p) => s + p[0], 0) / points.length;
		const lat = points.reduce((s, p) => s + p[1], 0) / points.length;

		const plan = latestPlan(row);
		const { total, source, issued } = totalOf(row);

		const practices = (practicesByActivity.get(activityId) ?? [])
			.map((p) => p.practice_name?.trim() ?? '')
			.filter(Boolean);
		const cat = categoryOf(row.activity_type, row.unit_types);
		const kind = kindOf(practices, `${row.name ?? ''} ${row.summary ?? ''}`, cat);

		const certs = (row.certificates ?? [])
			.map((c) => [
				date(c.issue_date),
				date(c.expiry_date),
				certificateStatus(c.certification_status)
			])
			.filter((c): c is [string, string | null, CertificateStatus] => c[0] !== null)
			.sort((a, b) => a[0].localeCompare(b[0]));

		const hasTotal = total !== null && total > 0;
		acts.push({
			id: activityId,
			name: row.name?.trim() || activityId,
			summary: row.summary ?? '',
			city: row.city ?? '',
			iso: row.country_id?.trim().toUpperCase() ?? '',
			lat,
			lon,
			type: row.activity_type ?? '',
			kind,
			cat,
			shape: SHAPE_BY_KIND[kind],
			start,
			end,
			plan: date(plan?.date_submitted),
			ha: par.reduce((s, index) => s + parcels[index].ha, 0),
			total: hasTotal ? total : 0,
			source: hasTotal ? source : null,
			est: !hasTotal,
			soil: num(plan?.expected_total_soil_emissions),
			net: num(plan?.expected_net_benefit),
			issued,
			parcelChecks,
			certs,
			practices,
			par
		});
	}
	return { acts, parcels, skipped };
}
