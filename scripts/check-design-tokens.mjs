#!/usr/bin/env node
/**
 * Check our mirrored OGCR Design System tokens against the published package.
 *
 * This app cannot import the design system's components (it is React, we are
 * Svelte), so src/ogcr-design-system-reference.css mirrors its token VALUES by
 * hand. A hand copy rots silently — this script is what makes it checkable.
 * Background: ../design_system_integration.md
 *
 * Source of truth is the published npm tarball, not a local clone: it needs no
 * checkout, no machine-specific path, and it is the artifact we would actually
 * consume if we ever adopt the stylesheet directly. dist/styles.css carries all
 * 62 `--ds-*` color tokens; dist/theme.css carries the spacing/radius/type scales.
 *
 *   node scripts/check-design-tokens.mjs            # check the pinned version
 *   node scripts/check-design-tokens.mjs --latest   # check against latest instead
 *
 * Exit codes: 0 in sync · 1 drift found · 2 could not check (network/tooling).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = '@majistudio/ogcr-design-system';

/** The version this app's mirror is reconciled against. Bump it (and the mirror,
 *  and the doc's provenance block) together, never separately. */
const PINNED_VERSION = '1.1.0';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIRROR = join(ROOT, 'src/ogcr-design-system-reference.css');

/** Our token name -> upstream token name, for the scales that were renamed when
 *  the design system moved to Tailwind's numeric-px namespaces. Colors need no
 *  map: upstream `--ds-<name>` is our bare `--<name>`. */
const SPACING_MAP = {
	'space-none': 'spacing-0',
	'space-2xs': 'spacing-4',
	'space-xs': 'spacing-8',
	'space-s': 'spacing-12',
	'space-m': 'spacing-16',
	'space-l': 'spacing-24',
	'space-xl': 'spacing-32',
	'space-3xl': 'spacing-64'
};
const RADIUS_MAP = {
	'radius-none': 'radius-0',
	'radius-xs': 'radius-2',
	'radius-s': 'radius-4',
	'radius-m': 'radius-8',
	'radius-l': 'radius-12',
	'radius-xl': 'radius-16',
	'radius-full': 'radius-full'
};
const TYPE_MAP = Object.fromEntries(
	['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl'].map((k) => [`font-size-${k}`, `text-${k}`])
);
const MISC_MAP = {
	'elevation-l': 'shadow-elevation-l',
	'motion-fast': 'motion-fast',
	'motion-base': 'motion-base',
	'font-family-default': 'font-standard',
	'font-family-display': 'font-display',
	'font-family-mono': 'font-mono'
};

/** Declared in our mirror but deliberately absent upstream — never reported as
 *  drift. Each needs a reason, and the mirror must say the same thing. */
const EXPECTED_EXTRAS = {
	'focus-ring-error': 'removed upstream in 1.1.0; kept until app code stops reading it'
};

function norm(value) {
	let v = value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ', ').replace(/;$/, '');
	// The shipped sheet is minified: #ffffff becomes #fff.
	v = v.replace(/#([0-9a-f])\1?([0-9a-f])\2?([0-9a-f])\3?\b/g, (m, r, g, b) =>
		m.length === 4 ? `#${r}${r}${g}${g}${b}${b}` : m
	);
	// Upstream references live under the --ds-* namespace; ours are bare.
	v = v.replace(/var\(--ds-/g, 'var(--');
	// Unitless zero and 0px are the same length.
	if (v === '0') v = '0px';
	return v;
}

/** rem values are authored upstream, px in our mirror. Compare in px. */
function toPx(value) {
	const m = /^(-?[\d.]+)rem$/.exec(value.trim());
	return m ? `${Math.round(parseFloat(m[1]) * 16)}px` : value;
}

function parseVars(css, prefix = '') {
	const out = new Map();
	const re = new RegExp(`--${prefix}([a-z0-9-]+)\\s*:\\s*([^;}]+)[;}]`, 'gi');
	for (const m of css.matchAll(re)) out.set(m[1].toLowerCase(), norm(m[2]));
	return out;
}

