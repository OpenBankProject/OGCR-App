<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	// Lucide Icons
	import { Home, ChevronRight } from '@lucide/svelte';

	import LightSwitch from '$lib/components/LightSwitch.svelte';
	import Pill from '$lib/components/Pill.svelte';
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
			schema: 'Schema',
			'group-entitlements': 'Group entitlements',
			'files-test': 'File upload test',
			create: 'Create',
			user: 'My Account',
			login: 'Login',
			logout: 'Logout',
			design: 'Design System',
			evaluators: 'Evaluators',
			registry: 'Registry',
			'carbon-garden': 'Carbon Garden',
			simple: 'Simple view',
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
			<!-- What this installation is for (INSTALLATION_USAGE), e.g. that it shows synthetic test data -->
			{#if data.installationUsage}
				<Pill tone="warning">{data.installationUsage}</Pill>
			{/if}
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

		<!-- EU funding notice, shown at the end of every page -->
		<footer class="ogcr-funding">
			<a
				href="https://cordis.europa.eu/project/id/101218854"
				class="ogcr-funding__eu"
				title="The OGCR Project on CORDIS"
			>
				<img src="/eu-flag.svg" alt="" class="ogcr-funding__flag" />
				<span>Funded by<br />the European Union</span>
			</a>
			<div class="ogcr-funding__text">
				<p>
					The OGCR Project has received funding from the European Union's Horizon Europe programme
					under grant agreement
					<a href="https://cordis.europa.eu/project/id/101218854">101218854</a>.
				</p>
				<!-- Its own line, so the copyright reads as this app's, not the whole OGCR Project's. -->
				<p class="ogcr-funding__copyright">
					OGCR-App: &copy; 2026 <a href="https://www.tesobe.com">TESOBE GmbH</a>, licensed under the
					<a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPLv3</a>.
				</p>
			</div>
		</footer>
	</main>
</div>

<style>
	/* The design system has no footer component, so this uses its tokens directly. */
	.ogcr-funding {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-m);
		margin-top: var(--space-xl);
		padding: var(--space-m) var(--space-l);
		border-top: 1px solid var(--border-medium);
		/* Small print: smaller than the page text. */
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.ogcr-funding__eu {
		display: flex;
		align-items: center;
		gap: var(--space-s);
		color: inherit;
		text-decoration: none;
	}

	/* The flag keeps its 3:2 ratio and its earlier size, as the EU asks for a clearly visible emblem. */
	.ogcr-funding__flag {
		height: 40px;
		width: auto;
	}

	.ogcr-funding__text {
		max-width: 48rem;
	}

	.ogcr-funding__copyright {
		margin-top: var(--space-xs);
	}

	.ogcr-funding__text a {
		color: inherit;
		text-decoration: underline;
	}

	:global([data-mode='dark']) .ogcr-funding {
		border-color: var(--color-surface-700);
		color: var(--color-surface-400);
	}
</style>
