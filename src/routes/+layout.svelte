<script lang="ts">
	import '../app.css';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import { page } from '$app/state';

	// Lucide Icons
	import { Menu, X, Database, Home, User, Settings, LogOut, LogIn, FolderKanban } from '@lucide/svelte';

	let { data, children } = $props();

	let isAuthenticated = $state(false);
	let isMobileMenuOpen = $state(false);

	if (data.email) {
		isAuthenticated = true;
	} else {
		isAuthenticated = false;
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	let menuItems = $state([
		{
			label: 'Home',
			href: '/',
			iconComponent: Home
		},
		{
			label: 'Projects',
			href: '/projects',
			iconComponent: FolderKanban
		},
		{
			label: 'Dynamic Entities',
			href: '/dynamic-entities',
			iconComponent: Database
		}
	]);

	let footerLinks = $state([
		{
			href: 'https://github.com/OpenBankProject',
			label: 'GitHub'
		}
	]);
</script>

<div
	class="grid h-screen w-full grid-cols-[auto_1fr] divide-x divide-solid divide-surface-100-900 overflow-hidden"
>
	<div class="h-full">
		<Navigation
			layout="sidebar"
			class="grid h-full grid-rows-[auto_1fr_auto] gap-4 preset-filled-primary-50-950"
		>
			<Navigation.Header class="p-4">
				<a href="/" class="flex w-full items-center justify-center">
					<span class="text-xl font-bold">OGCR App</span>
				</a>
			</Navigation.Header>

			<Navigation.Content class="">
				<!-- Main Menu Group -->
				<Navigation.Group>
					<Navigation.Menu class="flex flex-col gap-2 px-2">
						{#each menuItems as item}
							{@const Icon = item.iconComponent}
							<a
								href={item.href}
								class="btn w-full justify-start gap-3 px-2 hover:preset-tonal"
								class:preset-filled-primary-50-950={page.url.pathname === item.href}
								class:border={page.url.pathname === item.href}
								class:border-solid-secondary-500={page.url.pathname === item.href}
								title={item.label}
								aria-label={item.label}
							>
								<Icon class="size-5" />
								<span>{item.label}</span>
							</a>
						{/each}
					</Navigation.Menu>
				</Navigation.Group>

				{#if isAuthenticated}
					<!-- User Menu Group -->
					<Navigation.Group>
						<Navigation.Menu class="flex flex-col gap-2 px-2">
							<a
								href="/user"
								class="btn w-full justify-start gap-3 px-2 hover:preset-tonal"
								class:preset-filled-primary-50-950={page.url.pathname === '/user'}
								title="My Account"
								aria-label="My Account"
							>
								<User class="size-5" />
								<span>My Account</span>
							</a>
						</Navigation.Menu>
					</Navigation.Group>
				{/if}
			</Navigation.Content>

			<Navigation.Footer class="p-4">
				<div class="flex flex-wrap items-center gap-3 text-xs text-surface-800-200">
					{#each footerLinks as link}
						<a href={link.href} class="flex items-center gap-2 hover:text-tertiary-400">
							{link.label}
						</a>
					{/each}
				</div>
			</Navigation.Footer>
		</Navigation>
	</div>
	<div
		class="h-full bg-conic-250 from-30% via-40% to-50% dark:from-primary-950 dark:via-secondary-500/70 dark:to-primary-950"
	>
		<div class="flex flex-col backdrop-blur-2xl" style="height: calc(100vh - 80px);">
			<div
				class="bg-opacity-0 flex items-center justify-end p-4"
				style="height: 80px; flex-shrink: 0;"
			>
				{#if isAuthenticated}
					<span class="mx-4 hover:text-tertiary-400"><a href="/user">{data.username}</a></span>
					<button type="button" class="btn preset-outlined-primary-500"
						><a href="/logout">Logout</a></button
					>
				{:else}
					<button type="button" class="btn preset-filled-surface-950-50"
						><a href="/login">Login</a></button
					>
				{/if}
			</div>

			<main class="flex flex-col overflow-auto" style="height: calc(100vh - 80px);">
				{@render children()}
			</main>
		</div>
	</div>
</div>
