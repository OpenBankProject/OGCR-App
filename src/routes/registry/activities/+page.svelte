<script lang="ts">
	import type { PageData } from './$types';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import ToggleGroup from '$lib/components/ToggleGroup.svelte';
	import Button from '$lib/components/Button.svelte';
	import RegistryActivitiesMap from '$lib/components/RegistryActivitiesMap.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		distinctValues,
		mintedAtIso,
		registryActivityHref,
		registryCertificateHref,
		registryOperatorHref,
		type RegistryActivity
	} from '$lib/registry/activities';
	import { Search, List, Map as MapIcon, Layers, Maximize } from '@lucide/svelte';
	import { findAreaOverlaps } from '$lib/registry/areaOverlaps';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let creditType = $state('all');
	let country = $state('all');
	let status = $state('all');

	const activities = $derived(data.activities as RegistryActivity[]);

	// The view lives in the URL (?view=map) so it can be linked and survives a reload.
	// The toggle flips at once; the content follows when the loader has the areas.
	let view = $derived(data.view);
	const viewItems = [
		{ value: 'list', label: 'List', icon: List },
		{ value: 'map', label: 'Map', icon: MapIcon }
	];
	function showView(next: string) {
		const url = new URL(page.url);
		if (next === 'map') url.searchParams.set('view', 'map');
		else url.searchParams.delete('view');
		goto(url, { noScroll: true, keepFocus: true });
	}

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

	/**
	 * Areas that share ground with another activity's: possible double counting, e.g. the
	 * same field certified under two schemes. Checked across every activity, not just the
	 * filtered ones, so narrowing the list never hides who else claims the land.
	 */
	const overlaps = $derived(findAreaOverlaps(data.areas));
	const activityNames = $derived(
		new Map(activities.map((a) => [a.activity_id, a.name?.trim() || 'Unnamed activity']))
	);
	const overlapsWith = (activity: RegistryActivity) =>
		(activity.activity_id && overlaps.get(activity.activity_id)) || [];

	/**
	 * The filtered activities that have an area to draw: overlapping ones first, then by
	 * name, as the map's quick list shows them.
	 */
	const withArea = $derived(
		filtered
			.filter((a) => a.activity_id && data.areas[a.activity_id])
			.sort(
				(a, b) =>
					Number(overlapsWith(b).length > 0) - Number(overlapsWith(a).length > 0) ||
					(a.name ?? '').localeCompare(b.name ?? '')
			)
	);
	const overlappingCount = $derived(withArea.filter((a) => overlapsWith(a).length > 0).length);
	const mappedCount = $derived(withArea.length);

	/** Map view only: overlaps need the areas, which only the map view loads. */
	let overlap = $state('all');
	const overlapItems = [
		{ value: 'all', label: 'All' },
		{ value: 'overlapping', label: 'Overlapping' },
		{ value: 'separate', label: 'Not overlapping' }
	];
	/** What the quick list and the map show, after the overlap toggle. */
	const mapped = $derived(
		overlap === 'all'
			? withArea
			: withArea.filter((a) => overlapsWith(a).length > 0 === (overlap === 'overlapping'))
	);

	let activitiesMap = $state<ReturnType<typeof RegistryActivitiesMap>>();
	let focusedId = $state<string | null>(null);
	function focusOnMap(activityId: string) {
		if (activitiesMap?.focusActivity(activityId)) focusedId = activityId;
	}
	function showAllOnMap() {
		activitiesMap?.showAll();
		focusedId = null;
	}

	const filtersApplied = $derived(
		search.trim() !== '' ||
			creditType !== 'all' ||
			country !== 'all' ||
			status !== 'all' ||
			overlap !== 'all'
	);

	function clearFilters() {
		search = '';
		creditType = 'all';
		country = 'all';
		status = 'all';
		overlap = 'all';
	}

	/**
	 * Ordered by what a buyer scans for, not the order §4.3 of the brief lists them in.
	 * Eleven nowrap columns overflow any realistic viewport, and the design system's table
	 * scrolls horizontally by design — so the question is which columns are visible
	 * before you scroll. Status, certificate and whether it is minted on-chain decide
	 * whether an activity is worth looking at, so they sit next to the name; dates,
	 * operator and the free-text summary are detail and follow. No column was dropped. The table scrolls inside a
	 * window-high box with the header and the name pinned, so its sideways scrollbar is
	 * always in view and every row stays identifiable while scrolling.
	 */
	const columns: TableColumn[] = [
		{ key: 'name', header: 'Activity name', sortable: true },
		{ key: 'activity_type', header: 'Type', sortable: true },
		{ key: 'verification_status', header: 'Activity status', sortable: true },
		{ key: 'certificate', header: 'Certificate' },
		{ key: 'minted', header: 'Minted', sortable: true },
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
			certificate: a.certificate_of_compliance_id ?? '',
			// The day only, like the other date columns; the activity page has the time.
			minted: mintedAtIso(a.minted_at)?.slice(0, 10) ?? ''
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
	<div class="ogcr-heading mb-6">
		<h1 class="text-h1">Activities</h1>
		<ToggleGroup
			items={viewItems}
			bind:value={view}
			onValueChange={showView}
			aria-label="Show activities as"
		/>
	</div>

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

	<p class="ogcr-count text-body-s mb-4" aria-live="polite">
		{filtered.length === data.count
			? `${data.count} ${data.count === 1 ? 'activity' : 'activities'}`
			: `${filtered.length} of ${data.count} activities`}
		{#if data.view === 'map' && !data.areasError}
			· {mappedCount === filtered.length ? 'all' : mappedCount} on the map{#if mappedCount < filtered.length}
				({filtered.length - mappedCount} with no recorded area){/if}
		{/if}
	</p>

	{#if data.view === 'map'}
		{#if data.areasError}
			<div class="mb-4">
				<ObpErrorDisplay error={data.areasError} title="Activity areas could not be loaded" />
			</div>
		{/if}
		<div class="ogcr-legend mb-3" aria-label="Map key">
			<Pill tone="positive" dot>Verified</Pill>
			<Pill tone="warning" dot>Unverified</Pill>
			{#if mapped.length > 0}
				<Button variant="outlined" size="s" class="ogcr-legend__action" onclick={showAllOnMap}>
					{#snippet iconLeft()}<Maximize class="size-4" aria-hidden="true" />{/snippet}
					Show all activities
				</Button>
			{/if}
		</div>
		{#if overlappingCount > 0 || overlap !== 'all'}
			<div class="ogcr-overlap-bar mb-2">
				<p class="ogcr-overlap-note text-body-s">
					<Layers class="size-4" aria-hidden="true" />
					{overlappingCount}
					{overlappingCount === 1 ? 'activity overlaps' : 'activities overlap'} another activity's area
				</p>
				<ToggleGroup
					items={overlapItems}
					bind:value={overlap}
					size="s"
					aria-label="Show activities by overlap"
				/>
			</div>
		{/if}
		{#if mapped.length > 0}
			<!-- A quick way in: each name zooms the map to that parcel, with every other area
			     still drawn, so parcels claimed under more than one scheme show as overlaps. -->
			<ul class="ogcr-map-list mb-3" aria-label="Zoom the map to an activity">
				{#each mapped as activity (activity.activity_id)}
					{@const others = overlapsWith(activity).map((id) => activityNames.get(id) ?? id)}
					<li>
						<button
							type="button"
							class="ogcr-map-list__item"
							data-status={activity.verification_status === 'verified' ? 'verified' : 'unverified'}
							aria-pressed={focusedId === activity.activity_id}
							class:ogcr-map-list__item--overlap={others.length > 0}
							title={[
								activity.activity_type,
								[activity.city, activity.country_name].filter(Boolean).join(', '),
								others.length ? `Overlaps ${others.join(', ')}` : ''
							]
								.filter(Boolean)
								.join(' · ')}
							onclick={() => focusOnMap(activity.activity_id!)}
						>
							<span class="ogcr-map-list__dot" aria-hidden="true"></span>
							{activity.name?.trim() || 'Unnamed activity'}
							{#if others.length}
								<Layers class="size-3.5" aria-hidden="true" />
								<span class="sr-only">(overlaps {others.join(', ')})</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<RegistryActivitiesMap
			bind:this={activitiesMap}
			activities={mapped}
			areas={data.areas}
			class="ogcr-map"
		/>
	{:else}
		<Table
			{columns}
			{rows}
			regionLabel="Registry activities"
			maxHeight="calc(100dvh - 8rem)"
			stickyFirstColumn
			emptyMessage={filtersApplied ? 'No activities match these filters' : 'No activities'}
		>
			{#snippet cell(row, column)}
				<!-- Every cell goes to the most relevant detail: the activity's own facts open its
			     page, the operator and certificate open theirs, and type and country — which
			     have no page of their own — narrow the list to their peers. -->
				{@const activityHref =
					typeof row.activity_id === 'string' ? registryActivityHref(row.activity_id) : null}
				{#if column.key === 'name'}
					{#if activityHref}
						<a href={activityHref} class="ogcr-cell-strong anchor">{show(row.name)}</a>
					{:else}
						<span class="ogcr-cell-strong">{show(row.name)}</span>
					{/if}
				{:else if column.key === 'activity_type'}
					{#if typeof row.activity_type === 'string' && row.activity_type}
						<button
							type="button"
							class="ogcr-cell-filter"
							title="Show only {row.activity_type} activities"
							onclick={() => (creditType = row.activity_type as string)}
						>
							<Pill tone="neutral">{row.activity_type}</Pill>
						</button>
					{:else}
						{DASH}
					{/if}
				{:else if column.key === 'verification_status'}
					<!-- Text, not colour alone: the label is the signal, the tone reinforces it. -->
					{@const pill = row.verification_status === 'verified' ? 'Verified' : 'Unverified'}
					{#if activityHref}
						<a href={activityHref} title="Activity details">
							<Pill tone={row.verification_status === 'verified' ? 'positive' : 'warning'} dot>
								{pill}
							</Pill>
						</a>
					{:else}
						<Pill tone={row.verification_status === 'verified' ? 'positive' : 'warning'} dot>
							{pill}
						</Pill>
					{/if}
				{:else if column.key === 'certificate'}
					{#if typeof row.certificate_of_compliance_id === 'string' && row.certificate_of_compliance_id}
						<a href={registryCertificateHref(row.certificate_of_compliance_id)} class="anchor">
							View certificate
						</a>
					{:else}
						<span class="ogcr-cell-muted">Not yet certified</span>
					{/if}
				{:else if column.key === 'minted'}
					{#if row.minted && activityHref}
						<a href={activityHref} class="ogcr-cell-link">{row.minted}</a>
					{:else if row.minted}
						{row.minted}
					{:else}
						<span class="ogcr-cell-muted">Not minted</span>
					{/if}
				{:else if column.key === 'location'}
					{#if typeof row.country_name === 'string' && row.country_name}
						<button
							type="button"
							class="ogcr-cell-filter ogcr-cell-link"
							title="Show only activities in {row.country_name}"
							onclick={() => (country = row.country_name as string)}
						>
							{show(row.location)}
						</button>
					{:else}
						{show(row.location)}
					{/if}
				{:else if column.key === 'operator_legal_name'}
					{#if typeof row.operator_id === 'string' && row.operator_id}
						<a href={registryOperatorHref(row.operator_id)} class="anchor">
							{show(row.operator_legal_name ?? row.operator_id)}
						</a>
					{:else}
						{show(row.operator_legal_name)}
					{/if}
				{:else if activityHref}
					<!-- Dates, monitoring period and summary are the activity's own facts. -->
					<a
						href={activityHref}
						class="ogcr-cell-link"
						class:ogcr-cell-truncate={column.key === 'summary'}
						title={column.key === 'summary' && typeof row.summary === 'string'
							? row.summary
							: undefined}
					>
						{show(row[column.key])}
					</a>
				{:else}
					{show(row[column.key])}
				{/if}
			{/snippet}
		</Table>
	{/if}
</div>

<style>
	.ogcr-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-s);
	}

	.ogcr-count {
		color: var(--text-secondary);
	}

	.ogcr-legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
	}
	/* Sits at the right, above the map it acts on. */
	.ogcr-legend :global(.ogcr-legend__action) {
		margin-left: auto;
	}

	/* Small and capped at a few lines, so the map stays the main thing on the page. */
	.ogcr-map-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2xs);
		max-height: 5.5rem;
		overflow-y: auto;
		list-style: none;
		padding: 0;
	}
	.ogcr-map-list__item {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2xs);
		padding: 0 var(--space-xs);
		background: var(--surface-light);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-m);
		font-family: var(--font-family-default);
		font-size: var(--font-size-s);
		line-height: 1.6;
		color: var(--text-primary);
		white-space: nowrap;
		cursor: pointer;
		transition: border-color var(--motion-fast);
	}
	.ogcr-map-list__item:hover {
		border-color: var(--border-strong);
	}
	.ogcr-map-list__item[aria-pressed='true'] {
		border-color: var(--interaction-primary-default);
	}
	.ogcr-map-list__item:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 2px var(--surface-light),
			0 0 0 4px var(--interaction-primary-default);
	}
	/* Overlap is a warning, not an error: it needs a look, it may be legitimate. */
	.ogcr-map-list__item--overlap {
		background: var(--surface-warning);
		border-color: var(--border-warning-strong);
		color: var(--text-warning);
	}
	.ogcr-overlap-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-s);
	}
	.ogcr-overlap-note {
		display: flex;
		align-items: center;
		gap: var(--space-2xs);
		color: var(--text-warning);
	}

	/* Same colours as the map outlines. */
	.ogcr-map-list__dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--border-warning-strong);
	}
	.ogcr-map-list__item[data-status='verified'] .ogcr-map-list__dot {
		background: var(--border-positive-strong);
	}

	/* Same window-high box the table scrolls in. */
	:global(.ogcr-map) {
		height: calc(100dvh - 8rem);
		min-height: 24rem;
	}

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

	/* Links on plain facts (dates, summary, location) keep the table's text colour so
	   the grid stays calm; the underline on hover/focus says they go somewhere. */
	.ogcr-cell-link {
		color: inherit;
		text-decoration: none;
	}
	.ogcr-cell-link:hover,
	.ogcr-cell-link:focus-visible {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	/* Type and location narrow the list rather than navigate, so they are buttons. */
	.ogcr-cell-filter {
		padding: 0;
		background: none;
		border: none;
		font: inherit;
		cursor: pointer;
	}

	@media (prefers-reduced-motion: reduce) {
		.ogcr-input,
		.ogcr-map-list__item {
			transition: none;
		}
	}

	:global([data-mode='dark']) .ogcr-input {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
		color: var(--color-surface-100);
	}
	:global([data-mode='dark']) .ogcr-map-list__item {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
		color: var(--color-surface-100);
	}
	/* Keep the warning edge in dark mode; the pale warning fill would glare. */
	:global([data-mode='dark']) .ogcr-map-list__item--overlap {
		border-color: var(--border-warning-strong);
		color: var(--border-warning-strong);
	}
	:global([data-mode='dark']) .ogcr-cell-strong {
		color: var(--color-surface-50);
	}
	:global([data-mode='dark']) .ogcr-count,
	:global([data-mode='dark']) .ogcr-cell-muted {
		color: var(--color-surface-400);
	}
</style>
