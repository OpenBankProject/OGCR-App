import { env } from '$env/dynamic/public';

/**
 * The public registry's activity detail page (/registry/activities/<id>).
 *
 * Like the registry list (see ./activities.ts), this reads OBP Dynamic Queries, called
 * without an access token, never the dynamic entities directly. A Query cannot nest one
 * join inside another, so the page reads four of them, each filtered to the activity
 * with `obp_filter[activity_id]=eq:<id>`:
 *
 *   - the activity itself, with its country, operator, chosen certification scheme,
 *     verifications, media and latest on-chain mint;
 *   - its practices (activity -> link table -> practice name);
 *   - its Sustainable Development Goals (likewise);
 *   - its certificates of compliance, with the scheme certified under and the body.
 *
 * Sources: OGCR-DynamicEntities/registry_activity*_query.json, deployed with
 * `dynamic_resource_docs.py create <name>`. Each read degrades on its own: a Query that
 * is missing or forbidden leaves its section empty rather than failing the page.
 */

const QUERY_PREFIX = '/obp/dynamic-endpoint/dynamic-resource-doc/registry';
export const REGISTRY_ACTIVITY_PATH = `${QUERY_PREFIX}/activity-query`;
export const REGISTRY_ACTIVITY_PRACTICES_PATH = `${QUERY_PREFIX}/activity-practices-query`;
export const REGISTRY_ACTIVITY_SDGS_PATH = `${QUERY_PREFIX}/activity-sdgs-query`;
export const REGISTRY_ACTIVITY_CERTIFICATES_PATH = `${QUERY_PREFIX}/activity-certificates-query`;

export interface ActivityMedia {
	activity_media_id: string | null;
	title: string | null;
	link: string | null;
	activity_media_type: string | null;
	author: string | null;
	published_date: string | null;
	image: string | null;
}

/** One activity with what the detail page shows. Every field can be null: the Query
 *  left-joins, and OBP nulls any field hidden from the caller. */
export interface ActivityDetail {
	activity_id: string | null;
	name: string | null;
	summary: string | null;
	description: string | null;
	website: string | null;
	hero_image: string | null;
	image: string | null;
	activity_type: string | null;
	unit_types: string | null;
	city: string | null;
	country_id: string | null;
	country_name: string | null;
	multipolygon_coordinates: unknown;
	start_date: string | null;
	end_date: string | null;
	term_commitment: number | null;
	/** Declared as a string; in practice a JSON array such as `["biodiversity","soil_health"]`. */
	cobenefits: string | null;
	methodologies: string | null;
	monitoring_period_start_date: string | null;
	monitoring_period_end_date: string | null;
	/** The scheme the operator chose, before any certification. */
	certification_scheme_id: string | null;
	selected_certification_scheme_name: string | null;
	selected_certification_scheme_version: string | null;
	operator_id: string | null;
	operator_legal_name: string | null;
	operator_country_id: string | null;
	verifications: { status_code: string | null }[] | null;
	media: ActivityMedia[] | null;
	minted_at: number | null;
	token_id: string | number | null;
	contract_address: string | null;
	chain_id: number | null;
	tx_hash: string | null;
}

export interface ActivityPractice {
	technologies_practices_processes_id: string | null;
	practice_name: string | null;
}

export interface ActivitySdg {
	sustainable_development_goal_id: string | null;
	sustainable_development_goal_name: string | null;
	sustainable_development_goal_link: string | null;
}

export interface ActivityCertificate {
	certificate_of_compliance_id: string | null;
	certification_status: string | null;
	issue_date: string | null;
	expiry_date: string | null;
	certification_scheme_id: string | null;
	certification_scheme_name: string | null;
	certification_scheme_version: string | null;
	certification_body_id: string | null;
	certification_body_legal_name: string | null;
}

export interface QueryResult<T> {
	rows: T[];
	error: string | null;
}

/** Read one registry Query's rows for one activity. Never throws. */
async function readForActivity<T>(
	fetchFn: typeof fetch,
	path: string,
	rowsKey: string,
	activityId: string,
	extraParams: Record<string, string> = {}
): Promise<QueryResult<T>> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const params = new URLSearchParams({
		'obp_filter[activity_id]': `eq:${activityId}`,
		...extraParams
	});
	try {
		const response = await fetchFn(`${base}${path}?${params}`);
		if (!response.ok) {
			return { rows: [], error: `Registry returned HTTP ${response.status} from ${path}` };
		}
		const body = (await response.json()) as Record<string, unknown>;
		const rows = body[rowsKey];
		return { rows: Array.isArray(rows) ? (rows as T[]) : [], error: null };
	} catch (error) {
		return {
			rows: [],
			error: error instanceof Error ? error.message : 'Could not reach the registry'
		};
	}
}

