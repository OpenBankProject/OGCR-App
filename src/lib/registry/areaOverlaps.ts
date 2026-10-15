/**
 * Which registry activities' areas overlap another's, for the map's quick list.
 *
 * Land claimed by two activities (often under different certification schemes) is a
 * double-counting risk, so the map flags it. Parcels are small enough to treat
 * longitude/latitude as a plane.
 *
 * Two areas overlap when their interiors share ground. Parcels that only touch along
 * a shared boundary, as neighbouring fields do, do not count. The test is: an edge of
 * one properly crosses an edge of the other, or a sample point of one (a vertex, an
 * edge midpoint or the ring's centroid) lies strictly inside the other. The sample
 * points catch the cases with no crossing: identical parcels, one inside the other,
 * and parcels that share part of an edge.
 */

type Point = [number, number];
type Ring = Point[];
/** Outer ring first, then holes. */
type Polygon = Ring[];

interface Bounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

interface Area {
	id: string;
	polygons: Polygon[];
	bounds: Bounds;
}

/** activity_id → the ids of the other activities whose areas overlap it. Only overlapping ids appear. */
export function findAreaOverlaps(
	areas: Record<string, GeoJSON.GeoJsonObject>
): Map<string, string[]> {
	const prepared: Area[] = [];
	for (const [id, geometry] of Object.entries(areas)) {
		const polygons = polygonsOf(geometry);
		const bounds = boundsOf(polygons);
		if (bounds) prepared.push({ id, polygons, bounds });
	}

	const overlaps = new Map<string, string[]>();
	const add = (a: string, b: string) => {
		const list = overlaps.get(a);
		if (list) list.push(b);
		else overlaps.set(a, [b]);
	};

	for (let i = 0; i < prepared.length; i++) {
		for (let j = i + 1; j < prepared.length; j++) {
			const a = prepared[i];
			const b = prepared[j];
			if (!boundsIntersect(a.bounds, b.bounds)) continue;
			if (areasOverlap(a.polygons, b.polygons)) {
				add(a.id, b.id);
				add(b.id, a.id);
			}
		}
	}
	return overlaps;
}

function areasOverlap(a: Polygon[], b: Polygon[]): boolean {
	return a.some((pa) => b.some((pb) => polygonsOverlap(pa, pb)));
}

function polygonsOverlap(a: Polygon, b: Polygon): boolean {
	for (const ringA of a) {
		for (const ringB of b) {
			if (ringsCross(ringA, ringB)) return true;
		}
	}
	return (
		samplePoints(a).some((p) => strictlyInside(p, b)) ||
		samplePoints(b).some((p) => strictlyInside(p, a))
	);
}

function ringsCross(a: Ring, b: Ring): boolean {
	for (let i = 0; i < a.length - 1; i++) {
		for (let j = 0; j < b.length - 1; j++) {
			if (segmentsCrossProperly(a[i], a[i + 1], b[j], b[j + 1])) return true;
		}
	}
	return false;
}

/** True only when the segments cross at a point inside both; touching or collinear is not a crossing. */
function segmentsCrossProperly(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
	const d1 = orientation(q1, q2, p1);
	const d2 = orientation(q1, q2, p2);
	const d3 = orientation(p1, p2, q1);
	const d4 = orientation(p1, p2, q2);
	return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Sign of the turn a → b → c, with near-zero treated as collinear. */
function orientation(a: Point, b: Point, c: Point): number {
	const value = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
	return Math.abs(value) < 1e-18 ? 0 : Math.sign(value);
}

function samplePoints(polygon: Polygon): Point[] {
	const outer = polygon[0];
	const points: Point[] = [];
	for (let i = 0; i < outer.length - 1; i++) {
		points.push(outer[i]);
		points.push([(outer[i][0] + outer[i + 1][0]) / 2, (outer[i][1] + outer[i + 1][1]) / 2]);
	}
	// A holed or concave parcel's centroid can fall outside its own ground.
	const centroid = ringCentroid(outer);
	if (centroid && strictlyInside(centroid, polygon)) points.push(centroid);
	return points;
}

function ringCentroid(ring: Ring): Point | null {
	let area = 0;
	let x = 0;
	let y = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		const cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
		area += cross;
		x += (ring[i][0] + ring[i + 1][0]) * cross;
		y += (ring[i][1] + ring[i + 1][1]) * cross;
	}
	if (area === 0) return null;
	return [x / (3 * area), y / (3 * area)];
}

