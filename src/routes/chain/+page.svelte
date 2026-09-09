<script lang="ts">
	import type { PageData } from './$types';
	import { Link2, RefreshCw, ExternalLink, HelpCircle } from '@lucide/svelte';
	import ChainHeartbeat from '$lib/components/ChainHeartbeat.svelte';
	import { totalMirrored } from '$lib/chain/heartbeat';
	import { explorerLinks, shortenHex } from '$lib/chain/explorer';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let status = $derived(data.heartbeat.status);
	let explorer = $derived(explorerLinks(data.explorerBase));

	let counts = $derived([
		{ label: 'Parcels', value: status?.parcel_count },
		{ label: 'Activities', value: status?.activity_count },
		{ label: 'Certifications', value: status?.certification_count },
		{ label: 'Credit batches', value: status?.credit_batch_count },
		{ label: 'Credit balances', value: status?.credit_balance_count }
	]);

	// A heartbeat that only updates on reload is not much of a heartbeat, so the
	// page re-reads itself. It follows the mirror's own cadence when the mirror
	// declares one, and never polls faster than every 15s.
	let refreshing = $state(false);
	async function refresh() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		const seconds = Math.max(status?.interval_seconds || 30, 15);
		const timer = setInterval(refresh, seconds * 1000);
		return () => clearInterval(timer);
	});
</script>

<div class="p-8 space-y-6">
	<div class="flex items-center gap-4">
		<Link2 class="size-8 text-primary-500" />
		<h1 class="h1">Chain</h1>
		<a href="/help" class="anchor inline-flex items-center gap-1 text-sm ml-auto">
			<HelpCircle class="size-4" /> How tokens work
		</a>
		<button class="btn btn-sm preset-outlined-surface-500" onclick={refresh} disabled={refreshing}>
			<RefreshCw class="size-4 {refreshing ? 'animate-spin' : ''}" />
			<span>Refresh</span>
		</button>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to see the chain connection.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else}
		{#if data.error}
			<div class="card p-6 preset-filled-surface-100-900 border-l-4 border-error-500">
				<h2 class="h4 text-error-500 mb-1">Could not read the chain mirror</h2>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
			</div>
		{/if}

		<ChainHeartbeat heartbeat={data.heartbeat} />

		<div class="card p-6 preset-filled-surface-100-900">
			<h2 class="h4 mb-1">Last mirror run</h2>
			<p class="text-surface-600-400 text-sm mb-4">
				Records written by OGCR-chain-cache on its most recent pass.
				{#if status?.mirrored_types}
					Mirrors that ran: {status.mirrored_types.split(',').join(', ')}.
				{/if}
			</p>
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
				{#each counts as c}
					<div class="p-3 rounded bg-surface-200-800">
						<div class="text-xs text-surface-500">{c.label}</div>
						<div class="text-2xl font-semibold">{c.value ?? '—'}</div>
					</div>
				{/each}
			</div>
			<p class="text-xs text-surface-500 mt-3">{totalMirrored(status)} records in total.</p>
		</div>

		<div class="card p-6 preset-filled-surface-100-900">
			<h2 class="h4 mb-1">Recent chain activity</h2>
			<p class="text-surface-600-400 text-sm mb-4">
				Newest mirrored tokens, by the block they were minted in. A short list with an
				old newest block is a quiet chain, not a broken one — the connection status
				above is the thing to trust for that.
			</p>

			{#if !explorer.available}
				<p class="text-xs text-surface-500 mb-4">
					Transactions and blocks are shown as plain values because no block explorer is
					configured for this chain. Set <code>PUBLIC_CHAIN_EXPLORER_URL</code> to a
					Blockscout or Etherscan-style base URL to turn them into links.
				</p>
			{/if}

			{#if data.events.length === 0}
				<p class="text-surface-500">No tokens have been mirrored yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Type</th>
								<th>Identifier</th>
								<th>Token</th>
								<th>Owner</th>
								<th>Block</th>
								<th>Transaction</th>
							</tr>
						</thead>
						<tbody>
							{#each data.events as e}
								<tr>
									<td><span class="badge preset-tonal-primary">{e.kind}</span></td>
									<td>
										{#if e.href}
											<!-- A page in this app is the most useful destination. -->
											<a href={e.href} class="anchor">{e.label}</a>
										{:else if e.registryUrl}
											<!-- No page for this record, so fall back to the registry
											     URL the token itself carries on-chain. -->
											<a
												href={e.registryUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="anchor inline-flex items-center gap-1"
												title="Registry record for {e.label}"
											>
												{e.label}
												<ExternalLink class="size-3" />
											</a>
										{:else}
											{e.label}
										{/if}
									</td>
									<td>{e.tokenId ?? '—'}</td>
									<td class="font-mono text-xs">
										{#if explorer.address(e.ownerAddress)}
											<a
												href={explorer.address(e.ownerAddress)}
												target="_blank"
												rel="noopener noreferrer"
												class="anchor"
												title={e.ownerAddress}
											>
												{shortenHex(e.ownerAddress, 6, 4)}
											</a>
										{:else}
											<span title={e.ownerAddress ?? ''}>{shortenHex(e.ownerAddress, 6, 4)}</span>
										{/if}
									</td>
									<td>
										{#if explorer.block(e.blockNumber)}
											<a
												href={explorer.block(e.blockNumber)}
												target="_blank"
												rel="noopener noreferrer"
												class="anchor"
											>
												{e.blockNumber}
											</a>
										{:else}
											{e.blockNumber ?? '—'}
										{/if}
									</td>
									<td class="font-mono text-xs">
										{#if explorer.tx(e.txHash)}
											<a
												href={explorer.tx(e.txHash)}
												target="_blank"
												rel="noopener noreferrer"
												class="anchor inline-flex items-center gap-1"
												title={e.txHash}
											>
												{shortenHex(e.txHash)}
												<ExternalLink class="size-3" />
											</a>
										{:else}
											<!-- Full hash in the title so it can still be copied for
											     `cast tx <hash>` without an explorer. -->
											<span title={e.txHash ?? ''}>{shortenHex(e.txHash)}</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>
