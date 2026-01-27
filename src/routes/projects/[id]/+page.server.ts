import type { PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_PROJECT,
	ENTITY_PARCEL,
	ENTITY_PREFIX,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION,
	ENTITY_PROJECT_VERIFICATION,
	ENTITY_PROJECT_MONITORING_PERIOD_VERIFICATION
} from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const projectId = params.id;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			project: null,
			parcels: null,
			error: null
		};
	}

	try {
		const parcelIdField = `${ENTITY_PREFIX}parcel_id`;
		const projectIdFilter = `${ENTITY_PREFIX}project_id=${projectId}`;

		// Fetch project, parcels, and all verifications in parallel
		const [
			projectResponse,
			parcelsResponse,
			parcelOwnerVerResponse,
			parcelMonitoringVerResponse,
			projectVerResponse,
			projectMonitoringVerResponse
		] = await Promise.all([
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PROJECT}/${projectId}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PARCEL}?${projectIdFilter}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PARCEL_OWNERSHIP_VERIFICATION}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION}?${projectIdFilter}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PROJECT_VERIFICATION}?${projectIdFilter}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_PROJECT_MONITORING_PERIOD_VERIFICATION}?${projectIdFilter}`,
				accessToken
			)
		]);

		// Unwrap project response
		const project = projectResponse[ENTITY_PROJECT] || projectResponse;

		// Project-level verifications
		const projectVerifications =
			projectVerResponse[`${ENTITY_PROJECT_VERIFICATION}_list`] || [];
		const projectMonitoringVerifications =
			projectMonitoringVerResponse[`${ENTITY_PROJECT_MONITORING_PERIOD_VERIFICATION}_list`] || [];

		// Build parcels with normalized IDs
		const rawParcels = parcelsResponse[`${ENTITY_PARCEL}_list`] || [];
		const parcelIds = new Set(rawParcels.map((p: Record<string, unknown>) => p[parcelIdField]));

		// Group parcel owner verifications by parcel ID (no project_id filter available, so filter by parcel IDs)
		const allOwnerVers =
			parcelOwnerVerResponse[`${ENTITY_PARCEL_OWNERSHIP_VERIFICATION}_list`] || [];
		const ownerVerByParcel = new Map<string, Record<string, unknown>[]>();
		for (const v of allOwnerVers) {
			const pid = v[parcelIdField] as string;
			if (parcelIds.has(pid)) {
				if (!ownerVerByParcel.has(pid)) ownerVerByParcel.set(pid, []);
				ownerVerByParcel.get(pid)!.push(v);
			}
		}

		// Group parcel monitoring period verifications by parcel ID
		const allMonitoringVers =
			parcelMonitoringVerResponse[`${ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION}_list`] || [];
		const monitoringVerByParcel = new Map<string, Record<string, unknown>[]>();
		for (const v of allMonitoringVers) {
			const pid = v[parcelIdField] as string;
			if (!monitoringVerByParcel.has(pid)) monitoringVerByParcel.set(pid, []);
			monitoringVerByParcel.get(pid)!.push(v);
		}

		// Assemble parcels with their verifications
		const parcels = rawParcels.map((p: Record<string, unknown>) => {
			const pid = p[parcelIdField] as string;
			return {
				...p,
				parcel_id: pid,
				owner_verifications: ownerVerByParcel.get(pid) || [],
				monitoring_verifications: monitoringVerByParcel.get(pid) || []
			};
		});

		return {
			isAuthenticated: true,
			project,
			projectVerifications,
			projectMonitoringVerifications,
			parcels,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				project: null,
				parcels: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			project: null,
			parcels: null,
			error: errorMessage
		};
	}
};
