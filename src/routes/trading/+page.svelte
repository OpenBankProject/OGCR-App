<script lang="ts">
	import type { PageData } from './$types';
	import { TrendingUp, ChevronRight, Landmark, HelpCircle } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import CurrentBankPicker from '$lib/components/CurrentBankPicker.svelte';

	let { data }: { data: PageData } = $props();

	interface TradingAccount {
		bank_id: string;
		account_id: string;
		label?: string;
		account_type?: string;
		views?: { view_id: string; short_name?: string }[];
	}

	let bankId = $state(untrack(() => data.defaults.bank_id));
	let accountId = $state(untrack(() => data.defaults.account_id));
	let viewId = $state(untrack(() => data.defaults.view_id || 'owner'));

	let showAllBanks = $state(false);

	let allAccounts = $derived((data.accounts ?? []) as TradingAccount[]);
	let visibleAccounts = $derived(
		showAllBanks ? allAccounts : allAccounts.filter((acc) => acc.bank_id === bankId)
	);
	let hiddenCount = $derived(allAccounts.length - visibleAccounts.length);

	function tradingUrl(b: string, a: string, v: string) {
		return `/trading/banks/${encodeURIComponent(b)}/accounts/${encodeURIComponent(a)}/views/${encodeURIComponent(v)}/offers`;
	}

	function go(e: Event) {
		e.preventDefault();
		const b = bankId.trim();
		const a = accountId.trim();
		const v = viewId.trim();
		if (!b || !a || !v) return;
		goto(tradingUrl(b, a, v));
	}

	function pickAccount(b: string, a: string, v: string) {
		bankId = b;
		accountId = a;
		viewId = v;
		goto(tradingUrl(b, a, v));
	}
</script>

