<script lang="ts">
	import type { PageData } from './$types';
	import { Building2, Plus, RefreshCw, Mail, MapPin, Wallet, Link2 } from '@lucide/svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';

	let { data }: { data: PageData } = $props();

	const operators = $derived(data.operators ?? []);
</script>

<div class="p-8">
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center gap-4">
			<Building2 class="size-8 text-primary-500" />
			<h1 class="h1">My Operators</h1>
		</div>

		{#if data.isAuthenticated}
			<div class="flex gap-2">
				<a href="/my/operators/create" class="btn preset-filled-primary-500">
					<Plus class="size-4" />
					<span>Create Operator</span>
				</a>
				<a href="/my/operators" class="btn preset-outlined-primary-500">
					<RefreshCw class="size-4" />
					<span>Refresh</span>
				</a>
			</div>
		{/if}
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Building2 class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to see your operators.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="max-w-3xl">
			<ObpErrorDisplay error={data.error} title="Error loading operators" />
		</div>
	{:else if operators.length === 0}
		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			<h2 class="h3 mb-2">No operators linked to your account</h2>
			<p class="text-surface-600-400 mb-4">
				You're not yet linked to any operator. Create one to act as an operator on the marketplace —
				it'll be linked to your user so you can list activities.
			</p>
			<a href="/my/operators/create" class="btn preset-filled-primary-500">
				<Plus class="size-4" />
				<span>Create Operator</span>
			</a>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
			{#each operators as op (op.user_operator_relationship_id ?? op.operator_id)}
				<a
					href="/my/operators/{op.operator_id}"
					class="card p-6 preset-filled-surface-100-900 hover:preset-tonal transition-colors flex flex-col gap-3"
				>
					<div class="flex items-start justify-between gap-2">
						<h3 class="h4 text-primary-500">{op.legal_name || 'Unnamed operator'}</h3>
						{#if op.relationship}
							<span class="badge preset-tonal-primary text-xs flex items-center gap-1 shrink-0">
								<Link2 class="size-3" />
								{op.relationship}
							</span>
						{/if}
					</div>

					<dl class="grid gap-2 text-sm">
						<div class="flex items-center gap-2 min-w-0">
							<Building2 class="size-4 text-surface-500 shrink-0" />
							<span class="truncate font-mono text-xs">{op.operator_id}</span>
						</div>
						{#if op.email}
							<div class="flex items-center gap-2 min-w-0">
								<Mail class="size-4 text-surface-500 shrink-0" />
								<span class="truncate">{op.email}</span>
							</div>
						{/if}
						{#if op.country_id}
							<div class="flex items-center gap-2 min-w-0">
								<MapPin class="size-4 text-surface-500 shrink-0" />
								<span class="truncate">{op.country_id}</span>
							</div>
						{/if}
						{#if op.ogcr_wallet_address}
							<div class="flex items-center gap-2 min-w-0">
								<Wallet class="size-4 text-surface-500 shrink-0" />
								<span class="truncate font-mono text-xs">{op.ogcr_wallet_address}</span>
							</div>
						{/if}
					</dl>
				</a>
			{/each}
		</div>

		<details class="mt-8">
			<summary class="cursor-pointer text-sm text-surface-600-400">Debug: resolved operators</summary>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-xs mt-2">{JSON.stringify(operators, null, 2)}</pre>
		</details>
	{/if}
</div>
