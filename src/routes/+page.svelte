<script lang="ts">
	import type { PageData } from './$types';
	import ChainHeartbeat from '$lib/components/ChainHeartbeat.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-8">
	<div class="max-w-4xl text-center">
		<img src="/ogcr_logo.svg" alt="OGCR" class="h-16 mx-auto mb-6" />
		<h1 class="h1 mb-6">Welcome to OGCR App</h1>
		<p class="text-xl text-surface-600-400 mb-4">
			An example application to interact with the OGCR entities
		</p>
		<p class="text-surface-600-400">
			See <a href="/activities" class="anchor">Activities</a>,
			manage your <a href="/my/operators" class="anchor">Operators</a>,
			open <a href="/trading" class="anchor">Trading</a>,
			check the <a href="/chain" class="anchor">Chain</a>,
			or browse the <a href="/design" class="anchor">Design System</a>.
		</p>

		{#if data.heartbeat}
			<!-- Shown on the landing page so the chain connection is visible without
			     anyone going looking for it. That is the whole point of a heartbeat. -->
			<div class="mt-8 flex justify-center">
				<ChainHeartbeat heartbeat={data.heartbeat} compact />
			</div>
		{/if}
	</div>
</div>
