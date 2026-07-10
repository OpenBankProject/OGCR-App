<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { checkRoles, type PageRoleConfig, type UserEntitlement } from '$lib/utils/roleCheck';
	import MissingRoleAlert from './MissingRoleAlert.svelte';

	interface Props {
		pageRoles: PageRoleConfig | undefined;
		userEntitlements: UserEntitlement[];
		children?: Snippet;
	}

	let { pageRoles, userEntitlements, children }: Props = $props();

	let result = $derived(
		pageRoles
			? checkRoles(pageRoles.required, userEntitlements, pageRoles.requirementType ?? 'OR')
			: undefined
	);
</script>

{#if pageRoles && result && !result.hasAllRoles}
	<!-- Keyed on the route id so navigating to a different missing-role page
	     remounts MissingRoleAlert instead of reusing the previous page's
	     isExpanded/isSubmitting/submitSuccess state. -->
	{#key page.route.id}
		<div class="container mx-auto p-4">
			<MissingRoleAlert missing={result.missingRoles} />
		</div>
	{/key}
{:else if children}
	{@render children()}
{/if}
