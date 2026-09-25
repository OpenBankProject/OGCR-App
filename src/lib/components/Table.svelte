<script lang="ts" module>
	export interface TableColumn {
		/** Key into the row object, and the id used for sorting. */
		key: string;
		header: string;
		align?: 'left' | 'right' | 'center';
		/** Right-aligns and applies tabular figures. */
		numeric?: boolean;
		sortable?: boolean;
	}
</script>

<script lang="ts">
	/**
	 * OGCR Design System — Table (spec §4.14).
	 *
	 * The upstream component is built on @tanstack/react-table, which is React-only,
	 * so the headless part is reimplemented here in Svelte: sorting, the sort
	 * indicator and the empty state. Every visual decision — mono-caps headers,
	 * dashed row rules, tabular figures, the hover tint, the mono-caps empty
	 * message — is transcribed from the shipped component. See
	 * ../../../design_system_integration.md for the porting conventions.
	 *
	 * Sorting is client-side over the rows given. Sort cycles asc -> desc ->
	 * cleared, which is what the spec's behaviour notes describe, and `aria-sort`
	 * follows it so the state is announced.
	 */
	import type { Snippet } from 'svelte';

	let {
		columns,
		rows,
		caption,
		emptyMessage = 'No records',
		regionLabel,
		cell
	}: {
		columns: TableColumn[];
		rows: Record<string, unknown>[];
		caption?: string;
		emptyMessage?: string;
		/** Accessible name for the scroll region. */
		regionLabel?: string;
		/** Renders one cell. Falls back to the raw value when not supplied. */
		cell?: Snippet<[Record<string, unknown>, TableColumn]>;
	} = $props();

	let sortKey = $state<string | null>(null);
	let sortDir = $state<'asc' | 'desc' | null>(null);

	function toggleSort(key: string) {
		if (sortKey !== key) {
			sortKey = key;
			sortDir = 'asc';
		} else if (sortDir === 'asc') {
			sortDir = 'desc';
		} else {
			sortKey = null;
			sortDir = null;
		}
	}

	const sortedRows = $derived.by(() => {
		if (!sortKey || !sortDir) return rows;
		const key = sortKey;
		const factor = sortDir === 'asc' ? 1 : -1;
		// Copy first: sorting the prop array in place would mutate the caller's data.
		return [...rows].sort((a, b) => {
			const av = a[key];
			const bv = b[key];
			// Empty values sort last whichever way the column is pointing, so a
			// blank never displaces a real value at the top of the list.
			const aEmpty = av === null || av === undefined || av === '';
			const bEmpty = bv === null || bv === undefined || bv === '';
			if (aEmpty && bEmpty) return 0;
			if (aEmpty) return 1;
			if (bEmpty) return -1;
			if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
			return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
		});
	});

	function alignOf(column: TableColumn) {
		return column.align ?? (column.numeric ? 'right' : 'left');
	}

	function ariaSortFor(column: TableColumn) {
		if (!column.sortable) return undefined;
		if (sortKey !== column.key || !sortDir) return 'none' as const;
		return sortDir === 'asc' ? ('ascending' as const) : ('descending' as const);
	}
</script>

