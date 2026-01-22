// Dynamic Entity Types
export interface DynamicEntityDefinition {
	dynamic_entity_id: string;
	entity_name: string;
	bank_id?: string;
	metadata_id?: string;
	has_personal_entity?: boolean;
}

export interface DynamicEntityField {
	name: string;
	type: string;
	required?: boolean;
	example?: string;
	description?: string;
}

export interface DynamicEntitySchema {
	entity_name: string;
	fields: DynamicEntityField[];
}

export interface DynamicEntityInstance {
	[key: string]: any;
}

export interface DynamicEntitiesResponse {
	dynamic_entities: DynamicEntityDefinition[];
}

// User Types
export interface OBPUser {
	user_id: string;
	email: string;
	username: string;
	provider: string;
	provider_id: string;
	entitlements?: {
		list: OBPEntitlement[];
	};
}

export interface OBPEntitlement {
	entitlement_id: string;
	role_name: string;
	bank_id: string;
}

// Consent Types
export interface OBPConsent {
	consent_reference_id: string;
	consent_id: string;
	consumer_id: string;
	created_by_user_id: string;
	status: string;
	created_date?: string;
	last_action_date: string;
	last_usage_date: string;
	everything?: boolean;
	jwt: string;
	jwt_payload: {
		createdByUserId: string;
		sub: string;
		iss: string;
		aud: string;
		jti: string;
		iat: number;
		nbf: number;
		exp: number;
		request_headers: any[];
		entitlements: any[];
		views: any[];
	};
	api_standard: string;
	api_version: string;
}

export interface OBPConsentInfo {
	consent_id: string;
	consumer_id: string;
	created_by_user_id: string;
	last_action_date: string;
	last_usage_date: string;
	status: string;
	api_standard: string;
	api_version: string;
}

// Consumer Types
export interface OBPConsumer {
	consumer_id: string;
	key?: string;
	secret?: string;
	app_name: string;
	app_type: 'public' | 'confidential';
	description: string;
	developer_email: string;
	redirect_url: string;
	company: string;
	created_by_user_id: string;
	created_by_user: {
		user_id: string;
		email: string;
		provider_id: string;
		provider: string;
		username: string;
	};
	enabled: boolean;
	created: string;
}

// Bank Types
export interface OBPBank {
	id: string;
	short_name: string;
	full_name: string;
	logo: string;
	website: string;
}

export interface OBPBanksResponse {
	banks: OBPBank[];
}
