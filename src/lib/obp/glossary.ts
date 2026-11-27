import { env } from '$env/dynamic/public';

/**
 * OBP glossary items, as OBP-API publishes them at GET /obp/v6.0.0/api/glossary.
 * Public: no access token.
 *
 * OBP has no endpoint for a single item, so this fetches the whole glossary (about 1 MB)
 * and picks the wanted items out by title.
 */
export const GLOSSARY_PATH = '/obp/v6.0.0/api/glossary';

export interface GlossaryItem {
	title: string;
	/** Rendered by OBP from the item's markdown. */
	html: string;
}

/** Picks the items with these titles out of the endpoint's
 *  `{ glossary_items: [{ title, description: { markdown, html } }] }`, in the order asked
 *  for. A title OBP has no item (or no HTML) for is left out. */
export function pickGlossaryItems(body: unknown, titles: string[]): GlossaryItem[] {
	const entries = (body as { glossary_items?: unknown })?.glossary_items;
	if (!Array.isArray(entries)) return [];
	const byTitle = new Map<string, string>();
	for (const entry of entries) {
		const { title, description } = (entry ?? {}) as {
			title?: unknown;
			description?: { html?: unknown };
		};
		if (typeof title === 'string' && typeof description?.html === 'string') {
			byTitle.set(title, description.html);
		}
	}
	return titles.flatMap((title) => {
		const html = byTitle.get(title);
		return html ? [{ title, html }] : [];
	});
}

/**
 * Fetch the glossary items with these titles. Never throws: an OBP that is down just
 * means no items, and the page says so.
 *
 * Pass the `fetch` from a SvelteKit `load` so the request participates in SSR.
 */
export async function getGlossaryItems(
	titles: string[],
	fetchFn: typeof fetch = fetch
): Promise<GlossaryItem[]> {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	try {
		const response = await fetchFn(`${base}${GLOSSARY_PATH}`);
		if (!response.ok) return [];
		return pickGlossaryItems(await response.json(), titles);
	} catch {
		return [];
	}
}
