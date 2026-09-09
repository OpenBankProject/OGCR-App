import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the single Redis hash the listings module uses.
const hash = new Map<string, string>();
const fakeClient = {
	hget: vi.fn(async (_key: string, field: string) => hash.get(field) ?? null),
	hgetall: vi.fn(async (_key: string) => Object.fromEntries(hash)),
	hset: vi.fn(async (_key: string, field: string, value: string) => {
		hash.set(field, value);
		return 1;
	})
};

vi.mock('$lib/redis/services/RedisService', () => ({
	redisService: { getClient: () => fakeClient }
}));

const { getListing, getAllListings, saveListing } = await import('./listings');

describe('marketplace listings', () => {
	beforeEach(() => {
		hash.clear();
		vi.clearAllMocks();
	});

	it('returns null for an activity that was never listed', async () => {
		expect(await getListing('a1')).toBeNull();
	});

	it('creates a listing with listed=true by default and timestamps', async () => {
		const saved = await saveListing('a1', { operator_id: 'op1', price_per_credit: 45 });
		expect(saved.activity_id).toBe('a1');
		expect(saved.listed).toBe(true);
		expect(saved.price_per_credit).toBe(45);
		expect(saved.created_at).toBeTruthy();
		expect(saved.updated_at).toBe(saved.created_at);
		expect(await getListing('a1')).toEqual(saved);
	});

	it('merges a partial update over the existing record and keeps created_at', async () => {
		const first = await saveListing('a1', {
			operator_id: 'op1',
			price_per_credit: 45,
			summary: 'x'
		});
		const second = await saveListing('a1', { operator_id: 'op1', credits_available: 100 });
		expect(second.price_per_credit).toBe(45);
		expect(second.summary).toBe('x');
		expect(second.credits_available).toBe(100);
		expect(second.created_at).toBe(first.created_at);
	});

	it('lets an explicit listed=false unpublish', async () => {
		await saveListing('a1', { operator_id: 'op1' });
		const updated = await saveListing('a1', { operator_id: 'op1', listed: false });
		expect(updated.listed).toBe(false);
	});

	it('getAllListings returns every listing keyed by activity_id and skips corrupt rows', async () => {
		await saveListing('a1', { operator_id: 'op1' });
		await saveListing('a2', { operator_id: 'op2' });
		hash.set('broken', '{not json');
		const all = await getAllListings();
		expect([...all.keys()].sort()).toEqual(['a1', 'a2']);
		expect(all.get('a2')?.operator_id).toBe('op2');
	});

	it('getListing returns null for a corrupt row instead of throwing', async () => {
		hash.set('a1', '{not json');
		expect(await getListing('a1')).toBeNull();
	});
});
