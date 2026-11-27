import type { PageServerLoad } from './$types';
import { getRegistryActivities, type RegistryActivity } from '$lib/registry/activities';

/**
 * Public operator view, built from the registry rows that name this operator. The
 * internal /operators/[operatorId] page needs a login, which the public registry
 * must not; this shows only what the registry already publishes — the operator's
 * legal name and the activities it operates.
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
	const { activities, error } = await getRegistryActivities(fetch);
	const operated = activities.filter((a: RegistryActivity) => a.operator_id === params.id);
	const legalName = operated.find((a) => a.operator_legal_name)?.operator_legal_name ?? null;
	return { operatorId: params.id, legalName, activities: operated, error };
};
