# OGCR — Chain Integration and the App Heartbeat

How on-chain state reaches the marketplace, what runs locally to make that
testable without the shared network, and a proposal for showing a live heartbeat
in the app.

---

## 1. The path from chain to app

The marketplace has no blockchain client, and should not grow one. It talks to
OBP and nothing else, which is the same principle as
[design_goals.md](./design_goals.md): the marketplace is a user-facing interface
over the registry.

So the chain reaches the app indirectly:

```
OGCR chain (EVM, chain id 2025)
        │  read (no private key)
        ▼
OGCR-chain-cache            Go service, one-shot mirror
        │  write via DirectLogin
        ▼
OBP dynamic entities        *_on_chain
        │  read via OBP API
        ▼
OGCR-App (marketplace)
```

Anything the app wants to say about the chain has to be true of an OBP dynamic
entity first. That constraint shapes the heartbeat design in section 4.

### What the cache mirrors

| Entity | Business key | Source |
|---|---|---|
| `parcel_on_chain` | `parcel_id` | ParcelNFT |
| `activity_on_chain` | `activity_id` | ActivityNFT |
| `certification_on_chain` | `certification_of_compliance_id` | CertificationNFT |
| `carbon_credit_batch_on_chain` | `batch_key` | CarbonCreditBatchNFT |
| `carbon_credit_balance_on_chain` | `owner_address` | CarbonCredit (ERC-20) |

The first four are built from `*Minted` events, so each record is a faithful
snapshot of a mint. Credit balances are different: an ERC-20 balance has no event
to anchor to, so those records are current state and carry the block height they
were read at.

A credit batch is one activity and credit type pair. It owns an ERC-6551
token-bound account, and that account holds the batch's credits. Withdrawing
credits from it into an ordinary wallet is the decomposition step in the token
design, and `holder_type` on the balance entity is what tells the two apart.

---

## 2. Running the chain locally

