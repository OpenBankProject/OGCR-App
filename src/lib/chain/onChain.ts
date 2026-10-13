/**
 * Reads of the chain mirror that OGCR-chain-cache maintains in OBP.
 *
 * Everything here is read-only. The registry owns these records and the app must
 * never write them: they are a mirror of the chain, and the chain is the truth.
 */

import { env } from '$env/dynamic/public';
import { obp_requests } from '$lib/obp/requests';
import {
	ENTITY_CHAIN_SYNC_STATUS,
	ENTITY_PARCEL_ON_CHAIN,
	ENTITY_ACTIVITY_ON_CHAIN,
	ENTITY_CERTIFICATION_ON_CHAIN,
	ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN,
	ENTITY_CARBON_CREDIT_BALANCE_ON_CHAIN,
	ENTITY_PARCEL_OWNERSHIP_VERIFICATION,
	ENTITY_ACTIVITY_VERIFICATION,
	ENTITY_CERTIFICATE_OF_COMPLIANCE,
	ENTITY_ACTIVITY_MONITORING_PERIOD_VERIFICATION,
	entityPathV7,
	publicEntityPathV7,
	unwrapV7List
} from '$lib/constants/entities';
import type { ChainSyncStatus } from '$lib/chain/heartbeat';
import { certificationBodyHref, certificationSchemeHref } from '$lib/registry/certificationLinks';
import { diffIds, summarizeBacklog, type Backlog } from '$lib/chain/backlog';

/** A link from a token to a record it refers to. `href` is null for a record that is
 *  not public: its id is shown as plain text. */
export interface ChainLink {
	/** What the record is, e.g. "Activity", "Certification body". */
	label: string;
	text: string;
	href: string | null;
	/** True for an OBP URL (raw JSON), false for a page in this app or an anchor on this page. */
	external: boolean;
}

/** One mirrored token, as a row in its type's section. */
export interface ChainToken {
	/** Element id other rows link to, e.g. `activity-token-2`; null for a record with no token id. */
	anchor: string | null;
	/** The token's own id on its contract. */
	tokenId: number | null;
	/** Human-facing name: the record's name, else the registry id the token is keyed to. */
	title: string;
	/** A few facts the token records, beyond its links. */
	details: { label: string; value: string }[];
	/** The records this token refers to: other tokens on this page, and off-chain records. */
	links: ChainLink[];
	/** Current holder of the token (for a balance, the holder of the credits). */
	ownerAddress: string | null;
	blockNumber: number | null;
	txHash: string | null;
	/**
	 * The token's record in OBP's public chain mirror. Not the `*_uri` the token carries
	 * on-chain: that points at the private registry record, which needs a login to read.
	 */
	publicRecordUrl: string | null;
}

export type ChainSectionKey = 'parcel' | 'activity' | 'certification' | 'batch' | 'balance';

/** Every token of one type, newest block first. */
export interface ChainSection {
	key: ChainSectionKey;
	title: string;
	/** The chain the tokens were read from, when the records say. */
	chainId: number | null;
	/** The contract the tokens live on, when the records say. */
	contractAddress: string | null;
	tokens: ChainToken[];
}

async function listEntity(entity: string, accessToken: string): Promise<Record<string, any>[]> {
	const response = await obp_requests.get(entityPathV7(entity), accessToken);
	return unwrapV7List<Record<string, any>>(response, entity);
}

/** Anonymous read of an entity's public records. The chain mirrors and the sync status
 *  all have public access, so the chain page needs no login. */
async function listPublicEntity(entity: string): Promise<Record<string, any>[]> {
	const response = await obp_requests.get(publicEntityPathV7(entity));
	return unwrapV7List<Record<string, any>>(response, entity);
}

/**
 * The single sync status record for the chain, or null when the mirror has never
 * run. There is one record per chain; if several ever appear, the most recently
 * synced one wins.
 */
export async function getChainSyncStatus(): Promise<ChainSyncStatus | null> {
	const rows = (await listPublicEntity(ENTITY_CHAIN_SYNC_STATUS)) as ChainSyncStatus[];
	if (rows.length === 0) return null;
	return rows.reduce((newest, row) =>
		(row.synced_at ?? '') > (newest.synced_at ?? '') ? row : newest
	);
}

