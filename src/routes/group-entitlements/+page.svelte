<script lang="ts">
	import type { PageData } from './$types';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import { additionalEntitlements, operationsOn } from '$lib/obp/groupEntitlements';

	let { data }: { data: PageData } = $props();

	// Group ids key the cells; `entity` cannot clash with one, as OBP group ids are UUIDs.
	const columns = $derived<TableColumn[]>([
		{ key: 'entity', header: 'Entity', sortable: true },
		...data.groups.map((group) => ({
			key: group.group_id,
			header: group.is_enabled === false ? `${group.group_name} (disabled)` : group.group_name,
			align: 'center' as const,
			sortable: true
		}))
	]);

	const rows = $derived(
		data.entities.map(({ name }) => ({
			entity: name,
			...Object.fromEntries(
				data.groups.map((group) => [
					group.group_id,
					operationsOn(name, group.list_of_roles ?? []).join('')
				])
			)
		}))
	);

	const additional = $derived(
		additionalEntitlements(
			data.groups,
			data.entities.map(({ name }) => name)
		)
	);
</script>

<svelte:head>
	<title>Group entitlements — OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-[1400px] px-6 py-8">
	<h1 class="text-h1 mb-2">Group entitlements</h1>
	<p class="text-body ogcr-secondary mb-2">
		What each OBP Group at bank <code>{data.space}</code> lets its members do with the records of each
		Dynamic Entity.
	</p>
	<p class="text-body-s ogcr-secondary mb-8">
		<span class="ogcr-ops">C</span> create, <span class="ogcr-ops">R</span> read,
		<span class="ogcr-ops">U</span> update, <span class="ogcr-ops">D</span> delete. A dash means no access.
	</p>

	{#if data.entitiesError}
		<ObpErrorDisplay error={data.entitiesError} title="The Dynamic Entities could not be loaded" />
	{/if}
	{#if data.groupsError}
		<ObpErrorDisplay error={data.groupsError} title="The groups could not be loaded" />
	{/if}

	{#if !data.entitiesError && !data.groupsError}
		{#if data.groups.length === 0}
			<p class="text-body ogcr-secondary">There are no groups at bank <code>{data.space}</code>.</p>
		{:else}
			<Table
				{columns}
				{rows}
				regionLabel="Group entitlements by entity"
				emptyMessage="No Dynamic Entities"
				maxHeight="75vh"
				stickyFirstColumn
			>
				{#snippet cell(row, column)}
					{@const value = row[column.key] as string}
					{#if column.key === 'entity'}
						<code>{value}</code>
					{:else if value}
						<span class="ogcr-ops">{value}</span>
					{:else}
						<span class="ogcr-secondary" aria-label="No access">—</span>
					{/if}
				{/snippet}
			</Table>

			<section aria-labelledby="additional-heading" class="mt-10">
				<h2 id="additional-heading" class="text-h3 mb-2">Additional Entitlements</h2>
				<p class="text-body-s ogcr-secondary mb-4">
					Roles the groups grant besides the entity record roles in the matrix.
				</p>
				{#if additional.length === 0}
					<p class="text-body ogcr-secondary">None</p>
				{:else}
					<ul class="ogcr-additional">
						{#each additional as { role, groups } (role)}
							<li>
								<code>{role}</code>
								<span class="text-body-s ogcr-secondary">
									{groups
										.map((g) =>
											g.is_enabled === false ? `${g.group_name} (disabled)` : g.group_name
										)
										.join(', ')}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	{/if}
</div>

<style>
	.ogcr-secondary {
		color: var(--text-secondary);
	}
	/* The operation letters line up down a column, so they are set in the mono face. */
	.ogcr-ops {
		font-family: var(--font-family-mono);
		font-weight: 500;
		letter-spacing: 0.14em;
		color: var(--text-primary);
	}

	.ogcr-additional li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 2px var(--space-m);
		padding: 6px 0;
		border-bottom: 1px dashed var(--border-light);
	}
	.ogcr-additional li:last-child {
		border-bottom: none;
	}
	.ogcr-additional code {
		overflow-wrap: anywhere;
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-secondary {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-ops {
		color: var(--color-surface-50);
	}
</style>
