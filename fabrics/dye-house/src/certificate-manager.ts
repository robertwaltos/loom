/**
 * Certificate Manager — TLS certificate lifecycle
 * Tracks expiry, schedules renewal, manages certificate coverage
 */

// ============================================================================
// Ports (zero external dependencies)
// ============================================================================

type ClockPort = {
  nowMicros: () => bigint;
};

type IdPort = {
  generate: () => string;
};

type LogPort = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

// ============================================================================
// Types
// ============================================================================

type CertificateStatus = 'VALID' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED' | 'REVOKED';

type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

type Certificate = {
  readonly id: string;
  readonly domain: string;
  readonly issuer: string;
  readonly serialNumber: string;
  readonly issuedAtMicros: bigint;
  readonly expiresAtMicros: bigint;
  readonly status: CertificateStatus;
  readonly fingerprint: string;
  readonly renewalScheduled: boolean;
};

type ExpiryAlert = {
  readonly alertId: string;
  readonly certificateId: string;
  readonly domain: string;
  readonly level: AlertLevel;
  readonly daysRemaining: number;
  readonly expiresAtMicros: bigint;
  readonly createdAtMicros: bigint;
};

type RenewalRecord = {
  readonly recordId: string;
  readonly certificateId: string;
  readonly domain: string;
  readonly oldExpiryMicros: bigint;
  readonly newExpiryMicros: bigint;
  readonly renewedAtMicros: bigint;
  readonly issuer: string;
};

type DomainCoverage = {
  readonly domain: string;
  readonly certificateCount: number;
  readonly validCount: number;
  readonly expiringSoonCount: number;
  readonly criticalCount: number;
  readonly expiredCount: number;
  readonly revokedCount: number;
};

type CertReport = {
  readonly totalCertificates: number;
  readonly validCount: number;
  readonly expiringSoonCount: number;
  readonly criticalCount: number;
  readonly expiredCount: number;
  readonly revokedCount: number;
  readonly renewalsPending: number;
  readonly alertCount: number;
  readonly generatedAtMicros: bigint;
};

// ============================================================================
// State
// ============================================================================

type CertManagerState = {
  readonly clock: ClockPort;
  readonly id: IdPort;
  readonly log: LogPort;
  readonly certificates: Map<string, Certificate>;
  readonly alerts: Map<string, ExpiryAlert>;
  readonly renewals: Array<RenewalRecord>;
  readonly certificatesByDomain: Map<string, Set<string>>;
  readonly warningThresholdDays: number;
  readonly criticalThresholdDays: number;
  readonly infoThresholdDays: number;
};

// ============================================================================
// Factory
// ============================================================================

export function createCertificateManager(
  clock: ClockPort,
  id: IdPort,
  log: LogPort,
  warningDays: number,
  criticalDays: number,
  infoDays: number,
): CertManagerState {
  return {
    clock,
    id,
    log,
    certificates: new Map(),
    alerts: new Map(),
    renewals: [],
    certificatesByDomain: new Map(),
    warningThresholdDays: warningDays,
    criticalThresholdDays: criticalDays,
    infoThresholdDays: infoDays,
  };
}

// ============================================================================
// Certificate Registration
// ============================================================================

export function registerCertificate(
  state: CertManagerState,
  domain: string,
  issuer: string,
  serialNumber: string,
  expiresAtMicros: bigint,
  fingerprint: string,
): Certificate | 'certificate-exists' {
  for (const cert of state.certificates.values()) {
    if (cert.fingerprint === fingerprint) {
      return 'certificate-exists';
    }
  }

  const id = state.id.generate();
  const now = state.clock.nowMicros();
  const status = calculateStatus(state, now, expiresAtMicros, false);

  const certificate: Certificate = {
    id,
    domain,
    issuer,
    serialNumber,
    issuedAtMicros: now,
    expiresAtMicros,
    status,
    fingerprint,
    renewalScheduled: false,
  };

  state.certificates.set(id, certificate);
  addCertificateToDomain(state, domain, id);

  const msg = 'Certificate registered: ' + domain + ' (expires ' + String(expiresAtMicros) + ')';
  state.log.info(msg);
  return certificate;
}

export function revokeCertificate(
  state: CertManagerState,
  certificateId: string,
): Certificate | 'certificate-not-found' {
  const cert = state.certificates.get(certificateId);
  if (!cert) {
    return 'certificate-not-found';
  }

  const updated: Certificate = {
    ...cert,
    status: 'REVOKED',
  };

  state.certificates.set(certificateId, updated);
  const msg = 'Certificate revoked: ' + cert.domain;
  state.log.warn(msg);
  return updated;
}

export function getCertificate(
  state: CertManagerState,
  certificateId: string,
): Certificate | 'not-found' {
  const cert = state.certificates.get(certificateId);
  return cert || 'not-found';
}

export function getCertificateByDomain(
  state: CertManagerState,
  domain: string,
): Array<Certificate> {
  const certIds = state.certificatesByDomain.get(domain);
  if (!certIds) {
    return [];
  }

  const certs: Array<Certificate> = [];
  for (const id of certIds) {
    const cert = state.certificates.get(id);
    if (cert) {
      certs.push(cert);
    }
  }

  return certs;
}

