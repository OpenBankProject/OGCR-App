<script lang="ts">
	import type { PageData } from './$types';
	import { FolderKanban, ArrowLeft, RefreshCw, Copy, Check } from '@lucide/svelte';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	let copied = $state(false);

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
			<a href="/projects" class="btn preset-outlined-surface-50-950">
				<ArrowLeft class="size-4" />
				<span>Back to Projects</span>
			</a>
		</div>

		{#if data.isAuthenticated && data.project}
			<div class="flex gap-2">
				<a href="/projects/{page.params.id}" class="btn preset-outlined-primary-500">
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
						{data.project.project_name || data.project.name || 'Unnamed Project'}
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
								<span class="font-medium text-surface-600-400 min-w-[200px]">{key}:</span>
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
	{:else}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Project Not Found</h2>
			<p class="text-surface-600-400 mb-4">The requested project could not be found.</p>
			<a href="/projects" class="btn preset-filled-primary-500">Back to Projects</a>
		</div>
	{/if}
</div>
