<script lang="ts">
	/**
	 * The Carbon Garden: registry activities on a map of Europe, storing carbon over time.
	 *
	 * The map is a <canvas> drawn by $lib/carbonGarden/engine (ported from the prototype
	 * in input_ideas/Carbon Garden.html). Everything around it (the heading, the figures,
	 * the panel, the tooltip and the transport bar) is built here from the design system.
	 * The map itself keeps the prototype's night-time palette, because the design system
	 * has no colours for an illustrated map; its key below uses the same colours.
	 */
	import { onMount } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Kpi from '$lib/components/Kpi.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import Button from '$lib/components/Button.svelte';
	import ToggleGroup from '$lib/components/ToggleGroup.svelte';
	import { registryActivityHref } from '$lib/registry/activities';
	import type { GardenData } from '$lib/carbonGarden/build';
	import {
		SPEEDS,
		createGarden,
		type GardenController,
		type GardenCountry,
		type GardenDetail,
		type GardenEvent,
		type GardenHover,
		type GardenStackItem,
		type GardenTick
	} from '$lib/carbonGarden/engine';
	import europe from '$lib/carbonGarden/europe.json';

	let {
		garden,
		warnings = [],
		publicView = false,
		fullHref = null
	}: {
		garden: GardenData;
		warnings?: string[];
		/** The public version: no plans and no parcel shapes, so no ghost phase and each activity on its own area. */
		publicView?: boolean;
		/** A link to the full version, for a logged in user looking at the public one. */
		fullHref?: string | null;
	} = $props();

	let mapCanvas: HTMLCanvasElement;
	let timelineCanvas: HTMLCanvasElement;
	let curveCanvas: HTMLCanvasElement | null = $state(null);
	let shapeCanvas: HTMLCanvasElement | null = $state(null);
	let stageWidth = $state(0);
	let stageHeight = $state(0);
	let panelWidth = $state(0);
	let sidePanel: HTMLElement | null = $state(null);

	let controller: GardenController | null = null;
	let tick: GardenTick | null = $state(null);
	let hover: { info: GardenHover; x: number; y: number } | null = $state(null);
	let stack: { items: GardenStackItem[]; x: number; y: number } | null = $state(null);
	let detail: GardenDetail | null = $state(null);
	let events: GardenEvent[] = $state([]);
	let panelOpen = $state(true);
	let showAvoided = $state(true);
	let speed = $state('3');

	const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
	const speedItems = SPEEDS.map((s, index) => ({ value: String(index), label: s.label }));
	const withFigures = $derived(garden.acts.filter((a) => !a.est).length);
	const left = $derived(garden.skipped.noArea + garden.skipped.noDates);

	onMount(() => {
		// On a phone the panel would cover the map: start with it closed.
		if (window.innerWidth <= 820) panelOpen = false;
		controller = createGarden({
			canvas: mapCanvas,
			timeline: timelineCanvas,
			data: garden,
			europe: europe as GardenCountry[],
			publicView,
			callbacks: {
				onTick(next) {
					tick = next;
					if (String(next.speedIndex) !== speed) speed = String(next.speedIndex);
				},
				onHover(info, x, y) {
					hover = info ? { info, x, y } : null;
				},
				onStack(items, x, y) {
					stack = items ? { items, x, y } : null;
				},
				onSelect(next) {
					detail = next;
					// The details open at the top of the panel: show them.
					if (next)
						requestAnimationFrame(() => sidePanel?.scrollTo({ top: 0, behavior: 'smooth' }));
				},
				onEvent(event) {
					events = [event, ...events].slice(0, 3);
					setTimeout(() => (events = events.filter((e) => e.id !== event.id)), 8000);
				}
			}
		});
		return () => controller?.destroy();
	});

	$effect(() => {
		controller?.setDetailCanvases(curveCanvas, shapeCanvas);
	});
	$effect(() => {
		// The panel covers the right of the map; the map centres on what is left.
		controller?.setPanelInset(panelOpen ? panelWidth + 24 : 0);
	});

	function choose(index: number | null, fly: boolean) {
		stack = null;
		controller?.select(index, fly);
	}
</script>

