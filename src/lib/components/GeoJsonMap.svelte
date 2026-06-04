<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';

	let {
		geoJson,
		interactive = true,
		class: className = 'h-48 w-full rounded bg-surface-200-800'
	}: {
		geoJson: string | object | null | undefined;
		/** When false, the map is a static preview: no pan/zoom, and clicks pass through. */
		interactive?: boolean;
		class?: string;
	} = $props();

	let mapContainer: HTMLDivElement;

	onMount(() => {
		let map: import('leaflet').Map | undefined;
		let destroyed = false;

		(async () => {
			const parsed = parse(geoJson);
			if (!parsed || destroyed) return;

			const leaflet = await import('leaflet');
			if (destroyed) return;

			map = leaflet.map(mapContainer, {
				zoomControl: interactive,
				attributionControl: true,
				dragging: interactive,
				scrollWheelZoom: interactive,
				doubleClickZoom: interactive,
				boxZoom: interactive,
				keyboard: interactive,
				touchZoom: interactive
			});

			leaflet
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution:
						'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				})
				.addTo(map);

			const geoJsonLayer = leaflet
				.geoJSON(parsed as GeoJSON.GeoJsonObject, {
					style: { color: '#3b82f6', weight: 2, fillOpacity: 0.2 }
				})
				.addTo(map);

			const bounds = geoJsonLayer.getBounds();
			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [20, 20] });
			} else {
				map.setView([0, 0], 2);
			}

			// The container often isn't fully sized at init (CSS/layout still settling),
			// which leaves Leaflet rendering blank tiles until it recomputes its size.
			setTimeout(() => map?.invalidateSize(), 0);
		})();

		return () => {
			destroyed = true;
			map?.remove();
		};
	});

	function parse(value: string | object | null | undefined): object | null {
		if (!value) return null;
		try {
			return typeof value === 'string' ? JSON.parse(value) : value;
		} catch {
			return null;
		}
	}
</script>

<!-- pointer-events-none on a static map lets clicks reach a parent link -->
<div bind:this={mapContainer} class="{className} {interactive ? '' : 'pointer-events-none'}"></div>
