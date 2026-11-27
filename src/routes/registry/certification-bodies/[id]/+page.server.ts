import type { PageServerLoad } from './$types';
import { getCertificationBody } from '$lib/registry/certification';

/** Public: a certification body is a public dynamic entity, read anonymously. */
export const load: PageServerLoad = async ({ params, fetch }) => {
	return { bodyId: params.id, ...(await getCertificationBody(fetch, params.id)) };
};
