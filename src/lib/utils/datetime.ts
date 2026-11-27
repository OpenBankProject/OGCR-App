/**
 * Timestamp formatting for values that are rendered on the server and then
 * hydrated in the browser.
 *
 * The two run in different time zones and locales, so formatting a date the
 * obvious way produces a hydration mismatch: the server renders its own local
 * time, the browser replaces it with a different string. Rendering UTC with a
 * fixed locale is deterministic, so it is what both sides emit first; the
 * browser then upgrades it to the reader's own time once mounted.
 */

/** Locale pinned so server and client agree on the pre-hydration string. */
const STABLE_LOCALE = 'en-GB';

const OPTIONS: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit'
};

function parse(iso: string | null | undefined): Date | null {
	if (!iso) return null;
	const ms = Date.parse(iso);
	return Number.isNaN(ms) ? null : new Date(ms);
}

/** Deterministic UTC rendering, safe to emit from the server. */
export function formatUtc(iso: string | null | undefined): string | null {
	const date = parse(iso);
	if (!date) return null;
	return `${date.toLocaleString(STABLE_LOCALE, { ...OPTIONS, timeZone: 'UTC' })} UTC`;
}

/** The reader's own time zone and locale. Browser only. */
export function formatLocal(iso: string | null | undefined): string | null {
	const date = parse(iso);
	if (!date) return null;
	return date.toLocaleString(undefined, OPTIONS);
}
