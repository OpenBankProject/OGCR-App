<script lang="ts">
	import type { PageData } from './$types';
	import { Link2, RefreshCw, ExternalLink, HelpCircle } from '@lucide/svelte';
	import ChainHeartbeat from '$lib/components/ChainHeartbeat.svelte';
	import Timestamp from '$lib/components/Timestamp.svelte';
	import { HEARTBEAT_STATES } from '$lib/chain/heartbeat';
	import { totalMirrored } from '$lib/chain/heartbeat';
	import { explorerLinks, shortenHex } from '$lib/chain/explorer';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import type { ChainSection, ChainSectionKey, ChainToken } from '$lib/chain/onChain';

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

	// Balances have no token id and no transaction of their own: the mirror records the
	// holder and the block the balance was read at.
	function tokenColumns(key: ChainSectionKey): TableColumn[] {
		const balance = key === 'balance';
		return [
			...(balance ? [] : [{ key: 'token', header: 'Token', numeric: true, sortable: true }]),
			{ key: 'record', header: balance ? 'Balance' : 'Record', sortable: true },
			{ key: 'refers', header: 'Refers to' },
			{ key: 'owner', header: balance ? 'Holder' : 'Owner' },
			{ key: 'block', header: 'Block', numeric: true, sortable: true },
			...(balance ? [] : [{ key: 'tx', header: 'Transaction' }])
		];
	}

	// Says where each section's rows come from: the blockchain itself, via the mirror
	// OGCR-chain-cache keeps of it in OBP, not the registry's own records.
	function chainSubtitle(section: ChainSection): string {
		return [
			`Read from the blockchain${section.chainId !== null ? ` (chain id ${section.chainId})` : ''}`,
			section.contractAddress ? `contract ${section.contractAddress}` : null,
			'via the OGCR-chain-cache mirror'
		]
			.filter(Boolean)
			.join(', ');
	}

	onMount(() => {
		const seconds = Math.max(status?.interval_seconds || 30, 15);
		const timer = setInterval(refresh, seconds * 1000);
		return () => clearInterval(timer);
	});
</script>

