import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every OBP-API call the app makes uses v5.1.0 or newer, so a deployment can switch off
// the older API versions. Calls that have no equivalent in v5.1.0 are listed below with
// the reason; anything else below v5.1.0 fails this test.

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const SOURCE_ROOTS = ['src', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit', 'build', 'dist', 'test-results', 'docs']);
const EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs', '.svelte'];
/** obp/vX.Y.Z in a path, with or without a leading slash, followed by anything but more of the version. */
const OLD_VERSION = /obp\/(v(?:[1-4])\.\d+\.\d+|v5\.0\.0)(?![\d.])/g;
/** A string literal that is only a version, as in `const API_VERSION = 'v4.0.0'`, used to build paths. */
const OLD_VERSION_LITERAL = /['"`](v(?:[1-4])\.\d+\.\d+|v5\.0\.0)['"`]/g;

/**
 * file (repo-relative) + path fragment -> why it is still below v5.1.0. Empty: every OBP-API
 * call of the app has a v5.1.0 or newer equivalent, so the test allows no exception.
 */
const NO_V510_EQUIVALENT: Record<string, string> = {};

/** Source files, without tests: their examples name old versions on purpose. */
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

function oldVersionsIn(line: string): string[] {
	// A version-only literal in a comment documents something; it builds no path.
	const comment = /^\s*(\/\/|\/?\*)/.test(line);
	const literals = comment ? [] : [...line.matchAll(OLD_VERSION_LITERAL)];
	return [...line.matchAll(OLD_VERSION), ...literals].map((match) => match[0]);
}

function callsBelowV510(): string[] {
	const found: string[] = [];
	for (const root of SOURCE_ROOTS) {
		for (const file of sourceFiles(join(REPO_ROOT, root))) {
			const rel = relative(REPO_ROOT, file).split('\\').join('/');
			readFileSync(file, 'utf8')
				.split('\n')
				.forEach((line, i) => {
					for (const version of oldVersionsIn(line)) {
						const allowed = Object.keys(NO_V510_EQUIVALENT).some((key) => {
							const [keyFile, fragment] = key.split('|');
							return keyFile === rel && line.includes(fragment);
						});
						if (!allowed) found.push(`${rel}:${i + 1} ${version}`);
					}
				});
		}
	}
	return found;
}

describe('OBP-API version used by the app', () => {
	it('finds the app sources', () => {
		// An empty result below must mean "no old version", not "no files read".
		expect(sourceFiles(join(REPO_ROOT, 'src')).length).toBeGreaterThan(100);
	});

	it('calls OBP-API on v5.1.0 or newer', () => {
		expect(callsBelowV510()).toEqual([]);
	});

	it('recognises the ways a path below v5.1.0 can be written', () => {
		const flagged = (line: string) => oldVersionsIn(line).length > 0;
		expect(flagged('`/obp/v4.0.0/x`')).toBe(true);
		expect(flagged("'/obp/v4.0.0' + path")).toBe(true);
		expect(flagged('api POST obp/v5.0.0/banks')).toBe(true);
		expect(flagged('`${base}obp/v3.1.0/banks`')).toBe(true);
		expect(flagged("const API_VERSION = 'v4.0.0';")).toBe(true);
		expect(flagged('`/obp/v5.1.0/x`')).toBe(false);
		expect(flagged('`/obp/v6.0.0/root` and `/obp/v7.0.0/my/accounts`')).toBe(false);
		expect(flagged('`/obp/dynamic-entity/x`')).toBe(false);
		expect(flagged("const API_VERSION = 'v6.0.0';")).toBe(false);
		expect(flagged("operation_id: 'OBPv4.0.0-getBanks'")).toBe(false);
		expect(flagged("// e.g. 'v4.0.0' in a comment")).toBe(false);
	});

	it('keeps the list of calls without a v5.1.0 equivalent current', () => {
		// A call that moved to v5.1.0 or newer must also leave the list.
		for (const key of Object.keys(NO_V510_EQUIVALENT)) {
			const [file, fragment] = key.split('|');
			expect(readFileSync(join(REPO_ROOT, file), 'utf8'), key).toContain(fragment);
		}
	});
});
