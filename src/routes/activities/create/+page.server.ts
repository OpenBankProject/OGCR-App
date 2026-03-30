import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;

	if (!accessToken) {
		return {
			isAuthenticated: false
		};
	}

	return {
		isAuthenticated: true
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = locals.session;
		const accessToken = session.data.oauth?.access_token;

		if (!accessToken) {
			return {
				success: false,
				error: 'Not authenticated',
				values: {} as Record<string, string>
			};
		}

		const formData = await request.formData();

		// Capture all raw string values for re-populating the form on error
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
			const response = await obp_requests.post(
				`/obp/dynamic-entity/${ENTITY_ACTIVITY}`,
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
