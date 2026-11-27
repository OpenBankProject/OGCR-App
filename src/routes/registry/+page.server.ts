import type { PageServerLoad } from './$types';
import { getRegistryActivities } from '$lib/registry/activities';
import { getCreditTotals } from '$lib/chain/onChain';

/**
 * The registry is a public surface, so this page takes no access token: the activity
 * count comes from the same public endpoint the activity list uses, and a signed-out
 * visitor sees the same figure a buyer would.
 *
 * Issued and Active units are read from the chain, through the public chain mirrors:
 * Issued is what the credit batches were minted with, Active what is still held on
 * chain. Retired units have no public source yet: the retirement entities are not
 * public and OGCR-chain-cache does not mirror retirements, so that tile says so rather
 * than showing a fabricated number.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const [{ count, error }, credits] = await Promise.all([
		getRegistryActivities(fetch),
		getCreditTotals()
	]);
	return { activityCount: error ? null : count, error, credits };
};
