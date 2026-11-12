import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The contract between OGCR-App and OBP-API.
//
// obp-api-contract/contract.json lists every OBP-API call the app makes, with the response
// fields the code reads. obp-api-contract/snapshot.json is what an OBP-API documents for those
// calls, written by obp-api-contract/snapshot.py from its resource docs. These tests need no
// server: they check that the list matches the code, and that every call reaches an endpoint
// OBP-API documents, with every field the code reads. Retake the snapshot from a new OBP-API
// build to learn whether that build breaks the app.

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const CONTRACT_DIR = join(REPO_ROOT, 'obp-api-contract');
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'build', 'dist']);
const EXTENSIONS = ['.ts', '.js', '.svelte'];
/** A string that names an OBP-API path: a version, a computed version, or a dynamic route. */
const OBP_PATH = /\/obp\/(v\d|\$\{|dynamic-entity|dynamic-endpoint)/;

interface Call {
	verb: string;
	path: string;
	source: string;
	needles: string[];
	reads: string[];
	note?: string;
	undocumented_fields?: string[];
	undocumented_endpoint?: string;
}

interface PathBuilder {
	names: string[];
	source: string;
	needles: string[];
}

interface Contract {
	calls: Call[];
	unversioned_calls: Call[];
	path_builders: PathBuilder[];
}

interface Endpoint {
	verb: string;
	path: string;
	operation_id?: string;
	fields?: string[];
	missing?: boolean;
	ambiguous?: string[];
}

function load<T>(name: string): T {
	return JSON.parse(readFileSync(join(CONTRACT_DIR, name), 'utf8')) as T;
}

const contract = load<Contract>('contract.json');
const snapshot = load<{ endpoints: Endpoint[] }>('snapshot.json');
const allCalls = [...contract.calls, ...contract.unversioned_calls];

const key = (c: { verb: string; path: string }) => `${c.verb} ${c.path}`;

/** The reads of a call that `fields` does not document. A read written `a|b` is satisfied by either field. */
function undocumentedReads(reads: string[], fields: Set<string>): string[] {
	return reads.filter((read) => !read.split('|').some((field) => fields.has(field)));
}

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
		else if (EXTENSIONS.some((ext) => name.endsWith(ext)) && !/\.(test|spec)\.[a-z]+$/.test(name))
			out.push(path);
	}
	return out;
}

/** Blanks out import statements, keeping the line numbers: an import makes no call. */
function withoutImports(text: string): string {
	return text.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?/gm, (m) =>
		m.replace(/[^\n]/g, '')
	);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BUILDER_USE = new RegExp(
	`(?<![\\w$])(${contract.path_builders
		.flatMap((b) => b.names)
		.map(escape)
		.join('|')})\\s*[(.]`
);

/**
 * Lines of app source that build an OBP-API path or use a path builder, skipping comments
 * and tests: [file relative to the repo, line number, line].
 */
function obpPathLines(): [string, number, string][] {
	const out: [string, number, string][] = [];
	for (const file of sourceFiles(join(REPO_ROOT, 'src'))) {
		const rel = relative(REPO_ROOT, file).split('\\').join('/');
		withoutImports(readFileSync(file, 'utf8'))
			.split('\n')
			.forEach((line, i) => {
				if (/^\s*(\/\/|\/?\*)/.test(line)) return;
				if (OBP_PATH.test(line) || BUILDER_USE.test(line)) out.push([rel, i + 1, line]);
			});
	}
	return out;
}

