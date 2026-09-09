import { describe, expect, it } from 'vitest';
import { checkRoles, type UserEntitlement } from './roleCheck';

const entitlements: UserEntitlement[] = [
	{ entitlement_id: 'e1', role_name: 'CanGetDynamicEntity_Systemactivity', bank_id: '' },
	{ entitlement_id: 'e2', role_name: 'CanCreateAccount', bank_id: 'gh.29.uk' }
];

describe('checkRoles', () => {
	it('passes when nothing is required', () => {
		const result = checkRoles([], entitlements);
		expect(result.hasAllRoles).toBe(true);
		expect(result.missingRoles).toEqual([]);
	});

	it('OR (default): any one required role is enough', () => {
		const result = checkRoles(
			[{ role: 'CanGetDynamicEntity_Systemactivity' }, { role: 'CanDoSomethingElse' }],
			entitlements
		);
		expect(result.hasAllRoles).toBe(true);
		expect(result.hasRoles).toEqual([{ role: 'CanGetDynamicEntity_Systemactivity' }]);
		expect(result.missingRoles).toEqual([{ role: 'CanDoSomethingElse' }]);
	});

	it('AND: every required role must be present', () => {
		const result = checkRoles(
			[{ role: 'CanGetDynamicEntity_Systemactivity' }, { role: 'CanDoSomethingElse' }],
			entitlements,
			'AND'
		);
		expect(result.hasAllRoles).toBe(false);
		expect(result.missingRoles).toEqual([{ role: 'CanDoSomethingElse' }]);
	});

	it('fails when no required role is held', () => {
		const result = checkRoles([{ role: 'CanDoSomethingElse' }], entitlements);
		expect(result.hasAllRoles).toBe(false);
	});

	it('honours bankId when the requirement specifies one', () => {
		expect(
			checkRoles([{ role: 'CanCreateAccount', bankId: 'gh.29.uk' }], entitlements).hasAllRoles
		).toBe(true);
		expect(
			checkRoles([{ role: 'CanCreateAccount', bankId: 'other' }], entitlements).hasAllRoles
		).toBe(false);
	});

	it('ignores bank when the requirement has no bankId', () => {
		expect(checkRoles([{ role: 'CanCreateAccount' }], entitlements).hasAllRoles).toBe(true);
	});
});
