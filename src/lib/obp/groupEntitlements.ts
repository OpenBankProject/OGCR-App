/**
 * Which record operations each OBP Group grants on each Dynamic Entity of a space.
 *
 * A Group (GET /obp/v6.0.0/management/groups?bank_id=BANK_ID) carries a `list_of_roles`
 * that its members are granted at the group's bank. The record Roles of a Dynamic Entity
 * are `Can<Op>DynamicEntityRecord_<entityName>` for Op in Create, Get, Update, Delete
 * (see OBP-API DynamicEntityHelper), so a group's access to an entity is read off those
 * four names.
 */

export interface ObpGroup {
	group_id: string;
	bank_id?: string | null;
	group_name: string;
	group_description?: string;
	list_of_roles?: string[];
	is_enabled?: boolean;
}

/** The record operations in CRUD order, with the verb OBP uses in the Role name. */
export const RECORD_OPERATIONS = [
	{ letter: 'C', verb: 'Create' },
	{ letter: 'R', verb: 'Get' },
	{ letter: 'U', verb: 'Update' },
	{ letter: 'D', verb: 'Delete' }
] as const;

export type OperationLetter = (typeof RECORD_OPERATIONS)[number]['letter'];

export function recordRole(verb: string, entity: string): string {
	return `Can${verb}DynamicEntityRecord_${entity}`;
}

/** The operations a set of roles grants on one entity, in CRUD order, e.g. `['R']` or `['C','R','U','D']`. */
export function operationsOn(entity: string, roles: Iterable<string>): OperationLetter[] {
	const held = new Set(roles);
	return RECORD_OPERATIONS.filter(({ verb }) => held.has(recordRole(verb, entity))).map(
		({ letter }) => letter
	);
}

const RECORD_ROLE = /^Can(?:Create|Get|Update|Delete)DynamicEntityRecord_(.+)$/;

/** A group's roles that are not record roles of any of the given entities, e.g. CanGetBank. */
export function otherRoles(group: ObpGroup, entities: Iterable<string>): string[] {
	const known = new Set(entities);
	return (group.list_of_roles ?? []).filter((role) => {
		const match = role.match(RECORD_ROLE);
		return !match || !known.has(match[1]);
	});
}

/**
 * The roles the groups grant beyond the record roles of the given entities, each with the
 * groups that grant it, sorted by role name.
 */
export function additionalEntitlements(
	groups: ObpGroup[],
	entities: Iterable<string>
): { role: string; groups: ObpGroup[] }[] {
	const entityNames = [...entities];
	const byRole = new Map<string, ObpGroup[]>();
	for (const group of groups) {
		for (const role of new Set(otherRoles(group, entityNames))) {
			byRole.set(role, [...(byRole.get(role) ?? []), group]);
		}
	}
	return [...byRole]
		.map(([role, granting]) => ({ role, groups: granting }))
		.sort((a, b) => a.role.localeCompare(b.role));
}

/**
 * The groups of the space, by name. `SYS` is OBP's bank id for system level grants; system
 * level groups have no bank id, so for `SYS` those are the ones kept.
 */
export function groupsOfSpace(groups: ObpGroup[], bankId: string): ObpGroup[] {
	return groups
		.filter((group) => (bankId === 'SYS' ? !group.bank_id : group.bank_id === bankId))
		.sort((a, b) => a.group_name.localeCompare(b.group_name));
}
