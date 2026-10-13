<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Domain API — OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-6 py-8">
	<h1 class="text-h1 mb-2">Domain API</h1>
	<p class="text-body ogcr-secondary mb-8">
		The endpoints of space <code>{data.space}</code> published under a base path of their own, with an
		OpenAPI document carrying the Domain API's own title and description.
	</p>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The Domain APIs could not be loaded" />
	{:else if data.domainApis.length === 0}
		<p class="text-body ogcr-secondary">
			Space <code>{data.space}</code> has no publicly discoverable Domain API. A Domain API is listed
			here once its <code>is_publicly_discoverable</code> is set to true.
		</p>
	{:else}
		<div class="flex flex-col gap-4">
			{#each data.domainApis as api (api.base_path)}
				<Card title={api.title} headingLevel={2}>
					{#snippet trailing()}
						<Pill>v{api.version}</Pill>
					{/snippet}
					{#if api.description}
						<p class="text-body ogcr-description">{api.description}</p>
					{/if}
					<dl class="ogcr-domain-api">
						<dt class="text-body-s ogcr-secondary">Base URL</dt>
						<dd><code>{api.url}</code></dd>
						<dt class="text-body-s ogcr-secondary">OpenAPI</dt>
						<dd class="ogcr-files">
							<a href="{api.url}/openapi.json" class="anchor">openapi.json</a>
							<a href="{api.url}/openapi.yaml" class="anchor">openapi.yaml</a>
						</dd>
					</dl>

					<section class="ogcr-public-gets" aria-label="Public GET endpoints of {api.title}">
						<h3 class="ogcr-subheading">Public GET endpoints</h3>
						{#if api.publicGetsError}
							<ObpErrorDisplay error={api.publicGetsError} title="The OpenAPI document could not be read" />
						{:else if api.publicGets.length === 0}
							<p class="text-body-s ogcr-secondary">None: every GET needs a login.</p>
						{:else}
							<p class="text-body-s ogcr-secondary">
								{api.publicGets.length} that need no login. Open one to see it answer.
							</p>
							<ul class="ogcr-endpoints">
								{#each api.publicGets as endpoint (endpoint.path)}
									<li>
										<span class="ogcr-verb">GET</span>
										<a href="{api.url}{endpoint.path}" class="anchor"><code>{endpoint.path}</code></a>
										{#if endpoint.summary}
											<span class="text-body-s ogcr-secondary">{endpoint.summary}</span>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</section>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<style>
	.ogcr-secondary {
		color: var(--text-secondary);
	}
	.ogcr-description {
		margin: 0;
		color: var(--text-primary);
		white-space: pre-line;
	}

	.ogcr-domain-api {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: var(--space-xs) var(--space-m);
		align-items: baseline;
		margin: 0;
	}
	.ogcr-domain-api dd {
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.ogcr-files {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-m);
	}

	.ogcr-subheading {
		margin: 0 0 var(--space-xs);
		font-size: var(--font-size-s);
		font-weight: 500;
		color: var(--text-primary);
	}
	.ogcr-endpoints {
		margin: var(--space-s) 0 0;
		padding: 0;
		list-style: none;
	}
	.ogcr-endpoints li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px var(--space-s);
		padding: 6px 0;
		border-bottom: 1px dashed var(--border-light);
	}
	.ogcr-endpoints li:last-child {
		border-bottom: none;
	}
	.ogcr-endpoints code {
		overflow-wrap: anywhere;
	}
	.ogcr-verb {
		font-family: var(--font-family-mono);
		font-size: var(--font-size-s);
		font-weight: 500;
		color: var(--text-positive);
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-secondary {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-description,
	:global([data-mode='dark']) .ogcr-subheading {
		color: var(--color-surface-50);
	}
</style>
