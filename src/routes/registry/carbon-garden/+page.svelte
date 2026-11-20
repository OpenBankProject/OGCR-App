<script lang="ts">
	import type { PageData } from './$types';
	import CarbonGardenPage from '$lib/components/CarbonGardenPage.svelte';

	let { data }: { data: PageData } = $props();
</script>

<CarbonGardenPage {data} />
