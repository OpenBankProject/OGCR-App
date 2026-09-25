import { describe, expect, it } from 'vitest';
import { countryOptions, practiceOptions } from './options';

describe('reference options', () => {
	it('countryOptions labels the name with its code, and tolerates undefined', () => {
		expect(countryOptions([{ country_id: 'DE', country_name: 'Germany' }])).toEqual([
			{ id: 'DE', label: 'Germany (DE)' }
		]);
		expect(countryOptions(undefined)).toEqual([]);
	});

	it('practiceOptions maps to id + label, and tolerates undefined', () => {
		expect(
			practiceOptions([
				{ technologies_practices_processes_id: 'tpp1', practice_name: 'Cover cropping' }
			])
		).toEqual([{ id: 'tpp1', label: 'Cover cropping' }]);
		expect(practiceOptions(undefined)).toEqual([]);
	});
});
