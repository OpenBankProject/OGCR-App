import type { PageServerLoad } from './$types';
import { getGlossaryItems } from '$lib/obp/glossary';

/** The OBP glossary is the source of truth for how the tokens work: OGCR Smart Contracts
 *  is generated from the contracts' own documentation, and refers to OGCR Architecture for
 *  when each token is minted. */
const HELP_GLOSSARY_TITLES = ['OGCR Smart Contracts', 'OGCR Architecture'];

export const load: PageServerLoad = async ({ fetch }) => {
	return { glossaryItems: await getGlossaryItems(HELP_GLOSSARY_TITLES, fetch) };
};
