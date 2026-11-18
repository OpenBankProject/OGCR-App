<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import { DEPLOY_URL, SOURCE_CODE_URL } from '$lib/constants/links';
	import {
		Library,
		Database,
		Users,
		Compass,
		Link2,
		Activity,
		Globe,
		Bot,
		Leaf,
		Network,
		Ship,
		MessageSquare
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	// What to look at, roughly in the order an evaluator meets the registry: the public
	// pages, the data model and access rules, the API, the chain, then running it yourself.
	// A tool OBP's app directory has no URL for is left out.
	const suggestions = $derived(
		[
			{
				href: '/registry',
				icon: Library,
				title: 'The public registry',
				description:
					'Browse activities as a list or on the map, and open one to see its details. No login needed.'
			},
			{
				href: '/schema',
				icon: Database,
				title: 'The data model',
				description: 'Every entity in the registry, with its fields and endpoints.'
			},
			{
				href: '/group-entitlements',
				icon: Users,
				title: 'Who can do what',
				description: 'The Roles each group gives, for each entity. This is the access control.'
			},
			{
				href: data.apiExplorerUrl,
				icon: Compass,
				title: 'The API',
				description:
					'Every endpoint, with its documentation. Log in to try them with your own Roles.'
			},
			{
				href: '/chain',
				icon: Link2,
				title: 'The blockchain',
				description: 'The tokens minted for verified records, and how fresh the mirror is.'
			},
			{
				href: '/setup',
				icon: Activity,
				title: 'Setup and status',
				description:
					'Whether each part is in place. The page links on to whether each service is running.'
			},
			{
				href: data.portalUrl,
				icon: Globe,
				title: 'Register an app',
				description: 'Register in the Portal, get API keys, and call the API from your own code.'
			},
			{
				href: data.mcpUrl,
				icon: Bot,
				title: 'AI agents',
				description: 'Connect Claude Code or another AI tool to the API through the MCP server.'
			},
			{
				href: '/activities',
				icon: Leaf,
				title: 'Create test data',
				description:
					'Log in to create activities and operators, and follow them through the registry.'
			}
		].filter(
			(suggestion): suggestion is typeof suggestion & { href: string } => suggestion.href !== null
		)
	);
</script>

{#snippet opeyIcon()}
	<MessageSquare class="size-4" aria-hidden="true" />
{/snippet}

<svelte:head>
	<title>Evaluators - OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-[1100px] px-6 py-8">
	<h1 class="text-h1 mb-2">Evaluators</h1>
	<p class="text-body ogcr-secondary mb-10">
		For anyone evaluating the OGCR Digital Carbon Registry: what to look at, how it is built, and
		how to install it yourself.
	</p>

	<!-- The Portal's home page hosts the Opey agent chat. Hidden when OBP-API gives no Portal address. -->
	{#if data.portalUrl}
		<div class="mb-10">
			<Button href={data.portalUrl} iconLeft={opeyIcon}>Ask the Opey Agent</Button>
		</div>
	{/if}

	<section aria-labelledby="look" class="mb-12">
		<h2 id="look" class="text-h2 mb-2">What to look at</h2>
		<p class="text-body ogcr-secondary mb-6">
			A suggested route through this sandbox. Each part is live, and works with the same API you
			would use.
		</p>
		<!-- 1 column on mobile, 2 on tablet, 3 on desktop (design system §3). -->
		<nav aria-labelledby="look" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each suggestions as { href, icon: Icon, title, description } (title)}
				<Card {href} {title} subtitle={description}>
					{#snippet leading()}
						<Icon class="size-6" aria-hidden="true" />
					{/snippet}
				</Card>
			{/each}
		</nav>
	</section>

	<section aria-labelledby="components">
		<h2 id="components" class="text-h2 mb-2">How it is built</h2>
		<p class="text-body ogcr-secondary mb-6">
			The registry is made of separate services that all work through one API. Each is its own open
			source repository.
		</p>
		<nav aria-labelledby="components" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<Card
				href={SOURCE_CODE_URL}
				title="The components"
				subtitle="Each part of the registry, what it does, and a link to its repository."
			>
				{#snippet leading()}
					<Network class="size-6" aria-hidden="true" />
				{/snippet}
			</Card>
			<Card
				href={DEPLOY_URL}
				title="Install OGCR DCR"
				subtitle="Build it from source on your own servers, or install it on Kubernetes with Helm."
			>
				{#snippet leading()}
					<Ship class="size-6" aria-hidden="true" />
				{/snippet}
			</Card>
		</nav>
	</section>
</div>

<style>
	.ogcr-secondary {
		color: var(--text-secondary);
	}
	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-secondary {
		color: var(--color-surface-400);
	}
</style>
