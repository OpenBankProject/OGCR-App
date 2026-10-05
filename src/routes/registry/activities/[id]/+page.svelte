<script lang="ts">
	/**
	 * Public activity detail page, laid out after the "Activity listing page" design
	 * (DO_NOT_COMMIT/Main.dc.html): a hero, then a main column (image, about, co-benefits,
	 * SDGs, location & timeline, media) beside a sidebar (carbon units, certification,
	 * operator). Field sourcing follows ogcr-activity-page-build-prompt.md; data comes from
	 * $lib/registry/activityDetail.
	 *
	 * Anything the registry does not return shows an em dash or an empty state, never a
	 * made-up value. Price and available units are the exception, labelled as test data:
	 * the schema has no source for them yet.
	 */
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import Pill from '$lib/components/Pill.svelte';
	import Button from '$lib/components/Button.svelte';
	import GeoJsonMap from '$lib/components/GeoJsonMap.svelte';
	import ObpErrorDisplay from '$lib/components/ObpErrorDisplay.svelte';
	import {
		registryActivityHref,
		registryCertificateHref,
		registryOperatorHref
	} from '$lib/registry/activities';
	import {
		MOCK_AVAILABLE_UNITS,
		countryLabel,
		humanise,
		mockPricePerUnit,
		parseCobenefits,
		verificationStatus,
		type ActivityDetail
	} from '$lib/registry/activityDetail';
	import { explorerLinks } from '$lib/chain/explorer';
	import {
		CircleCheck,
		Clock,
		CircleX,
		Leaf,
		Link2,
		ExternalLink,
		ShoppingCart,
		Box,
		ShieldCheck
	} from '@lucide/svelte';

	let { data }: { data: PageData } = $props();

	const activity = $derived(data.activity as ActivityDetail | null);
	const certificate = $derived(data.certificate);
	const explorer = $derived(explorerLinks(data.explorerBase));

	const status = $derived(verificationStatus(activity?.verifications));
	const statusLabel = $derived(
		status === 'verified'
			? 'Verified'
			: status === 'in_progress'
				? 'Verification in progress'
				: status === 'failed'
					? 'Verification failed'
					: 'Not yet verified'
	);
	const statusTone = $derived(
		status === 'verified'
			? 'positive'
			: status === 'failed'
				? 'negative'
				: status === 'in_progress'
					? 'progress'
					: 'neutral'
	);

	// "Sicily, Italy" from city + country; country alone when there is no city.
	const place = $derived(
		[activity?.city, activity?.country_name ?? activity?.country_id].filter(Boolean).join(', ') ||
			null
	);
	const cobenefits = $derived(parseCobenefits(activity?.cobenefits));
	const practices = $derived(data.practices.filter((p) => p.practice_name));
	const sdgs = $derived(data.sdgs.filter((s) => s.sustainable_development_goal_name));
	const media = $derived((activity?.media ?? []).filter((m) => m.title || m.link));
	const price = $derived(mockPricePerUnit(activity?.unit_types));

	// The scheme actually certified under, else the one the operator chose — labelled
	// differently so the page never implies a certification that has not happened.
	const scheme = $derived(
		certificate?.certification_scheme_name
			? {
					label: 'Certified under',
					name: certificate.certification_scheme_name,
					version: certificate.certification_scheme_version
				}
			: activity?.selected_certification_scheme_name
				? {
						label: 'Certification scheme selected',
						name: activity.selected_certification_scheme_name,
						version: activity.selected_certification_scheme_version
					}
				: null
	);

	const activityTxUrl = $derived(explorer.tx(activity?.tx_hash));

	// Images that fail to load are dropped, as if there were none: a broken image is
	// worse than no image. Svelte replays an error that fires before hydration.
	let failedImages = $state(new Set<string>());
	function imageFailed(src: string) {
		failedImages = new Set(failedImages).add(src);
	}
	function showImage(src: string | null | undefined): src is string {
		return isWebLink(src) && !failedImages.has(src);
	}
	const heroImage = $derived(showImage(activity?.hero_image) ? activity?.hero_image : null);

	const DASH = '—';

	/** '2027-01-01' -> '1 Jan 2027'. Dates are calendar days, so formatted in UTC. */
	function formatDate(value: string | null | undefined): string | null {
		if (!value) return null;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}

	function range(start: string | null | undefined, end: string | null | undefined): string {
		const from = formatDate(start);
		const to = formatDate(end);
		return from && to ? `${from} – ${to}` : (from ?? to ?? DASH);
	}

	function isWebLink(value: string | null | undefined): value is string {
		return !!value && /^https?:\/\//i.test(value);
	}
