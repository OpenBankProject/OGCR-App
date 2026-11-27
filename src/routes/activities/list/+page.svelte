<script lang="ts">
	import type { PageData } from './$types';
	import { Store, ArrowLeft, Building2, MapPin, CheckCircle2, Circle, Info } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activities = $derived(data.activities ?? []);
</script>

<div class="p-8">
	<div class="flex items-center gap-4 mb-2">
		<a href="/activities" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</a>
		<Store class="size-8 text-primary-500" />
		<h1 class="h1">List an Activity</h1>
	</div>
	<p class="text-surface-600-400 mb-8 max-w-2xl">
		Listing connects one of your existing registry activities to the marketplace. The registry
		owns the activity's facts (type, methodologies, location, dates); here you set only how it's
		presented and its commercial terms.
	</p>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Store class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to list activities.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-surface-100-900">
			<h2 class="h3 text-error-500 mb-2">Something went wrong</h2>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
		</div>
	{:else if (data.operators?.length ?? 0) === 0}
		<!-- Ownership gate: no operator is linked to this user. -->
		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			<div class="flex items-start gap-3">
				<Info class="size-6 text-primary-500 shrink-0 mt-1" />
				<div>
					<h2 class="h3 mb-2">No operator linked to your account yet</h2>
					<p class="text-surface-600-400 mb-3">
						To list an activity you first need to be recognised as its operator. We match you to an
						operator by email: an <strong>operator record whose email is
						<code>{data.userEmail ?? 'your login email'}</code></strong> must exist on the registry.
					</p>
					<p class="text-surface-600-400">
						Once an operator with your email exists (and owns one or more activities), those
						activities will appear here ready to list. Operator records are managed on the registry
						via the API Manager.
					</p>
				</div>
			</div>
		</div>
	{:else if activities.length === 0}
		<div class="card p-8 preset-filled-surface-100-900 max-w-2xl">
			<h2 class="h3 mb-2">No activities to list</h2>
			<p class="text-surface-600-400">
				You're recognised as an operator, but no registry activities are linked to your operator
				account yet. Activities are created on the registry; once one names your operator, it will
				appear here.
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each activities as activity (activity.activity_id)}
				<a
					href="/activities/list/{activity.activity_id}"
					class="card p-4 preset-filled-surface-100-900 hover:preset-tonal transition-colors flex items-center justify-between gap-4"
				>
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<h3 class="h4 text-primary-500 truncate">{activity.name || 'Unnamed Activity'}</h3>
							{#if activity.listed}
								<span class="badge preset-tonal-success text-xs flex items-center gap-1">
									<CheckCircle2 class="size-3" /> Listed
								</span>
							{:else}
								<span class="badge preset-tonal-surface text-xs flex items-center gap-1">
									<Circle class="size-3" /> Not listed
								</span>
							{/if}
						</div>
						<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600-400 mt-1">
							<span class="flex items-center gap-1">
								<MapPin class="size-3" />
								{[activity.city, activity.country_id].filter(Boolean).join(', ') || 'Unknown'}
							</span>
							<span class="flex items-center gap-1">
								<Building2 class="size-3" />
								{activity.operator_id}
							</span>
							{#if activity.price_per_credit != null}
								<span>{activity.price_per_credit} EUR/tCO₂e</span>
							{/if}
							{#if activity.credits_available != null}
								<span>{activity.credits_available} credits</span>
							{/if}
						</div>
					</div>
					<span class="btn btn-sm preset-filled-primary-500 shrink-0">
						{activity.listed ? 'Edit listing' : 'List it'}
					</span>
				</a>
			{/each}
		</div>
	{/if}
</div>
