<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import Pill, { type PillTone } from '$lib/components/Pill.svelte';
	import type { SetupState } from '$lib/server/setup';

	let { data }: { data: PageData } = $props();

	const report = $derived(data.report);

	// Each state has its own label, so the tone is never the only signal.
	const states: Record<SetupState, { label: string; tone: PillTone }> = {
		ok: { label: 'Set up', tone: 'positive' },
		missing: { label: 'Missing', tone: 'negative' },
		off: { label: 'Not used', tone: 'neutral' },
		unknown: { label: 'Unknown', tone: 'warning' }
	};
</script>

<svelte:head>
	<title>Setup - OGCR DCR</title>
</svelte:head>

<div class="mx-auto max-w-[1100px] px-6 py-8">
	<h1 class="text-h1 mb-2">Setup</h1>
	<p class="text-body ogcr-secondary mb-4">
		Whether each thing this app needs is in place. For whether the services are running now, see
		<a href="/status" class="anchor">System Status</a>.
	</p>

	<p class="text-body mb-8 flex flex-wrap gap-2" data-testid="setup-counts">
		<Pill tone="positive" dot>{report.counts.ok} set up</Pill>
		<Pill tone={report.counts.missing > 0 ? 'negative' : 'neutral'} dot
			>{report.counts.missing} missing</Pill
		>
		{#if report.counts.unknown > 0}
			<Pill tone="warning" dot>{report.counts.unknown} unknown</Pill>
		{/if}
		<Pill dot>{report.counts.off} not used</Pill>
	</p>

	{#each report.sections as section (section.title)}
		<Card title={section.title} subtitle={section.description} headingLevel={2} class="mb-6">
			<ul class="ogcr-setup-list">
				{#each section.items as item (item.name)}
					<li>
						<span class="ogcr-setup-state"
							><Pill tone={states[item.state].tone} dot>{states[item.state].label}</Pill></span
						>
						<span class="ogcr-setup-text">
							<code class="text-body-s">{item.name}</code>
							<span class="text-body-s ogcr-secondary">{item.detail}</span>
						</span>
					</li>
				{/each}
			</ul>
		</Card>
	{/each}
</div>

<style>
	.ogcr-secondary {
		color: var(--text-secondary);
	}
	.ogcr-setup-list li {
		display: flex;
		gap: var(--space-m);
		align-items: flex-start;
		padding: var(--space-xs) 0;
		border-bottom: 1px dashed var(--border-light);
	}
	.ogcr-setup-list li:last-child {
		border-bottom: none;
	}
	.ogcr-setup-state {
		flex: 0 0 7.5rem;
	}
	.ogcr-setup-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-secondary {
		color: var(--color-surface-400);
	}
</style>
