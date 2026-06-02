<script lang="ts">
	import { enhance } from '$app/forms';
	import { Landmark, Check } from '@lucide/svelte';
	import type { BankOption } from '$lib/obp/currentBank';

	interface Props {
		banks: BankOption[];
		/** Currently selected bank id (defaults to the stored CURRENT_BANK_ID). */
		selectedBankId?: string;
		/** Form action that persists the selection (POSTs `bank_id`). */
		action?: string;
		/** Called with the new bank id whenever the selection changes. */
		onSelect?: (bankId: string) => void;
		/** Render inline with no help text, for placing in a header row. */
		compact?: boolean;
	}

	let {
		banks,
		selectedBankId = '',
		action = '?/setBank',
		onSelect,
		compact = false
	}: Props = $props();

	let saving = $state(false);
	let justSaved = $state(false);
	let savedTimer: ReturnType<typeof setTimeout> | null = null;

	function label(bank: BankOption): string {
		const parts = [bank.bank_id];
		if (bank.bank_code) parts.push(bank.bank_code);
		if (bank.full_name) parts.push(bank.full_name);
		return parts.join(' — ');
	}
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		saving = true;
		justSaved = false;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
			justSaved = true;
			if (savedTimer) clearTimeout(savedTimer);
			savedTimer = setTimeout(() => (justSaved = false), 2000);
		};
	}}
>
	<label class="label" class:flex={compact} class:items-center={compact} class:gap-2={compact}>
		<span class="label-text flex items-center gap-2 whitespace-nowrap">
			<Landmark class="size-4 text-primary-500" />
			Current Bank
		</span>
		<div class="flex items-center gap-3">
			<select
				name="bank_id"
				class="select max-w-md"
				value={selectedBankId}
				disabled={saving}
				onchange={(e) => {
					const value = e.currentTarget.value;
					onSelect?.(value);
					e.currentTarget.form?.requestSubmit();
				}}
			>
				{#if banks.length === 0}
					<option value="">No banks available</option>
				{:else}
					<option value="">-- Select a bank --</option>
					{#each banks as bank (bank.bank_id)}
						<option value={bank.bank_id}>{label(bank)}</option>
					{/each}
				{/if}
			</select>
			{#if saving}
				<span class="text-sm text-surface-600-400">Saving…</span>
			{:else if justSaved}
				<span class="text-sm text-success-600-400 flex items-center gap-1">
					<Check class="size-4" /> Saved
				</span>
			{/if}
		</div>
	</label>
	{#if !compact}
		<p class="text-xs text-surface-600-400 mt-1">
			Saved to your OBP profile (<span class="font-mono">CURRENT_BANK_ID</span>) and shared across
			OBP apps.
		</p>
	{/if}
</form>
