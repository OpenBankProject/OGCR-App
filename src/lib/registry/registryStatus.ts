/**
 * What the public registry calls a certificate and an activity.
 *
 * Kept free of env imports so pages can use it in the browser.
 *
 * A certificate's status is the certificate_of_compliance.certification_status value as
 * stored, one of:
 *   certified  valid, and credits can be issued from it;
 *   expired    the validity period ended without renewal; nothing is wrong;
 *   suspended  still within its dates, but paused while a problem is resolved; it goes
 *              back to certified once fixed;
 *   pending    not decided yet.
 * The app does not check the dates against today: the stored status is the status. Any
 * other value, including blank, is shown as Pending, so it never counts as certified.
 */

export type CertificateStatus = 'certified' | 'expired' | 'suspended' | 'pending';

const CERTIFICATE_STATUSES: readonly CertificateStatus[] = [
	'certified',
	'expired',
	'suspended',
	'pending'
];

/** A certificate's status from its stored certification_status. */
export function certificateStatus(
	certificationStatus: string | null | undefined
): CertificateStatus {
	const value = certificationStatus?.trim().toLowerCase() ?? '';
	return CERTIFICATE_STATUSES.find((status) => status === value) ?? 'pending';
}

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
	certified: 'Certified',
	expired: 'Expired',
	suspended: 'Suspended',
	pending: 'Pending'
};

export const CERTIFICATE_STATUS_TONES = {
	certified: 'positive',
	expired: 'neutral',
	suspended: 'negative',
	pending: 'progress'
} as const satisfies Record<CertificateStatus, string>;

export type ActivityStatus =
	| 'verified'
	| 'certificate_suspended'
	| 'awaiting_certificate'
	| 'unverified';

/**
 * An activity is Verified only when its verification passed AND it has either a certified
 * certificate or an on-chain mint. A suspended certificate overrides both: the activity
 * is never shown as Verified while its certificate is suspended, even if it was minted.
 * A passed verification with neither is Awaiting certificate; anything else is
 * Unverified.
 */
export function activityStatus(activity: {
	verified: boolean;
	certificateStatus: CertificateStatus | null;
	mintedAt: number | null | undefined;
}): ActivityStatus {
	if (!activity.verified) return 'unverified';
	if (activity.certificateStatus === 'suspended') return 'certificate_suspended';
	const minted = typeof activity.mintedAt === 'number' && Number.isFinite(activity.mintedAt);
	return activity.certificateStatus === 'certified' || minted ? 'verified' : 'awaiting_certificate';
}

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
	verified: 'Verified',
	certificate_suspended: 'Certificate suspended',
	awaiting_certificate: 'Awaiting certificate',
	unverified: 'Unverified'
};

export const ACTIVITY_STATUS_TONES = {
	verified: 'positive',
	certificate_suspended: 'negative',
	awaiting_certificate: 'progress',
	unverified: 'warning'
} as const satisfies Record<ActivityStatus, string>;
