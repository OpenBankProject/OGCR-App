<script lang="ts">
	import type { PageData } from './$types';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { LOOKUP_MAX_COLUMNS_EXCLUSIVE, type EntityCategory } from '$lib/obp/dynamicSummary';
	import { apiManagerEntityHref, entityPage } from '$lib/obp/entityPages';
	import { ExternalLink } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const summary = $derived(data.summary);

	// Most important first: the main tables lead (top / left), then the chain mirrors,
	// then the supporting link and lookup tables.
	// `noun` is the lower-case form used in the summary sentence.
	const categories: { key: EntityCategory; title: string; noun: string; description: string }[] = [
		{
			key: 'main',
			title: 'Main tables',
			noun: 'main',
			description: 'The registry and marketplace records.'
		},
		{
			key: 'onChain',
			title: 'On-chain tables',
			noun: 'on-chain',
			description: 'Mirrors of chain state, named *_on_chain.'
		},
		{
			key: 'link',
			title: 'Link tables',
			noun: 'link',
			description: 'Only *_id columns: they join other entities.'
		},
		{
			key: 'lookup',
			title: 'Lookup tables',
			noun: 'lookup',
			description: `Fewer than ${LOOKUP_MAX_COLUMNS_EXCLUSIVE} columns, e.g. a code and its name.`
		}
	];

	const total = (pair: { entity: number; resourceDoc: number }) => pair.entity + pair.resourceDoc;
</script>

<svelte:head>
	<title>Schema — OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-[1400px] px-6 py-8">
	<h1 class="text-h1 mb-2">Schema</h1>
	<p class="text-body mb-8 text-surface-600-400">
		The OBP Dynamic Entities and Dynamic Resource Docs of space <code>{data.space}</code>, counted
		from OBP's resource docs.
	</p>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The resource docs could not be loaded" />
	{:else if summary}
		<section aria-labelledby="summary-counts">
			<h2 id="summary-counts" class="sr-only">Counts</h2>
			<p class="ogcr-summary">
				The schema holds
				{#each categories as category, i (category.key)}
					{i === categories.length - 1 ? 'and ' : ''}<span class="ogcr-summary__n"
						>{summary.entities[category.key].length}</span
					>
					{category.noun}{i < categories.length - 2 ? ',' : ''}{' '}
				{/each}
				tables, served by <span class="ogcr-summary__n">{total(summary.endpoints)}</span>
				endpoints and guarded by <span class="ogcr-summary__n">{total(summary.roles)}</span> roles.
			</p>
			<p class="text-body-s mt-2 text-surface-600-400">
				Endpoints: {summary.endpoints.entity} for entities, {summary.endpoints.resourceDoc} for
				resource docs. Roles: {summary.roles.entity} for entities, {summary.roles.resourceDoc} for
				resource docs.
			</p>
		</section>

		<section aria-labelledby="entity-lists" class="mt-10">
			<h2 id="entity-lists" class="sr-only">Entities by category</h2>
			<!-- Two by two: entity names are long, and four columns would wrap most of them. -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				{#each categories as category (category.key)}
					{@const entities = summary.entities[category.key]}
					<div class="ogcr-panel">
						<h3 class="ogcr-panel__title">{category.title} ({entities.length})</h3>
						<p class="ogcr-panel__description text-surface-600-400">{category.description}</p>
						{#if entities.length === 0}
							<p class="text-body-s text-surface-600-400">None</p>
						{:else}
							<ul class="ogcr-panel__list">
								{#each entities as entity (entity.name)}
									{@const page = entityPage(entity.name)}
									<li>
										<div class="ogcr-entity">
											<code>{entity.name}</code>
											{#if data.apiManagerUrl || page}
												<span class="ogcr-entity__links">
													{#if data.apiManagerUrl}
														<a
															href={apiManagerEntityHref(data.apiManagerUrl, data.space, entity.name)}
															class="anchor"
															target="_blank"
															rel="noopener"
														>
															Details in API Manager<ExternalLink
																class="ml-0.5 inline size-3"
																aria-label="(opens in a new tab)"
															/>
														</a>
													{/if}
													{#if page}
														<a href={page.href} class="anchor">Used in {page.label}</a>
													{/if}
												</span>
											{/if}
										</div>
										<span class="ogcr-entity__columns text-surface-600-400">
											{entity.columns}
											{entity.columns === 1 ? 'column' : 'columns'}
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.ogcr-summary {
		max-width: 60rem;
		font-size: var(--font-size-l);
		line-height: 1.6;
		color: var(--text-secondary);
	}
	/* The figures carry the sentence, so they are set at KPI-value size. */
	.ogcr-summary__n {
		font-size: var(--font-size-xl);
		font-weight: 500;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.ogcr-panel {
		padding: var(--space-m);
		background: var(--surface-light);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-l);
	}
	.ogcr-panel__title {
		margin-bottom: var(--space-s);
		font-family: var(--font-family-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}
	.ogcr-panel__description {
		margin-bottom: var(--space-s);
		font-size: var(--font-size-s);
	}
	.ogcr-panel__list li {
		display: flex;
		justify-content: space-between;
		gap: var(--space-s);
		padding: 6px 0;
		border-bottom: 1px dashed var(--border-light);
		font-size: var(--font-size-s);
	}
	/* Long entity names wrap; the column count stays on one line beside them. */
	.ogcr-entity {
		min-width: 0;
	}
	.ogcr-entity code {
		overflow-wrap: anywhere;
	}
	.ogcr-entity__links {
		display: flex;
		flex-wrap: wrap;
		gap: 2px var(--space-m);
		margin-top: 2px;
		font-size: 12px;
	}
	.ogcr-entity__columns {
		flex-shrink: 0;
		white-space: nowrap;
	}
	.ogcr-panel__list li:last-child {
		border-bottom: none;
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-summary {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-summary__n {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .ogcr-panel {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-panel__title {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-panel__list li {
		border-bottom-color: var(--color-surface-700);
	}
</style>
