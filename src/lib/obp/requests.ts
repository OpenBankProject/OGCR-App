import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OBPRequests');
import { env } from '$env/dynamic/public';
import {
	OBPErrorBase,
	OBPRequestError,
	type OBPRequestDetails,
	type OBPResponseDetails
} from '$lib/obp/errors';

export type OBPHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Read the response body once and decode it leniently. OBP normally answers with JSON,
 * but a 204, an empty body, or an HTML page from a proxy in front of OBP must not turn
 * into a confusing "Failed to parse JSON" error that hides the real HTTP status.
 */
async function readBody(response: Response): Promise<{ data: unknown; parseError: string | null }> {
	const text = await response.text();
	if (text.trim() === '') return { data: null, parseError: null };
	try {
		return { data: JSON.parse(text), parseError: null };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		// Keep a short excerpt so a non-JSON error page is still diagnosable.
		return { data: text.slice(0, 500), parseError: message };
	}
}

/** OBP error bodies look like `{ "code": <http status>, "message": "OBP-xxxxx: ..." }`. */
function isObpErrorBody(data: unknown): data is { code: number; message: string } {
	return (
		typeof data === 'object' &&
		data !== null &&
		'code' in data &&
		'message' in data &&
		typeof (data as { message: unknown }).message === 'string'
	);
}

export class OBPRequests {
	base_url: string;

	constructor(base_url: string) {
		logger.info('Initializing with base URL:', base_url);

		if (!base_url) {
			throw new OBPErrorBase('Base URL for OBP requests is not defined.');
		}
		this.base_url = base_url;

		logger.info('Initialized.');
	}

	async request(
		method: OBPHttpMethod,
		endpoint: string,
		body?: unknown,
		accessToken?: string
	): Promise<any> {
		const hasBody = body !== undefined;
		logger.debug(method, endpoint, ...(hasBody ? [body] : []));

		const url = `${this.base_url}${endpoint}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}

		const requestDetails: OBPRequestDetails = { method, url, headers };
		if (hasBody) requestDetails.body = body;

		const response = await fetch(url, {
			method,
			headers,
			...(hasBody ? { body: JSON.stringify(body) } : {})
		});

		const { data, parseError } = await readBody(response);

		if (!response.ok) {
			logger.error(`${method} ${url} failed:`, {
				status: response.status,
				statusText: response.statusText,
				data
			});

			const responseDetails: OBPResponseDetails = {
				status: response.status,
				statusText: response.statusText,
				data
			};

			if (isObpErrorBody(data)) {
				throw new OBPRequestError(data.code, data.message, requestDetails, responseDetails);
			}
			throw new OBPRequestError(
				response.status,
				`OBP request ${method} ${url} failed with HTTP ${response.status} ${response.statusText}`.trim(),
				requestDetails,
				responseDetails
			);
		}

		if (parseError) {
			throw new OBPErrorBase(
				`Failed to parse JSON response from ${method} ${url} (HTTP ${response.status}): ${parseError}`
			);
		}

		logger.debug('Response from OBP', response.status, response.statusText);
		return data;
	}

	get(endpoint: string, accessToken?: string): Promise<any> {
		return this.request('GET', endpoint, undefined, accessToken);
	}

	post(endpoint: string, body: unknown, accessToken?: string): Promise<any> {
		return this.request('POST', endpoint, body, accessToken);
	}

	put(endpoint: string, body: unknown, accessToken?: string): Promise<any> {
		return this.request('PUT', endpoint, body, accessToken);
	}

	delete(endpoint: string, accessToken?: string): Promise<any> {
		return this.request('DELETE', endpoint, undefined, accessToken);
	}
}

let obp_requests_instance: OBPRequests | null = null;

export const obp_requests = {
	get instance(): OBPRequests {
		if (!obp_requests_instance) {
			obp_requests_instance = new OBPRequests(env.PUBLIC_OBP_BASE_URL);
		}
		return obp_requests_instance;
	},

	get: function (endpoint: string, accessToken?: string) {
		return this.instance.get(endpoint, accessToken);
	},

	post: function (endpoint: string, data: unknown, accessToken?: string) {
		return this.instance.post(endpoint, data, accessToken);
	},

	put: function (endpoint: string, data: unknown, accessToken?: string) {
		return this.instance.put(endpoint, data, accessToken);
	},

	delete: function (endpoint: string, accessToken?: string) {
		return this.instance.delete(endpoint, accessToken);
	}
};
