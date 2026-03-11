import { describe, it, expect } from 'vitest';
import { createEncryptionService } from '../encryption-service.js';
import type { EncryptionServiceDeps, EncryptionBackend } from '../encryption-service.js';

function makeBackend(): EncryptionBackend {
  let nonceCounter = 0;
  return {
    encrypt: (key, plaintext, nonce) => 'enc:' + key + ':' + nonce + ':' + plaintext,
    decrypt: (_key, ciphertext, _nonce) => {
      const parts = ciphertext.split(':');
      return parts[3] ?? '';
    },
    generateNonce: () => 'nonce-' + String(++nonceCounter),
  };
}

function makeDeps(overrides?: Partial<EncryptionServiceDeps>): EncryptionServiceDeps {
  let time = 1_000_000;
  return {
    backend: makeBackend(),
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('EncryptionService — key management', () => {
  it('registers a key', () => {
    const svc = createEncryptionService(makeDeps());
    const key = svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    expect(key.keyId).toBe('k-1');
    expect(key.algorithm).toBe('aes-256-gcm');
  });

  it('first registered key becomes active', () => {
    const svc = createEncryptionService(makeDeps());
    const key = svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    expect(key.active).toBe(true);
  });

  it('second key is not auto-activated', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const key2 = svc.registerKey({ keyId: 'k-2', keyMaterial: 'secret-2' });
    expect(key2.active).toBe(false);
  });

  it('rejects duplicate key id', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    expect(() => svc.registerKey({ keyId: 'k-1', keyMaterial: 'x' })).toThrow('already registered');
  });

  it('sets active key', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    svc.registerKey({ keyId: 'k-2', keyMaterial: 'secret-2' });
    expect(svc.setActiveKey('k-2')).toBe(true);
    const k1 = svc.getKey('k-1');
    const k2 = svc.getKey('k-2');
    expect(k1?.active).toBe(false);
    expect(k2?.active).toBe(true);
  });

  it('returns false for unknown key activation', () => {
    const svc = createEncryptionService(makeDeps());
    expect(svc.setActiveKey('unknown')).toBe(false);
  });
});

describe('EncryptionService — key revocation', () => {
  it('revokes a key', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    expect(svc.revokeKey('k-1')).toBe(true);
    expect(svc.getStats().activeKeyId).toBeNull();
  });

  it('revoked key not listed', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    svc.revokeKey('k-1');
    expect(svc.listKeys()).toHaveLength(0);
  });

  it('cannot activate revoked key', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    svc.revokeKey('k-1');
    expect(svc.setActiveKey('k-1')).toBe(false);
  });

  it('returns false for unknown key revocation', () => {
    const svc = createEncryptionService(makeDeps());
    expect(svc.revokeKey('unknown')).toBe(false);
  });
});

describe('EncryptionService — encrypt', () => {
  it('encrypts with active key', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const payload = svc.encrypt('hello world');
    expect(payload.keyId).toBe('k-1');
    expect(payload.ciphertext).toContain('enc:');
    expect(payload.nonce).toContain('nonce-');
    expect(payload.algorithm).toBe('aes-256-gcm');
  });

  it('throws when no active key', () => {
    const svc = createEncryptionService(makeDeps());
    expect(() => svc.encrypt('hello')).toThrow('No active encryption key');
  });

  it('uses unique nonces per encryption', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const p1 = svc.encrypt('a');
    const p2 = svc.encrypt('b');
    expect(p1.nonce).not.toBe(p2.nonce);
  });
});

describe('EncryptionService — decrypt', () => {
  it('decrypts a payload', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const encrypted = svc.encrypt('sensitive data');
    const decrypted = svc.decrypt(encrypted);
    expect(decrypted.plaintext).toBe('sensitive data');
    expect(decrypted.keyId).toBe('k-1');
  });

  it('decrypts with non-active key', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const encrypted = svc.encrypt('data');
    svc.registerKey({ keyId: 'k-2', keyMaterial: 'secret-2' });
    svc.setActiveKey('k-2');
    const decrypted = svc.decrypt(encrypted);
    expect(decrypted.plaintext).toBe('data');
  });

  it('throws for unknown key id', () => {
    const svc = createEncryptionService(makeDeps());
    const payload = { keyId: 'missing', ciphertext: 'x', nonce: 'n', algorithm: 'aes' };
    expect(() => svc.decrypt(payload)).toThrow('not found');
  });

  it('throws for revoked key', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const encrypted = svc.encrypt('data');
    svc.revokeKey('k-1');
    expect(() => svc.decrypt(encrypted)).toThrow('revoked');
  });
});

describe('EncryptionService — stats', () => {
  it('tracks encryption and decryption counts', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret-1' });
    const p = svc.encrypt('data');
    svc.decrypt(p);
    const stats = svc.getStats();
    expect(stats.totalEncryptions).toBe(1);
    expect(stats.totalDecryptions).toBe(1);
    expect(stats.keyCount).toBe(1);
    expect(stats.activeKeyId).toBe('k-1');
  });

  it('tracks failure count', () => {
    const svc = createEncryptionService(makeDeps());
    try {
      svc.encrypt('data');
    } catch {
      /* expected */
    }
    expect(svc.getStats().totalFailures).toBe(1);
  });

  it('starts with zero stats', () => {
    const svc = createEncryptionService(makeDeps());
    const stats = svc.getStats();
    expect(stats.keyCount).toBe(0);
    expect(stats.totalEncryptions).toBe(0);
    expect(stats.activeKeyId).toBeNull();
  });
});

describe('EncryptionService — custom algorithm', () => {
  it('uses custom algorithm from registration', () => {
    const svc = createEncryptionService(makeDeps());
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret', algorithm: 'chacha20-poly1305' });
    const payload = svc.encrypt('test');
    expect(payload.algorithm).toBe('chacha20-poly1305');
  });

  it('uses default algorithm override from deps', () => {
    const svc = createEncryptionService(makeDeps({ defaultAlgorithm: 'aes-128-gcm' }));
    svc.registerKey({ keyId: 'k-1', keyMaterial: 'secret' });
    const key = svc.getKey('k-1');
    expect(key?.algorithm).toBe('aes-128-gcm');
  });
});
