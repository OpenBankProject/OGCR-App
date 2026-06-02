<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { TrendingUp, Tag, BarChart3, HelpCircle } from '@lucide/svelte';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const tabs = $derived([
		{
			href: `/trading/banks/${encodeURIComponent(data.ctx.bankId)}/accounts/${encodeURIComponent(data.ctx.accountId)}/views/${encodeURIComponent(data.ctx.viewId)}/offers`,
			label: 'Offers',
			match: '/offers',
			icon: Tag
		},
		{
			href: `/trading/banks/${encodeURIComponent(data.ctx.bankId)}/accounts/${encodeURIComponent(data.ctx.accountId)}/views/${encodeURIComponent(data.ctx.viewId)}/market`,
			label: 'Market',
			match: '/market',
			icon: BarChart3
		},
		{
			href: '/trading/help',
			label: 'Help',
			match: '/trading/help',
			icon: HelpCircle
		}
	]);

	function isActive(matchSegment: string): boolean {
		return page.url.pathname.includes(matchSegment);
	}
</script>

<div class="px-8 pt-6">
	<div class="flex items-center gap-4 mb-2">
		<TrendingUp class="size-8 text-primary-500" />
		<h1 class="h1">Trading</h1>
	</div>

	<div class="text-sm text-surface-600-400 mb-6">
		<span>Bank: <code>{data.ctx.bankId}</code></span>
		<span class="mx-2">·</span>
		<span>Account: <code>{data.ctx.accountId}</code></span>
		<span class="mx-2">·</span>
		<span>View: <code>{data.ctx.viewId}</code></span>
		<span class="mx-2">·</span>
		<a href="/trading" class="anchor">Change</a>
	</div>

	<div class="flex gap-2 border-b border-surface-200-800 mb-6">
		{#each tabs as tab}
			{@const Icon = tab.icon}
			<a
				href={tab.href}
				class="flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors {isActive(tab.match)
					? 'border-primary-500 text-primary-500'
					: 'border-transparent text-surface-600-400 hover:text-primary-500'}"
			>
				<Icon class="size-4" />
				<span>{tab.label}</span>
			</a>
		{/each}
	</div>
</div>

<div class="px-8 pb-8">
	{@render children()}
</div>