/** Inside the outer ring and outside every hole, and on none of their boundaries. */
function strictlyInside(point: Point, polygon: Polygon): boolean {
	const [outer, ...holes] = polygon;
	if (ringPosition(point, outer) !== 'in') return false;
	return holes.every((hole) => ringPosition(point, hole) === 'out');
}

function ringPosition(point: Point, ring: Ring): 'in' | 'on' | 'out' {
	let inside = false;
	for (let i = 0; i < ring.length - 1; i++) {
		const a = ring[i];
		const b = ring[i + 1];
		if (onSegment(point, a, b)) return 'on';
		if (a[1] > point[1] !== b[1] > point[1]) {
			const x = a[0] + ((point[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
			if (point[0] < x) inside = !inside;
		}
	}
	return inside ? 'in' : 'out';
}

function onSegment(p: Point, a: Point, b: Point): boolean {
	return (
		orientation(a, b, p) === 0 &&
		p[0] >= Math.min(a[0], b[0]) &&
		p[0] <= Math.max(a[0], b[0]) &&
		p[1] >= Math.min(a[1], b[1]) &&
		p[1] <= Math.max(a[1], b[1])
	);
}

/** Every polygon in a geometry, Feature or FeatureCollection, with each ring closed. */
function polygonsOf(value: unknown): Polygon[] {
	if (!value || typeof value !== 'object') return [];
	const object = value as {
		type?: string;
		coordinates?: unknown;
		geometry?: unknown;
		features?: unknown[];
		geometries?: unknown[];
	};
	switch (object.type) {
		case 'Polygon':
			return [toPolygon(object.coordinates)].filter((p): p is Polygon => p !== null);
		case 'MultiPolygon':
			return Array.isArray(object.coordinates)
				? object.coordinates.map(toPolygon).filter((p): p is Polygon => p !== null)
				: [];
		case 'Feature':
			return polygonsOf(object.geometry);
		case 'FeatureCollection':
			return (object.features ?? []).flatMap(polygonsOf);
		case 'GeometryCollection':
			return (object.geometries ?? []).flatMap(polygonsOf);
		default:
			return [];
	}
}

function toPolygon(raw: unknown): Polygon | null {
	if (!Array.isArray(raw)) return null;
	const rings = raw.map(toRing).filter((r): r is Ring => r !== null);
	return rings.length ? rings : null;
}

function toRing(raw: unknown): Ring | null {
	if (!Array.isArray(raw)) return null;
	const points = raw.filter(
		(p): p is Point => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
	);
	if (points.length < 3) return null;
	const [first, last] = [points[0], points[points.length - 1]];
	if (first[0] !== last[0] || first[1] !== last[1]) points.push(first);
	return points;
}

function boundsOf(polygons: Polygon[]): Bounds | null {
	let bounds: Bounds | null = null;
	for (const polygon of polygons) {
		for (const [x, y] of polygon[0]) {
			if (!bounds) bounds = { minX: x, minY: y, maxX: x, maxY: y };
			else {
				bounds.minX = Math.min(bounds.minX, x);
				bounds.minY = Math.min(bounds.minY, y);
				bounds.maxX = Math.max(bounds.maxX, x);
				bounds.maxY = Math.max(bounds.maxY, y);
			}
		}
	}
	return bounds;
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
	return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}
