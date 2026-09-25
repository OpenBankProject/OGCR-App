<script lang="ts">
	import type { PageData } from './$types';
	import Pill from '$lib/components/Pill.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { ShieldCheck } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activity = $derived(data.activity);

	const DASH = '—';
	function show(value: unknown): string {
		return typeof value === 'string' && value.trim() !== '' ? value : DASH;
	}

	// Only the certificate's own v1 fields, plus the activity it certifies. The
	// minimum-fields matrix defines no document or URL on certificate_of_compliance,
	// so there is deliberately no "download PDF" here — there is nothing to link to.
	const fields = $derived(
		activity
			? [
					{ label: 'Certificate ID', value: show(activity.certificate_of_compliance_id) },
					{ label: 'Certification status', value: show(activity.certification_status) },
					{ label: 'Issue date', value: show(activity.certificate_issue_date) },
					{ label: 'Expiry date', value: show(activity.certificate_expiry_date) },
					{ label: 'Activity', value: show(activity.name) },
					{ label: 'Activity ID', value: show(activity.activity_id) },
					{ label: 'Operator', value: show(activity.operator_legal_name) }
				]
			: []
	);
</script>

<svelte:head>
	<title>Certificate — OGCR Registry</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-8">
	<div class="mb-6 flex items-center gap-4">
		<ShieldCheck class="size-8 text-primary-500" />
		<h1 class="text-h1">Certificate of Compliance</h1>
	</div>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The registry could not be loaded" />
	{:else if !activity}
		<p class="text-body text-surface-600-400">
			No certificate found with ID <code>{data.certificateId}</code>. It may have been withdrawn, or
			the registry may not list the activity it belongs to.
		</p>
		<p class="mt-4"><a href="/registry/activities" class="anchor">Back to activities</a></p>
	{:else}
		<dl class="ogcr-fields">
			{#each fields as field (field.label)}
				<div class="ogcr-fields__row">
					<dt class="ogcr-fields__label">{field.label}</dt>
					<dd class="ogcr-fields__value">
						{#if field.label === 'Certification status' && field.value !== DASH}
							<Pill tone="progress">{field.value}</Pill>
						{:else}
							{field.value}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>

		<p class="mt-8"><a href="/registry/activities" class="anchor">Back to activities</a></p>
	{/if}
</div>

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
