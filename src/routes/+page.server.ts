import type { PageServerLoad } from './$types';
import {
	API_EXPLORER_URL,
	API_MANAGER_URL,
	MCP_URL,
	PORTAL_URL,
	PORTAL_AUTHENTICATION_PATH,
	getAppDirectory
} from '$lib/obp/appDirectory';

/** The OBP tools linked below the fold, located through OBP's app directory. A tool
 *  OBP has no URL for is null, and its card is left out. */
export const load: PageServerLoad = async ({ fetch }) => {
	const directory = await getAppDirectory(fetch);
	const portalUrl = directory[PORTAL_URL];
	return {
		apiExplorerUrl: directory[API_EXPLORER_URL] ?? null,
		apiManagerUrl: directory[API_MANAGER_URL] ?? null,
		mcpUrl: directory[MCP_URL] ?? null,
		portalUrl: portalUrl ?? null,
		authenticationUrl: portalUrl
			? `${portalUrl.replace(/\/$/, '')}${PORTAL_AUTHENTICATION_PATH}`
			: null
	};
};
