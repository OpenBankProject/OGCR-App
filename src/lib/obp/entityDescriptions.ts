import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';

/**
 * Dynamic Entity descriptions, as written in each entity's definition.
 *
 * The definitions endpoints need an admin Role, but OBP copies each definition's
 * description into the entity's generated resource docs, which are public. So this reads
 * those, filtered by the entities' tags (`_Parcel_on_chain(ogcr)`) so only their docs come
 * back rather than the whole space's (several MB).
 */

interface ResourceDoc {
	request_verb?: string;
	specified_url?: string;
	description_markdown?: string;
}

/** OBP tags an entity's generated endpoints `_<Entity_name>(<bank id>)`. */
export function entityTag(entity: string, bankId: string): string {
	return `_${entity.charAt(0).toUpperCase()}${entity.slice(1)}(${bankId})`;
}

/**
 * The definition's description, from the entity's create (POST) doc: OBP wraps it in a
 * "Create new <entity>." line, then appends the property list, the routing example and a
 * "This Dynamic Entity is part of …" line, all of which are dropped here.
 */
export function descriptionFromDoc(doc: ResourceDoc, entity: string): string | null {
	const markdown = doc.description_markdown ?? '';
	const text = markdown
		.split(/\*\*Property List|MethodRouting settings example/)[0]
		.replace(new RegExp(`^\\s*Create new ${entity}\\.`), '')
		.replace(/This Dynamic Entity is part of [^.]*\./g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return text || null;
}

/** entity -> description, for those of `entities` whose docs OBP returned. Never throws. */
export async function getEntityDescriptions(
	entities: string[],
	fetchFn: typeof fetch = fetch
): Promise<Record<string, string>> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const bank = encodeURIComponent(ENTITY_ROLE_BANK_ID);
	const tags = entities.map((e) => encodeURIComponent(entityTag(e, ENTITY_ROLE_BANK_ID))).join(',');
	const url = `${base}/obp/v6.0.0/banks/${bank}/resource-docs/v6.0.0/obp?content=dynamic&tags=${tags}`;
	try {
		const response = await fetchFn(url);
		if (!response.ok) return {};
		const docs = ((await response.json())?.resource_docs ?? []) as ResourceDoc[];
		const descriptions: Record<string, string> = {};
		for (const entity of entities) {
			const create = docs.find(
				(d) => d.request_verb === 'POST' && (d.specified_url ?? '').endsWith(`/${entity}`)
			);
			const text = create ? descriptionFromDoc(create, entity) : null;
			if (text) descriptions[entity] = text;
		}
		return descriptions;
	} catch {
		return {};
	}
}
