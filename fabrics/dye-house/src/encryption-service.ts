/**
 * Encryption Service — Symmetric encryption for sensitive Loom data.
 *
 * Provides encrypt/decrypt operations via a port-based backend, so
 * implementations can use Web Crypto, Node crypto, or hardware
 * backends without changing business logic.
 *
 * Design:
 *   - Port-based: EncryptionBackend handles raw crypto
 *   - Key rotation: register multiple keys, encrypt with latest
 *   - Key identification: each ciphertext carries its key ID
 *   - Nonce management: backend generates unique nonces per encrypt
 *   - All operations are synchronous for game-loop compatibility
 *
 * "The Dye House guards the secrets woven into every thread."
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface EncryptedPayload {
  readonly keyId: string;
  readonly ciphertext: string;
  readonly nonce: string;
  readonly algorithm: string;
}

export interface DecryptedPayload {
  readonly plaintext: string;
  readonly keyId: string;
}

export interface EncryptionKey {
  readonly keyId: string;
  readonly algorithm: string;
  readonly createdAt: number;
  readonly active: boolean;
}

export interface RegisterKeyParams {
  readonly keyId: string;
  readonly keyMaterial: string;
  readonly algorithm?: string;
}

// ─── Port Interface ─────────────────────────────────────────────────

export interface EncryptionBackend {
  encrypt(key: string, plaintext: string, nonce: string): string;
  decrypt(key: string, ciphertext: string, nonce: string): string;
  generateNonce(): string;
}

export interface EncryptionServiceDeps {
  readonly backend: EncryptionBackend;
  readonly clock: { nowMicroseconds(): number };
  readonly defaultAlgorithm?: string;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface EncryptionStats {
  readonly keyCount: number;
  readonly activeKeyId: string | null;
  readonly totalEncryptions: number;
  readonly totalDecryptions: number;
  readonly totalFailures: number;
}

// ─── Service Interface ──────────────────────────────────────────────

export interface EncryptionService {
  registerKey(params: RegisterKeyParams): EncryptionKey;
  setActiveKey(keyId: string): boolean;
  revokeKey(keyId: string): boolean;
  encrypt(plaintext: string): EncryptedPayload;
  decrypt(payload: EncryptedPayload): DecryptedPayload;
  getKey(keyId: string): EncryptionKey | undefined;
  listKeys(): ReadonlyArray<EncryptionKey>;
  getStats(): EncryptionStats;
}

// ─── State ───────────────────────────────────────────────────────────

interface KeyEntry {
  readonly keyId: string;
  readonly keyMaterial: string;
  readonly algorithm: string;
  readonly createdAt: number;
  active: boolean;
  revoked: boolean;
}

interface ServiceState {
  readonly keys: Map<string, KeyEntry>;
  readonly backend: EncryptionBackend;
  readonly clock: { nowMicroseconds(): number };
  readonly defaultAlgorithm: string;
  activeKeyId: string | null;
  totalEncryptions: number;
  totalDecryptions: number;
  totalFailures: number;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_ALGORITHM = 'aes-256-gcm';

// ─── Factory ─────────────────────────────────────────────────────────

export function createEncryptionService(deps: EncryptionServiceDeps): EncryptionService {
  const state: ServiceState = {
    keys: new Map(),
    backend: deps.backend,
    clock: deps.clock,
    defaultAlgorithm: deps.defaultAlgorithm ?? DEFAULT_ALGORITHM,
    activeKeyId: null,
    totalEncryptions: 0,
    totalDecryptions: 0,
    totalFailures: 0,
  };

  return {
    registerKey: (p) => registerKeyImpl(state, p),
    setActiveKey: (kid) => setActiveKeyImpl(state, kid),
    revokeKey: (kid) => revokeKeyImpl(state, kid),
    encrypt: (pt) => encryptImpl(state, pt),
    decrypt: (payload) => decryptImpl(state, payload),
    getKey: (kid) => getKeyImpl(state, kid),
    listKeys: () => listKeysImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Key Management ─────────────────────────────────────────────────

function registerKeyImpl(state: ServiceState, params: RegisterKeyParams): EncryptionKey {
  if (state.keys.has(params.keyId)) {
    throw new Error('Key ' + params.keyId + ' already registered');
  }
  const entry: KeyEntry = {
    keyId: params.keyId,
    keyMaterial: params.keyMaterial,
    algorithm: params.algorithm ?? state.defaultAlgorithm,
    createdAt: state.clock.nowMicroseconds(),
    active: false,
    revoked: false,
  };
  state.keys.set(params.keyId, entry);
  if (state.activeKeyId === null) {
    entry.active = true;
    state.activeKeyId = params.keyId;
  }
  return toReadonlyKey(entry);
}

function setActiveKeyImpl(state: ServiceState, keyId: string): boolean {
  const entry = state.keys.get(keyId);
  if (entry === undefined) return false;
  if (entry.revoked) return false;
  deactivateAll(state);
  entry.active = true;
  state.activeKeyId = keyId;
  return true;
}

function revokeKeyImpl(state: ServiceState, keyId: string): boolean {
  const entry = state.keys.get(keyId);
  if (entry === undefined) return false;
  if (entry.revoked) return false;
  entry.revoked = true;
  entry.active = false;
  if (state.activeKeyId === keyId) {
    state.activeKeyId = null;
  }
  return true;
}

function deactivateAll(state: ServiceState): void {
  for (const entry of state.keys.values()) {
    entry.active = false;
  }
}

// ─── Encrypt ────────────────────────────────────────────────────────

function encryptImpl(state: ServiceState, plaintext: string): EncryptedPayload {
  if (state.activeKeyId === null) {
    state.totalFailures++;
    throw new Error('No active encryption key');
  }
  const entry = state.keys.get(state.activeKeyId);
  if (entry === undefined) {
    state.totalFailures++;
    throw new Error('Active key not found');
  }
  const nonce = state.backend.generateNonce();
  const ciphertext = state.backend.encrypt(entry.keyMaterial, plaintext, nonce);
  state.totalEncryptions++;
  return {
    keyId: entry.keyId,
    ciphertext,
    nonce,
    algorithm: entry.algorithm,
  };
}

// ─── Decrypt ────────────────────────────────────────────────────────

function decryptImpl(state: ServiceState, payload: EncryptedPayload): DecryptedPayload {
  const entry = state.keys.get(payload.keyId);
  if (entry === undefined) {
    state.totalFailures++;
    throw new Error('Key ' + payload.keyId + ' not found');
  }
  if (entry.revoked) {
    state.totalFailures++;
    throw new Error('Key ' + payload.keyId + ' has been revoked');
  }
  const plaintext = state.backend.decrypt(entry.keyMaterial, payload.ciphertext, payload.nonce);
  state.totalDecryptions++;
  return { plaintext, keyId: payload.keyId };
}

// ─── Queries ────────────────────────────────────────────────────────

function getKeyImpl(state: ServiceState, keyId: string): EncryptionKey | undefined {
  const entry = state.keys.get(keyId);
  return entry !== undefined ? toReadonlyKey(entry) : undefined;
}

function listKeysImpl(state: ServiceState): ReadonlyArray<EncryptionKey> {
  const result: EncryptionKey[] = [];
  for (const entry of state.keys.values()) {
    if (!entry.revoked) {
      result.push(toReadonlyKey(entry));
    }
  }
  return result;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ServiceState): EncryptionStats {
  return {
    keyCount: state.keys.size,
    activeKeyId: state.activeKeyId,
    totalEncryptions: state.totalEncryptions,
    totalDecryptions: state.totalDecryptions,
    totalFailures: state.totalFailures,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonlyKey(entry: KeyEntry): EncryptionKey {
  return {
    keyId: entry.keyId,
    algorithm: entry.algorithm,
    createdAt: entry.createdAt,
    active: entry.active,
  };
}
