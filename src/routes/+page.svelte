<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { Leaf, Building2, Store, Link2, Palette, Library } from '@lucide/svelte';

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
</script>

<div class="flex h-full w-full justify-center p-8">
	<div class="w-full max-w-5xl">
		<div class="text-center">
			<img src="/ogcr_logo.svg" alt="OGCR" class="mx-auto mb-6 h-16" />
			<h1 class="mb-6 h1">Welcome to OGCR App</h1>
			<p class="mb-4 text-xl text-surface-600-400">
				An example application to interact with the OGCR entities
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
</div>
