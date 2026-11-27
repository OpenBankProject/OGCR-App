<script lang="ts">
	import type { PageData } from './$types';
	import FieldList, { type Field } from '$lib/components/FieldList.svelte';
	import GeoJsonMap from '$lib/components/GeoJsonMap.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import Pill, { type PillTone } from '$lib/components/Pill.svelte';
	import { MapPin } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const parcel = $derived(data.parcel as Record<string, unknown> | null);

	// Every field the record has, in the order OBP returns them; the geometry is drawn
	// on the map instead of listed.
	const fields = $derived<Field[]>(
		parcel
			? Object.entries(parcel)
					.filter(([key]) => key !== 'multipolygon_coordinates')
					.map(([key, value]) => ({
						label: key,
						value:
							value === null || value === undefined
								? null
								: typeof value === 'object'
									? JSON.stringify(value)
									: String(value)
					}))
			: []
	);

	function statusTone(status: unknown): PillTone {
		if (status === 'verified') return 'positive';
		if (status === 'failed') return 'negative';
		return 'warning';
	}
</script>

<svelte:head>
	<title>Parcel {data.parcelId} — OGCR</title>
</svelte:head>

<div class="parcel-page">
	<div class="parcel-heading">
		<MapPin class="size-8" />
		<h1 class="text-h1">Parcel</h1>
	</div>
	<p class="parcel-id">{data.parcelId}</p>

	{#if !data.isAuthenticated}
		<p class="parcel-note">
			Parcels are not public. <a href="/login" class="anchor">Log in</a> to view this parcel.
		</p>
	{:else if data.error}
		<ObpErrorDisplay error={data.error} title="The parcel could not be loaded" />
	{:else if parcel}
		{#if parcel.multipolygon_coordinates}
			<GeoJsonMap geoJson={parcel.multipolygon_coordinates as object | string} />
		{/if}

		<FieldList {fields} />

		<h2 class="text-h3">Ownership verifications</h2>
		{#if data.ownerVerifications && data.ownerVerifications.length > 0}
			<ul class="parcel-list">
				{#each data.ownerVerifications as ver, i (i)}
					<li>
						<Pill tone={statusTone(ver.status_code)} dot
							>{String(ver.status_code ?? 'unknown')}</Pill
						>
						{#if ver.authority}<span class="parcel-note">{ver.authority}</span>{/if}
						{#if ver.status_message}<span class="parcel-note">{ver.status_message}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="parcel-note">None.</p>
		{/if}

		<h2 class="text-h3">Activities</h2>
		{#if data.activityIds && data.activityIds.length > 0}
			<ul class="parcel-list">
				{#each data.activityIds as id (id)}
					<li><a href="/activities/{encodeURIComponent(id)}" class="anchor">{id}</a></li>
				{/each}
			</ul>
		{:else}
			<p class="parcel-note">Not linked to any activity.</p>
		{/if}
	{/if}
</div>

<style>
	.parcel-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		max-width: 48rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-l);
	}
	.parcel-heading {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		color: var(--icon-primary);
	}
	.parcel-heading h1 {
		color: var(--text-primary);
	}
	.parcel-id {
		font-family: var(--font-family-mono);
		font-size: var(--font-size-s);
		color: var(--text-secondary);
		overflow-wrap: anywhere;
	}
	.parcel-note {
		color: var(--text-secondary);
	}
	.parcel-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}
	.parcel-list li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
	}

	/* Dark mode: the design system has no dark palette, so fall back to the Skeleton
	   dark surfaces, as Card does. */
	:global([data-mode='dark']) .parcel-heading,
	:global([data-mode='dark']) .parcel-heading h1 {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .parcel-id,
	:global([data-mode='dark']) .parcel-note {
		color: var(--color-surface-400);
	}
</style>
