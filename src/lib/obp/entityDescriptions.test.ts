import { describe, expect, it } from 'vitest';
import { descriptionFromDoc, entityTag } from './entityDescriptions';

describe('entityTag', () => {
	it('capitalises the first letter and adds the bank id', () => {
		expect(entityTag('parcel_on_chain', 'ogcr')).toBe('_Parcel_on_chain(ogcr)');
	});
});

describe('descriptionFromDoc', () => {
	it('keeps only the definition description', () => {
		const doc = {
			description_markdown:
				"Create new parcel.\n\nParcel' means a geospatially defined unit of land. This Dynamic Entity is part of OGCR.\n\n\n**Property List:**\n\n* parcel_id: id\n\nMethodRouting settings example: ..."
		};
		expect(descriptionFromDoc(doc, 'parcel')).toBe(
			"Parcel' means a geospatially defined unit of land."
		);
	});

	it('is null when there is no description', () => {
		expect(
			descriptionFromDoc({ description_markdown: 'Create new x.\n\n**Property List:**' }, 'x')
		).toBeNull();
		expect(descriptionFromDoc({}, 'x')).toBeNull();
	});
});
