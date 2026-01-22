import { env } from '$env/dynamic/private';

const DEFAULT_PREFIX = 'ogcr3_';
const PREFIX = env.OBP_ENTITY_PREFIX || DEFAULT_PREFIX;

export const ENTITY_PROJECT = `${PREFIX}project`;
export const ENTITY_PARCEL = `${PREFIX}parcel`;
export const ENTITY_PARCEL_OWNERSHIP_VERIFICATION = `${PREFIX}parcel_owner_verification`;
export const ENTITY_PROJECT_PARCEL_VERIFICATION = `${PREFIX}project_parcel_verification`;
export const ENTITY_PROJECT_VERIFICATION = `${PREFIX}project_verification`;
export const ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION = `${PREFIX}parcel_monitoring_period_verification`;
export const ENTITY_PROJECT_MONITORING_PERIOD_VERIFICATION = `${PREFIX}project_monitoring_period_verification`;

export const ENTITY_CONSTANTS = {
	ENTITY_PROJECT,
	ENTITY_PARCEL,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	ENTITY_PROJECT_PARCEL_VERIFICATION,
	ENTITY_PROJECT_VERIFICATION,
	ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION,
	ENTITY_PROJECT_MONITORING_PERIOD_VERIFICATION
} as const;

export type EntityName = (typeof ENTITY_CONSTANTS)[keyof typeof ENTITY_CONSTANTS];
