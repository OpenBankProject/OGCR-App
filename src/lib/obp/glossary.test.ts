import { describe, expect, it } from 'vitest';
import { pickGlossaryItems } from './glossary';

const item = (title: string, html: string) => ({ title, description: { markdown: '', html } });

describe('pickGlossaryItems', () => {
	it('returns the asked-for items in the order asked for', () => {
		expect(
			pickGlossaryItems(
				{
					glossary_items: [
						item('OGCR Architecture', '<p>arch</p>'),
						item('Other', '<p>other</p>'),
						item('OGCR Smart Contracts', '<p>contracts</p>')
					]
				},
				['OGCR Smart Contracts', 'OGCR Architecture']
			)
		).toEqual([
			{ title: 'OGCR Smart Contracts', html: '<p>contracts</p>' },
			{ title: 'OGCR Architecture', html: '<p>arch</p>' }
		]);
	});

	it('leaves out titles OBP has no item or no HTML for', () => {
		expect(
			pickGlossaryItems(
				{ glossary_items: [{ title: 'No HTML', description: { markdown: 'x' } }] },
				['No HTML', 'Missing']
			)
		).toEqual([]);
	});

	it('is empty for a body without a glossary_items list', () => {
		expect(pickGlossaryItems({ code: 404 }, ['OGCR Smart Contracts'])).toEqual([]);
		expect(pickGlossaryItems(null, ['OGCR Smart Contracts'])).toEqual([]);
	});
});
