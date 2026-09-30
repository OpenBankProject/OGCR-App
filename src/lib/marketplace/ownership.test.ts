import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();

vi.mock('$lib/obp/requests', () => ({
	obp_requests: { get, post, put }
}));

const { getOperatorsForUser, getOperatorsForUserId, linkUserToOperator, operatorIdSet } =
	await import('./ownership');

const operators = [
	{ operator_id: 'op1', legal_name: 'Alpha Farm', email: 'Alpha@Example.com' },
	{ operator_id: 'op2', legal_name: 'Beta Farm', email: 'beta@example.com' },
	{ legal_name: 'No id', email: 'alpha@example.com' }
];

describe('ownership', () => {
	beforeEach(() => vi.clearAllMocks());

	describe('getOperatorsForUser (email matching)', () => {
		it('returns nothing without an email and makes no request', async () => {
			expect(await getOperatorsForUser('tok', null)).toEqual([]);
			expect(get).not.toHaveBeenCalled();
		});

		it('matches operator.email case-insensitively and trimmed', async () => {
			get.mockResolvedValueOnce({ operator_list: operators });
			const mine = await getOperatorsForUser('tok', '  ALPHA@example.com ');
			expect(mine.map((o) => o.legal_name)).toEqual(['Alpha Farm', 'No id']);
			expect(get).toHaveBeenCalledWith('/obp/dynamic-entity/banks/ogcr/operator', 'tok');
		});
	});

	it('operatorIdSet drops records without an operator_id', () => {
		expect([...operatorIdSet(operators)]).toEqual(['op1', 'op2']);
	});

	describe('getOperatorsForUserId (relationship entity)', () => {
		it('returns nothing without a user id and makes no request', async () => {
			expect(await getOperatorsForUserId('tok', undefined)).toEqual([]);
			expect(get).not.toHaveBeenCalled();
		});

		it('only fetches operators when the user has relationships', async () => {
			get.mockResolvedValueOnce({ user_operator_relationship_list: [] });
			expect(await getOperatorsForUserId('tok', 'u1')).toEqual([]);
			expect(get).toHaveBeenCalledTimes(1);
		});

		it('resolves linked operators and carries the relationship over', async () => {
			get
				.mockResolvedValueOnce({
					user_operator_relationship_list: [
						{
							user_operator_relationship_id: 'r1',
							user_id: 'u1',
							operator_id: 'op2',
							relationship: 'Owner'
						},
						{
							user_operator_relationship_id: 'r2',
							user_id: 'u2',
							operator_id: 'op1',
							relationship: 'Owner'
						},
						{
							user_operator_relationship_id: 'r3',
							user_id: 'u1',
							operator_id: 'missing',
							relationship: 'Staff'
						}
					]
				})
				.mockResolvedValueOnce({ operator_list: operators });

			const mine = await getOperatorsForUserId('tok', 'u1');
			expect(mine).toEqual([
				{
					operator_id: 'op2',
					legal_name: 'Beta Farm',
					email: 'beta@example.com',
					relationship: 'Owner',
					user_operator_relationship_id: 'r1'
				},
				// Dangling link: still returned so the UI can show it, but with no operator details.
				{ operator_id: 'missing', relationship: 'Staff', user_operator_relationship_id: 'r3' }
			]);
		});
	});

	it('linkUserToOperator posts a flat record and defaults relationship to Owner', async () => {
		post.mockResolvedValueOnce({
			user_operator_relationship: {
				user_operator_relationship_id: 'r9',
				user_id: 'u1',
				operator_id: 'op1'
			}
		});
		const created = await linkUserToOperator('tok', { userId: 'u1', operatorId: 'op1' });
		expect(post).toHaveBeenCalledWith(
			'/obp/dynamic-entity/banks/ogcr/user_operator_relationship',
			{ user_id: 'u1', operator_id: 'op1', relationship: 'Owner' },
			'tok'
		);
		expect(created.user_operator_relationship_id).toBe('r9');
	});
});
