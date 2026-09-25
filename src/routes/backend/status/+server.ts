import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildSystemStatus } from '$lib/server/systemStatus';

export const GET: RequestHandler = async ({ locals }) => {
	return json(await buildSystemStatus(locals.session.data.oauth?.access_token));
};
