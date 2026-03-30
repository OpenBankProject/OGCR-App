<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { FolderKanban, Copy, Check, MapPin, ShieldCheck, Activity, ArrowLeft, Save, Plus } from '@lucide/svelte';
	import GeoJsonMap from '$lib/components/GeoJsonMap.svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);

	function v(field: string): string {
		if (form?.values?.[field] !== undefined) return form.values[field];
		if (!data.activity) return '';
		const val = data.activity[field];
		if (val === null || val === undefined) return '';
		if (typeof val === 'object') return JSON.stringify(val, null, 2);
		return String(val);
	}

	// Parse multipolygon coordinates for map display
	function getGeoJson(): object | null {
		const raw = data.activity?.multipolygon_coordinates;
		if (!raw) return null;
		try {
			const coords = typeof raw === 'string' ? JSON.parse(raw) : raw;
			// If it's already a GeoJSON object, return as-is
			if (coords.type) return coords;
			// Otherwise wrap as a MultiPolygon geometry
			return { type: 'MultiPolygon', coordinates: coords };
		} catch {
			return null;
		}
	}

	async function copyErrorDetails() {
		const details = form?.errorDetails || data.errorDetails;
		if (!details) return;
		const errorText = `API Request:\n${JSON.stringify(details.request, null, 2)}\n\nAPI Response:\n${JSON.stringify(details.response, null, 2)}`;
		await navigator.clipboard.writeText(errorText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="p-6">

	{#if !data.isAuthenticated}
		<div class="card p-6 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-12 mx-auto mb-3 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-3">Please log in to view activity details.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-6 preset-filled-surface-100-900">
			<div class="flex items-center justify-between mb-3">
				<h2 class="h3 text-error-500">Error Loading Activity</h2>
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
				<div class="space-y-3">
					<div>
						<p class="text-surface-600-400 mb-1 font-semibold text-sm">API Request:</p>
						<pre class="bg-surface-200-800 p-3 rounded overflow-auto text-xs">{JSON.stringify(data.errorDetails.request, null, 2)}</pre>
					</div>
					<div>
						<p class="text-surface-600-400 mb-1 font-semibold text-sm">API Response:</p>
						<pre class="bg-surface-200-800 p-3 rounded overflow-auto text-xs">{JSON.stringify(data.errorDetails.response, null, 2)}</pre>
					</div>
				</div>
			{:else}
				<p class="text-surface-600-400">{data.error}</p>
			{/if}
		</div>
	{:else if data.activity}

		<!-- Header -->
		<div class="flex items-center gap-3 mb-4">
			<a href="/activities" class="btn preset-outlined-surface-500 btn-sm">
				<ArrowLeft class="size-4" />
				<span>Back</span>
			</a>
			<FolderKanban class="size-6 text-primary-500" />
			<div>
				<h1 class="h3 text-primary-500">{data.activity.name || 'Unnamed Activity'}</h1>
				{#if data.activity.activity_id}
					<p class="text-xs text-surface-600-400">ID: {data.activity.activity_id}</p>
				{/if}
			</div>
		</div>

		<!-- Flash messages -->
		{#if form?.success}
			<div class="card p-3 preset-filled-surface-100-900 mb-4 border-l-4 border-success-500">
				<p class="text-success-500 font-semibold text-sm">Activity updated successfully.</p>
			</div>
		{/if}
		{#if form?.error}
			<div class="card p-3 preset-filled-surface-100-900 mb-4">
				<div class="flex items-center justify-between mb-2">
					<h2 class="font-semibold text-error-500">Error Updating Activity</h2>
					{#if form.errorDetails}
						<button onclick={copyErrorDetails} class="btn preset-outlined-surface-500 btn-sm" title="Copy error details">
							{#if copied}
								<Check class="size-4 text-success-500" /><span>Copied</span>
							{:else}
								<Copy class="size-4" /><span>Copy</span>
							{/if}
						</button>
					{/if}
				</div>
				{#if form.errorDetails}
					<details>
						<summary class="cursor-pointer text-xs text-surface-600-400">Show details</summary>
						<pre class="bg-surface-200-800 p-3 rounded overflow-auto text-xs mt-2">{JSON.stringify(form.errorDetails, null, 2)}</pre>
					</details>
				{:else}
					<pre class="bg-surface-200-800 p-3 rounded overflow-auto text-xs">{form.error}</pre>
				{/if}
			</div>
		{/if}

		<!-- Editable Activity Form -->
		<form method="POST" action="?/update" use:enhance>
			<div class="card p-5 preset-filled-surface-100-900">
				<!-- All fields on a consistent 6-column grid -->
				<div class="grid grid-cols-2 md:grid-cols-6 gap-x-3 gap-y-3">

					<!-- Name: spans 2 cols -->
					<label class="label col-span-2">
						<span class="label-text text-sm">Name *</span>
						<input type="text" name="name" value={v('name')} class="input" required />
					</label>
					<!-- Type: spans 2 cols -->
					<label class="label col-span-2">
						<span class="label-text text-sm">Type</span>
						<input type="text" name="type" value={v('type')} class="input" placeholder="e.g., CARBON_FARMING" />
					</label>
					<!-- City + Country: 1 col each -->
					<label class="label">
						<span class="label-text text-sm">City</span>
						<input type="text" name="city" value={v('city')} class="input" placeholder="Berlin" />
					</label>
					<label class="label">
						<span class="label-text text-sm">Country</span>
						<input type="text" name="country_code" value={v('country_code')} class="input" placeholder="DE" />
					</label>

					<!-- Summary: full width -->
					<label class="label col-span-2 md:col-span-6">
						<span class="label-text text-sm">Summary</span>
						<textarea name="summary" class="textarea" rows="2">{v('summary')}</textarea>
					</label>

					<!-- Description: full width -->
					<label class="label col-span-2 md:col-span-6">
						<span class="label-text text-sm">Description</span>
						<textarea name="description" class="textarea" rows="3">{v('description')}</textarea>
					</label>

					<!-- Technologies, Cobenefits, Methodologies: 2 cols each -->
					<label class="label col-span-2">
						<span class="label-text text-sm">Technologies / Practices</span>
						<input type="text" name="technologies_practices_processes" value={v('technologies_practices_processes')} class="input" placeholder="e.g., agroforestry" />
					</label>
					<label class="label col-span-2">
						<span class="label-text text-sm">Cobenefits</span>
						<input type="text" name="cobenefits" value={v('cobenefits')} class="input" placeholder="e.g., biodiversity" />
					</label>
					<label class="label col-span-2">
						<span class="label-text text-sm">Methodologies</span>
						<input type="text" name="methodologies" value={v('methodologies')} class="input" placeholder="e.g., Verra VM0042" />
					</label>

					<!-- Website, Image, Activity Plan ID: 2 cols each -->
					<label class="label col-span-2">
						<span class="label-text text-sm">Website</span>
						<input type="url" name="website" value={v('website')} class="input" placeholder="https://..." />
					</label>
					<label class="label col-span-2">
						<span class="label-text text-sm">Image URL</span>
						<input type="url" name="image" value={v('image')} class="input" placeholder="https://..." />
					</label>
					<label class="label col-span-2">
						<span class="label-text text-sm">Activity Plan ID</span>
						<input type="text" name="activity_plan_id" value={v('activity_plan_id')} class="input" />
					</label>

					<!-- Media Links: full width -->
					<label class="label col-span-2 md:col-span-6">
						<span class="label-text text-sm">Media Links</span>
						<textarea name="media_links" class="textarea" rows="1">{v('media_links')}</textarea>
					</label>

					<!-- Dates & Monitoring: all 6 on one row, 1 col each -->
					<label class="label">
						<span class="label-text text-sm">Start</span>
						<input type="date" name="start_date" value={v('start_date')} class="input" />
					</label>
					<label class="label">
						<span class="label-text text-sm">End</span>
						<input type="date" name="end_date" value={v('end_date')} class="input" />
					</label>
					<label class="label">
						<span class="label-text text-sm">Term (yrs)</span>
						<input type="number" name="term_commitment" value={v('term_commitment')} class="input" />
					</label>
					<label class="label">
						<span class="label-text text-sm">Mon. (yrs)</span>
						<input type="number" name="monitoring_period_years" value={v('monitoring_period_years')} class="input" />
					</label>
					<label class="label">
						<span class="label-text text-sm">Mon. Start</span>
						<input type="date" name="monitoring_period_start_date" value={v('monitoring_period_start_date')} class="input" />
					</label>
					<label class="label">
						<span class="label-text text-sm">Mon. End</span>
						<input type="date" name="monitoring_period_end_date" value={v('monitoring_period_end_date')} class="input" />
					</label>

				</div>

				<!-- Multipolygon: map + JSON side by side, below the grid -->
				{#if v('multipolygon_coordinates') || getGeoJson()}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
						{#if getGeoJson()}
							<div>
								<span class="text-sm font-medium text-surface-600-400">Map Preview</span>
								<div class="mt-1">
									<GeoJsonMap geoJson={getGeoJson()} />
								</div>
							</div>
						{/if}
						<label class="label">
							<span class="label-text text-sm">Multipolygon Coordinates (JSON)</span>
							<textarea name="multipolygon_coordinates" class="textarea font-mono text-xs" rows="8">{v('multipolygon_coordinates')}</textarea>
						</label>
					</div>
				{/if}

				<!-- Save -->
				<div class="flex justify-end mt-4">
					<button type="submit" class="btn preset-filled-primary-500 btn-sm">
						<Save class="size-4" />
						<span>Save Changes</span>
					</button>
				</div>
			</div>
		</form>

		<!-- Verifications -->
		<div class="card p-5 preset-filled-surface-100-900 mt-4 overflow-hidden">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Activity Verification -->
				<div class="min-w-0">
					<div class="flex items-center gap-2 mb-2">
						<ShieldCheck class="size-5 text-primary-500 flex-shrink-0" />
						<h3 class="font-semibold truncate">Activity Verification</h3>
					</div>
					{#if data.activityVerifications && data.activityVerifications.length > 0}
						<div class="grid gap-1 mb-2">
							{#each data.activityVerifications as ver}
								<div class="card p-2 preset-filled-surface-200-800 text-sm flex items-center gap-2 overflow-hidden">
									<span class="badge badge-sm flex-shrink-0 {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
									{#if ver.status_message}<span class="text-surface-600-400 truncate">{ver.status_message}</span>{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-surface-600-400 mb-2">None.</p>
					{/if}
					{#if form?.action === 'addActivityVerification' && form?.error}
						<p class="text-xs text-error-500 mb-1">{form.error}</p>
					{/if}
					<form method="POST" action="?/addActivityVerification" use:enhance class="grid grid-cols-[auto_1fr_auto] gap-2 items-end">
						<label class="label min-w-0">
							<span class="label-text text-xs">Status</span>
							<select name="status_code" class="input text-sm py-1 w-full" required>
								<option value="pending">pending</option>
								<option value="verified">verified</option>
								<option value="failed">failed</option>
							</select>
						</label>
						<label class="label min-w-0">
							<span class="label-text text-xs">Message</span>
							<input type="text" name="status_message" class="input text-sm py-1 w-full" placeholder="Optional" />
						</label>
						<button type="submit" class="btn preset-filled-primary-500 btn-sm" title="Add verification">
							<Plus class="size-4" />
							<span>Add</span>
						</button>
					</form>
				</div>

				<!-- Monitoring Period Verification -->
				<div class="min-w-0">
					<div class="flex items-center gap-2 mb-2">
						<Activity class="size-5 text-tertiary-500 flex-shrink-0" />
						<h3 class="font-semibold truncate">Monitoring Period Verification</h3>
					</div>
					{#if data.activityMonitoringVerifications && data.activityMonitoringVerifications.length > 0}
						<div class="grid gap-1 mb-2">
							{#each data.activityMonitoringVerifications as ver}
								<div class="card p-2 preset-filled-surface-200-800 text-sm flex items-center gap-2 overflow-hidden">
									<span class="badge badge-sm flex-shrink-0 {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
									{#if ver.status_message}<span class="text-surface-600-400 truncate">{ver.status_message}</span>{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-surface-600-400 mb-2">None.</p>
					{/if}
					{#if form?.action === 'addMonitoringVerification' && form?.error}
						<p class="text-xs text-error-500 mb-1">{form.error}</p>
					{/if}
					<form method="POST" action="?/addMonitoringVerification" use:enhance class="grid grid-cols-[auto_1fr_auto] gap-2 items-end">
						<label class="label min-w-0">
							<span class="label-text text-xs">Status</span>
							<select name="status_code" class="input text-sm py-1 w-full" required>
								<option value="pending">pending</option>
								<option value="verified">verified</option>
								<option value="failed">failed</option>
							</select>
						</label>
						<label class="label min-w-0">
							<span class="label-text text-xs">Message</span>
							<input type="text" name="status_message" class="input text-sm py-1 w-full" placeholder="Optional" />
						</label>
						<button type="submit" class="btn preset-filled-primary-500 btn-sm" title="Add verification">
							<Plus class="size-4" />
							<span>Add</span>
						</button>
					</form>
				</div>
			</div>
		</div>

		<!-- Parcels -->
		{#if data.parcels && data.parcels.length > 0}
			<div class="card p-5 preset-filled-surface-100-900 mt-4">
				<div class="flex items-center gap-2 mb-3">
					<MapPin class="size-6 text-secondary-500" />
					<h2 class="font-semibold">Parcels</h2>
				</div>
				<div class="grid gap-3">
					{#each data.parcels as parcel}
						<div class="card p-3 preset-filled-surface-200-800">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
								<div>
									{#if parcel.parcel_id}
										<p class="text-sm"><span class="font-medium text-surface-600-400">Parcel ID:</span> <span class="break-all">{parcel.parcel_id}</span></p>
									{/if}
								</div>
								{#if parcel.multipolygon_coordinates_geometry}
									<div>
										<GeoJsonMap geoJson={parcel.multipolygon_coordinates_geometry} />
									</div>
								{/if}
							</div>

							{#if parcel.activity_parcel_verifications && parcel.activity_parcel_verifications.length > 0}
								<div class="border-t border-surface-300-700 pt-2 mb-2">
									<p class="text-xs font-semibold text-surface-600-400 mb-1">Activity Parcel Verifications</p>
									<div class="flex flex-wrap gap-1">
										{#each parcel.activity_parcel_verifications as ver}
											<span class="badge badge-sm {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">
												{ver.status_code}{#if ver.amount !== undefined} ({ver.amount}){/if}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-surface-300-700 pt-2">
								<div>
									<p class="text-xs font-semibold text-surface-600-400 mb-1">Owner Verifications</p>
									{#if parcel.owner_verifications && parcel.owner_verifications.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each parcel.owner_verifications as ver}
												<span class="badge badge-sm {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
											{/each}
										</div>
									{:else}
										<p class="text-xs text-surface-600-400">None.</p>
									{/if}
								</div>
								<div>
									<p class="text-xs font-semibold text-surface-600-400 mb-1">Monitoring Verifications</p>
									{#if parcel.monitoring_verifications && parcel.monitoring_verifications.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each parcel.monitoring_verifications as ver}
												<span class="badge badge-sm {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">
													{ver.status_code}{#if ver.amount !== undefined} ({ver.amount}){/if}
												</span>
											{/each}
										</div>
									{:else}
										<p class="text-xs text-surface-600-400">None.</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	{:else}
		<div class="card p-6 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-12 mx-auto mb-3 text-surface-400" />
			<h2 class="h3 mb-2">Activity Not Found</h2>
			<p class="text-surface-600-400 mb-3">The requested activity could not be found.</p>
			<a href="/activities" class="btn preset-filled-primary-500">Back to Activities</a>
		</div>
	{/if}
</div>
