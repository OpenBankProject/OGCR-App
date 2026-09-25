<script lang="ts">
	import type { PageData } from './$types';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { distinctValues, type RegistryActivity } from '$lib/registry/activities';
	import { Search } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let creditType = $state('all');
	let country = $state('all');
	let status = $state('all');

	const activities = $derived(data.activities as RegistryActivity[]);

	// Dropdowns are populated from the values actually present, so they never offer a
	// filter that would return nothing.
	const creditTypes = $derived(distinctValues(activities, 'activity_type'));
	const countries = $derived(distinctValues(activities, 'country_name'));

	const filtered = $derived(
		activities.filter((a) => {
			const term = search.trim().toLowerCase();
			if (term && !(a.name ?? '').toLowerCase().includes(term)) return false;
			if (creditType !== 'all' && a.activity_type !== creditType) return false;
			if (country !== 'all' && a.country_name !== country) return false;
			// Matches the internal Activities page's verified / unverified split.
			if (status !== 'all' && a.verification_status !== status) return false;
			return true;
		})
	);

	const filtersApplied = $derived(
		search.trim() !== '' || creditType !== 'all' || country !== 'all' || status !== 'all'
	);

	function clearFilters() {
		search = '';
		creditType = 'all';
		country = 'all';
		status = 'all';
	}

	/**
	 * Ordered by what a buyer scans for, not the order §4.3 of the brief lists them in.
	 * Ten nowrap columns overflow any realistic viewport, and the design system's table
	 * scrolls horizontally by design — so the question is which columns are visible
	 * before you scroll. Status and certificate decide whether an activity is worth
	 * looking at, so they sit next to the name; dates, operator and the free-text
	 * summary are detail and follow. No column was dropped.
	 */
	const columns: TableColumn[] = [
		{ key: 'name', header: 'Activity name', sortable: true },
		{ key: 'activity_type', header: 'Type', sortable: true },
		{ key: 'verification_status', header: 'Activity status', sortable: true },
		{ key: 'certificate', header: 'Certificate' },
		{ key: 'location', header: 'Location', sortable: true },
		{ key: 'operator_legal_name', header: 'Operator', sortable: true },
		{ key: 'start_date', header: 'Start', sortable: true },
		{ key: 'end_date', header: 'End', sortable: true },
		{ key: 'monitoring_period', header: 'Monitoring period' },
		{ key: 'summary', header: 'Summary' }
	];

	/** Rows carry the derived display fields the table sorts on, alongside the raw record. */
	const rows = $derived(
		filtered.map((a) => ({
			...a,
			location: [a.city, a.country_name].filter(Boolean).join(', '),
			monitoring_period:
				a.monitoring_period_start_date && a.monitoring_period_end_date
					? `${a.monitoring_period_start_date} – ${a.monitoring_period_end_date}`
					: '',
			certificate: a.certificate_of_compliance_id ?? ''
		}))
	);

	/** An em dash reads as "no value" where an empty cell reads as a rendering bug. */
	const DASH = '—';
	function show(value: unknown): string {
		return typeof value === 'string' && value.trim() !== '' ? value : DASH;
	}
</script>

<svelte:head>
	<title>Activities — OGCR Registry</title>
	<meta
		name="description"
		content="Carbon removal and carbon farming activities certified under the CRCF and listed on the OGCR registry."
	/>
</svelte:head>

