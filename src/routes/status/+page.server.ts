import type { PageServerLoad } from './$types';
import { buildSystemStatus } from '$lib/server/systemStatus';

export const load: PageServerLoad = async ({ locals }) => {
	return buildSystemStatus(locals.session.data.oauth?.access_token);
};
