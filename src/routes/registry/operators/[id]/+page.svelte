<script lang="ts">
	import type { PageData } from './$types';
	import FieldList from '$lib/components/FieldList.svelte';
	import Table, { type TableColumn } from '$lib/components/Table.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { registryActivityHref, type RegistryActivity } from '$lib/registry/activities';
	import { Building2 } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activities = $derived(data.activities as RegistryActivity[]);

	const columns: TableColumn[] = [
		{ key: 'name', header: 'Activity name', sortable: true },
		{ key: 'activity_type', header: 'Type', sortable: true },
		{ key: 'location', header: 'Location', sortable: true },
		{ key: 'verification_status', header: 'Activity status', sortable: true }
	];

	const rows = $derived(
		activities.map((a) => ({
			...a,
			location: [a.city, a.country_name].filter(Boolean).join(', ')
		}))
	);

	const DASH = '—';
	function show(value: unknown): string {
		return typeof value === 'string' && value.trim() !== '' ? value : DASH;
	}
</script>

<svelte:head>
	<title>{data.legalName ?? 'Operator'} — OGCR Registry</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-8">
	<div class="mb-6 flex items-center gap-4">
		<Building2 class="size-8 text-primary-500" />
		<h1 class="text-h1">{data.legalName ?? 'Operator'}</h1>
	</div>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The registry could not be loaded" />
	{:else if activities.length === 0}
		<p class="text-body text-surface-600-400">
			No operator found with ID <code>{data.operatorId}</code>. The registry lists an operator only
			through the activities it operates, and none name this one.
		</p>
	{:else}
		<FieldList
			fields={[
				{ label: 'Operator ID', value: data.operatorId },
				{ label: 'Legal name', value: data.legalName },
				{ label: 'Activities', value: String(activities.length) }
			]}
		/>

		<h2 class="text-h3 mt-8 mb-4">Activities operated</h2>
		<Table {columns} {rows} regionLabel="Activities operated by {data.legalName ?? 'this operator'}">
			{#snippet cell(row, column)}
				{#if column.key === 'name' && typeof row.activity_id === 'string'}
					<a href={registryActivityHref(row.activity_id)} class="anchor">{show(row.name)}</a>
				{:else if column.key === 'verification_status'}
					{row.verification_status === 'verified' ? 'Verified' : 'Unverified'}
				{:else}
					{show(row[column.key])}
				{/if}
			{/snippet}
		</Table>
	{/if}

	<p class="mt-8"><a href="/registry/activities" class="anchor">Back to activities</a></p>
</div>