</script>

<svelte:head>
	<title>{activity?.name ?? 'Activity'} — OGCR Registry</title>
	{#if activity?.summary}
		<meta name="description" content={activity.summary} />
	{/if}
</svelte:head>

{#snippet statusPill()}
	<Pill tone={statusTone}>
		{#if status === 'verified'}
			<CircleCheck class="size-4" aria-hidden="true" />
		{:else if status === 'in_progress'}
			<Clock class="size-4" aria-hidden="true" />
		{:else if status === 'failed'}
			<CircleX class="size-4" aria-hidden="true" />
		{/if}
		{statusLabel}
	</Pill>
{/snippet}

{#snippet row(label: string, value: string | null | undefined, href?: string)}
	<div class="ogcr-row">
		<dt class="ogcr-row__label">{label}</dt>
		<dd class="ogcr-row__value">
			{#if href && value}
				<a {href} class="ogcr-link">{value}</a>
			{:else}
				{value || DASH}
			{/if}
		</dd>
	</div>
{/snippet}

<div class="ogcr-activity">
	{#if data.error}
		<ObpErrorDisplay error={data.error} title="The registry could not be loaded" />
	{:else if !activity}
		<h1 class="text-h1 ogcr-heading">Activity not found</h1>
		<p class="text-body ogcr-secondary">
			No activity found with ID <code>{data.activityId}</code>. It may have been withdrawn from the
			registry.
		</p>
		<p class="mt-6"><a href="/registry/activities" class="ogcr-link">Back to activities</a></p>
	{:else}
		<!-- Hero. Without a hero image the header sits on the page: no image is better
		     than a blank placeholder. -->
		<header class="ogcr-hero" class:ogcr-hero--image={!!heroImage}>
			{#if heroImage}
				<img src={heroImage} alt="" class="ogcr-hero__img" onerror={() => imageFailed(heroImage)} />
				<div class="ogcr-hero__shade" aria-hidden="true"></div>
			{/if}
			<div class="ogcr-hero__content">
				<div class="ogcr-pills">
					{#if place}<Pill>{place}</Pill>{/if}
					{#if activity.activity_type}<Pill>{humanise(activity.activity_type)}</Pill>{/if}
					{@render statusPill()}
				</div>
				<h1 class="text-h1 ogcr-hero__title">{activity.name ?? 'Activity'}</h1>
				<p class="text-body-s ogcr-hero__operator">
					Operator:
					{#if activity.operator_id}
						<a href={registryOperatorHref(activity.operator_id)} class="ogcr-link"
							>{activity.operator_legal_name ?? activity.operator_id}</a
						>
					{:else}
						{activity.operator_legal_name ?? DASH}
					{/if}
				</p>
			</div>
		</header>

		{#if data.partial}
			<p class="text-body-s ogcr-secondary ogcr-notice">
				Showing the registry summary only: the activity's full details could not be loaded.
			</p>
		{/if}

		<div class="ogcr-layout">
			<div class="ogcr-main">
				{#if showImage(activity.image)}
					<Card padding="s">
						<img
							src={activity.image}
							alt={activity.name ?? ''}
							class="ogcr-image"
							onerror={() => activity.image && imageFailed(activity.image)}
						/>
					</Card>
				{/if}

				<Card padding="l">
					{#if activity.summary}
						<p class="text-h4 ogcr-summary">{activity.summary}</p>
						<hr class="ogcr-divider" />
					{/if}
					<h2 class="text-h3 ogcr-heading">About this activity</h2>
					<p class="text-body ogcr-neutral">{activity.description ?? DASH}</p>
					{#if practices.length > 0}
						<ul class="ogcr-pills" aria-label="Practices and technologies">
							{#each practices as practice (practice.technologies_practices_processes_id)}
								<li><Pill>{practice.practice_name}</Pill></li>
							{/each}
						</ul>
					{/if}
					{#if isWebLink(activity.website)}
						<p class="text-body-s">
							<a href={activity.website} class="ogcr-link" target="_blank" rel="noopener"
								>{activity.website}<ExternalLink
									class="ml-1 inline size-3"
									aria-label="(opens in a new tab)"
								/></a
							>
						</p>
					{/if}
				</Card>

				<Card padding="l">
					<h2 class="text-h3 ogcr-heading">Co-benefits</h2>
					{#if cobenefits.length > 0}
						<ul class="ogcr-pills">
							{#each cobenefits as benefit (benefit)}
								<li>
									<Pill tone="positive"><Leaf class="size-4" aria-hidden="true" />{benefit}</Pill>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-body-s ogcr-secondary">{DASH}</p>
					{/if}
				</Card>

				<Card padding="l">
					<h2 class="text-h3 ogcr-heading">Sustainable Development Goals</h2>
					{#if sdgs.length > 0}
						<ul class="ogcr-pills">
							{#each sdgs as sdg (sdg.sustainable_development_goal_id)}
								<li>
									<Pill>
										{#if isWebLink(sdg.sustainable_development_goal_link)}
											<a
												href={sdg.sustainable_development_goal_link}
												class="ogcr-link"
												target="_blank"
												rel="noopener">{sdg.sustainable_development_goal_name}</a
											>
										{:else}
											{sdg.sustainable_development_goal_name}
										{/if}
									</Pill>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-body-s ogcr-secondary">{DASH}</p>
					{/if}
				</Card>

				<Card padding="l">
					<h2 class="text-h3 ogcr-heading">Location &amp; timeline</h2>
					<div class="ogcr-location">
						<div class="ogcr-map">
							{#if activity.multipolygon_coordinates}
								<GeoJsonMap geoJson={activity.multipolygon_coordinates} class="h-full w-full" />
							{:else}
								<span class="text-body-s ogcr-secondary"
									>{data.partial
										? 'Map not available'
										: 'No map: the activity has no boundary yet.'}</span
								>
							{/if}
						</div>
						<dl class="ogcr-rows">
							{@render row('City / region', place)}
							{@render row('Activity period', range(activity.start_date, activity.end_date))}
							{@render row(
								'Term commitment',
								activity.term_commitment != null
									? `${activity.term_commitment} ${activity.term_commitment === 1 ? 'year' : 'years'}`
									: null
							)}
							{@render row(
								'Monitoring period',
								range(activity.monitoring_period_start_date, activity.monitoring_period_end_date)
							)}
							{@render row('Methodology', activity.methodologies)}
						</dl>
					</div>
				</Card>

				<Card padding="l">
					<h2 class="text-h3 ogcr-heading">Media &amp; publications</h2>
					{#if media.length > 0}
						<ul class="ogcr-media">
							{#each media as item, i (item.activity_media_id ?? i)}
								<li class="ogcr-media__item">
									{#if showImage(item.image)}
										<img
											src={item.image}
											alt=""
											class="ogcr-media__thumb"
											onerror={() => item.image && imageFailed(item.image)}
										/>
									{:else}
										<Link2 class="ogcr-icon" aria-hidden="true" />
									{/if}
									<div class="ogcr-media__text">
										{#if isWebLink(item.link)}
											<a
												href={item.link}
												class="ogcr-link ogcr-media__title"
												target="_blank"
												rel="noopener"
												>{item.title ?? item.link}<ExternalLink
													class="ml-1 inline size-3"
													aria-label="(opens in a new tab)"
												/></a
											>
										{:else}
											<span class="ogcr-media__title">{item.title ?? item.link}</span>
										{/if}
										<span class="text-body-s ogcr-secondary">
											{[
												item.activity_media_type ? humanise(item.activity_media_type) : null,
												item.author,
												formatDate(item.published_date)
											]
												.filter(Boolean)
												.join(' · ')}
										</span>
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-body-s ogcr-secondary">No media or publications yet.</p>
					{/if}
				</Card>
			</div>

			<aside class="ogcr-side" aria-label="Units, certification and operator">
				<Card padding="l" floating>
					<span class="ogcr-label">Carbon unit type</span>
					{#if activity.unit_types}
						<Pill tone="positive" class="self-start">{activity.unit_types}</Pill>
					{:else}
						<span class="text-body-s ogcr-secondary">{DASH}</span>
					{/if}
					<hr class="ogcr-divider" />
					<dl class="ogcr-rows">
						<div class="ogcr-row">
							<dt class="ogcr-row__label">Price per unit</dt>
							<dd class="ogcr-row__value">
								{#if price !== null}
									<span class="text-h3">€{price.toFixed(2)}</span>
									<span class="text-body-s ogcr-secondary">/ tCO₂e</span>
								{:else}
									{DASH}
								{/if}
							</dd>
						</div>
						<div class="ogcr-row">
							<dt class="ogcr-row__label">Available units</dt>
							<dd class="ogcr-row__value">
								<span class="ogcr-dot" aria-hidden="true"></span>{MOCK_AVAILABLE_UNITS} tCO₂e in stock
							</dd>
						</div>
					</dl>
					<p class="text-body-s ogcr-secondary">
						Test data: price and availability are not live yet.
					</p>
					<!-- Stub: no marketplace order flow yet. -->
					<Button variant="filled" fullWidth disabled>
						{#snippet iconLeft()}<ShoppingCart />{/snippet}
						Buy carbon units
					</Button>
				</Card>

				<Card padding="l">
					<h2 class="text-h4 ogcr-heading">Certification</h2>
					<dl class="ogcr-rows">
						<div class="ogcr-row">
							<dt class="ogcr-row__label">Activity status</dt>
							<dd class="ogcr-row__value">{@render statusPill()}</dd>
						</div>
					</dl>
					<p class="text-body-s ogcr-secondary">
						Each unit represents one tonne of CO₂e removed, reduced, or stored, as certified under
						the CRCF Regulation by an accredited certification body.
					</p>
					<dl class="ogcr-rows">
						<div class="ogcr-row">
							<dt class="ogcr-row__label">{scheme?.label ?? 'Certification scheme'}</dt>
							<dd class="ogcr-row__value">
								{#if scheme}
									<span class="ogcr-scheme" aria-hidden="true"><ShieldCheck /></span>
									{scheme.name}{scheme.version ? ` v${scheme.version}` : ''}
								{:else}
									{DASH}
								{/if}
							</dd>
						</div>
						{@render row('Certification body', certificate?.certification_body_legal_name)}
						{@render row(
							'Issued · Expires',
							certificate
								? `${formatDate(certificate.issue_date) ?? DASH} · ${formatDate(certificate.expiry_date) ?? DASH}`
								: null
						)}
						{@render row(
							'Certificate',
							certificate?.certificate_of_compliance_id ? 'View certificate' : 'Not yet certified',
							certificate?.certificate_of_compliance_id
								? registryCertificateHref(certificate.certificate_of_compliance_id)
								: undefined
						)}
					</dl>

					<hr class="ogcr-divider" />
					<h3 class="ogcr-label">On-chain records</h3>
					<!-- Stub: certificate_of_compliance has no on-chain token field yet. -->
					<Button variant="outlined" fullWidth disabled>
						{#snippet iconLeft()}<Box />{/snippet}
						Certificate of Compliance — not on chain yet
					</Button>
					{#if activityTxUrl}
						<Button
							variant="outlined"
							fullWidth
							href={activityTxUrl}
							target="_blank"
							rel="noopener"
						>
							{#snippet iconLeft()}<Box />{/snippet}
							{#snippet iconRight()}<ExternalLink />{/snippet}
							Activity
						</Button>
					{:else}
						<Button variant="outlined" fullWidth disabled>
							{#snippet iconLeft()}<Box />{/snippet}
							Activity — {activity.minted_at ? 'minted, no explorer configured' : 'not minted yet'}
						</Button>
					{/if}
				</Card>

				<Card padding="l">
					<h2 class="text-h4 ogcr-heading">Operator</h2>
					<dl class="ogcr-rows">
						{@render row(
							'Legal name',
							activity.operator_legal_name ?? activity.operator_id,
							activity.operator_id ? registryOperatorHref(activity.operator_id) : undefined
						)}
						{@render row('Country', countryLabel(activity.operator_country_id))}
					</dl>
				</Card>
			</aside>
		</div>

		<p class="ogcr-footer-links text-body-s">
			<a href="{registryActivityHref(data.activityId)}/simple" class="ogcr-link">Simple view</a>
			<a href="/registry/activities" class="ogcr-link">Back to activities</a>
		</p>
	{/if}
</div>

<style>
	.ogcr-activity {
		max-width: 1240px;
		margin: 0 auto;
		padding: var(--space-l) var(--space-m) var(--space-3xl);
	}
	@media (min-width: 768px) {
		.ogcr-activity {
			padding-inline: var(--space-xl);
		}
	}

	.ogcr-heading {
		margin: 0;
		color: var(--text-primary);
	}
	.ogcr-secondary {
		margin: 0;
		color: var(--text-secondary);
	}
	.ogcr-neutral {
		margin: 0;
		color: var(--text-neutral);
		white-space: pre-line;
	}
	.ogcr-summary {
		margin: 0;
		font-weight: 400;
		color: var(--text-secondary);
	}
	.ogcr-label {
		margin: 0;
		font-family: var(--font-family-default);
		font-weight: 500;
		font-size: var(--font-size-xs);
		letter-spacing: 0.28px;
		color: var(--text-secondary);
	}
	.ogcr-link {
		color: inherit;
		font-weight: 500;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.ogcr-divider {
		margin: 0;
		border: 0;
		border-top: 1px solid var(--border-light);
	}
	.ogcr-footer-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-l);
		margin: var(--space-xl) 0 0;
		color: var(--text-primary);
	}
	.ogcr-notice {
		margin-top: var(--space-m);
	}

	/* ----- Hero ----- */
	.ogcr-hero {
		position: relative;
		display: flex;
		align-items: flex-end;
	}
	.ogcr-hero--image {
		min-height: 340px;
		border-radius: var(--radius-xl);
		overflow: hidden;
	}
	.ogcr-hero__img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	/* The text-primary navy, fading up, so white text reads over any photo. */
	.ogcr-hero__shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			0deg,
			color-mix(in srgb, var(--text-primary) 78%, transparent) 0%,
			color-mix(in srgb, var(--text-primary) 15%, transparent) 55%,
			transparent 100%
		);
	}
	.ogcr-hero__content {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}
	.ogcr-hero--image .ogcr-hero__content {
		padding: var(--space-l) var(--space-xl);
	}
	.ogcr-hero__title {
		margin: 0;
		color: var(--text-primary);
	}
	.ogcr-hero__operator {
		margin: 0;
		color: var(--text-secondary);
	}
	.ogcr-hero--image .ogcr-hero__title,
	.ogcr-hero--image .ogcr-hero__operator {
		color: var(--surface-light);
	}

	/* ----- Layout: main column and a 380px sidebar on wide screens ----- */
	.ogcr-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-xl);
		align-items: start;
		margin-top: var(--space-xl);
	}
	@media (min-width: 1024px) {
		.ogcr-layout {
			grid-template-columns: minmax(0, 1fr) 380px;
		}
	}
	.ogcr-main,
	.ogcr-side {
		display: flex;
		flex-direction: column;
		gap: var(--space-l);
		min-width: 0;
	}

	.ogcr-pills {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ogcr-image {
		display: block;
		width: 100%;
		height: 320px;
		object-fit: cover;
		border-radius: var(--radius-l);
	}

	/* ----- Label / value rows ----- */
	.ogcr-rows {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		margin: 0;
	}
	.ogcr-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-m);
	}
	.ogcr-row__label {
		font-size: var(--font-size-s);
		color: var(--text-secondary);
	}
	.ogcr-row__value {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin: 0;
		font-size: var(--font-size-s);
		font-weight: 500;
		color: var(--text-primary);
		text-align: right;
	}
	.ogcr-dot {
		width: 8px;
		height: 8px;
		flex-shrink: 0;
		border-radius: var(--radius-full);
		background: var(--icon-positive);
	}
	.ogcr-scheme {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		flex-shrink: 0;
		padding: 4px;
		border-radius: var(--radius-full);
		background: var(--surface-strong);
		color: var(--surface-light);
	}
	.ogcr-scheme :global(svg) {
		width: 100%;
		height: 100%;
	}

	/* ----- Location ----- */
	.ogcr-location {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-l);
		align-items: start;
	}
	@media (min-width: 640px) {
		.ogcr-location {
			grid-template-columns: 220px minmax(0, 1fr);
		}
	}
	.ogcr-map {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 180px;
		padding: 0;
		overflow: hidden;
		text-align: center;
		border: 1px solid var(--border-medium);
		border-radius: var(--radius-l);
		background: var(--surface-neutral);
	}

	/* ----- Media ----- */
	.ogcr-media {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.ogcr-media__item {
		display: flex;
		align-items: center;
		gap: var(--space-s);
		padding: var(--space-s) 0;
		border-bottom: 1px solid var(--border-light);
	}
	.ogcr-media__item:last-child {
		border-bottom: none;
	}
	.ogcr-media__thumb {
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		object-fit: cover;
		border-radius: var(--radius-m);
	}
	.ogcr-media__text {
		display: flex;
		flex-direction: column;
		gap: var(--space-2xs);
		min-width: 0;
	}
	.ogcr-media__title {
		font-size: var(--font-size-s);
		font-weight: 500;
		color: var(--text-primary);
		overflow-wrap: anywhere;
	}
	.ogcr-media :global(.ogcr-icon) {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		color: var(--icon-secondary);
	}

	/* See Card.svelte — the design system ships no dark palette. */
	:global([data-mode='dark']) .ogcr-heading,
	:global([data-mode='dark']) .ogcr-hero:not(.ogcr-hero--image) .ogcr-hero__title,
	:global([data-mode='dark']) .ogcr-row__value,
	:global([data-mode='dark']) .ogcr-media__title {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .ogcr-secondary,
	:global([data-mode='dark']) .ogcr-summary,
	:global([data-mode='dark']) .ogcr-label,
	:global([data-mode='dark']) .ogcr-row__label,
	:global([data-mode='dark']) .ogcr-hero:not(.ogcr-hero--image) .ogcr-hero__operator {
		color: var(--color-surface-400);
	}
	:global([data-mode='dark']) .ogcr-neutral {
		color: var(--color-surface-200);
	}
	:global([data-mode='dark']) .ogcr-divider,
	:global([data-mode='dark']) .ogcr-media__item {
		border-color: var(--color-surface-700);
	}
	:global([data-mode='dark']) .ogcr-map {
		background: var(--color-surface-800);
		border-color: var(--color-surface-700);
	}
</style>
