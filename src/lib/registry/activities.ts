import { env } from '$env/dynamic/public';

/**
 * The public registry read model.
 *
 * Unlike the rest of the app, the registry does NOT read dynamic entities directly.
 * It calls one OBP Dynamic Resource Doc that joins activity, operator, country,
 * certificate_of_compliance and activity_verification server-side and projects only
 * the columns below. That matters for two reasons:
 *
 *   - It is public. The endpoint is created with `roles: ""`, so no access token is
 *     involved and a signed-out visitor sees the same registry a buyer would.
 *   - Because it is public, the projection IS the access control. Opening the
 *     underlying entities for public read would expose every field on them; this
 *     exposes the registry columns and nothing else.
 *
 * Source of the endpoint: OGCR-DynamicEntities/registry_activities_endpoint.scala,
 * deployed with dynamic_resource_docs.py.
 */

/** Served under an extra `dynamic-resource-doc` segment — see the note in
 *  OGCR-DynamicEntities/dynamic_resource_docs.py; the Dynamic Endpoint glossary
 *  documents a shorter path that 404s. */
export const REGISTRY_ACTIVITIES_PATH =
	'/obp/dynamic-endpoint/dynamic-resource-doc/registry/activities';

/** One row of the registry. Every field can be null: the endpoint left-joins, and an
 *  activity with no certificate or no resolvable operator is normal, not an error. */
export interface RegistryActivity {
	activity_id: string | null;
	name: string | null;
	summary: string | null;
	activity_type: string | null;
	country_id: string | null;
	country_name: string | null;
	city: string | null;
	start_date: string | null;
	end_date: string | null;
	monitoring_period_start_date: string | null;
	monitoring_period_end_date: string | null;
	operator_id: string | null;
	operator_legal_name: string | null;
	verification_status: string | null;
	certificate_of_compliance_id: string | null;
	certification_status: string | null;
	certificate_issue_date: string | null;
	certificate_expiry_date: string | null;
}

export interface RegistryActivitiesResult {
	activities: RegistryActivity[];
	count: number;
	error: string | null;
}

/**
 * Fetch the registry activities. Never throws: the registry pages are mostly public
 * copy, and a registry outage should degrade the data rather than replace the page
 * with an error. Callers render `error` themselves.
 *
 * Pass the `fetch` from a SvelteKit `load` so the request participates in SSR.
 */
export async function getRegistryActivities(
	fetchFn: typeof fetch = fetch
): Promise<RegistryActivitiesResult> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const url = `${base}${REGISTRY_ACTIVITIES_PATH}`;

	try {
		const response = await fetchFn(url);
		if (!response.ok) {
			return {
				activities: [],
				count: 0,
				error: `Registry returned HTTP ${response.status} from ${REGISTRY_ACTIVITIES_PATH}`
			};
		}
		const body = (await response.json()) as { activities?: RegistryActivity[]; count?: number };
		const activities = body.activities ?? [];
		return { activities, count: body.count ?? activities.length, error: null };
	} catch (error) {
		return {
			activities: [],
			count: 0,
			error: error instanceof Error ? error.message : 'Could not reach the registry'
		};
	}
}

/** Distinct non-empty values of a field, sorted — used to populate the filter dropdowns
 *  from the data actually present rather than a hardcoded list. */
export function distinctValues(
	activities: RegistryActivity[],
	field: keyof RegistryActivity
): string[] {
	const seen = new Set<string>();
	for (const activity of activities) {
		const value = activity[field];
		if (typeof value === 'string' && value.trim() !== '') seen.add(value);
	}
	return [...seen].sort((a, b) => a.localeCompare(b));
}
