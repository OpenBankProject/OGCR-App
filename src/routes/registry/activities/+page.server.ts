import type { PageServerLoad } from './$types';
import { getRegistryActivities } from '$lib/registry/activities';

/**
 * Public: no access token. One call to the registry Dynamic Resource Doc, which has
 * already joined operator, country, certificate and verification server-side.
 *
 * The whole list is fetched once and filtered/sorted in the browser. That is right
 * while the registry is small, and it keeps filtering instant. If this ever holds the
 * "hundreds of activities" the brief anticipates, push search/filter/sort down into the
 * resource doc as query parameters rather than paginating client-side.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const { activities, count, error } = await getRegistryActivities(fetch);
	return { activities, count, error };
};
