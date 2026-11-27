import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { normalizeExplorerBase } from '$lib/chain/explorer';
import { getRegistryActivities } from '$lib/registry/activities';
import {
	getActivityDetail,
	type ActivityCertificate,
	type ActivityDetail
} from '$lib/registry/activityDetail';

/**
 * Public activity detail page. Reads the activity's registry Queries anonymously (see
 * $lib/registry/activityDetail), so a signed-out visitor sees what a buyer would.
 *
 * If the activity Query itself cannot be read (for example on an OBP it has not been
 * deployed to yet), the page falls back to the activity's row in the registry list, so
 * it still shows what the list knows rather than "not found"; the fields only the
 * detail Query returns are then empty.
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
	const detail = await getActivityDetail(fetch, params.id);
	let activity = detail.activity;
	let certificate = detail.certificate;
	let error = detail.activityError;

	if (!activity && detail.activityError) {
		const list = await getRegistryActivities(fetch);
		const row = list.activities.find((a) => a.activity_id === params.id);
		if (row) {
			activity = {
				...row,
				verifications: row.verification_status ? [{ status_code: row.verification_status }] : []
			} as unknown as ActivityDetail;
			if (!certificate && row.certificate_of_compliance_id) {
				certificate = {
					certificate_of_compliance_id: row.certificate_of_compliance_id,
					certification_status: row.certification_status,
					issue_date: row.certificate_issue_date,
					expiry_date: row.certificate_expiry_date,
					certification_scheme_id: null,
					certification_scheme_name: null,
					certification_scheme_version: null,
					certification_body_id: null,
					certification_body_legal_name: null
				} satisfies ActivityCertificate;
			}
		}
		error = row ? null : (list.error ?? detail.activityError);
	}

	return {
		activityId: params.id,
		activity,
		error,
		/** True when the page is showing the list row because the detail Query failed. */
		partial: !detail.activity && activity !== null,
		practices: detail.practices,
		sdgs: detail.sdgs,
		certificate,
		/** Block explorer for the activity's mint transaction, when one is configured. */
		explorerBase: normalizeExplorerBase(env.PUBLIC_CHAIN_EXPLORER_URL)
	};
};
