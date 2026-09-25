import { obp_requests } from '$lib/obp/requests';
import { ENTITY_TECHNOLOGIES_PRACTICES_PROCESSES } from '$lib/constants/entities';
import type { PracticeRecord } from './options';

export type { PracticeRecord };

/**
 * The technologies, practices and processes the registry knows about.
 *
 * An activity used to carry the practice as free text; it now stores the id of
 * a record in this entity, so a form offers `practice_name` and submits the id.
 */
export async function getPractices(accessToken: string): Promise<PracticeRecord[]> {
	const entity = ENTITY_TECHNOLOGIES_PRACTICES_PROCESSES;
	const response = await obp_requests.get(`/obp/dynamic-entity/${entity}`, accessToken);
	const records = (response?.[`${entity}_list`] || []) as Array<Record<string, unknown>>;

	return records
		.map((record) => ({
			technologies_practices_processes_id:
				typeof record.technologies_practices_processes_id === 'string'
					? record.technologies_practices_processes_id
					: '',
			practice_name: typeof record.practice_name === 'string' ? record.practice_name : ''
		}))
		.filter((practice) => practice.technologies_practices_processes_id !== '')
		.map((practice) => ({
			...practice,
			practice_name: practice.practice_name || practice.technologies_practices_processes_id
		}))
		.sort((a, b) => a.practice_name.localeCompare(b.practice_name));
}
