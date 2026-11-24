import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { livenessHandle, livenessResponse } from './liveness';

describe('livenessResponse', () => {
	it('answers GET /alive with the JSON body true, never cached', async () => {
		const response = livenessResponse('GET', '/alive');
		expect(response?.status).toBe(200);
		expect(response?.headers.get('Content-Type')).toBe('application/json');
		expect(response?.headers.get('Cache-Control')).toBe('no-store');
		expect(await response?.text()).toBe('true');
	});

	it('answers GET /health with {"status":"ok"}, never cached', async () => {
		const response = livenessResponse('GET', '/health');
		expect(response?.status).toBe(200);
		expect(response?.headers.get('Content-Type')).toBe('application/json');
		expect(response?.headers.get('Cache-Control')).toBe('no-store');
		expect(await response?.text()).toBe('{"status":"ok"}');
	});

	it('leaves other paths and methods to the app', () => {
		expect(livenessResponse('GET', '/status')).toBeNull();
		expect(livenessResponse('GET', '/alive/')).toBeNull();
		expect(livenessResponse('POST', '/alive')).toBeNull();
	});
});

describe('livenessHandle', () => {
	it('answers the probe without calling the rest of the app', async () => {
		const resolve = vi.fn();
		const event = {
			request: new Request('http://localhost/health'),
			url: new URL('http://localhost/health')
		} as unknown as RequestEvent;
		const response = await livenessHandle({ event, resolve });
		expect(resolve).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it('passes other requests on', async () => {
		const passedOn = new Response('page');
		const resolve = vi.fn().mockResolvedValue(passedOn);
		const event = {
			request: new Request('http://localhost/status'),
			url: new URL('http://localhost/status')
		} as unknown as RequestEvent;
		const response = await livenessHandle({ event, resolve });
		expect(resolve).toHaveBeenCalledOnce();
		expect(response).toBe(passedOn);
	});
});
