<script lang="ts">
	// Token values below mirror ../../ogcr-design-system-reference.css, which
	// is pinned to @majistudio/ogcr-design-system 1.1.0 (upstream commit
	// e947133). Update both together — see ../../../design_system_integration.md.
	//
	// The "Integration status" and "Component port status" blocks below restate
	// that document's provenance table, drift log and port table. They are the
	// fifth thing to update when upstream moves; the document lists the other four.
	import Card from '$lib/components/Card.svelte';

	const skeletonScales = [
		{ name: 'primary', label: 'Primary (OGCR Blue)' },
		{ name: 'secondary', label: 'Secondary (OGCR Green)' },
		{ name: 'tertiary', label: 'Tertiary (Dark Teal)' },
		{ name: 'success', label: 'Success' },
		{ name: 'warning', label: 'Warning' },
		{ name: 'error', label: 'Error' },
		{ name: 'surface', label: 'Surface (warm grays)' }
	];
	const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

	const dsTextTokens = [
		{ name: '--text-primary', value: '#0f3655' },
		{ name: '--text-secondary', value: '#6a8196' },
		{ name: '--text-neutral', value: '#334155' },
		{ name: '--text-positive', value: '#4f8263' },
		{ name: '--text-negative', value: '#b91c1c' },
		{ name: '--text-warning', value: '#c2410c' },
		{ name: '--text-progress', value: '#265277' }
	];

	const dsSurfaceTokens = [
		{ name: '--surface-page', value: '#f8f3ef' },
		{ name: '--surface-light', value: '#ffffff' },
		{ name: '--surface-neutral', value: '#f5f5f4' },
		{ name: '--surface-strong', value: '#0f3655' },
		{ name: '--surface-inverted', value: '#443321' },
		{ name: '--surface-positive', value: '#e2efe6' },
		{ name: '--surface-warning', value: '#ffedd5' },
		{ name: '--surface-negative', value: '#fee2e2' },
		{ name: '--surface-progress', value: '#e2edf6' }
	];

	const dsBorderTokens = [
		{ name: '--border-light', value: '#e7e5e4' },
		{ name: '--border-medium', value: '#d6d3d1' },
		{ name: '--border-strong', value: '#a8a29e' },
		{ name: '--border-default', value: '#01012e14' },
		{ name: '--border-high-contrast', value: '#443321' },
		{ name: '--border-positive-light', value: '#c5dfce' },
		{ name: '--border-warning-light', value: '#fed7aa' },
		{ name: '--border-negative-light', value: '#fecaca' },
		{ name: '--border-negative-strong', value: '#dc2626' },
		{ name: '--border-neutral-strong', value: '#57534e' },
		{ name: '--border-positive-strong', value: '#5e9975' },
		{ name: '--border-warning-strong', value: '#ea580c' }
	];

	const dsInteractionTokens = [
		{ name: '--interaction-primary-default', value: '#4f8263' },
		{ name: '--interaction-primary-hover', value: '#335641' },
		{ name: '--interaction-primary-active', value: '#335641' },
		{ name: '--interaction-primary-focus', value: '#e2efe6' },
		{ name: '--interaction-secondary-default', value: '#ffffff' },
		{ name: '--interaction-secondary-hover', value: '#1c3d59' },
		{ name: '--interaction-secondary-active', value: '#1c3d59' },
		{ name: '--interaction-secondary-focus', value: '#c3daed' },
		{ name: '--interaction-tertiary-active', value: '#e2efe6' },
		{ name: '--focus-ring-error (deprecated)', value: '#fecaca' }
	];

	const spacing = [
		{ name: '--space-2xs', size: '4px' },
		{ name: '--space-xs', size: '8px' },
		{ name: '--space-s', size: '12px' },
		{ name: '--space-m', size: '16px' },
		{ name: '--space-l', size: '24px' },
		{ name: '--space-xl', size: '32px' },
		{ name: '--space-3xl', size: '64px' }
	];

	const radii = [
		{ name: '--radius-xs', size: '2px' },
		{ name: '--radius-s', size: '4px' },
		{ name: '--radius-m', size: '8px' },
		{ name: '--radius-l', size: '12px' },
		{ name: '--radius-xl', size: '16px' },
		{ name: '--radius-full', size: '9999px' }
	];

	const fontSizes = [
		{ name: '--font-size-xs', size: '10px' },
		{ name: '--font-size-s', size: '14px' },
		{ name: '--font-size-m', size: '18px' },
		{ name: '--font-size-l', size: '20px' },
		{ name: '--font-size-xl', size: '24px' },
		{ name: '--font-size-2xl', size: '32px' },
		{ name: '--font-size-3xl', size: '40px' },
		{ name: '--font-size-4xl', size: '48px' },
		{ name: '--font-size-5xl', size: '64px' }
	];

	// Full URLs rather than org/repo shorthand: this page is what someone reads when
	// they need to go and look at upstream, and a shorthand makes them guess the host.
	const OGCR_MONOREPO = 'https://github.com/Maji-Studio/ogcr';
	// The live build of the design system, deployed from the monorepo
	// (packages/design-system/vercel.json), so it tracks the current release rather
	// than the archived 1.0.0 repo that previously owned this URL.
	const OGCR_LIVE = 'https://ogcr-design-system.vercel.app';

	// `value` is the thing you click — a URL or an identifier, nothing more. Anything
	// explanatory goes in `note`, rendered as plain text beside it: prose inside an
	// anchor reads as though the sentence itself is a destination.
	const provenance: { label: string; value: string; href?: string; note?: string }[] = [
		{
			label: 'Package',
			value: '@majistudio/ogcr-design-system',
			href: 'https://www.npmjs.com/package/@majistudio/ogcr-design-system',
			note: '1.1.0'
		},
		{
			label: 'Live implementation',
			value: OGCR_LIVE,
			href: OGCR_LIVE,
			note: 'the official build, and what this page is trying to match'
		},
		{
			label: 'Storybook',
			value: `${OGCR_LIVE}/storybook/`,
			href: `${OGCR_LIVE}/storybook/`,
			note: 'every component, with live controls'
		},
		{ label: 'Repo', value: OGCR_MONOREPO, href: OGCR_MONOREPO, note: 'monorepo, branch main' },
		{
			label: 'Design system path',
			value: `${OGCR_MONOREPO}/tree/main/packages/design-system`,
			href: `${OGCR_MONOREPO}/tree/main/packages/design-system`
		},
		{
			label: 'Token pin',
			value: 'e947133',
			href: `${OGCR_MONOREPO}/commit/e9471331f60bec1d76c91198771be4f392602cb7`,
			note: '2026-08-13'
		},
		{
			label: 'Repo HEAD read at',
			value: '182d425',
			href: `${OGCR_MONOREPO}/commit/182d425e76ce204826c9b2440930b5a8f7d02094`,
			note: '2026-09-07'
		},
		{ label: 'Last reconciled here', value: '2026-09-22' },
		{
			label: 'Predecessor (archived)',
			value: 'https://github.com/Maji-Studio/ogcr-design-system',
			href: 'https://github.com/Maji-Studio/ogcr-design-system',
			note: 'frozen at 1.0.0 — do not reconcile against it'
		},
		{
			label: 'Figma source',
			value: '2P6XrQJhT8I39IR5LGK7RT',
			href: 'https://www.figma.com/design/2P6XrQJhT8I39IR5LGK7RT',
			note: 'OGCR – Design System'
		}
	];

	// Summary of the 2026-09-22 reconciliation. Full detail: the drift log in
	// design_system_integration.md.
	const driftSummary = [
		{ count: '38', of: 'of 62 colour tokens', label: 'already identical' },
		{ count: '5', of: 'of 62 colour tokens', label: 'drifted — corrected' },
		{ count: '19', of: 'of 62 colour tokens', label: 'missing — added' }
	];

	const driftedTokens = [
		{ name: '--text-positive', was: '#416c51', now: '#4f8263' },
		{ name: '--icon-positive', was: '#416c51', now: '#4f8263' },
		{ name: '--interaction-primary-hover', was: '#416c51', now: '#335641' },
		{ name: '--interaction-primary-active', was: '#416c51', now: '#335641' },
		{ name: '--interaction-secondary-focus', was: '#e2d0bf', now: '#c3daed' }
	];

	const nonColourDrift = [
		'Type ladder: --font-size-xs 14px → 10px, --font-size-s 16px → 14px (16px is not on the upstream ladder at all). The one change that can reflow existing markup.',
		'--radius-full: 999px → 9999px.',
		'--focus-ring-error was removed upstream. Kept here, deprecated, because app code still references it — use --focus-error (the full shadow).'
	];

	// Upstream sections refer to packages/design-system/docs/design-system.md.
	const componentPorts = [
		{ name: 'Card', spec: '§4.3', ported: true, note: 'src/lib/components/Card.svelte' },
		{ name: 'Pill', spec: '§4.6', ported: false, note: '' },
		{ name: 'Message', spec: '§4.9', ported: false, note: '' },
		{ name: 'KPI', spec: '§4.11', ported: false, note: '' },
		{ name: 'Table', spec: '§4.14', ported: false, note: '' },
		{ name: 'Select / Combobox', spec: '§4.17 / §4.18', ported: false, note: 'build on bits-ui' },
		{ name: 'Tabs', spec: '§4.23', ported: false, note: 'build on bits-ui' },
		{ name: 'Breadcrumb', spec: '§4.26', ported: false, note: '' },
		{ name: 'Pagination', spec: '§4.27', ported: false, note: '' },
		{ name: 'Tooltip', spec: '§4.34', ported: false, note: 'build on bits-ui' }
	];
	const portedCount = componentPorts.filter((c) => c.ported).length;
