<script lang="ts">
	import type { PageData } from './$types';
	import { Building2, MapPin } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-8">
	<div class="flex items-center justify-between gap-4 mb-8">
		<div class="flex items-center gap-4">
			<Building2 class="size-8 text-secondary-500" />
			<h1 class="h1">Operators</h1>
		</div>
		{#if data.isAuthenticated}
			<a href="/my/operators" class="btn preset-outlined-primary-500">My operators</a>
		{/if}
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Building2 class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-surface-100-900">
			<h2 class="h3 text-error-500 mb-2">Could not load operators</h2>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
		</div>
	{:else if data.operators.length === 0}
		<div class="card p-8 preset-filled-surface-100-900 text-surface-600-400">
			No operators on the registry yet.
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.operators as op (op.operator_id)}
				<a
					href="/operators/{op.operator_id}"
					class="card p-4 preset-filled-surface-100-900 hover:preset-tonal transition-colors flex items-center gap-3"
				>
					<Building2 class="size-6 text-secondary-500 shrink-0" />
					<div class="min-w-0">
						<p class="h4 text-secondary-500 truncate">{op.legal_name || op.operator_id}</p>
						<p class="text-xs text-surface-600-400 flex items-center gap-1">
							<MapPin class="size-3" />
							{op.country_id || 'Unknown country'}
						</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
