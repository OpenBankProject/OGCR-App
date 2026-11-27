import { describe, expect, it } from 'vitest';
import { activityStatus, certificateStatus } from './registryStatus';

describe('certificateStatus', () => {
	it('maps the four stored values to themselves', () => {
		expect(certificateStatus('certified')).toBe('certified');
		expect(certificateStatus('expired')).toBe('expired');
		expect(certificateStatus('Suspended')).toBe('suspended');
		expect(certificateStatus('pending')).toBe('pending');
	});

	it('shows any other value, including blank and TBD, as Pending', () => {
		expect(certificateStatus('TBD')).toBe('pending');
		expect(certificateStatus('active')).toBe('pending');
		expect(certificateStatus('')).toBe('pending');
		expect(certificateStatus(null)).toBe('pending');
	});
});

describe('activityStatus', () => {
	it('is Unverified without a passed verification', () => {
		expect(activityStatus({ verified: false, certificateStatus: 'certified', mintedAt: 1 })).toBe(
			'unverified'
		);
	});

	it('is Verified with a certified certificate or a mint', () => {
		expect(activityStatus({ verified: true, certificateStatus: 'certified', mintedAt: null })).toBe(
			'verified'
		);
		expect(
			activityStatus({ verified: true, certificateStatus: 'pending', mintedAt: 1791818532 })
		).toBe('verified');
	});

	it('is never Verified while the certificate is suspended, even when minted', () => {
		expect(
			activityStatus({ verified: true, certificateStatus: 'suspended', mintedAt: 1791818532 })
		).toBe('certificate_suspended');
	});

	it('is Awaiting certificate with neither', () => {
		expect(activityStatus({ verified: true, certificateStatus: null, mintedAt: null })).toBe(
			'awaiting_certificate'
		);
		expect(activityStatus({ verified: true, certificateStatus: 'expired', mintedAt: null })).toBe(
			'awaiting_certificate'
		);
	});
});