export async function getActivityDetail(fetchFn: typeof fetch, activityId: string) {
	const [activity, practices, sdgs, certificates] = await Promise.all([
		readForActivity<ActivityDetail>(fetchFn, REGISTRY_ACTIVITY_PATH, 'activities', activityId),
		readForActivity<ActivityPractice>(
			fetchFn,
			REGISTRY_ACTIVITY_PRACTICES_PATH,
			'practices',
			activityId
		),
		readForActivity<ActivitySdg>(fetchFn, REGISTRY_ACTIVITY_SDGS_PATH, 'sdgs', activityId),
		// The certificate shown is the latest by issue date.
		readForActivity<ActivityCertificate>(
			fetchFn,
			REGISTRY_ACTIVITY_CERTIFICATES_PATH,
			'certificates',
			activityId,
			{ obp_sort_by: 'issue_date', obp_sort_direction: 'desc', obp_limit: '1' }
		)
	]);
	return {
		activity: activity.rows[0] ?? null,
		activityError: activity.error,
		practices: practices.rows,
		practicesError: practices.error,
		sdgs: sdgs.rows,
		sdgsError: sdgs.error,
		certificate: certificates.rows[0] ?? null,
		certificateError: certificates.error
	};
}

export type VerificationStatus = 'verified' | 'in_progress' | 'failed';

/**
 * The activity's verification status, from its activity_verification records. An
 * activity with no record has no status (null, shown as "Not yet verified"); it is
 * never defaulted to one of the three codes.
 *
 * activity_verification has no date, so "the most recent record" cannot be told apart.
 * Instead the strongest status wins: one verified record makes the activity verified,
 * else any in-progress record makes it in progress, else it failed.
 */
export function verificationStatus(
	verifications: { status_code: string | null }[] | null | undefined
): VerificationStatus | null {
	const codes = new Set((verifications ?? []).map((v) => v.status_code));
	if (codes.has('verified')) return 'verified';
	if (codes.has('in_progress')) return 'in_progress';
	if (codes.has('failed')) return 'failed';
	return null;
}

/** `["biodiversity","water_quality"]` -> ['Biodiversity', 'Water quality']. Accepts a
 *  JSON array or, failing that, a comma-separated list. */
export function parseCobenefits(value: string | null | undefined): string[] {
	if (!value?.trim()) return [];
	let items: unknown;
	try {
		items = JSON.parse(value);
	} catch {
		items = value.split(',');
	}
	if (!Array.isArray(items)) items = [items];
	return (items as unknown[])
		.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
		.map((item) => humanise(item.trim()));
}

/** 'water_quality' / 'CARBON_FARMING' -> 'Water quality' / 'Carbon farming'. */
export function humanise(code: string): string {
	const words = code.replace(/[_-]+/g, ' ').trim().toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Price per unit, by unit type. NOT in the schema: price is set by the marketplace or
 * the operator, outside the registry. These are the static mock values from the
 * min_field_matrix sheet's "Test data" tab, until a real source exists.
 */
const MOCK_PRICE_PER_UNIT_EUR: Record<string, number> = {
	'carbon farming sequestration': 10,
	'soil emission reduction': 18,
	'permanent removal': 37,
	'carbon storage in product': 28
};

export function mockPricePerUnit(unitType: string | null | undefined): number | null {
	return unitType ? (MOCK_PRICE_PER_UNIT_EUR[unitType.trim().toLowerCase()] ?? null) : null;
}

/**
 * Available units. NOT in the schema: a static mock value from the sheet's "Test data"
 * tab, the same for every activity. Placeholder pending a future on-chain credits
 * entity, parallel to parcel_on_chain; once an activity- or credit-level on-chain entity
 * holds issued units, replace this with a live read.
 */
export const MOCK_AVAILABLE_UNITS = 300;

/** 'IT' -> 'Italy (IT)'. activity and operator both store country_id, an ISO 3166-1
 *  alpha-2 code; the operator's is a second hop the Query cannot join, so its name comes
 *  from the browser's region names rather than the country entity. */
export function countryLabel(
	countryId: string | null | undefined,
	name?: string | null
): string | null {
	if (!countryId) return name ?? null;
	let resolved = name ?? null;
	if (!resolved) {
		try {
			resolved = new Intl.DisplayNames(['en'], { type: 'region' }).of(countryId) ?? null;
		} catch {
			resolved = null;
		}
	}
	return resolved && resolved !== countryId ? `${resolved} (${countryId})` : countryId;
}
