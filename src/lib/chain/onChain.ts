/**
 * Reads of the chain mirror that OGCR-chain-cache maintains in OBP.
 *
 * Everything here is read-only. The registry owns these records and the app must
 * never write them: they are a mirror of the chain, and the chain is the truth.
 */

import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_CHAIN_SYNC_STATUS,
	ENTITY_PARCEL_ON_CHAIN,
	ENTITY_ACTIVITY_ON_CHAIN,
	ENTITY_CERTIFICATION_ON_CHAIN,
	ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	ENTITY_ACTIVITY_VERIFICATION,
	ENTITY_CERTIFICATE_OF_COMPLIANCE,
	ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION,
	entityPath
} from '$lib/constants/entities';
import type { ChainSyncStatus } from '$lib/chain/heartbeat';
import { diffIds, summarizeBacklog, type Backlog } from '$lib/chain/backlog';

/** One mirrored token, flattened to what a "recent activity" row needs. */
export interface ChainEvent {
	/** Which mirror it came from, e.g. "Parcel", "Credit Batch". */
	kind: string;
	/** The token's own id on its contract. */
	tokenId: number | null;
	/** Human-facing identifier: the registry id this token is keyed to. */
	label: string;
	blockNumber: number | null;
	txHash: string | null;
	/** Current holder of the token, when the mirror records one. */
	ownerAddress: string | null;
	/** A page inside this app, when one exists for this record. */
	href: string | null;
	/**
	 * The registry URL stored on-chain, used when the app has no page of its own.
	 * This is the link the token itself carries back to OBP, so it is the most
	 * faithful "what does this identifier refer to" answer available.
	 */
	registryUrl: string | null;
}

async function listEntity(entity: string, accessToken: string): Promise<Record<string, any>[]> {
	const response = await obp_requests.get(entityPath(entity), accessToken);
	return (response[`${entity}_list`] ?? []) as Record<string, any>[];
}

/**
 * The single sync status record for the chain, or null when the mirror has never
 * run. There is one record per chain; if several ever appear, the most recently
 * synced one wins.
 */
export async function getChainSyncStatus(accessToken: string): Promise<ChainSyncStatus | null> {
	const rows = (await listEntity(ENTITY_CHAIN_SYNC_STATUS, accessToken)) as ChainSyncStatus[];
	if (rows.length === 0) return null;
	return rows.reduce((newest, row) =>
		(row.synced_at ?? '') > (newest.synced_at ?? '') ? row : newest
	);
}

