import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();

vi.mock('$lib/obp/requests', () => ({
	obp_requests: { get }
}));

const { getPractices } = await import('./practices');

describe('getPractices', () => {
	beforeEach(() => vi.clearAllMocks());

	it('reads the practice entity list and sorts by name', async () => {
		get.mockResolvedValueOnce({
			technologies_practices_processes_list: [
				{ technologies_practices_processes_id: 'tpp2', practice_name: 'Reduced tillage' },
				{ technologies_practices_processes_id: 'tpp1', practice_name: 'Cover cropping' }
			]
		});

		expect(await getPractices('tok')).toEqual([
			{ technologies_practices_processes_id: 'tpp1', practice_name: 'Cover cropping' },
			{ technologies_practices_processes_id: 'tpp2', practice_name: 'Reduced tillage' }
		]);
		expect(get).toHaveBeenCalledWith('/obp/dynamic-entity/technologies_practices_processes', 'tok');
	});

	it('drops records without an id and falls back to the id for a missing name', async () => {
		get.mockResolvedValueOnce({
			technologies_practices_processes_list: [
				{ practice_name: 'Orphan' },
				{ technologies_practices_processes_id: 'tpp3' }
			]
		});

		expect(await getPractices('tok')).toEqual([
			{ technologies_practices_processes_id: 'tpp3', practice_name: 'tpp3' }
		]);
	});
});
