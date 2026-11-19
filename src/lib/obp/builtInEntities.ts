/**
 * OBP-API's own records that the registry relies on. They are built into OBP-API, not
 * Dynamic Entities, so the schema's counts leave them out. The schema page lists them in
 * groups above the Dynamic Entities.
 */
export interface BuiltInEntity {
	name: string;
	description: string;
	/** Titles of the Glossary Items that explain it, opened in API Explorer II's Glossary. */
	glossaryTitles: string[];
	/** A page of this app that shows it, if there is one. */
	page?: { href: string; label: string };
}

export interface BuiltInEntityGroup {
	title: string;
	description: string;
	entities: BuiltInEntity[];
}

const USERS_AND_ACCESS: BuiltInEntity[] = [
	{
		name: 'Space',
		description:
			"The registry's own space (a Bank in OBP). Its Dynamic Entities, Role Groups and Roles all belong to it.",
		glossaryTitles: ['Space']
	},
	{
		name: 'User',
		description:
			'A person with an account. Users are linked to operators through user_operator_relationship.',
		glossaryTitles: ['User']
	},
	{
		name: 'Entitlement',
		description:
			'A Role granted to a User, in the space or system wide. Each operation on each entity needs one.',
		glossaryTitles: ['API.Entitlements and Scopes']
	},
	{
		name: 'Role Group',
		description:
			'A named set of Roles granted to Users together, such as everything an operator needs.',
		glossaryTitles: ['Groups'],
		page: { href: '/group-entitlements', label: 'Group entitlements' }
	},
	{
		name: 'Consumer',
		description:
			'An app registered to call the API, with its own credentials. OGCR-App, the Operator and Certification Platforms and the chain cache are each a Consumer.',
		glossaryTitles: ['Consumer']
	},
	{
		name: 'Scope',
		description:
			'A Role granted to a Consumer. It applies when a Platform App, such as the chain cache, calls the API as itself.',
		glossaryTitles: ['API.Entitlements and Scopes']
	},
	{
		name: 'Organisation',
		description: 'A team that owns Consumers, so more than one person can manage an app.',
		glossaryTitles: ['Organisation']
	},
	{
		name: 'Metric',
		description:
			'A record of each API call: which app and person called which endpoint, when, and how long it took.',
		glossaryTitles: ['API Metrics']
	}
];

const ACCOUNTS_AND_PAYMENTS: BuiltInEntity[] = [
	{
		name: 'Asset',
		description:
			'A unit that amounts are held in, such as EUR or a token. Its code is the currency of an account, a transaction or a product fee.',
		glossaryTitles: ['Asset']
	},
	{
		name: 'Product',
		description:
			'A kind of account the space offers, with its fees and rules. Each Account is opened on a Product.',
		glossaryTitles: ['Product']
	},
	{
		name: 'Account',
		description:
			'Holds a balance in one Asset, in the space. Its Views decide who may see it and pay from it.',
		glossaryTitles: ['Account']
	},
	{
		name: 'View',
		description:
			'What a User or Consumer may see and do on an Account, such as see its balance or make payments. An Account Access record gives a User a View on an Account, and a User needs one to use the Account at all.',
		glossaryTitles: ['View', 'Account Access']
	},
	{
		name: 'Transaction',
		description: 'An amount moved into or out of an Account.',
		glossaryTitles: ['Transaction']
	},
	{
		name: 'Transaction Request',
		description:
			'A request to pay from an Account. Once it is approved, and any challenge is answered, OBP-API makes the Transaction.',
		glossaryTitles: ['Transaction Requests']
	}
];

const API_DOCUMENTATION: BuiltInEntity[] = [
	{
		name: 'Resource Doc',
		description:
			'The description of one endpoint: its path, Roles, example bodies and errors. API Explorer II and the OpenAPI documents are built from them.',
		glossaryTitles: ['Resource Doc']
	},
	{
		name: 'Dynamic Resource Doc',
		description:
			"An endpoint defined in the space while OBP-API is running, such as a Dynamic Query. The space's own are listed below.",
		glossaryTitles: ['Dynamic Resource Doc']
	},
	{
		name: 'Glossary Item',
		description:
			'An explanation of an OBP term. The Glossary links on this page open them in API Explorer II.',
		glossaryTitles: ['Glossary']
	}
];

export const BUILT_IN_ENTITY_GROUPS: BuiltInEntityGroup[] = [
	{
		title: 'Users and access',
		description: 'Who may call the API, and what each person or app may do.',
		entities: USERS_AND_ACCESS
	},
	{
		title: 'API documentation',
		description: 'How the endpoints and terms are described.',
		entities: API_DOCUMENTATION
	},
	{
		title: 'Accounts and payments',
		description: 'Balances, and the payments that move them.',
		entities: ACCOUNTS_AND_PAYMENTS
	}
];

export const BUILT_IN_ENTITY_COUNT = BUILT_IN_ENTITY_GROUPS.reduce(
	(count, group) => count + group.entities.length,
	0
);

/**
 * The Glossary Item in API Explorer II's Glossary, e.g.
 * https://apiexplorer.example.com/glossary#Consumer. API Explorer II anchors each item by its
 * exact title.
 */
export function glossaryHref(apiExplorerUrl: string, title: string): string {
	return `${new URL(apiExplorerUrl).origin}/glossary#${encodeURIComponent(title)}`;
}
