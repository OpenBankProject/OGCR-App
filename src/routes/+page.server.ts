import type { PageServerLoad } from './$types';
import { getToolLinks } from '$lib/obp/toolLinks';

/** The OBP tools linked below the fold. A tool OBP has no URL for is null, and its card is left out. */
export const load: PageServerLoad = async ({ fetch }) => getToolLinks(fetch);
