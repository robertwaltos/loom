/**
 * credential-vault.ts — Secure credential and secret storage.
 *
 * Stores named secrets with access tracking, expiration support,
 * and rotation history. Secrets are stored as opaque strings with
 * metadata. Access is logged for audit trail purposes.
 */

// ── Ports ────────────────────────────────────────────────────────

interface VaultClock {
  readonly nowMicroseconds: () => number;
}

interface VaultIdGenerator {
  readonly next: () => string;
}

interface CredentialVaultDeps {
  readonly clock: VaultClock;
  readonly idGenerator: VaultIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface StoredCredential {
  readonly credentialId: string;
  readonly name: string;
  readonly createdAt: number;
  readonly expiresAt: number | undefined;
  readonly rotationCount: number;
  readonly lastAccessedAt: number;
}

interface StoreCredentialParams {
  readonly name: string;
  readonly secret: string;
  readonly expiresAt?: number;
}

interface CredentialAccess {
  readonly credentialId: string;
  readonly secret: string;
  readonly accessedAt: number;
}

interface CredentialVaultStats {
  readonly totalCredentials: number;
  readonly expiredCredentials: number;
  readonly totalAccesses: number;
}

interface CredentialVault {
  readonly store: (params: StoreCredentialParams) => StoredCredential;
  readonly access: (name: string) => CredentialAccess | undefined;
  readonly rotate: (name: string, newSecret: string) => boolean;
  readonly revoke: (name: string) => boolean;
  readonly exists: (name: string) => boolean;
  readonly isExpired: (name: string) => boolean;
  readonly list: () => readonly StoredCredential[];
  readonly getStats: () => CredentialVaultStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableCredential {
  readonly credentialId: string;
  readonly name: string;
  secret: string;
  readonly createdAt: number;
  expiresAt: number | undefined;
  rotationCount: number;
  lastAccessedAt: number;
  accessCount: number;
}

interface VaultState {
  readonly deps: CredentialVaultDeps;
  readonly credentials: Map<string, MutableCredential>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(cred: MutableCredential): StoredCredential {
  return {
    credentialId: cred.credentialId,
    name: cred.name,
    createdAt: cred.createdAt,
    expiresAt: cred.expiresAt,
    rotationCount: cred.rotationCount,
    lastAccessedAt: cred.lastAccessedAt,
  };
}

function isCredExpired(cred: MutableCredential, now: number): boolean {
  return cred.expiresAt !== undefined && now > cred.expiresAt;
}

// ── Operations ───────────────────────────────────────────────────

function storeImpl(state: VaultState, params: StoreCredentialParams): StoredCredential {
  const now = state.deps.clock.nowMicroseconds();
  const cred: MutableCredential = {
    credentialId: state.deps.idGenerator.next(),
    name: params.name,
    secret: params.secret,
    createdAt: now,
    expiresAt: params.expiresAt,
    rotationCount: 0,
    lastAccessedAt: now,
    accessCount: 0,
  };
  state.credentials.set(params.name, cred);
  return toReadonly(cred);
}

function accessImpl(state: VaultState, name: string): CredentialAccess | undefined {
  const cred = state.credentials.get(name);
  if (!cred) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  if (isCredExpired(cred, now)) return undefined;
  cred.lastAccessedAt = now;
  cred.accessCount++;
  return {
    credentialId: cred.credentialId,
    secret: cred.secret,
    accessedAt: now,
  };
}

function rotateImpl(state: VaultState, name: string, newSecret: string): boolean {
  const cred = state.credentials.get(name);
  if (!cred) return false;
  cred.secret = newSecret;
  cred.rotationCount++;
  return true;
}

function getStatsImpl(state: VaultState): CredentialVaultStats {
  const now = state.deps.clock.nowMicroseconds();
  let expired = 0;
  let totalAccesses = 0;
  for (const cred of state.credentials.values()) {
    if (isCredExpired(cred, now)) expired++;
    totalAccesses += cred.accessCount;
  }
  return {
    totalCredentials: state.credentials.size,
    expiredCredentials: expired,
    totalAccesses,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createCredentialVault(deps: CredentialVaultDeps): CredentialVault {
  const state: VaultState = { deps, credentials: new Map() };
  return {
    store: (p) => storeImpl(state, p),
    access: (name) => accessImpl(state, name),
    rotate: (name, secret) => rotateImpl(state, name, secret),
    revoke: (name) => state.credentials.delete(name),
    exists: (name) => state.credentials.has(name),
    isExpired: (name) => {
      const c = state.credentials.get(name);
      if (!c) return false;
      return isCredExpired(c, state.deps.clock.nowMicroseconds());
    },
    list: () => [...state.credentials.values()].map(toReadonly),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createCredentialVault };
export type {
  CredentialVault,
  CredentialVaultDeps,
  StoredCredential,
  StoreCredentialParams,
  CredentialAccess,
  CredentialVaultStats,
};
