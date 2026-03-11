/**
 * Token Vault — Secure session token lifecycle management.
 *
 * The Dye House guards access to The Loom. The Token Vault manages:
 *   - Session token issuance with configurable TTL
 *   - Token validation and refresh
 *   - Automatic expiry and cleanup
 *   - Rate limiting per identity (max active sessions)
 *   - Token revocation (single and bulk)
 *
 * Token format is opaque — the vault issues and validates, consumers
 * never need to inspect token internals. Designed for future integration
 * with Nakama identity and external auth providers.
 *
 * "Every thread entering The Loom must pass through the Dye House."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface SessionToken {
  readonly tokenId: string;
  readonly dynastyId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly refreshedAt: number;
  readonly isRevoked: boolean;
}

export interface TokenValidation {
  readonly valid: boolean;
  readonly reason: TokenInvalidReason | null;
  readonly token: SessionToken | null;
}

export type TokenInvalidReason = 'not_found' | 'expired' | 'revoked';

export interface TokenVaultConfig {
  readonly ttlMicroseconds: number;
  readonly maxSessionsPerDynasty: number;
  readonly refreshExtendsMicroseconds: number;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface TokenIdGenerator {
  next(): string;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface TokenVault {
  issue(dynastyId: string): SessionToken;
  validate(tokenId: string): TokenValidation;
  refresh(tokenId: string): SessionToken;
  revoke(tokenId: string): void;
  revokeAllForDynasty(dynastyId: string): number;
  getActiveSessions(dynastyId: string): ReadonlyArray<SessionToken>;
  cleanup(): number;
  count(): number;
  activeCount(): number;
}

export interface TokenVaultDeps {
  readonly idGenerator: TokenIdGenerator;
  readonly clock: { nowMicroseconds(): number };
  readonly config: TokenVaultConfig;
}

// ─── Default Config ─────────────────────────────────────────────────

const US_PER_HOUR = 60 * 60 * 1_000_000;

export const DEFAULT_TOKEN_CONFIG: TokenVaultConfig = {
  ttlMicroseconds: 24 * US_PER_HOUR,
  maxSessionsPerDynasty: 5,
  refreshExtendsMicroseconds: 12 * US_PER_HOUR,
};

// ─── State ──────────────────────────────────────────────────────────

interface MutableToken {
  readonly tokenId: string;
  readonly dynastyId: string;
  readonly issuedAt: number;
  expiresAt: number;
  refreshedAt: number;
  isRevoked: boolean;
}

interface VaultState {
  readonly tokens: Map<string, MutableToken>;
  readonly dynastyIndex: Map<string, Set<string>>; // dynastyId → tokenIds
  readonly deps: TokenVaultDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createTokenVault(deps: TokenVaultDeps): TokenVault {
  const state: VaultState = {
    tokens: new Map(),
    dynastyIndex: new Map(),
    deps,
  };

  return {
    issue: (d) => issueImpl(state, d),
    validate: (id) => validateImpl(state, id),
    refresh: (id) => refreshImpl(state, id),
    revoke: (id) => {
      revokeImpl(state, id);
    },
    revokeAllForDynasty: (d) => revokeAllImpl(state, d),
    getActiveSessions: (d) => getActiveSessionsImpl(state, d),
    cleanup: () => cleanupImpl(state),
    count: () => state.tokens.size,
    activeCount: () => countActiveImpl(state),
  };
}

// ─── Issuance ───────────────────────────────────────────────────────

function issueImpl(state: VaultState, dynastyId: string): SessionToken {
  enforceSessionLimit(state, dynastyId);
  const now = state.deps.clock.nowMicroseconds();
  const token: MutableToken = {
    tokenId: state.deps.idGenerator.next(),
    dynastyId,
    issuedAt: now,
    expiresAt: now + state.deps.config.ttlMicroseconds,
    refreshedAt: now,
    isRevoked: false,
  };
  state.tokens.set(token.tokenId, token);
  addToDynastyIndex(state, dynastyId, token.tokenId);
  return toReadonly(token);
}

function enforceSessionLimit(state: VaultState, dynastyId: string): void {
  const active = getActiveForDynasty(state, dynastyId);
  if (active.length >= state.deps.config.maxSessionsPerDynasty) {
    throw new Error('Dynasty ' + dynastyId + ' has reached session limit');
  }
}

function addToDynastyIndex(state: VaultState, dynastyId: string, tokenId: string): void {
  const existing = state.dynastyIndex.get(dynastyId);
  if (existing !== undefined) {
    existing.add(tokenId);
  } else {
    state.dynastyIndex.set(dynastyId, new Set([tokenId]));
  }
}

// ─── Validation ─────────────────────────────────────────────────────

function validateImpl(state: VaultState, tokenId: string): TokenValidation {
  const token = state.tokens.get(tokenId);
  if (token === undefined) {
    return { valid: false, reason: 'not_found', token: null };
  }
  if (token.isRevoked) {
    return { valid: false, reason: 'revoked', token: toReadonly(token) };
  }
  const now = state.deps.clock.nowMicroseconds();
  if (now >= token.expiresAt) {
    return { valid: false, reason: 'expired', token: toReadonly(token) };
  }
  return { valid: true, reason: null, token: toReadonly(token) };
}

// ─── Refresh ────────────────────────────────────────────────────────

function refreshImpl(state: VaultState, tokenId: string): SessionToken {
  const token = state.tokens.get(tokenId);
  if (token === undefined) {
    throw new Error('Token ' + tokenId + ' not found');
  }
  if (token.isRevoked) {
    throw new Error('Token ' + tokenId + ' is revoked');
  }
  const now = state.deps.clock.nowMicroseconds();
  token.refreshedAt = now;
  token.expiresAt = now + state.deps.config.refreshExtendsMicroseconds;
  return toReadonly(token);
}

// ─── Revocation ─────────────────────────────────────────────────────

function revokeImpl(state: VaultState, tokenId: string): void {
  const token = state.tokens.get(tokenId);
  if (token !== undefined) {
    token.isRevoked = true;
  }
}

function revokeAllImpl(state: VaultState, dynastyId: string): number {
  const tokenIds = state.dynastyIndex.get(dynastyId);
  if (tokenIds === undefined) return 0;
  let revoked = 0;
  for (const id of tokenIds) {
    const token = state.tokens.get(id);
    if (token !== undefined && !token.isRevoked) {
      token.isRevoked = true;
      revoked += 1;
    }
  }
  return revoked;
}

// ─── Queries ────────────────────────────────────────────────────────

function getActiveSessionsImpl(state: VaultState, dynastyId: string): ReadonlyArray<SessionToken> {
  return getActiveForDynasty(state, dynastyId).map(toReadonly);
}

function getActiveForDynasty(state: VaultState, dynastyId: string): MutableToken[] {
  const tokenIds = state.dynastyIndex.get(dynastyId);
  if (tokenIds === undefined) return [];
  const now = state.deps.clock.nowMicroseconds();
  const active: MutableToken[] = [];
  for (const id of tokenIds) {
    const token = state.tokens.get(id);
    if (token !== undefined && !token.isRevoked && now < token.expiresAt) {
      active.push(token);
    }
  }
  return active;
}

// ─── Cleanup ────────────────────────────────────────────────────────

function cleanupImpl(state: VaultState): number {
  const now = state.deps.clock.nowMicroseconds();
  const toRemove: string[] = [];

  for (const [id, token] of state.tokens.entries()) {
    if (token.isRevoked || now >= token.expiresAt) {
      toRemove.push(id);
    }
  }

  for (const id of toRemove) {
    removeToken(state, id);
  }
  return toRemove.length;
}

function removeToken(state: VaultState, tokenId: string): void {
  const token = state.tokens.get(tokenId);
  if (token !== undefined) {
    const dynasty = state.dynastyIndex.get(token.dynastyId);
    if (dynasty !== undefined) {
      dynasty.delete(tokenId);
      if (dynasty.size === 0) state.dynastyIndex.delete(token.dynastyId);
    }
  }
  state.tokens.delete(tokenId);
}

function countActiveImpl(state: VaultState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const token of state.tokens.values()) {
    if (!token.isRevoked && now < token.expiresAt) count += 1;
  }
  return count;
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonly(token: MutableToken): SessionToken {
  return {
    tokenId: token.tokenId,
    dynastyId: token.dynastyId,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
    refreshedAt: token.refreshedAt,
    isRevoked: token.isRevoked,
  };
}
