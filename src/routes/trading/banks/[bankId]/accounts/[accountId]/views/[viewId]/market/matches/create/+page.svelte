<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Handshake, ArrowLeft, Copy, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);
	let submitting = $state(false);

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
	<a href="{ctxBase}/market" class="btn preset-outlined-surface-500">
		<ArrowLeft class="size-4" />
		<span>Back</span>
	</a>
	<Handshake class="size-6 text-primary-500" />
	<h2 class="h2">Create Market Match</h2>
</div>

{#if !data.isAuthenticated}
	<div class="card p-8 preset-filled-surface-100-900 text-center">
		<a href="/login" class="btn preset-filled-primary-500">Login</a>
	</div>
{:else if form?.success}
	<div class="card p-8 preset-filled-surface-100-900 mb-6">
		<h2 class="h3 mb-2 text-success-500">Match Created</h2>
		<p class="text-surface-600-400 mb-4">A trade was auto-created from this match.</p>
		<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.response, null, 2)}</pre>
		<div class="flex gap-2 mt-4">
			<a href="{ctxBase}/market" class="btn preset-filled-primary-500">Back to Market</a>
			{#if form.response?.match_id}
				<span class="self-center text-sm text-surface-600-400">
					Match ID: <code>{form.response.match_id}</code>
				</span>
			{/if}
		</div>
	</div>
{:else}
	{#if form?.error}
		<div class="card p-8 preset-filled-surface-100-900 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="h3 text-error-500">Error Creating Match</h2>
				{#if form.errorDetails}
					<button onclick={copyErrorDetails} class="btn preset-outlined-surface-500 btn-sm">
						{#if copied}<Check class="size-4 text-success-500" /><span>Copied</span>
						{:else}<Copy class="size-4" /><span>Copy</span>{/if}
					</button>
				{/if}
			</div>
			{#if form.errorDetails}
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.errorDetails.response, null, 2)}</pre>
			{:else}
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{form.error}</pre>
			{/if}
		</div>
	{/if}

	<div class="card p-8 preset-filled-surface-100-900">
		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="space-y-6"
		>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<label class="label">
					<span class="label-text">Order ID *</span>
					<input
						type="text"
						name="order_id"
						value={v('order_id')}
						class="input"
						placeholder="e.g., order-123"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Counter Order ID *</span>
					<input
						type="text"
						name="counter_order_id"
						value={v('counter_order_id')}
						class="input"
						placeholder="e.g., order-456"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Price *</span>
					<input
						type="number"
						step="any"
						name="price"
						value={v('price')}
						class="input"
						placeholder="e.g., 25.0"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Amount *</span>
					<input
						type="number"
						step="any"
						name="amount"
						value={v('amount')}
						class="input"
						placeholder="e.g., 5.0"
						required
					/>
				</label>
			</div>

			<button type="submit" class="btn preset-filled-primary-500" disabled={submitting}>
				{submitting ? 'Creating…' : 'Create Match'}
			</button>
		</form>
	</div>
{/if}
