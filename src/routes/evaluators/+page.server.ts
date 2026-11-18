import type { PageServerLoad } from './$types';
import { getToolLinks } from '$lib/obp/toolLinks';

/** Public. The OBP tools are found through OBP's app directory; one it has no URL for is left out. */
export const load: PageServerLoad = async ({ fetch }) => getToolLinks(fetch);
