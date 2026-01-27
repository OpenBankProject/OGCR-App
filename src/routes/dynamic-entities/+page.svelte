<script lang="ts">
	import type { PageData } from './$types';
	import { Database, RefreshCw } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-8">
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center gap-4">
			<Database class="size-8 text-primary-500" />
			<h1 class="h1">Dynamic Entities</h1>
		</div>

		{#if data.isAuthenticated}
			<div class="flex gap-2">
				<a href="/dynamic-entities" class="btn preset-outlined-primary-500">
					<RefreshCw class="size-4" />
					<span>Refresh</span>
				</a>
			</div>
		{/if}
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Database class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">
				Please log in to view and manage dynamic entities.
			</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-error-100-900">
			<h2 class="h3 mb-2 text-error-500">Error Loading Entities</h2>
			<p class="text-surface-600-400">{data.error}</p>
		</div>
	{:else if data.dynamicEntities && data.dynamicEntities.length === 0}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Database class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">No Dynamic Entities Found</h2>
			<p class="text-surface-600-400 mb-4">
				There are no dynamic entities configured in the system yet.
			</p>
		</div>
	{:else if data.dynamicEntities}
		<div class="grid gap-4">
			{#each data.dynamicEntities as entity}
				<div class="card p-6 preset-filled-surface-100-900">
					<h3 class="h4 text-primary-500">{entity.entity_name}</h3>
				</div>
			{/each}
		</div>
	{/if}
</div>
