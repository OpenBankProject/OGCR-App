<script lang="ts">
	import type { PageData } from './$types';
	import FieldList from '$lib/components/FieldList.svelte';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { certificationBodyHref } from '$lib/registry/certificationLinks';
	import { ShieldCheck } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
	const scheme = $derived(data.scheme);
	const name = $derived(str(scheme?.name) ?? 'Certification scheme');

	const certificateColumns: TableColumn[] = [
		{ key: 'certificate_of_compliance_id', header: 'Certificate', sortable: true },
		{ key: 'certification_body_id', header: 'Certification body', sortable: true },
		{ key: 'certification_status', header: 'Status', sortable: true },
		{ key: 'issue_date', header: 'Issued', sortable: true },
		{ key: 'expiry_date', header: 'Expires', sortable: true }
	];
	const activityColumns: TableColumn[] = [
		{ key: 'name', header: 'Activity', sortable: true },
		{ key: 'activity_type', header: 'Type', sortable: true },
		{ key: 'country_id', header: 'Country', sortable: true }
	];
</script>

<svelte:head>
	<title>{name} — OGCR Registry</title>
</svelte:head>

<div class="registry-page">
	<div class="registry-heading">
		<ShieldCheck class="size-8" />
		<h1 class="text-h1">{name}</h1>
	</div>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The certification scheme could not be loaded" />
	{:else if !scheme}
		<p class="registry-note">No certification scheme found with ID <code>{data.schemeId}</code>.</p>
	{:else}
		<FieldList
			fields={[
				{ label: 'Scheme ID', value: data.schemeId },
				{ label: 'Name', value: str(scheme.name) },
				{ label: 'Version', value: str(scheme.scheme_version_number) },
				{ label: 'Commission decision', value: str(scheme.commission_decision_reference) },
				{ label: 'Certification methodology', value: str(scheme.certification_methodology) }
			]}
		/>

		<h2 class="text-h3">Certificates issued under this scheme</h2>
		<Table
			columns={certificateColumns}
			rows={data.certificates}
			regionLabel="Certificates issued under {name}"
			emptyMessage="No certificates"
		>
			{#snippet cell(row, column)}
				{@const value = row[column.key] as string | null | undefined}
				{#if column.key === 'certificate_of_compliance_id' && value}
					<a href="/registry/certificates/{encodeURIComponent(value)}" class="anchor">{value}</a>
				{:else if column.key === 'certification_body_id' && value}
					<a href={certificationBodyHref(value)} class="anchor">{value}</a>
				{:else}
					{value || '—'}
				{/if}
			{/snippet}
		</Table>

		<h2 class="text-h3">Activities that chose this scheme</h2>
		<Table
			columns={activityColumns}
			rows={data.activities}
			regionLabel="Activities that chose {name}"
			emptyMessage="No activities"
		>
			{#snippet cell(row, column)}
				{@const value = row[column.key] as string | null | undefined}
				{#if column.key === 'name' && row.activity_id}
					<a
						href="/registry/activities/{encodeURIComponent(String(row.activity_id))}"
						class="anchor"
					>
						{value || row.activity_id}
					</a>
				{:else}
					{value || '—'}
				{/if}
			{/snippet}
		</Table>
	{/if}
</div>

<style>
	.registry-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-m);
		max-width: 48rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-l);
	}
	.registry-heading {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		color: var(--icon-primary);
	}
	.registry-heading h1 {
		color: var(--text-primary);
	}
	.registry-note {
		color: var(--text-secondary);
	}

	/* Dark mode: the design system has no dark palette, so fall back to the Skeleton
	   dark surfaces, as Card does. */
	:global([data-mode='dark']) .registry-heading,
	:global([data-mode='dark']) .registry-heading h1 {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .registry-note {
		color: var(--color-surface-400);
	}
</style>
