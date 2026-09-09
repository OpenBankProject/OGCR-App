<script lang="ts">
	import type { PageData } from './$types';
	import { Building2, ArrowLeft, Pencil, MapPin, Wallet, Leaf, Lock } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const operator = $derived(data.operator);
	const contact = $derived(data.contact);
	const activities = $derived(data.activities ?? []);

	function region(a: { city: string | null; country_code: string | null }): string {
		return [a.city, a.country_code].filter(Boolean).join(', ') || 'Unknown region';
	}
</script>

<div class="p-8">
	<div class="flex items-center gap-4 mb-8">
		<a href="/operators" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Operators</span>
		</a>
		<Building2 class="size-8 text-secondary-500" />
		<h1 class="h1">{operator?.legal_name || 'Operator'}</h1>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<Building2 class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error || !operator}
		<div class="card p-8 preset-filled-surface-100-900">
			<h2 class="h3 text-error-500 mb-2">Could not load operator</h2>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error ??
					'Operator not found.'}</pre>
		</div>
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Public registry facts -->
			<div class="card p-6 preset-filled-surface-100-900 lg:col-span-2 space-y-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs uppercase tracking-wide text-surface-600-400">Operator</p>
						<p class="h3 text-secondary-500">{operator.legal_name || operator.operator_id}</p>
						<p class="text-xs text-surface-600-400 font-mono">ID: {operator.operator_id}</p>
					</div>
					{#if data.owned}
						<a
							href="/my/operators/{operator.operator_id}"
							class="btn btn-sm preset-filled-primary-500 shrink-0"
						>
							<Pencil class="size-4" />
							<span>Edit</span>
						</a>
					{/if}
				</div>

				<dl class="grid gap-4 sm:grid-cols-2">
					<div>
						<dt class="text-xs uppercase tracking-wide text-surface-600-400">Country</dt>
						<dd class="flex items-center gap-2">
							<MapPin class="size-4 text-surface-500" />
							<span>{operator.country_code || '—'}</span>
						</dd>
					</div>
					<div class="sm:col-span-2">
						<dt class="text-xs uppercase tracking-wide text-surface-600-400">
							OGCR wallet address
						</dt>
						<dd class="flex items-center gap-2 min-w-0">
							<Wallet class="size-4 text-surface-500 shrink-0" />
							<span class="font-mono text-sm truncate">{operator.ogcr_wallet_address || '—'}</span>
						</dd>
					</div>
				</dl>

				<p class="text-xs text-surface-500">
					These facts come from the registry and are shown read-only.
				</p>
			</div>

			<!-- Contact: only for users linked to this operator -->
			<div class="card p-6 preset-filled-surface-100-900 space-y-3">
				<p class="text-xs uppercase tracking-wide text-surface-600-400">Contact</p>
				{#if contact}
					<dl class="space-y-2 text-sm">
						<div>
							<dt class="text-surface-600-400">Email</dt>
							<dd>{contact.email || '—'}</dd>
						</div>
						<div>
							<dt class="text-surface-600-400">Phone</dt>
							<dd>{contact.phone || '—'}</dd>
						</div>
						<div>
							<dt class="text-surface-600-400">Address</dt>
							<dd>
								{[contact.address_line_1, contact.address_line_2, contact.postcode]
									.filter(Boolean)
									.join(', ') || '—'}
							</dd>
						</div>
					</dl>
				{:else}
					<div class="flex items-start gap-2 text-sm text-surface-600-400">
						<Lock class="size-4 shrink-0 mt-0.5" />
						<p>Contact details are only visible to users linked to this operator.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Activities operated by this operator -->
		<div class="mt-8">
			<div class="flex items-center gap-2 mb-4">
				<Leaf class="size-5 text-primary-500" />
				<h2 class="h3">Activities</h2>
				<span class="text-sm text-surface-600-400">({activities.length})</span>
			</div>

			{#if activities.length === 0}
				<div class="card p-6 preset-filled-surface-100-900 text-surface-600-400">
					No activities on the registry for this operator.
				</div>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each activities as activity (activity.activity_id)}
						<a
							href="/activities/{activity.activity_id}"
							class="card p-4 preset-filled-surface-100-900 hover:preset-tonal transition-colors block"
						>
							<h3 class="h4 text-primary-500 truncate">{activity.name || 'Unnamed Activity'}</h3>
							<p class="text-sm text-surface-600-400">{activity.type || 'Unknown type'}</p>
							<p class="text-xs text-surface-600-400 flex items-center gap-1 mt-1">
								<MapPin class="size-3" />
								{region(activity)}
							</p>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
