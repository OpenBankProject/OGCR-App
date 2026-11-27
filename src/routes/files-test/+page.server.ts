import { createHash } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID, ENTITY_SPACE_ID } from '$lib/constants/entities';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';
import { summarizeResourceDocs } from '$lib/obp/dynamicSummary';

/**
 * A test page for OBP-API's v7.0.0 Files endpoints, in the space the OGCR entities live in
 * (OBP_ENTITY_SPACE_ID). Uploading runs the whole procedure and checks each step: store the
 * file, read it back, compare the downloaded bytes with the uploaded ones, and, when asked,
 * attach it to a record and check the public endpoints.
 */

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export interface FileJson {
	file_id: string;
	bank_id: string;
	file_name: string;
	media_type: string;
	size_in_bytes: number;
	sha256: string;
	is_public: boolean;
	owner_user_id: string;
	created_at: string;
}

export interface Step {
	name: string;
	ok: boolean;
	detail: string;
}

function filesPath(...segments: string[]): string {
	const rest = segments.map((segment) => `/${encodeURIComponent(segment)}`).join('');
	return `/obp/v7.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}${rest}`;
}

function errorText(error: unknown): string {
	if (error instanceof OBPRequestError) return error.message;
	return error instanceof Error ? error.message : String(error);
}

function sha256Hex(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}

/** The raw bytes of a content endpoint: OBP answers with the file itself, not JSON. */
async function fetchContent(path: string, accessToken?: string) {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const response = await fetch(`${base}${path}`, {
		headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
	});
	const bytes = new Uint8Array(await response.arrayBuffer());
	return { response, bytes };
}

/** The space's Dynamic Entity names, from its public resource docs, to pick a record type from. */
async function entityTypes(fetch: typeof globalThis.fetch): Promise<string[]> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const path = `/obp/v6.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/resource-docs/v6.0.0/obp?content=dynamic`;
	try {
		const response = await fetch(`${base}${path}`);
		if (!response.ok) return [];
		const body = (await response.json()) as { resource_docs?: [] };
		const { entities } = summarizeResourceDocs(body.resource_docs ?? []);
		return Object.values(entities)
			.flat()
			.map((entity) => entity.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return []; // the field still takes any record type typed in
	}
}

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	const page = { space: ENTITY_ROLE_BANK_ID, nameSpaceId: ENTITY_SPACE_ID, mediaTypes: MEDIA_TYPES, entityTypes: await entityTypes(fetch) };
	if (!accessToken) {
		return { ...page, files: [] as FileJson[], filesError: null, loggedIn: false };
	}
	try {
		const response = await obp_requests.get(filesPath('my', 'files'), accessToken);
		return { ...page, files: (response?.files ?? []) as FileJson[], filesError: null, loggedIn: true };
	} catch (error) {
		return { ...page, files: [] as FileJson[], filesError: errorText(error), loggedIn: true };
	}
};

export const actions: Actions = {
	upload: async ({ request, locals }) => {
		const accessToken = locals.session.data.oauth?.access_token;
		if (!accessToken) return { success: false, error: 'Log in to upload a file.', steps: [] as Step[] };

		const formData = await request.formData();
		const file = formData.get('file');
		const isPublic = formData.get('is_public') === 'on';
		const recordType = String(formData.get('record_type') ?? '').trim();
		const recordId = String(formData.get('record_id') ?? '').trim();

		if (!(file instanceof File) || file.size === 0) {
			return { success: false, error: 'Choose a file to upload.', steps: [] as Step[] };
		}

		const steps: Step[] = [];
		const record = (name: string, ok: boolean, detail: string) => {
			steps.push({ name, ok, detail });
			return ok;
		};

		const bytes = new Uint8Array(await file.arrayBuffer());
		const sha256 = sha256Hex(bytes);
		// The browser's guess; OBP refuses a type outside its list, which is part of what is tested.
		const mediaType = file.type || 'application/octet-stream';
		record('Read the file', true, `${file.name}, ${mediaType}, ${bytes.length} bytes, sha256 ${sha256}`);

		// 1. Store it.
		let stored: FileJson;
		try {
			stored = (await obp_requests.post(
				filesPath('files'),
				{
					file_name: file.name,
					media_type: mediaType,
					content_base64: Buffer.from(bytes).toString('base64'),
					is_public: isPublic,
					sha256
				},
				accessToken
			)) as FileJson;
			record('Create File', true, `file_id ${stored.file_id}, owner ${stored.owner_user_id}`);
		} catch (error) {
			record('Create File', false, errorText(error));
			return { success: false, error: 'The upload was refused.', steps };
		}

		record(
			'OBP stored the same SHA-256',
			stored.sha256 === sha256,
			stored.sha256 === sha256 ? 'matches' : `OBP has ${stored.sha256}`
		);
		record('is_public as asked', stored.is_public === isPublic, `is_public ${stored.is_public}`);

		// 2. Read it back.
		try {
			const read = (await obp_requests.get(filesPath('files', stored.file_id), accessToken)) as FileJson;
			record('Get File', read.file_id === stored.file_id, `${read.file_name}, ${read.size_in_bytes} bytes`);
		} catch (error) {
			record('Get File', false, errorText(error));
		}

		// 3. Download the content and compare.
		try {
			const { response, bytes: downloaded } = await fetchContent(
				filesPath('files', stored.file_id, 'content'),
				accessToken
			);
			const same = response.ok && sha256Hex(downloaded) === sha256;
			record(
				'Get File Content returns the same bytes',
				same,
				response.ok
					? `${downloaded.length} bytes, Content-Type ${response.headers.get('content-type')}`
					: `HTTP ${response.status}: ${new TextDecoder().decode(downloaded).slice(0, 300)}`
			);
		} catch (error) {
			record('Get File Content returns the same bytes', false, errorText(error));
		}

		// 4. Attach it to a record, if one was given.
		if (recordType && recordId) {
			try {
				const attachment = await obp_requests.post(
					filesPath('files', stored.file_id, 'attachments'),
					{ record_type: recordType, record_id: recordId },
					accessToken
				);
				record('Create File Attachment', true, `file_attachment_id ${attachment.file_attachment_id}`);
				const query = `?record_type=${encodeURIComponent(recordType)}&record_id=${encodeURIComponent(recordId)}`;
				const onRecord = await obp_requests.get(`${filesPath('files')}${query}`, accessToken);
				const listed = ((onRecord?.files ?? []) as FileJson[]).some((f) => f.file_id === stored.file_id);
				record('Listed on the record', listed, `${recordType} ${recordId}`);
			} catch (error) {
				record('Create File Attachment', false, errorText(error));
			}
		}

		// 5. The public endpoints, without a token: they serve a public file and nothing else.
		try {
			const { response, bytes: downloaded } = await fetchContent(filesPath('public-files', stored.file_id, 'content'));
			if (isPublic) {
				record(
					'Public content without logging in',
					response.ok && sha256Hex(downloaded) === sha256,
					response.ok ? `${downloaded.length} bytes, Cache-Control ${response.headers.get('cache-control')}` : `HTTP ${response.status}`
				);
			} else {
				record('Not served publicly', response.status === 404, `HTTP ${response.status}`);
			}
		} catch (error) {
			record(isPublic ? 'Public content without logging in' : 'Not served publicly', false, errorText(error));
		}

		return { success: steps.every((step) => step.ok), fileId: stored.file_id, steps };
	}
};
