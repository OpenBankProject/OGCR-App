<script lang="ts">
	import type { PageData } from './$types';
	import Kpi from '$lib/components/Kpi.svelte';
	import { FolderKanban, BadgeCheck, Coins, Recycle } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activityCount = $derived(data.activityCount);

	// Issuance, holding and retirement figures have no source in the DCR schema
	// yet. The tiles stay in place so the layout is ready for when they do, but
	// they say so rather than showing a fabricated number.
	const unitStats = [
		{ label: 'Issued Units', icon: Coins },
		{ label: 'Active Units', icon: BadgeCheck },
		{ label: 'Retired Units', icon: Recycle }
	];
</script>

<svelte:head>
	<title>Registry — OGCR</title>
	<meta
		name="description"
		content="The OGCR registry lists carbon removal and carbon farming activities certified under the EU Carbon Removals and Carbon Farming framework."
	/>
</svelte:head>

<div class="mx-auto max-w-6xl px-6 py-8">
	<div class="max-w-3xl">
		<img src="/ogcr_logo.svg" alt="" class="mb-6 h-12" />
		<h1 class="text-h1 mb-4">OGCR — Open Geospatial Carbon Registry</h1>
		<p class="text-body mb-4 text-surface-600-400">
			The OGCR registry lists carbon removal and carbon farming activities certified under the EU
			Carbon Removals and Carbon Farming framework (CRCF). Each activity records the land it
			covers, the practices applied, the operator responsible and the monitoring period over which
			its results are measured.
		</p>
		<p class="text-body mb-8 text-surface-600-400">
			Certification is carried out by accredited bodies and recorded against the activity, so a
			buyer can trace a unit back to the parcel, the practice and the verification behind it.
		</p>
		<a href="/registry/activities" class="btn preset-filled-primary-500">Browse Activities</a>
	</div>

	<section aria-labelledby="registry-summary" class="mt-12">
		<h2 id="registry-summary" class="sr-only">Registry summary</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Kpi
				label="Activities"
				href="/registry/activities"
				value={activityCount ?? '—'}
				secondaryText={activityCount === null ? 'Unavailable right now' : undefined}
				accentBar={false}
			>
				{#snippet icon()}
					<FolderKanban />
				{/snippet}
			</Kpi>

			{#each unitStats as stat (stat.label)}
				<Kpi label={stat.label} value="—" secondaryText="Coming soon" accentBar={false}>
					{#snippet icon()}
						<stat.icon />
					{/snippet}
				</Kpi>
			{/each}
		</div>

		{#if data.error}
			<p class="text-body-s mt-4 text-surface-600-400">
				The activity count could not be loaded: {data.error}
			</p>
		{/if}
	</section>
</div>
