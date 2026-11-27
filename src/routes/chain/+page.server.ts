import type { PageServerLoad } from './$types';
import { OBPRequestError } from '$lib/obp/errors';
import {
	CHAIN_SECTION_ENTITIES,
	getChainSyncStatus,
	getChainTokens,
	type ChainSection,
	type ChainSectionKey
} from '$lib/chain/onChain';
import { getEntityDescriptions } from '$lib/obp/entityDescriptions';
import { API_MANAGER_URL, getAppDirectory } from '$lib/obp/appDirectory';
import { apiManagerEntityHref } from '$lib/obp/entityPages';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';

/** One entity's description, linked to its definition in API Manager when there is one. */
type About = { entity: string; text: string; href: string | null };
import { deriveHeartbeat, type Heartbeat } from '$lib/chain/heartbeat';
import { env } from '$env/dynamic/public';
import { normalizeExplorerBase } from '$lib/chain/explorer';

/** Public: the chain mirror and its sync status are public dynamic entities, so the
 *  page is read anonymously and needs no login. */
export const load: PageServerLoad = async ({ fetch }) => {
	// A private chain has no explorer unless someone is running one, so
	// transaction links are opt-in configuration rather than an assumption.
	const explorerBase = normalizeExplorerBase(env.PUBLIC_CHAIN_EXPLORER_URL);

	try {
		// The status is what the heartbeat is built on, so a failure to read it is
		// a page-level error. The tokens are read separately so a mirror that cannot
		// be read cannot take the heartbeat down with it.
		const [status, sections, descriptions, directory] = await Promise.all([
			getChainSyncStatus(),
			getChainTokens().catch(() => [] as ChainSection[]),
			// What each section holds, from the entity definitions (see CHAIN_SECTION_ENTITIES).
			getEntityDescriptions(
				Object.values(CHAIN_SECTION_ENTITIES).flatMap((e) =>
					e.sourceEntity ? [e.entity, e.sourceEntity] : [e.entity]
				),
				fetch
			),
			getAppDirectory(fetch)
		]);
		const apiManagerUrl = directory[API_MANAGER_URL] ?? null;

		// Per section: the source entity's description, then the on-chain entity's. Built
		// here because CHAIN_SECTION_ENTITIES lives in server-only code.
		const about = {} as Record<ChainSectionKey, About[]>;
		for (const [key, { entity, sourceEntity }] of Object.entries(CHAIN_SECTION_ENTITIES)) {
			about[key as ChainSectionKey] = [sourceEntity, entity].flatMap((e) =>
				e && descriptions[e]
					? [
							{
								entity: e,
								text: descriptions[e],
								href: apiManagerUrl ? apiManagerEntityHref(apiManagerUrl, ENTITY_ROLE_BANK_ID, e) : null
							}
						]
					: []
			);
		}

		return {
			heartbeat: deriveHeartbeat(status),
			sections,
			about,
			explorerBase,
			error: null
		};
	} catch (error) {
		const message =
			error instanceof OBPRequestError
				? error.message
				: error instanceof Error
					? error.message
					: 'Unknown error';
		return {
			heartbeat: deriveHeartbeat(null) as Heartbeat,
			sections: [] as ChainSection[],
			about: {} as Record<ChainSectionKey, About[]>,
			explorerBase,
			error: message,
			errorDetails: error instanceof OBPRequestError ? error.toJSON() : undefined
		};
	}
};
