// Client-safe half of the reference lists: the record shapes and the mappers a
// form uses to render a picker. Deliberately imports nothing server-only — the
// fetchers next door reach $lib/constants/entities, which reads private env and
// so must never be pulled into a browser bundle.

/** One choice in a reference picker: the id that gets stored, and what a human reads. */
export interface ReferenceOption {
	id: string;
	label: string;
}

export interface CountryRecord {
	/** ISO code, e.g. "DE". This is what operator.country_id / activity.country_id hold. */
	country_id: string;
	country_name: string;
}

export interface PracticeRecord {
	/** What activity.technologies_practices_processes_id holds. */
	technologies_practices_processes_id: string;
	practice_name: string;
}

/** Countries as picker options: "Germany (DE)" → "DE". */
export function countryOptions(countries: CountryRecord[] | undefined): ReferenceOption[] {
	return (countries ?? []).map((country) => ({
		id: country.country_id,
		label: `${country.country_name} (${country.country_id})`
	}));
}

/** Practices as picker options: the practice name → its id. */
export function practiceOptions(practices: PracticeRecord[] | undefined): ReferenceOption[] {
	return (practices ?? []).map((practice) => ({
		id: practice.technologies_practices_processes_id,
		label: practice.practice_name
	}));
}
