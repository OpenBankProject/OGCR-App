<script lang="ts">
	import type { ReferenceOption } from '$lib/reference/options';

	/**
	 * A picker over a registry reference list (countries, practices, …): it shows
	 * the human label and submits the id the entity stores. If the list is empty
	 * or could not be fetched it degrades to a free-text input, so a missing
	 * reference entity never blocks the form.
	 */
	let {
		name,
		value = '',
		options = [],
		placeholder = '',
		emptyLabel = 'Select…',
		fallbackHint = 'The list could not be loaded — enter the value directly.'
	}: {
		name: string;
		value?: string;
		options?: ReferenceOption[];
		placeholder?: string;
		emptyLabel?: string;
		fallbackHint?: string;
	} = $props();
</script>

{#if options.length}
	<select {name} class="select">
		<option value="" selected={value === ''}>{emptyLabel}</option>
		{#each options as option (option.id)}
			<option value={option.id} selected={option.id === value}>{option.label}</option>
		{/each}
	</select>
{:else}
	<input type="text" {name} {value} {placeholder} class="input" />
	<span class="text-xs text-surface-500">{fallbackHint}</span>
{/if}