// ============================================================================
// Expiry Checking
// ============================================================================

export function checkExpiry(
  state: CertManagerState,
  certificateId: string,
): ExpiryAlert | 'certificate-not-found' | 'no-alert-needed' {
  const cert = state.certificates.get(certificateId);
  if (!cert) {
    return 'certificate-not-found';
  }

  if (cert.status === 'REVOKED') {
    return 'no-alert-needed';
  }

  const now = state.clock.nowMicros();
  const daysRemaining = calculateDaysRemaining(now, cert.expiresAtMicros);

  let level: AlertLevel | null = null;
  if (daysRemaining <= state.criticalThresholdDays) {
    level = 'CRITICAL';
  } else if (daysRemaining <= state.warningThresholdDays) {
    level = 'WARNING';
  } else if (daysRemaining <= state.infoThresholdDays) {
    level = 'INFO';
  }

  if (!level) {
    return 'no-alert-needed';
  }

  const alertId = state.id.generate();
  const alert: ExpiryAlert = {
    alertId,
    certificateId,
    domain: cert.domain,
    level,
    daysRemaining,
    expiresAtMicros: cert.expiresAtMicros,
    createdAtMicros: now,
  };

  state.alerts.set(alertId, alert);
  updateCertificateStatus(state, certificateId, now);

  const msg = level + ' alert for ' + cert.domain + ': ' + String(daysRemaining) + ' days';
  if (level === 'CRITICAL') {
    state.log.error(msg);
  } else if (level === 'WARNING') {
    state.log.warn(msg);
  } else {
    state.log.info(msg);
  }

  return alert;
}

export function checkAllExpiries(state: CertManagerState): Array<ExpiryAlert> {
  const alerts: Array<ExpiryAlert> = [];

  for (const cert of state.certificates.values()) {
    const result = checkExpiry(state, cert.id);
    if (typeof result !== 'string') {
      alerts.push(result);
    }
  }

  return alerts;
}

export function getExpiryAlerts(state: CertManagerState, level?: AlertLevel): Array<ExpiryAlert> {
  const alerts: Array<ExpiryAlert> = [];

  for (const alert of state.alerts.values()) {
    if (!level || alert.level === level) {
      alerts.push(alert);
    }
  }

  return alerts;
}

// ============================================================================
// Renewal Management
// ============================================================================

export function scheduleRenewal(
  state: CertManagerState,
  certificateId: string,
): Certificate | 'certificate-not-found' {
  const cert = state.certificates.get(certificateId);
  if (!cert) {
    return 'certificate-not-found';
  }

  const updated: Certificate = {
    ...cert,
    renewalScheduled: true,
  };

  state.certificates.set(certificateId, updated);
  const msg = 'Renewal scheduled for: ' + cert.domain;
  state.log.info(msg);
  return updated;
}

export function recordRenewal(
  state: CertManagerState,
  certificateId: string,
  newExpiryMicros: bigint,
  newFingerprint: string,
): RenewalRecord | 'certificate-not-found' {
  const cert = state.certificates.get(certificateId);
  if (!cert) {
    return 'certificate-not-found';
  }

  const recordId = state.id.generate();
  const now = state.clock.nowMicros();

  const record: RenewalRecord = {
    recordId,
    certificateId,
    domain: cert.domain,
    oldExpiryMicros: cert.expiresAtMicros,
    newExpiryMicros,
    renewedAtMicros: now,
    issuer: cert.issuer,
  };

  state.renewals.push(record);

  const newStatus = calculateStatus(state, now, newExpiryMicros, false);
  const updated: Certificate = {
    ...cert,
    expiresAtMicros: newExpiryMicros,
    fingerprint: newFingerprint,
    status: newStatus,
    renewalScheduled: false,
  };

  state.certificates.set(certificateId, updated);

  const msg = 'Certificate renewed: ' + cert.domain;
  state.log.info(msg);
  return record;
}

export function getRenewalHistory(state: CertManagerState, domain?: string): Array<RenewalRecord> {
  if (!domain) {
    return [...state.renewals];
  }

  return state.renewals.filter((r) => r.domain === domain);
}

export function getPendingRenewals(state: CertManagerState): Array<Certificate> {
  const pending: Array<Certificate> = [];

  for (const cert of state.certificates.values()) {
    if (cert.renewalScheduled) {
      pending.push(cert);
    }
  }

  return pending;
}

// ============================================================================
// Domain Coverage
// ============================================================================

