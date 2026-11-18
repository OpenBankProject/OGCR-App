/**
 * OBP-API's own records that the registry relies on. They are built into OBP-API, not
 * Dynamic Entities, so the schema's counts leave them out. The schema page lists them
 * below the Dynamic Entities.
 */
export interface BuiltInEntity {
	name: string;
	description: string;
	/** Title of the Glossary Item that explains it, opened in the Portal's Glossary. */
	glossaryTitle: string;
	/** A page of this app that shows it, if there is one. */
	page?: { href: string; label: string };
}

export const BUILT_IN_ENTITIES: BuiltInEntity[] = [
	{
		name: 'Space',
		description:
			"The registry's own space (a Bank in OBP). Its Dynamic Entities, Role Groups and Roles all belong to it.",
		glossaryTitle: 'Space'
	},
	{
		name: 'User',
		description:
			'A person with an account. Users are linked to operators through user_operator_relationship.',
		glossaryTitle: 'User'
	},
	{
		name: 'Entitlement',
		description:
			'A Role granted to a User, in the space or system wide. Each operation on each entity needs one.',
		glossaryTitle: 'API.Entitlements and Scopes'
	},
	{
		name: 'Role Group',
		description:
			'A named set of Roles granted to Users together, such as everything an operator needs.',
		glossaryTitle: 'Groups',
		page: { href: '/group-entitlements', label: 'Group entitlements' }
	},
	{
		name: 'Consumer',
		description:
			'An app registered to call the API, with its own credentials. OGCR-App, the Operator and Certification Platforms and the chain cache are each a Consumer.',
		glossaryTitle: 'Consumer'
	},
	{
		name: 'Scope',
		description:
			'A Role granted to a Consumer. It applies when a Platform App, such as the chain cache, calls the API as itself.',
		glossaryTitle: 'API.Entitlements and Scopes'
	},
	{
		name: 'Organisation',
		description: 'A team that owns Consumers, so more than one person can manage an app.',
		glossaryTitle: 'Organisation'
	},
	{
		name: 'Metric',
		description:
			'A record of each API call: which app and person called which endpoint, when, and how long it took.',
		glossaryTitle: 'API Metrics'
	}
];

/** The Glossary Item's page in the Portal, e.g. https://portal.example.com/api-explorer/glossary/Consumer. */
export function portalGlossaryHref(portalUrl: string, title: string): string {
	return `${portalUrl.replace(/\/$/, '')}/api-explorer/glossary/${encodeURIComponent(title)}`;
}
