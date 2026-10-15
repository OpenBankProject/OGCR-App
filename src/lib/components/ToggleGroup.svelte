<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface ToggleGroupItem {
		value: string;
		label: string;
		icon?: Component;
	}
</script>

<script lang="ts">
	/**
	 * OGCR Design System — ToggleGroup (spec §4.21), single-select segmented control.
	 *
	 * Ported from the shipped component; see ../../../design_system_integration.md
	 * for the porting conventions. Upstream wraps Base UI; this wraps bits-ui, which
	 * gives the same roving-focus keyboard model.
	 *
	 * API differences from upstream: single-select only, so `value` is a string rather
	 * than a string array (nothing needs `multiple` yet); and a press on the already
	 * selected segment keeps it selected, so the group always has a value.
	 */
	import { ToggleGroup } from 'bits-ui';

	let {
		items,
		value = $bindable(),
		onValueChange,
		size = 'm',
		'aria-label': ariaLabel,
		class: className = ''
	}: {
		items: ToggleGroupItem[];
		value: string;
		onValueChange?: (value: string) => void;
		size?: 's' | 'm';
		'aria-label'?: string;
		class?: string;
	} = $props();
</script>

<ToggleGroup.Root
	type="single"
	{value}
	onValueChange={(next) => {
		if (!next) return;
		value = next;
		onValueChange?.(next);
	}}
	aria-label={ariaLabel}
	class="ogcr-toggle-group {className}"
	data-size={size}
>
	{#each items as item (item.value)}
		<ToggleGroup.Item value={item.value} class="ogcr-toggle-group__item">
			{#if item.icon}
				<span class="ogcr-toggle-group__icon" aria-hidden="true"><item.icon /></span>
			{/if}
			{item.label}
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>

<style>
	:global(.ogcr-toggle-group) {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 2px;
		border-radius: var(--radius-l);
		background: var(--surface-neutral);
		border: 1px solid var(--border-light);
	}

	:global(.ogcr-toggle-group__item) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		flex-shrink: 0;
		height: 36px;
		min-width: 36px;
		padding: 0 var(--space-s);
		border: 0;
		border-radius: var(--radius-m);
		background: transparent;
		cursor: pointer;
		user-select: none;
		outline: none;
		font-family: var(--font-family-default);
		font-weight: 500;
		font-size: var(--font-size-s);
		line-height: 1;
		color: var(--text-secondary);
		transition:
			color var(--motion-fast),
			background-color var(--motion-fast),
			box-shadow var(--motion-fast);
	}
	:global(.ogcr-toggle-group[data-size='s'] .ogcr-toggle-group__item) {
		height: 28px;
		min-width: 28px;
		padding: 0 var(--space-xs);
	}
	:global(.ogcr-toggle-group__item:hover) {
		color: var(--text-primary);
	}
	:global(.ogcr-toggle-group__item[data-state='on']) {
		background: var(--surface-light);
		color: var(--text-primary);
		box-shadow: 0 1px 2px rgba(68, 51, 33, 0.12);
	}
	:global(.ogcr-toggle-group__item:focus-visible) {
		box-shadow:
			0 0 0 2px var(--surface-light),
			0 0 0 4px var(--interaction-primary-default);
	}

	.ogcr-toggle-group__icon {
		display: inline-flex;
		width: 20px;
		height: 20px;
	}
	.ogcr-toggle-group__icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.ogcr-toggle-group__item) {
			transition: none;
		}
	}

	:global([data-mode='dark'] .ogcr-toggle-group) {
		background: var(--color-surface-800);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark'] .ogcr-toggle-group__item) {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark'] .ogcr-toggle-group__item:hover),
	:global([data-mode='dark'] .ogcr-toggle-group__item[data-state='on']) {
		color: var(--color-surface-50);
	}
	:global([data-mode='dark'] .ogcr-toggle-group__item[data-state='on']) {
		background: var(--color-surface-900);
	}
</style>
