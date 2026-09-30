import { env } from '$env/dynamic/private';

const DEFAULT_PREFIX = '';
export const ENTITY_PREFIX = env.OBP_ENTITY_PREFIX || DEFAULT_PREFIX;

// The bank (aka Space) that owns this deployment's dynamic entities. Same
// variable, and same meaning, as OGCR-DynamicEntities' `obp_space.py`, so the
// app reads from wherever those scripts created the entities. Set it to the
// empty string for system level entities; unset means the `ogcr` bank.
const DEFAULT_SPACE_ID = 'ogcr';
export const ENTITY_SPACE_ID = (env.OBP_ENTITY_SPACE_ID ?? DEFAULT_SPACE_ID).trim();

// The bank id entity Roles are granted at: the space's bank id, or the literal
// `SYS` for system level entities.
export const ENTITY_ROLE_BANK_ID = ENTITY_SPACE_ID || 'SYS';

/** Path of an entity's records in the configured space, e.g. `/obp/dynamic-entity/banks/ogcr/activity`. */
export function entityPath(entity: string): string {
	const space = ENTITY_SPACE_ID ? `/banks/${encodeURIComponent(ENTITY_SPACE_ID)}` : '';
	return `/obp/dynamic-entity${space}/${entity}`;
}

/**
 * v7.0.0 path of an entity's records in the configured space, e.g.
 * `/obp/v7.0.0/banks/ogcr/dynamic-entities/activity` (`SYS` for system level entities).
 * List items come back wrapped — `{ "<entity>": {...record}, "metadata": {...} }` — so read
 * them with `unwrapV7List()`.
 */
export function entityPathV7(entity: string): string {
	return `/obp/v7.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/dynamic-entities/${entity}`;
}

/** The plain records of a v7.0.0 list response, unwrapped from their `{ "<entity>": ..., "metadata": ... }` items. */
export function unwrapV7List<T = Record<string, unknown>>(response: any, entity: string): T[] {
	const items = (response?.[`${entity}_list`] || []) as Array<Record<string, unknown>>;
	return items.map((item) => item[entity] as T).filter((record) => record != null);
}

export const ENTITY_ACTIVITY = `${ENTITY_PREFIX}activity`;
export const ENTITY_OPERATOR = `${ENTITY_PREFIX}operator`;
// Junction linking an OBP user to an operator. `relationship` reads user → operator
// (user is subject): e.g. owner, admin, member, billing_contact. Replaces the
// email-matching used by getOperatorsForUser once records exist.
export const ENTITY_USER_OPERATOR_RELATIONSHIP = `${ENTITY_PREFIX}user_operator_relationship`;
export const ENTITY_PARCEL = `${ENTITY_PREFIX}parcel`;
// Reference list of countries: `country_id` (ISO code) + `country_name`. Other
// entities (operator, activity) store the `country_id`.
export const ENTITY_COUNTRY = `${ENTITY_PREFIX}country`;
// Reference list of farming technologies, practices and processes. An activity
// stores the `technologies_practices_processes_id` of one of these records.
export const ENTITY_TECHNOLOGIES_PRACTICES_PROCESSES = `${ENTITY_PREFIX}technologies_practices_processes`;
export const ENTITY_PARCEL_OWNERSHIP_VERIFICATION = `${ENTITY_PREFIX}parcel_owner_verification`;
export const ENTITY_ACTIVITY_PARCEL_VERIFICATION = `${ENTITY_PREFIX}activity_parcel_verification`;
export const ENTITY_ACTIVITY_VERIFICATION = `${ENTITY_PREFIX}activity_verification`;
export const ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION = `${ENTITY_PREFIX}parcel_monitoring_period_verification`;
export const ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION = `${ENTITY_PREFIX}activity_monitoring_period_verification`;

// Chain mirrors, written by OGCR-chain-cache. These are deliberately NOT
// prefixed: they are created by that service from its own JSON definitions,
// which use fixed names, so prefixing them here would look for entities that do
// not exist.
export const ENTITY_PARCEL_ON_CHAIN = 'parcel_on_chain';
export const ENTITY_ACTIVITY_ON_CHAIN = 'activity_on_chain';
export const ENTITY_CERTIFICATION_ON_CHAIN = 'certification_on_chain';
export const ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN = 'carbon_credit_batch_on_chain';
export const ENTITY_CARBON_CREDIT_BALANCE_ON_CHAIN = 'carbon_credit_balance_on_chain';
export const ENTITY_CHAIN_SYNC_STATUS = 'chain_sync_status';

// Registry entities used to work out what still needs tokenizing.
export const ENTITY_CERTIFICATE_OF_COMPLIANCE = `${ENTITY_PREFIX}certificate_of_compliance`;

export const ENTITY_CONSTANTS = {
	ENTITY_ACTIVITY,
	ENTITY_OPERATOR,
	ENTITY_USER_OPERATOR_RELATIONSHIP,
	ENTITY_PARCEL,
	ENTITY_COUNTRY,
	ENTITY_TECHNOLOGIES_PRACTICES_PROCESSES,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	ENTITY_ACTIVITY_PARCEL_VERIFICATION,
	ENTITY_ACTIVITY_VERIFICATION,
	ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION,
	ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION,
	ENTITY_PARCEL_ON_CHAIN,
	ENTITY_ACTIVITY_ON_CHAIN,
	ENTITY_CERTIFICATION_ON_CHAIN,
	ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN,
	ENTITY_CARBON_CREDIT_BALANCE_ON_CHAIN,
	ENTITY_CHAIN_SYNC_STATUS,
	ENTITY_CERTIFICATE_OF_COMPLIANCE
} as const;

export type EntityName = (typeof ENTITY_CONSTANTS)[keyof typeof ENTITY_CONSTANTS];
