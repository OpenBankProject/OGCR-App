/**
 * A summary of one space's Dynamic Entities and Dynamic Resource Docs, counted from
 * OBP's resource docs for that space (GET /obp/v6.0.0/banks/BANK_ID/resource-docs/
 * v6.0.0/obp?content=dynamic). Public: the resource docs need no access token.
 *
 * Every Dynamic Entity contributes a set of generated endpoints, each with its own
 * Role; every Dynamic Resource Doc is one endpoint with its own (possibly no) Role.
 * An entity's columns are the properties of its create (POST) request body.
 */

/** Fewer columns than this makes an entity a lookup table (e.g. country: id + name). */
export const LOOKUP_MAX_COLUMNS_EXCLUSIVE = 4;

/** Mirrors of the chain kept by OGCR-chain-cache are named `<thing>_on_chain`. */
const ON_CHAIN_SUFFIX = '_on_chain';

export type EntityCategory = 'lookup' | 'link' | 'main' | 'onChain';

export interface EntitySummary {
	name: string;
	columns: number;
}

/** What categorizing an entity needs: its name and its column names. */
export interface EntityShape {
	name: string;
	fields: string[];
}

export interface DynamicSummary {
	entities: Record<EntityCategory, EntitySummary[]>;
	endpoints: { entity: number; resourceDoc: number };
	/** Distinct Role names. A public endpoint has none. */
	roles: { entity: number; resourceDoc: number };
}

interface ResourceDoc {
	request_verb?: string;
	specified_url?: string;
	roles?: { role?: string }[] | null;
	typed_request_body?: { properties?: Record<string, unknown> } | null;
}

/**
 * On-chain by name first: a chain mirror is one whatever its width. Then a link table,
 * which only joins other entities: every column is an `*_id` and there are at least two
 * (e.g. parcel_activity: parcel_id, activity_id). Then lookup tables by width.
 */
export function categorize(entity: EntityShape): EntityCategory {
	if (entity.name.endsWith(ON_CHAIN_SUFFIX)) return 'onChain';
	const { fields } = entity;
	if (fields.length >= 2 && fields.every((field) => field.endsWith('_id'))) return 'link';
	return fields.length < LOOKUP_MAX_COLUMNS_EXCLUSIVE ? 'lookup' : 'main';
}

/** The entity a collection URL creates records of: `/obp/dynamic-entity[/banks/X]/<name>`. */
const ENTITY_COLLECTION = /\/dynamic-entity\/(?:banks\/[^/]+\/)?([^/{}]+)$/;

export function summarizeResourceDocs(docs: ResourceDoc[]): DynamicSummary {
	const entities: Record<EntityCategory, EntitySummary[]> = {
		lookup: [],
		link: [],
		main: [],
		onChain: []
	};
	const endpoints = { entity: 0, resourceDoc: 0 };
	const roles = { entity: new Set<string>(), resourceDoc: new Set<string>() };

	for (const doc of docs) {
		const url = doc.specified_url ?? '';
		const kind = url.includes('/dynamic-entity/')
			? 'entity'
			: url.includes('/dynamic-endpoint/')
				? 'resourceDoc'
				: null;
		if (!kind) continue;

		endpoints[kind] += 1;
		for (const { role } of doc.roles ?? []) if (role) roles[kind].add(role);

		const match =
			kind === 'entity' && doc.request_verb === 'POST' ? url.match(ENTITY_COLLECTION) : null;
		if (match) {
			const name = match[1];
			const fields = Object.keys(doc.typed_request_body?.properties ?? {});
			entities[categorize({ name, fields })].push({ name, columns: fields.length });
		}
	}

	for (const list of Object.values(entities)) list.sort((a, b) => a.name.localeCompare(b.name));
	return {
		entities,
		endpoints,
		roles: { entity: roles.entity.size, resourceDoc: roles.resourceDoc.size }
	};
}
