<script lang="ts">
	import CarbonGarden from '$lib/components/CarbonGarden.svelte';
	import Card from '$lib/components/Card.svelte';
	import type { CarbonGardenResult } from '$lib/registry/carbonGarden';

	/** The whole Carbon Garden page, for both versions: /carbon-garden (logged in) and /registry/carbon-garden (public). */
	let { data }: { data: CarbonGardenResult & { fullHref?: string | null } } = $props();
</script>

<svelte:head>
	<title>Carbon Garden — OGCR</title>
	<meta
		name="description"
		content="Registry activities on a map of Europe, storing carbon over time."
	/>
</svelte:head>

{#if data.garden.acts.length}
	<CarbonGarden
		garden={data.garden}
		warnings={data.warnings}
		publicView={data.publicView}
		fullHref={data.fullHref ?? null}
	/>
{:else}
	<div class="mx-auto max-w-3xl px-6 py-8">
		<h1 class="text-h1 mb-4">Carbon Garden</h1>
		<Card>
			{#if data.error}
				<p class="text-body">The registry could not be read: {data.error}</p>
			{:else}
				<p class="text-body">
					There is nothing to show yet: no registry activity has both an area and start and end
					dates.
				</p>
			{/if}
		</Card>
	</div>
{/if}
