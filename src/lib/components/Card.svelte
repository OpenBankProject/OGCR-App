<script lang="ts">
	/**
	 * OGCR Design System — Card (spec §4.3).
	 *
	 * Values are taken from the SHIPPED component, not from the copy-paste CSS in
	 * spec §4.3: those declarations are stale, and no `.ogcr-*` class exists
	 * anywhere in the design system's source. See design_system_integration.md
	 * ("A trap in the spec").
	 *
	 * The shipped component is Tailwind utility strings (`bg-surface-light`,
	 * `rounded-16`). Those utilities are not generated in this app — we mirror the
	 * design system's token VALUES rather than importing its stylesheet — so the
	 * same declarations are expressed below as scoped CSS over our named tokens,
	 * one-for-one with upstream. The `ogcr-` class prefix is only a namespace:
	 * Skeleton ships its own global `.card`, which this must not collide with.
	 *
	 * Two deliberate extensions to the upstream API, neither of which changes how
	 * a plain Card renders:
	 *   - `href` makes the title a link (upstream has no link variant). Only the
	 *     title is the link, not the whole card: text inside an anchor cannot be
	 *     selected by dragging, and the subtitle and body must stay selectable.
	 *   - `leading` is a snippet slot before the titles, for an icon.
	 */
	import type { Snippet } from 'svelte';

	type Padding = 'none' | 's' | 'm' | 'l';

	let {
		title,
		subtitle,
		floating = false,
		padding = 'm',
		href,
		headingLevel = 3,
		leading,
		trailing,
		children,
		class: className = '',
		...rest
	}: {
		title?: string;
		subtitle?: string;
		floating?: boolean;
		padding?: Padding;
		href?: string;
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		leading?: Snippet;
		trailing?: Snippet;
		children?: Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const hasHeader = $derived(Boolean(title || subtitle || leading || trailing));
</script>

{#snippet inner()}
	{#if hasHeader}
		<header class="ogcr-card__header">
			{#if leading}
				<div class="ogcr-card__leading">{@render leading()}</div>
			{/if}
			<div class="ogcr-card__titles">
				{#if title}
					<!-- svelte-ignore svelte_component_deprecated -->
					<svelte:element this={`h${headingLevel}`} class="ogcr-card__title"
						>{#if href}<a {href} class="ogcr-card__link">{title}</a>{:else}{title}{/if}</svelte:element
					>
				{/if}
				{#if subtitle}
					<p class="ogcr-card__subtitle">{subtitle}</p>
				{/if}
			</div>
			{#if trailing}
				<div class="ogcr-card__trailing">{@render trailing()}</div>
			{/if}
		</header>
	{/if}
	{#if children}
		<div class="ogcr-card__body">{@render children()}</div>
	{/if}
{/snippet}

<section
	class="ogcr-card ogcr-card--padding-{padding} {className}"
	class:ogcr-card--floating={floating}
	{...rest}
>
	{@render inner()}
</section>

<style>
	.ogcr-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		background: var(--surface-light);
		border: 1px solid var(--border-medium);
		border-radius: var(--radius-xl);
	}

	/* Upstream padding variants: none | s | m (default) | l -> 0 / 12 / 16 / 24 */
	.ogcr-card--padding-none {
		padding: var(--space-none);
	}
	.ogcr-card--padding-s {
		padding: var(--space-s);
	}
	.ogcr-card--padding-m {
		padding: var(--space-m);
	}
	.ogcr-card--padding-l {
		padding: var(--space-l);
	}

	.ogcr-card--floating {
		box-shadow: var(--elevation-l);
	}

	/* The title link reads as the title, underlining on hover like any link. */
	.ogcr-card__link {
		color: inherit;
		text-decoration: none;
	}
	.ogcr-card__link:hover {
		text-decoration: underline;
	}

	/* Two-stop focus ring, spec §8: an inner surface halo so the ring has
	   breathing room without outline-offset, then the solid interaction tone
	   at 4px, which clears the 3:1 minimum of WCAG SC 2.4.11. */
	.ogcr-card__link:focus-visible {
		outline: none;
		border-radius: var(--radius-s);
		box-shadow:
			0 0 0 2px var(--surface-light),
			0 0 0 4px var(--interaction-primary-default);
	}

	.ogcr-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-s);
	}

	.ogcr-card__leading {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--icon-primary);
	}

	.ogcr-card__titles {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		min-width: 0;
		/* The titles column takes the slack so a trailing slot stays right-aligned. */
		margin-right: auto;
	}

	.ogcr-card__title {
		margin: 0;
		font-family: var(--font-family-default);
		font-weight: 500;
		font-size: var(--font-size-m);
		line-height: 1.2;
		color: var(--text-primary);
	}

	.ogcr-card__subtitle {
		margin: 0;
		font-family: var(--font-family-default);
		font-weight: 400;
		font-size: var(--font-size-s);
		line-height: 1.4;
		color: var(--text-secondary);
	}

	.ogcr-card__trailing {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.ogcr-card__body {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
	}

	/* Dark mode is an app-side extension, not design system behaviour: the
	   design system ships no dark palette ("A dark palette is not implemented" —
	   spec §1), and its light tokens are fixed values, so a card styled purely
	   from them stays white on a dark page. These fall back to the Skeleton dark
	   surfaces the rest of the app already uses, so cards match their
	   surroundings. When upstream ships a dark palette, replace this block with
	   the `--ds-*` overrides rather than extending it. */
	:global([data-mode='dark']) .ogcr-card {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}

	:global([data-mode='dark']) .ogcr-card__title {
		color: var(--color-primary-200);
	}

	:global([data-mode='dark']) .ogcr-card__subtitle {
		color: var(--color-surface-400);
	}

	:global([data-mode='dark']) .ogcr-card__leading {
		color: var(--color-primary-200);
	}

	:global([data-mode='dark']) .ogcr-card__link:focus-visible {
		box-shadow:
			0 0 0 2px var(--color-surface-900),
			0 0 0 4px var(--interaction-primary-default);
	}
</style>
