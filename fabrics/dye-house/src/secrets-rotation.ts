/**
 * Secrets Rotation Engine — Automated credential lifecycle management.
 *
 * Manages the complete lifecycle of secrets (API keys, passwords, tokens,
 * encryption keys, certificates) with automated rotation, versioning, and
 * graceful transition. Secrets are never stored in code — they live here,
 * versioned, audited, and rotated on schedule.
 *
 * Key capabilities:
 *   - Versioned secrets with active/previous/revoked states
 *   - Grace periods for gradual migration (old version valid briefly)
 *   - Scheduled rotation with configurable intervals
 *   - Access auditing with identity tracking
 *   - Immediate revocation when compromise detected
 *
 * Secret types:
 *   API_KEY           — Third-party service keys
 *   DATABASE_PASSWORD — Database credentials
 *   JWT_SECRET        — Token signing keys
 *   ENCRYPTION_KEY    — Data encryption keys
 *   CERTIFICATE       — TLS/SSL certificates
 *
 * Rotation workflow:
 *   1. Generate new version
 *   2. Mark current as previous
 *   3. Grace period begins (both versions valid)
 *   4. Grace period expires, previous version revoked
 *
 * "The Dye House spins the thread. Old colors fade, new ones emerge."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SecretType =
  | 'API_KEY'
  | 'DATABASE_PASSWORD'
  | 'JWT_SECRET'
  | 'ENCRYPTION_KEY'
  | 'CERTIFICATE';
export type SecretStatus = 'ACTIVE' | 'PREVIOUS' | 'REVOKED';

export interface Secret {
  readonly name: string;
  readonly type: SecretType;
  readonly currentVersion: SecretVersion;
  readonly previousVersion: SecretVersion | null;
  readonly rotationSchedule: RotationSchedule | null;
  readonly lastRotatedAt: bigint;
  readonly createdAt: bigint;
}

export interface SecretVersion {
  readonly versionId: string;
  readonly value: string;
  readonly status: SecretStatus;
  readonly createdAt: bigint;
  readonly expiresAt: bigint | null;
}

export interface RotationSchedule {
  readonly intervalMicroseconds: bigint;
  readonly gracePeriodMicroseconds: bigint;
  readonly autoRotate: boolean;
}

export interface RotationResult {
  readonly secretName: string;
  readonly newVersionId: string;
  readonly previousVersionId: string | null;
  readonly rotatedAt: bigint;
  readonly gracePeriodEndsAt: bigint;
}

export interface AccessAudit {
  readonly secretName: string;
  readonly versionId: string;
  readonly accessedBy: string;
  readonly accessedAt: bigint;
  readonly purpose: string;
}

export interface GracePeriod {
  readonly secretName: string;
  readonly endsAt: bigint;
  readonly active: boolean;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface SecretsRotationEngine {
  registerSecret(
    name: string,
    type: SecretType,
    initialValue: string,
    schedule: RotationSchedule | null,
  ): void;
  rotateSecret(name: string, newValue: string): RotationResult | string;
  getActiveVersion(name: string): SecretVersion | null;
  getPreviousVersion(name: string): SecretVersion | null;
  scheduleRotation(name: string, schedule: RotationSchedule): void;
  auditAccess(secretName: string, accessedBy: string, purpose: string): void;
  revokeVersion(name: string, versionId: string): boolean;
  getSecret(name: string): Secret | null;
  getAccessAudits(secretName: string, limit: number): ReadonlyArray<AccessAudit>;
  processScheduledRotations(): number;
  cleanupExpiredGracePeriods(): number;
  getSecretCount(): number;
  getGracePeriods(): ReadonlyArray<GracePeriod>;
}

export interface SecretsRotationEngineDeps {
  readonly clock: SecretsClockPort;
  readonly logger: SecretsLoggerPort;
  readonly idGenerator: SecretsIdGeneratorPort;
  readonly maxAuditsPerSecret: number;
}

interface SecretsClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface SecretsLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

interface SecretsIdGeneratorPort {
  readonly generate: () => string;
}

// ─── State ──────────────────────────────────────────────────────────

interface EngineState {
  readonly secrets: Map<string, SecretData>;
  readonly audits: Map<string, AccessAudit[]>;
  readonly deps: SecretsRotationEngineDeps;
}

interface SecretData {
  readonly name: string;
  readonly type: SecretType;
  readonly versions: SecretVersion[];
  readonly schedule: RotationSchedule | null;
  readonly lastRotatedAt: bigint;
  readonly createdAt: bigint;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createSecretsRotationEngine(
  deps: SecretsRotationEngineDeps,
): SecretsRotationEngine {
  const state: EngineState = {
    secrets: new Map(),
    audits: new Map(),
    deps,
  };

  return {
    registerSecret: (n, t, v, s) => {
      registerSecretImpl(state, n, t, v, s);
    },
    rotateSecret: (n, v) => rotateSecretImpl(state, n, v),
    getActiveVersion: (n) => getActiveVersionImpl(state, n),
    getPreviousVersion: (n) => getPreviousVersionImpl(state, n),
    scheduleRotation: (n, s) => {
      scheduleRotationImpl(state, n, s);
    },
    auditAccess: (n, by, p) => {
      auditAccessImpl(state, n, by, p);
    },
    revokeVersion: (n, v) => revokeVersionImpl(state, n, v),
    getSecret: (n) => getSecretImpl(state, n),
    getAccessAudits: (n, l) => getAccessAuditsImpl(state, n, l),
    processScheduledRotations: () => processScheduledRotationsImpl(state),
    cleanupExpiredGracePeriods: () => cleanupExpiredGracePeriodsImpl(state),
    getSecretCount: () => state.secrets.size,
    getGracePeriods: () => getGracePeriodsImpl(state),
  };
}

// ─── Secret Registration ────────────────────────────────────────────

function registerSecretImpl(
  state: EngineState,
  name: string,
  type: SecretType,
  initialValue: string,
  schedule: RotationSchedule | null,
): void {
  const now = state.deps.clock.nowMicroseconds();
  const versionId = state.deps.idGenerator.generate();

  const version: SecretVersion = {
    versionId,
    value: initialValue,
    status: 'ACTIVE',
    createdAt: now,
    expiresAt: null,
  };

  const secretData: SecretData = {
    name,
    type,
    versions: [version],
    schedule,
    lastRotatedAt: now,
    createdAt: now,
  };

  state.secrets.set(name, secretData);
  state.deps.logger.info('Secret registered', { secret: name, type });
}

// ─── Secret Rotation ────────────────────────────────────────────────

function rotateSecretImpl(
  state: EngineState,
  name: string,
  newValue: string,
): RotationResult | string {
  const secret = state.secrets.get(name);
  if (secret === undefined) {
    return 'Secret not found: ' + name;
  }

  const now = state.deps.clock.nowMicroseconds();
  const newVersionId = state.deps.idGenerator.generate();

  const activeVersion = findActiveVersion(secret);
  if (activeVersion === null) {
    return 'No active version found for secret: ' + name;
  }

  const gracePeriodUs = secret.schedule?.gracePeriodMicroseconds ?? BigInt(0);
  const gracePeriodEndsAt = now + gracePeriodUs;

  const previousVersion: SecretVersion = {
    ...activeVersion,
    status: 'PREVIOUS',
    expiresAt: gracePeriodEndsAt,
  };

  const newVersion: SecretVersion = {
    versionId: newVersionId,
    value: newValue,
    status: 'ACTIVE',
    createdAt: now,
    expiresAt: null,
  };

  replaceVersion(secret, activeVersion.versionId, previousVersion);
  secret.versions.push(newVersion);
  const updated: SecretData = { ...secret, lastRotatedAt: now };
  state.secrets.set(name, updated);

  state.deps.logger.info('Secret rotated', {
    secret: name,
    newVersion: newVersionId,
    previousVersion: activeVersion.versionId,
  });

  return {
    secretName: name,
    newVersionId,
    previousVersionId: activeVersion.versionId,
    rotatedAt: now,
    gracePeriodEndsAt,
  };
}

// ─── Version Retrieval ──────────────────────────────────────────────

function getActiveVersionImpl(state: EngineState, name: string): SecretVersion | null {
  const secret = state.secrets.get(name);
  if (secret === undefined) return null;
  return findActiveVersion(secret);
}

function getPreviousVersionImpl(state: EngineState, name: string): SecretVersion | null {
  const secret = state.secrets.get(name);
  if (secret === undefined) return null;
  return findPreviousVersion(secret);
}

function findActiveVersion(secret: SecretData): SecretVersion | null {
  for (const version of secret.versions) {
    if (version.status === 'ACTIVE') return version;
  }
  return null;
}

function findPreviousVersion(secret: SecretData): SecretVersion | null {
  for (const version of secret.versions) {
    if (version.status === 'PREVIOUS') return version;
  }
  return null;
}

// ─── Schedule Management ────────────────────────────────────────────

function scheduleRotationImpl(state: EngineState, name: string, schedule: RotationSchedule): void {
  const secret = state.secrets.get(name);
  if (secret === undefined) return;

  const updated: SecretData = { ...secret, schedule };
  state.secrets.set(name, updated);
  state.deps.logger.info('Rotation scheduled', { secret: name });
}

function processScheduledRotationsImpl(state: EngineState): number {
  const now = state.deps.clock.nowMicroseconds();
  let rotated = 0;

  for (const secret of state.secrets.values()) {
    if (shouldRotate(secret, now)) {
      const newValue = generatePlaceholderValue(secret.type);
      const result = rotateSecretImpl(state, secret.name, newValue);
      if (typeof result !== 'string') {
        rotated += 1;
      }
    }
  }

  return rotated;
}

function shouldRotate(secret: SecretData, now: bigint): boolean {
  if (secret.schedule === null || !secret.schedule.autoRotate) return false;
  const elapsed = now - secret.lastRotatedAt;
  return elapsed >= secret.schedule.intervalMicroseconds;
}

function generatePlaceholderValue(type: SecretType): string {
  return 'rotated-' + type + '-' + String(Date.now());
}

// ─── Grace Period Cleanup ───────────────────────────────────────────

function cleanupExpiredGracePeriodsImpl(state: EngineState): number {
  const now = state.deps.clock.nowMicroseconds();
  let revoked = 0;

  for (const secret of state.secrets.values()) {
    const previous = findPreviousVersion(secret);
    if (previous === null) continue;
    if (previous.expiresAt === null) continue;
    if (previous.expiresAt > now) continue;

    const revokedVersion: SecretVersion = {
      ...previous,
      status: 'REVOKED',
    };
    replaceVersion(secret, previous.versionId, revokedVersion);
    revoked += 1;

    state.deps.logger.info('Grace period expired, version revoked', {
      secret: secret.name,
      version: previous.versionId,
    });
  }

  return revoked;
}

function getGracePeriodsImpl(state: EngineState): ReadonlyArray<GracePeriod> {
  const now = state.deps.clock.nowMicroseconds();
  const periods: GracePeriod[] = [];

  for (const secret of state.secrets.values()) {
    const previous = findPreviousVersion(secret);
    if (previous === null || previous.expiresAt === null) continue;

    periods.push({
      secretName: secret.name,
      endsAt: previous.expiresAt,
      active: previous.expiresAt > now,
    });
  }

  return periods;
}

// ─── Version Revocation ─────────────────────────────────────────────

function revokeVersionImpl(state: EngineState, name: string, versionId: string): boolean {
  const secret = state.secrets.get(name);
  if (secret === undefined) return false;

  const version = findVersionById(secret, versionId);
  if (version === null) return false;
  if (version.status === 'REVOKED') return false;

  const revokedVersion: SecretVersion = {
    ...version,
    status: 'REVOKED',
    expiresAt: state.deps.clock.nowMicroseconds(),
  };

  replaceVersion(secret, versionId, revokedVersion);
  state.deps.logger.warn('Version revoked', { secret: name, version: versionId });
  return true;
}

function findVersionById(secret: SecretData, versionId: string): SecretVersion | null {
  for (const version of secret.versions) {
    if (version.versionId === versionId) return version;
  }
  return null;
}

function replaceVersion(secret: SecretData, versionId: string, newVersion: SecretVersion): void {
  for (let i = 0; i < secret.versions.length; i += 1) {
    const existing = secret.versions[i];
    if (existing !== undefined && existing.versionId === versionId) {
      secret.versions[i] = newVersion;
      return;
    }
  }
}

// ─── Access Auditing ────────────────────────────────────────────────

function auditAccessImpl(
  state: EngineState,
  secretName: string,
  accessedBy: string,
  purpose: string,
): void {
  const secret = state.secrets.get(secretName);
  if (secret === undefined) return;

  const activeVersion = findActiveVersion(secret);
  if (activeVersion === null) return;

  const now = state.deps.clock.nowMicroseconds();
  const audit: AccessAudit = {
    secretName,
    versionId: activeVersion.versionId,
    accessedBy,
    accessedAt: now,
    purpose,
  };

  const existing = state.audits.get(secretName);
  if (existing !== undefined) {
    existing.push(audit);
    trimAudits(existing, state.deps.maxAuditsPerSecret);
  } else {
    state.audits.set(secretName, [audit]);
  }
}

function getAccessAuditsImpl(
  state: EngineState,
  secretName: string,
  limit: number,
): ReadonlyArray<AccessAudit> {
  const audits = state.audits.get(secretName);
  if (audits === undefined) return [];
  if (limit >= audits.length) return [...audits];
  return audits.slice(audits.length - limit);
}

function trimAudits(audits: AccessAudit[], maxSize: number): void {
  while (audits.length > maxSize) {
    audits.shift();
  }
}

// ─── Secret Retrieval ───────────────────────────────────────────────

function getSecretImpl(state: EngineState, name: string): Secret | null {
  const secretData = state.secrets.get(name);
  if (secretData === undefined) return null;

  const currentVersion = findActiveVersion(secretData);
  if (currentVersion === null) return null;

  const previousVersion = findPreviousVersion(secretData);

  return {
    name: secretData.name,
    type: secretData.type,
    currentVersion,
    previousVersion,
    rotationSchedule: secretData.schedule,
    lastRotatedAt: secretData.lastRotatedAt,
    createdAt: secretData.createdAt,
  };
}