function toNumber(v: unknown): number | null {
	const n = typeof v === 'string' ? Number(v) : (v as number);
	return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function activityHref(activityId: string | null | undefined): string | null {
	return activityId ? `/activities/${encodeURIComponent(activityId)}` : null;
}

/**
 * Recent chain activity: the newest mirrored tokens across the mirrors, newest
 * block first.
 *
 * This is the secondary signal, not the heartbeat. A short list here with an old
 * newest block is a perfectly healthy quiet chain, which is exactly why
 * freshness is read from the sync status instead.
 */
export async function getRecentChainEvents(
	accessToken: string,
	limit = 10
): Promise<ChainEvent[]> {
	// Fetched together because credit batches reference their activity by NFT
	// token id, and turning that into a link needs the activity mirror to
	// resolve the id back to a registry activity_id.
	const [parcels, activities, certifications, batches] = await Promise.all([
		listEntity(ENTITY_PARCEL_ON_CHAIN, accessToken).catch(() => []),
		listEntity(ENTITY_ACTIVITY_ON_CHAIN, accessToken).catch(() => []),
		listEntity(ENTITY_CERTIFICATION_ON_CHAIN, accessToken).catch(() => []),
		listEntity(ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN, accessToken).catch(() => [])
	]);

	const activityIdByToken = new Map<number, string>();
	for (const a of activities) {
		const token = toNumber(a.token_id);
		if (token !== null && a.activity_id) activityIdByToken.set(token, a.activity_id);
	}

	const events: ChainEvent[] = [];

	for (const b of batches) {
		const activityId = activityIdByToken.get(toNumber(b.activity_nft_id) ?? -1) ?? null;
		events.push({
			kind: 'Credit Batch',
			tokenId: toNumber(b.token_id),
			label: b.credit_type || b.batch_key || '',
			blockNumber: toNumber(b.block_number),
			txHash: b.tx_hash ?? null,
			ownerAddress: b.owner_address ?? null,
			// A batch has no page of its own, but it belongs to an activity that
			// does, which is the more useful destination anyway.
			href: activityHref(activityId),
			registryUrl: b.certification_url || b.activity_url || null
		});
	}

	for (const c of certifications) {
		events.push({
			kind: 'Certification',
			tokenId: toNumber(c.token_id),
			label: c.certification_of_compliance_id ?? '',
			blockNumber: toNumber(c.block_number),
			txHash: c.tx_hash ?? null,
			ownerAddress: c.owner_address ?? null,
			href: activityHref(activityIdByToken.get(toNumber(c.activity_nft_id) ?? -1) ?? null),
			registryUrl: c.certification_url || null
		});
	}

	for (const a of activities) {
		events.push({
			kind: 'Activity',
			tokenId: toNumber(a.token_id),
			label: a.name || a.activity_id || '',
			blockNumber: toNumber(a.block_number),
			txHash: a.tx_hash ?? null,
			ownerAddress: a.owner_address ?? null,
			href: activityHref(a.activity_id),
			registryUrl: a.activity_url || null
		});
	}

	for (const p of parcels) {
		events.push({
			kind: 'Parcel',
			tokenId: toNumber(p.token_id),
			label: p.parcel_id ?? '',
			blockNumber: toNumber(p.block_number),
			txHash: p.tx_hash ?? null,
			ownerAddress: p.owner_address ?? null,
			// No parcel page in the app yet, so the on-chain registry URL is the
			// only honest destination.
			href: null,
			registryUrl: p.parcel_uri || null
		});
	}

	events.sort((a, b) => (b.blockNumber ?? -1) - (a.blockNumber ?? -1));
	return events.slice(0, limit);
}

/** The four benefit fields a monitoring verification can carry, and the credit
 * type each one mints as. Taken from the tokenizer's own CreditAmounts(): a
 * batch is minted per field with a positive amount, so these names are the
 * credit types that appear on chain. */
const CREDIT_BENEFIT_FIELDS: Array<[field: string, creditType: string]> = [
	['permanent_net_carbon_removal_benefit', 'permanent_net_carbon_removal_benefit'],
	[
		'carbon_farming_temporary_net_carbon_removal_benefit',
		'carbon_farming_temporary_net_carbon_removal_benefit'
	],
	[
		'carbon_farming_net_soil_emission_reduction_benefit',
		'carbon_farming_net_soil_emission_reduction_benefit'
	],
	[
		'carbon_storage_temporary_net_carbon_removal_benefit',
		'carbon_storage_temporary_net_carbon_removal_benefit'
	]
];

/**
 * How much of the registry is still waiting to be tokenized.
 *
 * Every rule below is read from the tokenizer's source, not inferred, and each
 * is stated in the result so it is visible rather than buried here:
 *
 * - **Parcels** from `parcel_owner_verification` with `status_code` of
 *   `verified`.
 * - **Activities** from `activity_verification` with the same status.
 * - **Certificates** have no further gate: a certificate of compliance is
 *   itself the verification, so every one is expected on chain.
 * - **Credit batches** from `activity_monitoring_period_verification` with the
 *   same status, one batch per benefit field carrying a positive amount.
 */
export async function getTokenizationBacklog(accessToken: string): Promise<Backlog> {
	const [
		parcelVerifs,
		activityVerifs,
		certificates,
		monitoringVerifs,
		parcelsOnChain,
		activitiesOnChain,
		certsOnChain,
		batchesOnChain
	] = await Promise.all([
		listEntity(ENTITY_PARCEL_OWNERSHIP_VERIFICATION, accessToken),
		listEntity(ENTITY_ACTIVITY_VERIFICATION, accessToken),
		listEntity(ENTITY_CERTIFICATE_OF_COMPLIANCE, accessToken),
		listEntity(ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION, accessToken),
		listEntity(ENTITY_PARCEL_ON_CHAIN, accessToken),
		listEntity(ENTITY_ACTIVITY_ON_CHAIN, accessToken),
		listEntity(ENTITY_CERTIFICATION_ON_CHAIN, accessToken),
		listEntity(ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN, accessToken)
	]);

	const verified = (rows: Record<string, any>[], idField: string) =>
		rows.filter((r) => r.status_code === 'verified').map((r) => r[idField] as string);

	// A batch is keyed on chain by the activity's NFT token id, not its registry
	// id, so the expected keys can only be built for activities already
	// tokenized. That dependency is real: the tokenizer defers a batch until the
	// ActivityNFT exists, so an untokenized activity blocks its batches too.
	const activityTokenById = new Map<string, number>();
	for (const a of activitiesOnChain) {
		const token = toNumber(a.token_id);
		if (token !== null && a.activity_id) activityTokenById.set(a.activity_id, token);
	}

	const expectedBatchKeys: string[] = [];
	for (const mv of monitoringVerifs) {
		if (mv.status_code !== 'verified') continue;
		const activityId = mv.activity_id as string;
		for (const [field, creditType] of CREDIT_BENEFIT_FIELDS) {
			if ((toNumber(mv[field]) ?? 0) <= 0) continue;
			const token = activityTokenById.get(activityId);
			expectedBatchKeys.push(
				token === undefined
					? `${activityId}:${creditType} (awaiting ActivityNFT)`
					: `${token}:${creditType}`
			);
		}
	}

	return summarizeBacklog([
		diffIds(
			'Parcels',
			'Parcels with a verified ownership verification',
			verified(parcelVerifs, 'parcel_id'),
			parcelsOnChain.map((r) => r.parcel_id as string)
		),
		diffIds(
			'Activities',
			'Activities with a verified activity verification',
			verified(activityVerifs, 'activity_id'),
			activitiesOnChain.map((r) => r.activity_id as string)
		),
		diffIds(
			'Certificates',
			'Every certificate of compliance',
			certificates.map((r) => r.certificate_of_compliance_id as string),
			certsOnChain.map((r) => r.certification_of_compliance_id as string)
		),
		diffIds(
			'Credit batches',
			'One per positive benefit amount on a verified monitoring period verification',
			expectedBatchKeys,
			batchesOnChain.map((r) => r.batch_key as string)
		)
	]);
}
