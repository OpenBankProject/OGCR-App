<script lang="ts">
	import type { PageData } from './$types';
	import FieldList from '$lib/components/FieldList.svelte';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { certificationSchemeHref } from '$lib/registry/certificationLinks';
	import { Award } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
	const body = $derived(data.body);
	const name = $derived(str(body?.legal_name) ?? 'Certification body');
	const address = $derived(
		body
			? [body.address_line_1, body.address_line_2, body.address_postcode, body.address_city]
					.map(str)
					.filter(Boolean)
					.join(', ')
			: null
	);

	const certificateColumns: TableColumn[] = [
		{ key: 'certificate_of_compliance_id', header: 'Certificate', sortable: true },
		{ key: 'certification_scheme_id', header: 'Certification scheme', sortable: true },
		{ key: 'certification_status', header: 'Status', sortable: true },
		{ key: 'issue_date', header: 'Issued', sortable: true },
		{ key: 'expiry_date', header: 'Expires', sortable: true }
	];
</script>

<svelte:head>
	<title>{name} — OGCR Registry</title>
</svelte:head>

<div class="registry-page">
	<div class="registry-heading">
		<Award class="size-8" />
		<h1 class="text-h1">{name}</h1>
	</div>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The certification body could not be loaded" />
	{:else if !body}
		<p class="registry-note">No certification body found with ID <code>{data.bodyId}</code>.</p>
	{:else}
		<FieldList
			fields={[
				{ label: 'Body ID', value: data.bodyId },
				{ label: 'Legal name', value: str(body.legal_name) },
				{ label: 'Accreditation route', value: str(body.accreditation_route) },
				{ label: 'Status', value: str(body.status) },
				{ label: 'Address', value: address },
				{ label: 'Country', value: str(body.country_id) },
				{ label: 'Email', value: str(body.email) },
				{ label: 'Website', value: str(body.website) }
			]}
		/>

		<h2 class="text-h3">Certificates issued by this body</h2>
		<Table
			columns={certificateColumns}
			rows={data.certificates}
			regionLabel="Certificates issued by {name}"
			emptyMessage="No certificates"
		>
			{#snippet cell(row, column)}
				{@const value = row[column.key] as string | null | undefined}
				{#if column.key === 'certificate_of_compliance_id' && value}
					<a href="/registry/certificates/{encodeURIComponent(value)}" class="anchor">{value}</a>
				{:else if column.key === 'certification_scheme_id' && value}
					<a href={certificationSchemeHref(value)} class="anchor">{value}</a>
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
