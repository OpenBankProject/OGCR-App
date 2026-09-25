import type { PageServerLoad } from './$types';
import { getRegistryActivities, type RegistryActivity } from '$lib/registry/activities';

/**
 * Minimal certificate view. The brief keeps this deliberately small: enough to make
 * the registry's Certificate column a working link, not a full certificate profile.
 *
 * There is no public endpoint for a single certificate, so this reads the registry
 * activities and picks the matching row — the registry endpoint already carries the
 * certificate's own fields. When a certificate detail endpoint exists, this loader is
 * the only thing that changes.
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
	const { activities, error } = await getRegistryActivities(fetch);
	const activity =
		activities.find((a: RegistryActivity) => a.certificate_of_compliance_id === params.id) ?? null;
	return { certificateId: params.id, activity, error };
};
