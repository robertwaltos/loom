import { describe, it, expect } from 'vitest';
import { createKeyRotationSystem } from '../key-rotation-system.js';
import type { KeyRotationSystem, CryptoKey, ValidAlgorithm } from '../key-rotation-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): {
  system: KeyRotationSystem;
  advanceTime: (us: bigint) => void;
  getNow: () => bigint;
} {
  let now = 1_000_000n;
  return {
    system: createKeyRotationSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'id-' + String(++idCounter) },
      logger: { info: () => undefined, warn: () => undefined },
    }),
    advanceTime: (us: bigint) => {
      now += us;
    },
    getNow: () => now,
  };
}

function asKey(r: CryptoKey | string): CryptoKey {
  if (typeof r === 'string') throw new Error('Expected CryptoKey, got error: ' + r);
  return r;
}

// ─── generateKey ─────────────────────────────────────────────────────────────

describe('generateKey', () => {
  it('generates an ACTIVE key with no expiry', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'RSA-2048', null));
    expect(key.purpose).toBe('SIGNING');
    expect(key.algorithm).toBe('RSA-2048');
    expect(key.status).toBe('ACTIVE');
    expect(key.expiresAt).toBeNull();
    expect(key.rotatedFrom).toBeNull();
    expect(key.version).toBe(1);
  });

  it('generates a key with expiry', () => {
    const { system, getNow } = createTestSystem();
    const expiresAt = getNow() + 1_000_000n;
    const key = asKey(system.generateKey('ENCRYPTION', 'AES-256', expiresAt));
    expect(key.expiresAt).toBe(expiresAt);
  });

  it('returns invalid-algorithm for unknown algorithm', () => {
    const { system } = createTestSystem();
    const r = system.generateKey('SIGNING', 'MD5' as unknown as ValidAlgorithm, null);
    expect(r).toBe('invalid-algorithm');
  });

  it('returns invalid-expiry when expiresAt <= now', () => {
    const { system, getNow } = createTestSystem();
    const r = system.generateKey('SIGNING', 'RSA-4096', getNow());
    expect(r).toBe('invalid-expiry');
  });

  it('returns invalid-expiry for past timestamp', () => {
    const { system, getNow } = createTestSystem();
    const r = system.generateKey('SIGNING', 'EC-P256', getNow() - 1n);
    expect(r).toBe('invalid-expiry');
  });

  it('accepts all 6 valid algorithms', () => {
    const { system, getNow } = createTestSystem();
    const algorithms = [
      'RSA-2048',
      'RSA-4096',
      'EC-P256',
      'EC-P384',
      'AES-256',
      'ChaCha20',
    ] as const;
    for (const alg of algorithms) {
      const key = asKey(system.generateKey('AUTHENTICATION', alg, getNow() + 1n));
      expect(key.algorithm).toBe(alg);
    }
  });
});

// ─── rotateKey ────────────────────────────────────────────────────────────────

describe('rotateKey', () => {
  it('creates a new ACTIVE key and deprecates old one', () => {
    const { system } = createTestSystem();
    const oldKey = asKey(system.generateKey('SIGNING', 'RSA-2048', null));
    const r = system.rotateKey(oldKey.keyId);
    if (!r.success) throw new Error('Expected success: ' + r.error);
    expect(r.newKey.status).toBe('ACTIVE');
    expect(r.newKey.rotatedFrom).toBe(oldKey.keyId);
    expect(r.newKey.version).toBe(2);
    expect(system.getKey(oldKey.keyId)?.status).toBe('DEPRECATED');
  });

  it('records a rotation event', () => {
    const { system } = createTestSystem();
    const oldKey = asKey(system.generateKey('SIGNING', 'EC-P384', null));
    const r = system.rotateKey(oldKey.keyId);
    if (!r.success) throw new Error(r.error);
    expect(r.event.fromKeyId).toBe(oldKey.keyId);
    expect(r.event.toKeyId).toBe(r.newKey.keyId);
  });

  it('returns key-not-found for unknown keyId', () => {
    const { system } = createTestSystem();
    const r = system.rotateKey('bad-id');
    expect(r).toEqual({ success: false, error: 'key-not-found' });
  });

  it('returns key-not-found for a REVOKED key on rotate', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'AES-256', null));
    system.revokeKey(key.keyId);
    const r = system.rotateKey(key.keyId);
    expect(r).toEqual({ success: false, error: 'key-not-found' });
  });

  it('preserves algorithm and purpose on rotation', () => {
    const { system } = createTestSystem();
    const old = asKey(system.generateKey('DERIVATION', 'ChaCha20', null));
    const r = system.rotateKey(old.keyId);
    if (!r.success) throw new Error(r.error);
    expect(r.newKey.purpose).toBe('DERIVATION');
    expect(r.newKey.algorithm).toBe('ChaCha20');
  });
});