The shared Besu network is currently off to save cost. Any EVM node works in its
place, so local development uses **anvil**, the node that ships with
[Foundry](https://getfoundry.sh).

A bare anvil is not useful on its own. It is an empty chain, so the cache would
find nothing, which looks exactly like a broken configuration. The local setup
therefore also deploys the contracts and seeds a fixture.

### Pieces

| What | Where |
|---|---|
| Deploy and seed the full token family | `OGCR-Smart-Contracts/script/local/DeployLocalStack.s.sol` |
| Generated addresses, gitignored | `OGCR-Smart-Contracts/deployments/local-anvil.env` |
| Start chain, deploy, follow log | `commands/_helpers/start_ogcr_chain.sh` |
| Run the cache on a loop | `commands/_helpers/start_ogcr_chain_cache.sh` |
| Chain-cache configuration, gitignored | `OGCR-chain-cache/.env` |

`DeployLocalStack` seeds one coherent chain of records: parcel, activity,
certificate of compliance, then two credit batches on that activity with
different credit types, plus a wallet holding and a zero balance. It refuses to
run unless the deployer is anvil's well-known test account, so it cannot be
aimed at a real chain by accident.

**It mints against registry ids that already exist in OBP.** The real tokenizer
works that way round: records exist in the registry, and tokens are minted for
them. A fixture that invents its own ids produces a chain referencing registry
records that do not exist, and every link from a token back to the registry
404s. The launcher reads real ids from the local OBP and passes them in through
`OGCR_ACTIVITY_ID`, `OGCR_PARCEL_ID`, `OGCR_OPERATOR_ID` and `OGCR_COC_ID`. The
script falls back to placeholders only when that lookup fails, and prints a
warning saying links will break.

Anvil derives contract addresses from the deployer and its nonce, so a fresh
chain plus that script always yields the **same addresses**. That is what makes
the generated env file worth keeping rather than re-reading on every restart.

### In the dev environment

`open_dev_env` opens two new terminals, both before OGCR-App:

- **⛓️ OGCR-Chain** (slate) starts anvil on chain id 2025 at port 8545, deploys,
  prints the addresses, then follows the chain log. Closing it stops the chain.
- **🔗 OGCR-Chain-Cache** (zinc) waits for that chain and for OBP, ensures the
  dynamic entities exist, then mirrors on a loop.

The cache is a one-shot program, so the loop is what keeps OBP current. The
interval defaults to thirty seconds and is the first argument to the script.

### The mirror never deletes

`upsert` is the only write the cacher makes. Nothing removes a record whose
token has gone, which is correct for a real append-only chain where tokens do
not disappear.

A throwaway local chain does disappear, every time anvil restarts. Records from
a previous chain then linger, pointing at tokens that no longer exist, and they
look exactly like current ones. To find them, take each record's identifier and
ask the contract whether it still knows it:

```bash
cast call "$ACTIVITY_CONTRACT_ADDRESS" "tokenIdByActivityId(string)(uint256)" \
  "<activity_id>" --rpc-url http://127.0.0.1:8545
```

Zero means the chain has never heard of it, so the record is an orphan and can
be deleted. Do not use `ownerOf(tokenId)` for this: token ids are reassigned
from 1 on a fresh chain, so an orphan's id usually belongs to some unrelated
token and the call succeeds misleadingly.

### Safety: never mirror fixtures into the shared registry

The chain and the OBP target must always move together. A local chain paired
with the shared DCR would write throwaway fixture tokens next to real registry
records, which is the one combination worth guarding against.

The dev-env runner enforces this: it targets a local OBP regardless of what the
config says, and refuses to run against a non-local one unless explicitly
overridden. A plain `make run` does no such check, so it inherits whatever the
config holds.

On this machine both halves are local, so the hazard is currently theoretical.
It becomes live again the moment `.env` is pointed back at shared
infrastructure.

### Local OBP configuration

Configured and verified. `OGCR-chain-cache/.env` now points entirely at local
infrastructure: the local OBP-API and the local anvil chain. Credentials are the
ones `OGCR-DynamicEntities` already uses against the same OBP instance. The
previous shared-DCR values are backed up at
`~/ogcr-chain-cache-env-dcr-backup-2026-09-08`.

Because both halves are local, `make run` and `make run-local` are equivalent
here. The `-local` variants additionally re-read the contract addresses from the
deploy script's output, so they stay correct if the fixture is redeployed:

```bash
make setup-entity-local   # create/update the entities on the local OBP
make run-local            # mirror the local chain into the local OBP
```

**The pairing that must never happen** is a local chain with a shared OBP, which
would write fixture tokens into the real registry. The dev-env runner refuses
that combination outright. A plain `make run` does not check, so if `.env` is
ever pointed back at the shared DCR, both halves must move together.

A full run mirrors cleanly with no errors:

| Entity | Records |
|---|---|
| `parcel_on_chain` | 2 |
| `activity_on_chain` | 2 |
| `certification_on_chain` | 2 |
| `carbon_credit_batch_on_chain` | 2 |
| `carbon_credit_balance_on_chain` | 5 |

One migration was needed to get there. `parcel_on_chain` already existed on the
local OBP with the old CarbonProjectNFT shape, and OBP refuses a structural
change to an entity holding data (`OBP-09023`). Its single stale record was
backed up to `~/ogcr-parcel_on_chain-backup-2026-09-08.json` and deleted, after
which the schema migrated cleanly.

---

## 3. Why a heartbeat is worth having

The connection from chain to app runs through three hops and two services. When
it breaks, nothing in the marketplace looks obviously wrong; the data simply
stops changing. A visible heartbeat turns a silent failure into an obvious one,
and gives everyone confidence that the chain and the app are genuinely connected
rather than the app showing a plausible-looking cache of nothing.

---

## 4. The sync status record

### The problem with using existing data

The obvious approach is to show the most recently mirrored token. It does not
work. Those records carry the block a token was **minted** in, not when the cache
last ran. On a healthy but quiet chain, where nothing has been minted for a week,
that display is indistinguishable from a cache that died a week ago. It reports
the opposite of what a heartbeat is for.

### The record

The cacher writes one record per run to `chain_sync_status`:

| Field | Type | Meaning |
|---|---|---|
| `sync_key` | string | Business key, one record per chain, e.g. `chain-2025` |
| `chain_id` | integer | EVM chain id the run read |
| `head_block` | integer | Chain head at the end of the run |
| `synced_at` | string | ISO-8601 timestamp the run finished |
| `run_status` | string | `ok` or `partial`, when some upserts failed |
| `parcel_count` … | integer | Records mirrored per entity in that run |

A string business key for the same reason `carbon_credit_batch_on_chain` uses
`batch_key`: records are matched with a server-side query filter, which is
dependable for a string field and not for an integer one.

Two behaviours matter more than the fields:

- **A run that cannot reach the chain writes nothing.** The previous record then
  ages visibly, which is the honest signal. Writing a status that claims a
  successful look at an unreachable chain would actively mislead.
- **`interval_seconds` is declared by whatever supervises the loop**, through
  `SYNC_INTERVAL_SECONDS`. The app reads it rather than hardcoding a schedule it
  has no way to know.

### What the app shows

`ChainHeartbeat.svelte` renders five states, each named in words as well as
coloured, so the meaning does not depend on colour alone:

| State | When |
|---|---|
| Chain connected | Fresh record, no errors |
| Chain syncing with errors | Fresh record, but the run was partial |
| Chain sync stalled | Older than the staleness threshold |
| Chain never synced | No record at all |
| Chain sync unknown | Record present but its timestamp is unreadable |

Only the connected state animates. A stalled mirror must not look busy, since
that would suggest activity that is not happening.

Staleness is `interval_seconds × 3`, floored at 90 seconds so a fast interval
does not make the indicator flap, and defaulting to 5 minutes when the cacher
declares no interval. Tolerating a couple of missed runs avoids crying wolf over
a single slow scan.

It appears in two places:

- **The landing page**, compact, so the connection is visible without anyone
  going looking for it.
- **`/chain`**, in full, with per-entity counts from the last run, the time of
  that pass, and a recent chain activity table ordered by block. That page
  re-reads itself on the mirror's own cadence, since a heartbeat that only
  updates on reload is not much of a heartbeat.

Timestamps render as UTC on the server and switch to the reader's own time zone
once mounted. Formatting a date the obvious way would render server-local time
and then be replaced during hydration, which is a mismatch; emitting a
deterministic UTC string first avoids it.

The recent activity table carries a note explaining that a short list with an
old newest block is a quiet chain rather than a broken one, so the two signals
are not confused.

Identifiers in that table link to a page in the app where one exists. Activities
link to their own page; credit batches and certifications resolve through
`activity_nft_id` to the activity they belong to. Records with no page, such as
parcels, fall back to the registry URL the token itself carries on-chain.

### Transactions and the block explorer

Transaction hashes, blocks and addresses become links only when
`PUBLIC_CHAIN_EXPLORER_URL` names an explorer. A private chain has none unless
someone runs one, and a local anvil has none at all, so this is configuration
rather than an assumption. Blockscout and Etherscan share the `/tx/`, `/block/`
and `/address/` path shapes, so one setting covers either. With it unset the
values render as plain text, the page says why, and the full hash sits in the
hover title so it can still be copied for `cast tx`.

### Is the tokenizer running?

Nothing on the status page answered this, and the chain mirror is not a proxy
for it. The two services run in opposite directions: the tokenizer reads OBP and
mints on chain, the mirror reads the chain and writes back to OBP. If the
tokenizer stopped, the chain would simply stop gaining tokens and the mirror
would carry on reporting a perfectly steady connection.

The tokenizer also never writes to OBP. That is a stated design rule in its own
docs, not an oversight: you create the entities, it reacts. So it cannot report
on itself through the registry without breaking that rule.

So `/status` shows a **tokenization backlog** instead: registry records that
qualify for tokenization, against those mirrored back from the chain. It
measures the outcome rather than the process, which catches the failure a
liveness ping would miss. A tokenizer that is running but failing every mint
shows green on a heartbeat and a growing backlog here.

What counts as "should be tokenized" differs per type, and each rule is shown in
the table rather than hidden in code:

| Type | Rule |
|---|---|
| Parcels | Verified `parcel_owner_verification` |
| Activities | Verified `activity_verification` |
| Certificates | Every certificate of compliance |
| Credit batches | One per positive benefit amount on a verified `activity_monitoring_period_verification` |

Every rule is read from the tokenizer's source rather than inferred. An earlier
version of this page guessed at two of them and got one wrong and one missing:
the activity rule turned out to be correct but was labelled an assumption, and
credit batches were absent entirely. Credit batches are keyed on chain by the
activity's NFT token id, so a batch whose activity is not yet tokenized shows as
pending and says it is waiting on the ActivityNFT, which is the real dependency:
the tokenizer defers it for exactly that reason.

Two deliberate choices:

- **It is not folded into the health summary.** A backlog is a measurement, not
  a health state. A single snapshot cannot tell a queue being worked through
  from one that is stuck, so forcing it into healthy or unhealthy would either
  cry wolf on normal lag or hide a genuinely stalled tokenizer. The page says
  plainly that a backlog which stays put, or grows between reloads, is the
  signal to act on.
- **Records on chain that the registry does not expect are listed separately.**
  That is not a backlog, but it is worth seeing.

### Tokenizer liveness

The backlog answers "is it keeping up". It cannot answer "is it alive", because
a backlog of zero on a dead tokenizer with no new work looks like success. The
tokenizer now answers that itself over HTTP, at `GET /healthz`, which keeps the
never-writes-to-OBP rule intact and fills in the readiness and liveness probes
its deployment previously lacked.

Set `TOKENIZER_HEALTH_URL` in the app and it joins `/status` through the
existing health-check registry, polled on a timer with no credentials needed.
Left unset it is simply not monitored rather than permanently unhealthy.

It reports more than process liveness: `degraded` when the last poll of OBP
failed, and `stalled` when the poll loop has stopped ticking for more than three
intervals. Both are cases where the process is alive but not working, which a
bare port check would call healthy.

### On the status page

`/status` lists the mirror alongside OBP, Redis and the OIDC providers. It
cannot be polled in the background like the others, because reading the status
record needs OBP credentials that only a request carries, so it is evaluated per
request and omitted entirely for logged-out visitors, with a note explaining
why. Adding an always-unknown entry would drag the whole page's overall status
to unknown while telling nobody anything.

A degraded mirror is reported as unhealthy rather than healthy. A run that
failed to write some records is not doing its job, and a status page that called
that healthy would hide the thing it exists to surface.

### Resolved while building

- **Where staleness is decided.** In the app, but parameterised by
  `interval_seconds` from the record, so it is not hardcoded.
- **One record per chain.** Keyed `chain-<chain_id>`. Per-contract-set was not
  worth the complexity until a deployment is actually replaced under a stable
  chain id.
- **Chain down versus cache down.** Still not fully distinguishable, since the
  app only sees OBP. `run_status` covers the case where the chain was readable
  but writes failed. A chain that is entirely unreachable shows up as a stalled
  heartbeat, which is the right user-facing answer even though the cause differs.

---

## 5. Status

| Piece | State |
|---|---|
| Cache mirrors all five contract types | Done, verified against a local chain |
| Local deploy and seed fixture | Done, verified |
| Dev env terminals for chain and cache | Done, verified |
| Local OBP credentials for the cache | Done, verified: all five entities mirror with no errors |
| `chain_sync_status` entity | Done, verified writing and upserting |
| Heartbeat UI in the app | Done: landing page indicator and `/chain` page |
