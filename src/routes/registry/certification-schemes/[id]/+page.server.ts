import type { PageServerLoad } from './$types';
import { getCertificationScheme } from '$lib/registry/certification';

/** Public: a certification scheme is a public dynamic entity, read anonymously. */
export const load: PageServerLoad = async ({ params, fetch }) => {
	return { schemeId: params.id, ...(await getCertificationScheme(fetch, params.id)) };
};
