<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Tag, ArrowLeft, Copy, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);

	const ctxBase = $derived(
		`/trading/banks/${encodeURIComponent(data.ctx.bankId)}/accounts/${encodeURIComponent(data.ctx.accountId)}/views/${encodeURIComponent(data.ctx.viewId)}`
	);

	function v(field: string): string {
		return form?.values?.[field] ?? '';
	}

	async function copyErrorDetails() {
		if (!form?.errorDetails) return;
		const errorText = `API Request:\n${JSON.stringify(form.errorDetails.request, null, 2)}\n\nAPI Response:\n${JSON.stringify(form.errorDetails.response, null, 2)}`;
		await navigator.clipboard.writeText(errorText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex items-center gap-4 mb-6">
	<a href="{ctxBase}/offers" class="btn preset-outlined-surface-500">
		<ArrowLeft class="size-4" />
		<span>Back</span>
	</a>
	<Tag class="size-6 text-primary-500" />
	<h2 class="h2">Create Trading Offer</h2>
</div>

{#if !data.isAuthenticated}
	<div class="card p-8 preset-filled-surface-100-900 text-center">
		<Tag class="size-16 mx-auto mb-4 text-surface-400" />
		<h2 class="h3 mb-2">Authentication Required</h2>
		<a href="/login" class="btn preset-filled-primary-500">Login</a>
	</div>
{:else if form?.success}
	<div class="card p-8 preset-filled-surface-100-900 mb-6">
		<h2 class="h3 mb-2 text-success-500">Offer Created</h2>
		<p class="text-surface-600-400 mb-4">API Response:</p>
		<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.response, null, 2)}</pre>
		<div class="flex gap-2 mt-4">
			<a href="{ctxBase}/offers" class="btn preset-filled-primary-500">View All Offers</a>
			{#if form.response?.offer_id}
				<a
					href="{ctxBase}/offers/{form.response.offer_id}"
					class="btn preset-outlined-primary-500"
				>
					View New Offer
				</a>
			{/if}
		</div>
	</div>
{:else}
	{#if form?.error}
		<div class="card p-8 preset-filled-surface-100-900 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="h3 text-error-500">Error Creating Offer</h2>
				{#if form.errorDetails}
					<button
						onclick={copyErrorDetails}
						class="btn preset-outlined-surface-500 btn-sm"
						title="Copy error details"
					>
						{#if copied}
							<Check class="size-4 text-success-500" />
							<span>Copied</span>
						{:else}
							<Copy class="size-4" />
							<span>Copy</span>
						{/if}
					</button>
				{/if}
			</div>
			{#if form.errorDetails}
				<div class="space-y-4">
					<div>
						<p class="text-surface-600-400 mb-2 font-semibold">API Request:</p>
						<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.errorDetails.request, null, 2)}</pre>
					</div>
					<div>
						<p class="text-surface-600-400 mb-2 font-semibold">API Response:</p>
						<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.errorDetails.response, null, 2)}</pre>
					</div>
				</div>
			{:else}
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{form.error}</pre>
			{/if}
		</div>
	{/if}

	<div class="card p-8 preset-filled-surface-100-900">
		<form method="POST" use:enhance class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<label class="label">
					<span class="label-text">Offer Type *</span>
					<select name="offer_type" class="select" required>
						<option value="BUY" selected={v('offer_type') !== 'SELL'}>BUY</option>
						<option value="SELL" selected={v('offer_type') === 'SELL'}>SELL</option>
					</select>
				</label>

				<label class="label">
					<span class="label-text">Asset Code *</span>
					<input
						type="text"
						name="asset_code"
						value={v('asset_code') || 'OGCR'}
						class="input"
						placeholder="e.g., OGCR"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Asset Amount *</span>
					<input
						type="number"
						step="any"
						name="asset_amount"
						value={v('asset_amount')}
						class="input"
						placeholder="e.g., 100"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Price Currency *</span>
					<input
						type="text"
						name="price_currency"
						value={v('price_currency') || 'EUR'}
						class="input"
						placeholder="e.g., EUR"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Price Amount *</span>
					<input
						type="number"
						step="any"
						name="price_amount"
						value={v('price_amount')}
						class="input"
						placeholder="e.g., 1.50"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Settlement Account *</span>
					{#if data.accountsError}
						<input
							type="text"
							name="settlement_account_id"
							value={v('settlement_account_id') || data.ctx.accountId}
							class="input"
							placeholder="account_id"
							required
						/>
						<span class="text-warning-500 text-sm mt-1"
							>Could not load your accounts ({data.accountsError}). Enter an account_id manually.</span
						>
					{:else}
						{@const selected = v('settlement_account_id') || data.ctx.accountId}
						<select name="settlement_account_id" class="select" required>
							{#each data.settlementAccounts as acc (acc.account_id)}
								<option value={acc.account_id} selected={acc.account_id === selected}>
									{acc.label ? `${acc.label} — ${acc.account_id}` : acc.account_id}
								</option>
							{/each}
						</select>
						<span class="text-surface-600-400 text-sm mt-1"
							>Cash account at {data.ctx.bankId} where EUR is debited (BUY) or credited (SELL).</span
						>
					{/if}
				</label>

				<label class="label">
					<span class="label-text">Expiry Datetime</span>
					<input
						type="datetime-local"
						name="expiry_datetime"
						value={v('expiry_datetime')}
						class="input"
					/>
				</label>

				<label class="label">
					<span class="label-text">Minimum Fill</span>
					<input
						type="number"
						step="any"
						name="minimum_fill"
						value={v('minimum_fill')}
						class="input"
						placeholder="optional"
					/>
				</label>
			</div>

			<button type="submit" class="btn preset-filled-primary-500">Create Offer</button>
		</form>
	</div>
{/if}
