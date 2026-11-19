<script lang="ts">
	import type { PageData } from './$types';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { LOOKUP_MAX_COLUMNS_EXCLUSIVE, type EntityCategory } from '$lib/obp/dynamicSummary';
	import { apiManagerEntityHref, entityPage } from '$lib/obp/entityPages';
	import { ExternalLink } from '@lucide/svelte';
	import {
		BUILT_IN_ENTITY_COUNT,
		BUILT_IN_ENTITY_GROUPS,
		glossaryHref
	} from '$lib/obp/builtInEntities';

	let { data }: { data: PageData } = $props();

	const summary = $derived(data.summary);

	// Most important first: the main tables lead (top / left), then the chain mirrors,
	// then the supporting link and lookup tables.
	const categories: { key: EntityCategory; title: string; description: string }[] = [
		{
			key: 'main',
			title: 'Main tables',
			description: 'The registry and marketplace records.'
		},
		{
			key: 'onChain',
			title: 'On-chain tables',
			description: 'Mirrors of chain state, named *_on_chain.'
		},
		{
			key: 'link',
			title: 'Link tables',
			description: 'Only *_id columns: they join other entities.'
		},
		{
			key: 'lookup',
			title: 'Lookup tables',
			description: `Fewer than ${LOOKUP_MAX_COLUMNS_EXCLUSIVE} columns, e.g. a code and its name.`
		}
	];
</script>

{#snippet moreLinks(what: string, apiManagerHref: string | null, glossaryTitles: string[])}
	{#if apiManagerHref || data.apiExplorerUrl}
		<p class="ogcr-entity__links mb-4">
			{#if apiManagerHref}
				<a href={apiManagerHref} class="anchor" target="_blank" rel="noopener">
					{what} in API Manager<ExternalLink
						class="ml-0.5 inline size-3"
						aria-label="(opens in a new tab)"
					/>
				</a>
			{/if}
			{#if data.apiExplorerUrl}
				{#each glossaryTitles as title (title)}
					<a
						href={glossaryHref(data.apiExplorerUrl, title)}
						class="anchor"
						target="_blank"
						rel="noopener"
					>
						Glossary: {title}<ExternalLink
							class="ml-0.5 inline size-3"
							aria-label="(opens in a new tab)"
						/>
					</a>
				{/each}
			{/if}
		</p>
	{:else}
		<div class="mb-4"></div>
	{/if}
{/snippet}

<svelte:head>
	<title>Schema — OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-[1400px] px-6 py-8">
	<h1 class="text-h1 mb-2">Schema</h1>
	<p class="text-body mb-8 text-surface-600-400">
		The Static and Dynamic Entities and Dynamic Resource Docs of space <code>{data.space}</code>.
	</p>

	<!-- Static, so shown even when the resource docs could not be loaded. -->
	<section aria-labelledby="static-entities" class="mb-10">
		<h2 id="static-entities" class="text-h2 mb-2">Static Entities ({BUILT_IN_ENTITY_COUNT})</h2>
		<p class="text-body mb-4 text-surface-600-400">
			OBP-API's own records that the registry relies on (summary). They are built into OBP-API, not
			defined in the space.
		</p>
		<!-- The three groups sit side by side on wide screens. -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			{#each BUILT_IN_ENTITY_GROUPS as group (group.title)}
				<div class="ogcr-panel">
					<h3 class="ogcr-panel__title">{group.title} ({group.entities.length})</h3>
					<p class="ogcr-panel__description text-surface-600-400">{group.description}</p>
					<ul class="ogcr-panel__list">
						{#each group.entities as entity (entity.name)}
							<li>
								<div class="ogcr-entity">
									<code>{entity.name}</code>
									<p class="ogcr-builtin__description">{entity.description}</p>
									{#if data.apiExplorerUrl || entity.page}
										<span class="ogcr-entity__links">
											{#if data.apiExplorerUrl}
												<!-- Just "Glossary" for one Item; name each Item when there are more. -->
												{#each entity.glossaryTitles as glossaryTitle (glossaryTitle)}
													<a
														href={glossaryHref(data.apiExplorerUrl, glossaryTitle)}
														class="anchor"
														target="_blank"
														rel="noopener"
													>
														{entity.glossaryTitles.length === 1
															? 'Glossary'
															: `Glossary: ${glossaryTitle}`}<ExternalLink
															class="ml-0.5 inline size-3"
															aria-label="(opens in a new tab)"
														/>
													</a>
												{/each}
											{/if}
											{#if entity.page}
												<a href={entity.page.href} class="anchor">Used in {entity.page.label}</a>
											{/if}
										</span>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>

	<section aria-labelledby="dynamic-entities" class="mb-10">
		<h2 id="dynamic-entities" class="text-h2 mb-2">Dynamic Entities</h2>
		<p class="text-body mb-2 text-surface-600-400">
			The registry's own record types, such as activity and parcel. A Dynamic Entity is defined
			while OBP-API is running, without changing its code, and OBP-API then provides its endpoints
			and the Roles that guard them. OGCR-DynamicEntities defines them in the space from the schema
			spreadsheet.
		</p>
		{@render moreLinks(
			'Dynamic Entities',
			data.apiManagerUrl
				? `${data.apiManagerUrl.replace(/\/$/, '')}/dynamic-entities/system`
				: null,
			['Dynamic-Entities', 'Dynamic-Entity-Access-Model']
		)}
		{#if data.error}
			<ObpErrorDisplay error={data.error} title="The resource docs could not be loaded" />
		{:else if summary}
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
															href={apiManagerEntityHref(
																data.apiManagerUrl,
																data.space,
																entity.name
															)}
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
		{/if}
	</section>

	{#if !data.error}
		<section aria-labelledby="resource-docs">
			<h2 id="resource-docs" class="text-h2 mb-2">
				Dynamic Resource Docs ({data.resourceDocs.length})
			</h2>
			<p class="text-body mb-2 text-surface-600-400">
				Endpoints defined in the space while OBP-API is running, such as the Dynamic Queries behind
				the public registry pages. A Dynamic Query reads one Dynamic Entity and joins in related
				records. One that needs no Role can be called without logging in.
			</p>
			{@render moreLinks(
				'Dynamic Resource Docs',
				data.apiManagerUrl
					? `${data.apiManagerUrl.replace(/\/$/, '')}/dynamic-resource-docs/system`
					: null,
				['Dynamic Resource Doc', 'Dynamic Query']
			)}
			<div class="ogcr-panel">
				{#if data.resourceDocs.length === 0}
					<p class="text-body-s text-surface-600-400">None</p>
				{:else}
					<ul class="ogcr-panel__list">
						{#each data.resourceDocs as resourceDoc (resourceDoc.verb + resourceDoc.path)}
							<li>
								<code>{resourceDoc.verb} {resourceDoc.path}</code>
								<span class="ogcr-entity__columns text-surface-600-400">
									{resourceDoc.roles.length === 0 ? 'No Role needed' : resourceDoc.roles.join(', ')}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{/if}
</div>

<style>
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
	.ogcr-builtin__description {
		margin-top: 2px;
		color: var(--text-secondary);
	}
	.ogcr-entity__columns {
		flex-shrink: 0;
		white-space: nowrap;
	}
	.ogcr-panel__list li:last-child {
		border-bottom: none;
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-panel {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-builtin__description {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-panel__title {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-panel__list li {
		border-bottom-color: var(--color-surface-700);
	}
</style>
