import { ENTITY_SPACE_ID } from '$lib/constants/entities';
import {
	API_EXPLORER_URL,
	API_MANAGER_URL,
	MCP_URL,
	PORTAL_URL,
	PORTAL_AUTHENTICATION_PATH,
	getAppDirectory
} from '$lib/obp/appDirectory';

/** Where this deployment's OBP tools are. A tool OBP has no URL for is null, and its link is left out. */
export interface ToolLinks {
	apiExplorerUrl: string | null;
	apiManagerUrl: string | null;
	mcpUrl: string | null;
	portalUrl: string | null;
	authenticationUrl: string | null;
}

/** API Explorer opened on this deployment's dynamic endpoints, scoped to the bank
 *  that owns them (OBP_ENTITY_SPACE_ID). System level entities have no bank, so no bank_id. */
function apiExplorerLink(baseUrl: string, bankId: string | null): string {
	const url = new URL(baseUrl);
	url.searchParams.set('content', 'dynamic');
	if (bankId) url.searchParams.set('bank_id', bankId);
	return url.toString();
}

/** The OBP tools, located through OBP's app directory. Used by the home page and /evaluators. */
export async function getToolLinks(fetchFn: typeof fetch): Promise<ToolLinks> {
	const directory = await getAppDirectory(fetchFn);
	const portalUrl = directory[PORTAL_URL];
	const apiExplorerUrl = directory[API_EXPLORER_URL];
	return {
		apiExplorerUrl: apiExplorerUrl ? apiExplorerLink(apiExplorerUrl, ENTITY_SPACE_ID) : null,
		apiManagerUrl: directory[API_MANAGER_URL] ?? null,
		mcpUrl: directory[MCP_URL] ?? null,
		portalUrl: portalUrl ?? null,
		authenticationUrl: portalUrl
			? `${portalUrl.replace(/\/$/, '')}${PORTAL_AUTHENTICATION_PATH}`
			: null
	};
}
