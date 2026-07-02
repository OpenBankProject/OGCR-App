<script lang="ts">
	import type { PageData } from './$types';
	import {
		FolderKanban,
		RefreshCw,
		Plus,
		Copy,
		Check,
		Search,
		MapPin,
		Building2,
		Coins,
		Layers,
		ImageOff,
		Store,
		X
	} from '@lucide/svelte';
	import { categorizeActivityType, CREDIT_CATEGORIES } from '$lib/constants/creditTypes';
	import GeoJsonMap from '$lib/components/GeoJsonMap.svelte';

	let { data }: { data: PageData } = $props();

	interface ActivityRow {
		activity_id?: string;
		name?: string;
		summary?: string;
		image?: string;
		multipolygon_coordinates?: string | object;
		type?: string;
		city?: string;
		country_code?: string;
		operator_name?: string | null;
		// Marketplace-owned listing terms (from the listings overlay); null until listed.
		price_per_credit?: number | string | null;
		credits_available?: number | string | null;
		listed?: boolean;
	}

	let copied = $state(false);

	const activities = $derived((data.activities ?? []) as ActivityRow[]);

	// --- Filter state ---
	let query = $state('');
	let categoryKey = $state('all');
	let country = $state('all');
	let minPrice = $state('');
	let maxPrice = $state('');
	let minCredits = $state('');
	let verificationStatus = $state('all');

	// Verification lookup derived from activity_verification (see +page.server.ts):
	// verifiedIds = activities with a "verified" verification. Everything else
	// (no record, in_progress, failed) counts as "unverified".
	const verifiedIds = $derived(new Set((data.verifiedActivityIds ?? []) as string[]));

	const countries = $derived(
		[...new Set(activities.map((a) => a.country_code).filter(Boolean))].sort() as string[]
	);

	function num(v: number | string | null | undefined): number | null {
		if (v === null || v === undefined || v === '') return null;
		const n = typeof v === 'number' ? v : Number(v);
		return Number.isFinite(n) ? n : null;
	}

	const filtered = $derived(
		activities.filter((a) => {
			const cat = categorizeActivityType(a.type);

			if (query.trim()) {
				const q = query.trim().toLowerCase();
				const hay = [a.name, a.summary, a.type, a.operator_name, a.city, a.country_code]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				if (!hay.includes(q)) return false;
			}

			if (categoryKey !== 'all' && cat.key !== categoryKey) return false;
			if (country !== 'all' && a.country_code !== country) return false;

			// Verification status filter (see issue #1):
			//   verified   = has a verification whose status_code is "verified"
			//   unverified = anything else (no record, in_progress, failed)
			const isVerified = !!(a.activity_id && verifiedIds.has(a.activity_id));
			if (verificationStatus === 'verified' && !isVerified) return false;
			if (verificationStatus === 'unverified' && isVerified) return false;

			// Price / credits filters only exclude when the field actually exists,
			// so cards without that data yet are never hidden.
			const price = num(a.price_per_credit);
			if (price !== null) {
				if (minPrice && price < Number(minPrice)) return false;
				if (maxPrice && price > Number(maxPrice)) return false;
			}
			const credits = num(a.credits_available);
			if (credits !== null && minCredits && credits < Number(minCredits)) return false;

			return true;
		})
	);

	const hasActiveFilters = $derived(
		!!query.trim() ||
			categoryKey !== 'all' ||
			country !== 'all' ||
			verificationStatus !== 'all' ||
			!!minPrice ||
			!!maxPrice ||
			!!minCredits
	);

	function resetFilters() {
		query = '';
		categoryKey = 'all';
		country = 'all';
		verificationStatus = 'all';
		minPrice = '';
		maxPrice = '';
		minCredits = '';
	}

	function region(a: ActivityRow): string {
		return [a.city, a.country_code].filter(Boolean).join(', ') || 'Unknown region';
	}

	// Normalise an activity's coordinates into a GeoJSON object (or null).
	function toGeoJson(raw: string | object | null | undefined): object | null {
		if (!raw) return null;
		try {
			const coords = typeof raw === 'string' ? JSON.parse(raw) : raw;
			if ((coords as { type?: string }).type) return coords as object;
			return { type: 'MultiPolygon', coordinates: coords };
		} catch {
			return null;
		}
	}

	async function copyErrorDetails() {
		if (!data.errorDetails) return;
		const errorText = `API Request:\n${JSON.stringify(data.errorDetails.request, null, 2)}\n\nAPI Response:\n${JSON.stringify(data.errorDetails.response, null, 2)}`;
		await navigator.clipboard.writeText(errorText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="p-8">
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center gap-4">
			<FolderKanban class="size-8 text-primary-500" />
			<h1 class="h1">Activities</h1>
		</div>

		{#if data.isAuthenticated}
			<div class="flex gap-2">
				<a href="/activities/list" class="btn preset-filled-primary-500">
					<Store class="size-4" />
					<span>List Activity</span>
				</a>
				<a href="/activities/create" class="btn preset-outlined-surface-500" title="Create test activity data">
					<Plus class="size-4" />
					<span>Create (test)</span>
				</a>
				<a href="/activities" class="btn preset-outlined-primary-500">
					<RefreshCw class="size-4" />
					<span>Refresh</span>
				</a>
			</div>
		{/if}
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to view activities.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-surface-100-900">
			<div class="flex items-center justify-between mb-4">
				<h2 class="h3 text-error-500">Error Loading Activities</h2>
				{#if data.errorDetails}
					<button onclick={copyErrorDetails} class="btn preset-outlined-surface-500 btn-sm" title="Copy error details">
						{#if copied}
							<Check class="size-4 text-success-500" /><span>Copied</span>
						{:else}
							<Copy class="size-4" /><span>Copy</span>
						{/if}
					</button>
				{/if}
			</div>
			{#if data.errorDetails}
				<div class="space-y-4">
					<div>
						<p class="text-surface-600-400 mb-2 font-semibold">API Request:</p>
						<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.errorDetails.request, null, 2)}</pre>
					</div>
					<div>
						<p class="text-surface-600-400 mb-2 font-semibold">API Response:</p>
						<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.errorDetails.response, null, 2)}</pre>
					</div>
				</div>
			{:else}
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
			{/if}
		</div>
	{:else if activities.length === 0}
		<div class="card p-8 preset-filled-surface-100-900">
			<h2 class="h3 mb-2">No Activities Found</h2>
			<p class="text-surface-600-400">No activities exist yet.</p>
		</div>
	{:else}
		<!-- Search & filter bar -->
		<div class="card p-4 preset-filled-surface-100-900 mb-6 space-y-4">
			<label class="label">
				<span class="sr-only">Search</span>
				<div class="relative">
					<Search class="size-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
					<input
						type="text"
						bind:value={query}
						class="input pl-9"
						placeholder="Search by name, summary, operator…"
					/>
				</div>
			</label>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<label class="label">
					<span class="label-text">Credit unit type</span>
					<select bind:value={categoryKey} class="select">
						<option value="all">All types</option>
						{#each CREDIT_CATEGORIES as cat (cat.key)}
							<option value={cat.key}>{cat.label}</option>
						{/each}
					</select>
				</label>

				<label class="label">
					<span class="label-text">Country / Region</span>
					<select bind:value={country} class="select">
						<option value="all">All countries</option>
						{#each countries as c (c)}
							<option value={c}>{c}</option>
						{/each}
					</select>
				</label>

				<label class="label">
					<span class="label-text">Verification status</span>
					<select bind:value={verificationStatus} class="select">
						<option value="all">All</option>
						<option value="verified">Verified</option>
						<option value="unverified">Unverified</option>
					</select>
				</label>

				<label class="label">
					<span class="label-text">Price range (EUR / tCO₂e)</span>
					<div class="flex items-center gap-2">
						<input type="number" step="any" min="0" bind:value={minPrice} class="input" placeholder="Min" />
						<span class="text-surface-400">–</span>
						<input type="number" step="any" min="0" bind:value={maxPrice} class="input" placeholder="Max" />
					</div>
				</label>

				<label class="label">
					<span class="label-text">Min. credits available</span>
					<input type="number" step="any" min="0" bind:value={minCredits} class="input" placeholder="e.g., 100" />
				</label>
			</div>

			<div class="flex items-center justify-between">
				<p class="text-sm text-surface-600-400">
					Showing {filtered.length} of {activities.length}
				</p>
				{#if hasActiveFilters}
					<button type="button" onclick={resetFilters} class="btn btn-sm preset-tonal-surface">
						<X class="size-4" />
						<span>Clear filters</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Listing cards -->
		{#if filtered.length === 0}
			<div class="card p-8 preset-filled-surface-100-900 text-center">
				<p class="text-surface-600-400">No activities match your filters.</p>
			</div>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
				{#each filtered as activity (activity.activity_id)}
					{@const cat = categorizeActivityType(activity.type)}
					{@const price = num(activity.price_per_credit)}
					{@const credits = num(activity.credits_available)}
					{@const geo = toGeoJson(activity.multipolygon_coordinates)}
					<a
						href="/activities/{activity.activity_id}"
						class="card preset-filled-surface-100-900 hover:preset-tonal transition-colors overflow-hidden flex flex-col"
					>
						<!-- Thumbnail: prefer a map of the parcel, then image, then placeholder -->
						<div class="aspect-video bg-surface-200-800 flex items-center justify-center overflow-hidden">
							{#if geo}
								<GeoJsonMap geoJson={geo} interactive={false} class="h-full w-full" />
							{:else if activity.image}
								<img src={activity.image} alt={activity.name ?? 'Activity'} class="size-full object-cover" />
							{:else}
								<ImageOff class="size-10 text-surface-400" />
							{/if}
						</div>

						<div class="p-4 flex flex-col gap-3 flex-1">
							<span class="badge {cat.badgeClass} self-start text-xs">{cat.label}</span>

							<div>
								<h3 class="h4 text-primary-500">{activity.name || 'Unnamed Activity'}</h3>
								{#if activity.summary}
									<p class="text-sm text-surface-600-400 mt-1 line-clamp-2">{activity.summary}</p>
								{/if}
							</div>

							<dl class="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
								<div class="flex items-center gap-2 min-w-0">
									<Coins class="size-4 text-surface-500 shrink-0" />
									<span class="truncate">
										{price !== null ? `${price} EUR/tCO₂e` : 'Price not set'}
									</span>
								</div>
								<div class="flex items-center gap-2 min-w-0">
									<Layers class="size-4 text-surface-500 shrink-0" />
									<span class="truncate">
										{credits !== null ? `${credits} credits` : 'Credits not set'}
									</span>
								</div>
								<div class="flex items-center gap-2 min-w-0">
									<MapPin class="size-4 text-surface-500 shrink-0" />
									<span class="truncate">{region(activity)}</span>
								</div>
								<div class="flex items-center gap-2 min-w-0">
									<Building2 class="size-4 text-surface-500 shrink-0" />
									<span class="truncate">{activity.operator_name || 'Unknown operator'}</span>
								</div>
							</dl>
						</div>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Debug: every OBP call made while loading this page (request + response/error) -->
		{#each (data.debugCalls ?? []) as call, i (call.label + i)}
			<details class={i === 0 ? 'mt-8' : 'mt-2'} open={i === 0}>
				<summary class="cursor-pointer text-sm text-surface-600-400"
					>Debug: {call.label} — Request</summary
				>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-xs mt-2">{JSON.stringify(call.request, null, 2)}</pre>
			</details>
			<details class="mt-2" open={i === 0}>
				<summary class="cursor-pointer text-sm text-surface-600-400"
					>Debug: {call.label} — {call.error ? 'Error' : 'Response'}</summary
				>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-xs mt-2">{JSON.stringify(call.error ?? call.response, null, 2)}</pre>
			</details>
		{/each}
	{/if}
</div>
