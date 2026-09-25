<script lang="ts">
	/**
	 * OGCR Design System — Pill (spec §4.6).
	 *
	 * Ported from the shipped component; see ../../../design_system_integration.md
	 * for the porting conventions.
	 *
	 * Status pills carry their label as text, never colour alone — a tone is a
	 * second signal, not the only one.
	 */
	import type { Snippet } from 'svelte';

	export type PillTone = 'neutral' | 'positive' | 'warning' | 'negative' | 'progress';

	let {
		tone = 'neutral',
		dot = false,
		class: className = '',
		children
	}: {
		tone?: PillTone;
		/** Small round status dot before the label, tinted with the tone's own colour. */
		dot?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<span class="ogcr-pill {className}" data-tone={tone}>
	{#if dot}
		<span class="ogcr-pill__dot" aria-hidden="true"></span>
	{/if}
	{@render children()}
</span>

<style>
	.ogcr-pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-2xs) var(--space-xs);
		border-radius: var(--radius-m);
		font-family: var(--font-family-default);
		font-weight: 400;
		font-size: var(--font-size-s);
		line-height: 1.4;
		white-space: nowrap;
		/* neutral is the default tone */
		background: var(--surface-neutral);
		color: var(--text-primary);
	}

	.ogcr-pill[data-tone='positive'] {
		background: var(--surface-positive);
		color: var(--text-positive);
	}
	.ogcr-pill[data-tone='warning'] {
		background: var(--surface-warning);
		color: var(--text-warning);
	}
	.ogcr-pill[data-tone='negative'] {
		background: var(--surface-negative);
		color: var(--text-negative);
	}
	.ogcr-pill[data-tone='progress'] {
		background: var(--surface-progress);
		color: var(--text-progress);
	}

	.ogcr-pill__dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		flex-shrink: 0;
		border-radius: var(--radius-full);
		background: currentColor;
	}

	/* The tone surfaces are pale by design, so they stay legible on a dark page;
	   only the neutral tone needs remapping. See Card.svelte for why this exists. */
	:global([data-mode='dark']) .ogcr-pill[data-tone='neutral'] {
		background: var(--color-surface-800);
		color: var(--color-surface-100);
	}
</style>
