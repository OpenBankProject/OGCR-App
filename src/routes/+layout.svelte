<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	// Lucide Icons
	import { Home, ChevronRight } from '@lucide/svelte';

	import LightSwitch from '$lib/components/LightSwitch.svelte';
	import PageRoleCheck from '$lib/components/PageRoleCheck.svelte';

	let { data, children } = $props();

	let isAuthenticated = $derived(!!data.email);

	// Build breadcrumbs from current path
	function getBreadcrumbs() {
		const pathname = page.url.pathname;
		if (pathname === '/') return [];

		const segments = pathname.split('/').filter(Boolean);
		const crumbs: { label: string; href: string }[] = [];

		const labelMap: Record<string, string> = {
			activities: 'Activities',
			chain: 'Chain',
			my: 'My',
			operators: 'Operators',
			'dynamic-entities': 'Dynamic Entities',
			create: 'Create',
			user: 'My Account',
			login: 'Login',
			logout: 'Logout',
			design: 'Design System',
			registry: 'Registry',
			certificates: 'Certificates',
			trading: 'Trading',
			banks: 'Bank',
			accounts: 'Account',
			views: 'View',
			offers: 'Offers',
			market: 'Market',
			orders: 'Orders',
			matches: 'Matches',
			trades: 'Trades',
			settlements: 'Settlements',
			withdrawals: 'Withdrawals'
		};

		let path = '';
		for (const segment of segments) {
			path += `/${segment}`;
			const label = labelMap[segment] || segment;
			crumbs.push({ label, href: path });
		}

		return crumbs;
	}
</script>

<div class="flex h-screen w-full flex-col overflow-hidden">
	<!-- Top bar -->
	<header
		class="flex items-center justify-between border-b border-surface-200-800 px-6"
		style="height: 56px; flex-shrink: 0;"
	>
		<div class="flex items-center gap-2">
			<a href="/" class="flex items-center gap-2 hover:opacity-80">
				<img src="/ogcr_logo.svg" alt="OGCR" class="h-8" />
			</a>

			{#each getBreadcrumbs() as crumb, i}
				<ChevronRight class="size-4 text-surface-400" />
				{#if i === getBreadcrumbs().length - 1}
					<span class="text-surface-600-400">{crumb.label}</span>
				{:else}
					<a href={crumb.href} class="hover:text-primary-500">{crumb.label}</a>
				{/if}
			{/each}
		</div>

		<div class="flex items-center gap-4">
			<LightSwitch />
			{#if isAuthenticated}
				<a href="/user" class="hover:text-tertiary-400">{data.username}</a>
				<a href="/logout" class="btn preset-outlined-primary-500 btn-sm">Logout</a>
			{:else}
				<a href="/login" class="btn preset-filled-surface-950-50 btn-sm">Login</a>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="flex-1 overflow-auto">
		{#if isAuthenticated}
			<PageRoleCheck pageRoles={data.pageRoles} userEntitlements={data.userEntitlements}>
				{@render children()}
			</PageRoleCheck>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>
