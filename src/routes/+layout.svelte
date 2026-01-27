<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	// Lucide Icons
	import { Home, ChevronRight } from '@lucide/svelte';

	let { data, children } = $props();

	let isAuthenticated = $state(false);

	if (data.email) {
		isAuthenticated = true;
	} else {
		isAuthenticated = false;
	}

	// Build breadcrumbs from current path
	function getBreadcrumbs() {
		const pathname = page.url.pathname;
		if (pathname === '/') return [];

		const segments = pathname.split('/').filter(Boolean);
		const crumbs: { label: string; href: string }[] = [];

		const labelMap: Record<string, string> = {
			projects: 'Projects',
			'dynamic-entities': 'Dynamic Entities',
			create: 'Create',
			user: 'My Account',
			login: 'Login',
			logout: 'Logout'
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
	<header class="flex items-center justify-between px-6 border-b border-surface-200-800" style="height: 56px; flex-shrink: 0;">
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
			{#if isAuthenticated}
				<a href="/user" class="hover:text-tertiary-400">{data.username}</a>
				<a href="/logout" class="btn btn-sm preset-outlined-primary-500">Logout</a>
			{:else}
				<a href="/login" class="btn btn-sm preset-filled-surface-950-50">Login</a>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