export function getDomainCoverage(state: CertManagerState, domain: string): DomainCoverage {
  const certIds = state.certificatesByDomain.get(domain) || new Set();
  const certs: Array<Certificate> = [];

  for (const id of certIds) {
    const cert = state.certificates.get(id);
    if (cert) {
      certs.push(cert);
    }
  }

  let validCount = 0;
  let expiringSoonCount = 0;
  let criticalCount = 0;
  let expiredCount = 0;
  let revokedCount = 0;

  for (const cert of certs) {
    if (cert.status === 'VALID') {
      validCount++;
    } else if (cert.status === 'EXPIRING_SOON') {
      expiringSoonCount++;
    } else if (cert.status === 'CRITICAL') {
      criticalCount++;
    } else if (cert.status === 'EXPIRED') {
      expiredCount++;
    } else if (cert.status === 'REVOKED') {
      revokedCount++;
    }
  }

  return {
    domain,
    certificateCount: certs.length,
    validCount,
    expiringSoonCount,
    criticalCount,
    expiredCount,
    revokedCount,
  };
}

export function getAllDomainCoverages(state: CertManagerState): Array<DomainCoverage> {
  const coverages: Array<DomainCoverage> = [];

  for (const domain of state.certificatesByDomain.keys()) {
    coverages.push(getDomainCoverage(state, domain));
  }

  return coverages;
}

// ============================================================================
// Reports
// ============================================================================

export function getCertReport(state: CertManagerState): CertReport {
  let validCount = 0;
  let expiringSoonCount = 0;
  let criticalCount = 0;
  let expiredCount = 0;
  let revokedCount = 0;
  let renewalsPending = 0;

  for (const cert of state.certificates.values()) {
    if (cert.status === 'VALID') {
      validCount++;
    } else if (cert.status === 'EXPIRING_SOON') {
      expiringSoonCount++;
    } else if (cert.status === 'CRITICAL') {
      criticalCount++;
    } else if (cert.status === 'EXPIRED') {
      expiredCount++;
    } else if (cert.status === 'REVOKED') {
      revokedCount++;
    }

    if (cert.renewalScheduled) {
      renewalsPending++;
    }
  }

  return {
    totalCertificates: state.certificates.size,
    validCount,
    expiringSoonCount,
    criticalCount,
    expiredCount,
    revokedCount,
    renewalsPending,
    alertCount: state.alerts.size,
    generatedAtMicros: state.clock.nowMicros(),
  };
}

export function getCertificatesByStatus(
  state: CertManagerState,
  status: CertificateStatus,
): Array<Certificate> {
  const certs: Array<Certificate> = [];

  for (const cert of state.certificates.values()) {
    if (cert.status === status) {
      certs.push(cert);
    }
  }

  return certs;
}

export function listAllCertificates(state: CertManagerState): Array<Certificate> {
  return Array.from(state.certificates.values());
}

// ============================================================================
// Helpers
// ============================================================================

function calculateStatus(
  state: CertManagerState,
  nowMicros: bigint,
  expiryMicros: bigint,
  revoked: boolean,
): CertificateStatus {
  if (revoked) {
    return 'REVOKED';
  }

  if (nowMicros > expiryMicros) {
    return 'EXPIRED';
  }

  const daysRemaining = calculateDaysRemaining(nowMicros, expiryMicros);

  if (daysRemaining <= state.criticalThresholdDays) {
    return 'CRITICAL';
  }

  if (daysRemaining <= state.warningThresholdDays) {
    return 'EXPIRING_SOON';
  }

  return 'VALID';
}

function calculateDaysRemaining(nowMicros: bigint, expiryMicros: bigint): number {
  const diffMicros = expiryMicros - nowMicros;
  const diffSeconds = Number(diffMicros / 1_000_000n);
  const diffDays = Math.floor(diffSeconds / 86400);
  return diffDays;
}

function updateCertificateStatus(
  state: CertManagerState,
  certificateId: string,
  nowMicros: bigint,
): void {
  const cert = state.certificates.get(certificateId);
  if (!cert) {
    return;
  }

  const newStatus = calculateStatus(
    state,
    nowMicros,
    cert.expiresAtMicros,
    cert.status === 'REVOKED',
  );

  if (newStatus !== cert.status) {
    const updated: Certificate = {
      ...cert,
      status: newStatus,
    };
    state.certificates.set(certificateId, updated);
  }
}

function addCertificateToDomain(state: CertManagerState, domain: string, certId: string): void {
  let certs = state.certificatesByDomain.get(domain);
  if (!certs) {
    certs = new Set();
    state.certificatesByDomain.set(domain, certs);
  }
  certs.add(certId);
}

// ============================================================================
// Alert Management
// ============================================================================

export function clearAlert(state: CertManagerState, alertId: string): boolean {
  return state.alerts.delete(alertId);
}

export function clearAllAlerts(state: CertManagerState): void {
  state.alerts.clear();
  state.log.info('All alerts cleared');
}

export function getAlertCount(state: CertManagerState): number {
  return state.alerts.size;
}

export function getCertificateCount(state: CertManagerState): number {
  return state.certificates.size;
}

export function getRenewalCount(state: CertManagerState): number {
  return state.renewals.length;
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ClockPort,
  IdPort,
  LogPort,
  CertificateStatus,
  AlertLevel,
  Certificate,
  ExpiryAlert,
  RenewalRecord,
  DomainCoverage,
  CertReport,
  CertManagerState,
};
