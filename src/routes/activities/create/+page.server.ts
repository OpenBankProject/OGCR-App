import type { Actions, PageServerLoad } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { ENTITY_ACTIVITY } from '$lib/constants/entities';
import { OBPRequestError } from '$lib/obp/errors';
import { getOperatorsForUser } from '$lib/marketplace/ownership';
import { getCountries, type CountryRecord } from '$lib/reference/countries';
import { getPractices, type PracticeRecord } from '$lib/reference/practices';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;
	const accessToken = session.data.oauth?.access_token;
	const userEmail = session.data.user?.email ?? null;

	if (!accessToken) {
		return {
			isAuthenticated: false
		};
	}

	// Offer the operators this user controls so a test activity can be linked to
	// one (the listing flow only surfaces activities whose operator_id is yours).
	// Tolerant: a fetch failure just means no suggestions, not a broken form.
	let myOperators: Array<{ operator_id?: string; legal_name?: string }> = [];
	try {
		myOperators = (await getOperatorsForUser(accessToken, userEmail)).map((op) => ({
			operator_id: op.operator_id,
			legal_name: op.legal_name
		}));
	} catch {
		// No suggestions available — the operator_id field still accepts free text.
	}

	// Reference lists for the country and practice pickers: both are stored on the
	// activity as ids. Tolerant: a fetch failure leaves the field as free text.
	let countries: CountryRecord[] = [];
	let practices: PracticeRecord[] = [];
	try {
		countries = await getCountries(accessToken);
	} catch {
		// No list available — the country field still accepts a typed ISO code.
	}
	try {
		practices = await getPractices(accessToken);
	} catch {
		// No list available — the practice field still accepts a typed id.
	}

	return {
		isAuthenticated: true,
		myOperators,
		countries,
		practices
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
			name: (formData.get('name') as string) ?? '',
			summary: (formData.get('summary') as string) ?? '',
			description: (formData.get('description') as string) ?? '',
			website: (formData.get('website') as string) ?? '',
			image: (formData.get('image') as string) ?? '',
			media_links: (formData.get('media_links') as string) ?? '',
			technologies_practices_processes_id:
				(formData.get('technologies_practices_processes_id') as string) ?? '',
			operator_id: (formData.get('operator_id') as string) ?? '',
			activity_type: (formData.get('activity_type') as string) ?? '',
			city: (formData.get('city') as string) ?? '',
			country_id: (formData.get('country_id') as string) ?? '',
			start_date: (formData.get('start_date') as string) ?? '',
			end_date: (formData.get('end_date') as string) ?? '',
			cobenefits: (formData.get('cobenefits') as string) ?? '',
			methodologies: (formData.get('methodologies') as string) ?? '',
			monitoring_period_start_date: (formData.get('monitoring_period_start_date') as string) ?? '',
			monitoring_period_end_date: (formData.get('monitoring_period_end_date') as string) ?? '',
			term_commitment: (formData.get('term_commitment') as string) ?? '',
			monitoring_period_years: (formData.get('monitoring_period_years') as string) ?? '',
			multipolygon_coordinates: (formData.get('multipolygon_coordinates') as string) ?? ''
		};

		const body: Record<string, unknown> = {
			name: values.name,
			summary: values.summary,
			description: values.description,
			website: values.website,
			image: values.image,
			media_links: values.media_links,
			technologies_practices_processes_id: values.technologies_practices_processes_id,
			operator_id: values.operator_id,
			activity_type: values.activity_type,
			city: values.city,
			country_id: values.country_id,
			start_date: values.start_date,
			end_date: values.end_date,
			cobenefits: values.cobenefits,
			methodologies: values.methodologies,
			monitoring_period_start_date: values.monitoring_period_start_date,
			monitoring_period_end_date: values.monitoring_period_end_date
		};

		// Parse numeric fields
		if (values.term_commitment) body.term_commitment = Number(values.term_commitment);
		if (values.monitoring_period_years)
			body.monitoring_period_years = Number(values.monitoring_period_years);

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
