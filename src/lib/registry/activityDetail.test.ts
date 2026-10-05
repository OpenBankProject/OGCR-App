import { describe, expect, it } from 'vitest';
import {
	countryLabel,
	humanise,
	mockPricePerUnit,
	parseCobenefits,
	verificationStatus
} from './activityDetail';

describe('verificationStatus', () => {
	it('has no status without a verification record', () => {
		expect(verificationStatus([])).toBeNull();
		expect(verificationStatus(null)).toBeNull();
	});

	it('lets the strongest status win, since records carry no date', () => {
		expect(verificationStatus([{ status_code: 'failed' }, { status_code: 'verified' }])).toBe(
			'verified'
		);
		expect(verificationStatus([{ status_code: 'failed' }, { status_code: 'in_progress' }])).toBe(
			'in_progress'
		);
		expect(verificationStatus([{ status_code: 'failed' }])).toBe('failed');
	});

	it('ignores codes it does not know rather than guessing', () => {
		expect(verificationStatus([{ status_code: 'unverified' }])).toBeNull();
	});
});

describe('parseCobenefits', () => {
	it('reads the JSON array the field holds', () => {
		expect(parseCobenefits('["biodiversity","water_quality","soil_health"]')).toEqual([
			'Biodiversity',
			'Water quality',
			'Soil health'
		]);
	});

	it('falls back to a comma-separated list', () => {
		expect(parseCobenefits('biodiversity, soil_health')).toEqual(['Biodiversity', 'Soil health']);
	});

	it('is empty when there is nothing declared', () => {
		expect(parseCobenefits(null)).toEqual([]);
		expect(parseCobenefits('  ')).toEqual([]);
		expect(parseCobenefits('[]')).toEqual([]);
	});
});

describe('humanise', () => {
	it('turns codes into sentence case', () => {
		expect(humanise('CARBON_FARMING')).toBe('Carbon farming');
	});
});

describe('mockPricePerUnit', () => {
	it('maps each unit type to its test price', () => {
		expect(mockPricePerUnit('Carbon Farming Sequestration')).toBe(10);
		expect(mockPricePerUnit('Soil Emission Reduction')).toBe(18);
		expect(mockPricePerUnit('Permanent Removal')).toBe(37);
		expect(mockPricePerUnit('Carbon Storage in Product')).toBe(28);
	});

	it('has no price for an unknown or missing unit type', () => {
		expect(mockPricePerUnit('Something else')).toBeNull();
		expect(mockPricePerUnit(null)).toBeNull();
	});
});

describe('countryLabel', () => {
	it('names an ISO code and keeps the code', () => {
		expect(countryLabel('IT')).toBe('Italy (IT)');
		expect(countryLabel('DE', 'Germany')).toBe('Germany (DE)');
	});

	it('is null without a country', () => {
		expect(countryLabel(null)).toBeNull();
	});
});
