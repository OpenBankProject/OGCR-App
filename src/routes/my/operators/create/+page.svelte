<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Building2, ArrowLeft, CheckCircle2, AlertTriangle } from '@lucide/svelte';
	import ReferenceSelect from '$lib/components/ReferenceSelect.svelte';
	import { countryOptions } from '$lib/reference/options';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function v(field: string): string {
		return form?.values?.[field] ?? '';
	}
</script>

<div class="p-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/my/operators" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</a>
		<Building2 class="size-8 text-primary-500" />
		<h1 class="h1">Create Operator</h1>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Building2 class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to create an operator.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if form?.success}
		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			{#if form.linked}
				<div class="flex items-center gap-2 mb-2">
					<CheckCircle2 class="size-6 text-success-500" />
					<h2 class="h3 text-success-500">Operator created and linked to you</h2>
				</div>
				<p class="text-surface-600-400 mb-4">
					Your user is now linked to this operator
					{#if form.relationship?.relationship}as <strong>{form.relationship.relationship}</strong>{/if}.
					It will appear under <a href="/my/operators" class="anchor">My Operators</a>, and its
					activities can be listed via <a href="/activities/list" class="anchor">List Activity</a>.
				</p>
			{:else}
				<div class="flex items-center gap-2 mb-2">
					<AlertTriangle class="size-6 text-warning-500" />
					<h2 class="h3 text-warning-500">Operator created, but not linked</h2>
				</div>
				<p class="text-surface-600-400 mb-2">
					The operator was created, but linking it to your user failed. You can retry the link, or
					do it manually in the API Manager.
				</p>
				{#if form.linkError}
					<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm mb-4">{form.linkError}</pre>
				{/if}
			{/if}
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.operator, null, 2)}</pre>
			<div class="flex gap-2 mt-4">
				<a href="/my/operators" class="btn preset-filled-primary-500">My Operators</a>
				<a href="/my/operators/create" class="btn preset-outlined-surface-500">Create another</a>
			</div>
		</div>
	{:else}
		{#if form?.error}
			<div class="card p-6 preset-filled-surface-100-900 mb-6 border-l-4 border-error-500 max-w-2xl">
				<h2 class="h4 text-error-500 mb-1">Error creating operator</h2>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{form.error}</pre>
			</div>
		{/if}

		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			<form method="POST" use:enhance class="space-y-6">
				<label class="label">
					<span class="label-text">Legal name *</span>
					<input
						type="text"
						name="legal_name"
						value={v('legal_name')}
						class="input"
						placeholder="e.g., Agreena"
						required
					/>
				</label>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label class="label">
						<span class="label-text">Email</span>
						<input
							type="email"
							name="email"
							value={v('email') || data.userEmail}
							class="input"
							placeholder="contact@example.com"
						/>
					</label>
					<label class="label">
						<span class="label-text">Phone</span>
						<input type="text" name="phone" value={v('phone')} class="input" placeholder="+49 123 456 789" />
					</label>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<label class="label">
						<span class="label-text">Address line 1</span>
						<input type="text" name="address_line_1" value={v('address_line_1')} class="input" placeholder="Street, number" />
					</label>
					<label class="label">
						<span class="label-text">Address line 2</span>
						<input type="text" name="address_line_2" value={v('address_line_2')} class="input" placeholder="Suite, unit (optional)" />
					</label>
					<label class="label">
						<span class="label-text">Postcode</span>
						<input type="text" name="postcode" value={v('postcode')} class="input" placeholder="e.g., 10115" />
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
						placeholder="0x…"
					/>
				</label>

				<label class="label">
					<span class="label-text">Your relationship to this operator</span>
					<input
						type="text"
						name="relationship"
						value={v('relationship') || 'Owner'}
						class="input"
						placeholder="e.g., Owner, Managing Director"
					/>
					<span class="text-xs text-surface-500">
						Links your user to the operator (user → operator). Defaults to "Owner".
					</span>
				</label>

				<button type="submit" class="btn preset-filled-primary-500">Create Operator</button>
			</form>
		</div>
	{/if}
</div>
