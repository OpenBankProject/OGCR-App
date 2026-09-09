import { env } from '$env/dynamic/private';

const DEFAULT_PREFIX = '';
export const ENTITY_PREFIX = env.OBP_ENTITY_PREFIX || DEFAULT_PREFIX;

export const ENTITY_ACTIVITY = `${ENTITY_PREFIX}activity`;
export const ENTITY_OPERATOR = `${ENTITY_PREFIX}operator`;
// Junction linking an OBP user to an operator. `relationship` reads user → operator
// (user is subject): e.g. owner, admin, member, billing_contact. Replaces the
// email-matching used by getOperatorsForUser once records exist.
export const ENTITY_USER_OPERATOR_RELATIONSHIP = `${ENTITY_PREFIX}user_operator_relationship`;
export const ENTITY_PARCEL = `${ENTITY_PREFIX}parcel`;
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