// ─── deprecateKey ─────────────────────────────────────────────────────────────

describe('deprecateKey', () => {
  it('sets key status to DEPRECATED', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'RSA-2048', null));
    const r = system.deprecateKey(key.keyId);
    expect(r).toEqual({ success: true });
    expect(system.getKey(key.keyId)?.status).toBe('DEPRECATED');
  });

  it('returns key-not-found for unknown key', () => {
    const { system } = createTestSystem();
    expect(system.deprecateKey('bad')).toEqual({ success: false, error: 'key-not-found' });
  });

  it('returns already-revoked for revoked key', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'EC-P256', null));
    system.revokeKey(key.keyId);
    expect(system.deprecateKey(key.keyId)).toEqual({ success: false, error: 'already-revoked' });
  });
});

// ─── revokeKey ────────────────────────────────────────────────────────────────

describe('revokeKey', () => {
  it('sets key status to REVOKED', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('ENCRYPTION', 'AES-256', null));
    system.revokeKey(key.keyId);
    expect(system.getKey(key.keyId)?.status).toBe('REVOKED');
  });

  it('returns already-revoked when revoking again', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'RSA-4096', null));
    system.revokeKey(key.keyId);
    expect(system.revokeKey(key.keyId)).toEqual({ success: false, error: 'already-revoked' });
  });

  it('returns key-not-found for unknown key', () => {
    const { system } = createTestSystem();
    expect(system.revokeKey('ghost')).toEqual({ success: false, error: 'key-not-found' });
  });
});

// ─── listKeys ─────────────────────────────────────────────────────────────────

describe('listKeys', () => {
  it('lists all keys', () => {
    const { system } = createTestSystem();
    system.generateKey('SIGNING', 'RSA-2048', null);
    system.generateKey('ENCRYPTION', 'AES-256', null);
    expect(system.listKeys().length).toBe(2);
  });

  it('filters by purpose', () => {
    const { system } = createTestSystem();
    system.generateKey('SIGNING', 'RSA-2048', null);
    system.generateKey('ENCRYPTION', 'AES-256', null);
    expect(system.listKeys('SIGNING').length).toBe(1);
  });

  it('filters by status', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'RSA-2048', null));
    system.revokeKey(key.keyId);
    system.generateKey('SIGNING', 'EC-P256', null);
    expect(system.listKeys(undefined, 'REVOKED').length).toBe(1);
    expect(system.listKeys(undefined, 'ACTIVE').length).toBe(1);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('counts keys by status', () => {
    const { system } = createTestSystem();
    const k1 = asKey(system.generateKey('SIGNING', 'RSA-2048', null));
    const k2 = asKey(system.generateKey('ENCRYPTION', 'AES-256', null));
    system.deprecateKey(k1.keyId);
    system.revokeKey(k2.keyId);
    system.generateKey('AUTHENTICATION', 'EC-P256', null);
    const stats = system.getStats();
    expect(stats.totalKeys).toBe(3);
    expect(stats.activeKeys).toBe(1);
    expect(stats.deprecatedKeys).toBe(1);
    expect(stats.revokedKeys).toBe(1);
  });

  it('keysExpiringWithinUs counts ACTIVE keys near expiry', () => {
    const { system, getNow, advanceTime } = createTestSystem();
    const soon = getNow() + 100_000n;
    asKey(system.generateKey('SIGNING', 'RSA-2048', soon));
    asKey(system.generateKey('ENCRYPTION', 'AES-256', getNow() + 10_000_000n));
    advanceTime(50_000n); // advance but not past expiry
    expect(system.getStats().keysExpiringWithinUs(200_000n)).toBe(1);
  });

  it('rotation history is recorded per key', () => {
    const { system } = createTestSystem();
    const key = asKey(system.generateKey('SIGNING', 'EC-P384', null));
    system.rotateKey(key.keyId);
    expect(system.getRotationHistory(key.keyId).length).toBe(1);
  });
});
