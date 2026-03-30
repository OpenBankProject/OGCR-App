<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { FolderKanban, ArrowLeft, Copy, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);

	// Return the previously submitted value for a field, or '' if none
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

<div class="p-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/activities" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</a>
		<FolderKanban class="size-8 text-primary-500" />
		<h1 class="h1">Create Activity</h1>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to create activities.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else}
		{#if form?.success}
			<div class="card p-8 preset-filled-surface-100-900 mb-6">
				<h2 class="h3 mb-2 text-success-500">Activity Created</h2>
				<p class="text-surface-600-400 mb-4">API Response:</p>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.response, null, 2)}</pre>
				<a href="/activities" class="btn preset-filled-primary-500 mt-4">View All Activities</a>
			</div>
		{:else}
			{#if form?.error}
				<div class="card p-8 preset-filled-surface-100-900 mb-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="h3 text-error-500">Error Creating Activity</h2>
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
						<p class="text-surface-600-400 mb-4">Error:</p>
						<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{form.error}</pre>
					{/if}
				</div>
			{/if}

			<div class="card p-8 preset-filled-surface-100-900">
				<form method="POST" use:enhance class="space-y-6">
					<label class="label">
						<span class="label-text">Name *</span>
						<input
							type="text"
							name="name"
							value={v('name')}
							class="input"
							placeholder="e.g., Reforestation Berlin"
							required
						/>
					</label>

					<label class="label">
						<span class="label-text">Summary</span>
						<textarea
							name="summary"
							class="textarea"
							rows="2"
							placeholder="Brief summary of the activity"
						>{v('summary')}</textarea>
					</label>

					<label class="label">
						<span class="label-text">Description</span>
						<textarea
							name="description"
							class="textarea"
							rows="4"
							placeholder="Detailed description of the activity"
						>{v('description')}</textarea>
					</label>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<label class="label">
							<span class="label-text">Type</span>
							<input
								type="text"
								name="type"
								value={v('type')}
								class="input"
								placeholder="e.g., CARBON_FARMING"
							/>
						</label>

						<label class="label">
							<span class="label-text">City</span>
							<input
								type="text"
								name="city"
								value={v('city')}
								class="input"
								placeholder="e.g., Berlin"
							/>
						</label>

						<label class="label">
							<span class="label-text">Country Code</span>
							<input
								type="text"
								name="country_code"
								value={v('country_code')}
								class="input"
								placeholder="e.g., DE"
							/>
						</label>

						<label class="label">
							<span class="label-text">Activity Plan ID</span>
							<input
								type="text"
								name="activity_plan_id"
								value={v('activity_plan_id')}
								class="input"
								placeholder="Associated plan ID"
							/>
						</label>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<label class="label">
							<span class="label-text">Website</span>
							<input
								type="url"
								name="website"
								value={v('website')}
								class="input"
								placeholder="https://example.com"
							/>
						</label>

						<label class="label">
							<span class="label-text">Image URL</span>
							<input
								type="url"
								name="image"
								value={v('image')}
								class="input"
								placeholder="https://example.com/image.jpg"
							/>
						</label>
					</div>

					<label class="label">
						<span class="label-text">Media Links</span>
						<textarea
							name="media_links"
							class="textarea"
							rows="2"
							placeholder="Links to media resources"
						>{v('media_links')}</textarea>
					</label>

					<label class="label">
						<span class="label-text">Technologies, Practices & Processes</span>
						<input
							type="text"
							name="technologies_practices_processes"
							value={v('technologies_practices_processes')}
							class="input"
							placeholder="e.g., agroforestry, cover cropping"
						/>
					</label>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<label class="label">
							<span class="label-text">Start Date</span>
							<input type="date" name="start_date" value={v('start_date')} class="input" />
						</label>

						<label class="label">
							<span class="label-text">End Date</span>
							<input type="date" name="end_date" value={v('end_date')} class="input" />
						</label>

						<label class="label">
							<span class="label-text">Term Commitment (years)</span>
							<input
								type="number"
								name="term_commitment"
								value={v('term_commitment')}
								class="input"
								placeholder="e.g., 10"
							/>
						</label>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<label class="label">
							<span class="label-text">Cobenefits</span>
							<input
								type="text"
								name="cobenefits"
								value={v('cobenefits')}
								class="input"
								placeholder="e.g., biodiversity, water retention"
							/>
						</label>

						<label class="label">
							<span class="label-text">Methodologies</span>
							<input
								type="text"
								name="methodologies"
								value={v('methodologies')}
								class="input"
								placeholder="e.g., Verra VM0042"
							/>
						</label>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<label class="label">
							<span class="label-text">Monitoring Period (years)</span>
							<input
								type="number"
								name="monitoring_period_years"
								value={v('monitoring_period_years')}
								class="input"
								placeholder="e.g., 5"
							/>
						</label>

						<label class="label">
							<span class="label-text">Monitoring Period Start Date</span>
							<input type="date" name="monitoring_period_start_date" value={v('monitoring_period_start_date')} class="input" />
						</label>

						<label class="label">
							<span class="label-text">Monitoring Period End Date</span>
							<input type="date" name="monitoring_period_end_date" value={v('monitoring_period_end_date')} class="input" />
						</label>
					</div>

					<label class="label">
						<span class="label-text">Multipolygon Coordinates (JSON)</span>
						<textarea
							name="multipolygon_coordinates"
							class="textarea font-mono text-sm"
							rows="4"
							placeholder='e.g., [[[[13.0, 52.0], [13.1, 52.0], [13.1, 52.1], [13.0, 52.1], [13.0, 52.0]]]]'
						>{v('multipolygon_coordinates')}</textarea>
					</label>

					<button type="submit" class="btn preset-filled-primary-500">
						Create Activity
					</button>
				</form>
			</div>
		{/if}
	{/if}
</div>