<div class="ogcr-table">
	<!-- A horizontally scrolling region must be reachable by keyboard, or a keyboard user
	     cannot scroll to the columns that overflow. WCAG 2.1.1; the linter's rule does not
	     know about the scroll container case. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="ogcr-table__scroll" role="region" aria-label={regionLabel ?? caption} tabindex="0">
		<table class="ogcr-table__table">
			{#if caption}
				<caption class="ogcr-table__caption">{caption}</caption>
			{/if}
			<thead class="ogcr-table__thead">
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							class="ogcr-table__th"
							data-align={alignOf(column)}
							aria-sort={ariaSortFor(column)}
						>
							{#if column.sortable}
								<button
									type="button"
									class="ogcr-table__sort"
									onclick={() => toggleSort(column.key)}
								>
									<span>{column.header}</span>
									<span
										class="ogcr-table__sort-icon"
										class:ogcr-table__sort-icon--active={sortKey === column.key && sortDir}
										aria-hidden="true"
									>
										{sortKey === column.key && sortDir === 'asc'
											? '↑'
											: sortKey === column.key && sortDir === 'desc'
												? '↓'
												: '↕'}
									</span>
								</button>
							{:else}
								{column.header}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="ogcr-table__tbody">
				{#if sortedRows.length === 0}
					<tr>
						<td class="ogcr-table__empty" colspan={columns.length}>{emptyMessage}</td>
					</tr>
				{:else}
					{#each sortedRows as row, index (index)}
						<tr class="ogcr-table__tr">
							{#each columns as column (column.key)}
								<td
									class="ogcr-table__td"
									data-align={alignOf(column)}
									data-numeric={column.numeric ? '' : undefined}
								>
									{#if cell}
										{@render cell(row, column)}
									{:else}
										{row[column.key] ?? ''}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.ogcr-table {
		width: 100%;
		background: var(--surface-light);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-l);
		overflow: hidden;
	}

	.ogcr-table__scroll {
		width: 100%;
		overflow-x: auto;
	}

	.ogcr-table__table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-family-default);
	}

	.ogcr-table__caption {
		caption-side: top;
		padding: var(--space-s) var(--space-m);
		text-align: left;
		font-family: var(--font-family-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--text-secondary);
		background: var(--surface-neutral);
		border-bottom: 1px solid var(--border-light);
	}

	.ogcr-table__thead {
		background: linear-gradient(to bottom, var(--surface-neutral), var(--surface-light));
	}

	.ogcr-table__th {
		padding: var(--space-s) var(--space-m);
		text-align: left;
		border-bottom: 1px solid var(--border-medium);
		font-family: var(--font-family-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-secondary);
		white-space: nowrap;
		vertical-align: middle;
	}
	.ogcr-table__th[data-align='right'] {
		text-align: right;
	}
	.ogcr-table__th[data-align='center'] {
		text-align: center;
	}

	.ogcr-table__sort {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0;
		margin: 0;
		border: 0;
		background: transparent;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: inherit;
		cursor: pointer;
		transition: color var(--motion-fast);
	}
	.ogcr-table__sort:hover {
		color: var(--text-primary);
	}
	.ogcr-table__sort:focus-visible {
		outline: 2px solid var(--interaction-primary-default);
		outline-offset: 3px;
		border-radius: 2px;
	}
	.ogcr-table__th[data-align='right'] .ogcr-table__sort {
		flex-direction: row-reverse;
	}

	.ogcr-table__sort-icon {
		display: inline-block;
		min-width: 10px;
		font-family: var(--font-family-mono);
		font-size: 12px;
		line-height: 1;
		opacity: 0.4;
		transition:
			opacity var(--motion-fast),
			color var(--motion-fast);
	}
	.ogcr-table__sort-icon--active {
		opacity: 1;
		color: var(--interaction-primary-default);
	}

	.ogcr-table__tr {
		transition: background-color var(--motion-fast);
	}
	.ogcr-table__tr:hover {
		background: var(--surface-neutral);
	}

	.ogcr-table__td {
		padding: var(--space-s) var(--space-m);
		border-bottom: 1px dashed var(--border-light);
		/* Upstream cells are `text-m`, not `text-s` — confirmed against both the shipped
		   component and spec §4.14. Larger than a typical data table by design: the
		   contrast against 11px mono-caps headers is the look. */
		font-size: var(--font-size-m);
		font-weight: 400;
		color: var(--text-primary);
		vertical-align: middle;
		white-space: nowrap;
	}
	.ogcr-table__tbody tr:last-child .ogcr-table__td {
		border-bottom: none;
	}
	.ogcr-table__td[data-align='right'] {
		text-align: right;
	}
	.ogcr-table__td[data-align='center'] {
		text-align: center;
	}
	.ogcr-table__td[data-numeric] {
		font-variant-numeric: tabular-nums;
		font-feature-settings: 'tnum' 1;
		letter-spacing: -0.005em;
		font-weight: 500;
	}

	.ogcr-table__empty {
		padding: var(--space-xl) var(--space-m);
		text-align: center;
		color: var(--text-secondary);
		font-size: var(--font-size-s);
		font-family: var(--font-family-mono);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	@media (prefers-reduced-motion: reduce) {
		.ogcr-table__sort,
		.ogcr-table__sort-icon,
		.ogcr-table__tr {
			transition: none;
		}
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-table {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-table__thead {
		background: var(--color-surface-800);
	}
	:global([data-mode='dark']) .ogcr-table__th {
		border-bottom-color: var(--color-surface-700);
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-table__caption {
		background: var(--color-surface-800);
		border-bottom-color: var(--color-surface-700);
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-table__td {
		border-bottom-color: var(--color-surface-700);
		color: var(--color-surface-100);
	}
	:global([data-mode='dark']) .ogcr-table__tr:hover {
		background: var(--color-surface-800);
	}
	:global([data-mode='dark']) .ogcr-table__sort:hover {
		color: var(--color-surface-50);
	}
	:global([data-mode='dark']) .ogcr-table__empty {
		color: var(--color-surface-400);
	}
</style>
