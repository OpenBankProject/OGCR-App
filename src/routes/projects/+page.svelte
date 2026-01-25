<script lang="ts">
	import type { PageData } from './$types';
	import { FolderKanban, RefreshCw, ChevronRight } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-8">
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center gap-4">
			<FolderKanban class="size-8 text-primary-500" />
			<h1 class="h1">Projects</h1>
		</div>

		{#if data.isAuthenticated}
			<div class="flex gap-2">
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
		<div class="card p-8 preset-filled-error-100-900">
			<h2 class="h3 mb-2 text-error-500">Error Loading Projects</h2>
			<p class="text-surface-600-400">{data.error}</p>
		</div>
	{:else if data.projects && data.projects.length === 0}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">No Projects Found</h2>
			<p class="text-surface-600-400 mb-4">There are no projects in the system yet.</p>
		</div>
	{:else if data.projects}
		<div class="grid gap-4">
			{#each data.projects as project}
				<div class="card p-6 preset-filled-surface-100-900 hover:preset-tonal transition-colors">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="h4 text-primary-500">
								{project.project_name || project.name || 'Unnamed Project'}
							</h3>
							{#if project.project_id}
								<p class="text-sm text-surface-600-400 mt-1">ID: {project.project_id}</p>
							{/if}
							{#if project.description}
								<p class="text-sm text-surface-600-400 mt-1">{project.description}</p>
							{/if}
						</div>
						<a
							href="/projects/{project.project_id || project.id}"
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
