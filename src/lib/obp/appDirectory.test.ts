import { describe, expect, it } from 'vitest';
import { parseAppDirectory } from './appDirectory';

describe('parseAppDirectory', () => {
	it('maps each name to its URL', () => {
		expect(
			parseAppDirectory({
				app_directory: [
					{ name: 'public_obp_api_manager_url', value: 'https://apimanager.example.org' },
					{ name: 'public_obp_mcp_url', value: 'http://localhost:9101' }
				]
			})
		).toEqual({
			public_obp_api_manager_url: 'https://apimanager.example.org',
			public_obp_mcp_url: 'http://localhost:9101'
		});
	});

	it('drops values that are not http(s) URLs, so every one can be a link', () => {
		expect(
			parseAppDirectory({
				app_directory: [
					{ name: 'a', value: 'javascript:alert(1)' },
					{ name: 'b', value: '' },
					{ name: 'c', value: 42 },
					{ value: 'https://no-name.example.org' }
				]
			})
		).toEqual({});
	});

	it('is empty for a body without an app_directory list', () => {
		expect(parseAppDirectory({ code: 404 })).toEqual({});
		expect(parseAppDirectory(null)).toEqual({});
	});
});
