<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Building2, ArrowLeft, Lock, CheckCircle2 } from '@lucide/svelte';
	import ReferenceSelect from '$lib/components/ReferenceSelect.svelte';
	import { countryOptions } from '$lib/reference/options';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const operator = $derived((data.operator ?? {}) as Record<string, string | undefined>);

	// On error, prefer the just-submitted value; otherwise the loaded operator record.
	function v(field: string): string {
		return form?.values?.[field] ?? operator[field] ?? '';
	}
</script>

<div class="p-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/my/operators" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</a>
		<Building2 class="size-8 text-primary-500" />
		<h1 class="h1">Edit Operator</h1>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Building2 class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-surface-100-900">
			<h2 class="h3 text-error-500 mb-2">Something went wrong</h2>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
		</div>
	{:else if !data.owned}
		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			<div class="flex items-start gap-3">
				<Lock class="size-6 text-warning-500 shrink-0 mt-1" />
				<div>
					<h2 class="h3 mb-2">You can't edit this operator</h2>
					<p class="text-surface-600-400">
						This operator isn't linked to your user, so it's not yours to edit.
					</p>
					<a href="/operators/{page.params.operatorId}" class="btn btn-sm preset-outlined-primary-500 mt-4">
						View public operator page
					</a>
				</div>
			</div>
		</div>
	{:else}
		{#if form?.success}
			<div class="card p-6 preset-filled-surface-100-900 mb-6 border-l-4 border-success-500 max-w-2xl">
				<div class="flex items-center gap-2">
					<CheckCircle2 class="size-5 text-success-500" />
					<h2 class="h4 text-success-500">Operator saved</h2>
				</div>
			</div>
		{:else if form?.error}
			<div class="card p-6 preset-filled-surface-100-900 mb-6 border-l-4 border-error-500 max-w-2xl">
				<h2 class="h4 text-error-500 mb-1">Couldn't save</h2>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{form.error}</pre>
			</div>
		{/if}

		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			<p class="text-xs text-surface-500 mb-6">
				Operator ID: <span class="font-mono">{operator.operator_id}</span>
			</p>
			<form method="POST" action="?/update" use:enhance class="space-y-6">
				<label class="label">
					<span class="label-text">Legal name *</span>
					<input type="text" name="legal_name" value={v('legal_name')} class="input" required />
				</label>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label class="label">
						<span class="label-text">Email</span>
						<input type="email" name="email" value={v('email')} class="input" />
					</label>
					<label class="label">
						<span class="label-text">Phone</span>
						<input type="text" name="phone" value={v('phone')} class="input" />
					</label>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label class="label">
						<span class="label-text">Address line 1</span>
						<input type="text" name="address_line_1" value={v('address_line_1')} class="input" />
					</label>
					<label class="label">
						<span class="label-text">Address line 2</span>
						<input type="text" name="address_line_2" value={v('address_line_2')} class="input" />
					</label>
					<label class="label">
						<span class="label-text">Postcode</span>
						<input type="text" name="postcode" value={v('postcode')} class="input" />
					</label>
					<label class="label">
						<span class="label-text">Country</span>
						<ReferenceSelect
							name="country_id"
							value={v('country_id')}
							options={countryOptions(data.countries)}
							emptyLabel="Select a country…"
							placeholder="e.g., DE"
							fallbackHint="The country list could not be loaded — enter the country code directly."
						/>
					</label>
				</div>

				<label class="label">
					<span class="label-text">OGCR wallet address</span>
					<input
						type="text"
						name="ogcr_wallet_address"
						value={v('ogcr_wallet_address')}
						class="input font-mono text-sm"
					/>
				</label>

				<label class="label">
					<span class="label-text">Your relationship to this operator</span>
					<input type="text" name="relationship" value={v('relationship')} class="input" placeholder="e.g., Owner" />
					<span class="text-xs text-surface-500">Updates the user → operator link.</span>
				</label>

				<button type="submit" class="btn preset-filled-primary-500">Save changes</button>
			</form>
		</div>
	{/if}
</div>
