<script lang="ts">
	/**
	 * OGCR Design System — KPI (spec §4.11).
	 *
	 * Ported from the shipped component, following the conventions in
	 * ../../../design_system_integration.md: values taken from the source rather
	 * than the spec's stale copy-paste CSS, expressed as scoped CSS over our
	 * mirrored tokens, class names namespaced `ogcr-` so nothing Skeleton ships
	 * can land on them, and a dark-mode block because the design system has no
	 * dark palette.
	 *
	 * `tone` drives the 6px top accent bar, which the spec calls the primary
	 * status signal. `accentBar={false}` gives the quiet icon-led tile used in a
	 * dense row — which is what the registry summary uses, since a tone would
	 * imply a judgement we have no data to make.
	 */
	import type { Snippet } from 'svelte';

	type Tone = 'positive' | 'warning' | 'negative' | 'neutral' | 'progress';

	let {
		label,
		value,
		secondaryText,
		icon,
		tone = 'positive',
		accentBar = true,
		class: className = '',
		...rest
	}: {
		label: string;
		value: string | number;
		secondaryText?: string;
		icon?: Snippet;
		tone?: Tone;
		accentBar?: boolean;
		class?: string;
		[key: string]: unknown;
	} = $props();
</script>

<article class="ogcr-kpi {className}" data-tone={tone} {...rest}>
	{#if accentBar}
		<div class="ogcr-kpi__accent" aria-hidden="true"></div>
	{/if}
	<header class="ogcr-kpi__header" class:ogcr-kpi__header--offset={accentBar}>
		<span class="ogcr-kpi__labelwrap">
			{#if icon}
				<span class="ogcr-kpi__icon" aria-hidden="true">{@render icon()}</span>
			{/if}
			<span class="ogcr-kpi__label">{label}</span>
		</span>
	</header>
	<div class="ogcr-kpi__value">{value}</div>
	{#if secondaryText}
		<p class="ogcr-kpi__secondary">{secondaryText}</p>
	{/if}
</article>

<style>
	.ogcr-kpi {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		padding: var(--space-m) var(--space-l);
		background: var(--surface-light);
		border: 1px solid var(--border-medium);
		border-radius: var(--radius-l);
		overflow: hidden;
	}

	.ogcr-kpi__accent {
		position: absolute;
		inset: 0 0 auto 0;
		height: 6px;
		background: var(--icon-positive);
	}
	.ogcr-kpi[data-tone='warning'] .ogcr-kpi__accent {
		background: var(--icon-warning);
	}
	.ogcr-kpi[data-tone='negative'] .ogcr-kpi__accent {
		background: var(--icon-negative);
	}
	.ogcr-kpi[data-tone='neutral'] .ogcr-kpi__accent {
		background: var(--text-neutral);
	}
	.ogcr-kpi[data-tone='progress'] .ogcr-kpi__accent {
		background: var(--icon-progress);
	}

	.ogcr-kpi__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-s);
	}
	/* Clears the accent bar so the label does not sit against it. */
	.ogcr-kpi__header--offset {
		padding-top: var(--space-2xs);
	}

	.ogcr-kpi__labelwrap {
		display: inline-flex;
		min-width: 0;
		align-items: center;
		gap: var(--space-xs);
	}

	.ogcr-kpi__icon {
		display: inline-flex;
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		color: var(--icon-secondary);
	}

	.ogcr-kpi__label {
		font-family: var(--font-family-default);
		font-weight: 400;
		font-size: var(--font-size-s);
		line-height: 1.4;
		color: var(--text-secondary);
	}

	.ogcr-kpi__value {
		font-family: var(--font-family-default);
		font-weight: 500;
		font-size: var(--font-size-xl);
		line-height: 1.2;
		color: var(--text-primary);
		/* Figures line up column-to-column when several tiles sit in a row. */
		font-variant-numeric: tabular-nums;
	}

	.ogcr-kpi__secondary {
		margin: 0;
		font-family: var(--font-family-default);
		font-weight: 400;
		font-size: var(--font-size-s);
		line-height: 1.4;
		color: var(--text-secondary);
	}

	/* See Card.svelte — the design system ships no dark palette, so these fall
	   back to the Skeleton dark surfaces the rest of the app uses. */
	:global([data-mode='dark']) .ogcr-kpi {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-kpi__value {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .ogcr-kpi__label,
	:global([data-mode='dark']) .ogcr-kpi__secondary {
		color: var(--color-surface-400);
	}
</style>
