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
		},
		{
			href: '/design',
			icon: Palette,
			title: 'Design System',
			description: 'Browse OGCR components and tokens.'
		}
	];

	// Below the fold: this deployment's OBP data model, then its other OBP apps, wherever
	// OBP's app directory says they are. Only the public MCP server is linked, never
	// public_obp_mcp_internal_url.
	const tools = $derived(
		[
			{
				href: '/dynamic-entities',
				icon: Database,
				title: 'Entities',
				description: 'Lookup, link, main and on-chain tables, with their endpoints and roles.'
			},
			{
				href: data.apiManagerUrl,
				icon: Wrench,
				title: 'API Manager',
				description: 'Manage OBP entities, roles and consumers.'
			},
			{
				href: data.mcpUrl,
				icon: Bot,
				title: 'MCP Server',
				description: 'Connect an AI assistant to OBP.'
			}
		].filter((tool): tool is typeof tool & { href: string } => tool.href !== null)
	);
</script>

<svelte:head>
	<title>OGCR DCR</title>
</svelte:head>

<!-- The app's own sections first; after a gap, the OBP tools of this deployment. -->
<section class="flex w-full justify-center p-8">
	<div class="w-full max-w-5xl">
		<div class="text-center">
			<img src="/ogcr_logo.svg" alt="OGCR" class="mx-auto mb-6 h-16" />
			<h1 class="mb-6 h1">OGCR DCR</h1>
			<p class="mb-4 text-xl text-surface-600-400">
				Explore features and architecture of the OGCR DCR
			</p>
		</div>

		<!-- 1 column on mobile, 2 on tablet, 3 on desktop (design system §3). Six
		     cards divide evenly into three, where the four-column desktop maximum
		     would leave a ragged 4 + 2. -->
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
	<section aria-labelledby="obp-tools" class="mt-16 flex w-full justify-center px-8 pb-12">
		<div class="w-full max-w-5xl">
			<h2 id="obp-tools" class="mb-6 text-center h3">OBP tools</h2>
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
