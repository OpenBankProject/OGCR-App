<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Send, ArrowLeft, Copy, Check } from '@lucide/svelte';
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
	<Send class="size-6 text-primary-500" />
	<h2 class="h2">Request Withdrawal</h2>
</div>

{#if !data.isAuthenticated}
	<div class="card p-8 preset-filled-surface-100-900 text-center">
		<a href="/login" class="btn preset-filled-primary-500">Login</a>
	</div>
{:else if form?.success}
	<div class="card p-8 preset-filled-surface-100-900 mb-6">
		<h2 class="h3 mb-2 text-success-500">Withdrawal Requested</h2>
		<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.response, null, 2)}</pre>
		{#if form.response?.required_confirmations}
			<p class="text-sm text-surface-600-400 mt-4">
				Required confirmations: <strong>{form.response.required_confirmations}</strong>
			</p>
		{/if}
		<a href="{ctxBase}/market" class="btn preset-filled-primary-500 mt-4">Back to Market</a>
	</div>
{:else}
	{#if form?.error}
		<div class="card p-8 preset-filled-surface-100-900 mb-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="h3 text-error-500">Withdrawal Failed</h2>
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
				<label class="label md:col-span-2">
					<span class="label-text">Blockchain Address *</span>
					<input
						type="text"
						name="address"
						value={v('address')}
						class="input font-mono"
						placeholder="e.g., 0xdestination..."
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
						placeholder="e.g., 50.0"
						required
					/>
				</label>

				<label class="label">
					<span class="label-text">Settlement Account ID *</span>
					<input
						type="text"
						name="settlement_account_id"
						value={v('settlement_account_id')}
						class="input"
						placeholder="e.g., account-123"
						required
					/>
				</label>
			</div>

			<button type="submit" class="btn preset-filled-primary-500" disabled={submitting}>
				{submitting ? 'Submitting…' : 'Request Withdrawal'}
			</button>
		</form>
	</div>
{/if}
