import { describe, it, expect } from 'vitest';
import { createEncryptService } from '../encrypt-service.js';
import type { EncryptService, EncryptBackend, EncryptServiceDeps } from '../encrypt-service.js';

// ─── Mock Backend ───────────────────────────────────────────────────

function createMockBackend(): EncryptBackend {
  let nonceCounter = 0;
  let saltCounter = 0;
  return {
    encrypt: (key, plaintext, nonce) => 'enc(' + key + ',' + plaintext + ',' + nonce + ')',
    decrypt: (key, ciphertext, nonce) => {
      const match = ciphertext.match(/^enc\(([^,]+),([^,]+),([^)]+)\)$/);
      if (match !== null && match[1] === key && match[3] === nonce) return match[2] ?? '';
      throw new Error('decryption failed');
    },
    hash: (data) => 'hash(' + data + ')',
    hmac: (key, data) => 'hmac(' + key + ',' + data + ')',
    deriveKey: (pw, salt, iters) => 'derived(' + pw + ',' + salt + ',' + String(iters) + ')',
    generateNonce: () => {
      nonceCounter += 1;
      return 'nonce-' + String(nonceCounter);
    },
    generateSalt: () => {
      saltCounter += 1;
      return 'salt-' + String(saltCounter);
    },
    generateRandomHex: (bytes) => 'random-' + String(bytes),
  };
}

function createTestService(): EncryptService {
  const deps: EncryptServiceDeps = {
    backend: createMockBackend(),
    clock: { nowMilliseconds: () => 1000 },
  };
  return createEncryptService(deps);
}

// ─── Key Management ─────────────────────────────────────────────────

describe('EncryptService key management', () => {
  it('registers a key', () => {
    const svc = createTestService();
    const key = svc.registerKey('key-1', 'material-1');
    expect(key.keyId).toBe('key-1');
    expect(key.active).toBe(true);
  });

  it('first registered key becomes active', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'material-1');
    const stats = svc.getStats();
    expect(stats.activeKeyId).toBe('key-1');
  });

  it('second key does not auto-activate', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'material-1');
    const key2 = svc.registerKey('key-2', 'material-2');
    expect(key2.active).toBe(false);
  });

  it('throws on duplicate key registration', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'material-1');
    expect(() => svc.registerKey('key-1', 'dup')).toThrow('already registered');
  });

  it('sets active key', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'material-1');
    svc.registerKey('key-2', 'material-2');
    expect(svc.setActiveKey('key-2')).toBe(true);
    expect(svc.getStats().activeKeyId).toBe('key-2');
  });

  it('revokes a key', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'material-1');
    svc.registerKey('key-2', 'material-2');
    svc.setActiveKey('key-2');
    expect(svc.revokeKey('key-1')).toBe(true);
    const keys = svc.listKeys();
    const revokedInList = keys.find((k) => k.keyId === 'key-1');
    expect(revokedInList).toBeUndefined();
  });

  it('cannot set revoked key as active', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'material-1');
    svc.revokeKey('key-1');
    expect(svc.setActiveKey('key-1')).toBe(false);
  });
});

// ─── Encryption / Decryption ────────────────────────────────────────

describe('EncryptService encrypt and decrypt', () => {
  it('encrypts and decrypts successfully', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret');
    const encrypted = svc.encrypt('hello world');
    const decrypted = svc.decrypt(encrypted);
    expect(decrypted.plaintext).toBe('hello world');
  });

  it('encryption uses active key', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret1');
    svc.registerKey('key-2', 'secret2');
    svc.setActiveKey('key-2');
    const encrypted = svc.encrypt('test');
    expect(encrypted.keyId).toBe('key-2');
  });

  it('throws on encrypt without active key', () => {
    const svc = createTestService();
    expect(() => svc.encrypt('hello')).toThrow('No active encryption key');
  });

  it('throws on decrypt with unknown key', () => {
    const svc = createTestService();
    expect(() =>
      svc.decrypt({
        keyId: 'unknown',
        ciphertext: 'data',
        nonce: 'n',
        algorithm: 'aes-256-gcm',
      }),
    ).toThrow('not found');
  });

  it('throws on decrypt with revoked key', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret');
    const encrypted = svc.encrypt('test');
    svc.registerKey('key-2', 'secret2');
    svc.setActiveKey('key-2');
    svc.revokeKey('key-1');
    expect(() => svc.decrypt(encrypted)).toThrow('revoked');
  });
});

