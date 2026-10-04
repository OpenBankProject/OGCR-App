<script lang="ts">
	import type { PageData } from './$types';
	import SystemStatusPage from '$lib/components/SystemStatusPage.svelte';

	let { data }: { data: PageData } = $props();
</script>

<SystemStatusPage {data} title="System Status - OGCR DCR" />