{#snippet cell(row: Record<string, unknown>, column: TableColumn)}
	{@const t = row._token as ChainToken}
	{#if column.key === 'token'}
		<span id={t.anchor ?? undefined} class="chain-token-id">{t.tokenId ?? '—'}</span>
	{:else if column.key === 'record'}
		<div class="chain-record">
			<span class="chain-record__title">{t.title || '—'}</span>
			{#each t.details as d (d.label)}
				<span class="chain-record__detail">{d.label}: {d.value}</span>
			{/each}
			{#if t.publicRecordUrl}
				<a href={t.publicRecordUrl} target="_blank" rel="noopener noreferrer" class="chain-link">
					On-chain record <ExternalLink class="size-3" />
				</a>
			{/if}
		</div>
	{:else if column.key === 'refers'}
		<ul class="chain-links">
			{#each t.links as l, i (i)}
				<li>
					<span class="chain-links__label">{l.label}</span>
					{#if l.href}
						<a
							href={l.href}
							class="chain-link"
							target={l.external ? '_blank' : undefined}
							rel={l.external ? 'noopener noreferrer' : undefined}
						>
							{l.text}{#if l.external}<ExternalLink class="size-3" />{/if}
						</a>
					{:else}
						<span class="chain-links__text" title="Not public">{l.text}</span>
					{/if}
				</li>
			{:else}
				<li>—</li>
			{/each}
		</ul>
	{:else if column.key === 'owner'}
		{#if explorer.address(t.ownerAddress)}
			<a
				href={explorer.address(t.ownerAddress)}
				target="_blank"
				rel="noopener noreferrer"
				class="chain-link chain-mono"
				title={t.ownerAddress}
			>
				{shortenHex(t.ownerAddress, 6, 4)}
			</a>
		{:else}
			<span class="chain-mono" title={t.ownerAddress ?? ''}>{shortenHex(t.ownerAddress, 6, 4)}</span>
		{/if}
	{:else if column.key === 'block'}
		{#if explorer.block(t.blockNumber)}
			<a href={explorer.block(t.blockNumber)} target="_blank" rel="noopener noreferrer" class="chain-link">
				{t.blockNumber}
			</a>
		{:else}
			{t.blockNumber ?? '—'}
		{/if}
	{:else if column.key === 'tx'}
		{#if explorer.tx(t.txHash)}
			<a
				href={explorer.tx(t.txHash)}
				target="_blank"
				rel="noopener noreferrer"
				class="chain-link chain-mono"
				title={t.txHash}
			>
				{shortenHex(t.txHash)}<ExternalLink class="size-3" />
			</a>
		{:else}
			<!-- Full hash in the title so it can still be copied for `cast tx <hash>`
			     without an explorer. -->
			<span class="chain-mono" title={t.txHash ?? ''}>{shortenHex(t.txHash)}</span>
		{/if}
	{/if}
{/snippet}

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

	{#if data.error}
		<div class="card p-6 preset-filled-surface-100-900 border-l-4 border-error-500">
			<h2 class="h4 text-error-500 mb-1">Could not read the chain mirror</h2>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
		</div>
	{/if}

	<!-- Sync status and the last mirror run side by side in one compact card: the
	     tokens below are what the page is for. -->
	<Card padding="m">
		<div class="chain-summary">
			<div class="chain-summary__part">
				<ChainHeartbeat heartbeat={data.heartbeat} compact href={null} />
				<p class="chain-summary__text">{data.heartbeat.message}</p>
				<dl class="chain-facts">
					<div><dt>Head block</dt><dd>{status?.head_block ?? '—'}</dd></div>
					<div><dt>Chain</dt><dd>{status?.chain_id ?? '—'}</dd></div>
					<div><dt>Errors last run</dt><dd>{status?.error_count ?? '—'}</dd></div>
					<div><dt>Stalled after</dt><dd>{data.heartbeat.staleAfterSeconds}s</dd></div>
				</dl>
			</div>
			<div class="chain-summary__part">
				<p class="chain-summary__title">
					Last mirror run
					{#if status?.synced_at}
						<span class="chain-summary__text"><Timestamp iso={status.synced_at} /></span>
					{/if}
				</p>
				<dl class="chain-facts">
					{#each counts as c (c.label)}
						<div><dt>{c.label}</dt><dd>{c.value ?? '—'}</dd></div>
					{/each}
					<div><dt>Total</dt><dd>{totalMirrored(status)}</dd></div>
				</dl>
				{#if status?.mirrored_types}
					<p class="chain-summary__text">
						Mirrors that ran: {status.mirrored_types.split(',').join(', ')}.
					</p>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Every mirrored token, a section per type in chain-of-records order. Each row
	     links to the tokens and off-chain records it refers to; a record that is not
	     public shows its id as plain text (audit report), except parcels, which link to
	     the login-only parcel page. -->
	{#if !explorer.available}
		<p class="chain-note">
			Transactions, blocks and addresses are shown as plain values because no block explorer
			is configured for this chain. Set <code>PUBLIC_CHAIN_EXPLORER_URL</code> to a Blockscout or
			Etherscan-style base URL to turn them into links.
		</p>
	{/if}

	{#each data.sections as section (section.key)}
		<Card
			id="section-{section.key}"
			title="{section.title} on chain {section.chainId ?? ''}"
			subtitle={chainSubtitle(section)}
			headingLevel={2}
			padding="l"
		>
			{@const about = data.about[section.key] ?? []}
			{#if about.length > 0}
				<!-- From the entity definitions: what the record is, then how its chain copy is kept. -->
				<div class="chain-about">
					{#each about as a (a.entity)}
						<p>
							{#if a.href}
								<a
									href={a.href}
									target="_blank"
									rel="noopener"
									class="chain-about__label chain-link"
									title="{a.entity} definition in API Manager"
								>
									{a.entity}<ExternalLink class="size-3" aria-label="(opens in a new tab)" />
								</a>
							{:else}
								<span class="chain-about__label">{a.entity}</span>
							{/if}
							{a.text}
						</p>
					{/each}
				</div>
			{/if}
			<Table
				columns={tokenColumns(section.key)}
				rows={section.tokens.map((t) => ({
					token: t.tokenId,
					record: t.title,
					refers: t.links.map((l) => l.text).join(' '),
					owner: t.ownerAddress,
					block: t.blockNumber,
					tx: t.txHash,
					_token: t
				}))}
				regionLabel="{section.title} on chain"
				emptyMessage="None on chain yet"
				{cell}
			/>
		</Card>
	{/each}

	<!-- The heartbeat names its state in a short phrase ("Chain partial sync")
	     that says little on its own; this spells each one out. When the status
	     record could not be read, the heartbeat above is a placeholder, so no
	     state is marked as current. -->
	<div class="card p-6 preset-filled-surface-100-900">
		<h2 class="h4 mb-1">What the chain status means</h2>
		<p class="text-surface-600-400 text-sm mb-4">
			The app does not talk to the chain directly. OGCR-chain-cache copies chain state into
			OBP on a schedule and writes a sync record at the end of every run; the chain status is
			read from that record.
		</p>
		<dl class="space-y-3 text-sm">
			{#each Object.entries(HEARTBEAT_STATES) as [state, { label, meaning }] (state)}
				{@const current = !data.error && state === data.heartbeat.state}
				<div
					class="rounded p-3 {current ? 'border-2 border-primary-500 bg-primary-500/10' : 'border border-surface-300-700'}"
					aria-current={current ? 'true' : undefined}
				>
					<dt class="font-semibold">
						{label}
						{#if current}<span class="ml-2 text-xs font-normal text-primary-600-400">(current)</span>{/if}
					</dt>
					<dd class="text-surface-600-400 mt-1">{meaning}</dd>
				</div>
			{/each}
		</dl>
	</div>
</div>

<style>
	.chain-summary {
		display: grid;
		gap: var(--space-m);
	}
	@media (min-width: 768px) {
		.chain-summary {
			grid-template-columns: 1fr 1fr;
		}
	}
	.chain-summary__part {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
	}
	.chain-summary__title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-xs);
		font-size: var(--font-size-s);
		font-weight: 500;
		color: var(--text-primary);
	}
	.chain-summary__text {
		font-size: var(--font-size-s);
		font-weight: 400;
		color: var(--text-secondary);
	}
	.chain-facts {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2xs) var(--space-m);
		font-size: var(--font-size-s);
	}
	.chain-facts div {
		display: flex;
		gap: var(--space-2xs);
	}
	.chain-facts dt {
		color: var(--text-secondary);
	}
	.chain-facts dd {
		color: var(--text-primary);
		font-weight: 500;
	}
	.chain-about {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		font-size: var(--font-size-s);
		color: var(--text-neutral);
	}
	.chain-about__label {
		font-family: var(--font-family-mono);
		color: var(--text-secondary);
	}
	.chain-about__label::after {
		content: ':';
	}
	.chain-note {
		font-size: var(--font-size-s);
		color: var(--text-secondary);
	}
	.chain-token-id {
		/* Linked to from other rows: leave room above it when the page scrolls there. */
		scroll-margin-top: var(--space-xl);
	}
	.chain-record,
	.chain-links {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
	}
	.chain-record__title {
		color: var(--text-primary);
		font-weight: 500;
	}
	.chain-record__detail,
	.chain-links__label {
		font-size: var(--font-size-s);
		color: var(--text-secondary);
	}
	.chain-links__label::after {
		content: ': ';
	}
	.chain-links__text {
		color: var(--text-neutral);
	}
	.chain-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2xs);
		color: var(--interaction-primary-default);
		text-decoration: underline;
	}
	.chain-mono {
		font-family: var(--font-family-mono);
		font-size: var(--font-size-s);
	}

	/* Dark mode: the design system has no dark palette, so fall back to the Skeleton
	   dark surfaces, as Card does. */
	:global([data-mode='dark']) .chain-about {
		color: var(--color-surface-300);
	}
	:global([data-mode='dark']) .chain-about__label,
	:global([data-mode='dark']) .chain-note,
	:global([data-mode='dark']) .chain-record__detail,
	:global([data-mode='dark']) .chain-links__label {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .chain-summary__text,
	:global([data-mode='dark']) .chain-facts dt {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .chain-summary__title,
	:global([data-mode='dark']) .chain-facts dd {
		color: var(--color-surface-50);
	}
	:global([data-mode='dark']) .chain-record__title {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .chain-links__text {
		color: var(--color-surface-300);
	}
</style>
