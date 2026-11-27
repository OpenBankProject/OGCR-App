import { describe, expect, it } from 'vitest';
import { findAreaOverlaps } from './areaOverlaps';

/** An axis-aligned square polygon, open ring (the module closes it). */
function square(x: number, y: number, size: number): GeoJSON.Polygon {
	return {
		type: 'Polygon',
		coordinates: [
			[
				[x, y],
				[x + size, y],
				[x + size, y + size],
				[x, y + size]
			]
		]
	};
}

const pairs = (overlaps: Map<string, string[]>) =>
	Object.fromEntries([...overlaps].map(([id, others]) => [id, [...others].sort()]));

describe('findAreaOverlaps', () => {
	it('flags parcels whose edges cross', () => {
		expect(pairs(findAreaOverlaps({ a: square(0, 0, 1), b: square(0.5, 0.5, 1) }))).toEqual({
			a: ['b'],
			b: ['a']
		});
	});

	it('flags identical parcels', () => {
		expect(pairs(findAreaOverlaps({ a: square(0, 0, 1), b: square(0, 0, 1) }))).toEqual({
			a: ['b'],
			b: ['a']
		});
	});

	it('flags a parcel inside another', () => {
		expect(pairs(findAreaOverlaps({ a: square(0, 0, 4), b: square(1, 1, 1) }))).toEqual({
			a: ['b'],
			b: ['a']
		});
	});

	it('flags parcels that share part of an edge and some ground', () => {
		expect(pairs(findAreaOverlaps({ a: square(0, 0, 1), b: square(0.5, 0, 1) }))).toEqual({
			a: ['b'],
			b: ['a']
		});
	});

	it('does not flag neighbours that only share a boundary', () => {
		expect(findAreaOverlaps({ a: square(0, 0, 1), b: square(1, 0, 1) }).size).toBe(0);
	});

	it('does not flag parcels that touch at a corner', () => {
		expect(findAreaOverlaps({ a: square(0, 0, 1), b: square(1, 1, 1) }).size).toBe(0);
	});

	it('does not flag a parcel sitting in another’s hole', () => {
		const ringed: GeoJSON.Polygon = {
			type: 'Polygon',
			coordinates: [square(0, 0, 4).coordinates[0], square(1, 1, 2).coordinates[0]]
		};
		expect(findAreaOverlaps({ a: ringed, b: square(1.5, 1.5, 1) }).size).toBe(0);
	});

	it('reads MultiPolygons and Features and lists every overlapping activity', () => {
		const multi: GeoJSON.MultiPolygon = {
			type: 'MultiPolygon',
			coordinates: [square(10, 10, 1).coordinates, square(0, 0, 1).coordinates]
		};
		const feature: GeoJSON.Feature = {
			type: 'Feature',
			properties: {},
			geometry: square(0.2, 0.2, 0.5)
		};
		expect(pairs(findAreaOverlaps({ a: multi, b: feature, c: square(10.5, 10.5, 1) }))).toEqual({
			a: ['b', 'c'],
			b: ['a'],
			c: ['a']
		});
	});
});
