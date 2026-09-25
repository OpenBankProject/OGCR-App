import type { PageServerLoad } from './$types';
import { getRegistryActivities } from '$lib/registry/activities';

/**
 * The registry is a public surface, so this page takes no access token: the activity
 * count comes from the same public endpoint the activity list uses, and a signed-out
 * visitor sees the same figure a buyer would.
 *
 * Issued / Active / Retired units have no source yet. There is no issuance or
 * retirement data in the DCR schema, and the only credit quantities anywhere
 * (marketplace listings) are operator-entered commercial terms, not registry facts —
 * per design_goals.md the registry owns the activity's facts. Those tiles say so
 * rather than showing a fabricated number.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const { count, error } = await getRegistryActivities(fetch);
	return { activityCount: error ? null : count, error };
};
