// @ts-nocheck -- ported canvas code from input_ideas/Carbon Garden.html; typed at its edges (see the exported types)
/**
 * The Carbon Garden scene: a map of Europe where each registry activity grows over
 * time, drawn on a <canvas>.
 *
 * Ported from the prototype in input_ideas/Carbon Garden.html. The drawing is the
 * prototype's, kept close to the original so it can be compared line by line. What
 * changed:
 *   - the data is the live registry (see ./build.ts) instead of a baked-in snapshot;
 *   - the panel, tooltip, ticker and controls are Svelte (CarbonGarden.svelte) built
 *     from the design system, so this module only draws, and reports through callbacks;
 *   - the timeline and the activity's small charts sit on design system surfaces, so
 *     they take their colours from CSS custom properties set by the component;
 *   - the date range follows the data instead of being fixed.
 *
 * The map scene keeps its own palette (soil, trees, orbs): the design system has no
 * colours for an illustrated map.
 */
import type { GardenData } from './build';

/** A country outline: ISO 3166-1 alpha-2 code (null where there is none) and its rings. */
export interface GardenCountry {
	iso: string | null;
	p: [number, number][][];
}

export interface GardenTick {
	date: string;
	/** How far through the timeline the date is, 0 to 100. */
	progress: number;
	playing: boolean;
	reverse: boolean;
	speedIndex: number;
	removed: number;
	avoided: number;
	perDay: string;
	countries: { iso: string; name: string; value: number; share: number }[];
	board: { index: number; name: string; rate: string; meta: string }[];
	orbValue: string;
	scale: string;
	selected: { state: string; stored: string } | null;
}

export type GardenHover =
	| { kind: 'cluster'; count: number; places: string[] }
	| { kind: 'stack'; count: number }
	| { kind: 'one'; name: string; place: string; line: string; certificate: string };

export interface GardenStackItem {
	index: number;
	name: string;
	meta: string;
}

export interface GardenDetail {
	index: number;
	name: string;
	place: string;
	expectedLabel: string;
	/** What the total is, for the badge; null when the registry has no figure. */
	totalSource: string | null;
	rows: { label: string; value: string; note?: string; warn?: boolean }[];
}

export interface GardenEvent {
	id: number;
	kind: 'plan' | 'start' | 'end' | 'cert' | 'exp';
	date: string;
	text: string;
}

export interface GardenCallbacks {
	onTick(tick: GardenTick): void;
	onHover(hover: GardenHover | null, x: number, y: number): void;
	onStack(items: GardenStackItem[] | null, x: number, y: number): void;
	onSelect(detail: GardenDetail | null): void;
	onEvent(event: GardenEvent): void;
}

export interface GardenController {
	togglePlay(): void;
	reverse(): void;
	setSpeed(index: number): void;
	today(): void;
	fit(): void;
	setShowAvoided(show: boolean): void;
	/** Width in pixels the side panel covers on the right of the map; 0 when closed. */
	setPanelInset(px: number): void;
	select(index: number | null, fly: boolean): void;
	setDetailCanvases(curve: HTMLCanvasElement | null, shape: HTMLCanvasElement | null): void;
	destroy(): void;
}

export const SPEEDS = [
	{ label: 'Real time', key: '1' },
	{ label: '1 day/s', key: '2' },
	{ label: '1 week/s', key: '3' },
	{ label: '1 month/s', key: '4' },
	{ label: '1 year/s', key: '5' },
	{ label: '5 years/s', key: '6' }
];

export const KIND = {
	field: 'Field practices',
	peat: 'Peatland rewetting',
	forest: 'Afforestation',
	agro: 'Agroforestry',
	silvo: 'Silvopasture',
	hedge: 'Hedgerows',
	biochar: 'Biochar',
	dac: 'Direct air capture',
	timber: 'Timber construction',
	hemp: 'Hemp insulation',
	olive: 'Olive grove',
	rice: 'Rice cultivation',
	cows: 'Rotational grazing'
};

