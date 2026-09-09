import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OBPErrorBase, OBPRequestError } from './errors';
import { OBPRequests } from './requests';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown, statusText = '') {
	return new Response(body === null ? null : JSON.stringify(body), {
		status,
		statusText,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('OBPRequests', () => {
	let obp: OBPRequests;

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		fetchMock.mockReset();
		obp = new OBPRequests('http://obp.test');
	});

	afterEach(() => vi.unstubAllGlobals());

	it('refuses an empty base URL', () => {
		expect(() => new OBPRequests('')).toThrow(OBPErrorBase);
	});

	it('GET sends the bearer token and returns the parsed JSON', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(200, { activity_list: [] }));
		const data = await obp.get('/obp/dynamic-entity/activity', 'tok');
		expect(data).toEqual({ activity_list: [] });
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('http://obp.test/obp/dynamic-entity/activity');
		expect(init.method).toBe('GET');
		expect(init.headers.Authorization).toBe('Bearer tok');
		expect(init.body).toBeUndefined();
	});

	it('omits the Authorization header when there is no token', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
		await obp.get('/obp/v5.1.0/root');
		expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
	});

	it('POST serialises the body', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(201, { activity: { activity_id: 'a1' } }));
		const data = await obp.post('/obp/dynamic-entity/activity', { name: 'x' }, 'tok');
		expect(data.activity.activity_id).toBe('a1');
		const init = fetchMock.mock.calls[0][1];
		expect(init.method).toBe('POST');
		expect(init.body).toBe(JSON.stringify({ name: 'x' }));
	});

	it('DELETE tolerates an empty 204 body', async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
		expect(await obp.delete('/obp/dynamic-entity/activity/a1', 'tok')).toBeNull();
	});

	it('surfaces the OBP error code and message and redacts the token', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse(400, { code: 400, message: 'OBP-30001: Bank not found.' }, 'Bad Request')
		);
		const err = await obp.get('/obp/v5.1.0/banks/x', 'tok').catch((e) => e);
		expect(err).toBeInstanceOf(OBPRequestError);
		expect(err.code).toBe('400');
		expect(err.message).toBe('OBP-30001: Bank not found.');
		expect(err.obpErrorCode).toBe('OBP-30001');
		expect(err.response.status).toBe(400);
		expect(err.getSanitizedRequest().headers.Authorization).toBe('Bearer [REDACTED]');
		expect(err.toJSON().request.headers.Authorization).toBe('Bearer [REDACTED]');
	});

	it('keeps the HTTP status when an error body is not JSON (e.g. a proxy page)', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' })
		);
		const err = await obp.get('/obp/v5.1.0/root').catch((e) => e);
		expect(err).toBeInstanceOf(OBPRequestError);
		expect(err.code).toBe('502');
		expect(err.message).toContain('HTTP 502');
		expect(err.response.data).toContain('Bad Gateway');
	});

	it('reports a parse failure on a 200 with a non-JSON body', async () => {
		fetchMock.mockResolvedValueOnce(new Response('not json', { status: 200 }));
		const err = await obp.get('/obp/v5.1.0/root').catch((e) => e);
		expect(err).toBeInstanceOf(OBPErrorBase);
		expect(err).not.toBeInstanceOf(OBPRequestError);
		expect(err.message).toContain('Failed to parse JSON');
		expect(err.message).toContain('HTTP 200');
	});
});
