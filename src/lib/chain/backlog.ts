/**
 * Tokenization backlog: registry records that ought to be on the chain but are
 * not yet.
 *
 * This exists because nothing else tells us whether the tokenizer is doing its
 * job. The tokenizer reads OBP and mints on chain; OGCR-chain-cache reads the
 * chain and writes back to OBP. They run in opposite directions, so a healthy
 * chain mirror says nothing at all about the tokenizer. If the tokenizer
 * stopped, the chain would simply stop gaining tokens and the mirror would
 * carry on reporting a perfectly steady connection.
 *
 * Comparing what should be tokenized against what is measures the outcome
 * rather than the process, which catches the case a liveness ping would miss: a
 * tokenizer that is running but failing every mint.
 *
 * The honest limit: a single snapshot cannot tell a queue being worked through
 * from one that is stuck. Consumers must present a non-zero backlog as
 * something to look at, not as a failure.
 */

export interface BacklogEntry {
	/** What kind of record, e.g. "Parcels". */
	label: string;
	/** How "should be tokenized" is defined for this type, shown to the user. */
	rule: string;
	/** Identifiers that qualify for tokenization. */
	expected: number;
	/** Of those, how many are mirrored back from the chain. */
	onChain: number;
	/** Identifiers awaiting tokenization. */
	pending: string[];
	/**
	 * Identifiers on chain that are not in the expected set. Usually zero; a
	 * non-zero value means the chain has tokens the registry no longer justifies,
	 * which is worth knowing but is not a tokenizer backlog.
	 */
	unexpected: string[];
}

export interface Backlog {
	entries: BacklogEntry[];
	/** Total records awaiting tokenization across all types. */
	totalPending: number;
	/** True when every expected record has been tokenized. */
	upToDate: boolean;
}

/** How many pending identifiers to keep for display. */
export const MAX_PENDING_LISTED = 25;

export function diffIds(
	label: string,
	rule: string,
	expectedIds: Iterable<string>,
	onChainIds: Iterable<string>
): BacklogEntry {
	const expected = new Set<string>();
	for (const id of expectedIds) if (id) expected.add(id);

	const onChain = new Set<string>();
	for (const id of onChainIds) if (id) onChain.add(id);

	const pending: string[] = [];
	for (const id of expected) if (!onChain.has(id)) pending.push(id);

	const unexpected: string[] = [];
	for (const id of onChain) if (!expected.has(id)) unexpected.push(id);

	// Sorted so the list is stable between reloads rather than reordering with
	// whatever the API returned.
	pending.sort();
	unexpected.sort();

	return {
		label,
		rule,
		expected: expected.size,
		onChain: onChain.size,
		pending: pending.slice(0, MAX_PENDING_LISTED),
		unexpected: unexpected.slice(0, MAX_PENDING_LISTED)
	};
}

export function summarizeBacklog(entries: BacklogEntry[]): Backlog {
	const totalPending = entries.reduce((n, e) => n + e.pending.length, 0);
	return { entries, totalPending, upToDate: totalPending === 0 };
}
