<script lang="ts">
	import { ShieldCheck } from '@lucide/svelte';
	import type { RoleRequirement } from '$lib/utils/roleCheck';

	// Mirrors OBP-Frontend/apps/api-manager's MissingRoleAlert.svelte (same collapsible
	// alert, role list, scope badge, green request button, tip box) so the "request a
	// role" UX is consistent across OBP apps. Simplified: OGCR-App's SITE_MAP roles all
	// name the one bank the entities live in (OBP_ENTITY_SPACE_ID), so there's no
	// bank-scope picker.
	interface Props {
		missing: RoleRequirement[];
	}

	let { missing }: Props = $props();

	let isExpanded = $state(false);
	let isSubmitting = $state(false);
	let submitSuccess = $state(false);
	let submitError = $state<string | null>(null);

	let roleNames = $derived(missing.map((m) => m.role));
	// `SYS` is how OBP names the system space, so it is not a bank to show.
	let bankIds = $derived([...new Set(missing.map((m) => m.bankId).filter((b) => b && b !== 'SYS'))]);
	let anyBankScoped = $derived(bankIds.length > 0);

	// PageRoleCheck keeps this component mounted across navigations as long as the
	// surrounding page keeps failing its role check, so a stale success/error message
	// from a previous page's `missing` set must not leak into the next one.
	let missingKey = $derived(missing.map((m) => `${m.role}|${m.bankId ?? ''}`).join(','));
	$effect(() => {
		missingKey;
		isSubmitting = false;
		submitSuccess = false;
		submitError = null;
	});

	async function handleRequestClick() {
		if (isSubmitting) return;
		isSubmitting = true;
		submitError = null;

		try {
			for (const requirement of missing) {
				const response = await fetch('/api/entitlement-requests', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						role_name: requirement.role,
						bank_id: requirement.bankId ?? ''
					})
				});
				if (!response.ok) {
					const data = await response.json();
					throw new Error(data?.error ?? `Request failed (${response.status})`);
				}
			}
			submitSuccess = true;
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to submit request';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="alert alert-missing-role" class:expanded={isExpanded}>
	<button type="button" class="alert-header" onclick={() => (isExpanded = !isExpanded)}>
		<span class="alert-icon">🔒</span>
		<span class="alert-title">
			<strong>Missing Entitlement{missing.length > 1 ? 's' : ''}:</strong>
			<span class="role-preview">{roleNames.join(', ')}</span>
		</span>
		<span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
	</button>

	{#if isExpanded}
		<div class="alert-content">
			<div class="entitlement-list">
				{#each roleNames as roleName (roleName)}
					<div class="entitlement-name">{roleName}</div>
				{/each}
			</div>

			{#if anyBankScoped}
				<div class="scope-display scope-bank">
					<strong>Bank-level role</strong> at <code>{bankIds.join(', ')}</code>
				</div>
			{:else}
				<div class="scope-display scope-system">
					<strong>System-wide role</strong> — no bank required
				</div>
			{/if}

			{#if submitError}
				<div class="submit-error">{submitError}</div>
			{/if}

			{#if submitSuccess}
				<div class="submit-success">
					Thanks, an Entitlement Request has been generated. Please ask your administrator to
					accept it.
				</div>
			{:else}
				<div class="alert-actions">
					<button class="btn-request" onclick={handleRequestClick} disabled={isSubmitting}>
						{#if isSubmitting}
							<span class="spinner">⏳</span>
							Submitting...
						{:else}
							<ShieldCheck size={18} />
							Request Entitlement
						{/if}
					</button>
				</div>
			{/if}

			<div class="tip-box">
				<strong>💡 Tip:</strong> If you have recently been granted this entitlement, you should
				<strong>log out and log back in</strong> again.
			</div>
		</div>
	{/if}
</div>

<style>
	.alert {
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.alert-missing-role {
		background: #fef3c7;
		border: 2px solid #f59e0b;
		color: #92400e;
		padding: 0.75rem 1rem;
	}

	.alert-missing-role.expanded {
		padding: 1rem 1.25rem;
	}

	:global([data-mode='dark']) .alert-missing-role {
		background: rgb(var(--color-warning-900));
		border-color: rgb(var(--color-warning-600));
		color: rgb(var(--color-warning-200));
	}

	.alert-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		color: inherit;
	}

	.alert-header:hover {
		opacity: 0.9;
	}

	.expanded .alert-header {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}

	:global([data-mode='dark']) .expanded .alert-header {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.alert-title {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.role-preview {
		font-weight: normal;
		font-size: 0.8125rem;
		opacity: 0.9;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.expand-icon {
		font-size: 0.75rem;
		opacity: 0.7;
		margin-left: auto;
		flex-shrink: 0;
	}

	.alert-content {
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.alert-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.entitlement-list {
		margin: 1rem 0;
	}

	.entitlement-name {
		font-size: 1.25rem;
		font-weight: 600;
		color: #78350f;
		margin: 0.5rem 0;
	}

	:global([data-mode='dark']) .entitlement-name {
		color: rgb(var(--color-warning-100));
	}

	.alert-actions {
		margin-top: 1rem;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		padding-top: 1rem;
	}

	:global([data-mode='dark']) .alert-actions {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	.btn-request {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: #51b265;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.btn-request:hover {
		background: #3d9e52;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.btn-request:active {
		transform: translateY(0);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.btn-request:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.spinner {
		display: inline-block;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.submit-success {
		margin-top: 1rem;
		padding: 0.75rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		border-radius: 4px;
		color: #065f46;
		font-size: 0.875rem;
		font-weight: 600;
	}

	:global([data-mode='dark']) .submit-success {
		background: rgba(16, 185, 129, 0.2);
		border-color: rgba(16, 185, 129, 0.4);
		color: rgb(var(--color-success-200));
	}

	.submit-error {
		margin-top: 1rem;
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 4px;
		color: #991b1b;
		font-size: 0.875rem;
		font-weight: 600;
	}

	:global([data-mode='dark']) .submit-error {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.4);
		color: rgb(var(--color-error-200));
	}

	.tip-box {
		margin: 1rem 0 0;
		padding: 0.75rem;
		background: rgba(59, 130, 246, 0.1);
		border-left: 3px solid #3b82f6;
		border-radius: 4px;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	:global([data-mode='dark']) .tip-box {
		background: rgba(59, 130, 246, 0.15);
		border-left-color: rgb(var(--color-primary-500));
	}

	.scope-display {
		margin: 0.75rem 0;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.scope-display.scope-bank {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		color: #92400e;
	}

	.scope-display.scope-system {
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		color: #1e40af;
	}

	:global([data-mode='dark']) .scope-display.scope-bank {
		background: rgba(245, 158, 11, 0.15);
		border-color: rgba(245, 158, 11, 0.4);
		color: #fbbf24;
	}

	:global([data-mode='dark']) .scope-display.scope-system {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.4);
		color: rgb(var(--color-primary-300));
	}
</style>
