/**
 * Key Rotation System — Cryptographic key lifecycle with rotation scheduling.
 *
 * Keys are generated for specific purposes and algorithms, optionally with an
 * expiry time. Rotation creates a new successor key while deprecating the old
 * one. Revocation permanently invalidates any key. Stats expose expiry windows
 * for proactive rotation alerting.
 *
 * "Old threads must be retired before new colors can take hold."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface KeyRotationClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface KeyRotationIdGenPort {
  readonly next: () => string;
}

interface KeyRotationLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type KeyId = string;

export type KeyPurpose = 'SIGNING' | 'ENCRYPTION' | 'AUTHENTICATION' | 'DERIVATION';
export type KeyStatus = 'ACTIVE' | 'ROTATING' | 'DEPRECATED' | 'REVOKED';
export type KeyError =
  | 'key-not-found'
  | 'invalid-algorithm'
  | 'invalid-expiry'
  | 'already-revoked'
  | 'rotation-in-progress';

export type ValidAlgorithm =
  | 'RSA-2048'
  | 'RSA-4096'
  | 'EC-P256'
  | 'EC-P384'
  | 'AES-256'
  | 'ChaCha20';

export interface CryptoKey {
  readonly keyId: KeyId;
  readonly purpose: KeyPurpose;
  readonly algorithm: ValidAlgorithm;
  status: KeyStatus;
  readonly createdAt: bigint;
  readonly expiresAt: bigint | null;
  readonly rotatedFrom: KeyId | null;
  readonly version: number;
}

export interface RotationEvent {
  readonly eventId: string;
  readonly fromKeyId: KeyId;
  readonly toKeyId: KeyId;
  readonly rotatedAt: bigint;
}

export interface KeyStats {
  readonly totalKeys: number;
  readonly activeKeys: number;
  readonly deprecatedKeys: number;
  readonly revokedKeys: number;
  readonly keysExpiringWithinUs: (windowUs: bigint) => number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface KeyRotationSystem {
  generateKey(
    purpose: KeyPurpose,
    algorithm: ValidAlgorithm,
    expiresAt: bigint | null,
  ): CryptoKey | KeyError;
  rotateKey(
    keyId: KeyId,
  ):
    | { success: true; newKey: CryptoKey; event: RotationEvent }
    | { success: false; error: KeyError };
  deprecateKey(keyId: KeyId): { success: true } | { success: false; error: KeyError };
  revokeKey(keyId: KeyId): { success: true } | { success: false; error: KeyError };
  getKey(keyId: KeyId): CryptoKey | undefined;
  listKeys(purpose?: KeyPurpose, status?: KeyStatus): ReadonlyArray<CryptoKey>;
  getRotationHistory(keyId: KeyId): ReadonlyArray<RotationEvent>;
  getStats(): KeyStats;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface KeyRotationSystemDeps {
  readonly clock: KeyRotationClockPort;
  readonly idGen: KeyRotationIdGenPort;
  readonly logger: KeyRotationLoggerPort;
}

// ─── Valid Algorithms Set ────────────────────────────────────────────────────

const VALID_ALGORITHMS = new Set<ValidAlgorithm>([
  'RSA-2048',
  'RSA-4096',
  'EC-P256',
  'EC-P384',
  'AES-256',
  'ChaCha20',
]);

// ─── State ───────────────────────────────────────────────────────────────────

interface KeyRotationState {
  readonly keys: Map<KeyId, CryptoKey>;
  readonly rotationEvents: RotationEvent[];
  readonly rotationHistory: Map<KeyId, RotationEvent[]>;
  readonly deps: KeyRotationSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createKeyRotationSystem(deps: KeyRotationSystemDeps): KeyRotationSystem {
  const state: KeyRotationState = {
    keys: new Map(),
    rotationEvents: [],
    rotationHistory: new Map(),
    deps,
  };

  return {
    generateKey: (purpose, algorithm, expiresAt) =>
      generateKeyImpl(state, purpose, algorithm, expiresAt),
    rotateKey: (keyId) => rotateKeyImpl(state, keyId),
    deprecateKey: (keyId) => deprecateKeyImpl(state, keyId),
    revokeKey: (keyId) => revokeKeyImpl(state, keyId),
    getKey: (keyId) => state.keys.get(keyId),
    listKeys: (purpose, status) => listKeysImpl(state, purpose, status),
    getRotationHistory: (keyId) => getRotationHistoryImpl(state, keyId),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Generate Key ─────────────────────────────────────────────────────────────

function generateKeyImpl(
  state: KeyRotationState,
  purpose: KeyPurpose,
  algorithm: ValidAlgorithm,
  expiresAt: bigint | null,
): CryptoKey | KeyError {
  if (!VALID_ALGORITHMS.has(algorithm)) return 'invalid-algorithm';
  const now = state.deps.clock.nowMicroseconds();
  if (expiresAt !== null && expiresAt <= now) return 'invalid-expiry';

  const keyId = state.deps.idGen.next();
  const key: CryptoKey = {
    keyId,
    purpose,
    algorithm,
    status: 'ACTIVE',
    createdAt: now,
    expiresAt,
    rotatedFrom: null,
    version: 1,
  };
  state.keys.set(keyId, key);
  state.deps.logger.info('key-generated', { keyId, purpose, algorithm });
  return key;
}

// ─── Rotate Key ───────────────────────────────────────────────────────────────

function rotateKeyImpl(
  state: KeyRotationState,
  keyId: KeyId,
):
  | { success: true; newKey: CryptoKey; event: RotationEvent }
  | { success: false; error: KeyError } {
  const oldKey = state.keys.get(keyId);
  if (oldKey === undefined) return { success: false, error: 'key-not-found' };
  if (oldKey.status === 'ROTATING') return { success: false, error: 'rotation-in-progress' };
  if (oldKey.status === 'REVOKED') return { success: false, error: 'key-not-found' };

  const now = state.deps.clock.nowMicroseconds();
  const newKey = buildSuccessorKey(state, oldKey, keyId, now);
  setKeyStatus(oldKey, 'DEPRECATED');

  const event = recordRotationEvent(state, keyId, newKey.keyId, now);
  state.deps.logger.info('key-rotated', { fromKeyId: keyId, toKeyId: newKey.keyId });
  return { success: true, newKey, event };
}

function buildSuccessorKey(
  state: KeyRotationState,
  oldKey: CryptoKey,
  fromKeyId: KeyId,
  now: bigint,
): CryptoKey {
  setKeyStatus(oldKey, 'ROTATING');
  const newKeyId = state.deps.idGen.next();
  const newKey: CryptoKey = {
    keyId: newKeyId,
    purpose: oldKey.purpose,
    algorithm: oldKey.algorithm,
    status: 'ACTIVE',
    createdAt: now,
    expiresAt: oldKey.expiresAt,
    rotatedFrom: fromKeyId,
    version: oldKey.version + 1,
  };
  state.keys.set(newKeyId, newKey);
  return newKey;
}

function recordRotationEvent(
  state: KeyRotationState,
  fromKeyId: KeyId,
  toKeyId: KeyId,
  now: bigint,
): RotationEvent {
  const event: RotationEvent = {
    eventId: state.deps.idGen.next(),
    fromKeyId,
    toKeyId,
    rotatedAt: now,
  };
  state.rotationEvents.push(event);
  addToHistory(state, fromKeyId, event);
  addToHistory(state, toKeyId, event);
  return event;
}

function setKeyStatus(key: CryptoKey, status: KeyStatus): void {
  (key as { status: KeyStatus }).status = status;
}

function addToHistory(state: KeyRotationState, keyId: KeyId, event: RotationEvent): void {
  let history = state.rotationHistory.get(keyId);
  if (history === undefined) {
    history = [];
    state.rotationHistory.set(keyId, history);
  }
  history.push(event);
}

// ─── Deprecate Key ────────────────────────────────────────────────────────────

function deprecateKeyImpl(
  state: KeyRotationState,
  keyId: KeyId,
): { success: true } | { success: false; error: KeyError } {
  const key = state.keys.get(keyId);
  if (key === undefined) return { success: false, error: 'key-not-found' };
  if (key.status === 'REVOKED') return { success: false, error: 'already-revoked' };
  setKeyStatus(key, 'DEPRECATED');
  return { success: true };
}

// ─── Revoke Key ───────────────────────────────────────────────────────────────

function revokeKeyImpl(
  state: KeyRotationState,
  keyId: KeyId,
): { success: true } | { success: false; error: KeyError } {
  const key = state.keys.get(keyId);
  if (key === undefined) return { success: false, error: 'key-not-found' };
  if (key.status === 'REVOKED') return { success: false, error: 'already-revoked' };
  setKeyStatus(key, 'REVOKED');
  state.deps.logger.warn('key-revoked', { keyId });
  return { success: true };
}

// ─── List Keys ────────────────────────────────────────────────────────────────

function listKeysImpl(
  state: KeyRotationState,
  purpose?: KeyPurpose,
  status?: KeyStatus,
): ReadonlyArray<CryptoKey> {
  const result: CryptoKey[] = [];
  for (const key of state.keys.values()) {
    if (purpose !== undefined && key.purpose !== purpose) continue;
    if (status !== undefined && key.status !== status) continue;
    result.push(key);
  }
  return result;
}

// ─── Rotation History ─────────────────────────────────────────────────────────

function getRotationHistoryImpl(
  state: KeyRotationState,
  keyId: KeyId,
): ReadonlyArray<RotationEvent> {
  return state.rotationHistory.get(keyId) ?? [];
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function getStatsImpl(state: KeyRotationState): KeyStats {
  let activeKeys = 0;
  let deprecatedKeys = 0;
  let revokedKeys = 0;

  for (const key of state.keys.values()) {
    if (key.status === 'ACTIVE') activeKeys += 1;
    else if (key.status === 'DEPRECATED') deprecatedKeys += 1;
    else if (key.status === 'REVOKED') revokedKeys += 1;
  }

  const keys = state.keys;
  const clock = state.deps.clock;

  return {
    totalKeys: state.keys.size,
    activeKeys,
    deprecatedKeys,
    revokedKeys,
    keysExpiringWithinUs: (windowUs: bigint) => countExpiringKeys(keys, clock, windowUs),
  };
}

function countExpiringKeys(
  keys: Map<KeyId, CryptoKey>,
  clock: KeyRotationClockPort,
  windowUs: bigint,
): number {
  const now = clock.nowMicroseconds();
  const cutoff = now + windowUs;
  let count = 0;
  for (const key of keys.values()) {
    if (key.status === 'ACTIVE' && key.expiresAt !== null && key.expiresAt <= cutoff) count += 1;
  }
  return count;
}
