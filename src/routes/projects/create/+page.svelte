<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { FolderKanban, ArrowLeft, Copy, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);

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
		<a href="/projects" class="btn preset-outlined-surface-500">
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</a>
		<FolderKanban class="size-8 text-primary-500" />
		<h1 class="h1">Create Project</h1>
	</div>

	{#if !data.isAuthenticated}
		<div class="card p-8 preset-filled-surface-100-900 text-center">
			<FolderKanban class="size-16 mx-auto mb-4 text-surface-400" />
			<h2 class="h3 mb-2">Authentication Required</h2>
			<p class="text-surface-600-400 mb-4">Please log in to create projects.</p>
			<a href="/login" class="btn preset-filled-primary-500">Login</a>
		</div>
	{:else}
		{#if form?.success}
			<div class="card p-8 preset-filled-surface-100-900 mb-6">
				<h2 class="h3 mb-2 text-success-500">Project Created</h2>
				<p class="text-surface-600-400 mb-4">API Response:</p>
				<pre class="bg-surface-200-800 p-4 rounded overflow-auto text-sm">{JSON.stringify(form.response, null, 2)}</pre>
				<a href="/projects" class="btn preset-filled-primary-500 mt-4">View All Projects</a>
			</div>
		{:else}
			{#if form?.error}
				<div class="card p-8 preset-filled-surface-100-900 mb-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="h3 text-error-500">Error Creating Project</h2>
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
						<span class="label-text">Project Owner</span>
						<input
							type="text"
							name="project_owner"
							class="input"
							placeholder="e.g., hugo muller passport nr. 1234444"
							required
						/>
					</label>

					<button type="submit" class="btn preset-filled-primary-500">
						Create Project
					</button>
				</form>
			</div>
		{/if}
	{/if}
</div>