<div class="p-8">
	<div class="flex flex-wrap items-center gap-4 mb-8">
		<TrendingUp class="size-8 text-primary-500" />
		<h1 class="h1">Trading</h1>
		<a href="/trading/help" class="anchor inline-flex items-center gap-1 text-sm">
			<HelpCircle class="size-4" /> How it works
		</a>
		{#if data.isAuthenticated}
			<div class="ms-auto">
				<CurrentBankPicker
					banks={data.banks}
					selectedBankId={bankId}
					onSelect={(b) => (bankId = b)}
					compact
				/>
			</div>
		{/if}
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<TrendingUp class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to access trading.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else}
		<div class="space-y-8">
			<section class="card p-8 preset-filled-surface-100-900">
				<div class="flex flex-wrap items-center justify-between gap-4 mb-2">
					<h2 class="h3">Your Accounts</h2>
					{#if allAccounts.length > 0}
						<button
							type="button"
							class="btn btn-sm preset-tonal-primary"
							onclick={() => (showAllBanks = !showAllBanks)}
						>
							{showAllBanks ? 'Show only current bank' : 'Show all banks'}
						</button>
					{/if}
				</div>
				<p class="text-surface-600-400 mb-6">
					{#if showAllBanks}
						Accounts across all your banks. Pick an account and view to open the trading screens.
					{:else}
						Accounts at <span class="font-mono">{bankId || '—'}</span>. Pick an account and view to
						open the trading screens.
					{/if}
				</p>

				{#if data.error}
					<div class="card p-4 preset-filled-error-500 mb-4">
						<p class="font-semibold">Could not load accounts</p>
						<p class="text-sm">{data.error}</p>
					</div>
				{/if}

				{#if visibleAccounts.length > 0}
					<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each visibleAccounts as acc (acc.bank_id + ':' + acc.account_id)}
							{@const offers = data.activity?.[acc.bank_id + ':' + acc.account_id]?.offers}
							<li class="card p-4 preset-filled-surface-50-950">
								<div class="flex items-start gap-4">
									<Landmark class="size-6 text-primary-500 shrink-0 mt-1" />
									<div class="flex-1 min-w-0">
										<div class="flex items-baseline gap-2 flex-wrap">
											<span class="font-semibold truncate">{acc.label || acc.account_id}</span>
											{#if acc.account_type}
												<span class="badge preset-filled-surface-200-800 text-xs"
													>{acc.account_type}</span
												>
											{/if}
											{#if offers && offers > 0}
												<span
													class="badge preset-filled-success-500 text-xs"
													title="This account has trading offers"
												>
													<TrendingUp class="size-3" />
													{offers} offer{offers === 1 ? '' : 's'}
												</span>
											{:else if offers === 0}
												<span class="badge preset-tonal-surface text-xs">No trading activity</span>
											{/if}
										</div>
										<div class="text-sm text-surface-600-400 mt-1">
											<div><span class="font-mono">bank:</span> {acc.bank_id}</div>
											<div><span class="font-mono">account_id:</span> {acc.account_id}</div>
										</div>
										{#if acc.views && acc.views.length > 0}
											{@const ownerView = acc.views.find((v) => v.view_id === 'owner')}
											{@const otherViews = acc.views.filter((v) => v.view_id !== 'owner')}
											<div class="mt-3 space-y-2">
												{#if ownerView}
													<button
														type="button"
														class="btn btn-sm preset-filled-primary-500"
														onclick={() =>
															pickAccount(acc.bank_id, acc.account_id, ownerView.view_id)}
													>
														<span>Open as {ownerView.short_name || ownerView.view_id}</span>
														<ChevronRight class="size-4" />
													</button>
												{/if}
												{#if otherViews.length > 0}
													<details class="text-sm">
														<summary
															class="cursor-pointer text-surface-600-400 hover:text-surface-900-100 select-none"
														>
															Other views ({otherViews.length})
														</summary>
														<div class="flex flex-wrap gap-2 mt-2">
															{#each otherViews as v (v.view_id)}
																<button
																	type="button"
																	class="btn btn-sm preset-outlined-primary-500"
																	onclick={() => pickAccount(acc.bank_id, acc.account_id, v.view_id)}
																>
																	<span>Open as {v.short_name || v.view_id}</span>
																	<ChevronRight class="size-4" />
																</button>
															{/each}
														</div>
													</details>
												{/if}
											</div>
										{/if}
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{:else if allAccounts.length === 0}
					<p class="text-surface-600-400">No accounts found for your user.</p>
				{:else}
					<p class="text-surface-600-400">
						No accounts at <span class="font-mono">{bankId || '—'}</span>.
						{#if hiddenCount > 0}
							<button
								type="button"
								class="anchor"
								onclick={() => (showAllBanks = true)}
							>
								Show {hiddenCount} account{hiddenCount === 1 ? '' : 's'} at other banks
							</button>
						{/if}
					</p>
				{/if}
			</section>

			<section class="card p-8 preset-filled-surface-100-900">
				<h2 class="h3 mb-2">Or enter IDs manually</h2>
				<p class="text-surface-600-400 mb-6">
					Trading endpoints are scoped to a specific bank, account and view.
				</p>

				<form onsubmit={go} class="space-y-6">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<label class="label">
							<span class="label-text">Bank ID *</span>
							<input
								type="text"
								bind:value={bankId}
								class="input"
								placeholder="e.g., gh.29.uk"
								required
							/>
						</label>

						<label class="label">
							<span class="label-text">Account ID *</span>
							<input
								type="text"
								bind:value={accountId}
								class="input"
								placeholder="e.g., 8ca8a7e4-6d02-40e3-a129-0b2bf89de9f0"
								required
							/>
						</label>

						<label class="label">
							<span class="label-text">View ID *</span>
							<input
								type="text"
								bind:value={viewId}
								class="input"
								placeholder="e.g., owner"
								required
							/>
						</label>
					</div>

					<button type="submit" class="btn preset-filled-primary-500">
						<span>Open Trading</span>
						<ChevronRight class="size-4" />
					</button>
				</form>
			</section>
		</div>
	{/if}
</div>
