// Server-only SITE_MAP: which OBP role(s) each route requires to load real data, mirroring
// the pattern used by OBP-Frontend's api-manager (see roleChecker.ts there). Lives under
// `$lib/server` (not universal) because it needs the entity name constants, which read the
// private `OBP_ENTITY_PREFIX` env var — see `$lib/constants/entities`.
import {
	ENTITY_ACTIVITY,
	ENTITY_OPERATOR,
	ENTITY_USER_OPERATOR_RELATIONSHIP,
	ENTITY_ROLE_BANK_ID
} from '$lib/constants/entities';
import type { PageRoleConfig } from '$lib/utils/roleCheck';

// Role names for the records of a dynamic entity are `CanGetDynamicEntityRecord_<entityName>`, where
// entityName is exactly the string OBP-API registered the entity under. The name no longer says which
// space the entity lives in -- until 2026-09-24 a system level entity had a separate
// `CanGetDynamicEntity_System<entityName>` Role -- because the bank id of the grant says it instead:
// the literal `SYS` for the system space, or a real bank id. Every check names the bank id of the
// space the entities live in (OBP_ENTITY_SPACE_ID), so a grant at some other bank does not pass a
// page whose data calls would then 403, and a role request asks for the grant at the right bank.
export const SITE_MAP: Record<string, PageRoleConfig> = {
	'/activities': {
		required: [{ role: `CanGetDynamicEntityRecord_${ENTITY_ACTIVITY}`, bankId: ENTITY_ROLE_BANK_ID }]
	},
	'/operators': {
		required: [{ role: `CanGetDynamicEntityRecord_${ENTITY_OPERATOR}`, bankId: ENTITY_ROLE_BANK_ID }]
	},
	'/my/operators': {
		required: [
			{ role: `CanGetDynamicEntityRecord_${ENTITY_OPERATOR}`, bankId: ENTITY_ROLE_BANK_ID },
			{ role: `CanGetDynamicEntityRecord_${ENTITY_USER_OPERATOR_RELATIONSHIP}`, bankId: ENTITY_ROLE_BANK_ID }
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
