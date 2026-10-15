import type { PageServerLoad } from './$types';
import { getRegistryActivities } from '$lib/registry/activities';
import { getRegistryActivityAreas } from '$lib/registry/activityAreas';

/**
 * Public: no access token. One call to the registry Dynamic Resource Doc, which has
 * already joined operator, country, certificate and verification server-side.
 *
 * The whole list is fetched once and filtered/sorted in the browser. That is right
 * while the registry is small, and it keeps filtering instant. If this ever holds the
 * "hundreds of activities" the brief anticipates, push search/filter/sort down into the
 * resource doc as query parameters rather than paginating client-side.
 *
 * `?view=map` also reads every activity's area for the map. The list view does not
 * pay for that call; switching views re-runs this loader, and the page's filters
 * survive because the component is reused.
 */
export const load: PageServerLoad = async ({ fetch, url }) => {
	const view = url.searchParams.get('view') === 'map' ? 'map' : 'list';
	const [{ activities, count, error }, areas] = await Promise.all([
		getRegistryActivities(fetch),
		view === 'map' ? getRegistryActivityAreas(fetch) : null
	]);
	return {
		activities,
		count,
		error,
		view,
		areas: areas?.areas ?? {},
		areasError: areas?.error ?? null
	};
};
