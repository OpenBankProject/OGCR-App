<script lang="ts">
	import { Activity, AlertTriangle, CircleOff, HelpCircle } from '@lucide/svelte';
	import { formatAge, HEARTBEAT_STATES, type Heartbeat, type HeartbeatState } from '$lib/chain/heartbeat';
	import Timestamp from '$lib/components/Timestamp.svelte';

	let {
		heartbeat,
		compact = false,
		href = '/chain'
	}: { heartbeat: Heartbeat; compact?: boolean; href?: string | null } = $props();

	// Colour carries the same meaning as the wording, never on its own: every
	// state also names itself in text, so this reads without relying on colour.
	const presentation: Record<HeartbeatState, { dot: string; text: string; icon: any }> = {
		live: { dot: 'bg-success-500', text: 'text-success-600-400', icon: Activity },
		degraded: { dot: 'bg-warning-500', text: 'text-warning-600-400', icon: AlertTriangle },
		stale: { dot: 'bg-error-500', text: 'text-error-600-400', icon: AlertTriangle },
		never: { dot: 'bg-surface-400', text: 'text-surface-600-400', icon: CircleOff },
		unknown: { dot: 'bg-surface-400', text: 'text-surface-600-400', icon: HelpCircle }
	};

	let p = $derived({ ...presentation[heartbeat.state], label: HEARTBEAT_STATES[heartbeat.state].label });
	let status = $derived(heartbeat.status);
</script>

{#snippet dot()}
	<span class="relative flex size-2.5 shrink-0">
		{#if heartbeat.state === 'live'}
			<!-- Only a genuinely live connection pulses; a stalled one must not
			     look busy, which would suggest activity that is not happening. -->
			<span class="absolute inline-flex size-full animate-ping rounded-full {p.dot} opacity-60"></span>
		{/if}
		<span class="relative inline-flex size-2.5 rounded-full {p.dot}"></span>
	</span>
{/snippet}

{#if compact}
	<svelte:element
		this={href ? 'a' : 'div'}
		{href}
		class="inline-flex items-center gap-2 text-sm {href ? 'hover:opacity-80' : ''}"
		title={heartbeat.message}
	>
		{@render dot()}
		<span class={p.text}>{p.label}</span>
		{#if heartbeat.ageSeconds !== null}
			<span class="text-surface-500">· {formatAge(heartbeat.ageSeconds)} ago</span>
		{/if}
	</svelte:element>
{:else}
	<div class="card p-6 preset-filled-surface-100-900">
		<div class="flex items-start gap-3">
			{@render dot()}
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<p.icon class="size-5 {p.text}" />
					<h2 class="h4 {p.text}">{p.label}</h2>
				</div>
				<p class="text-surface-600-400 mt-1">{heartbeat.message}</p>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
					<div>
						<div class="text-xs text-surface-500">Last sync</div>
						<div class="font-semibold">{formatAge(heartbeat.ageSeconds)}{heartbeat.ageSeconds !== null ? ' ago' : ''}</div>
					</div>
					<div>
						<div class="text-xs text-surface-500">Head block</div>
						<div class="font-semibold">{status?.head_block ?? '—'}</div>
					</div>
					<div>
						<div class="text-xs text-surface-500">Chain</div>
						<div class="font-semibold">{status?.chain_id ?? '—'}</div>
					</div>
					<div>
						<div class="text-xs text-surface-500">Errors last run</div>
						<div class="font-semibold">{status?.error_count ?? '—'}</div>
					</div>
				</div>

				{#if status?.synced_at}
					<p class="text-xs text-surface-500 mt-4">
						Considered stalled after {heartbeat.staleAfterSeconds}s without a sync.
						Last recorded at <Timestamp iso={status.synced_at} />.
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
