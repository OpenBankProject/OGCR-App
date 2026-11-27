/**
 * Block explorer links.
 *
 * A transaction hash on its own is not clickable: it only becomes a link if
 * something is serving a block explorer for the chain. The OGCR chain is a
 * private network, and a local anvil has no explorer at all, so links are opt-in
 * via configuration rather than assumed.
 *
 * Blockscout and Etherscan both use /tx/<hash>, /block/<number> and
 * /address/<address>, so one shape covers the realistic options.
 */

/** Configured explorer base, or null when none is available. */
export function normalizeExplorerBase(raw: string | undefined | null): string | null {
	const value = (raw ?? '').trim();
	if (!value) return null;
	// A misconfigured value should degrade to "no explorer" rather than render
	// links that go nowhere.
	if (!/^https?:\/\//i.test(value)) return null;
	return value.replace(/\/+$/, '');
}

export interface ExplorerLinks {
	/** True when links are available at all, for wording in the UI. */
	available: boolean;
	tx(hash: string | null | undefined): string | null;
	block(blockNumber: number | null | undefined): string | null;
	address(addr: string | null | undefined): string | null;
}

export function explorerLinks(raw: string | undefined | null): ExplorerLinks {
	const base = normalizeExplorerBase(raw);
	if (!base) {
		return {
			available: false,
			tx: () => null,
			block: () => null,
			address: () => null
		};
	}
	return {
		available: true,
		tx: (hash) => (hash ? `${base}/tx/${encodeURIComponent(hash)}` : null),
		block: (n) => (n === null || n === undefined ? null : `${base}/block/${n}`),
		address: (addr) => (addr ? `${base}/address/${encodeURIComponent(addr)}` : null)
	};
}

/** Shorten a hash or address for display, keeping both ends recognisable. */
export function shortenHex(value: string | null | undefined, lead = 10, tail = 6): string {
	if (!value) return '—';
	if (value.length <= lead + tail + 1) return value;
	return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
