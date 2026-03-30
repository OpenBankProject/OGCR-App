import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_ACTIVITY,
	ENTITY_PARCEL,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION,
	ENTITY_ACTIVITY_VERIFICATION,
	ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION,
	ENTITY_ACTIVITY_PARCEL_VERIFICATION
} from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const activityId = params.id;

	if (!accessToken) {
		return {
			isAuthenticated: false,
			activity: null,
			parcels: null,
			error: null
		};
	}

	try {
		const activityIdFilter = `activity_id=${activityId}`;

		// Fetch activity and activity-level verifications in parallel
		const [
			activityResponse,
			activityParcelVerResponse,
			activityVerResponse,
			activityMonitoringVerResponse
		] = await Promise.all([
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY}/${activityId}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY_PARCEL_VERIFICATION}?${activityIdFilter}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY_VERIFICATION}?${activityIdFilter}`,
				accessToken
			),
			obp_requests.get(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION}?${activityIdFilter}`,
				accessToken
			)
		]);

		// Unwrap activity response
		const activity = activityResponse[ENTITY_ACTIVITY] || activityResponse;

		// Activity-level verifications
		const activityVerifications =
			activityVerResponse[`${ENTITY_ACTIVITY_VERIFICATION}_list`] || [];
		const activityMonitoringVerifications =
			activityMonitoringVerResponse[`${ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION}_list`] || [];

		// Get parcel IDs from activity_parcel_verification records
		const activityParcelVers =
			activityParcelVerResponse[`${ENTITY_ACTIVITY_PARCEL_VERIFICATION}_list`] || [];
		const parcelIds = [...new Set(activityParcelVers.map((v: Record<string, unknown>) => v.parcel_id as string))];

		// Fetch each parcel and parcel-level verifications
		const parcelPromises = parcelIds.map(async (parcelId: string) => {
			const [parcelResponse, ownerVerResponse, monitoringVerResponse] = await Promise.all([
				obp_requests.get(
					`/obp/dynamic-entity/${ENTITY_PARCEL}/${parcelId}`,
					accessToken
				),
				obp_requests.get(
					`/obp/dynamic-entity/${ENTITY_PARCEL_OWNERSHIP_VERIFICATION}?parcel_id=${parcelId}`,
					accessToken
				),
				obp_requests.get(
					`/obp/dynamic-entity/${ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION}?parcel_id=${parcelId}`,
					accessToken
				)
			]);

			const parcel = parcelResponse[ENTITY_PARCEL] || parcelResponse;
			const ownerVerifications =
				ownerVerResponse[`${ENTITY_PARCEL_OWNERSHIP_VERIFICATION}_list`] || [];
			const monitoringVerifications =
				monitoringVerResponse[`${ENTITY_PARCEL_MONITORING_PERIOD_VERIFICATION}_list`] || [];

			// Find activity_parcel_verification records for this parcel
			const parcelActivityVers = activityParcelVers.filter(
				(v: Record<string, unknown>) => v.parcel_id === parcelId
			);

			return {
				...parcel,
				parcel_id: parcelId,
				owner_verifications: ownerVerifications,
				monitoring_verifications: monitoringVerifications,
				activity_parcel_verifications: parcelActivityVers
			};
		});

		const parcels = await Promise.all(parcelPromises);

		return {
			isAuthenticated: true,
			activity,
			activityVerifications,
			activityMonitoringVerifications,
			parcels,
			error: null
		};
	} catch (error) {
		if (error instanceof OBPRequestError) {
			return {
				isAuthenticated: true,
				activity: null,
				parcels: null,
				error: error.message,
				errorDetails: error.toJSON()
			};
		}
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			isAuthenticated: true,
			activity: null,
			parcels: null,
			error: errorMessage
		};
	}
};

