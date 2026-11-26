/**
 * The liveness probes OBP-API answers, repeated here so every app can be watched the same way.
 *
 * GET /alive answers true and GET /health answers {"status":"ok"} as soon as the process serves HTTP. Neither looks at OBP-API, Redis or the OAuth2 providers: those belong on /status, so a sick dependency never gets a healthy app restarted.
 */

import type { Handle } from '@sveltejs/kit';

const livenessBodies: Record<string, string> = {
	'/alive': 'true',
	'/health': '{"status":"ok"}'
};

/** The probe's answer for a GET of this path, or null when the path is not a liveness probe. */
export function livenessResponse(method: string, pathname: string): Response | null {
	const body = livenessBodies[pathname];
	if (method !== 'GET' || body === undefined) return null;
	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			// A probe must always see the live answer, never a cached one.
			'Cache-Control': 'no-store'
		}
	});
}

/**
 * Answers the probes before the session handle runs, so they need no login and never read the session store in Redis.
 */
export const livenessHandle: Handle = async ({ event, resolve }) => {
	return livenessResponse(event.request.method, event.url.pathname) ?? resolve(event);
};
