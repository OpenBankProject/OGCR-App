import type { PageServerLoad } from './$types';
import { buildSetupReport } from '$lib/server/setup';

/** Public, like everything it reads: see $lib/server/setup.ts. */
export const load: PageServerLoad = async ({ fetch }) => {
	return { report: await buildSetupReport(fetch) };
};
