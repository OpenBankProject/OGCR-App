<script lang="ts">
	import type { PageData } from './$types';
	import FieldList, { type Field } from '$lib/components/FieldList.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import { registryActivityHref, registryOperatorHref } from '$lib/registry/activities';
	import { ShieldCheck } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activity = $derived(data.activity);

	// Only the certificate's own v1 fields, plus the activity it certifies. The
	// minimum-fields matrix defines no document or URL on certificate_of_compliance,
	// so there is deliberately no "download PDF" here — there is nothing to link to.
	const fields = $derived<Field[]>(
		activity
			? [
					{ label: 'Certificate ID', value: activity.certificate_of_compliance_id },
					{
						label: 'Certification status',
						value: activity.certification_status,
						pill: { tone: 'progress' }
					},
					{ label: 'Issue date', value: activity.certificate_issue_date },
					{ label: 'Expiry date', value: activity.certificate_expiry_date },
					{
						label: 'Activity',
						value: activity.name ?? activity.activity_id,
						href: activity.activity_id ? registryActivityHref(activity.activity_id) : undefined
					},
					{ label: 'Activity ID', value: activity.activity_id },
					{
						label: 'Operator',
						value: activity.operator_legal_name ?? activity.operator_id,
						href: activity.operator_id ? registryOperatorHref(activity.operator_id) : undefined
					}
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
		<FieldList {fields} />

		<p class="mt-8"><a href="/registry/activities" class="anchor">Back to activities</a></p>
	{/if}
</div>