export const actions: Actions = {
	addActivityVerification: async ({ request, locals, params }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;
		const activityId = params.id;

		if (!accessToken) {
			return { success: false, action: 'addActivityVerification', error: 'Not authenticated' };
		}

		const formData = await request.formData();
		const body = {
			activity_id: activityId,
			status_code: formData.get('status_code') as string,
			status_message: formData.get('status_message') as string
		};

		try {
			await obp_requests.post(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY_VERIFICATION}`,
				body,
				accessToken
			);
			return { success: true, action: 'addActivityVerification' };
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return { success: false, action: 'addActivityVerification', error: error.message, errorDetails: error.toJSON() };
			}
			return { success: false, action: 'addActivityVerification', error: error instanceof Error ? error.message : 'Unknown error' };
		}
	},

	addMonitoringVerification: async ({ request, locals, params }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;
		const activityId = params.id;

		if (!accessToken) {
			return { success: false, action: 'addMonitoringVerification', error: 'Not authenticated' };
		}

		const formData = await request.formData();
		const body = {
			activity_id: activityId,
			status_code: formData.get('status_code') as string,
			status_message: formData.get('status_message') as string
		};

		try {
			await obp_requests.post(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION}`,
				body,
				accessToken
			);
			return { success: true, action: 'addMonitoringVerification' };
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return { success: false, action: 'addMonitoringVerification', error: error.message, errorDetails: error.toJSON() };
			}
			return { success: false, action: 'addMonitoringVerification', error: error instanceof Error ? error.message : 'Unknown error' };
		}
	},

	update: async ({ request, locals, params }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;
		const activityId = params.id;

		if (!accessToken) {
			return {
				success: false,
				error: 'Not authenticated',
				values: {} as Record<string, string>
			};
		}

		const formData = await request.formData();

		const values: Record<string, string> = {
			name: formData.get('name') as string ?? '',
			summary: formData.get('summary') as string ?? '',
			description: formData.get('description') as string ?? '',
			website: formData.get('website') as string ?? '',
			image: formData.get('image') as string ?? '',
			media_links: formData.get('media_links') as string ?? '',
			technologies_practices_processes: formData.get('technologies_practices_processes') as string ?? '',
			type: formData.get('type') as string ?? '',
			city: formData.get('city') as string ?? '',
			country_code: formData.get('country_code') as string ?? '',
			activity_plan_id: formData.get('activity_plan_id') as string ?? '',
			start_date: formData.get('start_date') as string ?? '',
			end_date: formData.get('end_date') as string ?? '',
			cobenefits: formData.get('cobenefits') as string ?? '',
			methodologies: formData.get('methodologies') as string ?? '',
			monitoring_period_start_date: formData.get('monitoring_period_start_date') as string ?? '',
			monitoring_period_end_date: formData.get('monitoring_period_end_date') as string ?? '',
			term_commitment: formData.get('term_commitment') as string ?? '',
			monitoring_period_years: formData.get('monitoring_period_years') as string ?? '',
			multipolygon_coordinates: formData.get('multipolygon_coordinates') as string ?? ''
		};

		const body: Record<string, unknown> = {
			name: values.name,
			summary: values.summary,
			description: values.description,
			website: values.website,
			image: values.image,
			media_links: values.media_links,
			technologies_practices_processes: values.technologies_practices_processes,
			type: values.type,
			city: values.city,
			country_code: values.country_code,
			activity_plan_id: values.activity_plan_id,
			start_date: values.start_date,
			end_date: values.end_date,
			cobenefits: values.cobenefits,
			methodologies: values.methodologies,
			monitoring_period_start_date: values.monitoring_period_start_date,
			monitoring_period_end_date: values.monitoring_period_end_date
		};

		// Parse numeric fields
		if (values.term_commitment) body.term_commitment = Number(values.term_commitment);
		if (values.monitoring_period_years) body.monitoring_period_years = Number(values.monitoring_period_years);

		// Parse JSON fields
		if (values.multipolygon_coordinates) {
			try {
				body.multipolygon_coordinates = JSON.parse(values.multipolygon_coordinates);
			} catch {
				body.multipolygon_coordinates = values.multipolygon_coordinates;
			}
		}

		// Remove empty string values
		for (const key of Object.keys(body)) {
			if (body[key] === '' || body[key] === null) {
				delete body[key];
			}
		}

		try {
			const response = await obp_requests.put(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY}/${activityId}`,
				body,
				accessToken
			);

			return {
				success: true,
				response
			};
		} catch (error) {
			if (error instanceof OBPRequestError) {
				return {
					success: false,
					error: error.message,
					errorDetails: error.toJSON(),
					values
				};
			}
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return {
				success: false,
				error: errorMessage,
				values
			};
		}
	}
};
