import { describe, it, expect, vi, afterEach } from 'vitest';

const env: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env }));

// The constants are computed at import, so each case re-imports with its env.
async function load(space: string | undefined) {
	vi.resetModules();
	env.OBP_ENTITY_SPACE_ID = space;
	return import('./entities');
}

afterEach(() => {
	delete env.OBP_ENTITY_SPACE_ID;
});

describe('entity space', () => {
	it('defaults to the ogcr bank', async () => {
		const m = await load(undefined);
		expect(m.entityPath('activity')).toBe('/obp/dynamic-entity/banks/ogcr/activity');
		expect(m.ENTITY_ROLE_BANK_ID).toBe('ogcr');
	});

	it('uses the configured bank', async () => {
		const m = await load('other.bank');
		expect(m.entityPath('parcel')).toBe('/obp/dynamic-entity/banks/other.bank/parcel');
		expect(m.ENTITY_ROLE_BANK_ID).toBe('other.bank');
	});

	it('uses system level when set to empty, with Roles at SYS', async () => {
		const m = await load('');
		expect(m.entityPath('activity')).toBe('/obp/dynamic-entity/activity');
		expect(m.ENTITY_ROLE_BANK_ID).toBe('SYS');
	});
});
