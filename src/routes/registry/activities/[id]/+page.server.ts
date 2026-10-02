import type { PageServerLoad } from './$types';
import { getRegistryActivities, type RegistryActivity } from '$lib/registry/activities';

/**
 * Public activity view: the registry row for one activity. Like the certificate
 * page, there is no public endpoint for a single activity, so this reads the
 * registry activities and picks the matching row, so it shows exactly the columns
 * the list does, with the same nulls for anything OBP hides from the caller.
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
	const { activities, error } = await getRegistryActivities(fetch);
	const activity = activities.find((a: RegistryActivity) => a.activity_id === params.id) ?? null;
	return { activityId: params.id, activity, error };
};
