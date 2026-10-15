import { env } from '$env/dynamic/public';
import { REGISTRY_ACTIVITY_PATH } from '$lib/registry/activityDetail';

/**
 * The land each registry activity covers, for the registry map.
 *
 * The registry list Query does not project `multipolygon_coordinates` (it would make
 * every list load carry every polygon), so the map reads the activity detail Query
 * unfiltered instead: one anonymous call, every activity's area. Only the map view
 * makes this call.
 *
 * Parcel records themselves are not readable anonymously; the activity's own
 * multipolygon is the public record of the land it covers.
 */

export interface ActivityAreasResult {
	/** activity_id → GeoJSON geometry. Activities with no usable area are absent. */
	areas: Record<string, GeoJSON.GeoJsonObject>;
	error: string | null;
}

/** Never throws; callers render `error` themselves. */
export async function getRegistryActivityAreas(
	fetchFn: typeof fetch = fetch
): Promise<ActivityAreasResult> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	try {
		const response = await fetchFn(`${base}${REGISTRY_ACTIVITY_PATH}`);
		if (!response.ok) {
			return {
				areas: {},
				error: `Registry returned HTTP ${response.status} from ${REGISTRY_ACTIVITY_PATH}`
			};
		}
		const body = (await response.json()) as {
			activities?: { activity_id?: string | null; multipolygon_coordinates?: unknown }[];
		};
		const areas: Record<string, GeoJSON.GeoJsonObject> = {};
		for (const row of body.activities ?? []) {
			const geometry = toGeoJson(row.multipolygon_coordinates);
			if (row.activity_id && geometry) areas[row.activity_id] = geometry;
		}
		return { areas, error: null };
	} catch (error) {
		return {
			areas: {},
			error: error instanceof Error ? error.message : 'Could not reach the registry'
		};
	}
}

/**
 * `multipolygon_coordinates` is stored either as GeoJSON (a geometry, Feature or
 * FeatureCollection) or as a bare MultiPolygon coordinate array, and either way may
 * arrive as a JSON string. Null when it is empty or unparseable.
 */
export function toGeoJson(raw: unknown): GeoJSON.GeoJsonObject | null {
	if (raw === null || raw === undefined || raw === '') return null;
	try {
		const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
		if (Array.isArray(value)) {
			return value.length
				? ({ type: 'MultiPolygon', coordinates: value } as GeoJSON.MultiPolygon)
				: null;
		}
		if (
			value &&
			typeof value === 'object' &&
			typeof (value as { type?: unknown }).type === 'string'
		) {
			return value as GeoJSON.GeoJsonObject;
		}
		return null;
	} catch {
		return null;
	}
}
