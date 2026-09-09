// Server-only SITE_MAP: which OBP role(s) each route requires to load real data, mirroring
// the pattern used by OBP-Frontend's api-manager (see roleChecker.ts there). Lives under
// `$lib/server` (not universal) because it needs the entity name constants, which read the
// private `OBP_ENTITY_PREFIX` env var — see `$lib/constants/entities`.
import { ENTITY_ACTIVITY, ENTITY_OPERATOR, ENTITY_USER_OPERATOR_RELATIONSHIP } from '$lib/constants/entities';
import type { PageRoleConfig } from '$lib/utils/roleCheck';

// Role names for system-level dynamic entities are `CanGetDynamicEntity_System<entityName>`, 
// where entityName is exactly the string OBP-API registered the entity under.
export const SITE_MAP: Record<string, PageRoleConfig> = {
	'/activities': {
		required: [{ role: `CanGetDynamicEntity_System${ENTITY_ACTIVITY}` }]
	},
	'/operators': {
		required: [{ role: `CanGetDynamicEntity_System${ENTITY_OPERATOR}` }]
	},
	'/my/operators': {
		required: [
			{ role: `CanGetDynamicEntity_System${ENTITY_OPERATOR}` },
			{ role: `CanGetDynamicEntity_System${ENTITY_USER_OPERATOR_RELATIONSHIP}` }
		],
		requirementType: 'AND'
	}
};

// Matches the route itself and any of its sub-routes (e.g. `/activities/create`,
// `/activities/[id]`), since SvelteKit's `route.id` differs per page under a section but
// all of them need the same gate as the section's index page.
export function getPageRoles(routeId: string | null): PageRoleConfig | undefined {
	if (!routeId) return undefined;
	if (SITE_MAP[routeId]) return SITE_MAP[routeId];
	return Object.entries(SITE_MAP).find(
		([prefix]) => routeId === prefix || routeId.startsWith(`${prefix}/`)
	)?.[1];
}
