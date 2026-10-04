import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';
import { summarizeResourceDocs, type DynamicSummary } from '$lib/obp/dynamicSummary';
import { API_MANAGER_URL, getAppDirectory } from '$lib/obp/appDirectory';

/**
 * Public, like the resource docs it reads. The bank-level resource docs list this
 * deployment's space only (SYS for system-level entities), so other spaces on the same
 * OBP are not counted.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const path = `/obp/v6.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/resource-docs/v6.0.0/obp?content=dynamic`;

	let summary: DynamicSummary | null = null;
	let error: string | null = null;
	// API Manager is where each entity's definition can be looked at in detail.
	const directory = getAppDirectory(fetch);
	try {
		const response = await fetch(`${base}${path}`);
		if (response.ok) {
			const body = (await response.json()) as { resource_docs?: [] };
			summary = summarizeResourceDocs(body.resource_docs ?? []);
		} else {
			error = `OBP returned HTTP ${response.status} for ${path}`;
		}
	} catch (e) {
		error = e instanceof Error ? e.message : 'Could not reach OBP';
	}

	return {
		space: ENTITY_ROLE_BANK_ID,
		summary,
		error,
		apiManagerUrl: (await directory)[API_MANAGER_URL] ?? null
	};
};
