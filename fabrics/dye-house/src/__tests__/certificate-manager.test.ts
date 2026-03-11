/**
 * Tests for Certificate Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCertificateManager,
  registerCertificate,
  revokeCertificate,
  getCertificate,
  getCertificateByDomain,
  checkExpiry,
  checkAllExpiries,
  getExpiryAlerts,
  scheduleRenewal,
  recordRenewal,
  getRenewalHistory,
  getPendingRenewals,
  getDomainCoverage,
  getAllDomainCoverages,
  getCertReport,
  getCertificatesByStatus,
  listAllCertificates,
  clearAlert,
  clearAllAlerts,
  getAlertCount,
  getCertificateCount,
  getRenewalCount,
  type CertManagerState,
  type ClockPort,
  type IdPort,
  type LogPort,
  type CertificateStatus,
} from '../certificate-manager.js';

// ============================================================================
// Test Ports
// ============================================================================

function createTestClock(): ClockPort {
  let currentMicros = 1_000_000_000_000n;
  return {
    nowMicros: () => {
      currentMicros = currentMicros + 1000n;
      return currentMicros;
    },
  };
}

function createTestId(): IdPort {
  let counter = 0;
  return {
    generate: () => {
      counter++;
      return 'cert-' + String(counter);
    },
  };
}

function createTestLog(): LogPort {
  const logs: Array<string> = [];
  return {
    info: (msg: string) => logs.push('INFO: ' + msg),
    warn: (msg: string) => logs.push('WARN: ' + msg),
    error: (msg: string) => logs.push('ERROR: ' + msg),
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

function daysToMicros(days: number): bigint {
  return BigInt(days) * 86400n * 1_000_000n;
}

// ============================================================================
// Test Setup
// ============================================================================

describe('Certificate Manager', () => {
  let state: CertManagerState;
  let clock: ClockPort;
  let id: IdPort;
  let log: LogPort;

  beforeEach(() => {
    clock = createTestClock();
    id = createTestId();
    log = createTestLog();
    state = createCertificateManager(clock, id, log, 30, 7, 60);
  });

  // ============================================================================
  // Certificate Registration
  // ============================================================================

  describe('registerCertificate', () => {
    it('should register a new certificate', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fingerprint-abc',
      );

      expect(result).not.toBe('certificate-exists');
      if (typeof result !== 'string') {
        expect(result.domain).toBe('example.com');
        expect(result.issuer).toBe('LetsEncrypt');
      }
    });

    it('should return certificate-exists for duplicate fingerprint', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fingerprint-abc',
      );
      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-456',
        expiry,
        'fingerprint-abc',
      );

      expect(result).toBe('certificate-exists');
    });

    it('should set status to VALID for far future expiry', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(365);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );
      if (typeof result !== 'string') {
        expect(result.status).toBe('VALID');
      }
    });

    it('should set status to EXPIRING_SOON for near expiry', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );
      if (typeof result !== 'string') {
        expect(result.status).toBe('EXPIRING_SOON');
      }
    });

    it('should set status to CRITICAL for very near expiry', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );
      if (typeof result !== 'string') {
        expect(result.status).toBe('CRITICAL');
      }
    });

    it('should set status to EXPIRED for past expiry', () => {
      const now = clock.nowMicros();
      const expiry = now - daysToMicros(1);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );
      if (typeof result !== 'string') {
        expect(result.status).toBe('EXPIRED');
      }
    });

    it('should track issued timestamp', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );
      if (typeof result !== 'string') {
        expect(result.issuedAtMicros).toBeGreaterThan(0n);
      }
    });

    it('should initialize renewalScheduled as false', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      const result = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );
      if (typeof result !== 'string') {
        expect(result.renewalScheduled).toBe(false);
      }
    });

    it('should allow same domain with different fingerprints', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      const r1 = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      const r2 = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-2',
        expiry,
        'fp-2',
      );

      expect(r1).not.toBe('certificate-exists');
      expect(r2).not.toBe('certificate-exists');
    });
  });

  describe('revokeCertificate', () => {
    it('should return certificate-not-found for unknown certificate', () => {
      const result = revokeCertificate(state, 'unknown');
      expect(result).toBe('certificate-not-found');
    });

    it('should revoke a certificate', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = revokeCertificate(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.status).toBe('REVOKED');
        }
      }
    });
  });

  describe('getCertificate', () => {
    it('should return not-found for unknown certificate', () => {
      const result = getCertificate(state, 'unknown');
      expect(result).toBe('not-found');
    });

    it('should return certificate by ID', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = getCertificate(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.id).toBe(cert.id);
        }
      }
    });
  });

  describe('getCertificateByDomain', () => {
    it('should return empty array for unknown domain', () => {
      const certs = getCertificateByDomain(state, 'unknown.com');
      expect(certs).toEqual([]);
    });

    it('should return all certificates for a domain', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const certs = getCertificateByDomain(state, 'example.com');
      expect(certs.length).toBe(2);
    });

    it('should only return certificates for specified domain', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'other.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const certs = getCertificateByDomain(state, 'example.com');
      expect(certs.length).toBe(1);
    });
  });

  // ============================================================================
  // Expiry Checking
  // ============================================================================

  describe('checkExpiry', () => {
    it('should return certificate-not-found for unknown certificate', () => {
      const result = checkExpiry(state, 'unknown');
      expect(result).toBe('certificate-not-found');
    });

    it('should return no-alert-needed for valid certificate', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(365);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = checkExpiry(state, cert.id);
        expect(result).toBe('no-alert-needed');
      }
    });

    it('should return no-alert-needed for revoked certificate', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        revokeCertificate(state, cert.id);
        const result = checkExpiry(state, cert.id);
        expect(result).toBe('no-alert-needed');
      }
    });

    it('should create INFO alert for info threshold', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(50);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = checkExpiry(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.level).toBe('INFO');
        }
      }
    });

    it('should create WARNING alert for warning threshold', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = checkExpiry(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.level).toBe('WARNING');
        }
      }
    });

    it('should create CRITICAL alert for critical threshold', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = checkExpiry(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.level).toBe('CRITICAL');
        }
      }
    });

    it('should calculate days remaining', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = checkExpiry(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.daysRemaining).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('checkAllExpiries', () => {
    it('should return empty array when no certificates', () => {
      const alerts = checkAllExpiries(state);
      expect(alerts).toEqual([]);
    });

    it('should check all certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      registerCertificate(state, 'example1.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example2.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const alerts = checkAllExpiries(state);
      expect(alerts.length).toBe(2);
    });

    it('should only create alerts for expiring certificates', () => {
      const now = clock.nowMicros();
      const farExpiry = now + daysToMicros(365);
      const nearExpiry = now + daysToMicros(5);

      registerCertificate(state, 'example1.com', 'LetsEncrypt', 'serial-1', farExpiry, 'fp-1');
      registerCertificate(state, 'example2.com', 'LetsEncrypt', 'serial-2', nearExpiry, 'fp-2');

      const alerts = checkAllExpiries(state);
      expect(alerts.length).toBe(1);
    });
  });

  describe('getExpiryAlerts', () => {
    beforeEach(() => {
      const now = clock.nowMicros();
      const criticalExpiry = now + daysToMicros(5);
      const warningExpiry = now + daysToMicros(20);

      const cert1 = registerCertificate(
        state,
        'example1.com',
        'LetsEncrypt',
        'serial-1',
        criticalExpiry,
        'fp-1',
      );
      const cert2 = registerCertificate(
        state,
        'example2.com',
        'LetsEncrypt',
        'serial-2',
        warningExpiry,
        'fp-2',
      );

      if (typeof cert1 !== 'string') {
        checkExpiry(state, cert1.id);
      }
      if (typeof cert2 !== 'string') {
        checkExpiry(state, cert2.id);
      }
    });

    it('should return all alerts when no level specified', () => {
      const alerts = getExpiryAlerts(state);
      expect(alerts.length).toBe(2);
    });

    it('should filter by CRITICAL level', () => {
      const alerts = getExpiryAlerts(state, 'CRITICAL');
      expect(alerts.length).toBe(1);
    });

    it('should filter by WARNING level', () => {
      const alerts = getExpiryAlerts(state, 'WARNING');
      expect(alerts.length).toBe(1);
    });

    it('should filter by INFO level', () => {
      const alerts = getExpiryAlerts(state, 'INFO');
      expect(alerts.length).toBe(0);
    });
  });

  // ============================================================================
  // Renewal Management
  // ============================================================================

  describe('scheduleRenewal', () => {
    it('should return certificate-not-found for unknown certificate', () => {
      const result = scheduleRenewal(state, 'unknown');
      expect(result).toBe('certificate-not-found');
    });

    it('should schedule renewal', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = scheduleRenewal(state, cert.id);
        if (typeof result !== 'string') {
          expect(result.renewalScheduled).toBe(true);
        }
      }
    });
  });

  describe('recordRenewal', () => {
    it('should return certificate-not-found for unknown certificate', () => {
      const now = clock.nowMicros();
      const newExpiry = now + daysToMicros(90);
      const result = recordRenewal(state, 'unknown', newExpiry, 'new-fp');
      expect(result).toBe('certificate-not-found');
    });

    it('should record renewal', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        oldExpiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const result = recordRenewal(state, cert.id, newExpiry, 'new-fp');
        if (typeof result !== 'string') {
          expect(result.domain).toBe('example.com');
          expect(result.oldExpiryMicros).toBe(oldExpiry);
          expect(result.newExpiryMicros).toBe(newExpiry);
        }
      }
    });

    it('should update certificate expiry', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        oldExpiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        recordRenewal(state, cert.id, newExpiry, 'new-fp');
        const updated = getCertificate(state, cert.id);
        if (typeof updated !== 'string') {
          expect(updated.expiresAtMicros).toBe(newExpiry);
        }
      }
    });

    it('should update certificate fingerprint', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        oldExpiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        recordRenewal(state, cert.id, newExpiry, 'new-fp');
        const updated = getCertificate(state, cert.id);
        if (typeof updated !== 'string') {
          expect(updated.fingerprint).toBe('new-fp');
        }
      }
    });

    it('should clear renewalScheduled flag', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        oldExpiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        scheduleRenewal(state, cert.id);
        recordRenewal(state, cert.id, newExpiry, 'new-fp');
        const updated = getCertificate(state, cert.id);
        if (typeof updated !== 'string') {
          expect(updated.renewalScheduled).toBe(false);
        }
      }
    });

    it('should update certificate status', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(5);
      const newExpiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        oldExpiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        recordRenewal(state, cert.id, newExpiry, 'new-fp');
        const updated = getCertificate(state, cert.id);
        if (typeof updated !== 'string') {
          expect(updated.status).toBe('VALID');
        }
      }
    });
  });

  describe('getRenewalHistory', () => {
    it('should return empty array when no renewals', () => {
      const history = getRenewalHistory(state);
      expect(history).toEqual([]);
    });

    it('should return all renewals', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert1 = registerCertificate(
        state,
        'example1.com',
        'LetsEncrypt',
        'serial-1',
        oldExpiry,
        'fp-1',
      );
      const cert2 = registerCertificate(
        state,
        'example2.com',
        'LetsEncrypt',
        'serial-2',
        oldExpiry,
        'fp-2',
      );

      if (typeof cert1 !== 'string') {
        recordRenewal(state, cert1.id, newExpiry, 'new-fp-1');
      }
      if (typeof cert2 !== 'string') {
        recordRenewal(state, cert2.id, newExpiry, 'new-fp-2');
      }

      const history = getRenewalHistory(state);
      expect(history.length).toBe(2);
    });

    it('should filter by domain', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert1 = registerCertificate(
        state,
        'example1.com',
        'LetsEncrypt',
        'serial-1',
        oldExpiry,
        'fp-1',
      );
      const cert2 = registerCertificate(
        state,
        'example2.com',
        'LetsEncrypt',
        'serial-2',
        oldExpiry,
        'fp-2',
      );

      if (typeof cert1 !== 'string') {
        recordRenewal(state, cert1.id, newExpiry, 'new-fp-1');
      }
      if (typeof cert2 !== 'string') {
        recordRenewal(state, cert2.id, newExpiry, 'new-fp-2');
      }

      const history = getRenewalHistory(state, 'example1.com');
      expect(history.length).toBe(1);
    });
  });

  describe('getPendingRenewals', () => {
    it('should return empty array when no pending renewals', () => {
      const pending = getPendingRenewals(state);
      expect(pending).toEqual([]);
    });

    it('should return all pending renewals', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);

      const cert1 = registerCertificate(
        state,
        'example1.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      const cert2 = registerCertificate(
        state,
        'example2.com',
        'LetsEncrypt',
        'serial-2',
        expiry,
        'fp-2',
      );

      if (typeof cert1 !== 'string') {
        scheduleRenewal(state, cert1.id);
      }
      if (typeof cert2 !== 'string') {
        scheduleRenewal(state, cert2.id);
      }

      const pending = getPendingRenewals(state);
      expect(pending.length).toBe(2);
    });

    it('should not include completed renewals', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-123',
        oldExpiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        scheduleRenewal(state, cert.id);
        recordRenewal(state, cert.id, newExpiry, 'new-fp');
      }

      const pending = getPendingRenewals(state);
      expect(pending.length).toBe(0);
    });
  });

  // ============================================================================
  // Domain Coverage
  // ============================================================================

  describe('getDomainCoverage', () => {
    it('should return zero counts for unknown domain', () => {
      const coverage = getDomainCoverage(state, 'unknown.com');
      expect(coverage.certificateCount).toBe(0);
    });

    it('should count total certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const coverage = getDomainCoverage(state, 'example.com');
      expect(coverage.certificateCount).toBe(2);
    });

    it('should count valid certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(365);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const coverage = getDomainCoverage(state, 'example.com');
      expect(coverage.validCount).toBe(1);
    });

    it('should count expiring soon certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const coverage = getDomainCoverage(state, 'example.com');
      expect(coverage.expiringSoonCount).toBe(1);
    });

    it('should count critical certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const coverage = getDomainCoverage(state, 'example.com');
      expect(coverage.criticalCount).toBe(1);
    });

    it('should count expired certificates', () => {
      const now = clock.nowMicros();
      const expiry = now - daysToMicros(1);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const coverage = getDomainCoverage(state, 'example.com');
      expect(coverage.expiredCount).toBe(1);
    });

    it('should count revoked certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      if (typeof cert !== 'string') {
        revokeCertificate(state, cert.id);
      }

      const coverage = getDomainCoverage(state, 'example.com');
      expect(coverage.revokedCount).toBe(1);
    });
  });

  describe('getAllDomainCoverages', () => {
    it('should return empty array when no domains', () => {
      const coverages = getAllDomainCoverages(state);
      expect(coverages).toEqual([]);
    });

    it('should return coverage for all domains', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example1.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example2.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const coverages = getAllDomainCoverages(state);
      expect(coverages.length).toBe(2);
    });
  });

  // ============================================================================
  // Reports
  // ============================================================================

  describe('getCertReport', () => {
    it('should report zero stats for empty manager', () => {
      const report = getCertReport(state);
      expect(report.totalCertificates).toBe(0);
      expect(report.validCount).toBe(0);
      expect(report.expiringSoonCount).toBe(0);
      expect(report.criticalCount).toBe(0);
      expect(report.expiredCount).toBe(0);
      expect(report.revokedCount).toBe(0);
    });

    it('should count total certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example1.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example2.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const report = getCertReport(state);
      expect(report.totalCertificates).toBe(2);
    });

    it('should count valid certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(365);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const report = getCertReport(state);
      expect(report.validCount).toBe(1);
    });

    it('should count expiring soon certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const report = getCertReport(state);
      expect(report.expiringSoonCount).toBe(1);
    });

    it('should count critical certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const report = getCertReport(state);
      expect(report.criticalCount).toBe(1);
    });

    it('should count expired certificates', () => {
      const now = clock.nowMicros();
      const expiry = now - daysToMicros(1);

      registerCertificate(state, 'example.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');

      const report = getCertReport(state);
      expect(report.expiredCount).toBe(1);
    });

    it('should count revoked certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      if (typeof cert !== 'string') {
        revokeCertificate(state, cert.id);
      }

      const report = getCertReport(state);
      expect(report.revokedCount).toBe(1);
    });

    it('should count pending renewals', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(20);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      if (typeof cert !== 'string') {
        scheduleRenewal(state, cert.id);
      }

      const report = getCertReport(state);
      expect(report.renewalsPending).toBe(1);
    });

    it('should count alerts', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      if (typeof cert !== 'string') {
        checkExpiry(state, cert.id);
      }

      const report = getCertReport(state);
      expect(report.alertCount).toBe(1);
    });
  });

  describe('getCertificatesByStatus', () => {
    beforeEach(() => {
      const now = clock.nowMicros();
      registerCertificate(
        state,
        'valid.com',
        'LetsEncrypt',
        'serial-1',
        now + daysToMicros(365),
        'fp-1',
      );
      registerCertificate(
        state,
        'expiring.com',
        'LetsEncrypt',
        'serial-2',
        now + daysToMicros(20),
        'fp-2',
      );
      registerCertificate(
        state,
        'critical.com',
        'LetsEncrypt',
        'serial-3',
        now + daysToMicros(5),
        'fp-3',
      );
      registerCertificate(
        state,
        'expired.com',
        'LetsEncrypt',
        'serial-4',
        now - daysToMicros(1),
        'fp-4',
      );
    });

    it('should return VALID certificates', () => {
      const certs = getCertificatesByStatus(state, 'VALID');
      expect(certs.length).toBe(1);
    });

    it('should return EXPIRING_SOON certificates', () => {
      const certs = getCertificatesByStatus(state, 'EXPIRING_SOON');
      expect(certs.length).toBe(1);
    });

    it('should return CRITICAL certificates', () => {
      const certs = getCertificatesByStatus(state, 'CRITICAL');
      expect(certs.length).toBe(1);
    });

    it('should return EXPIRED certificates', () => {
      const certs = getCertificatesByStatus(state, 'EXPIRED');
      expect(certs.length).toBe(1);
    });

    it('should return REVOKED certificates', () => {
      const certs = getCertificatesByStatus(state, 'REVOKED');
      expect(certs.length).toBe(0);
    });
  });

  describe('listAllCertificates', () => {
    it('should return empty array when no certificates', () => {
      const certs = listAllCertificates(state);
      expect(certs).toEqual([]);
    });

    it('should return all certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example1.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example2.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      const certs = listAllCertificates(state);
      expect(certs.length).toBe(2);
    });
  });

  // ============================================================================
  // Alert Management
  // ============================================================================

  describe('clearAlert', () => {
    it('should return false for unknown alert', () => {
      const result = clearAlert(state, 'unknown');
      expect(result).toBe(false);
    });

    it('should clear an alert', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);
      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );

      if (typeof cert !== 'string') {
        const alert = checkExpiry(state, cert.id);
        if (typeof alert !== 'string') {
          const result = clearAlert(state, alert.alertId);
          expect(result).toBe(true);
        }
      }
    });
  });

  describe('clearAllAlerts', () => {
    it('should clear all alerts', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      const cert1 = registerCertificate(
        state,
        'example1.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      const cert2 = registerCertificate(
        state,
        'example2.com',
        'LetsEncrypt',
        'serial-2',
        expiry,
        'fp-2',
      );

      if (typeof cert1 !== 'string') {
        checkExpiry(state, cert1.id);
      }
      if (typeof cert2 !== 'string') {
        checkExpiry(state, cert2.id);
      }

      clearAllAlerts(state);
      expect(getAlertCount(state)).toBe(0);
    });
  });

  describe('getAlertCount', () => {
    it('should return zero when no alerts', () => {
      expect(getAlertCount(state)).toBe(0);
    });

    it('should count alerts', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(5);

      const cert = registerCertificate(
        state,
        'example.com',
        'LetsEncrypt',
        'serial-1',
        expiry,
        'fp-1',
      );
      if (typeof cert !== 'string') {
        checkExpiry(state, cert.id);
      }

      expect(getAlertCount(state)).toBe(1);
    });
  });

  describe('getCertificateCount', () => {
    it('should return zero when no certificates', () => {
      expect(getCertificateCount(state)).toBe(0);
    });

    it('should count certificates', () => {
      const now = clock.nowMicros();
      const expiry = now + daysToMicros(90);

      registerCertificate(state, 'example1.com', 'LetsEncrypt', 'serial-1', expiry, 'fp-1');
      registerCertificate(state, 'example2.com', 'LetsEncrypt', 'serial-2', expiry, 'fp-2');

      expect(getCertificateCount(state)).toBe(2);
    });
  });

  describe('getRenewalCount', () => {
    it('should return zero when no renewals', () => {
      expect(getRenewalCount(state)).toBe(0);
    });

    it('should count renewals', () => {
      const now = clock.nowMicros();
      const oldExpiry = now + daysToMicros(20);
      const newExpiry = now + daysToMicros(90);

      const cert1 = registerCertificate(
        state,
        'example1.com',
        'LetsEncrypt',
        'serial-1',
        oldExpiry,
        'fp-1',
      );
      const cert2 = registerCertificate(
        state,
        'example2.com',
        'LetsEncrypt',
        'serial-2',
        oldExpiry,
        'fp-2',
      );

      if (typeof cert1 !== 'string') {
        recordRenewal(state, cert1.id, newExpiry, 'new-fp-1');
      }
      if (typeof cert2 !== 'string') {
        recordRenewal(state, cert2.id, newExpiry, 'new-fp-2');
      }

      expect(getRenewalCount(state)).toBe(2);
    });
  });
});