<div class="mx-auto max-w-[1400px] px-6 py-8">
	<h1 class="text-h1 mb-6">Activities</h1>

	{#if data.error}
		<div class="mb-6">
			<ObpErrorDisplay error={data.error} title="The registry could not be loaded" />
		</div>
	{/if}

	<div class="ogcr-toolbar mb-4">
		<label class="ogcr-field ogcr-field--search">
			<span class="sr-only">Search activities by name</span>
			<span class="ogcr-field__icon" aria-hidden="true"><Search class="size-4" /></span>
			<input
				type="search"
				bind:value={search}
				placeholder="Search by activity name"
				class="ogcr-input"
			/>
		</label>

		<label class="ogcr-field">
			<span class="text-label-input">Credit type</span>
			<select bind:value={creditType} class="ogcr-input">
				<option value="all">All types</option>
				{#each creditTypes as value (value)}<option {value}>{value}</option>{/each}
			</select>
		</label>

		<label class="ogcr-field">
			<span class="text-label-input">Country</span>
			<select bind:value={country} class="ogcr-input">
				<option value="all">All countries</option>
				{#each countries as value (value)}<option {value}>{value}</option>{/each}
			</select>
		</label>

		<label class="ogcr-field">
			<span class="text-label-input">Activity status</span>
			<select bind:value={status} class="ogcr-input">
				<option value="all">All statuses</option>
				<option value="verified">Verified</option>
				<option value="unverified">Unverified</option>
			</select>
		</label>

		{#if filtersApplied}
			<button type="button" class="btn preset-outlined-surface-500" onclick={clearFilters}>
				Clear filters
			</button>
		{/if}
	</div>

	<p class="text-body-s mb-4 text-surface-600-400" aria-live="polite">
		{filtered.length === data.count
			? `${data.count} ${data.count === 1 ? 'activity' : 'activities'}`
			: `${filtered.length} of ${data.count} activities`}
	</p>

	<Table
		{columns}
		{rows}
		regionLabel="Registry activities"
		emptyMessage={filtersApplied ? 'No activities match these filters' : 'No activities'}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'name'}
				<!-- Detail pages are out of scope for now; the link is the certificate. -->
				<span class="ogcr-cell-strong">{show(row.name)}</span>
			{:else if column.key === 'summary'}
				<span class="ogcr-cell-truncate" title={typeof row.summary === 'string' ? row.summary : ''}>
					{show(row.summary)}
				</span>
			{:else if column.key === 'activity_type'}
				{#if row.activity_type}
					<Pill tone="neutral">{row.activity_type}</Pill>
				{:else}
					{DASH}
				{/if}
			{:else if column.key === 'verification_status'}
				<!-- Text, not colour alone: the label is the signal, the tone reinforces it. -->
				<Pill tone={row.verification_status === 'verified' ? 'positive' : 'warning'} dot>
					{row.verification_status === 'verified' ? 'Verified' : 'Unverified'}
				</Pill>
			{:else if column.key === 'certificate'}
				{#if row.certificate_of_compliance_id}
					<a href="/registry/certificates/{row.certificate_of_compliance_id}" class="anchor">
						View certificate
					</a>
				{:else}
					<span class="ogcr-cell-muted">Not yet certified</span>
				{/if}
			{:else}
				{show(row[column.key])}
			{/if}
		{/snippet}
	</Table>
</div>

<style>
	.ogcr-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--space-s);
	}

	.ogcr-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		position: relative;
		min-width: 0;
	}

	.ogcr-field--search {
		flex: 1 1 18rem;
	}

	.ogcr-field__icon {
		position: absolute;
		left: var(--space-xs);
		bottom: 0.7rem;
		color: var(--icon-secondary);
		pointer-events: none;
	}

	.ogcr-field--search .ogcr-input {
		padding-left: var(--space-xl);
	}

	.ogcr-input {
		min-height: 40px; /* §8: 40x40 minimum hit target */
		padding: var(--space-2xs) var(--space-s);
		background: var(--surface-light);
		border: 1px solid var(--border-medium);
		border-radius: var(--radius-m);
		font-family: var(--font-family-default);
		font-size: var(--font-size-s);
		color: var(--text-primary);
		transition:
			border-color var(--motion-fast),
			box-shadow var(--motion-fast);
	}
	.ogcr-input:hover {
		border-color: var(--border-strong);
	}
	.ogcr-input:focus-visible {
		outline: none;
		border-color: var(--interaction-primary-default);
		box-shadow:
			0 0 0 2px var(--surface-light),
			0 0 0 4px var(--interaction-primary-default);
	}

	.ogcr-cell-strong {
		font-weight: 500;
		color: var(--text-primary);
	}

	/* The table keeps cells on one line; the summary is the one column that needs a
	   ceiling, with the full text on hover. */
	.ogcr-cell-truncate {
		display: inline-block;
		max-width: 16rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: middle;
	}

	.ogcr-cell-muted {
		color: var(--text-secondary);
	}

	@media (prefers-reduced-motion: reduce) {
		.ogcr-input {
			transition: none;
		}
	}

	:global([data-mode='dark']) .ogcr-input {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
		color: var(--color-surface-100);
	}
	:global([data-mode='dark']) .ogcr-cell-strong {
		color: var(--color-surface-50);
	}
	:global([data-mode='dark']) .ogcr-cell-muted {
		color: var(--color-surface-400);
	}
</style>
