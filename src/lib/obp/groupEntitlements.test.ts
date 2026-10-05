import { describe, expect, it } from 'vitest';
import {
	additionalEntitlements,
	groupsOfSpace,
	operationsOn,
	otherRoles,
	type ObpGroup
} from './groupEntitlements';

const group = (overrides: Partial<ObpGroup>): ObpGroup => ({
	group_id: 'g',
	group_name: 'G',
	list_of_roles: [],
	...overrides
});

describe('operationsOn', () => {
	it('lists the granted operations in CRUD order', () => {
		const roles = [
			'CanDeleteDynamicEntityRecord_activity',
			'CanGetDynamicEntityRecord_activity',
			'CanCreateDynamicEntityRecord_activity',
			'CanUpdateDynamicEntityRecord_activity'
		];
		expect(operationsOn('activity', roles)).toEqual(['C', 'R', 'U', 'D']);
	});

	it('gives read only access as R', () => {
		expect(operationsOn('activity', ['CanGetDynamicEntityRecord_activity'])).toEqual(['R']);
	});

	it('does not match an entity whose name only starts the same', () => {
		expect(operationsOn('activity', ['CanGetDynamicEntityRecord_activity_on_chain'])).toEqual([]);
	});
});

describe('otherRoles', () => {
	it('keeps roles that are not record roles of a listed entity', () => {
		const g = group({
			list_of_roles: [
				'CanGetDynamicEntityRecord_activity',
				'CanGetDynamicEntityRecord_retired_entity',
				'CanGetBank'
			]
		});
		expect(otherRoles(g, ['activity'])).toEqual([
			'CanGetDynamicEntityRecord_retired_entity',
			'CanGetBank'
		]);
	});
});

describe('additionalEntitlements', () => {
	it('lists each additional role once, with the groups that grant it', () => {
		const admins = group({ group_id: 'a', list_of_roles: ['CanGetBank', 'CanGetUser'] });
		const readers = group({
			group_id: 'r',
			list_of_roles: ['CanGetDynamicEntityRecord_activity', 'CanGetBank']
		});
		const result = additionalEntitlements([admins, readers], ['activity']);
		expect(result.map(({ role, groups }) => [role, groups.map((g) => g.group_id)])).toEqual([
			['CanGetBank', ['a', 'r']],
			['CanGetUser', ['a']]
		]);
	});
});

describe('groupsOfSpace', () => {
	const groups = [
		group({ group_id: '1', group_name: 'Verifiers', bank_id: 'ogcr' }),
		group({ group_id: '2', group_name: 'Admins', bank_id: 'ogcr' }),
		group({ group_id: '3', group_name: 'Other bank', bank_id: 'gh.29.uk' }),
		group({ group_id: '4', group_name: 'System', bank_id: null })
	];

	it('keeps the bank’s groups, sorted by name', () => {
		expect(groupsOfSpace(groups, 'ogcr').map((g) => g.group_id)).toEqual(['2', '1']);
	});

	it('keeps system level groups for SYS', () => {
		expect(groupsOfSpace(groups, 'SYS').map((g) => g.group_id)).toEqual(['4']);
	});
});
