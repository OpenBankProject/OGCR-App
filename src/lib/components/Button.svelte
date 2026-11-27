<script lang="ts">
	/**
	 * OGCR Design System — Button (spec §4.1).
	 *
	 * Ported from the shipped component (packages/design-system/src/components/Button),
	 * following the conventions in ../../../design_system_integration.md: its Tailwind
	 * utility strings expressed as scoped CSS over our named tokens, class names
	 * namespaced `ogcr-`, and a dark-mode block because the design system has no dark
	 * palette.
	 *
	 * Sizes: s 32px, m 40px, l 48px (the spec height of `filled` and `outlined`, and
	 * their default); `text` defaults to m.
	 *
	 * Two deliberate differences from upstream:
	 *   - `href` renders an anchor with the button's look, for navigation that should
	 *     read as a button (upstream is always a <button>).
	 *   - No `select-none`: the label stays selectable, like all text in this app.
	 * Icon-only buttons are not ported yet.
	 */
	import type { Snippet } from 'svelte';

	type Variant = 'filled' | 'outlined' | 'text';
	type Size = 's' | 'm' | 'l';

	let {
		variant = 'filled',
		size,
		fullWidth = false,
		href,
		type = 'button',
		iconLeft,
		iconRight,
		children,
		class: className = '',
		...rest
	}: {
		variant?: Variant;
		size?: Size;
		fullWidth?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		iconLeft?: Snippet;
		iconRight?: Snippet;
		children?: Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const resolvedSize = $derived(size ?? (variant === 'text' ? 'm' : 'l'));
	const classes = $derived(
		`ogcr-button ogcr-button--${variant} ogcr-button--${resolvedSize} ${fullWidth ? 'ogcr-button--full' : ''} ${className}`
	);
</script>

{#snippet inner()}
	{#if iconLeft}
		<span class="ogcr-button__icon" aria-hidden="true">{@render iconLeft()}</span>
	{/if}
	{#if children}
		<span class="ogcr-button__label">{@render children()}</span>
	{/if}
	{#if iconRight}
		<span class="ogcr-button__icon" aria-hidden="true">{@render iconRight()}</span>
	{/if}
{/snippet}

{#if href}
	<a {href} class={classes} {...rest}>{@render inner()}</a>
{:else}
	<button {type} class={classes} {...rest}>{@render inner()}</button>
{/if}

<style>
	.ogcr-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-family-default);
		font-weight: 500;
		font-size: var(--font-size-s);
		line-height: 1;
		letter-spacing: 0.28px;
		white-space: nowrap;
		text-decoration: none;
		cursor: pointer;
		border: 1px solid transparent;
		transition:
			background-color var(--motion-fast),
			border-color var(--motion-fast),
			box-shadow var(--motion-fast),
			transform var(--motion-fast);
	}
	.ogcr-button:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 2px var(--surface-light),
			0 0 0 4px var(--interaction-primary-default);
	}
	.ogcr-button:active {
		transform: translateY(1px);
	}
	.ogcr-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		transform: none;
	}

	.ogcr-button--filled {
		background: var(--interaction-primary-default);
		color: var(--surface-page);
	}
	.ogcr-button--filled:hover:not(:disabled) {
		background: var(--interaction-primary-hover);
	}
	.ogcr-button--filled:active:not(:disabled) {
		background: var(--interaction-primary-active);
	}

	.ogcr-button--outlined {
		background: var(--surface-light);
		border-color: var(--border-medium);
		color: var(--text-primary);
	}
	.ogcr-button--outlined:hover:not(:disabled) {
		background: var(--surface-neutral);
		border-color: var(--border-strong);
	}

	.ogcr-button--text {
		background: transparent;
		color: var(--text-primary);
	}
	.ogcr-button--text:hover:not(:disabled) {
		background: var(--surface-neutral);
	}

	.ogcr-button--s {
		height: 32px;
		gap: var(--space-xs);
		padding: 0 var(--space-xs);
		border-radius: var(--radius-m);
	}
	.ogcr-button--m {
		height: 40px;
		gap: var(--space-xs);
		padding: 0 var(--space-s);
		border-radius: var(--radius-m);
	}
	.ogcr-button--l {
		height: 48px;
		gap: var(--space-s);
		padding: 0 var(--space-m);
		border-radius: var(--radius-l);
	}
	.ogcr-button--full {
		width: 100%;
	}

	/* Icon box: 24px at l (spec §4.1), 20px below it (spec §5). */
	.ogcr-button__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 20px;
		height: 20px;
	}
	.ogcr-button--l .ogcr-button__icon {
		width: 24px;
		height: 24px;
	}
	.ogcr-button__icon :global(svg) {
		width: 100%;
		height: 100%;
	}
	.ogcr-button__label {
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-button--outlined {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .ogcr-button--outlined:hover:not(:disabled),
	:global([data-mode='dark']) .ogcr-button--text:hover:not(:disabled) {
		background: var(--color-surface-800);
	}
	:global([data-mode='dark']) .ogcr-button--text {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .ogcr-button:focus-visible {
		box-shadow:
			0 0 0 2px var(--color-surface-900),
			0 0 0 4px var(--interaction-primary-default);
	}
</style>
