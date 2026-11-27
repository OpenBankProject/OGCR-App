import { env } from '$env/dynamic/public';
import { publicEntityPathV7, unwrapV7List } from '$lib/constants/entities';

/**
 * The public certification scheme and certification body pages
 * (/registry/certification-schemes/<id>, /registry/certification-bodies/<id>).
 *
 * Both entities have public access, so these read their public v7.0.0 dynamic entity
 * endpoints anonymously, as do the certificates and activities listed under them. Each
 * list degrades on its own: one that cannot be read leaves its section empty.
 */

export const ENTITY_CERTIFICATION_SCHEME = 'certification_scheme';
export const ENTITY_CERTIFICATION_BODY = 'certification_body';
const ENTITY_CERTIFICATE_OF_COMPLIANCE = 'certificate_of_compliance';
const ENTITY_ACTIVITY = 'activity';

type Row = Record<string, unknown>;

function url(path: string): string {
	return `${env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? ''}${path}`;
}

/** One public record, or an error message when it cannot be read. */
async function getRecord(
	fetchFn: typeof fetch,
	entity: string,
	id: string
): Promise<{ record: Row | null; error: string | null }> {
	try {
		const response = await fetchFn(url(`${publicEntityPathV7(entity)}/${encodeURIComponent(id)}`));
		const body = await response.json().catch(() => null);
		if (response.status === 404) return { record: null, error: null };
		if (!response.ok) {
			return { record: null, error: body?.message ?? `OBP answered ${response.status}` };
		}
		return { record: (body?.[entity] as Row) ?? null, error: null };
	} catch (error) {
		return { record: null, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

/** Public records whose `field` equals `value`; empty when the list cannot be read. */
async function listWhere(
	fetchFn: typeof fetch,
	entity: string,
	field: string,
	value: string
): Promise<Row[]> {
	try {
		const query = `?obp_filter[${field}]=eq:${encodeURIComponent(value)}`;
		const response = await fetchFn(url(`${publicEntityPathV7(entity)}${query}`));
		if (!response.ok) return [];
		return unwrapV7List<Row>(await response.json(), entity);
	} catch {
		return [];
	}
}

export async function getCertificationScheme(fetchFn: typeof fetch, id: string) {
	const [{ record, error }, certificates, activities] = await Promise.all([
		getRecord(fetchFn, ENTITY_CERTIFICATION_SCHEME, id),
		listWhere(fetchFn, ENTITY_CERTIFICATE_OF_COMPLIANCE, 'certification_scheme_id', id),
		listWhere(fetchFn, ENTITY_ACTIVITY, 'certification_scheme_id', id)
	]);
	return { scheme: record, error, certificates, activities };
}

export async function getCertificationBody(fetchFn: typeof fetch, id: string) {
	const [{ record, error }, certificates] = await Promise.all([
		getRecord(fetchFn, ENTITY_CERTIFICATION_BODY, id),
		listWhere(fetchFn, ENTITY_CERTIFICATE_OF_COMPLIANCE, 'certification_body_id', id)
	]);
	return { body: record, error, certificates };
}
