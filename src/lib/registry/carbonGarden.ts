import { obp_requests } from '$lib/obp/requests';
import { REGISTRY_ACTIVITY_PRACTICES_PATH } from '$lib/registry/activityDetail';
import {
	buildGarden,
	type GardenActivityRow,
	type GardenData,
	type GardenParcelRow,
	type GardenPracticeRow
} from '$lib/carbonGarden/build';

/**
 * Data for the Carbon Garden, in two versions:
 *
 *   - /carbon-garden, for logged in users, reads with the user's access token: registry_carbon_garden_query (every activity with its plans, certificates, parcel verifications and carbon credit batches) and registry_carbon_garden_parcels_query (every parcel linked to an activity, with its shape). These read entities without public access, so OBP answers them only for a user who may read those entities.
 *   - /registry/carbon-garden, the public version, reads with no token: registry_carbon_garden_public_query, the same activities without plans. Parcel shapes are not public, so each activity is drawn on its own area.
 *
 * Both also read registry_activity_practices_query, which the public activity detail page reads too. Never the dynamic entities directly, and each Query unfiltered.
 *
 * Sources: OGCR-DynamicEntities/registry_*_query.json, deployed with `dynamic_resource_docs.py create <name>`. Only the activities Query is required: without parcels an activity is drawn on its own area, and without practices the scene is chosen from the activity's name and type.
 */

const QUERY_PREFIX = '/obp/dynamic-endpoint/dynamic-resource-doc/registry';
export const REGISTRY_CARBON_GARDEN_PATH = `${QUERY_PREFIX}/carbon-garden-query`;
export const REGISTRY_CARBON_GARDEN_PARCELS_PATH = `${QUERY_PREFIX}/carbon-garden-parcels-query`;
export const REGISTRY_CARBON_GARDEN_PUBLIC_PATH = `${QUERY_PREFIX}/carbon-garden-public-query`;

async function readRows<T>(
	path: string,
	rowsKey: string,
	accessToken: string | undefined
): Promise<{ rows: T[]; error: string | null }> {
	try {
		const body = (await obp_requests.get(path, accessToken)) as Record<string, unknown> | null;
		const rows = body?.[rowsKey];
		return { rows: Array.isArray(rows) ? (rows as T[]) : [], error: null };
	} catch (error) {
		return {
			rows: [],
			error: error instanceof Error ? error.message : 'Could not reach the registry'
		};
	}
}

export interface CarbonGardenResult {
	garden: GardenData;
	/** The activities could not be read, so there is nothing to draw. */
	error: string | null;
	/** Parts that could not be read; the page still draws what it has. */
	warnings: string[];
	/** The public version: no plans and no parcel shapes. */
	publicView: boolean;
}

/** The full version with an access token, the public version without one. Never throws; callers render `error` and `warnings` themselves. */
export async function getCarbonGarden(accessToken?: string): Promise<CarbonGardenResult> {
	const publicView = !accessToken;
	const noRows = Promise.resolve({ rows: [] as GardenParcelRow[], error: null });
	const [activities, parcels, practices] = await Promise.all([
		readRows<GardenActivityRow>(
			publicView ? REGISTRY_CARBON_GARDEN_PUBLIC_PATH : REGISTRY_CARBON_GARDEN_PATH,
			'activities',
			accessToken
		),
		publicView
			? noRows
			: readRows<GardenParcelRow>(REGISTRY_CARBON_GARDEN_PARCELS_PATH, 'parcels', accessToken),
		readRows<GardenPracticeRow>(REGISTRY_ACTIVITY_PRACTICES_PATH, 'practices', accessToken)
	]);
	const warnings = [
		parcels.error && `Parcels: ${parcels.error}`,
		practices.error && `Practices: ${practices.error}`
	].filter((warning): warning is string => !!warning);
	return {
		garden: buildGarden(activities.rows, parcels.rows, practices.rows),
		error: activities.error,
		warnings,
		publicView
	};
}
