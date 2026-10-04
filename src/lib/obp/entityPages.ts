/**
 * Where each Dynamic Entity is put to use in this app, for the Entities page to link
 * to. One page per entity: the one a reader would go to see its records in context.
 * Kept by hand, alongside the routes that read these entities; an entity no page reads
 * yet has no entry and gets no link.
 */

export interface EntityPage {
	href: string;
	label: string;
}

const ACTIVITIES: EntityPage = { href: '/activities', label: 'Activities' };
const OPERATORS: EntityPage = { href: '/my/operators', label: 'Operators' };
const REGISTRY: EntityPage = { href: '/registry/activities', label: 'Registry' };
const CHAIN: EntityPage = { href: '/chain', label: 'Chain' };

const PAGES: Record<string, EntityPage> = {
	activity: ACTIVITIES,
	activity_verification: ACTIVITIES,
	activity_monitoring_period_verification: ACTIVITIES,
	activity_parcel_verification: ACTIVITIES,
	parcel: ACTIVITIES,
	parcel_owner_verification: ACTIVITIES,
	parcel_monitoring_period_verification: ACTIVITIES,

	operator: OPERATORS,
	user_operator_relationship: OPERATORS,

	country: REGISTRY,
	certificate_of_compliance: REGISTRY,

	activity_on_chain: CHAIN,
	parcel_on_chain: CHAIN,
	certification_on_chain: CHAIN,
	carbon_credit_batch_on_chain: CHAIN,
	carbon_credit_balance_on_chain: CHAIN,
	chain_sync_status: CHAIN
};

export function entityPage(entityName: string): EntityPage | null {
	return PAGES[entityName] ?? null;
}

/**
 * The entity's page in API Manager. API Manager finds an entity of a space by its
 * name as well as by its dynamic_entity_id; the name is what the public resource docs
 * give us, the id needs a logged-in caller with a management Role.
 */
export function apiManagerEntityHref(
	apiManagerUrl: string,
	space: string,
	entityName: string
): string {
	const base = apiManagerUrl.replace(/\/$/, '');
	return `${base}/dynamic-entities/system/${encodeURIComponent(entityName)}?bank_id=${encodeURIComponent(space)}`;
}