export function createGarden(opts: {
	canvas: HTMLCanvasElement;
	timeline: HTMLCanvasElement;
	data: GardenData;
	europe: GardenCountry[];
	callbacks: GardenCallbacks;
	/** The public version: plans are not public, so the panel leaves out the plan row. */
	publicView?: boolean;
}): GardenController {
	const { canvas: cv, timeline: tlc, data: DATA, europe: EUROPE, callbacks: cb } = opts;
	const PUBLIC_VIEW = !!opts.publicView;
	const PARC = DATA.parcels;
	let regionNames = null;
	try {
		regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
	} catch {
		regionNames = null;
	}
	const countryName = (iso) => {
		if (!iso) return 'Unknown country';
		try {
			return regionNames?.of(iso) ?? iso;
		} catch {
			return iso;
		}
	};
	const SHAPE = {
		s: 'S-curve (slow start, fast middle)',
		sat: 'fast start, flattening',
		lin: 'even',
		front: 'front-loaded'
	};
	const STATE_TXT = {
		planned: 'plan submitted, not started',
		active: 'running',
		done: 'finished its term'
	};
	const YR = 31557600000,
		DAY = 86400000;
	const ms = (s) => (s ? Date.parse(s + 'T00:00:00Z') : null);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const smooth = (a, b, v) => {
		const t = clamp((v - a) / (b - a), 0, 1);
		return t * t * (3 - 2 * t);
	};

	/* ---------- data ---------- */
	const A = DATA.acts.map((d, i) => ({
		...d,
		i,
		t0: ms(d.start),
		t1: ms(d.end) + DAY,
		tp: ms(d.plan),
		certs: d.certs.map((c) => ({ i: ms(c[0]), e: ms(c[1]), s: c[2] })),
		f: 0,
		cum: 0,
		rate: 0,
		spawn: 0,
		pulse: 0,
		acc: 0,
		cs: null,
		state: 'hidden',
		visible: false,
		al: 0,
		sz: 0,
		onscreen: false,
		ph: (i * 2.399) % 6.283
	}));
	A.forEach((a) => {
		a.dur = a.t1 - a.t0;
		a.cows = clamp(Math.round(a.ha / 4), 1, 4);
		a.avg = a.total / (a.dur / YR);
	});

	/* the timeline runs from the first year anything happens to the year after the last end date, and always includes today */
	let first = Date.now(),
		last_ = Date.now();
	for (const a of A) {
		first = Math.min(first, a.t0, a.tp ?? Infinity, ...a.certs.map((c) => c.i));
		last_ = Math.max(last_, a.t1);
	}
	const T0 = Date.UTC(new Date(first).getUTCFullYear(), 0, 1),
		T1 = Date.UTC(new Date(last_).getUTCFullYear() + 1, 0, 1);

	function Fx(a, x) {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		if (a.shape === 's') {
			const k = 7,
				g = (v) => 1 / (1 + Math.exp(-k * (v - 0.5)));
			return (g(x) - g(0)) / (g(1) - g(0));
		}
		if (a.shape === 'sat') return (1 - Math.exp(-3 * x)) / (1 - Math.exp(-3));
		if (a.shape === 'front') return 1 - Math.pow(1 - x, 2.2);
		return x;
	}
	const frac = (a, t) => Fx(a, (t - a.t0) / a.dur);
	function rateAt(a, t) {
		const x = (t - a.t0) / a.dur;
		if (x <= 0 || x >= 1) return 0;
		const h = 1e-3,
			lo = Math.max(0, x - h),
			hi = Math.min(1, x + h);
		return (a.total * (Fx(a, hi) - Fx(a, lo))) / (hi - lo) / (a.dur / YR);
	}
	/* a certificate counts between its issue and expiry dates; its status is the stored one */
	function certAt(a, t) {
		for (const c of a.certs) {
			if (c.i <= t && (c.e == null || t <= c.e)) return { s: c.s, valid: c.s === 'certified' };
		}
		if (a.certs.some((c) => c.e != null && c.e < t)) return { s: 'expired', valid: false };
		return null;
	}

	/* ---------- world: 1 unit = one degree of latitude (about 111 km); x is longitude scaled by cos(52 deg) ---------- */
	const K = Math.cos((52 * Math.PI) / 180),
		M_PER_U = 111000;
	const wxo = (lon) => lon * K,
		wyo = (lat) => -lat;
	A.forEach((a) => {
		a.base = a.par.map((pi) => PARC[pi].rings.map((r) => r.map(([lo, la]) => [wxo(lo), wyo(la)])));
	});
	/* parcel instances (one per activity-parcel link) and stacks (the same parcel shared by several activities) */
	const GROUPS = new Map(),
		INST = [];
	A.forEach((a) => {
		a.inst = a.par.map((pi, j) => {
			const p = PARC[pi];
			const rings = a.base[j];
			let x0 = 1e9,
				y0 = 1e9,
				x1 = -1e9,
				y1 = -1e9,
				sx = 0,
				sy = 0,
				n = 0;
			rings.forEach((r) =>
				r.forEach(([x, y]) => {
					if (x < x0) x0 = x;
					if (x > x1) x1 = x;
					if (y < y0) y0 = y;
					if (y > y1) y1 = y;
				})
			);
			rings[0].forEach(([x, y]) => {
				sx += x;
				sy += y;
				n++;
			});
			const inst = {
				a,
				p,
				rings,
				bb: [x0, y0, x1, y1],
				c: [sx / n, sy / n],
				ha: p.ha,
				st: p.st,
				samples: null,
				edge: null,
				sz: 0,
				g: null
			};
			let g = GROUPS.get(p.id);
			if (!g) {
				g = { list: [], lead: null, n: 0 };
				GROUPS.set(p.id, g);
			}
			g.list.push(inst);
			inst.g = g;
			INST.push(inst);
			return inst;
		});
		const bb = [1e9, 1e9, -1e9, -1e9];
		a.inst.forEach((i) => {
			bb[0] = Math.min(bb[0], i.bb[0]);
			bb[1] = Math.min(bb[1], i.bb[1]);
			bb[2] = Math.max(bb[2], i.bb[2]);
			bb[3] = Math.max(bb[3], i.bb[3]);
		});
		a.bb = bb;
		a.cx = (bb[0] + bb[2]) / 2;
		a.cy = (bb[1] + bb[3]) / 2;
	});
	const GL = [...GROUPS.values()].sort((p, q) => q.list[0].ha - p.list[0].ha);

	function inRing(x, y, r) {
		let c = false;
		for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
			const a = r[i],
				b = r[j];
			if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
		}
		return c;
	}
	const inRings = (x, y, rs) => rs.some((r) => inRing(x, y, r));
	/* low-discrepancy points inside a parcel: the first n of them are always a good spread, so density can follow zoom */
	function ensureSamples(L) {
		if (L.samples) return;
		const s = [],
			a1 = 0.7548776662466927,
			a2 = 0.5698402909980532,
			[x0, y0, x1, y1] = L.bb;
		for (let n = 1; n < 6000 && s.length < 240; n++) {
			const x = x0 + ((0.5 + a1 * n) % 1) * (x1 - x0),
				y = y0 + ((0.5 + a2 * n) % 1) * (y1 - y0);
			if (inRings(x, y, L.rings)) s.push([x, y]);
		}
		if (!s.length) s.push(L.c);
		L.samples = s;
		const e = [],
			r = L.rings[0];
		for (let i = 0; i < r.length; i++) {
			const p = r[i],
				q = r[(i + 1) % r.length];
			e.push([p[0], p[1]], [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
		}
		L.edge = e;
	}

	/* ---------- canvas & view ---------- */
	const ctx = cv.getContext('2d'),
		tctx = tlc.getContext('2d');
	let W = 0,
		H = 0,
		DPR = 1,
		tlDirty = true,
		panelInset = 0;
	const view = { cx: wxo(5), cy: wyo(52.5), z: 20, ox: 0, oy: 0, maxSpawn: 1 };
	let z0 = 20,
		fly = null,
		laidOut = false;
	const ZMAX = 260000;
	const land = EUROPE.map((c) => ({
		iso: c.iso,
		p: c.p.map((r) => r.map(([lo, la]) => [wxo(lo), wyo(la)]))
	}));
	const narrow = () => W <= 820;
	const inset = () => (narrow() ? 0 : panelInset);
	function layout() {
		DPR = Math.min(2, window.devicePixelRatio || 1);
		W = cv.clientWidth;
		H = cv.clientHeight;
		cv.width = W * DPR;
		cv.height = H * DPR;
		const r = tlc.getBoundingClientRect();
		tlc.width = r.width * DPR;
		tlc.height = r.height * DPR;
		view.ox = (W - inset()) / 2;
		view.oy = H / 2 - (narrow() && panelInset ? H * 0.12 : 0);
		z0 = Math.min((W - inset()) / (50 * K), H / 30) * 0.92;
		if (!laidOut && W > 0) {
			view.z = z0;
			laidOut = true;
		}
		tlDirty = true;
	}
	const toX = (wx) => (wx - view.cx) * view.z + view.ox,
		toY = (wy) => (wy - view.cy) * view.z + view.oy;
	const mpp = () => M_PER_U / view.z;
	function fitView() {
		fly = { cx: wxo(5), cy: wyo(52.5), z: z0 };
	}
	function flyBox(bb, share) {
		const aw = W - inset(),
			ah = H,
			w = Math.max(bb[2] - bb[0], 2e-5),
			h = Math.max(bb[3] - bb[1], 2e-5);
		fly = {
			cx: (bb[0] + bb[2]) / 2,
			cy: (bb[1] + bb[3]) / 2,
			z: clamp(Math.min((aw * share) / w, (ah * share) / h), z0, ZMAX)
		};
	}

	/* ---------- time ---------- */
	const SPEED_MS = [
		1,
		DAY / 1000,
		(7 * DAY) / 1000,
		(30.44 * DAY) / 1000,
		YR / 1000,
		(5 * YR) / 1000
	];
	let simT = clamp(Date.now(), T0, T1),
		playing = true,
		dir = 1,
		speedIdx = 3,
		scrubbing = false,
		lastEvT = simT;
	let showAvoid = true;
	function onKey(e) {
		const tag = e.target?.tagName;
		if (
			tag === 'INPUT' ||
			tag === 'TEXTAREA' ||
			tag === 'SELECT' ||
			tag === 'BUTTON' ||
			e.target?.isContentEditable
		)
			return;
		if (e.code === 'Space') {
			e.preventDefault();
			playing = !playing;
		} else if (e.key === 'r' || e.key === 'R') dir *= -1;
		else if (e.key >= '1' && e.key <= '6') {
			speedIdx = +e.key - 1;
			playing = true;
		} else if (e.key === 'Escape') {
			closeStack();
			select(null);
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			const d = e.key === 'ArrowRight' ? 1 : -1;
			simT = clamp(simT + d * Math.max(SPEED_MS[speedIdx] * 500, DAY), T0, T1);
			lastEvT = simT;
		} else return;
		tickNow = true;
	}
	addEventListener('keydown', onKey);

	/* ---------- formatting ---------- */
	const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }),
		nf1 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
	const fmt = (n) =>
		Math.abs(n) >= 100
			? nf0.format(n)
			: Math.abs(n) >= 10
				? nf1.format(n)
				: (Math.round(n * 100) / 100).toString();
	function fmtMass(t) {
		if (t < 0.001) return nf1.format(t * 1e6) + ' g';
		if (t < 1) return nf1.format(t * 1000) + ' kg';
		return fmt(t) + ' t';
	}
	const fmtDate = (t) =>
		new Date(t).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});
	function fmtLen(m) {
		return m >= 1000 ? fmt(m / 1000) + ' km' : fmt(m) + ' m';
	}
	const placeOf = (a) => (a.city ? a.city + ', ' : '') + countryName(a.iso);

	/* ---------- colours and fonts ---------- */
	const hexc = (h) => [
		parseInt(h.slice(1, 3), 16),
		parseInt(h.slice(3, 5), 16),
		parseInt(h.slice(5, 7), 16)
	];
	function mix(a, b, t) {
		const A_ = hexc(a),
			B_ = hexc(b);
		t = clamp(t, 0, 1);
		return `rgb(${Math.round(A_[0] + (B_[0] - A_[0]) * t)},${Math.round(A_[1] + (B_[1] - A_[1]) * t)},${Math.round(A_[2] + (B_[2] - A_[2]) * t)})`;
	}
	/* ground at start of the activity, and when mature (more stored carbon = darker, richer) */
	const GB = {
		field: '#9a8458',
		forest: '#62794f',
		agro: '#82915a',
		silvo: '#78985a',
		hedge: '#82915a',
		olive: '#9a9a62',
		peat: '#46707a',
		rice: '#58988e',
		cows: '#78985a',
		biochar: '#665a52',
		dac: '#7a8b92',
		timber: '#928266',
		hemp: '#929b70'
	};
	const GR = {
		field: '#4c3826',
		forest: '#2f5a35',
		agro: '#4a6a3a',
		silvo: '#3f7a3b',
		hedge: '#4a6a3a',
		olive: '#6a7040',
		peat: '#244f58',
		rice: '#2f6a62',
		cows: '#4a8a3a',
		biochar: '#2a221e',
		dac: '#5c6b72',
		timber: '#6e604b',
		hemp: '#76805a'
	};
	const KC = {
		field: '#e3b94a',
		forest: '#59b04e',
		agro: '#7fc24a',
		silvo: '#8fd05a',
		hedge: '#6fb85a',
		olive: '#a7b88a',
		peat: '#79c2d6',
		rice: '#9ad86a',
		cows: '#f2f2ec',
		biochar: '#a89488',
		dac: '#9fb4bb',
		timber: '#c7925a',
		hemp: '#b8c27f'
	};
	const SOILY = new Set(['field', 'agro', 'silvo', 'hedge', 'olive', 'cows']);
	/* the timeline and the small charts sit on design system surfaces: their colours come from custom properties the component sets */
	let TOK = null,
		tokAge = 0;
	function tokens() {
		if (TOK && tokAge++ < 60) return TOK;
		tokAge = 0;
		const s = getComputedStyle(tlc),
			v = (n, f) => s.getPropertyValue(n).trim() || f;
		const css = getComputedStyle(cv);
		TOK = {
			ink: v('--cg-ink', '#0f3655'),
			muted: v('--cg-muted', '#6a8196'),
			curve: v('--cg-curve', '#6db087'),
			plan: v('--cg-plan', '#3f88c6'),
			cert: v('--cg-cert', '#c2410c'),
			track: v('--cg-track', '#f5f5f4'),
			negative: v('--cg-negative', '#b91c1c'),
			body: css.getPropertyValue('--font-family-default').trim() || 'system-ui, sans-serif',
			mono: css.getPropertyValue('--font-family-mono').trim() || 'ui-monospace, monospace'
		};
		return TOK;
	}

	/* ---------- pre-rendered glows (cheap orbs) ---------- */
	function glowSprite(rgb) {
		const c = document.createElement('canvas');
		c.width = c.height = 64;
		const g = c.getContext('2d');
		const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
		gr.addColorStop(0, `rgba(${rgb},.9)`);
		gr.addColorStop(0.25, `rgba(${rgb},.38)`);
		gr.addColorStop(1, `rgba(${rgb},0)`);
		g.fillStyle = gr;
		g.fillRect(0, 0, 64, 64);
		return c;
	}
	const GLOW_OK = glowSprite('168,240,95'),
		GLOW_NO = glowSprite('140,196,232'),
		GLOW_W = glowSprite('255,255,255');

	/* ---------- particles ---------- */
	const atoms = [],
		fx = [];
	let AV = 1,
		TT = 0;
	function spawnAtom(a, up) {
		if (atoms.length > 1100) return false;
		const L = a.inst[(Math.random() * a.inst.length) | 0];
		let tx = a.cx,
			ty = a.cy;
		if (L.sz >= 6) {
			ensureSamples(L);
			const s = L.samples[(Math.random() * L.samples.length) | 0];
			tx = s[0];
			ty = s[1];
		}
		const sx = toX(tx),
			sy = toY(ty);
		if (sx < -40 || sx > W + 40 || sy < -20 || sy > H + 20) return false;
		if (a.cat === 'avoid') {
			atoms.push({
				a,
				L,
				kind: 'puff',
				t: 0,
				dur: 2 + Math.random() * 1.4,
				tx,
				ty,
				dx: (Math.random() - 0.5) * 26,
				r: 3 + Math.random() * 3
			});
		} else {
			atoms.push({
				a,
				L,
				kind: 'orb',
				t: 0,
				dur: 1.1 + Math.random() * 0.9,
				tx,
				ty,
				dx: (Math.random() - 0.5) * 14,
				h: 32 + Math.random() * 34,
				cert: !!(a.cs && a.cs.valid),
				up,
				big: L.sz >= 100
			});
		}
		return true;
	}
	function drawOrb(x, y, r, cert, al, sc) {
		const R = r * sc;
		ctx.globalAlpha = al * 0.9;
		ctx.drawImage(cert ? GLOW_OK : GLOW_NO, x - R * 4, y - R * 4, R * 8, R * 8);
		ctx.globalAlpha = al;
		if (cert) {
			ctx.fillStyle = '#b9f77a';
			ctx.beginPath();
			ctx.arc(x, y, R, 0, 6.283);
			ctx.fill();
			ctx.fillStyle = 'rgba(255,255,255,.75)';
			ctx.beginPath();
			ctx.arc(x - R * 0.3, y - R * 0.3, R * 0.3, 0, 6.283);
			ctx.fill();
		} else {
			ctx.strokeStyle = '#8cc4e8';
			ctx.lineWidth = Math.max(1.2, R * 0.34);
			ctx.beginPath();
			ctx.arc(x, y, R * 0.9, 0, 6.283);
			ctx.stroke();
			ctx.fillStyle = 'rgba(140,196,232,.14)';
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}
	function drawParticles(dt) {
		for (let i = atoms.length - 1; i >= 0; i--) {
			const p = atoms[i];
			p.t += dt / p.dur;
			if (p.t >= 1) {
				if (p.kind === 'orb' && !p.up) {
					p.a.pulse = Math.min(1, p.a.pulse + 0.3);
					fx.push({ kind: 'flash', tx: p.tx, ty: p.ty, t: 0, cert: p.cert });
				}
				atoms.splice(i, 1);
				continue;
			}
			const sx = toX(p.tx),
				sy = toY(p.ty);
			if (p.kind === 'orb') {
				const q = p.up ? 1 - p.t : p.t,
					e = q * q * (3 - 2 * q);
				const x = sx + p.dx * (1 - e),
					y = sy - p.h * (1 - e);
				const al = p.up ? 1 - p.t * 0.7 : Math.min(1, p.t * 7) * (1 - smooth(0.86, 1, p.t) * 0.6);
				drawOrb(x, y, p.big ? 4.4 : 3.4, p.cert, al, 1 - 0.5 * e * e * e);
			} else {
				const e = p.t,
					x = sx + p.dx * e,
					y = sy - 8 - 46 * e,
					r = p.r + 4 * e;
				ctx.fillStyle = `rgba(154,167,173,${0.7 * (1 - e)})`;
				ctx.beginPath();
				ctx.arc(x, y, r, 0, 6.283);
				ctx.fill();
			}
		}
		ctx.globalCompositeOperation = 'lighter';
		for (let i = fx.length - 1; i >= 0; i--) {
			const f = fx[i];
			f.t += dt / (f.kind === 'flash' ? 0.55 : f.kind === 'coin' ? 1.4 : 1.1);
			if (f.t >= 1) {
				fx.splice(i, 1);
				continue;
			}
			if (f.kind === 'flash') {
				const x = toX(f.tx),
					y = toY(f.ty),
					R = 8 + 24 * f.t;
				ctx.globalAlpha = (1 - f.t) * 0.85;
				ctx.drawImage(f.cert ? GLOW_OK : GLOW_NO, x - R, y - R, R * 2, R * 2);
				ctx.globalAlpha = (1 - f.t) * 0.55;
				const r2 = R * 0.5;
				ctx.drawImage(GLOW_W, x - r2, y - r2, r2 * 2, r2 * 2);
			}
		}
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		for (const f of fx) {
			if (f.kind === 'coin') {
				const a = f.a,
					x = toX(a.cx),
					y = toY(a.cy) - 14 - f.t * 40;
				ctx.globalAlpha = 1 - f.t * f.t;
				ctx.fillStyle = '#ffc857';
				ctx.beginPath();
				ctx.arc(x, y, 6, 0, 6.283);
				ctx.fill();
				ctx.strokeStyle = '#7a5a10';
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(x - 3, y);
				ctx.lineTo(x - 1, y + 3);
				ctx.lineTo(x + 4, y - 3);
				ctx.stroke();
				ctx.globalAlpha = 1;
			} else if (f.kind === 'pop') {
				const a = f.a,
					x = toX(a.cx),
					y = toY(a.cy),
					R = 10 + 46 * f.t;
				ctx.globalAlpha = (1 - f.t) * 0.9;
				ctx.strokeStyle = f.col;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(x, y, R, 0, 6.283);
				ctx.stroke();
				ctx.globalAlpha = 1;
			}
		}
	}

	/* ---------- sprites (sizes in world metres, with a pixel floor so they stay readable) ---------- */
	function tree(x, y, h, sw, ph, c1, c2, f) {
		if (h < 8) {
			ctx.strokeStyle = '#9be05f';
			ctx.lineWidth = Math.max(1, h * 0.14);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x, y - h);
			ctx.stroke();
			ctx.fillStyle = '#9be05f';
			ctx.beginPath();
			ctx.ellipse(x - h * 0.35, y - h, h * 0.35, h * 0.18, -0.5, 0, 6.283);
			ctx.ellipse(x + h * 0.35, y - h * 1.05, h * 0.35, h * 0.18, 0.5, 0, 6.283);
			ctx.fill();
			return;
		}
		const s = Math.sin(TT * 1.4 + ph) * sw,
			tw = h * (0.04 + 0.075 * f);
		ctx.fillStyle = 'rgba(0,0,0,.22)';
		ctx.beginPath();
		ctx.ellipse(x, y, h * 0.3, h * 0.08, 0, 0, 6.283);
		ctx.fill();
		ctx.fillStyle = '#6b4a2e';
		ctx.fillRect(x - tw / 2, y - h * 0.4, tw, h * 0.4);
		ctx.fillStyle = c2;
		ctx.beginPath();
		ctx.arc(x - h * 0.17 + s, y - h * 0.5, h * 0.24, 0, 6.283);
		ctx.arc(x + h * 0.17 + s, y - h * 0.5, h * 0.24, 0, 6.283);
		ctx.fill();
		ctx.fillStyle = c1;
		ctx.beginPath();
		ctx.arc(x + s * 1.4, y - h * 0.7, h * 0.3, 0, 6.283);
		ctx.fill();
	}
	function wheat(x, y, s, f, ph, col0) {
		const h = s * (0.2 + 0.8 * f),
			col = col0 || mix('#7fc24a', '#e3b94a', Math.max(0, (f - 0.55) / 0.45));
		ctx.strokeStyle = col;
		ctx.lineWidth = Math.max(1, s * 0.09);
		ctx.lineCap = 'round';
		ctx.beginPath();
		for (let i = -2; i <= 2; i++) {
			const dx = i * s * 0.24,
				dy = ((i * 7) % 3) * s * 0.07,
				sw = Math.sin(TT * 2 + ph + i) * s * 0.05;
			ctx.moveTo(x + dx, y + dy);
			ctx.lineTo(x + dx + sw, y + dy - h);
		}
		ctx.stroke();
		if (f > 0.5 && !col0) {
			ctx.fillStyle = col;
			for (let i = -2; i <= 2; i++) {
				const dx = i * s * 0.24,
					dy = ((i * 7) % 3) * s * 0.07,
					sw = Math.sin(TT * 2 + ph + i) * s * 0.05;
				ctx.beginPath();
				ctx.ellipse(x + dx + sw, y + dy - h, s * 0.05, s * 0.1, 0, 0, 6.283);
				ctx.fill();
			}
		}
	}
	function shrub(x, y, r, f, ph) {
		ctx.fillStyle = mix('#3d7a35', '#5fae4a', (ph * 3) % 1);
		ctx.beginPath();
		ctx.arc(x, y - r * 0.5, r * (0.45 + 0.55 * f), 0, 6.283);
		ctx.fill();
	}
	function cow(x, y, s, dirn) {
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(dirn, 1);
		ctx.strokeStyle = '#2a2a2a';
		ctx.lineWidth = Math.max(1, s * 0.14);
		ctx.beginPath();
		for (const lx of [-0.7, -0.3, 0.3, 0.7]) {
			ctx.moveTo(lx * s, 0);
			ctx.lineTo(lx * s, s * 0.55 + Math.sin(TT * 5 + lx * 4) * s * 0.06);
		}
		ctx.stroke();
		ctx.fillStyle = '#f2f2ec';
		ctx.beginPath();
		ctx.ellipse(0, -s * 0.1, s, s * 0.52, 0, 0, 6.283);
		ctx.fill();
		ctx.fillStyle = '#2b2b2b';
		ctx.beginPath();
		ctx.ellipse(-s * 0.3, -s * 0.2, s * 0.3, s * 0.2, 0.3, 0, 6.283);
		ctx.ellipse(s * 0.2, 0, s * 0.22, s * 0.16, 0, 0, 6.283);
		ctx.fill();
		ctx.fillStyle = '#f2f2ec';
		ctx.beginPath();
		ctx.ellipse(s * 1.05, -s * 0.35, s * 0.34, s * 0.28, 0, 0, 6.283);
		ctx.fill();
		ctx.fillStyle = '#e9a8a0';
		ctx.fillRect(s * 1.2, -s * 0.28, s * 0.2, s * 0.14);
		ctx.restore();
	}
	function worker(x, y, s) {
		ctx.fillStyle = '#3d6ea8';
		ctx.fillRect(x - s * 0.45, y - s * 0.8, s * 0.35, s * 0.85);
		ctx.fillRect(x + s * 0.1, y - s * 0.8, s * 0.35, s * 0.85);
		ctx.fillStyle = '#e8b84b';
		ctx.fillRect(x - s * 0.5, y - s * 2.1, s, s * 1.3);
		ctx.fillStyle = '#f1c9a0';
		ctx.beginPath();
		ctx.arc(x, y - s * 2.5, s * 0.5, 0, 6.283);
		ctx.fill();
		ctx.fillStyle = '#d9b45a';
		ctx.beginPath();
		ctx.ellipse(x, y - s * 2.75, s * 0.9, s * 0.22, 0, 0, 6.283);
		ctx.fill();
	}
	function olive(x, y, h, ph, f) {
		ctx.fillStyle = 'rgba(0,0,0,.2)';
		ctx.beginPath();
		ctx.ellipse(x, y, h * 0.45, h * 0.1, 0, 0, 6.283);
		ctx.fill();
		const tw = h * (0.08 + 0.06 * f);
		ctx.fillStyle = '#6f5a42';
		ctx.fillRect(x - tw / 2, y - h * 0.35, tw, h * 0.35);
		ctx.fillStyle = '#a7b88a';
		ctx.beginPath();
		ctx.ellipse(
			x + Math.sin(TT * 1.3 + ph) * h * 0.02,
			y - h * 0.55,
			h * 0.4,
			h * 0.3,
			0,
			0,
			6.283
		);
		ctx.fill();
		ctx.fillStyle = '#7f9568';
		ctx.beginPath();
		ctx.ellipse(x, y - h * 0.5, h * 0.26, h * 0.18, 0, 0, 6.283);
		ctx.fill();
	}
	const WORKERS = new Set(['field', 'agro', 'silvo', 'hedge', 'forest', 'olive']);
	function drawSprites(L, a) {
		ensureSamples(L);
		const M = mpp(),
			pts = L.samples,
			f = a.f,
			k = a.kind,
			areaPx = (L.ha * 1e4) / (M * M);
		const sp = (Sm, fl) => Math.max(Sm / M, fl);
		const take = (px, cap) =>
			Math.max(1, Math.min(cap, pts.length, Math.floor(areaPx / (px * px * 2.6))));
		const vis = (p) => {
			const x = toX(p[0]),
				y = toY(p[1]);
			return x > -60 && x < W + 60 && y > -60 && y < H + 100 ? { x, y } : null;
		};
		const list = (n, src) => {
			const out = [];
			for (let i = 0; i < n; i++) {
				const v = vis((src || pts)[i]);
				if (v) {
					v.i = i;
					out.push(v);
				}
			}
			return out.sort((p, q) => p.y - q.y);
		};
		const worker_ = () => {
			if (!WORKERS.has(k) || a.state !== 'active' || L.sz < 150) return;
			const nw = L.ha > 8 ? 2 : 1;
			for (let w = 0; w < nw; w++) {
				const p = pts[(3 + w * 2) % pts.length],
					q = pts[(4 + w * 2) % pts.length],
					u = (Math.sin(TT * 0.12 + a.ph + w * 2) + 1) / 2;
				worker(toX(p[0] + (q[0] - p[0]) * u), toY(p[1] + (q[1] - p[1]) * u), sp(1.8, 8) / 2.8);
			}
		};
		const cows_ = () => {
			for (let i = 0; i < a.cows; i++) {
				const p = pts[(i * 3 + 1) % pts.length],
					q = pts[(i * 3 + 2) % pts.length],
					u = (Math.sin(TT * 0.18 + a.ph + i * 1.7) + 1) / 2;
				cow(
					toX(p[0] + (q[0] - p[0]) * u),
					toY(p[1] + (q[1] - p[1]) * u),
					sp(2.2, 9) / 1.8,
					Math.cos(TT * 0.18 + a.ph + i * 1.7) > 0 ? 1 : -1
				);
			}
		};
		if (k === 'field') {
			const px = sp(1.4, 9);
			for (const v of list(take(px, 170))) wheat(v.x, v.y, px, f, a.ph + v.i);
			worker_();
		} else if (k === 'forest') {
			const px = sp(16, 14);
			for (const v of list(take(px, 90)))
				tree(v.x, v.y, px * (0.3 + 0.7 * f), px * 0.012, a.ph + v.i, '#4f9a43', '#3b7d38', f);
			worker_();
		} else if (k === 'agro') {
			const pw = sp(1.4, 9),
				pt = sp(11, 12);
			for (const v of list(take(pw, 150))) {
				if (v.i % 5 === 0)
					tree(v.x, v.y, pt * (0.3 + 0.7 * f), pt * 0.012, a.ph + v.i, '#58a64a', '#3f8a3a', f);
				else wheat(v.x, v.y, pw, Math.min(1, f * 1.3), a.ph + v.i);
			}
			worker_();
		} else if (k === 'silvo' || k === 'cows') {
			const pg = sp(1.2, 8);
			for (const v of list(Math.min(take(pg, 90), 60)))
				wheat(v.x, v.y, pg, 0.35, a.ph + v.i, '#6fae4a');
			if (k === 'silvo') {
				const pt = sp(10, 12);
				for (const v of list(Math.min(take(pt, 50), pts.length)))
					if (v.i % 4 === 0)
						tree(v.x, v.y, pt * (0.3 + 0.7 * f), pt * 0.012, a.ph + v.i, '#58a64a', '#3f8a3a', f);
			}
			cows_();
			worker_();
		} else if (k === 'hedge') {
			const r = sp(3, 7);
			for (const v of list(L.edge.length, L.edge)) shrub(v.x, v.y, r, f, v.i * 0.37);
			const pw = sp(1.4, 9);
			for (const v of list(Math.min(take(pw, 70), 70)))
				wheat(v.x, v.y, pw, Math.min(1, f * 1.2), a.ph + v.i);
			worker_();
		} else if (k === 'olive') {
			const px = sp(6, 11);
			for (const v of list(take(px, 60))) olive(v.x, v.y, px * (0.55 + 0.45 * f), a.ph + v.i, f);
			worker_();
		} else if (k === 'peat' || k === 'rice') {
			ctx.save();
			ctx.beginPath();
			for (const r of L.rings) {
				r.forEach(([x, y], i) => {
					const sx = toX(x),
						sy = toY(y);
					i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
				});
				ctx.closePath();
			}
			ctx.clip();
			ctx.fillStyle = 'rgba(120,200,220,.3)';
			ctx.fillRect(0, 0, W, H);
			ctx.strokeStyle = 'rgba(190,235,245,.55)';
			ctx.lineWidth = 1.2;
			for (let i = 0; i < 5; i++) {
				const v = vis(pts[(i * 7) % pts.length]);
				if (!v) continue;
				const p = (TT * 0.5 + i * 0.2) % 1;
				ctx.globalAlpha = 1 - p;
				ctx.beginPath();
				ctx.ellipse(v.x, v.y, sp(6, 12) * p, sp(6, 12) * p * 0.45, 0, 0, 6.283);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			ctx.restore();
			const px = sp(1.3, 8);
			for (const v of list(take(px, 110)))
				wheat(
					v.x,
					v.y,
					px * (0.5 + 0.5 * f),
					Math.max(0.4, f),
					a.ph + v.i,
					k === 'rice' ? '#8fd05a' : '#79a85a'
				);
		} else if (k === 'biochar') {
			const c = L.c,
				x = toX(c[0]),
				y = toY(c[1]),
				px = sp(18, 38);
			for (let i = 0; i < Math.floor(60 * f); i++) {
				const v = vis(pts[i % pts.length]);
				if (v) {
					ctx.fillStyle = 'rgba(20,16,14,.55)';
					ctx.beginPath();
					ctx.ellipse(v.x, v.y, px * 0.09, px * 0.05, 0, 0, 6.283);
					ctx.fill();
				}
			}
			ctx.fillStyle = '#1d1816';
			ctx.beginPath();
			ctx.ellipse(x + px * 0.22, y, px * (0.12 + 0.4 * f), px * (0.07 + 0.2 * f), 0, 0, 6.283);
			ctx.fill();
			ctx.fillStyle = '#6c6560';
			ctx.beginPath();
			ctx.moveTo(x - px * 0.5, y);
			ctx.lineTo(x - px * 0.28, y - px * 0.62);
			ctx.lineTo(x - px * 0.06, y);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = a.rate > 0 ? '#ff9b45' : '#4a423d';
			ctx.beginPath();
			ctx.arc(x - px * 0.28, y - px * 0.6, px * 0.07, 0, 6.283);
			ctx.fill();
			if (a.rate > 0)
				for (let i = 0; i < 4; i++) {
					const p = (TT * 0.45 + i * 0.25) % 1;
					ctx.fillStyle = `rgba(150,150,150,${0.45 * (1 - p)})`;
					ctx.beginPath();
					ctx.arc(
						x - px * 0.28 + Math.sin(p * 5 + i) * px * 0.08,
						y - px * 0.66 - p * px * 0.9,
						px * (0.07 + 0.12 * p),
						0,
						6.283
					);
					ctx.fill();
				}
		} else if (k === 'dac') {
			const c = L.c,
				px = sp(12, 26),
				n = 1 + Math.round(f * 3);
			for (let i = 0; i < n; i++) {
				const x = toX(c[0]) + (-0.6 + i * 0.4) * px,
					y = toY(c[1]);
				ctx.fillStyle = '#8ea3ab';
				ctx.fillRect(x - px * 0.11, y - px, px * 0.22, px);
				ctx.fillStyle = '#31434a';
				ctx.fillRect(x - px * 0.11, y - px, px * 0.22, px * 0.12);
				const ang = TT * (a.rate > 0 ? 5 : 0.6) + i;
				ctx.save();
				ctx.translate(x, y - px * 0.55);
				ctx.strokeStyle = '#d7e6ea';
				ctx.lineWidth = Math.max(1, px * 0.06);
				ctx.beginPath();
				for (let b = 0; b < 3; b++) {
					const q = ang + b * 2.094;
					ctx.moveTo(0, 0);
					ctx.lineTo(Math.cos(q) * px * 0.24, Math.sin(q) * px * 0.24);
				}
				ctx.stroke();
				ctx.restore();
			}
		} else if (k === 'timber' || k === 'hemp') {
			const c = L.c,
				px = sp(20, 30),
				x = toX(c[0]),
				y = toY(c[1]),
				w = px * 0.9,
				h = px * (0.2 + 0.7 * f),
				col = k === 'timber' ? '#c7925a' : '#b8c27f';
			ctx.fillStyle = col;
			ctx.fillRect(x - w / 2, y - h, w, h);
			ctx.strokeStyle = 'rgba(60,40,20,.45)';
			ctx.lineWidth = Math.max(1, px * 0.03);
			for (let yy = y - h + px * 0.1; yy < y; yy += px * 0.1) {
				ctx.beginPath();
				ctx.moveTo(x - w / 2, yy);
				ctx.lineTo(x + w / 2, yy);
				ctx.stroke();
			}
			if (f > 0.8) {
				ctx.fillStyle = '#7d4a3a';
				ctx.beginPath();
				ctx.moveTo(x - w * 0.62, y - h);
				ctx.lineTo(x, y - h - px * 0.4);
				ctx.lineTo(x + w * 0.62, y - h);
				ctx.closePath();
				ctx.fill();
			}
		}
	}

	/* ---------- activity state ---------- */
	function updateStates(t) {
		let maxView = 0,
			maxAll = 0;
		for (const a of A) {
			if (t >= a.t0) a.state = t >= a.t1 ? 'done' : 'active';
			else if (a.tp != null && t >= a.tp) a.state = 'planned';
			else a.state = 'hidden';
			a.visible = a.state !== 'hidden' && (showAvoid || a.cat !== 'avoid');
			a.f = frac(a, t);
			a.cum = a.total * a.f;
			a.rate = a.state === 'active' ? rateAt(a, t) : 0;
			a.cs = certAt(a, t);
			const x = (t - a.t0) / a.dur;
			a.spawn = a.cat === 'avoid' ? (x > 0 && x < 1 ? a.avg * 2 * (1 - a.f) : 0) : a.rate;
			if (!a.visible) a.spawn = 0;
			if (a.spawn > maxAll) maxAll = a.spawn;
			if (a.onscreen && a.spawn > maxView) maxView = a.spawn;
		}
		for (const g of GROUPS.values()) {
			let best = null,
				bs = -1,
				n = 0;
			for (const L of g.list) {
				if (!L.a.visible) continue;
				n++;
				const s =
					(L.a.state === 'active' ? 2e9 + L.a.rate : L.a.state === 'done' ? 1e9 : 0) +
					(L.a.al || 0);
				if (s > bs) {
					bs = s;
					best = L;
				}
			}
			g.lead = best;
			g.n = n;
		}
		return maxView > 0 ? maxView : maxAll;
	}

	/* ---------- selection / tooltip / hit-testing ---------- */
	let sel = null,
		hov = null,
		mouse = { x: 0, y: 0, inside: false },
		markerDraw = [];
	const CERT_TXT = {
		certified: 'certified',
		expired: 'certificate expired',
		suspended: 'certificate suspended',
		pending: 'certificate pending'
	};
	function certLabel(a) {
		const c = a.cs;
		if (!c) return a.certs.length ? 'certificate not yet issued' : 'no certificate in registry';
		return CERT_TXT[c.s] || c.s;
	}
	function actsOf(g) {
		const seen = new Set(),
			out = [];
		for (const L of g.list)
			if (L.a.visible && !seen.has(L.a)) {
				seen.add(L.a);
				out.push(L.a);
			}
		return out;
	}
	function showTip() {
		if (!hov) {
			cb.onHover(null, mouse.x, mouse.y);
			return;
		}
		if (hov.cluster) {
			const m = hov.cluster;
			cb.onHover(
				{
					kind: 'cluster',
					count: m.length,
					places: [...new Set(m.map((a) => a.city || countryName(a.iso)))]
				},
				mouse.x,
				mouse.y
			);
		} else if (hov.list.length > 1) {
			cb.onHover({ kind: 'stack', count: hov.list.length }, mouse.x, mouse.y);
		} else {
			const a = hov.list[0];
			const line = `${KIND[a.kind]} · ${a.state === 'active' ? (a.est ? 'running, no carbon figure' : (a.cat === 'avoid' ? 'avoids ' : 'removes ') + fmt(a.rate) + ' t/yr now') : STATE_TXT[a.state]}`;
			cb.onHover(
				{ kind: 'one', name: a.name, place: placeOf(a), line, certificate: certLabel(a) },
				mouse.x,
				mouse.y
			);
		}
	}
	function hitAt(mx, my) {
		for (const m of markerDraw)
			if (Math.hypot(mx - m.x, my - m.y) <= m.r + 5)
				return m.members.length > 1 ? { cluster: m.members } : { list: [m.members[0]] };
		const wx = (mx - view.ox) / view.z + view.cx,
			wy = (my - view.oy) / view.z + view.cy;
		let best = null,
			ba = 1e18;
		for (const g of GL) {
			const L = g.lead;
			if (!L || L.a.al < 0.3 || L.sz < 5) continue;
			if (wx < L.bb[0] || wx > L.bb[2] || wy < L.bb[1] || wy > L.bb[3]) continue;
			if (inRings(wx, wy, L.rings)) {
				const ar = (L.bb[2] - L.bb[0]) * (L.bb[3] - L.bb[1]);
				if (ar < ba) {
					ba = ar;
					best = g;
				}
			}
		}
		return best ? { list: actsOf(best), g: best } : null;
	}
	function closeStack() {
		cb.onStack(null, 0, 0);
	}
	function openStack(list, x, y) {
		cb.onStack(
			list.map((a) => ({
				index: a.i,
				name: a.name,
				meta: `${KIND[a.kind]} · ${STATE_TXT[a.state] ?? 'not yet visible'}`
			})),
			x,
			y
		);
	}

	/* ---------- drawing ---------- */
	const countryCum = {};
	let boardClock = 0,
		last = performance.now(),
		frameNo = 0,
		tickNow = true;
	function drawLand() {
		const g = ctx.createLinearGradient(0, 0, 0, H);
		g.addColorStop(0, '#0a2833');
		g.addColorStop(1, '#071a22');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, H);
		if (view.z < z0 * 6) {
			ctx.strokeStyle = 'rgba(140,200,220,.06)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let lo = -30; lo <= 50; lo += 10) {
				const x = toX(wxo(lo));
				ctx.moveTo(x, 0);
				ctx.lineTo(x, H);
			}
			for (let la = 30; la <= 75; la += 5) {
				const y = toY(wyo(la));
				ctx.moveTo(0, y);
				ctx.lineTo(W, y);
			}
			ctx.stroke();
		}
		for (const c of land) {
			const v = c.iso ? 1 - Math.exp(-(countryCum[c.iso] || 0) / 30000) : 0;
			ctx.fillStyle = mix('#1c4642', '#3f8a4b', v);
			ctx.strokeStyle = mix('#2f6a60', '#7fcf6a', v * 0.7);
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (const r of c.p) {
				for (let i = 0; i < r.length; i++) {
					const x = toX(r[i][0]),
						y = toY(r[i][1]);
					i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
				}
				ctx.closePath();
			}
			ctx.fill();
			ctx.stroke();
		}
	}
	function pathOf(L) {
		ctx.beginPath();
		for (const r of L.rings) {
			for (let i = 0; i < r.length; i++) {
				const x = toX(r[i][0]),
					y = toY(r[i][1]);
				i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
			}
			ctx.closePath();
		}
	}
	function drawParcel(g) {
		const L = g.lead;
		if (!L) return;
		const a = L.a;
		const pa = smooth(5, 14, L.sz) * a.al;
		if (pa < 0.02) return;
		const x0 = toX(L.bb[0]),
			x1 = toX(L.bb[2]),
			y0 = toY(L.bb[1]),
			y1 = toY(L.bb[3]);
		if (x1 < -10 || x0 > W + 10 || y1 < -10 || y0 > H + 10) return;
		const planned = a.state === 'planned',
			done = a.state === 'done';
		ctx.globalAlpha = pa * (planned ? 0.4 : done ? 0.82 : 1);
		pathOf(L);
		ctx.fillStyle = planned ? 'rgba(140,196,232,.35)' : mix(GB[a.kind], GR[a.kind], a.f);
		ctx.fill('evenodd');
		if (!planned && SOILY.has(a.kind) && a.f > 0.02) {
			/* stored carbon, visible: a darker, richer core that deepens as the soil fills */
			ctx.save();
			pathOf(L);
			ctx.clip('evenodd');
			const cx = toX(L.c[0]),
				cy = toY(L.c[1]);
			ctx.translate(cx, cy);
			ctx.scale(0.78, 0.78);
			ctx.translate(-cx, -cy);
			pathOf(L);
			ctx.fillStyle = `rgba(28,18,12,${0.42 * a.f})`;
			ctx.fill('evenodd');
			ctx.restore();
		}
		if (a.pulse > 0.02) {
			pathOf(L);
			ctx.fillStyle = `rgba(190,255,140,${a.pulse * 0.22})`;
			ctx.fill('evenodd');
		}
		pathOf(L);
		const lw = clamp(L.sz / 60, 1, 2.2);
		if (planned) {
			ctx.setLineDash([6, 4]);
			ctx.strokeStyle = '#8cc4e8';
			ctx.lineWidth = lw;
		} else if (L.st === 'verified') {
			ctx.setLineDash([]);
			ctx.strokeStyle = 'rgba(168,240,95,.95)';
			ctx.lineWidth = lw + 0.3;
		} else if (L.st === 'failed') {
			ctx.setLineDash([5, 3]);
			ctx.strokeStyle = '#ff8f5e';
			ctx.lineWidth = lw + 0.3;
		} else if (L.st === 'none') {
			ctx.setLineDash([1.5, 3.5]);
			ctx.strokeStyle = 'rgba(255,255,255,.55)';
			ctx.lineWidth = lw;
			ctx.lineCap = 'round';
		} else {
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = 'rgba(255,255,255,.55)';
			ctx.lineWidth = lw;
		}
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.globalAlpha = 1;
	}
	function drawMark(x, y, r, col, kind) {
		ctx.fillStyle = col;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, 6.283);
		ctx.fill();
		ctx.strokeStyle = '#0a2833';
		ctx.lineWidth = Math.max(1.3, r * 0.28);
		ctx.lineCap = 'round';
		ctx.beginPath();
		if (kind === 'ok') {
			ctx.moveTo(x - r * 0.45, y);
			ctx.lineTo(x - r * 0.1, y + r * 0.4);
			ctx.lineTo(x + r * 0.5, y - r * 0.4);
		} else {
			ctx.moveTo(x - r * 0.38, y - r * 0.38);
			ctx.lineTo(x + r * 0.38, y + r * 0.38);
			ctx.moveTo(x + r * 0.38, y - r * 0.38);
			ctx.lineTo(x - r * 0.38, y + r * 0.38);
		}
		ctx.stroke();
	}
	function drawBadge(a, bx, by, r) {
		if (!(a.cs || a.certs.length)) return;
		const s = a.cs && a.cs.s;
		ctx.beginPath();
		ctx.arc(bx, by, r, 0, 6.283);
		if (a.cs && a.cs.valid) {
			ctx.fillStyle = '#a8f05f';
			ctx.fill();
			ctx.strokeStyle = '#0a2833';
			ctx.lineWidth = Math.max(1.3, r * 0.28);
			ctx.beginPath();
			ctx.moveTo(bx - r * 0.45, by);
			ctx.lineTo(bx - r * 0.1, by + r * 0.4);
			ctx.lineTo(bx + r * 0.5, by - r * 0.4);
			ctx.stroke();
		} else if (s === 'suspended') {
			ctx.fillStyle = '#ff8f5e';
			ctx.fill();
			ctx.fillStyle = '#0a2833';
			ctx.fillRect(bx - r * 0.1, by - r * 0.55, r * 0.2, r * 0.6);
			ctx.fillRect(bx - r * 0.1, by + r * 0.2, r * 0.2, r * 0.2);
		} else if (s === 'pending') {
			ctx.strokeStyle = '#ffc857';
			ctx.lineWidth = Math.max(1.4, r * 0.3);
			ctx.stroke();
		} else {
			ctx.strokeStyle = '#7a8d92';
			ctx.lineWidth = Math.max(1.2, r * 0.25);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(bx - r * 0.4, by - r * 0.4);
			ctx.lineTo(bx + r * 0.4, by + r * 0.4);
			ctx.moveTo(bx + r * 0.4, by - r * 0.4);
			ctx.lineTo(bx - r * 0.4, by + r * 0.4);
			ctx.stroke();
		}
	}
	function drawMarkers() {
		markerDraw = [];
		const cells = new Map();
		for (const a of A) {
			if (!a.visible || a.al < 0.03) continue;
			const ma = 1 - smooth(10, 26, a.sz);
			if (ma < 0.05) continue;
			const x = toX(a.cx),
				y = toY(a.cy);
			if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
			const k = Math.floor(x / 26) + ',' + Math.floor(y / 26);
			let c = cells.get(k);
			if (!c) {
				c = { m: [], sx: 0, sy: 0, al: 0 };
				cells.set(k, c);
			}
			c.m.push(a);
			c.sx += x;
			c.sy += y;
			c.al = Math.max(c.al, ma * a.al);
		}
		const T = tokens();
		cells.forEach((c) => {
			const n = c.m.length,
				x = c.sx / n,
				y = c.sy / n;
			ctx.globalAlpha = c.al;
			const rel = Math.min(
				1,
				Math.sqrt(c.m.reduce((s, a) => s + a.spawn, 0) / Math.max(1, view.maxSpawn || 1))
			);
			if (rel > 0) {
				const R = 14 + 10 * rel + Math.sqrt(n) * 4;
				ctx.globalAlpha = c.al * (0.25 + 0.5 * rel);
				ctx.drawImage(GLOW_OK, x - R, y - R, R * 2, R * 2);
				ctx.globalAlpha = c.al;
			}
			let r;
			if (n > 1) {
				r = 8 + Math.sqrt(n) * 2.4;
				ctx.fillStyle = 'rgba(10,40,48,.92)';
				ctx.beginPath();
				ctx.arc(x, y, r, 0, 6.283);
				ctx.fill();
				ctx.strokeStyle = '#a8f05f';
				ctx.lineWidth = 1.6;
				ctx.stroke();
				ctx.fillStyle = '#e9f3e4';
				ctx.font = `600 11px ${T.mono}`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(n, x, y + 0.5);
				ctx.textBaseline = 'alphabetic';
			} else {
				const a = c.m[0];
				r = 5;
				if (a.state === 'planned') {
					ctx.strokeStyle = '#8cc4e8';
					ctx.setLineDash([3, 2.5]);
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.arc(x, y, r, 0, 6.283);
					ctx.stroke();
					ctx.setLineDash([]);
				} else {
					ctx.fillStyle =
						a.state === 'done'
							? 'rgba(150,175,165,.85)'
							: a.cat === 'avoid'
								? mix(KC[a.kind], '#9aa7ad', 0.55)
								: KC[a.kind];
					ctx.beginPath();
					ctx.arc(x, y, r, 0, 6.283);
					ctx.fill();
					ctx.strokeStyle = 'rgba(6,20,26,.8)';
					ctx.lineWidth = 1.2;
					ctx.stroke();
					if (a.state === 'active') {
						ctx.strokeStyle = 'rgba(168,240,95,.95)';
						ctx.lineWidth = 2;
						ctx.beginPath();
						ctx.arc(x, y, r + 3.5, -Math.PI / 2, -Math.PI / 2 + 6.283 * a.f);
						ctx.stroke();
					}
					drawBadge(a, x + r + 3, y - r - 3, 3.6);
				}
			}
			ctx.globalAlpha = 1;
			markerDraw.push({ x, y, r, members: c.m });
		});
	}
	function drawLabel(a, text, x, y) {
		ctx.font = `600 12px ${tokens().body}`;
		ctx.textAlign = 'center';
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(6,20,26,.9)';
		ctx.fillStyle = '#e9f3e4';
		const nm = text.length > 34 ? text.slice(0, 33) + '…' : text;
		ctx.strokeText(nm, x, y);
		ctx.fillText(nm, x, y);
	}
	function drawOverlay(g) {
		const L = g.lead;
		if (!L) return;
		const a = L.a;
		if (a.al < 0.05 || L.sz < 5) return;
		const x0 = toX(L.bb[0]),
			x1 = toX(L.bb[2]),
			y0 = toY(L.bb[1]),
			y1 = toY(L.bb[3]);
		if (x1 < -10 || x0 > W + 10 || y1 < -10 || y0 > H + 10) return;
		if (L.sz >= 70 && (L.st === 'verified' || L.st === 'failed') && a.state !== 'planned') {
			const r = clamp(L.sz * 0.03, 5, 9);
			drawMark(
				toX(L.c[0]) + r * 1.4,
				toY(L.c[1]) + r * 1.4,
				r,
				L.st === 'verified' ? '#a8f05f' : '#ff8f5e',
				L.st === 'verified' ? 'ok' : 'x'
			);
		}
		if (L.sz >= 14) {
			const r = clamp(L.sz * 0.04, 5, 9);
			drawBadge(a, x0 + r * 0.3, y0 - r * 0.2, r);
		}
		const T = tokens();
		if (g.n > 1 && L.sz >= 10) {
			const tx = '×' + g.n;
			ctx.font = `600 11px ${T.mono}`;
			const w = ctx.measureText(tx).width + 10;
			const bx = x1 - w * 0.4,
				by = y0 - 7;
			ctx.fillStyle = 'rgba(10,40,48,.95)';
			ctx.strokeStyle = '#ffc857';
			ctx.lineWidth = 1.3;
			ctx.beginPath();
			ctx.roundRect(bx - w / 2, by - 8, w, 16, 8);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#ffc857';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(tx, bx, by + 0.5);
			ctx.textBaseline = 'alphabetic';
		}
		const isSel = sel && sel.inst.includes(L),
			isHov = hov && hov.g === g;
		if (L.sz >= 240 || isHov) {
			drawLabel(a, a.name, (x0 + x1) / 2, Math.max(16, y0 - 12));
			if (a.state === 'planned' && L.sz >= 120) {
				ctx.font = `11px ${T.body}`;
				ctx.fillStyle = '#8cc4e8';
				ctx.textAlign = 'center';
				ctx.fillText('planned, submitted ' + fmtDate(a.tp), (x0 + x1) / 2, Math.max(30, y0 + 2));
			}
		}
		if (isHov && !isSel) {
			pathOf(L);
			ctx.strokeStyle = 'rgba(255,255,255,.7)';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	}
	function drawSelection() {
		if (!sel || !sel.visible) return;
		for (const L of sel.inst) {
			if (L.sz < 5) continue;
			pathOf(L);
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 2.6;
			ctx.stroke();
		}
		if (sel.sz < 10) {
			const x = toX(sel.cx),
				y = toY(sel.cy);
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(x, y, 11, 0, 6.283);
			ctx.stroke();
		} else if (sel.sz >= 5 && sel.sz < 240)
			drawLabel(sel, sel.name, toX(sel.cx), toY(sel.bb[1]) - 14);
	}

	/* ---------- timeline ---------- */
	let tlCurve = null;
	function buildCurve() {
		const n = 320,
			pts = new Float32Array(n);
		let mx = 0;
		for (let i = 0; i < n; i++) {
			const t = T0 + ((T1 - T0) * i) / (n - 1);
			let s = 0;
			for (const a of A) {
				if (a.cat === 'avoid') continue;
				s += rateAt(a, t);
			}
			pts[i] = s;
			if (s > mx) mx = s;
		}
		tlCurve = { pts, mx };
		tlDirty = false;
	}
	function drawTimeline() {
		if (tlDirty || !tlCurve) buildCurve();
		const T = tokens();
		const w = tlc.width,
			h = tlc.height;
		tctx.setTransform(1, 0, 0, 1, 0, 0);
		tctx.clearRect(0, 0, w, h);
		tctx.scale(DPR, DPR);
		const cw = w / DPR,
			ch = h / DPR;
		tctx.fillStyle = T.track;
		tctx.fillRect(0, 0, cw, ch);
		const { pts, mx } = tlCurve,
			n = pts.length;
		const yOf = (i) => ch - 14 - (pts[i] / (mx || 1)) * (ch - 24);
		tctx.beginPath();
		tctx.moveTo(0, ch - 14);
		for (let i = 0; i < n; i++) tctx.lineTo((i / (n - 1)) * cw, yOf(i));
		tctx.lineTo(cw, ch - 14);
		tctx.closePath();
		tctx.globalAlpha = 0.3;
		tctx.fillStyle = T.curve;
		tctx.fill();
		tctx.globalAlpha = 1;
		tctx.strokeStyle = T.curve;
		tctx.lineWidth = 1.5;
		tctx.beginPath();
		for (let i = 0; i < n; i++) {
			const x = (i / (n - 1)) * cw;
			i ? tctx.lineTo(x, yOf(i)) : tctx.moveTo(x, yOf(i));
		}
		tctx.stroke();
		tctx.font = `10px ${T.mono}`;
		tctx.fillStyle = T.muted;
		tctx.textAlign = 'left';
		const y0 = new Date(T0).getUTCFullYear(),
			y1 = new Date(T1).getUTCFullYear(),
			step = Math.max(1, Math.ceil((y1 - y0) / Math.max(1, cw / 70)));
		for (let y = y0; y <= y1; y += step) {
			const x = ((Date.UTC(y, 0, 1) - T0) / (T1 - T0)) * cw;
			tctx.fillRect(x, ch - 14, 1, 4);
			tctx.fillText(String(y), x + 2, ch - 3);
		}
		tctx.fillStyle = T.plan;
		for (const a of A)
			if (a.tp != null) {
				const x = ((a.tp - T0) / (T1 - T0)) * cw;
				tctx.fillRect(x - 1, ch - 20, 2, 5);
			}
		tctx.fillStyle = T.cert;
		for (const a of A)
			for (const c of a.certs) {
				const x = ((c.i - T0) / (T1 - T0)) * cw;
				tctx.fillRect(x - 1, ch - 14, 2, 5);
			}
		const nx = ((simT - T0) / (T1 - T0)) * cw;
		tctx.fillStyle = T.ink;
		tctx.fillRect(nx - 1, 0, 2, ch - 14);
		tctx.beginPath();
		tctx.arc(nx, ch - 14, 4, 0, 6.283);
		tctx.fill();
	}
	let tlDrag = false;
	function tlSet(e) {
		const r = tlc.getBoundingClientRect();
		const x = clamp((e.clientX - r.left) / r.width, 0, 1);
		simT = T0 + x * (T1 - T0);
		lastEvT = simT;
		tickNow = true;
	}
	const tlDown = (e) => {
		tlc.setPointerCapture(e.pointerId);
		tlDrag = true;
		scrubbing = true;
		tlSet(e);
	};
	const tlMove = (e) => {
		if (tlDrag) tlSet(e);
	};
	const tlUp = () => {
		tlDrag = false;
		scrubbing = false;
	};
	const tlKey = (e) => {
		if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End')
			return;
		e.preventDefault();
		if (e.key === 'Home') simT = T0;
		else if (e.key === 'End') simT = T1;
		else simT = clamp(simT + (e.key === 'ArrowRight' ? 1 : -1) * 30.44 * DAY, T0, T1);
		lastEvT = simT;
		tickNow = true;
	};
	tlc.addEventListener('pointerdown', tlDown);
	tlc.addEventListener('pointermove', tlMove);
	tlc.addEventListener('pointerup', tlUp);
	tlc.addEventListener('keydown', tlKey);

	/* ---------- events ticker ---------- */
	const EV = [];
	A.forEach((a) => {
		if (a.tp != null && a.tp < a.t0)
			EV.push({ t: a.tp, k: 'plan', a, txt: `Plan submitted: ${a.name}` });
		EV.push({ t: a.t0, k: 'start', a, txt: `${a.name} begins` });
		EV.push({ t: a.t1, k: 'end', a, txt: `${a.name} reaches its end date` });
		a.certs.forEach((c) => {
			EV.push({ t: c.i, k: 'cert', a, txt: `Certificate issued (${c.s}): ${a.name}` });
			if (c.e) EV.push({ t: c.e, k: 'exp', a, txt: `Certificate expires: ${a.name}` });
		});
	});
	EV.sort((x, y) => x.t - y.t);
	let eventId = 0;
	function fireEvents(from, to) {
		if (to <= from || to - from > 2 * YR) return;
		let n = 0;
		for (const e of EV) {
			if (e.t > from && e.t <= to && (showAvoid || e.a.cat !== 'avoid')) {
				if (n++ < 3) cb.onEvent({ id: ++eventId, kind: e.k, date: fmtDate(e.t), text: e.txt });
				if (e.k === 'cert') fx.push({ kind: 'coin', a: e.a, t: 0 });
				if (e.k === 'start') fx.push({ kind: 'pop', a: e.a, t: 0, col: '#a8f05f' });
				if (e.k === 'plan') fx.push({ kind: 'pop', a: e.a, t: 0, col: '#8cc4e8' });
			}
		}
	}

	/* ---------- side panel ---------- */
	const cList = [...new Set(A.map((a) => a.iso))];
	function tick(tot) {
		const mx = Math.max(1, ...Object.values(countryCum));
		const countries = cList
			.map((iso) => ({
				iso,
				name: countryName(iso),
				value: Math.round(countryCum[iso] || 0),
				share: (countryCum[iso] || 0) / mx
			}))
			.sort((x, y) => y.value - x.value || x.name.localeCompare(y.name));
		const board = A.filter((a) => a.visible && a.rate > 0)
			.sort((x, y) => y.rate - x.rate)
			.slice(0, 8)
			.map((a) => ({
				index: a.i,
				name: a.name,
				rate: `${fmt(a.rate)} t/yr`,
				meta: `${KIND[a.kind]} · ${a.city || countryName(a.iso)} · ${a.cat === 'avoid' ? 'avoids' : 'removes'}`
			}));
		const sp = playing && !scrubbing;
		const M = mpp();
		cb.onTick({
			date: fmtDate(simT),
			progress: Math.round(((simT - T0) / (T1 - T0)) * 1000) / 10,
			playing,
			reverse: dir < 0,
			speedIndex: speedIdx,
			removed: Math.round(tot.rem),
			avoided: Math.round(tot.avoid),
			perDay: fmt(tot.rate / 365.25),
			countries,
			board,
			orbValue: sp ? `One orb is about ${fmtMass(AV)} CO₂e` : 'Paused',
			scale: `${view.z < z0 * 5 ? 'Europe' : M > 40 ? 'Region' : 'Field'} view · 100 px ≈ ${fmtLen(M * 100)}`,
			selected: sel
				? {
						state: sel.state === 'hidden' ? 'not yet visible on this date' : STATE_TXT[sel.state],
						stored: `${fmt(sel.cum)} t`
					}
				: null
		});
	}

	let dc1 = null,
		dc2 = null;
	function select(a, fl) {
		sel = a;
		if (!a) {
			cb.onSelect(null);
			return;
		}
		if (fl) flyBox(a.bb, 0.42);
		const pr = a.practices.join(', ');
		const pha = a.ha > 0 ? a.total / (a.dur / YR) / a.ha : 0;
		const pc = a.parcelChecks;
		const vtxt =
			[
				pc.verified && `${pc.verified} ${pc.verified === 1 ? 'parcel' : 'parcels'} verified`,
				pc.draft && `${pc.draft} being verified`,
				pc.failed && `${pc.failed} failed verification`
			]
				.filter(Boolean)
				.join(', ') || 'No parcel verification yet';
		const SOURCE = {
			plan: "Plan's expected total",
			certificate: 'Certified net benefit',
			verification: 'Verified net benefit',
			issued: 'Carbon credits issued'
		};
		const rows = [
			{ label: 'Type', value: KIND[a.kind], note: pr || undefined },
			{ label: 'Registry category', value: a.type || '—' },
			...(PUBLIC_VIEW
				? []
				: [
						{
							label: 'Plan submitted',
							value: a.tp != null ? fmtDate(a.tp) : 'No plan in the registry'
						}
					]),
			{ label: 'Runs', value: `${fmtDate(a.t0)} to ${fmtDate(a.t1 - DAY)}` },
			{
				label: 'Area',
				value: a.inst.some((L) => L.p.id.startsWith('activity:'))
					? `Activity area · ${fmt(a.ha)} ha`
					: `${a.inst.length} ${a.inst.length === 1 ? 'parcel' : 'parcels'} · ${fmt(a.ha)} ha`,
				note: vtxt
			},
			{
				label: a.source ? SOURCE[a.source] : 'Net benefit',
				value: a.est ? 'Not in the registry yet' : `${fmt(a.total)} t`
			}
		];
		if (a.soil != null) rows.push({ label: 'Expected soil emissions', value: `${fmt(a.soil)} t` });
		if (a.net != null) rows.push({ label: 'Expected net benefit', value: `${fmt(a.net)} t` });
		if (a.issued != null && a.source !== 'issued')
			rows.push({ label: 'Carbon credits issued', value: `${fmt(a.issued)} t` });
		if (!a.est)
			rows.push({
				label: 'Average speed',
				value: `${fmt(a.avg)} t/yr`,
				note:
					a.ha > 0
						? `${fmt(pha)} t/ha/yr${pha > 25 ? ', higher than land can store' : ''}`
						: undefined,
				warn: pha > 25
			});
		rows.push({ label: 'Growth curve', value: SHAPE[a.shape] });
		rows.push({
			label: 'Certificates',
			value: a.certs.length
				? a.certs
						.map((c) => `${c.s}, ${fmtDate(c.i)}${c.e ? ' to ' + fmtDate(c.e) : ''}`)
						.join('; ')
				: 'None in the registry'
		});
		cb.onSelect({
			index: a.i,
			name: a.name,
			place: placeOf(a),
			expectedLabel: a.cat === 'avoid' ? 'avoided' : 'removed',
			totalSource: a.source ? SOURCE[a.source] : null,
			rows
		});
		tickNow = true;
	}
	function drawDetail() {
		if (!sel || !dc1 || !dc2) return;
		const a = sel,
			T = tokens();
		let g = dc1.getContext('2d');
		const w = dc1.width,
			h = dc1.height;
		g.clearRect(0, 0, w, h);
		g.fillStyle = T.track;
		g.fillRect(0, 0, w, h);
		g.strokeStyle = T.muted;
		g.globalAlpha = 0.4;
		g.beginPath();
		g.moveTo(0, h - 14.5);
		g.lineTo(w, h - 14.5);
		g.stroke();
		g.globalAlpha = 1;
		g.beginPath();
		g.moveTo(0, h - 14);
		for (let i = 0; i <= 60; i++) {
			const x = i / 60;
			g.lineTo(x * w, h - 14 - Fx(a, x) * (h - 26));
		}
		g.lineTo(w, h - 14);
		g.closePath();
		g.globalAlpha = 0.3;
		g.fillStyle = T.curve;
		g.fill();
		g.globalAlpha = 1;
		g.strokeStyle = T.curve;
		g.lineWidth = 1.5;
		g.beginPath();
		for (let i = 0; i <= 60; i++) {
			const x = i / 60,
				y = h - 14 - Fx(a, x) * (h - 26);
			i ? g.lineTo(x * w, y) : g.moveTo(x * w, y);
		}
		g.stroke();
		const nx = clamp((simT - a.t0) / a.dur, 0, 1);
		g.fillStyle = T.ink;
		g.fillRect(nx * w - 1, 4, 2, h - 18);
		g.beginPath();
		g.arc(nx * w, h - 14 - Fx(a, nx) * (h - 26), 3.5, 0, 6.283);
		g.fill();
		g.fillStyle = T.muted;
		g.font = `9px ${T.mono}`;
		g.textAlign = 'left';
		g.fillText(a.start.slice(0, 4), 2, h - 3);
		g.textAlign = 'right';
		g.fillText(a.end.slice(0, 4), w - 2, h - 3);
		g.textAlign = 'left';
		g.fillText(a.est ? 'no carbon figure' : fmt(a.total) + ' t', 4, 11);
		g = dc2.getContext('2d');
		g.clearRect(0, 0, dc2.width, dc2.height);
		g.fillStyle = T.track;
		g.fillRect(0, 0, dc2.width, dc2.height);
		let mnx = 1e9,
			mxx = -1e9,
			mny = 1e9,
			mxy = -1e9;
		for (const rs of a.base)
			for (const r of rs)
				for (const [x, y] of r) {
					mnx = Math.min(mnx, x);
					mxx = Math.max(mxx, x);
					mny = Math.min(mny, y);
					mxy = Math.max(mxy, y);
				}
		const sc = Math.min((dc2.width - 16) / (mxx - mnx || 1), (dc2.height - 22) / (mxy - mny || 1));
		const ox = 8 + (dc2.width - 16 - (mxx - mnx) * sc) / 2,
			oy = 6 + (dc2.height - 22 - (mxy - mny) * sc) / 2;
		a.base.forEach((rs, j) => {
			const L = a.inst[j];
			g.beginPath();
			rs.forEach((r) => {
				r.forEach(([x, y], i) => {
					const px = ox + (x - mnx) * sc,
						py = oy + (y - mny) * sc;
					i ? g.lineTo(px, py) : g.moveTo(px, py);
				});
				g.closePath();
			});
			g.globalAlpha = 0.3;
			g.fillStyle = T.curve;
			g.fill('evenodd');
			g.globalAlpha = 1;
			g.strokeStyle = L.st === 'verified' ? T.curve : L.st === 'failed' ? T.negative : T.muted;
			g.lineWidth = 1.2;
			g.stroke();
		});
		g.fillStyle = T.muted;
		g.font = `9px ${T.mono}`;
		g.textAlign = 'left';
		g.fillText(
			a.inst.some((L) => L.p.id.startsWith('activity:')) ? 'activity area' : 'registry parcels',
			4,
			dc2.height - 3
		);
	}

	/* ---------- input ---------- */
	const ptrs = new Map();
	let drag = null,
		pinch = null;
	const onDown = (e) => {
		cv.setPointerCapture(e.pointerId);
		ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
		fly = null;
		closeStack();
		if (ptrs.size === 1)
			drag = { x: e.offsetX, y: e.offsetY, cx: view.cx, cy: view.cy, moved: false };
		if (ptrs.size === 2) {
			const [p, q] = [...ptrs.values()];
			pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), z: view.z };
			drag = null;
		}
	};
	const onMove = (e) => {
		mouse = { x: e.offsetX, y: e.offsetY, inside: true };
		if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
		if (pinch && ptrs.size === 2) {
			const [p, q] = [...ptrs.values()];
			view.z = clamp((pinch.z * Math.hypot(p.x - q.x, p.y - q.y)) / pinch.d, z0 * 0.6, ZMAX);
			return;
		}
		if (drag) {
			const dx = e.offsetX - drag.x,
				dy = e.offsetY - drag.y;
			if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
			if (drag.moved) {
				view.cx = drag.cx - dx / view.z;
				view.cy = drag.cy - dy / view.z;
				cv.classList.add('drag');
			}
		}
		if (!drag || !drag.moved) {
			hov = hitAt(e.offsetX, e.offsetY);
			cv.style.cursor = hov ? 'pointer' : '';
			showTip();
		}
	};
	const onUp = (e) => {
		if (drag && !drag.moved) {
			const r = hitAt(e.offsetX, e.offsetY);
			if (!r) select(null);
			else if (r.cluster) {
				const bb = [1e9, 1e9, -1e9, -1e9];
				r.cluster.forEach((a) => {
					bb[0] = Math.min(bb[0], a.bb[0]);
					bb[1] = Math.min(bb[1], a.bb[1]);
					bb[2] = Math.max(bb[2], a.bb[2]);
					bb[3] = Math.max(bb[3], a.bb[3]);
				});
				flyBox(bb, 0.4);
			} else if (r.list.length === 1) select(r.list[0], false);
			else openStack(r.list, e.offsetX, e.offsetY);
		}
		ptrs.delete(e.pointerId);
		if (ptrs.size < 2) pinch = null;
		drag = null;
		cv.classList.remove('drag');
	};
	const onLeave = () => {
		mouse.inside = false;
		hov = null;
		showTip();
	};
	const onEnter = () => {
		mouse.inside = true;
	};
	const onWheel = (e) => {
		e.preventDefault();
		fly = null;
		closeStack();
		const k = Math.exp(-clamp(e.deltaY, -150, 150) * (e.ctrlKey ? 0.012 : 0.0036)),
			nz = clamp(view.z * k, z0 * 0.6, ZMAX);
		const wx = (e.offsetX - view.ox) / view.z + view.cx,
			wy = (e.offsetY - view.oy) / view.z + view.cy;
		view.z = nz;
		view.cx = wx - (e.offsetX - view.ox) / nz;
		view.cy = wy - (e.offsetY - view.oy) / nz;
	};
	const onDbl = (e) => {
		const r = hitAt(e.offsetX, e.offsetY);
		if (r && r.list && r.list.length === 1) {
			select(r.list[0], true);
			return;
		}
		const wx = (e.offsetX - view.ox) / view.z + view.cx,
			wy = (e.offsetY - view.oy) / view.z + view.cy;
		fly = { cx: wx, cy: wy, z: clamp(view.z * 3, z0, ZMAX) };
	};
	cv.addEventListener('pointerdown', onDown);
	cv.addEventListener('pointermove', onMove);
	cv.addEventListener('pointerup', onUp);
	cv.addEventListener('pointerleave', onLeave);
	cv.addEventListener('pointerenter', onEnter);
	cv.addEventListener('wheel', onWheel, { passive: false });
	cv.addEventListener('dblclick', onDbl);

	/* ---------- loop ---------- */
	let raf = 0;
	function frame(now) {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		TT += dt;
		const sp = SPEED_MS[speedIdx] * (playing && !scrubbing ? 1 : 0);
		if (playing && !scrubbing) {
			simT += dir * SPEED_MS[speedIdx] * dt * 1000;
			if (simT >= T1) {
				simT = T1;
				playing = false;
				tickNow = true;
			}
			if (simT <= T0) {
				simT = T0;
				playing = false;
				tickNow = true;
			}
		}
		if (dir > 0 && playing) fireEvents(lastEvT, simT);
		lastEvT = simT;
		if (fly) {
			const k = 1 - Math.exp(-dt * 4.5),
				lz = Math.log(view.z),
				tz = Math.log(fly.z);
			view.z = Math.exp(lz + (tz - lz) * k);
			view.cx += (fly.cx - view.cx) * k;
			view.cy += (fly.cy - view.cy) * k;
			if (
				Math.abs(tz - Math.log(view.z)) < 0.01 &&
				Math.abs(fly.cx - view.cx) * view.z < 1 &&
				Math.abs(fly.cy - view.cy) * view.z < 1
			)
				fly = null;
		}
		/* screen metrics */
		for (const L of INST) L.sz = Math.max(L.bb[2] - L.bb[0], L.bb[3] - L.bb[1]) * view.z;
		for (const a of A) {
			a.sz = Math.max(a.bb[2] - a.bb[0], a.bb[3] - a.bb[1]) * view.z;
			const x0 = toX(a.bb[0]),
				x1 = toX(a.bb[2]),
				y0 = toY(a.bb[1]),
				y1 = toY(a.bb[3]);
			a.onscreen = x1 > -20 && x0 < W + 20 && y1 > -20 && y0 < H + 20;
		}
		const maxSpawn = updateStates(simT);
		view.maxSpawn = maxSpawn;
		const ea = Math.min(1, dt * 6);
		for (const a of A) a.al += ((a.visible ? 1 : 0) - a.al) * ea;
		/* orb value: scaled so the busiest parcel in view gets about 5 orbs per second */
		const maxTps = (maxSpawn * sp) / (YR / 1000);
		if (sp > 0) AV = Math.max(maxTps / 5, 1e-9);
		const tot = { rem: 0, avoid: 0, rate: 0 };
		for (const k in countryCum) countryCum[k] = 0;
		for (const a of A) {
			if (!a.visible) continue;
			if (a.cat === 'avoid') tot.avoid += a.cum;
			else {
				tot.rem += a.cum;
				tot.rate += a.rate;
				countryCum[a.iso] = (countryCum[a.iso] || 0) + a.cum;
			}
			a.pulse = Math.max(0, a.pulse - dt * 2.2);
		}
		if (sp > 0) {
			for (const a of A) {
				if (!a.visible || a.spawn <= 0 || a.state !== 'active' || !a.onscreen) continue;
				a.acc += ((a.spawn * sp) / (YR / 1000) / AV) * dt;
				let n = 0;
				while (a.acc >= 1 && n < 4) {
					a.acc -= 1;
					n++;
					spawnAtom(a, dir < 0);
				}
				if (a.acc > 8) a.acc = 0;
			}
		}
		if (W > 0 && H > 0) {
			/* everything is drawn in CSS pixels on a device-pixel backing store */
			ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
			drawLand();
			for (const g of GL) drawParcel(g);
			for (const g of GL) {
				const L = g.lead;
				if (L && L.sz >= 100 && L.a.al > 0.3 && L.a.state !== 'planned') {
					const x0 = toX(L.bb[0]),
						x1 = toX(L.bb[2]),
						y0 = toY(L.bb[1]),
						y1 = toY(L.bb[3]);
					if (x1 > -40 && x0 < W + 40 && y1 > -80 && y0 < H + 80) {
						ctx.globalAlpha = smooth(100, 160, L.sz) * L.a.al;
						drawSprites(L, L.a);
						ctx.globalAlpha = 1;
					}
				}
			}
			drawMarkers();
			drawSelection();
			for (const g of GL) drawOverlay(g);
			drawParticles(dt);
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			drawTimeline();
			drawDetail();
		}
		if (mouse.inside && !(drag && drag.moved) && frameNo++ % 6 === 0) {
			hov = hitAt(mouse.x, mouse.y);
			cv.style.cursor = hov ? 'pointer' : '';
			showTip();
		}
		boardClock += dt;
		if (boardClock > 0.25 || tickNow) {
			boardClock = 0;
			tickNow = false;
			tick(tot);
		}
		raf = requestAnimationFrame(frame);
	}
	const ro = new ResizeObserver(() => layout());
	ro.observe(cv);
	ro.observe(tlc);
	layout();
	raf = requestAnimationFrame((t) => {
		last = t;
		raf = requestAnimationFrame(frame);
	});

	return {
		togglePlay() {
			playing = !playing;
			tickNow = true;
		},
		reverse() {
			dir *= -1;
			tickNow = true;
		},
		setSpeed(index) {
			speedIdx = clamp(index, 0, SPEED_MS.length - 1);
			playing = true;
			tickNow = true;
		},
		today() {
			simT = clamp(Date.now(), T0, T1);
			lastEvT = simT;
			tickNow = true;
		},
		fit: fitView,
		setShowAvoided(show) {
			showAvoid = show;
			tlDirty = true;
			tickNow = true;
		},
		setPanelInset(px) {
			panelInset = px;
			layout();
		},
		select(index, flyTo) {
			select(index == null ? null : A[index], flyTo);
		},
		setDetailCanvases(curve, shape) {
			dc1 = curve;
			dc2 = shape;
		},
		destroy() {
			cancelAnimationFrame(raf);
			ro.disconnect();
			removeEventListener('keydown', onKey);
			cv.removeEventListener('pointerdown', onDown);
			cv.removeEventListener('pointermove', onMove);
			cv.removeEventListener('pointerup', onUp);
			cv.removeEventListener('pointerleave', onLeave);
			cv.removeEventListener('pointerenter', onEnter);
			cv.removeEventListener('wheel', onWheel);
			cv.removeEventListener('dblclick', onDbl);
			tlc.removeEventListener('pointerdown', tlDown);
			tlc.removeEventListener('pointermove', tlMove);
			tlc.removeEventListener('pointerup', tlUp);
			tlc.removeEventListener('keydown', tlKey);
		}
	};
}
