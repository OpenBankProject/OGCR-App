import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';
import { obp_requests } from '$lib/obp/requests';
import { summarizeResourceDocs } from '$lib/obp/dynamicSummary';
import { groupsOfSpace, type ObpGroup } from '$lib/obp/groupEntitlements';

/**
 * The groups of the space (OBP_ENTITY_SPACE_ID) against its Dynamic Entities. The
 * entities come from the space's public resource docs, as on /schema; the groups need
 * CanGetGroupsAtOneBank at the space's bank (or CanGetGroupsAtAllBanks), which the
 * layout's role check asks for before this page renders.
 */
export const load: PageServerLoad = async ({ fetch, locals }) => {
	const accessToken = locals.session.data.oauth?.access_token;
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const docsPath = `/obp/v6.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/resource-docs/v6.0.0/obp?content=dynamic`;
	// System level groups have no bank id; OBP lists them when bank_id is left out.
	const groupsPath =
		ENTITY_ROLE_BANK_ID === 'SYS'
			? '/obp/v6.0.0/management/groups'
			: `/obp/v6.0.0/management/groups?bank_id=${encodeURIComponent(ENTITY_ROLE_BANK_ID)}`;

	const entitiesRequest = fetch(`${base}${docsPath}`).then(async (response) => {
		if (!response.ok) throw new Error(`OBP returned HTTP ${response.status} for ${docsPath}`);
		const body = (await response.json()) as { resource_docs?: [] };
		const { entities } = summarizeResourceDocs(body.resource_docs ?? []);
		// Main tables first, as on /schema, then the chain mirrors and the supporting tables.
		return (['main', 'onChain', 'link', 'lookup'] as const).flatMap((category) =>
			entities[category].map(({ name }) => ({ name, category }))
		);
	});

	const groupsRequest = accessToken
		? obp_requests
				.get(groupsPath, accessToken)
				.then((response) => groupsOfSpace((response?.groups ?? []) as ObpGroup[], ENTITY_ROLE_BANK_ID))
		: Promise.reject(new Error('Log in to see the groups.'));

	const [entities, groups] = await Promise.allSettled([entitiesRequest, groupsRequest]);
	const reason = (result: PromiseSettledResult<unknown>) =>
		result.status === 'rejected'
			? result.reason instanceof Error
				? result.reason.message
				: String(result.reason)
			: null;

	return {
		space: ENTITY_ROLE_BANK_ID,
		entities: entities.status === 'fulfilled' ? entities.value : [],
		groups: groups.status === 'fulfilled' ? groups.value : [],
		entitiesError: reason(entities),
		groupsError: reason(groups)
	};
};
