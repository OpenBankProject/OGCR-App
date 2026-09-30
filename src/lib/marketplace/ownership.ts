import { obp_requests } from '$lib/obp/requests';
import { ENTITY_OPERATOR, ENTITY_USER_OPERATOR_RELATIONSHIP, entityPath } from '$lib/constants/entities';

export interface OperatorRecord {
	operator_id?: string;
	legal_name?: string;
	email?: string;
	[key: string]: unknown;
}

/**
 * Resolve which operators the logged-in user controls.
 *
 * The operator entity has no `user_id` link to an OBP user — its only identity
 * field is `email` (see the operator dynamic-entity schema). So for now an
 * operator is "yours" when its email matches your logged-in email. This is the
 * MVP ownership proof: good enough to gate listing, and the single place to
 * harden once the registry models a real operator↔user link.
 */
export async function getOperatorsForUser(
	accessToken: string,
	userEmail: string | null | undefined
): Promise<OperatorRecord[]> {
	if (!userEmail) return [];

	const response = await obp_requests.get(entityPath(ENTITY_OPERATOR), accessToken);
	const operators = (response[`${ENTITY_OPERATOR}_list`] || []) as OperatorRecord[];

	const target = userEmail.trim().toLowerCase();
	return operators.filter((op) => (op.email ?? '').trim().toLowerCase() === target);
}

/** Convenience: the set of operator_ids the user controls. */
export function operatorIdSet(operators: OperatorRecord[]): Set<string> {
	return new Set(operators.map((op) => op.operator_id).filter(Boolean) as string[]);
}

export interface UserOperatorRelationship {
	user_operator_relationship_id?: string;
	user_id?: string;
	operator_id?: string;
	/** Free text; reads user → operator (user is subject). e.g. "Owner". */
	relationship?: string;
	[key: string]: unknown;
}

export interface OperatorWithRelationship extends OperatorRecord {
	relationship?: string;
	user_operator_relationship_id?: string;
}

/**
 * Resolve the operators linked to a user via the `user_operator_relationship`
 * entity, keyed by the OBP `user_id`. This is the successor to the email-matching
 * in getOperatorsForUser: an explicit, modelled link rather than a coincidence of
 * email addresses.
 */
export async function getOperatorsForUserId(
	accessToken: string,
	userId: string | null | undefined
): Promise<OperatorWithRelationship[]> {
	if (!userId) return [];

	const relResponse = await obp_requests.get(
		entityPath(ENTITY_USER_OPERATOR_RELATIONSHIP),
		accessToken
	);
	const relationships = (relResponse[`${ENTITY_USER_OPERATOR_RELATIONSHIP}_list`] ||
		[]) as UserOperatorRelationship[];

	const mine = relationships.filter((r) => r.user_id === userId);
	if (mine.length === 0) return [];

	// Resolve each linked operator_id to its operator record.
	const opResponse = await obp_requests.get(entityPath(ENTITY_OPERATOR), accessToken);
	const operators = (opResponse[`${ENTITY_OPERATOR}_list`] || []) as OperatorRecord[];
	const byId = new Map<string, OperatorRecord>(
		operators.filter((op) => op.operator_id).map((op) => [op.operator_id as string, op])
	);

	return mine.map((r) => {
		const op = (r.operator_id && byId.get(r.operator_id)) || { operator_id: r.operator_id };
		return {
			...op,
			relationship: r.relationship,
			user_operator_relationship_id: r.user_operator_relationship_id
		};
	});
}

/** Link a user to an operator by creating a user_operator_relationship record. */
export async function linkUserToOperator(
	accessToken: string,
	params: { userId: string; operatorId: string; relationship?: string }
): Promise<UserOperatorRelationship> {
	const response = await obp_requests.post(
		entityPath(ENTITY_USER_OPERATOR_RELATIONSHIP),
		{
			user_id: params.userId,
			operator_id: params.operatorId,
			relationship: params.relationship || 'Owner'
		},
		accessToken
	);
	return (response[ENTITY_USER_OPERATOR_RELATIONSHIP] || response) as UserOperatorRelationship;
}

/** Update an existing user_operator_relationship record (e.g. change the relationship text). */
export async function updateUserOperatorRelationship(
	accessToken: string,
	relationshipId: string,
	params: { userId: string; operatorId: string; relationship: string }
): Promise<UserOperatorRelationship> {
	const response = await obp_requests.put(
		`${entityPath(ENTITY_USER_OPERATOR_RELATIONSHIP)}/${relationshipId}`,
		{
			user_id: params.userId,
			operator_id: params.operatorId,
			relationship: params.relationship
		},
		accessToken
	);
	return (response[ENTITY_USER_OPERATOR_RELATIONSHIP] || response) as UserOperatorRelationship;
}
