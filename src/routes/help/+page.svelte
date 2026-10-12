<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/Card.svelte';
	import { HelpCircle, Coins, Banknote, Info, FlaskConical, ArrowLeft } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-8 max-w-4xl mx-auto space-y-8">
	<div class="flex items-center gap-4">
		<HelpCircle class="size-8 text-primary-500" />
		<h1 class="h1">Tokens — How it works</h1>
	</div>

	<a href="/chain" class="anchor inline-flex items-center gap-1 text-sm">
		<ArrowLeft class="size-4" /> Go to Chain
	</a>

	<p class="text-surface-600-400">
		How OGCR's tokens work, from the OBP glossary. The glossary is generated from the smart
		contracts' own documentation, so it is always the authority on how the contracts behave.
	</p>

	{#each data.glossaryItems as item (item.title)}
		<Card title={item.title} headingLevel={2} padding="l">
			<!-- OBP renders the item's markdown to HTML; the glossary is part of OBP itself. -->
			<div class="glossary">{@html item.html}</div>
		</Card>
	{:else}
		<p class="text-surface-600-400">
			The glossary could not be loaded from OBP. Try again later.
		</p>
	{/each}

	<!-- Coins vs notes -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<div class="flex items-center gap-3">
			<Banknote class="size-6 text-primary-500" />
			<h2 class="h2">Why history is lost: coins and notes</h2>
		</div>
		<p class="text-surface-600-400">
			The reason pooled credits lose their history isn't a shortcoming — it's the definition of
			being interchangeable. Something is fungible precisely <em>because</em> nobody records which
			one is which. There are two ways money handles this, and they lead to two different designs.
		</p>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="card p-6 preset-filled-surface-50-950 space-y-2">
				<div class="flex items-center gap-3">
					<Coins class="size-6 text-primary-500" />
					<h3 class="h3">Coins</h3>
				</div>
				<p class="text-sm text-surface-600-400">
					A euro coin has no identity. There is no record of which coin is which, and there never
					was. Tracing one is not difficult — it is <strong>impossible</strong>, permanently.
				</p>
				<p class="text-xs text-surface-500">
					This is how credits behave today once they leave a batch.
				</p>
			</div>
			<div class="card p-6 preset-filled-surface-50-950 space-y-2">
				<div class="flex items-center gap-3">
					<Banknote class="size-6 text-primary-500" />
					<h3 class="h3">Notes</h3>
				</div>
				<p class="text-sm text-surface-600-400">
					A euro banknote carries a serial number. It still spends as freely as any other note,
					because in everyday use nobody looks — but the identity is <strong>there</strong>, and
					can be consulted when something goes wrong.
				</p>
				<p class="text-xs text-surface-500">
					This is how established carbon registries work: credits carry serial numbers and trade
					as interchangeable.
				</p>
			</div>
		</div>
		<p class="text-surface-600-400">
			The difference matters most when an activity is later found to be invalid. Under the coin
			model, credits that have already dispersed cannot be identified, so nothing can be done about
			them. Under the note model they remain identifiable no matter how many times they change
			hands.
		</p>
	</section>

	<!-- The note model -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<div class="flex items-center gap-3">
			<FlaskConical class="size-6 text-primary-500" />
			<h2 class="h2">The note model, in detail</h2>
		</div>
		<div class="card p-4 preset-tonal-primary flex gap-3">
			<Info class="size-5 shrink-0 mt-0.5 text-primary-500" />
			<p class="text-sm">
				<strong>Under consideration, not built.</strong> This section describes an approach OGCR is
				evaluating. It is not how the system behaves today.
			</p>
		</div>
		<p class="text-surface-600-400">
			In the note model, every credit carries a <strong>tag</strong> recording where it came from,
			and that tag travels with it through every transfer, forever. A holder's balance is then not a
			single number but a set of identifiable holdings:
		</p>
		<div class="card p-6 preset-filled-surface-50-950 space-y-2">
			<p class="text-sm"><strong>Bob holds:</strong></p>
			<p class="text-sm pl-6 border-l-2 border-primary-500">300 credits from batch #1</p>
			<p class="text-sm pl-6 border-l-2 border-primary-500">200 credits from batch #7</p>
			<p class="text-sm text-surface-600-400 pt-2">
				He has 500 credits in total — but not an anonymous 500. He has two holdings that can each
				still be traced to the activity that produced them.
			</p>
		</div>
		<p class="text-surface-600-400">
			Trading works normally: nothing is locked, there is no waiting period, and no permission is
			needed. The one change is that when Bob sells 400 credits he must say <em>which</em> 400 —
			exactly as handing over cash means handing over particular notes.
		</p>
		<h3 class="h3 pt-2">What it costs</h3>
		<p class="text-surface-600-400">
			Market depth. If every batch is separately tagged, buyers cannot simply order "1000 credits" —
			they buy from particular batches. That makes each individual market smaller. Established
			registries accept this because carbon is largely traded through negotiated, one-to-one deals
			rather than an open exchange.
		</p>
		<h3 class="h3 pt-2">How precise the tag should be</h3>
		<p class="text-surface-600-400">
			Traceability is a dial rather than a switch, and where it is set is the real decision:
		</p>
		<div class="space-y-2">
			<div class="card p-4 preset-filled-surface-50-950 text-sm">
				<strong>Tag per batch</strong> — the most precise. Every credit traces to one activity.
				Smallest individual markets.
			</div>
			<div class="card p-4 preset-filled-surface-50-950 text-sm">
				<strong>Tag per class</strong> — for example by credit type and vintage year. Credits are
				interchangeable within a class, and still traceable to that class. A middle position with
				far better market depth.
			</div>
			<div class="card p-4 preset-filled-surface-50-950 text-sm">
				<strong>No tag</strong> — today's behaviour once credits leave a batch. One deep, single
				market, and no provenance at all.
			</div>
		</div>
		<p class="text-surface-600-400">
			The setting also decides what can be done when an activity is discredited. Tagged per batch,
			the affected credits can be identified exactly. Tagged per class, the affected holders can be
			identified and the loss shared proportionally across that class. Untagged, nothing can be
			done once the credits have dispersed.
		</p>
	</section>
</div>

<style>
	/* The glossary HTML comes from OBP, so its elements are styled here rather than with
	   classes: headings, tables and code in design system tokens. */
	.glossary {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
		font-family: var(--font-family-default);
		font-size: var(--font-size-s);
		line-height: 1.5;
		color: var(--text-neutral);
		overflow-wrap: anywhere;
	}
	.glossary :global(h3) {
		margin-top: var(--space-s);
		font-size: var(--font-size-m);
		font-weight: 500;
		color: var(--text-primary);
	}
	/* OBP wraps each heading in a link to its own anchor, which has no target here. */
	.glossary :global(h3 a) {
		color: inherit;
		text-decoration: none;
	}
	.glossary :global(p a) {
		color: var(--interaction-primary-default);
		text-decoration: underline;
	}
	.glossary :global(ul) {
		list-style: disc;
		padding-left: var(--space-l);
	}
	.glossary :global(code) {
		font-family: var(--font-family-mono);
		font-size: 0.9em;
	}
	.glossary :global(pre) {
		overflow-x: auto;
		padding: var(--space-s);
		background: var(--surface-neutral);
		border-radius: var(--radius-m);
		overflow-wrap: normal;
	}
	.glossary :global(table) {
		display: block;
		overflow-x: auto;
		border-collapse: collapse;
		overflow-wrap: normal;
	}
	.glossary :global(th),
	.glossary :global(td) {
		padding: var(--space-xs);
		border-bottom: 1px solid var(--border-light);
		text-align: left;
		vertical-align: top;
	}
	.glossary :global(th) {
		color: var(--text-primary);
		font-weight: 500;
	}

	/* Dark mode: the design system has no dark palette, so fall back to the Skeleton dark
	   surfaces, as Card does. */
	:global([data-mode='dark']) .glossary {
		color: var(--color-surface-300);
	}
	:global([data-mode='dark']) .glossary :global(h3),
	:global([data-mode='dark']) .glossary :global(th) {
		color: var(--color-primary-200);
	}
	:global([data-mode='dark']) .glossary :global(pre) {
		background: var(--color-surface-800);
	}
	:global([data-mode='dark']) .glossary :global(th),
	:global([data-mode='dark']) .glossary :global(td) {
		border-color: var(--color-surface-700);
	}
</style>
