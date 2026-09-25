<script lang="ts">
	import type { PageData } from './$types';
	import Kpi from '$lib/components/Kpi.svelte';
	import { FolderKanban, BadgeCheck, Coins, Recycle } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	/**
	 * Hero image slot. Set this to the asset path once the final image is
	 * supplied (drop the file in static/ and point at it, e.g. '/registry-hero.jpg').
	 * Left null so the layout is demo-ready without shipping a broken <img> or
	 * hot-linking an external URL.
	 */
	const HERO_IMAGE: string | null = null;
	const HERO_ALT =
		'Farmland under cultivation, representative of the carbon farming activities listed in the registry';

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
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
		<div>
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

		<div class="ogcr-hero">
			{#if HERO_IMAGE}
				<img src={HERO_IMAGE} alt={HERO_ALT} class="ogcr-hero__img" />
			{:else}
				<!-- Placeholder until the final asset is supplied; see HERO_IMAGE above. -->
				<div class="ogcr-hero__placeholder">
					<span class="text-body-s">Hero image</span>
				</div>
			{/if}
		</div>
	</div>

	<section aria-labelledby="registry-summary" class="mt-12">
		<h2 id="registry-summary" class="sr-only">Registry summary</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Kpi
				label="Activities"
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

<style>
	.ogcr-hero {
		width: 100%;
	}

	.ogcr-hero__img,
	.ogcr-hero__placeholder {
		width: 100%;
		aspect-ratio: 3 / 2;
		border-radius: var(--radius-xl);
		object-fit: cover;
	}

	.ogcr-hero__placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-neutral);
		border: 1px dashed var(--border-medium);
		color: var(--text-secondary);
	}

	:global([data-mode='dark']) .ogcr-hero__placeholder {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
		color: var(--color-surface-400);
	}
</style>
