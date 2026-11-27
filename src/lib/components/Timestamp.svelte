<script lang="ts">
	import { onMount } from 'svelte';
	import { formatUtc, formatLocal } from '$lib/utils/datetime';

	let { iso, class: klass = '' }: { iso: string | null | undefined; class?: string } = $props();

	// Server and client both render UTC first, which is deterministic, so
	// hydration matches. Once mounted the browser knows the reader's time zone,
	// so it can show something more useful.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	let display = $derived(mounted ? (formatLocal(iso) ?? formatUtc(iso)) : formatUtc(iso));
</script>

{#if display}
	<time datetime={iso} title={formatUtc(iso)} class={klass}>{display}</time>
{:else}
	<span class={klass}>—</span>
{/if}
