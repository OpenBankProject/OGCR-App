<script lang="ts">
	import { onMount } from 'svelte';
	import type L from 'leaflet';

	let { geoJson }: { geoJson: string | object } = $props();

	let mapContainer: HTMLDivElement;

	onMount(async () => {
		const leaflet = await import('leaflet');

		const map = leaflet.map(mapContainer);

		leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		const parsed = typeof geoJson === 'string' ? JSON.parse(geoJson) : geoJson;
		const geoJsonLayer = leaflet.geoJSON(parsed, {
			style: {
				color: '#3b82f6',
				weight: 2,
				fillOpacity: 0.2
			}
		}).addTo(map);

		map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });

		return () => {
			map.remove();
		};
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div bind:this={mapContainer} class="h-48 w-full rounded"></div>
