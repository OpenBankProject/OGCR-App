<script lang="ts">
	import type { PageData } from './$types';
	import FieldList, { type Field } from '$lib/components/FieldList.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import {
		registryCertificateHref,
		registryOperatorHref,
		type RegistryActivity
	} from '$lib/registry/activities';
	import { Sprout } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activity = $derived(data.activity as RegistryActivity | null);

	function range(start: string | null, end: string | null): string | null {
		return start && end ? `${start} – ${end}` : (start ?? end);
	}

	// The same columns as the registry list, each linked onward where there is
	// something more to see.
	const fields = $derived<Field[]>(
		activity
			? [
					{ label: 'Activity ID', value: activity.activity_id },
					{ label: 'Type', value: activity.activity_type, pill: { tone: 'neutral' } },
					{
						label: 'Activity status',
						value: activity.verification_status === 'verified' ? 'Verified' : 'Unverified',
						pill: { tone: activity.verification_status === 'verified' ? 'positive' : 'warning', dot: true }
					},
					{
						label: 'Certificate',
						value: activity.certificate_of_compliance_id
							? (activity.certification_status ?? activity.certificate_of_compliance_id)
							: 'Not yet certified',
						href: activity.certificate_of_compliance_id
							? registryCertificateHref(activity.certificate_of_compliance_id)
							: undefined
					},
					{
						label: 'Operator',
						value: activity.operator_legal_name ?? activity.operator_id,
						href: activity.operator_id ? registryOperatorHref(activity.operator_id) : undefined
					},
					{ label: 'City', value: activity.city },
					{ label: 'Country', value: activity.country_name ?? activity.country_id },
					{ label: 'Start', value: activity.start_date },
					{ label: 'End', value: activity.end_date },
					{
						label: 'Monitoring period',
						value: range(activity.monitoring_period_start_date, activity.monitoring_period_end_date)
					},
					{ label: 'Summary', value: activity.summary }
				]
			: []
	);
</script>

<svelte:head>
	<title>{activity?.name ?? 'Activity'} — OGCR Registry</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-6 py-8">
	<div class="mb-6 flex items-center gap-4">
		<Sprout class="size-8 text-primary-500" />
		<h1 class="text-h1">{activity?.name ?? 'Activity'}</h1>
	</div>

	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The registry could not be loaded" />
	{:else if !activity}
		<p class="text-body text-surface-600-400">
			No activity found with ID <code>{data.activityId}</code>. It may have been withdrawn from the
			registry.
		</p>
	{:else}
		<FieldList {fields} />
	{/if}

	<p class="mt-8"><a href="/registry/activities" class="anchor">Back to activities</a></p>
</div>
