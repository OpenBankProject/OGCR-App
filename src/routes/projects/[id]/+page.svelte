<script lang="ts">
	import type { PageData } from './$types';
	import { FolderKanban, Copy, Check, MapPin, ShieldCheck, Activity } from '@lucide/svelte';
	import GeoJsonMap from '$lib/components/GeoJsonMap.svelte';

	let { data }: { data: PageData } = $props();

	let copied = $state(false);

	function formatFieldName(key: string): string {
		// Strip entity prefix (e.g. "ogcr5_") then convert snake_case to Camel Case
		const stripped = key.replace(/^[a-z]+\d+_/, '');
		return stripped
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
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

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to view project details.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-surface-100-900">
			<div class="flex items-center justify-between mb-4">
				<h2 class="h3 text-error-500">Error Loading Project</h2>
				{#if data.errorDetails}
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
				<p class="text-surface-600-400">{data.error}</p>
			{/if}
		</div>
	{:else if data.project}
		<div class="card p-6 preset-filled-surface-100-900">
			<div class="flex items-center gap-4 mb-6">
				<FolderKanban class="size-10 text-primary-500" />
				<div>
					<h1 class="h2 text-primary-500">
						{data.project.project_owner || 'Unnamed Project'}
					</h1>
					{#if data.project.project_id}
						<p class="text-sm text-surface-600-400">ID: {data.project.project_id}</p>
					{/if}
				</div>
			</div>

			{#if data.project.description}
				<div class="mb-6">
					<h3 class="h4 mb-2">Description</h3>
					<p class="text-surface-600-400">{data.project.description}</p>
				</div>
			{/if}

			<div class="border-t border-surface-200-800 pt-6">
				<h3 class="h4 mb-4">Project Details</h3>
				<div class="grid gap-3">
					{#each Object.entries(data.project) as [key, value]}
						{#if value !== null && value !== undefined}
							<div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
								<span class="font-medium text-surface-600-400 min-w-[200px]">{formatFieldName(key)}:</span>
								<span class="text-surface-800-200 break-all">
									{#if typeof value === 'object'}
										<pre class="text-sm bg-surface-200-800 p-2 rounded overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
									{:else}
										{value}
									{/if}
								</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>

		<!-- Project Verifications Section -->
		<div class="card p-6 preset-filled-surface-100-900 mt-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Project Verification (left) -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<ShieldCheck class="size-6 text-primary-500" />
						<h3 class="h4">Project Verification</h3>
					</div>
					{#if data.projectVerifications && data.projectVerifications.length > 0}
						<div class="grid gap-2">
							{#each data.projectVerifications as ver}
								<div class="card p-3 preset-filled-surface-200-800 text-sm">
									<div class="flex items-center gap-2 mb-1">
										<span class="badge {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
									</div>
									{#if ver.status_message}
										<p class="text-surface-600-400">{ver.status_message}</p>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-surface-600-400">No project verifications.</p>
					{/if}
				</div>

				<!-- Project Monitoring Period Verification (right) -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<Activity class="size-6 text-tertiary-500" />
						<h3 class="h4">Project Monitoring Period Verification</h3>
					</div>
					{#if data.projectMonitoringVerifications && data.projectMonitoringVerifications.length > 0}
						<div class="grid gap-2">
							{#each data.projectMonitoringVerifications as ver}
								<div class="card p-3 preset-filled-surface-200-800 text-sm">
									<div class="flex items-center gap-2 mb-1">
										<span class="badge {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
									</div>
									{#if ver.status_message}
										<p class="text-surface-600-400">{ver.status_message}</p>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-surface-600-400">No project monitoring period verifications.</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Parcels Section -->
		<div class="card p-6 preset-filled-surface-100-900 mt-6">
			<div class="flex items-center gap-4 mb-6">
				<MapPin class="size-8 text-secondary-500" />
				<h2 class="h3">Parcels</h2>
			</div>

			{#if data.parcels && data.parcels.length > 0}
				<div class="grid gap-4">
					{#each data.parcels as parcel}
						<div class="card p-4 preset-filled-surface-200-800">
							<!-- Parcel Details -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
								<div class="grid gap-2 content-start">
									{#if parcel.parcel_id}
										<div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
											<span class="font-medium text-surface-600-400 min-w-[150px]">Parcel ID:</span>
											<span class="text-surface-800-200 break-all">{parcel.parcel_id}</span>
										</div>
									{/if}
									{#if parcel.parcel_owner}
										<div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
											<span class="font-medium text-surface-600-400 min-w-[150px]">Owner:</span>
											<span class="text-surface-800-200">{parcel.parcel_owner}</span>
										</div>
									{/if}
								</div>
								{#if parcel.geo_data}
									<div>
										<span class="font-medium text-surface-600-400">Geo Data:</span>
										<div class="mt-1">
											<GeoJsonMap geoJson={parcel.geo_data} />
										</div>
									</div>
								{/if}
							</div>

							<!-- Verifications -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-surface-300-700 pt-4">
								<!-- Owner Verifications (left) -->
								<div>
									<div class="flex items-center gap-2 mb-3">
										<ShieldCheck class="size-5 text-primary-500" />
										<h4 class="font-semibold">Owner Verifications</h4>
									</div>
									{#if parcel.owner_verifications && parcel.owner_verifications.length > 0}
										<div class="grid gap-2">
											{#each parcel.owner_verifications as ver}
												<div class="card p-3 preset-filled-surface-100-900 text-sm">
													<div class="flex items-center gap-2 mb-1">
														<span class="badge {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
													</div>
													{#if ver.authority}
														<p class="text-surface-600-400">Authority: {ver.authority}</p>
													{/if}
													{#if ver.status_message}
														<p class="text-surface-600-400">{ver.status_message}</p>
													{/if}
												</div>
											{/each}
										</div>
									{:else}
										<p class="text-sm text-surface-600-400">No owner verifications.</p>
									{/if}
								</div>

								<!-- Monitoring Period Verifications (right) -->
								<div>
									<div class="flex items-center gap-2 mb-3">
										<Activity class="size-5 text-tertiary-500" />
										<h4 class="font-semibold">Monitoring Period Verifications</h4>
									</div>
									{#if parcel.monitoring_verifications && parcel.monitoring_verifications.length > 0}
										<div class="grid gap-2">
											{#each parcel.monitoring_verifications as ver}
												<div class="card p-3 preset-filled-surface-100-900 text-sm">
													<div class="flex items-center gap-2 mb-1">
														<span class="badge {ver.status_code === 'verified' ? 'preset-filled-success-500' : ver.status_code === 'failed' ? 'preset-filled-error-500' : 'preset-filled-warning-500'}">{ver.status_code}</span>
														{#if ver.amount !== undefined}
															<span class="text-surface-600-400">Amount: {ver.amount}</span>
														{/if}
													</div>
													{#if ver.status_message}
														<p class="text-surface-600-400">{ver.status_message}</p>
													{/if}
												</div>
											{/each}
										</div>
									{:else}
										<p class="text-sm text-surface-600-400">No monitoring period verifications.</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-surface-600-400">No parcels found for this project.</p>
			{/if}
		</div>
	{:else}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Project Not Found</h2>
			<p class="text-surface-600-400 mb-4">The requested project could not be found.</p>
			<a href="/projects" class="btn preset-filled-primary-500">Back to Projects</a>
		</div>
	{/if}
</div>
