/**
 * Encryption Service — Symmetric encryption, hashing, HMAC, key derivation.
 *
 * Features:
 *   - Symmetric encryption (AES-256-GCM simulation via backend port)
 *   - Key derivation (PBKDF2-style via backend port)
 *   - Hash generation (SHA-256 via backend port)
 *   - HMAC generation and verification
 *   - Token generation (random bytes -> hex string)
 *   - Key rotation support
 *   - Envelope encryption (data key wrapped by master key)
 *
 * All crypto operations delegated to a EncryptBackend port for
 * testability and backend flexibility.
 *
 * "The Dye House guards every secret woven into The Loom."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface EncryptResult {
  readonly keyId: string;
  readonly ciphertext: string;
  readonly nonce: string;
  readonly algorithm: string;
}

export interface DecryptResult {
  readonly plaintext: string;
  readonly keyId: string;
}

export interface HashResult {
  readonly hash: string;
  readonly algorithm: string;
}

export interface HmacResult {
  readonly hmac: string;
  readonly algorithm: string;
}

export interface DerivedKeyResult {
  readonly derivedKey: string;
  readonly salt: string;
  readonly iterations: number;
}

export interface EnvelopeEncryptResult {
  readonly encryptedDataKey: string;
  readonly encryptedData: string;
  readonly dataKeyNonce: string;
  readonly dataNonce: string;
  readonly masterKeyId: string;
}

export interface ManagedKey {
  readonly keyId: string;
  readonly algorithm: string;
  readonly createdAt: number;
  readonly active: boolean;
  readonly version: number;
}

export interface EncryptServiceStats {
  readonly keyCount: number;
  readonly activeKeyId: string | null;
  readonly totalEncryptions: number;
  readonly totalDecryptions: number;
  readonly totalHashes: number;
  readonly totalHmacs: number;
  readonly totalFailures: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface EncryptBackend {
  readonly encrypt: (key: string, plaintext: string, nonce: string) => string;
  readonly decrypt: (key: string, ciphertext: string, nonce: string) => string;
  readonly hash: (data: string) => string;
  readonly hmac: (key: string, data: string) => string;
  readonly deriveKey: (password: string, salt: string, iterations: number) => string;
  readonly generateNonce: () => string;
  readonly generateSalt: () => string;
  readonly generateRandomHex: (bytes: number) => string;
}

export interface EncryptServiceDeps {
  readonly backend: EncryptBackend;
  readonly clock: { nowMilliseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface EncryptService {
  readonly registerKey: (keyId: string, keyMaterial: string, algorithm?: string) => ManagedKey;
  readonly setActiveKey: (keyId: string) => boolean;
  readonly rotateKey: (keyId: string, newKeyMaterial: string) => ManagedKey;
  readonly revokeKey: (keyId: string) => boolean;
  readonly encrypt: (plaintext: string) => EncryptResult;
  readonly decrypt: (payload: EncryptResult) => DecryptResult;
  readonly hashData: (data: string) => HashResult;
  readonly createHmac: (data: string, keyId?: string) => HmacResult;
  readonly verifyHmac: (data: string, hmac: string, keyId?: string) => boolean;
  readonly deriveKey: (password: string, iterations?: number) => DerivedKeyResult;
  readonly generateToken: (byteLength?: number) => string;
  readonly envelopeEncrypt: (plaintext: string) => EnvelopeEncryptResult;
  readonly envelopeDecrypt: (envelope: EnvelopeEncryptResult) => DecryptResult;
  readonly getKey: (keyId: string) => ManagedKey | undefined;
  readonly listKeys: () => ReadonlyArray<ManagedKey>;
  readonly getStats: () => EncryptServiceStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface KeyEntry {
  readonly keyId: string;
  keyMaterial: string;
  readonly algorithm: string;
  readonly createdAt: number;
  active: boolean;
  revoked: boolean;
  version: number;
}

interface ServiceState {
  readonly keys: Map<string, KeyEntry>;
  readonly backend: EncryptBackend;
  readonly clock: { nowMilliseconds(): number };
  activeKeyId: string | null;
  totalEncryptions: number;
  totalDecryptions: number;
  totalHashes: number;
  totalHmacs: number;
  totalFailures: number;
}

// ─── Factory ────────────────────────────────────────────────────────

function initState(deps: EncryptServiceDeps): ServiceState {
  return {
    keys: new Map(),
    backend: deps.backend,
    clock: deps.clock,
    activeKeyId: null,
    totalEncryptions: 0,
    totalDecryptions: 0,
    totalHashes: 0,
    totalHmacs: 0,
    totalFailures: 0,
  };
}

export function createEncryptService(deps: EncryptServiceDeps): EncryptService {
  const state = initState(deps);
  return {
    registerKey: (kid, km, alg) => registerKeyImpl(state, kid, km, alg),
    setActiveKey: (kid) => setActiveImpl(state, kid),
    rotateKey: (kid, nkm) => rotateKeyImpl(state, kid, nkm),
    revokeKey: (kid) => revokeKeyImpl(state, kid),
    encrypt: (pt) => encryptImpl(state, pt),
    decrypt: (payload) => decryptImpl(state, payload),
    hashData: (data) => hashImpl(state, data),
    createHmac: (data, kid) => hmacImpl(state, data, kid),
    verifyHmac: (data, hmac, kid) => verifyHmacImpl(state, data, hmac, kid),
    deriveKey: (pw, iters) => deriveImpl(state, pw, iters),
    generateToken: (bytes) => state.backend.generateRandomHex(bytes ?? 32),
    envelopeEncrypt: (pt) => envelopeEncryptImpl(state, pt),
    envelopeDecrypt: (env) => envelopeDecryptImpl(state, env),
    getKey: (kid) => getKeyImpl(state, kid),
    listKeys: () => listKeysImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Key Management ─────────────────────────────────────────────────

function registerKeyImpl(
  state: ServiceState,
  keyId: string,
  keyMaterial: string,
  algorithm?: string,
): ManagedKey {
  if (state.keys.has(keyId)) {
    throw new Error('Key ' + keyId + ' already registered');
  }
  const entry: KeyEntry = {
    keyId,
    keyMaterial,
    algorithm: algorithm ?? 'aes-256-gcm',
    createdAt: state.clock.nowMilliseconds(),
    active: false,
    revoked: false,
    version: 1,
  };
  state.keys.set(keyId, entry);
  if (state.activeKeyId === null) {
    entry.active = true;
    state.activeKeyId = keyId;
  }
  return toManagedKey(entry);
}

function setActiveImpl(state: ServiceState, keyId: string): boolean {
  const entry = state.keys.get(keyId);
  if (entry === undefined || entry.revoked) return false;
  deactivateAll(state);
  entry.active = true;
  state.activeKeyId = keyId;
  return true;
}

function rotateKeyImpl(state: ServiceState, keyId: string, newKeyMaterial: string): ManagedKey {
  const entry = state.keys.get(keyId);
  if (entry === undefined) {
    throw new Error('Key ' + keyId + ' not found');
  }
  entry.keyMaterial = newKeyMaterial;
  entry.version += 1;
  return toManagedKey(entry);
}

function revokeKeyImpl(state: ServiceState, keyId: string): boolean {
  const entry = state.keys.get(keyId);
  if (entry === undefined || entry.revoked) return false;
  entry.revoked = true;
  entry.active = false;
  if (state.activeKeyId === keyId) state.activeKeyId = null;
  return true;
}

function deactivateAll(state: ServiceState): void {
  for (const e of state.keys.values()) e.active = false;
}

// ─── Encrypt / Decrypt ──────────────────────────────────────────────

function encryptImpl(state: ServiceState, plaintext: string): EncryptResult {
  const entry = getActiveKey(state);
  const nonce = state.backend.generateNonce();
  const ciphertext = state.backend.encrypt(entry.keyMaterial, plaintext, nonce);
  state.totalEncryptions += 1;
  return { keyId: entry.keyId, ciphertext, nonce, algorithm: entry.algorithm };
}

function decryptImpl(state: ServiceState, payload: EncryptResult): DecryptResult {
  const entry = state.keys.get(payload.keyId);
  if (entry === undefined) {
    state.totalFailures += 1;
    throw new Error('Key ' + payload.keyId + ' not found');
  }
  if (entry.revoked) {
    state.totalFailures += 1;
    throw new Error('Key ' + payload.keyId + ' has been revoked');
  }
  const plaintext = state.backend.decrypt(entry.keyMaterial, payload.ciphertext, payload.nonce);
  state.totalDecryptions += 1;
  return { plaintext, keyId: payload.keyId };
}

// ─── Hash ───────────────────────────────────────────────────────────

function hashImpl(state: ServiceState, data: string): HashResult {
  const hash = state.backend.hash(data);
  state.totalHashes += 1;
  return { hash, algorithm: 'sha-256' };
}

// ─── HMAC ───────────────────────────────────────────────────────────

function hmacImpl(state: ServiceState, data: string, keyId?: string): HmacResult {
  const entry = keyId !== undefined ? getKeyOrThrow(state, keyId) : getActiveKey(state);
  const hmac = state.backend.hmac(entry.keyMaterial, data);
  state.totalHmacs += 1;
  return { hmac, algorithm: 'hmac-sha-256' };
}

function verifyHmacImpl(state: ServiceState, data: string, hmac: string, keyId?: string): boolean {
  const result = hmacImpl(state, data, keyId);
  return result.hmac === hmac;
}

// ─── Key Derivation ─────────────────────────────────────────────────

function deriveImpl(state: ServiceState, password: string, iterations?: number): DerivedKeyResult {
  const salt = state.backend.generateSalt();
  const iters = iterations ?? 100000;
  const derivedKey = state.backend.deriveKey(password, salt, iters);
  return { derivedKey, salt, iterations: iters };
}

// ─── Envelope Encryption ────────────────────────────────────────────

function envelopeEncryptImpl(state: ServiceState, plaintext: string): EnvelopeEncryptResult {
  const masterEntry = getActiveKey(state);
  const dataKey = state.backend.generateRandomHex(32);
  const dataNonce = state.backend.generateNonce();
  const encryptedData = state.backend.encrypt(dataKey, plaintext, dataNonce);
  const dataKeyNonce = state.backend.generateNonce();
  const encryptedDataKey = state.backend.encrypt(masterEntry.keyMaterial, dataKey, dataKeyNonce);
  state.totalEncryptions += 1;

  return {
    encryptedDataKey,
    encryptedData,
    dataKeyNonce,
    dataNonce,
    masterKeyId: masterEntry.keyId,
  };
}

function envelopeDecryptImpl(state: ServiceState, envelope: EnvelopeEncryptResult): DecryptResult {
  const masterEntry = state.keys.get(envelope.masterKeyId);
  if (masterEntry === undefined) {
    state.totalFailures += 1;
    throw new Error('Master key ' + envelope.masterKeyId + ' not found');
  }
  if (masterEntry.revoked) {
    state.totalFailures += 1;
    throw new Error('Master key ' + envelope.masterKeyId + ' revoked');
  }
  const dataKey = state.backend.decrypt(
    masterEntry.keyMaterial,
    envelope.encryptedDataKey,
    envelope.dataKeyNonce,
  );
  const plaintext = state.backend.decrypt(dataKey, envelope.encryptedData, envelope.dataNonce);
  state.totalDecryptions += 1;
  return { plaintext, keyId: envelope.masterKeyId };
}

// ─── Queries ────────────────────────────────────────────────────────

function getKeyImpl(state: ServiceState, keyId: string): ManagedKey | undefined {
  const entry = state.keys.get(keyId);
  return entry !== undefined ? toManagedKey(entry) : undefined;
}

function listKeysImpl(state: ServiceState): ReadonlyArray<ManagedKey> {
  const result: ManagedKey[] = [];
  for (const e of state.keys.values()) {
    if (!e.revoked) result.push(toManagedKey(e));
  }
  return result;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ServiceState): EncryptServiceStats {
  return {
    keyCount: state.keys.size,
    activeKeyId: state.activeKeyId,
    totalEncryptions: state.totalEncryptions,
    totalDecryptions: state.totalDecryptions,
    totalHashes: state.totalHashes,
    totalHmacs: state.totalHmacs,
    totalFailures: state.totalFailures,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function getActiveKey(state: ServiceState): KeyEntry {
  if (state.activeKeyId === null) {
    state.totalFailures += 1;
    throw new Error('No active encryption key');
  }
  const entry = state.keys.get(state.activeKeyId);
  if (entry === undefined) {
    state.totalFailures += 1;
    throw new Error('Active key entry missing');
  }
  return entry;
}

function getKeyOrThrow(state: ServiceState, keyId: string): KeyEntry {
  const entry = state.keys.get(keyId);
  if (entry === undefined) {
    throw new Error('Key ' + keyId + ' not found');
  }
  return entry;
}

function toManagedKey(e: KeyEntry): ManagedKey {
  return {
    keyId: e.keyId,
    algorithm: e.algorithm,
    createdAt: e.createdAt,
    active: e.active,
    version: e.version,
  };
}
