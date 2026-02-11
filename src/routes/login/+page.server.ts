import type { PageServerLoad } from './$types';
import { oauth2ProviderManager } from '$lib/oauth/providerManager';

export const load: PageServerLoad = async ({ url }) => {
	const errorMessage = url.searchParams.get('error');
	const targetLocation = url.searchParams.get('target_location');

	return {
		availableProviders: oauth2ProviderManager.getAvailableProviders(),
		unavailableProviders: oauth2ProviderManager.getUnavailableProviders(),
		errorMessage,
		targetLocation
	};
};