describe('OBP-API contract', () => {
	it('lists each call with a verb, a path, a source and needles', () => {
		for (const call of allCalls) {
			expect(['GET', 'POST', 'PUT', 'DELETE'], key(call)).toContain(call.verb);
			expect(call.needles.length, key(call)).toBeGreaterThan(0);
			expect(Array.isArray(call.reads), key(call)).toBe(true);
		}
		// Versioned calls go to snapshot.py; the others are recorded gaps it cannot read docs for.
		for (const call of contract.calls)
			expect(call.path, key(call)).toMatch(/^\/obp\/v\d+\.\d+\.\d+\//);
		for (const call of contract.unversioned_calls) {
			expect(call.path, key(call)).not.toMatch(/^\/obp\/v\d/);
			expect(call.undocumented_endpoint, key(call)).toBeTruthy();
		}
	});

	it('finds every call in its source file', () => {
		// Each listed call still exists: every needle of an entry occurs in the entry's source file.
		const gone: string[] = [];
		for (const entry of [...allCalls, ...contract.path_builders]) {
			const text = readFileSync(join(REPO_ROOT, entry.source), 'utf8');
			for (const needle of entry.needles) {
				if (!text.includes(needle)) gone.push(`${entry.source} — ${needle}`);
			}
		}
		expect(gone).toEqual([]);
	});

	it('lists every OBP-API call in the source', () => {
		// Coverage: a line that builds an OBP-API path, or uses a path builder, must contain a needle
		// of a call (or path builder) listed for that file, so no new call reaches OBP-API unrecorded.
		const lines = obpPathLines();
		expect(lines.length).toBeGreaterThan(50);
		const unlisted = lines
			.filter(
				([file, , line]) =>
					![...allCalls, ...contract.path_builders].some(
						(entry) => entry.source === file && entry.needles.some((n) => line.includes(n.trim()))
					)
			)
			.map(([file, n, line]) => `${file}:${n} ${line.trim()}`);
		expect(unlisted).toEqual([]);
	});

	it('has a snapshot taken for this contract', () => {
		// snapshot.json holds exactly the calls of contract.json; otherwise rerun snapshot.py.
		const listed = new Set(contract.calls.map(key));
		const snapped = new Set(snapshot.endpoints.map(key));
		expect([...snapped].sort()).toEqual([...listed].sort());
	});

	it('reaches an endpoint OBP-API documents for every call', () => {
		// Each call's version and path name a documented endpoint, unless the entry records why not
		// (undocumented_endpoint). A recorded gap that OBP-API has since documented fails too.
		const problems: string[] = [];
		for (const call of contract.calls) {
			const entry = snapshot.endpoints.find((e) => key(e) === key(call));
			const missing = entry ? entry.missing === true : true;
			if (missing && !call.undocumented_endpoint)
				problems.push(`${key(call)}: no documented endpoint`);
			if (!missing && call.undocumented_endpoint)
				problems.push(
					`${key(call)}: now documented as ${entry?.operation_id}; drop undocumented_endpoint`
				);
			if (entry?.ambiguous)
				problems.push(`${key(call)}: matches several endpoints ${entry.ambiguous}`);
		}
		expect(problems).toEqual([]);
	});

	it('reads only fields OBP-API documents', () => {
		// Each field the code reads is in the documented response of its endpoint, unless the entry
		// lists it in undocumented_fields; a listed field that OBP-API now documents fails, so the list shrinks.
		const problems: string[] = [];
		for (const call of contract.calls) {
			const entry = snapshot.endpoints.find((e) => key(e) === key(call));
			if (!entry || entry.missing) continue;
			const fields = new Set(entry.fields ?? []);
			const known = new Set(call.undocumented_fields ?? []);
			for (const read of undocumentedReads(call.reads, fields)) {
				if (!known.has(read))
					problems.push(`${key(call)} (${entry.operation_id}): reads ${read}, not documented`);
			}
			for (const field of known) {
				if (fields.has(field))
					problems.push(
						`${key(call)}: ${field} is now documented; drop it from undocumented_fields`
					);
			}
		}
		expect(problems).toEqual([]);
	});

	it('reports a renamed or removed field', () => {
		// The check itself: with `offer_id` gone from the documented fields the read is reported, and
		// a read with an alternative (`banks[].bank_id|banks[].id`) passes on either field.
		expect(undocumentedReads(['offer_id'], new Set(['status', 'offer_details']))).toEqual([
			'offer_id'
		]);
		const either = ['banks[].bank_id|banks[].id'];
		expect(undocumentedReads(either, new Set(['banks[].id']))).toEqual([]);
		expect(undocumentedReads(either, new Set(['banks[].bank_id']))).toEqual([]);
		expect(undocumentedReads(either, new Set())).toEqual(either);
	});

	it('recognises the lines that build an OBP-API path', () => {
		// The coverage scan itself: paths and builder calls are found, other app links are not.
		const builds = (line: string) => OBP_PATH.test(line) || BUILDER_USE.test(line);
		expect(builds("obp_requests.get('/obp/v7.0.0/my/accounts', accessToken)")).toBe(true);
		expect(builds('`${base}/obp/${version}/banks`')).toBe(true);
		expect(builds('`/obp/dynamic-entity${space}/${entity}`')).toBe(true);
		expect(builds('obp_requests.get(entityPathV7(ENTITY_ACTIVITY), accessToken)')).toBe(true);
		expect(builds('obp_requests.get(tradingPaths.offers(ctx), accessToken)')).toBe(true);
		expect(builds('<a href="/my/operators">')).toBe(false);
		expect(builds('const unwrapped = unwrapV7List(response, ENTITY_ACTIVITY);')).toBe(false);
		expect(withoutImports("import { entityPath } from '$lib/constants/entities';\nx")).toBe('\nx');
	});
});
