<script lang="ts">
	import {
		HelpCircle,
		Award,
		Wallet,
		Coins,
		Banknote,
		ArrowRightLeft,
		Layers,
		Info,
		FlaskConical,
		ArrowLeft,
		ArrowDown
	} from '@lucide/svelte';
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
		Carbon credits in OGCR are recorded on a blockchain. This page explains the model in plain
		English — no prior blockchain knowledge assumed. The short version: <strong
			>a certificate proves where credits came from, and the credits live in a wallet that belongs
			to that certificate.</strong
		>
	</p>

	<!-- The two kinds of token -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<h2 class="h2">Two kinds of token</h2>
		<p class="text-surface-600-400">
			Everything on the chain is one of two kinds. The difference matters, because they answer
			different questions.
		</p>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="card p-6 preset-filled-surface-50-950 space-y-2">
				<div class="flex items-center gap-3">
					<Award class="size-6 text-primary-500" />
					<h3 class="h3">Certificates</h3>
				</div>
				<p class="text-sm text-surface-600-400">
					Each one is <strong>unique and one-of-a-kind</strong> — like a passport or a title deed.
					It answers <em>"what is this, and where did it come from?"</em> Parcels, activities,
					certifications and credit batches are all certificates.
				</p>
				<p class="text-xs text-surface-500">Technically: ERC-721, often called an NFT.</p>
			</div>
			<div class="card p-6 preset-filled-surface-50-950 space-y-2">
				<div class="flex items-center gap-3">
					<Coins class="size-6 text-primary-500" />
					<h3 class="h3">Credits</h3>
				</div>
				<p class="text-sm text-surface-600-400">
					These are <strong>interchangeable units</strong> — like coins or shares. One is exactly
					as good as another. They answer <em>"how many?"</em> A balance of 300 is just a number
					attached to an address.
				</p>
				<p class="text-xs text-surface-500">Technically: ERC-20, the Carbon Credit token.</p>
			</div>
		</div>
	</section>

	<!-- The chain of records -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<div class="flex items-center gap-3">
			<Layers class="size-6 text-primary-500" />
			<h2 class="h2">The chain of records</h2>
		</div>
		<p class="text-surface-600-400">
			Credits are not created out of nowhere. Each one traces back through a chain of certificates,
			every link recorded on-chain before the next can exist.
		</p>
		<div class="space-y-2">
			<div class="card p-4 preset-filled-surface-50-950">
				<strong>Parcel</strong> — a piece of land.
			</div>
			<div class="flex justify-center text-surface-500"><ArrowDown class="size-4" /></div>
			<div class="card p-4 preset-filled-surface-50-950">
				<strong>Activity</strong> — what is being done on that land, and over what period.
			</div>
			<div class="flex justify-center text-surface-500"><ArrowDown class="size-4" /></div>
			<div class="card p-4 preset-filled-surface-50-950">
				<strong>Certification</strong> — an independent body confirming the activity meets a
				scheme's rules.
			</div>
			<div class="flex justify-center text-surface-500"><ArrowDown class="size-4" /></div>
			<div class="card p-4 preset-filled-surface-50-950">
				<strong>Credit batch</strong> — credits issued against that certified activity, for one
				type of credit.
			</div>
		</div>
		<p class="text-surface-600-400">
			A batch certificate carries links to each supporting document, together with a
			<strong>fingerprint</strong> (a hash) of its contents. Anyone can fetch a document and check
			the fingerprint still matches — proving it has not been altered since the credits were issued.
		</p>
	</section>

	<!-- The wallet -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<div class="flex items-center gap-3">
			<Wallet class="size-6 text-primary-500" />
			<h2 class="h2">Every batch has its own wallet</h2>
		</div>
		<p class="text-surface-600-400">
			This is the part that surprises most people. When a credit batch certificate is created, it
			automatically gets <strong>its own wallet</strong> — a real address on the chain. Not a wallet
			belonging to a person; a wallet belonging to the certificate.
		</p>
		<p class="text-surface-600-400">The credits are then placed in that wallet.</p>
		<div class="card p-6 preset-filled-surface-50-950 space-y-3">
			<p class="text-sm">
				<strong>Batch #1</strong> — certificate for 300 credits of soil carbon, from activity
				"Meadow restoration"
			</p>
			<p class="text-sm pl-6 border-l-2 border-primary-500">
				↳ its wallet holds <strong>300 Carbon Credit tokens</strong>
			</p>
			<p class="text-sm pt-2">
				<strong>Batch #2</strong> — certificate for 700 credits of a different type, same activity
			</p>
			<p class="text-sm pl-6 border-l-2 border-primary-500">
				↳ its own separate wallet holds <strong>700 Carbon Credit tokens</strong>
			</p>
		</div>
		<p class="text-surface-600-400">
			Two batches, two wallets, two balances that never mix. That separation is what keeps each
			credit connected to the evidence behind it.
		</p>
		<div class="card p-4 preset-tonal-primary flex gap-3">
			<Info class="size-5 shrink-0 mt-0.5 text-primary-500" />
			<p class="text-sm">
				<strong>Who controls the wallet?</strong> Whoever holds the certificate. The wallet has no
				password or key of its own — it simply asks, every single time, "who owns my certificate
				right now?" and takes instructions only from that person.
			</p>
		</div>
	</section>

	<!-- Selling -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<div class="flex items-center gap-3">
			<ArrowRightLeft class="size-6 text-primary-500" />
			<h2 class="h2">What happens when a batch is sold</h2>
		</div>
		<p class="text-surface-600-400">
			If Simon owns batch #1 and sells it to Bob, the credits themselves <em>never move</em>. All
			that changes is who holds the certificate.
		</p>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="card p-6 preset-filled-surface-50-950 space-y-2">
				<h3 class="h4">Before</h3>
				<ul class="text-sm text-surface-600-400 space-y-1 list-disc list-inside">
					<li>Simon holds certificate #1</li>
					<li>Batch #1's wallet holds 300 credits</li>
					<li>Simon controls those 300 credits</li>
				</ul>
			</div>
			<div class="card p-6 preset-filled-surface-50-950 space-y-2">
				<h3 class="h4">After</h3>
				<ul class="text-sm text-surface-600-400 space-y-1 list-disc list-inside">
					<li>Bob holds certificate #1</li>
					<li>Batch #1's wallet still holds the same 300 credits</li>
					<li>Bob now controls those 300 credits</li>
				</ul>
			</div>
		</div>
		<p class="text-surface-600-400">
			One transaction transfers the proof and the quantity together. The buyer receives credits that
			still point at the activity, the certification body and the scheme that produced them.
		</p>
	</section>

	<!-- Withdrawn credits -->
	<section class="card p-8 preset-filled-surface-100-900 space-y-4">
		<div class="flex items-center gap-3">
			<Info class="size-6 text-primary-500" />
			<h2 class="h2">Credits can also be taken out of a batch</h2>
		</div>
		<p class="text-surface-600-400">
			The holder of a batch can move credits out of its wallet and into an ordinary personal wallet.
			This is allowed, but it has a consequence worth understanding.
		</p>
		<p class="text-surface-600-400">
			Once credits sit in a personal wallet they are <strong>pooled</strong>. Credits from different
			batches mix together into a single balance, and at that point the chain can no longer say
			which batch any individual credit came from — in the same way that coins from two different
			pockets, once in the same jar, can no longer be told apart.
		</p>
		<p class="text-surface-600-400">
			So credits exist in two states, and the Chain page counts both: <strong>inside a batch</strong
			>, where full provenance is intact, and <strong>in a wallet</strong>, where only the quantity
			remains.
		</p>
	</section>

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
