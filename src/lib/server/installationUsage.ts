import { env } from '$env/dynamic/private';

/** Shown when INSTALLATION_USAGE is not set, so a public visitor knows the records are not real. */
export const DEFAULT_INSTALLATION_USAGE = 'This instance shows synthetic test data';

/**
 * The notice shown in the top bar, next to the Login button, telling visitors what this installation is used for. Set INSTALLATION_USAGE to change it, or to the empty string to show nothing (for an installation with real data).
 */
export function installationUsage(): string | null {
	// Unset: the default notice. Set: that text, with surrounding spaces removed.
	const usage = (env.INSTALLATION_USAGE ?? DEFAULT_INSTALLATION_USAGE).trim();
	// Empty means no notice.
	return usage === '' ? null : usage;
}
