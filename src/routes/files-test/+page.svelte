<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import Timestamp from '$lib/components/Timestamp.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let uploading = $state(false);

	const columns: TableColumn[] = [
		{ key: 'file_name', header: 'File', sortable: true },
		{ key: 'media_type', header: 'Media type', sortable: true },
		{ key: 'size_in_bytes', header: 'Size (bytes)', numeric: true, sortable: true },
		{ key: 'is_public', header: 'Public', align: 'center' },
		{ key: 'created_at', header: 'Stored', sortable: true },
		{ key: 'file_id', header: 'Download' }
	];
	const rows = $derived(data.files.map((file) => ({ ...file })));
</script>

<svelte:head>
	<title>File upload test — OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-[1100px] px-6 py-8">
	<h1 class="text-h1 mb-2">File upload test</h1>
	<p class="text-body mb-2">
		Name Space Id: <code>{data.nameSpaceId || 'SYS'}</code>
	</p>
	<p class="text-body ogcr-secondary mb-8">
		Runs the OBP-API file procedure in that name space: store a file, read it back, compare the
		downloaded bytes with the uploaded ones, attach it to a record, and check the public endpoints. Storing a file
		needs the Role <code>CanCreateFileAtOneBank</code> at <code>{data.space}</code>, and a public one also
		<code>CanCreatePublicFileAtOneBank</code>.
	</p>

	{#if !data.loggedIn}
		<p class="text-body ogcr-secondary">Log in to test file uploads.</p>
	{:else}
		<Card title="Upload a file" headingLevel={2} class="mb-8">
			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				class="space-y-6"
				use:enhance={() => {
					uploading = true;
					return async ({ update }) => {
						await update({ reset: false });
						uploading = false;
					};
				}}
			>
				<label class="label">
					<span class="label-text">File *</span>
					<input class="input" type="file" name="file" required />
					<span class="text-body-s ogcr-secondary">
						OBP accepts at most {data.mediaTypes.join(', ')}, up to its <code>files.max_size_in_bytes</code> (10 MB by default).
					</span>
				</label>

				<label class="flex items-center gap-2">
					<input class="checkbox" type="checkbox" name="is_public" />
					<span class="text-body">Public: anyone may read it without logging in</span>
				</label>

				<div class="ogcr-record">
					<label class="label">
						<span class="label-text">Attach to record type</span>
						<input class="input" name="record_type" list="record-types" placeholder="Choose or type an entity" />
						<datalist id="record-types">
							{#each data.entityTypes as entityType (entityType)}
								<option value={entityType}></option>
							{/each}
						</datalist>
					</label>
					<label class="label">
						<span class="label-text">Record id</span>
						<input class="input" name="record_id" placeholder="the record's id" />
					</label>
				</div>

				<Button type="submit">{uploading ? 'Testing…' : 'Upload and test'}</Button>
			</form>
		</Card>

		{#if form}
			<Card title="Result" headingLevel={2} class="mb-8">
				{#snippet trailing()}
					<Pill tone={form.success ? 'positive' : 'negative'} dot>{form.success ? 'All steps passed' : 'Failed'}</Pill>
				{/snippet}
				{#if form.error}
					<p class="text-body mb-4">{form.error}</p>
				{/if}
				<ol class="ogcr-steps">
					{#each form.steps ?? [] as step, index (index)}
						<li>
							<Pill tone={step.ok ? 'positive' : 'negative'}>{step.ok ? 'Pass' : 'Fail'}</Pill>
							<div>
								<span class="text-body">{step.name}</span>
								<span class="text-body-s ogcr-secondary ogcr-detail">{step.detail}</span>
							</div>
						</li>
					{/each}
				</ol>
				{#if form.fileId}
					<p class="text-body-s mt-4">
						<a class="anchor" href="/files-test/{form.fileId}/content?inline=true" target="_blank" rel="noopener">Open the file</a>
					</p>
				{/if}
			</Card>
		{/if}

		<h2 class="text-h3 mb-4">My files in {data.space}</h2>
		{#if data.filesError}
			<ObpErrorDisplay error={data.filesError} title="Your files could not be loaded" />
		{:else}
			<Table {columns} {rows} regionLabel="My files" emptyMessage="No files yet">
				{#snippet cell(row, column)}
					{#if column.key === 'is_public'}
						{#if row.is_public}<Pill tone="progress">Public</Pill>{:else}<span class="ogcr-secondary">—</span>{/if}
					{:else if column.key === 'created_at'}
						<Timestamp iso={row.created_at as string} />
					{:else if column.key === 'file_name'}
						<a class="anchor" href="/files-test/{row.file_id}/content?inline=true" target="_blank" rel="noopener">{row.file_name}</a>
					{:else if column.key === 'file_id'}
						<a class="anchor" href="/files-test/{row.file_id}/content">Download</a>
					{:else}
						{row[column.key]}
					{/if}
				{/snippet}
			</Table>
		{/if}
	{/if}
</div>

<style>
	.ogcr-secondary {
		color: var(--text-secondary);
	}
	.ogcr-record {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-m);
	}
	.ogcr-steps li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-m);
		padding: var(--space-xs) 0;
		border-bottom: 1px dashed var(--border-light);
	}
	.ogcr-steps li:last-child {
		border-bottom: none;
	}
	.ogcr-steps div {
		display: flex;
		flex-direction: column;
	}
	.ogcr-detail {
		overflow-wrap: anywhere;
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-secondary {
		color: var(--color-surface-400);
	}
</style>
