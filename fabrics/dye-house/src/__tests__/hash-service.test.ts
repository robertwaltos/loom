import { describe, it, expect } from 'vitest';
import {
  createHashService,
  createSimpleHashBackend,
} from '../hash-service.js';
import type { HashBackend } from '../hash-service.js';

function makeService(backend?: HashBackend) {
  return createHashService({
    backend: backend ?? createSimpleHashBackend(),
  });
}

describe('HashService — hash', () => {
  it('produces a hex hash string', () => {
    const svc = makeService();
    const result = svc.hash('hello world');
    expect(result.hex).toBeTruthy();
    expect(result.hex.length).toBeGreaterThan(0);
  });

  it('produces deterministic output', () => {
    const svc = makeService();
    const a = svc.hash('test data');
    const b = svc.hash('test data');
    expect(a.hex).toBe(b.hex);
  });

  it('produces different hashes for different inputs', () => {
    const svc = makeService();
    const a = svc.hash('input-a');
    const b = svc.hash('input-b');
    expect(a.hex).not.toBe(b.hex);
  });

  it('includes byte array in result', () => {
    const svc = makeService();
    const result = svc.hash('data');
    expect(result.bytes.length).toBeGreaterThan(0);
    for (const b of result.bytes) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });
});

describe('HashService — hashMultiple', () => {
  it('hashes multiple parts together', () => {
    const svc = makeService();
    const combined = svc.hashMultiple(['part-a', 'part-b', 'part-c']);
    expect(combined.hex).toBeTruthy();
  });

  it('different part orders produce different hashes', () => {
    const svc = makeService();
    const ab = svc.hashMultiple(['a', 'b']);
    const ba = svc.hashMultiple(['b', 'a']);
    expect(ab.hex).not.toBe(ba.hex);
  });

  it('differs from single-string hash of joined parts', () => {
    const svc = makeService();
    const multi = svc.hashMultiple(['hello', 'world']);
    const single = svc.hash('helloworld');
    expect(multi.hex).not.toBe(single.hex);
  });
});

describe('HashService — HMAC sign/verify', () => {
  it('signs data with a key', () => {
    const svc = makeService();
    const result = svc.hmacSign('secret-key', 'message');
    expect(result.signature).toBeTruthy();
    expect(result.algorithm).toBe('hmac-sha256');
  });

  it('verifies correct signature', () => {
    const svc = makeService();
    const signed = svc.hmacSign('secret-key', 'message');
    const valid = svc.hmacVerify('secret-key', 'message', signed.signature);
    expect(valid).toBe(true);
  });

  it('rejects incorrect signature', () => {
    const svc = makeService();
    const valid = svc.hmacVerify('secret-key', 'message', 'bad-signature');
    expect(valid).toBe(false);
  });

  it('rejects signature with wrong key', () => {
    const svc = makeService();
    const signed = svc.hmacSign('key-a', 'message');
    const valid = svc.hmacVerify('key-b', 'message', signed.signature);
    expect(valid).toBe(false);
  });

  it('rejects signature with tampered data', () => {
    const svc = makeService();
    const signed = svc.hmacSign('key', 'original');
    const valid = svc.hmacVerify('key', 'tampered', signed.signature);
    expect(valid).toBe(false);
  });

  it('different keys produce different signatures', () => {
    const svc = makeService();
    const a = svc.hmacSign('key-a', 'message');
    const b = svc.hmacSign('key-b', 'message');
    expect(a.signature).not.toBe(b.signature);
  });
});

describe('HashService — key derivation', () => {
  it('derives a key from password and salt', () => {
    const svc = makeService();
    const result = svc.deriveKey('password', 'salt', 100);
    expect(result.derivedKey).toBeTruthy();
    expect(result.salt).toBe('salt');
    expect(result.iterations).toBe(100);
  });

  it('produces deterministic output', () => {
    const svc = makeService();
    const a = svc.deriveKey('password', 'salt', 100);
    const b = svc.deriveKey('password', 'salt', 100);
    expect(a.derivedKey).toBe(b.derivedKey);
  });

  it('different salts produce different keys', () => {
    const svc = makeService();
    const a = svc.deriveKey('password', 'salt-a', 100);
    const b = svc.deriveKey('password', 'salt-b', 100);
    expect(a.derivedKey).not.toBe(b.derivedKey);
  });

  it('more iterations produce different keys', () => {
    const svc = makeService();
    const a = svc.deriveKey('password', 'salt', 10);
    const b = svc.deriveKey('password', 'salt', 20);
    expect(a.derivedKey).not.toBe(b.derivedKey);
  });
});

describe('HashService — chain hash', () => {
  it('chains previous hash with new data', () => {
    const svc = makeService();
    const first = svc.hash('genesis');
    const chained = svc.chainHash(first.hex, 'block-1');
    expect(chained.hex).toBeTruthy();
    expect(chained.hex).not.toBe(first.hex);
  });

  it('produces deterministic chains', () => {
    const svc = makeService();
    const first = svc.hash('genesis');
    const a = svc.chainHash(first.hex, 'data');
    const b = svc.chainHash(first.hex, 'data');
    expect(a.hex).toBe(b.hex);
  });

  it('different previous hashes produce different results', () => {
    const svc = makeService();
    const hashA = svc.hash('genesis-a');
    const hashB = svc.hash('genesis-b');
    const chainA = svc.chainHash(hashA.hex, 'same-data');
    const chainB = svc.chainHash(hashB.hex, 'same-data');
    expect(chainA.hex).not.toBe(chainB.hex);
  });
});

describe('SimpleHashBackend — constant time comparison', () => {
  it('returns true for identical strings', () => {
    const backend = createSimpleHashBackend();
    expect(backend.constantTimeEquals('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings', () => {
    const backend = createSimpleHashBackend();
    expect(backend.constantTimeEquals('abc', 'def')).toBe(false);
  });

  it('returns false for different lengths', () => {
    const backend = createSimpleHashBackend();
    expect(backend.constantTimeEquals('abc', 'abcd')).toBe(false);
  });
});
