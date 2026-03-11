/**
 * Hash Service — Cryptographic hashing and HMAC signing.
 *
 * The Dye House needs to verify data integrity, sign tokens, and
 * produce tamper-evident hashes for audit logs and chronicles.
 *
 * This service wraps raw hashing behind a port-based interface
 * so implementations can swap between Web Crypto, Node crypto,
 * or hardware-accelerated backends.
 *
 * Operations:
 *   - hash: SHA-256 digest of arbitrary data
 *   - hmacSign: HMAC-SHA256 signature with a secret key
 *   - hmacVerify: Constant-time HMAC verification
 *   - deriveKey: Simple key derivation from password + salt
 *
 * All operations are synchronous for game-loop compatibility.
 * Async Web Crypto can be wrapped by the adapter layer.
 *
 * "The Dye House marks each thread. The mark cannot be forged."
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface HashResult {
  readonly hex: string;
  readonly bytes: ReadonlyArray<number>;
}

export interface HmacResult {
  readonly signature: string;
  readonly algorithm: string;
}

export interface KeyDerivation {
  readonly derivedKey: string;
  readonly salt: string;
  readonly iterations: number;
}

// ─── Port Interface ─────────────────────────────────────────────────

export interface HashBackend {
  sha256(data: string): string;
  hmacSha256(key: string, data: string): string;
  constantTimeEquals(a: string, b: string): boolean;
}

export interface HashServiceDeps {
  readonly backend: HashBackend;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface HashService {
  hash(data: string): HashResult;
  hashMultiple(parts: ReadonlyArray<string>): HashResult;
  hmacSign(key: string, data: string): HmacResult;
  hmacVerify(key: string, data: string, signature: string): boolean;
  deriveKey(password: string, salt: string, iterations: number): KeyDerivation;
  chainHash(previousHash: string, data: string): HashResult;
}

// ─── State ──────────────────────────────────────────────────────────

interface ServiceState {
  readonly deps: HashServiceDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createHashService(deps: HashServiceDeps): HashService {
  const state: ServiceState = { deps };

  return {
    hash: (d) => hashImpl(state, d),
    hashMultiple: (p) => hashMultipleImpl(state, p),
    hmacSign: (k, d) => hmacSignImpl(state, k, d),
    hmacVerify: (k, d, s) => hmacVerifyImpl(state, k, d, s),
    deriveKey: (pw, s, i) => deriveKeyImpl(state, pw, s, i),
    chainHash: (prev, d) => chainHashImpl(state, prev, d),
  };
}

// ─── Hash ───────────────────────────────────────────────────────────

function hashImpl(state: ServiceState, data: string): HashResult {
  const hex = state.deps.backend.sha256(data);
  return { hex, bytes: hexToBytes(hex) };
}

function hashMultipleImpl(state: ServiceState, parts: ReadonlyArray<string>): HashResult {
  const combined = parts.join('\x00');
  return hashImpl(state, combined);
}

// ─── HMAC ───────────────────────────────────────────────────────────

function hmacSignImpl(state: ServiceState, key: string, data: string): HmacResult {
  const signature = state.deps.backend.hmacSha256(key, data);
  return { signature, algorithm: 'hmac-sha256' };
}

function hmacVerifyImpl(
  state: ServiceState,
  key: string,
  data: string,
  signature: string,
): boolean {
  const expected = state.deps.backend.hmacSha256(key, data);
  return state.deps.backend.constantTimeEquals(expected, signature);
}

// ─── Key Derivation ─────────────────────────────────────────────────

function deriveKeyImpl(
  state: ServiceState,
  password: string,
  salt: string,
  iterations: number,
): KeyDerivation {
  let current = password + salt;
  for (let i = 0; i < iterations; i++) {
    current = state.deps.backend.sha256(current);
  }
  return { derivedKey: current, salt, iterations };
}

// ─── Chain Hash ─────────────────────────────────────────────────────

function chainHashImpl(state: ServiceState, previousHash: string, data: string): HashResult {
  const combined = previousHash + '\x01' + data;
  return hashImpl(state, combined);
}

// ─── Helpers ────────────────────────────────────────────────────────

function hexToBytes(hex: string): ReadonlyArray<number> {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

// ─── Simple Hash Backend (for testing/dev) ──────────────────────────

/**
 * A deterministic hash backend using a simple FNV-1a-like algorithm.
 * NOT cryptographically secure — use only for testing and development.
 * Production should inject a Web Crypto or Node crypto adapter.
 */
export function createSimpleHashBackend(): HashBackend {
  return {
    sha256: (data) => simpleHash(data),
    hmacSha256: (key, data) => simpleHash(key + '\x00' + data),
    constantTimeEquals: (a, b) => constantTimeCompare(a, b),
  };
}

function simpleHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x811c9dc5);
  }

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = (Math.imul(h1, h2) >>> 0).toString(16).padStart(8, '0');

  return part1 + part2 + part3 + part4 + part1 + part2 + part3 + part4;
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
