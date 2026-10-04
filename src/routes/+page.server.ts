import type { PageServerLoad } from './$types';
import { API_MANAGER_URL, MCP_URL, getAppDirectory } from '$lib/obp/appDirectory';

/** The OBP tools linked below the fold, located through OBP's app directory. A tool
 *  OBP has no URL for is null, and its card is left out. */
export const load: PageServerLoad = async ({ fetch }) => {
	const directory = await getAppDirectory(fetch);
	return {
		apiManagerUrl: directory[API_MANAGER_URL] ?? null,
		mcpUrl: directory[MCP_URL] ?? null
	};
};
