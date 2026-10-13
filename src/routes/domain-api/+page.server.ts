import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { ENTITY_ROLE_BANK_ID } from '$lib/constants/entities';
import { publicGets, type PublicGet } from '$lib/obp/domainApi';

/** A Domain API as OBP lists it publicly at GET /obp/v7.0.0/banks/BANK_ID/domain-apis. */
export type DomainApi = {
	base_path: string;
	version: string;
	title: string;
	description: string;
	/** Where it is published: OBP's host followed by the base path. */
	url: string;
};

/**
 * The Domain APIs of the space (OBP_ENTITY_SPACE_ID): its Dynamic Entities and Dynamic
 * Resource Docs published under a base path of their own, each with an OpenAPI document
 * carrying the Domain API's own title and description. Public: OBP lists the ones whose
 * owners made them publicly discoverable, without an access token.
 *
 * Each one comes with the GET endpoints its OpenAPI document says anyone may call, so the
 * page shows it working without logging in.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	const path = `/obp/v7.0.0/banks/${encodeURIComponent(ENTITY_ROLE_BANK_ID)}/domain-apis`;

	let domainApis: (DomainApi & { publicGets: PublicGet[]; publicGetsError: string | null })[] = [];
	let error: string | null = null;
	try {
		const response = await fetch(`${base}${path}`);
		if (response.ok) {
			const body = (await response.json()) as { domain_apis?: DomainApi[] };
			domainApis = await Promise.all((body.domain_apis ?? []).map(withPublicGets));
		} else {
			error = `OBP returned HTTP ${response.status} for ${path}`;
		}
	} catch (e) {
		error = e instanceof Error ? e.message : 'Could not reach OBP';
	}

	return { space: ENTITY_ROLE_BANK_ID, domainApis, error };

	/** The Domain API with its public GETs, or why they could not be read. */
	async function withPublicGets(api: DomainApi) {
		const url = `${api.url.replace(/\/$/, '')}/openapi.json`;
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`OBP returned HTTP ${response.status} for ${url}`);
			return { ...api, publicGets: publicGets(await response.json()), publicGetsError: null };
		} catch (e) {
			return {
				...api,
				publicGets: [],
				publicGetsError: e instanceof Error ? e.message : 'Could not reach OBP'
			};
		}
	}
};
