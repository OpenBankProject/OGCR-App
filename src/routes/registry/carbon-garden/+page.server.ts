import type { PageServerLoad } from './$types';
import { getCarbonGarden } from '$lib/registry/carbonGarden';

/**
 * The public version of the Carbon Garden, like the rest of the registry: read with no access token, so only public entities, with no plans or parcel shapes. A logged in user also gets a link to the full version at /carbon-garden.
 */
export const load: PageServerLoad = async ({ locals }) => ({
	...(await getCarbonGarden()),
	fullHref: locals.session.data.user ? '/carbon-garden' : null
});