<div class="cg">
	<div class="cg-stage" bind:clientWidth={stageWidth} bind:clientHeight={stageHeight}>
		<canvas
			bind:this={mapCanvas}
			class="cg-map"
			aria-label="Map of Europe with registry activities storing carbon over time. Drag to pan, scroll to zoom, click an activity for its details."
		></canvas>

		<Card class="cg-hud" floating padding="s">
			<h1 class="text-h3 cg-title">Carbon Garden</h1>
			<p class="text-body-s cg-muted cg-wide-only">
				{garden.acts.length} registry {garden.acts.length === 1 ? 'activity' : 'activities'}, carbon
				removal modelled over time
			</p>
			<p class="cg-date" aria-live="off">{tick?.date ?? '—'}</p>
			<p class="text-body-s cg-muted cg-wide-only">
				{tick
					? `${tick.playing ? (tick.reverse ? 'Running backwards' : 'Running') : 'Paused'} · ${SPEEDS[tick.speedIndex].label}`
					: ''}
			</p>
			<details class="cg-key">
				<summary class="text-body-s">Key</summary>
				<ul class="text-body-s cg-muted">
					<li>
						<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"
							><rect width="28" height="14" rx="3" fill="#0a2833" /><circle
								cx="9"
								cy="7"
								r="4"
								fill="none"
								stroke="#8cc4e8"
								stroke-width="1.5"
							/></svg
						>Hollow orb: no valid certificate on this date
					</li>
					<li>
						<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"
							><rect width="28" height="14" rx="3" fill="#0a2833" /><circle
								cx="9"
								cy="7"
								r="4"
								fill="#a8f05f"
							/></svg
						>Solid orb: under a certified certificate
					</li>
					<li>
						<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"
							><rect width="28" height="14" rx="3" fill="#0a2833" /><circle
								cx="8"
								cy="8"
								r="4"
								fill="#9aa7ad"
								opacity=".8"
							/><circle cx="17" cy="5" r="2.8" fill="#9aa7ad" opacity=".5" /></svg
						>Grey puffs: emissions avoided
					</li>
					<li>
						<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"
							><rect width="28" height="14" rx="3" fill="#0a2833" /><path
								d="M4 11 L10 3 L22 4 L19 11Z"
								fill="#6b5a3e"
								stroke="#a8f05f"
								stroke-width="1.4"
							/></svg
						>Solid edge: a parcel verified
					</li>
					<li>
						<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"
							><rect width="28" height="14" rx="3" fill="#0a2833" /><path
								d="M4 11 L10 3 L22 4 L19 11Z"
								fill="#6b5a3e"
								stroke="#ffffff"
								stroke-opacity=".6"
								stroke-width="1.4"
								stroke-dasharray="1.5 3"
							/></svg
						>Dotted: no parcel verification yet
					</li>
					{#if !publicView}
						<li>
							<svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true"
								><rect width="28" height="14" rx="3" fill="#0a2833" /><path
									d="M4 11 L10 3 L22 4 L19 11Z"
									fill="#8cc4e8"
									fill-opacity=".25"
									stroke="#8cc4e8"
									stroke-width="1.4"
									stroke-dasharray="4 3"
								/></svg
							>Ghost: plan submitted, not started
						</li>
					{/if}
				</ul>
				{#if tick}
					<p class="text-body-s cg-muted cg-mono">{tick.orbValue}</p>
					<p class="text-body-s cg-muted cg-mono">{tick.scale}</p>
				{/if}
			</details>
		</Card>

		{#if panelOpen}
			<aside
				class="cg-side"
				bind:this={sidePanel}
				bind:clientWidth={panelWidth}
				aria-label="Carbon Garden figures"
			>
				{#if detail}
					<Card
						floating
						padding="s"
						title={detail.name}
						subtitle={detail.place}
						headingLevel={2}
						class="cg-detail"
					>
						{#snippet trailing()}
							<Button variant="text" size="s" onclick={() => choose(null, false)}>Close</Button>
						{/snippet}
						<div class="cg-pills">
							{#if detail.totalSource}
								<Pill tone="positive" dot>{detail.totalSource}</Pill>
							{:else}
								<Pill tone="warning" dot>No carbon figure yet: stores nothing here</Pill>
							{/if}
						</div>
						<div class="cg-charts">
							<canvas
								bind:this={curveCanvas}
								width="170"
								height="86"
								aria-label="Expected growth curve, with today marked"
							></canvas>
							<canvas
								bind:this={shapeCanvas}
								width="110"
								height="86"
								aria-label="Shape of the activity's land"
							></canvas>
						</div>
						<dl class="cg-facts text-body-s">
							<dt>Status now</dt>
							<dd>{tick?.selected?.state ?? '—'}</dd>
							{#each detail.rows as row (row.label)}
								<dt>{row.label}</dt>
								<dd>
									{row.value}
									{#if row.note}<span class="cg-note" class:cg-warn={row.warn}>{row.note}</span
										>{/if}
								</dd>
								{#if row.label === detail.totalSource}
									<dt>Stored so far</dt>
									<dd>{tick?.selected?.stored ?? '—'}</dd>
								{/if}
							{/each}
						</dl>
						{@const activityId = garden.acts[detail.index]?.id}
						{#if activityId}
							<Button variant="outlined" size="s" href={registryActivityHref(activityId)}>
								Open in the registry
							</Button>
						{/if}
					</Card>
				{/if}

				<Card floating padding="s" class="cg-figures">
					<Kpi
						label="Carbon removed so far, modelled"
						value={`${nf.format(tick?.removed ?? 0)} tCO₂e`}
						accentBar={false}
					/>
					<div class="cg-kpi-row">
						<Kpi label="Removing now" value={`${tick?.perDay ?? '0'} t/day`} accentBar={false} />
						<Kpi
							label="Emissions avoided"
							value={`${nf.format(tick?.avoided ?? 0)} t`}
							accentBar={false}
						/>
					</div>

					<h2 class="text-h4 cg-h2">By country</h2>
					<ul class="cg-countries text-body-s">
						{#each tick?.countries ?? [] as country (country.iso)}
							<li>
								<span>{country.name}</span>
								<span class="cg-bar" aria-hidden="true"
									><i style:width="{country.share * 100}%"></i></span
								>
								<span class="cg-mono">{nf.format(country.value)} t</span>
							</li>
						{/each}
					</ul>

					<h2 class="text-h4 cg-h2">Fastest right now</h2>
					{#if tick?.board.length}
						<ul class="cg-board">
							{#each tick.board as row (row.index)}
								<li>
									<button type="button" onclick={() => choose(row.index, true)}>
										<span class="cg-board__name text-body-s">{row.name}</span>
										<span class="cg-board__rate text-body-s cg-mono">{row.rate}</span>
										<span class="cg-board__meta">{row.meta}</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-body-s cg-muted">Nothing is running on this date.</p>
					{/if}

					<details class="cg-how text-body-s">
						<summary>How to read this</summary>
						{#if publicView}
							<p>
								Zoom in: Europe shows one marker per activity, grouped when they are close. Closer
								in, markers turn into the activity's area from the registry, flat and to scale.
								Closer still, trees, crops and animals appear inside it.
							</p>
							<p>
								An activity comes alive on its start date. Its total is the net benefit on its
								latest certificate of compliance or, failing that, the net benefit verified for its
								parcels or the carbon credits issued for it. The total is spread across its start
								and end dates with a growth curve chosen from its practices, so the timing is a
								picture, not a measurement. Orbs fall into the area, and what has been stored stays
								visible: darker soil, thicker trunks, a growing biochar pile.
							</p>
							<p>
								Where several activities overlap, a badge shows how many, and clicking it lets you
								choose. Cows are scenery only: livestock emissions are not counted here.
							</p>
							{#if fullHref}
								<p>
									<a href={fullHref} class="anchor">See the full version</a>, with parcels and
									plans.
								</p>
							{/if}
						{:else}
							<p>
								Zoom in: Europe shows one marker per activity, grouped when they are close. Closer
								in, markers turn into the activity's parcels from the registry, flat and to scale.
								Closer still, trees, crops and animals appear inside the parcels.
							</p>
							<p>
								An activity appears as a dashed ghost when its plan is submitted, and comes alive on
								its start date. Its total is its latest plan's expected total carbon removals or,
								failing that, the net benefit on its latest certificate of compliance, the net
								benefit verified for its parcels, or the carbon credits issued for it. The total is
								spread across its start and end dates with a growth curve chosen from its practices,
								so the timing is a picture, not a measurement. Orbs fall into the parcels, and what
								has been stored stays visible: darker soil, thicker trunks, a growing biochar pile.
							</p>
							<p>
								Where several activities share a parcel, a badge shows how many, and clicking it
								lets you choose. Cows are scenery only: livestock emissions are not counted here.
							</p>
						{/if}
						<p>
							{withFigures} of {garden.acts.length} activities have a carbon figure in the registry.
							{#if left}
								{left} more {left === 1 ? 'is' : 'are'} not shown:
								{garden.skipped.noArea ? `${garden.skipped.noArea} with no area` : ''}{garden
									.skipped.noArea && garden.skipped.noDates
									? ', '
									: ''}{garden.skipped.noDates
									? `${garden.skipped.noDates} with no start or end date`
									: ''}.
							{/if}
						</p>
						{#each warnings as warning (warning)}
							<p class="cg-warn">{warning}</p>
						{/each}
					</details>
				</Card>
			</aside>
		{/if}

		{#if events.length}
			<ol class="cg-ticker" aria-live="polite">
				{#each events as event (event.id)}
					<li class="text-body-s" data-kind={event.kind}>
						<span class="cg-mono cg-muted">{event.date}</span>
						{event.text}
					</li>
				{/each}
			</ol>
		{/if}

		{#if hover && !stack}
			<div
				class="cg-tip text-body-s"
				style:left="{Math.max(8, Math.min(stageWidth - 278, hover.x + 14))}px"
				style:top="{Math.max(8, Math.min(stageHeight - 110, hover.y + 14))}px"
			>
				{#if hover.info.kind === 'cluster'}
					<strong>{hover.info.count} activities</strong>
					<span
						>{hover.info.places.slice(0, 4).join(', ')}{hover.info.places.length > 4
							? ' …'
							: ''}</span
					>
					<span class="cg-muted">Click to zoom in</span>
				{:else if hover.info.kind === 'stack'}
					<strong>{hover.info.count} activities share this {publicView ? 'area' : 'parcel'}</strong>
					<span class="cg-muted">Click to choose one</span>
				{:else}
					<strong>{hover.info.name}</strong>
					<span>{hover.info.place}</span>
					<span>{hover.info.line}</span>
					<span class="cg-muted">{hover.info.certificate}</span>
				{/if}
			</div>
		{/if}

		{#if stack}
			<div
				class="cg-stack"
				role="menu"
				style:left="{Math.max(8, Math.min(stageWidth - 310, stack.x + 10))}px"
				style:top="{Math.max(8, Math.min(stageHeight - 320, stack.y + 10))}px"
			>
				<p class="text-body-s cg-muted">
					{stack.items.length} activities share this {publicView ? 'area' : 'parcel'}
				</p>
				{#each stack.items as item (item.index)}
					<button type="button" role="menuitem" onclick={() => choose(item.index, false)}>
						<span class="text-body-s">{item.name}</span>
						<span class="cg-board__meta">{item.meta}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="cg-transport">
		<canvas
			bind:this={timelineCanvas}
			class="cg-timeline"
			tabindex="0"
			role="slider"
			aria-label="Date. Click or drag to change it; arrow keys move a month."
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={tick?.progress ?? 0}
			aria-valuetext={tick?.date ?? ''}
		></canvas>
		<p class="cg-timeline-key text-body-s cg-muted">
			<span><i class="cg-swatch cg-swatch--curve"></i>Removal rate, all activities</span>
			{#if !publicView}<span><i class="cg-swatch cg-swatch--plan"></i>Plans submitted</span>{/if}
			<span><i class="cg-swatch cg-swatch--cert"></i>Certificates issued</span>
		</p>
		<div class="cg-controls">
			<Button size="s" onclick={() => controller?.togglePlay()}
				>{tick?.playing === false ? 'Play' : 'Pause'}</Button
			>
			<Button
				size="s"
				variant="outlined"
				aria-pressed={tick?.reverse ?? false}
				onclick={() => controller?.reverse()}>Reverse</Button
			>
			<div class="cg-speeds">
				<ToggleGroup
					items={speedItems}
					bind:value={speed}
					size="s"
					aria-label="Speed"
					onValueChange={(value) => controller?.setSpeed(Number(value))}
				/>
			</div>
			<Button size="s" variant="outlined" onclick={() => controller?.today()}>Today</Button>
			<span class="cg-spacer"></span>
			<label class="cg-check text-body-s">
				<input
					type="checkbox"
					bind:checked={showAvoided}
					onchange={() => controller?.setShowAvoided(showAvoided)}
				/>
				Avoided emissions
			</label>
			<Button size="s" variant="outlined" onclick={() => controller?.fit()}>Fit Europe</Button>
			<Button
				size="s"
				variant="outlined"
				aria-pressed={panelOpen}
				onclick={() => (panelOpen = !panelOpen)}>Panel</Button
			>
		</div>
	</div>
</div>

<style>
	.cg {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		height: 100%;
		min-height: 560px;
		background: var(--surface-page);
		/* colours for the timeline and the small charts, read by the engine */
		--cg-ink: var(--text-primary);
		--cg-muted: var(--text-secondary);
		--cg-curve: var(--brand-green-500);
		--cg-plan: var(--brand-blue-300);
		--cg-cert: var(--icon-warning);
		--cg-negative: var(--icon-negative);
		--cg-track: var(--surface-neutral);
	}
	.cg-stage {
		position: relative;
		overflow: hidden;
		/* the map's own night-time sea, behind the canvas while it starts */
		background: #082029;
	}
	.cg-map {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		cursor: grab;
	}
	.cg-map:global(.drag) {
		cursor: grabbing;
	}
	.cg-muted {
		color: var(--text-secondary);
	}
	.cg-mono {
		font-family: var(--font-family-mono);
		font-variant-numeric: tabular-nums;
	}
	.cg-warn {
		color: var(--text-warning);
	}

	:global(.cg-hud) {
		position: absolute;
		left: var(--space-m);
		top: var(--space-m);
		max-width: min(340px, calc(100% - 2 * var(--space-m)));
	}
	.cg-title {
		margin: 0;
	}
	.cg-date {
		margin-top: var(--space-xs);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-xl);
		color: var(--text-primary);
	}
	.cg-key {
		margin-top: var(--space-xs);
	}
	.cg-key summary {
		cursor: pointer;
		color: var(--text-primary);
	}
	.cg-key ul {
		list-style: none;
		padding: 0;
		margin: var(--space-xs) 0;
		display: grid;
		gap: var(--space-2xs);
	}
	.cg-key li {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}
	.cg-key svg {
		flex: none;
	}

	.cg-side {
		position: absolute;
		right: var(--space-m);
		top: var(--space-m);
		bottom: var(--space-m);
		width: 340px;
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		overflow-y: auto;
	}
	:global(.cg-figures) {
		display: flex;
		flex-direction: column;
	}
	.cg-kpi-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xs);
		margin-top: var(--space-xs);
	}
	.cg-h2 {
		margin: var(--space-m) 0 var(--space-xs);
	}
	.cg-countries {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: var(--space-2xs);
	}
	.cg-countries li {
		display: grid;
		grid-template-columns: 96px 1fr auto;
		gap: var(--space-xs);
		align-items: center;
	}
	.cg-countries li > span:first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cg-countries li > span:last-child {
		text-align: right;
		white-space: nowrap;
	}
	.cg-bar {
		height: 6px;
		background: var(--surface-neutral);
		border-radius: var(--radius-full);
		overflow: hidden;
	}
	.cg-bar i {
		display: block;
		height: 100%;
		background: var(--brand-green-500);
		border-radius: var(--radius-full);
	}
	.cg-board {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.cg-board button,
	.cg-stack button {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0 var(--space-xs);
		width: 100%;
		text-align: left;
		padding: var(--space-2xs) var(--space-xs);
		border-radius: var(--radius-m);
		color: var(--text-primary);
		cursor: pointer;
	}
	.cg-board button:hover,
	.cg-stack button:hover {
		background: var(--surface-neutral);
	}
	.cg-board button:focus-visible,
	.cg-stack button:focus-visible,
	.cg-timeline:focus-visible {
		outline: 2px solid var(--interaction-primary-focus);
		outline-offset: 2px;
	}
	.cg-board__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cg-board__rate {
		text-align: right;
		color: var(--text-positive);
	}
	.cg-board__meta {
		grid-column: 1 / 3;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}
	.cg-how {
		margin-top: var(--space-m);
		color: var(--text-secondary);
	}
	.cg-how summary {
		cursor: pointer;
		color: var(--text-primary);
	}
	.cg-how p {
		margin: var(--space-xs) 0;
	}

	.cg-pills {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2xs);
	}
	.cg-charts {
		display: flex;
		gap: var(--space-xs);
		margin: var(--space-xs) 0;
	}
	.cg-charts canvas {
		border-radius: var(--radius-m);
	}
	.cg-facts {
		display: grid;
		grid-template-columns: 42% 1fr;
		gap: var(--space-2xs) var(--space-xs);
		margin: 0 0 var(--space-s);
	}
	.cg-facts dt {
		color: var(--text-secondary);
	}
	.cg-facts dd {
		margin: 0;
		color: var(--text-primary);
	}
	.cg-note {
		display: block;
		color: var(--text-secondary);
	}

	.cg-ticker {
		position: absolute;
		left: var(--space-m);
		bottom: var(--space-m);
		max-width: min(360px, calc(100% - 400px));
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		pointer-events: none;
	}
	.cg-ticker li {
		background: var(--surface-light);
		color: var(--text-primary);
		border: 1px solid var(--border-light);
		border-left: 4px solid var(--text-secondary);
		border-radius: var(--radius-m);
		padding: var(--space-2xs) var(--space-xs);
		box-shadow: var(--elevation-l);
		animation: cg-in var(--motion-base, 0.3s) ease-out;
	}
	.cg-ticker li[data-kind='plan'] {
		border-left-color: var(--brand-blue-300);
	}
	.cg-ticker li[data-kind='start'] {
		border-left-color: var(--brand-green-500);
	}
	.cg-ticker li[data-kind='cert'],
	.cg-ticker li[data-kind='exp'] {
		border-left-color: var(--icon-warning);
	}
	@keyframes cg-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cg-ticker li {
			animation: none;
		}
	}

	.cg-tip,
	.cg-stack {
		position: absolute;
		z-index: 5;
		background: var(--surface-light);
		color: var(--text-primary);
		border: 1px solid var(--border-light);
		border-radius: var(--radius-m);
		box-shadow: var(--elevation-l);
		padding: var(--space-xs) var(--space-s);
	}
	.cg-tip {
		pointer-events: none;
		max-width: 270px;
		display: flex;
		flex-direction: column;
	}
	.cg-stack {
		max-width: 300px;
		max-height: 300px;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
	}

	.cg-transport {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-s) var(--space-m);
		background: var(--surface-light);
		border-top: 1px solid var(--border-light);
	}
	.cg-timeline {
		width: 100%;
		height: 50px;
		display: block;
		cursor: ew-resize;
		touch-action: none;
		border-radius: var(--radius-m);
	}
	.cg-timeline-key {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-m);
		margin: 0;
	}
	.cg-timeline-key span {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2xs);
	}
	.cg-swatch {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: var(--radius-xs);
	}
	.cg-swatch--plan {
		background: var(--brand-blue-300);
	}
	.cg-swatch--curve {
		background: var(--brand-green-500);
	}
	.cg-swatch--cert {
		background: var(--icon-warning);
	}
	.cg-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
	}
	.cg-spacer {
		flex: 1;
	}
	.cg-speeds {
		max-width: 100%;
		overflow-x: auto;
	}
	.cg-check {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--text-primary);
		cursor: pointer;
	}

	@media (max-width: 820px) {
		.cg-side {
			left: var(--space-s);
			right: var(--space-s);
			top: auto;
			bottom: var(--space-s);
			width: auto;
			height: 42%;
		}
		.cg-ticker,
		.cg-wide-only,
		.cg-key {
			display: none;
		}
		.cg-date {
			margin-top: 0;
			font-size: var(--font-size-l);
		}
		:global(.cg-hud) {
			max-width: calc(100% - 2 * var(--space-s));
		}
	}

	/* The design system has no dark palette: the Skeleton dark surfaces stand in. */
	:global([data-mode='dark']) .cg {
		background: var(--color-surface-950);
		--cg-ink: var(--color-surface-50);
		--cg-muted: var(--color-surface-400);
		--cg-track: var(--color-surface-800);
	}
	:global([data-mode='dark']) .cg-transport,
	:global([data-mode='dark']) .cg-tip,
	:global([data-mode='dark']) .cg-stack,
	:global([data-mode='dark']) .cg-ticker li {
		background: var(--color-surface-900);
		border-color: var(--color-surface-700);
		color: var(--color-surface-50);
	}
	:global([data-mode='dark']) .cg-muted,
	:global([data-mode='dark']) .cg-facts dt,
	:global([data-mode='dark']) .cg-note,
	:global([data-mode='dark']) .cg-board__meta,
	:global([data-mode='dark']) .cg-how {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .cg-date,
	:global([data-mode='dark']) .cg-facts dd,
	:global([data-mode='dark']) .cg-board button,
	:global([data-mode='dark']) .cg-stack button,
	:global([data-mode='dark']) .cg-check,
	:global([data-mode='dark']) .cg-key summary,
	:global([data-mode='dark']) .cg-how summary {
		color: var(--color-surface-50);
	}
	:global([data-mode='dark']) .cg-board button:hover,
	:global([data-mode='dark']) .cg-stack button:hover,
	:global([data-mode='dark']) .cg-bar {
		background: var(--color-surface-800);
	}
</style>
