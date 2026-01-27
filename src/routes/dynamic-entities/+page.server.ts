import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			dynamicEntities: null,
			error: null
		};
	}

	try {
		// Fetch dynamic endpoint resource docs to discover all dynamic entities
		const response = await obp_requests.get(
			'/obp/v6.0.0/resource-docs/v6.0.0/obp?content=dynamic',
			accessToken
		);

		// Extract unique entity names from the tags
		const entityNames = new Set<string>();
		for (const doc of response.resource_docs || []) {
			for (const tag of doc.tags || []) {
				if (tag.startsWith('_') && tag !== 'Dynamic-Entity' && tag !== 'Dynamic') {
					// Tags like "_Ogcr5_project" - strip leading underscore and lowercase
					entityNames.add(tag.slice(1).toLowerCase());
				}
			}
		}

		const dynamicEntities = [...entityNames].sort().map((name) => ({
			entity_name: name
		}));

		return {
			isAuthenticated: true,
			dynamicEntities,
			error: null
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			dynamicEntities: null,
			error: errorMessage
		};
	}
};
