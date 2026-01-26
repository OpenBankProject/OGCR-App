<script lang="ts">
	import type { PageData } from './$types';
	import { FolderKanban, RefreshCw, ChevronRight, Plus, Copy, Check } from '@lucide/svelte';

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
			<FolderKanban class="size-8 text-primary-500" />
			<h1 class="h1">Projects</h1>
		</div>

		{#if data.isAuthenticated}
			<div class="flex gap-2">
				<a href="/projects/create" class="btn preset-filled-primary-500">
					<Plus class="size-4" />
					<span>Create Project</span>
				</a>
				<a href="/projects" class="btn preset-outlined-primary-500">
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
			<p class="text-surface-600-400 mb-4">Please log in to view projects.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else if data.error}
		<div class="card p-8 preset-filled-surface-100-900">
			<div class="flex items-center justify-between mb-4">
				<h2 class="h3 text-error-500">Error Loading Projects</h2>
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
				<p class="text-surface-600-400 mb-4">Error:</p>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{data.error}</pre>
			{/if}
		</div>
	{:else if data.projects && data.projects.length === 0}
		<div class="card p-8 preset-filled-surface-100-900">
			<h2 class="h3 mb-2">No Projects Found</h2>
			<p class="text-surface-600-400 mb-4">API Response:</p>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.rawResponse, null, 2)}</pre>
		</div>
	{:else if data.projects}
		<!-- Debug: show raw response -->
		<details class="mb-4">
			<summary class="cursor-pointer text-sm text-surface-600-400">Debug: Raw API Response</summary>
			<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-xs mt-2">{JSON.stringify(data.rawResponse, null, 2)}</pre>
		</details>
		<div class="grid gap-4">
			{#each data.projects as project}
				<div class="card p-6 preset-filled-surface-100-900 hover:preset-tonal transition-colors">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="h4 text-primary-500">
								{project.project_owner || 'Unnamed Project'}
							</h3>
							{#if project.project_id}
								<p class="text-sm text-surface-600-400 mt-1">ID: {project.project_id}</p>
							{/if}
						</div>
						<a
							href="/projects/{project.project_id}"
							class="btn preset-outlined-primary-500"
						>
							<span>View Details</span>
							<ChevronRight class="size-4" />
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