function fetchPublished(version) {
	const dir = mkdtempSync(join(tmpdir(), 'ogcr-ds-'));
	try {
		const spec = `${PACKAGE}@${version}`;
		const tgz = execFileSync('npm', ['pack', spec, '--pack-destination', dir, '--silent'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		})
			.trim()
			.split('\n')
			.pop();
		execFileSync('tar', ['xzf', join(dir, tgz), '-C', dir]);
		const read = (f) => readFileSync(join(dir, 'package/dist', f), 'utf8');
		return { styles: read('styles.css'), theme: read('theme.css') };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function latestVersion() {
	try {
		return execFileSync('npm', ['view', PACKAGE, 'version'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return null;
	}
}

// --- run -------------------------------------------------------------------

const useLatest = process.argv.includes('--latest');
const latest = latestVersion();
const version = useLatest ? (latest ?? PINNED_VERSION) : PINNED_VERSION;

let published;
try {
	published = fetchPublished(version);
} catch (error) {
	console.error(`Could not fetch ${PACKAGE}@${version}: ${error.message.split('\n')[0]}`);
	console.error('Offline? This check needs the npm registry.');
	process.exit(2);
}

const mirror = parseVars(readFileSync(MIRROR, 'utf8'));
const upstreamColors = parseVars(published.styles, 'ds-');
const upstreamTheme = parseVars(published.theme);

const drift = [];
const missing = [];

// Colors: upstream is authoritative for the whole set.
for (const [name, value] of upstreamColors) {
	if (!mirror.has(name)) missing.push([name, value]);
	else if (mirror.get(name) !== value) drift.push([name, mirror.get(name), value, 'color']);
}

// Renamed scales: compare our value against the upstream token it maps to.
for (const [maps, kind] of [
	[SPACING_MAP, 'spacing'],
	[RADIUS_MAP, 'radius'],
	[TYPE_MAP, 'type'],
	[MISC_MAP, 'misc']
]) {
	for (const [ours, theirs] of Object.entries(maps)) {
		if (!mirror.has(ours)) {
			missing.push([ours, `(maps to --${theirs})`]);
			continue;
		}
		const up = upstreamTheme.get(theirs);
		if (up === undefined) {
			drift.push([ours, mirror.get(ours), `--${theirs} no longer exists upstream`, kind]);
		} else if (toPx(mirror.get(ours)) !== toPx(up)) {
			drift.push([ours, mirror.get(ours), `${up} (--${theirs})`, kind]);
		}
	}
}

// Anything we declare that upstream does not, beyond the documented exceptions.
const known = new Set([
	...upstreamColors.keys(),
	...Object.keys(SPACING_MAP),
	...Object.keys(RADIUS_MAP),
	...Object.keys(TYPE_MAP),
	...Object.keys(MISC_MAP)
]);
const extras = [...mirror.keys()].filter((k) => !known.has(k) && !(k in EXPECTED_EXTRAS));

console.log(`${PACKAGE}@${version} vs src/ogcr-design-system-reference.css`);
console.log(
	`  ${upstreamColors.size} color tokens · ${Object.keys({ ...SPACING_MAP, ...RADIUS_MAP, ...TYPE_MAP, ...MISC_MAP }).length} mapped scale tokens\n`
);

for (const [name, ours, theirs, kind] of drift)
	console.log(`  DRIFTED  --${name} (${kind}): ours=${ours}  upstream=${theirs}`);
for (const [name, value] of missing) console.log(`  MISSING  --${name}: ${value}`);
for (const name of extras) console.log(`  EXTRA    --${name}: not in upstream, and not a documented exception`);

if (latest && latest !== PINNED_VERSION && !useLatest)
	console.log(`\n  NOTE: ${PACKAGE}@${latest} is published; we are pinned to ${PINNED_VERSION}.`);

const problems = drift.length + missing.length + extras.length;
if (problems === 0) {
	console.log('  In sync.');
	process.exit(0);
}
console.log(`\n${problems} difference(s). Update the mirror, ogcr-theme.css's named token`);
console.log("block, the /design gallery, and design_system_integration.md's provenance together.");
process.exit(1);
