import { describe, expect, it } from 'vitest';
import { apiManagerEntityHref, entityPage } from './entityPages';

describe('apiManagerEntityHref', () => {
	it("links to the entity's page in its space, by name", () => {
		expect(apiManagerEntityHref('https://apimanager.example.org/', 'ogcr', 'activity')).toBe(
			'https://apimanager.example.org/dynamic-entities/system/activity?bank_id=ogcr'
		);
	});
});

describe('entityPage', () => {
	it('names the page an entity is used on', () => {
		expect(entityPage('activity_on_chain')).toEqual({ href: '/chain', label: 'Chain' });
	});

	it('is null for an entity no page uses', () => {
		expect(entityPage('audit_report')).toBeNull();
	});
});