</script>

<svelte:head>
	<title>Design system — OGCR</title>
</svelte:head>

<div class="design-page mx-auto max-w-6xl space-y-12 px-6 py-10">
	<header class="space-y-2">
		<h1 class="text-h1" style="color: var(--text-primary);">OGCR Design System</h1>
		<p class="text-body" style="color: var(--text-neutral);">
			Live reference of the tokens defined in <code>src/ogcr-theme.css</code>. Mirrors
			<a
				class="anchor"
				href="https://www.figma.com/file/2P6XrQJhT8I39IR5LGK7RT/"
				target="_blank"
				rel="noreferrer">OGCR Design System</a
			>
			(Figma) and the verbatim copy in <code>src/ogcr-design-system-reference.css</code>.
		</p>
	</header>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Integration status</h2>
		<p class="text-body-s" style="color: var(--text-secondary);">
			The design system is React 19 + Base UI; this app is SvelteKit 5 + Skeleton 4, so none of its
			components can be imported. We mirror its <em>token values</em> by hand and build the
			components ourselves. The full record — why we do not install the package, what is pinned to
			what, and how to re-reconcile — is in
			<code>design_system_integration.md</code>.
		</p>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div class="space-y-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6">
				<div class="text-h4">Upstream provenance</div>
				<dl class="space-y-2">
					{#each provenance as row}
						<div class="grid grid-cols-[10rem_1fr] items-baseline gap-x-3">
							<dt class="text-body-s" style="color: var(--text-secondary);">{row.label}</dt>
							<dd class="text-body-s break-words">
								{#if row.href}
									<a href={row.href} class="anchor" target="_blank" rel="noopener noreferrer">
										<code>{row.value}</code>
									</a>
								{:else}
									<code>{row.value}</code>
								{/if}
								{#if row.note}
									<span style="color: var(--text-secondary);"> — {row.note}</span>
								{/if}
							</dd>
						</div>
					{/each}
				</dl>
				<p class="text-body-s" style="color: var(--text-secondary);">
					The pin that matters is the token commit, not the HEAD we happened to read: if nothing has
					touched <code>packages/design-system/src/styles/</code> since
					<code>e947133</code>, these tokens are current however far upstream has moved.
				</p>
			</div>

			<div class="space-y-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6">
				<div class="text-h4">Checking for drift</div>
				<pre
					class="overflow-auto rounded bg-surface-200-800 p-4 text-sm">npm run check:design-tokens</pre>
				<p class="text-body-s" style="color: var(--text-secondary);">
					Fetches the published tarball for the pinned version and diffs every token against
					<code>src/ogcr-design-system-reference.css</code> — all 62 colours plus the spacing, radius,
					type, elevation, motion and font-family scales. Exit 0 in sync, 1 on drift, 2 if it could not
					check (offline). It also flags a newer published version than our pin.
				</p>
				<p class="text-body-s" style="color: var(--text-secondary);">
					On drift, four files move together — the mirror, the named-token block of
					<code>src/ogcr-theme.css</code>, this page (the values here are display strings), and the
					drift log in the document. The Skeleton <code>--color-*</code> ramps are
					<em>derived</em>, not mirrored: only their anchor steps need to agree with upstream.
				</p>
			</div>
		</div>

		<div
			class="space-y-3 rounded-lg p-6"
			style="background: var(--surface-warning); border: 1px solid var(--border-warning-light);"
		>
			<div class="text-h4" style="color: var(--text-warning);">
				Not adopted: the shipped stylesheet
			</div>
			<p class="text-body-s" style="color: var(--text-warning);">
				Importing <code>styles.css</code> would give us exact tokens, but upstream pins
				<code>--spacing</code> to <code>1px</code> globally, where this app uses
				<code>0.25rem</code>. That quarters all 1,192 numeric spacing classes across 37 of our 41
				Svelte files, and <code>--spacing</code> lives in <code>@theme</code> at the root, so it
				cannot be scoped to one route. Two more changes land with it:
				<code>--font-size-m</code> 16 → 18px (taking <code>--text-h4</code> and
				<code>--text-body</code> with it), and <code>shadow-elevation-s</code> never existed.
			</p>
		</div>

		<h3 class="text-h3" style="color: var(--text-primary);">
			Drift log — 2026-09-22, first reconciliation
		</h3>
		<p class="text-body-s" style="color: var(--text-secondary);">
			The previous mirror claimed to be a verbatim copy of a file that no longer exists upstream (<code
				>index.css</code
			>
			was split into <code>palette.css</code> + <code>theme.css</code>). Diffing it against the real
			palette:
		</p>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each driftSummary as d}
				<div class="rounded border border-surface-200-800 bg-surface-50-950 p-4">
					<div class="text-h2" style="color: var(--text-primary);">{d.count}</div>
					<div class="text-body-s">{d.label}</div>
					<div class="text-body-s" style="color: var(--text-secondary);">{d.of}</div>
				</div>
			{/each}
		</div>

		<div class="space-y-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6">
			<div class="text-h4">Corrected values</div>
			<div class="space-y-2">
				{#each driftedTokens as t}
					<div class="flex flex-wrap items-center gap-3">
						<code class="text-body-s w-64 shrink-0">{t.name}</code>
						<span
							class="text-body-s inline-flex items-center gap-2"
							style="color: var(--text-secondary);"
						>
							<span
								class="inline-block rounded"
								style="background: {t.was}; width: 20px; height: 20px; border: 1px solid var(--border-medium);"
							></span>
							{t.was}
						</span>
						<span class="text-body-s" style="color: var(--text-secondary);">→</span>
						<span class="text-body-s inline-flex items-center gap-2">
							<span
								class="inline-block rounded"
								style="background: {t.now}; width: 20px; height: 20px; border: 1px solid var(--border-medium);"
							></span>
							{t.now}
						</span>
					</div>
				{/each}
			</div>
			<p class="text-body-s" style="color: var(--text-secondary);">
				The green moves are upstream's deliberate active-green vs. selection-navy split; the last
				row is a beige where the brand has light blue. 19 further tokens were simply absent here and
				have been added (the <code>icon-*-light</code> set, the
				<code>interaction-secondary-*</code> set, the <code>*-strong</code> borders,
				<code>surface-progress</code>, scrollbar and z-index tokens).
			</p>
			<div class="text-h4 pt-2">Non-colour drift</div>
			<ul class="list-disc space-y-1 pl-5">
				{#each nonColourDrift as item}
					<li class="text-body-s" style="color: var(--text-secondary);">{item}</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Brand</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="overflow-hidden rounded-lg border border-surface-200-800">
				<div style="background: var(--brand-blue-300); height: 96px;"></div>
				<div class="bg-surface-50-950 p-3">
					<div class="text-h4">Brand blue 300</div>
					<code class="text-body-s">#3f88c6 · --brand-blue-300</code>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border border-surface-200-800">
				<div style="background: var(--brand-blue-800); height: 96px;"></div>
				<div class="bg-surface-50-950 p-3">
					<div class="text-h4">Brand blue 800</div>
					<code class="text-body-s">#1c3d59 · --brand-blue-800</code>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border border-surface-200-800">
				<div style="background: var(--brand-green-500); height: 96px;"></div>
				<div class="bg-surface-50-950 p-3">
					<div class="text-h4">Brand green 500</div>
					<code class="text-body-s">#6db087 · --brand-green-500</code>
				</div>
			</div>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Typography</h2>
		<div class="space-y-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6">
			<div class="text-h1">text-h1 — The quick brown fox</div>
			<div class="text-h2">text-h2 — The quick brown fox</div>
			<div class="text-h3">text-h3 — The quick brown fox</div>
			<div class="text-h4">text-h4 — The quick brown fox</div>
			<div class="text-body">text-body — The quick brown fox jumps over the lazy dog.</div>
			<div class="text-body-s">text-body-s — The quick brown fox jumps over the lazy dog.</div>
			<div class="text-label-button">text-label-button</div>
			<div class="text-label-input">text-label-input</div>
		</div>

		<h3 class="text-h3" style="color: var(--text-primary);">Font sizes</h3>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each fontSizes as fs}
				<div
					class="flex items-baseline gap-3 rounded border border-surface-200-800 bg-surface-50-950 p-3"
				>
					<span style="font-size: {fs.size}; line-height: 1;">Aa</span>
					<code class="text-body-s">{fs.name} · {fs.size}</code>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Colour scales (Skeleton)</h2>
		<p class="text-body-s" style="color: var(--text-secondary);">
			These are the scales available via Tailwind/Skeleton classes (<code>bg-primary-500</code>,
			<code>text-surface-700</code>, …). Anchored to the design system tokens.
		</p>
		{#each skeletonScales as scale}
			<div class="space-y-1">
				<div class="text-h4">{scale.label}</div>
				<div class="grid grid-cols-11 gap-1">
					{#each shades as shade}
						<div
							class="rounded border border-surface-200-800 p-2 text-center text-xs"
							style="background: var(--color-{scale.name}-{shade}); color: var(--color-{scale.name}-contrast-{shade});"
						>
							{shade}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Named tokens</h2>

		<h3 class="text-h3" style="color: var(--text-primary);">Text</h3>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each dsTextTokens as t}
				<div class="rounded border border-surface-200-800 bg-surface-50-950 p-4">
					<div class="text-h4" style="color: {t.value};">Sample text</div>
					<code class="text-body-s">{t.name} · {t.value}</code>
				</div>
			{/each}
		</div>

		<h3 class="text-h3" style="color: var(--text-primary);">Surface</h3>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each dsSurfaceTokens as t}
				<div class="overflow-hidden rounded border border-surface-200-800">
					<div style="background: {t.value}; height: 64px;"></div>
					<div class="bg-surface-50-950 p-3">
						<code class="text-body-s">{t.name}</code>
						<div class="text-body-s" style="color: var(--text-secondary);">{t.value}</div>
					</div>
				</div>
			{/each}
		</div>

		<h3 class="text-h3" style="color: var(--text-primary);">Border</h3>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each dsBorderTokens as t}
				<div class="rounded bg-surface-50-950 p-4" style="border: 2px solid {t.value};">
					<code class="text-body-s">{t.name}</code>
					<div class="text-body-s" style="color: var(--text-secondary);">{t.value}</div>
				</div>
			{/each}
		</div>

		<h3 class="text-h3" style="color: var(--text-primary);">Interaction</h3>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each dsInteractionTokens as t}
				<div class="overflow-hidden rounded border border-surface-200-800">
					<div style="background: {t.value}; height: 48px;"></div>
					<div class="bg-surface-50-950 p-3">
						<code class="text-body-s">{t.name}</code>
						<div class="text-body-s" style="color: var(--text-secondary);">{t.value}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Spacing</h2>
		<div class="space-y-2">
			{#each spacing as sp}
				<div class="flex items-center gap-4">
					<code class="text-body-s w-32 shrink-0">{sp.name}</code>
					<div style="background: var(--brand-blue-800); height: 16px; width: {sp.size};"></div>
					<span class="text-body-s" style="color: var(--text-secondary);">{sp.size}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Radius</h2>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
			{#each radii as r}
				<div class="space-y-2 text-center">
					<div
						style="background: var(--brand-blue-800); height: 80px; border-radius: {r.size};"
					></div>
					<code class="text-body-s">{r.name}</code>
					<div class="text-body-s" style="color: var(--text-secondary);">{r.size}</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Elevation</h2>
		<div class="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
			<div class="rounded-lg bg-surface-50-950 p-6" style="box-shadow: var(--elevation-l);">
				<div class="text-h4">Elevation L</div>
				<code class="text-body-s">--elevation-l</code>
			</div>
			<div class="rounded-lg border border-surface-200-800 bg-surface-50-950 p-6">
				<div class="text-h4">No elevation</div>
				<code class="text-body-s">(border only)</code>
			</div>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Buttons (Skeleton)</h2>
		<div
			class="flex flex-wrap gap-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6"
		>
			<button type="button" class="btn preset-filled-primary-500">Primary</button>
			<button type="button" class="btn preset-filled-secondary-500">Secondary</button>
			<button type="button" class="btn preset-filled-tertiary-500">Tertiary</button>
			<button type="button" class="btn preset-filled-success-500">Success</button>
			<button type="button" class="btn preset-filled-warning-500">Warning</button>
			<button type="button" class="btn preset-filled-error-500">Error</button>
		</div>
		<div
			class="flex flex-wrap gap-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6"
		>
			<button type="button" class="btn preset-outlined-primary-500">Primary</button>
			<button type="button" class="btn preset-outlined-secondary-500">Secondary</button>
			<button type="button" class="btn preset-outlined-tertiary-500">Tertiary</button>
			<button type="button" class="btn preset-outlined-success-500">Success</button>
			<button type="button" class="btn preset-outlined-warning-500">Warning</button>
			<button type="button" class="btn preset-outlined-error-500">Error</button>
		</div>
		<div
			class="flex flex-wrap gap-3 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6"
		>
			<button type="button" class="btn preset-filled-primary-500 btn-sm">Small</button>
			<button type="button" class="btn preset-filled-primary-500">Default</button>
			<button type="button" class="btn preset-filled-primary-500 btn-lg">Large</button>
			<button type="button" class="btn preset-filled-primary-500" disabled>Disabled</button>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Form elements</h2>
		<div
			class="grid grid-cols-1 gap-6 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6 md:grid-cols-2"
		>
			<label class="space-y-1">
				<span class="text-label-input block">Text input</span>
				<input class="input" type="text" placeholder="Enter text…" />
			</label>
			<label class="space-y-1">
				<span class="text-label-input block">Email</span>
				<input class="input" type="email" placeholder="user@example.com" />
			</label>
			<label class="space-y-1">
				<span class="text-label-input block">Select</span>
				<select class="select">
					<option>Option A</option>
					<option>Option B</option>
				</select>
			</label>
			<label class="space-y-1">
				<span class="text-label-input block">Textarea</span>
				<textarea class="textarea" rows="3" placeholder="Multi-line…"></textarea>
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" class="checkbox" checked />
				<span class="text-body-s">Checkbox (checked)</span>
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" class="checkbox" />
				<span class="text-body-s">Checkbox (unchecked)</span>
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" name="demo-radio" class="radio" checked />
				<span class="text-body-s">Radio A</span>
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" name="demo-radio" class="radio" />
				<span class="text-body-s">Radio B</span>
			</label>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Cards</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="card rounded-lg border border-surface-200-800 bg-surface-50-950 p-6">
				<h3 class="text-h4">Default card</h3>
				<p class="text-body-s mt-2" style="color: var(--text-secondary);">
					Surface 50, light border, radius L.
				</p>
			</div>
			<div
				class="card rounded-lg p-6"
				style="background: var(--surface-positive); border: 1px solid var(--border-positive-light);"
			>
				<h3 class="text-h4" style="color: var(--text-positive);">Positive</h3>
				<p class="text-body-s mt-2" style="color: var(--text-positive);">
					surface-positive + border-positive-light.
				</p>
			</div>
			<div
				class="card rounded-lg p-6"
				style="background: var(--surface-warning); border: 1px solid var(--border-warning-light);"
			>
				<h3 class="text-h4" style="color: var(--text-warning);">Warning</h3>
				<p class="text-body-s mt-2" style="color: var(--text-warning);">
					surface-warning + border-warning-light.
				</p>
			</div>
			<div
				class="card rounded-lg p-6"
				style="background: var(--surface-negative); border: 1px solid var(--border-negative-light);"
			>
				<h3 class="text-h4" style="color: var(--text-negative);">Negative</h3>
				<p class="text-body-s mt-2" style="color: var(--text-negative);">
					surface-negative + border-negative-light.
				</p>
			</div>
			<div class="card rounded-lg p-6" style="background: var(--surface-strong); color: white;">
				<h3 class="text-h4" style="color: white;">Strong</h3>
				<p class="text-body-s mt-2" style="color: rgba(255,255,255,0.8);">
					surface-strong (used for hero panels).
				</p>
			</div>
			<div class="card rounded-lg p-6" style="background: var(--surface-inverted); color: white;">
				<h3 class="text-h4" style="color: white;">Inverted</h3>
				<p class="text-body-s mt-2" style="color: rgba(255,255,255,0.8);">
					surface-inverted (warm dark).
				</p>
			</div>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Component port status</h2>
		<p class="text-body-s" style="color: var(--text-secondary);">
			Upstream ships 42 React components. We re-build the ones we need in Svelte against the
			published spec — {portedCount} of the {componentPorts.length} on our list so far. Section numbers
			refer to <code>packages/design-system/docs/design-system.md</code>.
		</p>

		<div
			class="table-wrap overflow-hidden rounded-lg border border-surface-200-800 bg-surface-50-950"
		>
			<table class="table">
				<thead>
					<tr>
						<th>Component</th>
						<th>Spec</th>
						<th>Status</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					{#each componentPorts as c}
						<tr>
							<td class="text-body-s">{c.name}</td>
							<td class="text-body-s" style="color: var(--text-secondary);">{c.spec}</td>
							<td>
								{#if c.ported}
									<span class="badge preset-filled-success-500">ported</span>
								{:else}
									<span class="badge preset-outlined-surface-500">not yet</span>
								{/if}
							</td>
							<td class="text-body-s" style="color: var(--text-secondary);"
								><code>{c.note}</code></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<h3 class="text-h3" style="color: var(--text-primary);">Ported: Card (§4.3)</h3>
		<p class="text-body-s" style="color: var(--text-secondary);">
			The reference for the ports that follow. Values come from the shipped component, not from the
			copy-paste CSS in the spec — those <code>.ogcr-*</code> BEM classes exist nowhere in
			upstream's source. The <code>ogcr-</code> prefix here is only a namespace, because Skeleton
			ships its own global <code>.card</code>.
		</p>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card title="Default" subtitle="padding m · border-medium · radius xl">
				<p class="text-body-s" style="color: var(--text-secondary);">
					One-for-one with the shipped component, expressed as scoped CSS over our named tokens.
				</p>
			</Card>
			<Card title="Floating" subtitle="elevation-l" floating>
				<p class="text-body-s" style="color: var(--text-secondary);">
					<code>floating</code> swaps the border shadow for <code>--elevation-l</code>.
				</p>
			</Card>
			<Card title="Link card" subtitle="app extension" href="/design" padding="l">
				<p class="text-body-s" style="color: var(--text-secondary);">
					<code>href</code> and the <code>leading</code> snippet are our two documented additions to the
					upstream API. Hover lifts by elevation, never by fill.
				</p>
			</Card>
		</div>
		<p class="text-body-s" style="color: var(--text-secondary);">
			Dark mode is ours, not upstream's: the design system has no dark palette and its light tokens
			are fixed values, so each port carries a <code>[data-mode='dark']</code> block over the Skeleton
			dark surfaces. When upstream ships a dark palette those blocks should be replaced by token overrides
			rather than extended.
		</p>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Pills / badges</h2>
		<div
			class="flex flex-wrap gap-2 rounded-lg border border-surface-200-800 bg-surface-50-950 p-6"
		>
			<span class="badge preset-filled-primary-500">Primary</span>
			<span class="badge preset-filled-secondary-500">Secondary</span>
			<span class="badge preset-filled-tertiary-500">Tertiary</span>
			<span class="badge preset-filled-success-500">Success</span>
			<span class="badge preset-filled-warning-500">Warning</span>
			<span class="badge preset-filled-error-500">Error</span>
		</div>
	</section>

	<!-- ============================================================ -->
	<section class="space-y-4">
		<h2 class="text-h2" style="color: var(--text-primary);">Motion</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div class="rounded border border-surface-200-800 bg-surface-50-950 p-4">
				<code class="text-body-s">--motion-fast</code>
				<div class="text-body-s" style="color: var(--text-secondary);">150ms ease-out</div>
			</div>
			<div class="rounded border border-surface-200-800 bg-surface-50-950 p-4">
				<code class="text-body-s">--motion-base</code>
				<div class="text-body-s" style="color: var(--text-secondary);">
					200ms cubic-bezier(0.2, 0, 0, 1)
				</div>
			</div>
		</div>
	</section>
</div>
