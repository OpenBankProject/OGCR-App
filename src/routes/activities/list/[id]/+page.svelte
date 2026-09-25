<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Store, ArrowLeft, Lock, Info } from '@lucide/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const activity = $derived((data.activity ?? {}) as Record<string, unknown>);
	const listing = $derived(data.listing);

	function reg(field: string): string {
		const v = activity[field];
		return v == null ? '' : String(v);
	}

	// Marketing fields: prefer the saved listing overlay, fall back to the
	// registry value so the operator starts from the registry's presentation.
	function marketing(field: 'summary' | 'image' | 'media_links' | 'website'): string {
		return (listing?.[field] as string | undefined) ?? reg(field);
	}

	// Registry-authoritative fields, shown read-only.
	const readOnlyFields: Array<{ label: string; field: string }> = [
		{ label: 'Activity ID', field: 'activity_id' },
		{ label: 'Name', field: 'name' },
		{ label: 'Description', field: 'description' },
		{ label: 'Operator ID', field: 'operator_id' },
		{ label: 'Type', field: 'activity_type' },
		{ label: 'Technologies, practices & processes', field: 'technologies_practices_processes_id' },
		{ label: 'Cobenefits', field: 'cobenefits' },
		{ label: 'Methodologies', field: 'methodologies' },
		{ label: 'City', field: 'city' },
		{ label: 'Country', field: 'country_id' },
		{ label: 'Start date', field: 'start_date' },
		{ label: 'End date', field: 'end_date' },
		{ label: 'Term commitment (years)', field: 'term_commitment' },
		{ label: 'Monitoring period start', field: 'monitoring_period_start_date' },
		{ label: 'Monitoring period end', field: 'monitoring_period_end_date' }
	];
</script>

<div class="p-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/activities/list" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</a>
		<Store class="size-8 text-primary-500" />
		<h1 class="h1">List Activity</h1>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
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
					<h2 class="h3 mb-2">You can't list this activity</h2>
					<p class="text-surface-600-400">
						Only the activity's operator can list it. We match operators to your login by email, and
						this activity isn't operated by you.
					</p>
				</div>
			</div>
		</div>
	{:else}
		{#if form?.success}
			<div class="card p-6 preset-filled-surface-100-900 mb-6 border-l-4 border-success-500">
				<h2 class="h4 text-success-500 mb-1">Listing saved</h2>
				<p class="text-surface-600-400">
					{form.listing?.listed
						? 'This activity is now published to the marketplace.'
						: 'Saved as a draft — not yet published to the marketplace.'}
					<a href="/activities" class="anchor">View the marketplace</a>.
				</p>
			</div>
		{:else if form?.error}
			<div class="card p-6 preset-filled-surface-100-900 mb-6 border-l-4 border-error-500">
				<h2 class="h4 text-error-500 mb-1">Couldn't save listing</h2>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{form.error}</pre>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Registry-authoritative: read-only -->
			<div class="card p-6 preset-filled-surface-100-900">
				<div class="flex items-center gap-2 mb-4">
					<Lock class="size-4 text-surface-500" />
					<h2 class="h4">From the registry (read-only)</h2>
				</div>
				<dl class="space-y-3">
					{#each readOnlyFields as f (f.field)}
						{@const value = reg(f.field)}
						{#if value}
							<div>
								<dt class="text-xs uppercase tracking-wide text-surface-500">{f.label}</dt>
								<dd class="text-sm break-words">{value}</dd>
							</div>
						{/if}
					{/each}
				</dl>
			</div>

			<!-- Operator-editable: marketing + commercial -->
			<form method="POST" action="?/save" use:enhance class="card p-6 preset-filled-surface-100-900 space-y-6">
				<div class="flex items-start gap-2 text-sm text-surface-600-400">
					<Info class="size-4 text-primary-500 shrink-0 mt-0.5" />
					<p>These are the only fields you set as the operator: how the activity is presented, and its commercial terms.</p>
				</div>

				<div>
					<h2 class="h4 mb-3">Marketing</h2>
					<div class="space-y-4">
						<label class="label">
							<span class="label-text">Summary</span>
							<textarea name="summary" rows="2" class="textarea" placeholder="Short public summary">{marketing('summary')}</textarea>
						</label>
						<label class="label">
							<span class="label-text">Thumbnail image URL</span>
							<input type="url" name="image" value={marketing('image')} class="input" placeholder="https://…/image.jpg" />
						</label>
						<label class="label">
							<span class="label-text">Website</span>
							<input type="url" name="website" value={marketing('website')} class="input" placeholder="https://example.com" />
						</label>
						<label class="label">
							<span class="label-text">Media links</span>
							<textarea name="media_links" rows="2" class="textarea" placeholder="Links to reports, press, docs">{marketing('media_links')}</textarea>
						</label>
					</div>
				</div>

				<div>
					<h2 class="h4 mb-3">Commercial terms</h2>
					<div class="grid grid-cols-2 gap-4">
						<label class="label">
							<span class="label-text">Price per credit (EUR / tCO₂e)</span>
							<input type="number" step="any" min="0" name="price_per_credit" value={listing?.price_per_credit ?? ''} class="input" placeholder="e.g., 45" />
						</label>
						<label class="label">
							<span class="label-text">Credits available</span>
							<input type="number" step="any" min="0" name="credits_available" value={listing?.credits_available ?? ''} class="input" placeholder="e.g., 1000" />
						</label>
					</div>
				</div>

				<label class="flex items-center gap-3">
					<input type="checkbox" name="listed" class="checkbox" checked={listing?.listed ?? true} />
					<span class="label-text">Publish this listing to the marketplace</span>
				</label>

				<button type="submit" class="btn preset-filled-primary-500 w-full">Save listing</button>
			</form>
		</div>
	{/if}
</div>
