<script lang="ts" module>
	import type { PillTone } from './Pill.svelte';

	export interface Field {
		label: string;
		/** Already formatted for display; an empty value shows as an em dash. */
		value: string | null | undefined;
		/** Links the value to the page with more detail about it. */
		href?: string;
		/** Shows the value as a status pill instead of plain text. */
		pill?: { tone: PillTone; dot?: boolean };
	}
</script>

<script lang="ts">
	/**
	 * A label / value list for the registry's detail pages, with mono-caps labels and
	 * dashed row rules to match the Table. Values can link onward to their own detail.
	 */
	import Pill from './Pill.svelte';

	let { fields }: { fields: Field[] } = $props();

	/** An em dash reads as "no value" where an empty cell reads as a rendering bug. */
	const DASH = '—';
	function hasValue(value: string | null | undefined): value is string {
		return typeof value === 'string' && value.trim() !== '';
	}
</script>

<dl class="ogcr-fields">
	{#each fields as field (field.label)}
		<div class="ogcr-fields__row">
			<dt class="ogcr-fields__label">{field.label}</dt>
			<dd class="ogcr-fields__value">
				{#if !hasValue(field.value)}
					{DASH}
				{:else if field.pill && field.href}
					<a href={field.href}><Pill tone={field.pill.tone} dot={field.pill.dot}>{field.value}</Pill></a>
				{:else if field.pill}
					<Pill tone={field.pill.tone} dot={field.pill.dot}>{field.value}</Pill>
				{:else if field.href}
					<a href={field.href} class="anchor">{field.value}</a>
				{:else}
					{field.value}
				{/if}
			</dd>
		</div>
	{/each}
</dl>

<style>
	.ogcr-fields {
		margin: 0;
		background: var(--surface-light);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-l);
		overflow: hidden;
	}

	.ogcr-fields__row {
		display: grid;
		grid-template-columns: minmax(10rem, 14rem) 1fr;
		gap: var(--space-m);
		padding: var(--space-s) var(--space-m);
		border-bottom: 1px dashed var(--border-light);
	}
	.ogcr-fields__row:last-child {
		border-bottom: none;
	}

	.ogcr-fields__label {
		margin: 0;
		font-family: var(--font-family-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-secondary);
		align-self: center;
	}

	.ogcr-fields__value {
		margin: 0;
		font-size: var(--font-size-s);
		color: var(--text-primary);
		min-width: 0;
		overflow-wrap: anywhere;
		align-self: center;
	}

	@media (max-width: 640px) {
		.ogcr-fields__row {
			grid-template-columns: 1fr;
			gap: var(--space-2xs);
		}
	}

	/* See Card.svelte — no dark palette upstream. */
	:global([data-mode='dark']) .ogcr-fields {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-fields__row {
		border-bottom-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-fields__label {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-fields__value {
		color: var(--color-surface-100);
	}
</style>