function toNumber(v: unknown): number | null {
	const n = typeof v === 'string' ? Number(v) : (v as number);
	return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** An absolute OBP URL for one public record. */
function publicEntityUrl(entity: string, id: string): string {
	const base = env.PUBLIC_OBP_BASE_URL?.replace(/\/$/, '') ?? '';
	return `${base}${publicEntityPathV7(entity)}/${encodeURIComponent(id)}`;
}

/** The public chain mirror record `<entity>/<entity>_id`. */
function publicRecordUrl(entity: string, record: Record<string, any>): string | null {
	const id = record[`${entity}_id`];
	return id ? publicEntityUrl(entity, id) : null;
}

/** The record id at the end of a registry URI the token carries, e.g.
 *  `…/banks/ogcr/operator/op_01` -> `op_01`. Some tokens carry only the URI, not the id. */
export function idFromUri(uri: unknown): string | null {
	if (typeof uri !== 'string' || !uri) return null;
	try {
		const last = new URL(uri).pathname.split('/').filter(Boolean).pop();
		return last ? decodeURIComponent(last) : null;
	} catch {
		return null;
	}
}

/** A base-unit integer string as a decimal, e.g. 6500000000000000000 at 18 decimals -> "6.5". */
export function formatUnits(raw: unknown, decimals: unknown): string | null {
	if (raw === null || raw === undefined || raw === '') return null;
	const places = toNumber(decimals) ?? 0;
	let value: bigint;
	try {
		value = BigInt(String(raw));
	} catch {
		return String(raw);
	}
	const negative = value < 0n;
	if (negative) value = -value;
	const scale = 10n ** BigInt(places);
	const whole = value / scale;
	const fraction = (value % scale).toString().padStart(places, '0').replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** An app page link, or plain text when there is no id. */
function pageLink(label: string, text: unknown, href: string | null): ChainLink | null {
	if (!text) return null;
	return { label, text: String(text), href, external: false };
}

/** A record that is not public: its id, unlinked. */
function textLink(label: string, id: string | null): ChainLink | null {
	return id ? { label, text: id, href: null, external: false } : null;
}

/** A link to another token's row on this page, when that token is on this page. */
function tokenLink(label: string, anchor: string, present: Set<string>, text: string): ChainLink | null {
	return present.has(anchor) ? { label, text, href: `#${anchor}`, external: false } : null;
}

function anchorFor(key: ChainSectionKey, tokenId: unknown): string | null {
	const n = toNumber(tokenId);
	return n === null ? null : `${key}-token-${n}`;
}

const activityPage = (id: unknown) =>
	id ? `/registry/activities/${encodeURIComponent(String(id))}` : null;
const certificatePage = (id: unknown) =>
	id ? `/registry/certificates/${encodeURIComponent(String(id))}` : null;
// Parcels are not public: this page needs a login.
const parcelPage = (id: unknown) => (id ? `/parcels/${encodeURIComponent(String(id))}` : null);
const operatorPage = (id: unknown) =>
	id ? `/registry/operators/${encodeURIComponent(String(id))}` : null;

function compact<T>(items: (T | null)[]): T[] {
	return items.filter((item): item is T => item !== null);
}

function details(pairs: [string, unknown][]): { label: string; value: string }[] {
	return pairs
		.filter(([, value]) => value !== null && value !== undefined && value !== '')
		.map(([label, value]) => ({ label, value: String(value) }));
}

/**
 * Every mirrored token, one section per type, read anonymously from the public chain
 * mirrors. Each token links to the tokens it refers to on this page, and to the
 * off-chain records it refers to: an app page where there is one (public registry pages,
 * and the login-only parcel page), else (for a record that is not public) its id as
 * plain text.
 *
 * A mirror that cannot be read leaves its section empty rather than failing the page.
 */
export async function getChainTokens(): Promise<ChainSection[]> {
	const [parcels, activities, certifications, batches, balances] = await Promise.all([
		listPublicEntity(ENTITY_PARCEL_ON_CHAIN).catch(() => []),
		listPublicEntity(ENTITY_ACTIVITY_ON_CHAIN).catch(() => []),
		listPublicEntity(ENTITY_CERTIFICATION_ON_CHAIN).catch(() => []),
		listPublicEntity(ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN).catch(() => []),
		listPublicEntity(ENTITY_CARBON_CREDIT_BALANCE_ON_CHAIN).catch(() => [])
	]);

	// Which token rows exist, so links only point at rows that are on the page.
	const present = new Set<string>(
		compact([
			...parcels.map((r) => anchorFor('parcel', r.token_id)),
			...activities.map((r) => anchorFor('activity', r.token_id)),
			...batches.map((r) => anchorFor('batch', r.token_id))
		])
	);
	const parcelAnchors = new Map<string, string>();
	for (const r of parcels) {
		const anchor = anchorFor('parcel', r.token_id);
		if (r.parcel_id && anchor) parcelAnchors.set(r.parcel_id, anchor);
	}

	const base = (key: ChainSectionKey, entity: string, r: Record<string, any>) => ({
		anchor: anchorFor(key, r.token_id),
		tokenId: toNumber(r.token_id),
		ownerAddress: r.owner_address ?? null,
		blockNumber: toNumber(r.block_number),
		txHash: r.tx_hash ?? null,
		publicRecordUrl: publicRecordUrl(entity, r)
	});

	const parcelTokens: ChainToken[] = parcels.map((r) => ({
		...base('parcel', ENTITY_PARCEL_ON_CHAIN, r),
		title: r.parcel_id ?? '',
		details: [],
		links: compact([pageLink('Parcel', r.parcel_id, parcelPage(r.parcel_id))])
	}));

	const activityTokens: ChainToken[] = activities.map((r) => {
		const parcelIds = String(r.parcel_ids ?? '')
			.split(/[\s,]+/)
			.filter(Boolean);
		return {
			...base('activity', ENTITY_ACTIVITY_ON_CHAIN, r),
			title: r.name || r.activity_id || '',
			details: details([
				['Type', r.activity_type],
				['Unit types', r.unit_types],
				['Period', r.start_date && r.end_date ? `${r.start_date} – ${r.end_date}` : null]
			]),
			links: compact([
				pageLink('Activity', r.activity_id, activityPage(r.activity_id)),
				pageLink('Operator', r.operator_name || r.operator_id, operatorPage(r.operator_id)),
				pageLink(
					'Certification scheme',
					r.certification_scheme_id,
					certificationSchemeHref(r.certification_scheme_id)
				),
				...parcelIds.flatMap((id) => {
					const anchor = parcelAnchors.get(id);
					return compact([
						pageLink('Parcel', id, parcelPage(id)),
						anchor ? { label: 'Parcel token', text: id, href: `#${anchor}`, external: false } : null
					]);
				})
			])
		};
	});

	const certificationTokens: ChainToken[] = certifications.map((r) => ({
		...base('certification', ENTITY_CERTIFICATION_ON_CHAIN, r),
		title: r.certificate_of_compliance_id ?? '',
		details: details([
			['Status', r.certification_status],
			['Issued', r.issue_date],
			['Expires', r.expiry_date]
		]),
		links: compact([
			pageLink(
				'Certificate',
				r.certificate_of_compliance_id,
				certificatePage(r.certificate_of_compliance_id)
			),
			tokenLink(
				'Activity token',
				`activity-token-${toNumber(r.activity_nft_id)}`,
				present,
				`#${r.activity_nft_id}`
			),
			pageLink('Activity', r.activity_name || r.activity_id, activityPage(r.activity_id)),
			pageLink(
				'Certification scheme',
				r.certification_scheme_name || idFromUri(r.certification_scheme_uri),
				certificationSchemeHref(idFromUri(r.certification_scheme_uri))
			),
			pageLink(
				'Certification body',
				r.certification_body_name || idFromUri(r.certification_body_uri),
				certificationBodyHref(idFromUri(r.certification_body_uri))
			),
			textLink('Audit report', idFromUri(r.audit_report_uri))
		])
	}));

	const batchTokens: ChainToken[] = batches.map((r) => {
		const certificateId = idFromUri(r.certificate_of_compliance_uri);
		const operatorId = idFromUri(r.operator_url);
		const amount = formatUnits(r.amount, r.credit_decimals ?? 18);
		const balance = formatUnits(r.credit_balance, r.credit_decimals ?? 18);
		return {
			...base('batch', ENTITY_CARBON_CREDIT_BATCH_ON_CHAIN, r),
			title: r.batch_name || r.unit_type || r.carbon_credit_batch_id || '',
			details: details([
				['Unit type', r.unit_type],
				['Issued', amount === null ? null : `${amount} tCO₂e`],
				['Balance', balance === null ? null : `${balance} tCO₂e`],
				['Status', r.status_code],
				['Batch account', r.token_bound_account]
			]),
			links: compact([
				tokenLink(
					'Activity token',
					`activity-token-${toNumber(r.activity_nft_id)}`,
					present,
					`#${r.activity_nft_id}`
				),
				pageLink('Activity', r.activity_name || r.activity_id, activityPage(r.activity_id)),
				pageLink('Operator', operatorId, operatorPage(operatorId)),
				pageLink('Certificate', certificateId, certificatePage(certificateId)),
				pageLink(
					'Certification scheme',
					idFromUri(r.certification_scheme_url),
					certificationSchemeHref(idFromUri(r.certification_scheme_url))
				),
				pageLink(
					'Certification body',
					idFromUri(r.certification_body_url),
					certificationBodyHref(idFromUri(r.certification_body_url))
				)
			])
		};
	});

	const balanceTokens: ChainToken[] = balances.map((r) => {
		const amount = formatUnits(r.balance, r.decimals ?? 18);
		return {
			anchor: null,
			tokenId: null,
			title: amount === null ? '' : `${amount} ${r.symbol || 'CC'}`,
			details: details([['Holder', r.holder_type]]),
			links: compact([
				tokenLink('Batch token', `batch-token-${toNumber(r.batch_token_id)}`, present, `#${r.batch_token_id}`)
			]),
			ownerAddress: r.owner_address ?? null,
			blockNumber: toNumber(r.block_number),
			txHash: null,
			publicRecordUrl: publicRecordUrl(ENTITY_CARBON_CREDIT_BALANCE_ON_CHAIN, r)
		};
	});

	const section = (
		key: ChainSectionKey,
		title: string,
		records: Record<string, any>[],
		tokens: ChainToken[]
	): ChainSection => ({
		key,
		title,
		chainId: toNumber(records.find((r) => r.chain_id != null)?.chain_id),
		contractAddress: records.find((r) => r.contract_address)?.contract_address ?? null,
		tokens: [...tokens].sort((a, b) => (b.blockNumber ?? -1) - (a.blockNumber ?? -1))
	});

	return [
		section('parcel', 'Parcels', parcels, parcelTokens),
		section('activity', 'Activities', activities, activityTokens),
		section('certification', 'Certifications', certifications, certificationTokens),
		section('batch', 'Credit batches', batches, batchTokens),
		section('balance', 'Credit balances', balances, balanceTokens)
	];
}

/** The four benefit fields a monitoring verification can carry, and the suffix
 * of the carbon_credit_batch_id each one mints as. Taken from the tokenizer's
 * MonitoringVerification.CreditBatches(): a batch is minted per field with a
 * positive amount, with id `<activity_monitoring_period_verification_id>:<suffix>`. */
const CREDIT_BENEFIT_FIELDS: Array<[field: string, suffix: string]> = [
	['permanent_net_carbon_removal_benefit', 'permanent_removal'],
	['carbon_farming_temporary_net_carbon_removal_benefit', 'carbon_farming_sequestration'],
	['carbon_farming_net_soil_emission_reduction_benefit', 'soil_emission_reduction'],
	['carbon_storage_temporary_net_carbon_removal_benefit', 'carbon_storage_in_product']
];

/**
 * How much of the registry is still waiting to be tokenized.
 *
 * Every rule below is read from the tokenizer's source, not inferred, and each
 * is stated in the result so it is visible rather than buried here:
 *
 * - **Parcels** from `parcel_owner_verification` with `status_code` of
 *   `verified`.
 * - **Activities** from `activity_verification` with the same status, once
 *   the activity also has a `certificate_of_compliance`.
 * - **Certificates** have no further gate: a certificate of compliance is
 *   itself the verification, so every one is expected on chain.
 * - **Credit batches** from `activity_monitoring_period_verification` with the
 *   same status, one batch per benefit field carrying a positive amount, keyed
 *   `<verification id>:<unit suffix>`.
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

	// The tokenizer mints an activity once it has a verified verification and a
	// certificate of compliance.
	const certifiedActivities = new Set(certificates.map((r) => r.activity_id as string));
	const readyActivities = verified(activityVerifs, 'activity_id').filter((id) =>
		certifiedActivities.has(id)
	);

	// A batch is keyed on chain by its carbon_credit_batch_id, which the
	// tokenizer derives from the verification id and the unit type.
	const expectedBatchIds: string[] = [];
	for (const mv of monitoringVerifs) {
		if (mv.status_code !== 'verified') continue;
		const verificationId = mv.activity_monitoring_period_verification_id as string;
		if (!verificationId) continue;
		for (const [field, suffix] of CREDIT_BENEFIT_FIELDS) {
			if ((toNumber(mv[field]) ?? 0) <= 0) continue;
			expectedBatchIds.push(`${verificationId}:${suffix}`);
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
			'Activities with a verified activity verification and a certificate of compliance',
			readyActivities,
			activitiesOnChain.map((r) => r.activity_id as string)
		),
		diffIds(
			'Certificates',
			'Every certificate of compliance',
			certificates.map((r) => r.certificate_of_compliance_id as string),
			certsOnChain.map((r) => r.certificate_of_compliance_id as string)
		),
		diffIds(
			'Credit batches',
			'One per positive benefit amount on a verified monitoring period verification',
			expectedBatchIds,
			batchesOnChain.map((r) => r.carbon_credit_batch_id as string)
		)
	]);
}