// ─── Hashing ────────────────────────────────────────────────────────

describe('EncryptService hashing', () => {
  it('generates hash', () => {
    const svc = createTestService();
    const result = svc.hashData('some data');
    expect(result.hash).toBe('hash(some data)');
    expect(result.algorithm).toBe('sha-256');
  });

  it('tracks hash count in stats', () => {
    const svc = createTestService();
    svc.hashData('a');
    svc.hashData('b');
    expect(svc.getStats().totalHashes).toBe(2);
  });
});

// ─── HMAC ───────────────────────────────────────────────────────────

describe('EncryptService HMAC', () => {
  it('creates HMAC using active key', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret');
    const result = svc.createHmac('data');
    expect(result.hmac).toBe('hmac(secret,data)');
  });

  it('verifies valid HMAC', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret');
    const result = svc.createHmac('data');
    expect(svc.verifyHmac('data', result.hmac)).toBe(true);
  });

  it('rejects invalid HMAC', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret');
    expect(svc.verifyHmac('data', 'wrong-hmac')).toBe(false);
  });

  it('creates HMAC with specific key', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret1');
    svc.registerKey('key-2', 'secret2');
    const result = svc.createHmac('data', 'key-2');
    expect(result.hmac).toBe('hmac(secret2,data)');
  });
});

// ─── Key Derivation ─────────────────────────────────────────────────

describe('EncryptService key derivation', () => {
  it('derives a key from password', () => {
    const svc = createTestService();
    const result = svc.deriveKey('password123');
    expect(result.derivedKey).toContain('derived');
    expect(result.salt).toContain('salt');
    expect(result.iterations).toBe(100000);
  });

  it('accepts custom iteration count', () => {
    const svc = createTestService();
    const result = svc.deriveKey('password', 50000);
    expect(result.iterations).toBe(50000);
  });
});

// ─── Token Generation ───────────────────────────────────────────────

describe('EncryptService token generation', () => {
  it('generates random hex token', () => {
    const svc = createTestService();
    const token = svc.generateToken(16);
    expect(token).toBe('random-16');
  });

  it('defaults to 32 bytes', () => {
    const svc = createTestService();
    const token = svc.generateToken();
    expect(token).toBe('random-32');
  });
});

// ─── Key Rotation ───────────────────────────────────────────────────

describe('EncryptService key rotation', () => {
  it('rotates key material', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'old-material');
    const rotated = svc.rotateKey('key-1', 'new-material');
    expect(rotated.version).toBe(2);
  });

  it('throws rotating nonexistent key', () => {
    const svc = createTestService();
    expect(() => svc.rotateKey('nonexistent', 'new')).toThrow('not found');
  });
});

// ─── Envelope Encryption ────────────────────────────────────────────

describe('EncryptService envelope encryption', () => {
  it('envelope encrypts and decrypts', () => {
    const svc = createTestService();
    svc.registerKey('master', 'master-secret');
    const envelope = svc.envelopeEncrypt('sensitive data');
    expect(envelope.masterKeyId).toBe('master');
    const decrypted = svc.envelopeDecrypt(envelope);
    expect(decrypted.plaintext).toBe('sensitive data');
  });

  it('throws envelope decrypt with unknown master key', () => {
    const svc = createTestService();
    svc.registerKey('master', 'secret');
    const envelope = svc.envelopeEncrypt('data');
    svc.registerKey('master2', 'secret2');
    svc.setActiveKey('master2');
    svc.revokeKey('master');
    expect(() => svc.envelopeDecrypt(envelope)).toThrow('revoked');
  });
});

// ─── Stats ──────────────────────────────────────────────────────────

describe('EncryptService stats', () => {
  it('tracks all operation counts', () => {
    const svc = createTestService();
    svc.registerKey('key-1', 'secret');
    svc.encrypt('a');
    svc.hashData('b');
    svc.createHmac('c');
    const stats = svc.getStats();
    expect(stats.totalEncryptions).toBe(1);
    expect(stats.totalHashes).toBe(1);
    expect(stats.totalHmacs).toBe(1);
    expect(stats.keyCount).toBe(1);
  });
});
