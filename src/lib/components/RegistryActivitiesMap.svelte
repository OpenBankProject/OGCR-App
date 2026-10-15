<script lang="ts">
	/**
	 * Every registry activity's area on one map, for the Activities page's map view.
	 *
	 * Areas are outlined by verification status, the same split the list's status pill
	 * makes. Small parcels vanish at country zoom, so while zoomed out each area also
	 * gets a dot at its centre; the dots go once the outlines are big enough to click.
	 * Clicking either opens a popup that links to the activity.
	 */
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import { registryActivityHref, type RegistryActivity } from '$lib/registry/activities';

	let {
		activities,
		areas,
		class: className = ''
	}: {
		/** The activities to show — already filtered by the page. */
		activities: RegistryActivity[];
		areas: Record<string, GeoJSON.GeoJsonObject>;
		class?: string;
	} = $props();

	/** Zoom level at which outlines are large enough that the centre dots only clutter. */
	const DOTS_BELOW_ZOOM = 11;

	let container: HTMLDivElement;
	let leaflet = $state<typeof import('leaflet') | null>(null);
	let map = $state<import('leaflet').Map | null>(null);
	/** Each drawn outline by activity id, so the page can zoom to one. Not reactive. */
	const outlinesById = new Map<string, import('leaflet').GeoJSON>();

	/** Zooms to one activity's area and opens its popup. Returns false if it has none drawn. */
	export function focusActivity(activityId: string): boolean {
		const outline = outlinesById.get(activityId);
		const bounds = outline?.getBounds();
		if (!map || !outline || !bounds?.isValid()) return false;
		map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
		outline.openPopup(bounds.getCenter());
		return true;
	}

	onMount(() => {
		let destroyed = false;
		let created: import('leaflet').Map | undefined;

		(async () => {
			const L = await import('leaflet');
			if (destroyed) return;
			created = L.map(container, { worldCopyJump: true }).setView([50, 10], 4);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(created);
			// The container is often still settling its size at init.
			setTimeout(() => created?.invalidateSize(), 0);
			leaflet = L;
			map = created;
		})();

		return () => {
			destroyed = true;
			created?.remove();
		};
	});

	// Redraw whenever the filtered set changes, and frame what is left.
	$effect(() => {
		const L = leaflet;
		const m = map;
		if (!L || !m) return;

		const colours = statusColours();
		const outlines = L.featureGroup();
		const dots = L.layerGroup();

		for (const activity of activities) {
			const area = activity.activity_id ? areas[activity.activity_id] : undefined;
			if (!area) continue;
			const colour =
				activity.verification_status === 'verified' ? colours.verified : colours.unverified;
			const popup = popupHtml(activity);

			const outline = L.geoJSON(area, {
				style: { color: colour, weight: 2, fillColor: colour, fillOpacity: 0.25 }
			}).bindPopup(popup);
			outlines.addLayer(outline);
			outlinesById.set(activity.activity_id!, outline);

			const bounds = outline.getBounds();
			if (bounds.isValid()) {
				dots.addLayer(
					L.circleMarker(bounds.getCenter(), {
						radius: 7,
						color: colours.halo,
						weight: 2,
						fillColor: colour,
						fillOpacity: 1
					}).bindPopup(popup)
				);
			}
		}

		outlines.addTo(m);
		const syncDots = () => {
			if (m.getZoom() < DOTS_BELOW_ZOOM) dots.addTo(m);
			else dots.remove();
		};
		m.on('zoomend', syncDots);

		const bounds = outlines.getBounds();
		if (bounds.isValid()) m.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
		syncDots();

		return () => {
			m.off('zoomend', syncDots);
			outlines.remove();
			dots.remove();
			outlinesById.clear();
		};
	});

	/** Leaflet styles take colour strings, so read the design tokens off the document. */
	function statusColours() {
		const style = getComputedStyle(document.documentElement);
		const token = (name: string) => style.getPropertyValue(name).trim();
		return {
			verified: token('--border-positive-strong'),
			unverified: token('--border-warning-strong'),
			halo: token('--surface-light')
		};
	}

	function popupHtml(activity: RegistryActivity): string {
		const name = escapeHtml(activity.name?.trim() || 'Unnamed activity');
		const title = activity.activity_id
			? `<a href="${escapeHtml(registryActivityHref(activity.activity_id))}">${name}</a>`
			: name;
		const status = activity.verification_status === 'verified' ? 'Verified' : 'Unverified';
		const details = [
			activity.activity_type,
			[activity.city, activity.country_name].filter(Boolean).join(', '),
			status
		]
			.filter((part) => typeof part === 'string' && part.trim() !== '')
			.map((part) => escapeHtml(part as string))
			.join(' · ');
		return `<div class="ogcr-map-popup"><strong>${title}</strong><br />${details}</div>`;
	}

	function escapeHtml(value: string): string {
		return value.replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
		);
	}
</script>

<div bind:this={container} class="ogcr-registry-map {className}"></div>

<style>
	.ogcr-registry-map {
		width: 100%;
		border-radius: var(--radius-l);
		border: 1px solid var(--border-light);
		background: var(--surface-neutral);
		/* Keep Leaflet's panes under the site header and menus. */
		isolation: isolate;
		z-index: 0;
	}

	.ogcr-registry-map :global(.ogcr-map-popup) {
		font-family: var(--font-family-default);
		font-size: var(--font-size-s);
		line-height: 1.5;
		color: var(--text-secondary);
	}
	.ogcr-registry-map :global(.ogcr-map-popup strong) {
		font-weight: 500;
		color: var(--text-primary);
	}

	:global([data-mode='dark']) .ogcr-registry-map {
		border-color: var(--color-surface-700);
		background: var(--color-surface-800);
	}
</style>
