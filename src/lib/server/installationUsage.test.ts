import { afterEach, describe, expect, it, vi } from 'vitest';

// A stand-in for SvelteKit's private env, so each test can set INSTALLATION_USAGE.
const fakeEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: fakeEnv }));

const { installationUsage, DEFAULT_INSTALLATION_USAGE } = await import('./installationUsage');

describe('installationUsage', () => {
	afterEach(() => {
		delete fakeEnv.INSTALLATION_USAGE;
	});

	it('shows the synthetic data notice when the variable is not set', () => {
		expect(installationUsage()).toBe(DEFAULT_INSTALLATION_USAGE);
	});

	it('shows the text the variable is set to', () => {
		fakeEnv.INSTALLATION_USAGE = '  Training installation: records are reset every night  ';
		expect(installationUsage()).toBe('Training installation: records are reset every night');
	});

	it('shows nothing when the variable is set to the empty string', () => {
		fakeEnv.INSTALLATION_USAGE = '';
		expect(installationUsage()).toBeNull();
	});
});
