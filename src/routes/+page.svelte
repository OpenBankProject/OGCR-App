<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import {
		Leaf,
		Building2,
		Store,
		Link2,
		Palette,
		Library,
		Wrench,
		Bot,
		Database
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// Destinations are the app's existing routes — Operators lives under /my
	// because the page is scoped to the operators linked to the signed-in user.
	const destinations = [
		{
			href: '/registry',
			icon: Library,
			title: 'Registry',
			description: 'Browse the public carbon activity registry.'
		},
		{
			href: '/activities',
			icon: Leaf,
			title: 'Activities',
			description: 'Create and manage activities for testing against the DCR.'
		},
		{
			href: '/my/operators',
			icon: Building2,
			title: 'Operators',
			description: 'Manage operator records.'
		},
		{
			href: '/trading',
			icon: Store,
			title: 'Trading',
			description: 'Open the trading interface.'
		},
		{
			href: '/chain',
			icon: Link2,
			title: 'Chain',
			description: 'Inspect on-chain state and the sync status.'
		}
	];

	// Below the fold: this deployment's OBP data model, then its other OBP apps, wherever
	// OBP's app directory says they are. Only the public MCP server is linked, never
	// public_obp_mcp_internal_url.
	const tools = $derived(
		[
			{
				href: '/schema',
				icon: Database,
				title: 'Schema',
				description: 'View schema and endpoints.'
			},
			{
				href: data.apiManagerUrl,
				icon: Wrench,
				title: 'API Manager',
				description: 'Manage schema and access.'
			},
			{
				href: data.mcpUrl,
				icon: Bot,
				title: 'MCP Server',
				description: 'Connect AI tools to the API.'
			}
		].filter((tool): tool is typeof tool & { href: string } => tool.href !== null)
	);
</script>

<svelte:head>
	<title>OGCR DCR</title>
</svelte:head>

<!-- The app's own sections first; then the technical environment of this deployment; the design system last. -->
<section class="flex w-full justify-center p-8">
	<div class="w-full max-w-5xl">
		<div class="text-center">
			<img src="/ogcr_logo.svg" alt="OGCR" class="mx-auto mb-6 h-16" />
			<h1 class="mb-6 h1">OGCR DCR</h1>
			<p class="mb-4 h3 text-surface-600-400">
				Explore and Operate
			</p>
		</div>

		<!-- 1 column on mobile, 2 on tablet, 3 on desktop (design system §3). -->
		<nav aria-label="Sections" class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each destinations as { href, icon: Icon, title, description } (href)}
				<Card {href} {title} subtitle={description}>
					{#snippet leading()}
						<Icon class="size-6" aria-hidden="true" />
					{/snippet}
				</Card>
			{/each}
		</nav>
	</div>
</section>

{#if tools.length > 0}
	<section aria-labelledby="obp-tools" class="mt-16 flex w-full justify-center px-8">
		<div class="w-full max-w-5xl">
			<h2 id="obp-tools" class="mb-6 text-center h3">Technical Environment</h2>
			<nav aria-labelledby="obp-tools" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each tools as { href, icon: Icon, title, description } (title)}
					<Card {href} {title} subtitle={description}>
						{#snippet leading()}
							<Icon class="size-6" aria-hidden="true" />
						{/snippet}
					</Card>
				{/each}
			</nav>
		</div>
	</section>
{/if}

<section aria-labelledby="design" class="mt-16 flex w-full justify-center px-8 pb-12">
	<div class="w-full max-w-5xl">
		<h2 id="design" class="mb-6 text-center h3">Design</h2>
		<!-- One card, centred at the width of one column of the grids above. -->
		<nav aria-labelledby="design" class="mx-auto grid max-w-sm grid-cols-1">
			<Card href="/design" title="Design System" subtitle="Browse OGCR components and tokens.">
				{#snippet leading()}
					<Palette class="size-6" aria-hidden="true" />
				{/snippet}
			</Card>
		</nav>
	</div>
</section>
