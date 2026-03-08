import { describe, it, expect } from 'vitest';
import { createKeyRotationService } from '../key-rotation.js';
import type { KeyRotationDeps } from '../key-rotation.js';

function createDeps(): { deps: KeyRotationDeps; advance: (micro: number) => void } {
  let time = 1000;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'key-' + String(id++) },
    },
    advance: (micro: number) => { time += micro; },
  };
}

const ROTATION_INTERVAL = 86_400_000_000; // 24h in microseconds

describe('KeyRotationService — register', () => {
  it('registers a key in active state', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    const key = svc.register({ purpose: 'encryption' });
    expect(key.keyId).toBe('key-0');
    expect(key.purpose).toBe('encryption');
    expect(key.status).toBe('active');
    expect(key.rotatedAt).toBeUndefined();
    expect(key.retiredAt).toBeUndefined();
  });
});

describe('KeyRotationService — rotate', () => {
  it('rotates an active key', () => {
    const { deps, advance } = createDeps();
    const svc = createKeyRotationService(deps);
    const key = svc.register({ purpose: 'signing' });
    advance(ROTATION_INTERVAL);
    const rotated = svc.rotate(key.keyId);
    expect(rotated).toBeDefined();
    expect(rotated?.status).toBe('rotated');
    expect(rotated?.rotatedAt).toBeGreaterThan(0);
  });

  it('returns undefined for non-active key', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    const key = svc.register({ purpose: 'enc' });
    svc.rotate(key.keyId);
    expect(svc.rotate(key.keyId)).toBeUndefined();
  });

  it('returns undefined for unknown key', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    expect(svc.rotate('nonexistent')).toBeUndefined();
  });
});

describe('KeyRotationService — retire', () => {
  it('retires a rotated key', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    const key = svc.register({ purpose: 'enc' });
    svc.rotate(key.keyId);
    expect(svc.retire(key.keyId)).toBe(true);
    expect(svc.getKey(key.keyId)?.status).toBe('retired');
  });

  it('returns false for already retired key', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    const key = svc.register({ purpose: 'enc' });
    svc.retire(key.keyId);
    expect(svc.retire(key.keyId)).toBe(false);
  });

  it('returns false for unknown key', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    expect(svc.retire('nonexistent')).toBe(false);
  });
});

describe('KeyRotationService — getActiveForPurpose', () => {
  it('finds active key for a purpose', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    svc.register({ purpose: 'signing' });
    svc.register({ purpose: 'encryption' });
    const active = svc.getActiveForPurpose('encryption');
    expect(active).toBeDefined();
    expect(active?.purpose).toBe('encryption');
  });

  it('returns undefined when no active key exists', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    const key = svc.register({ purpose: 'enc' });
    svc.rotate(key.keyId);
    expect(svc.getActiveForPurpose('enc')).toBeUndefined();
  });
});

describe('KeyRotationService — getDueForRotation', () => {
  it('identifies keys past rotation interval', () => {
    const { deps, advance } = createDeps();
    const svc = createKeyRotationService(deps);
    svc.register({ purpose: 'old' });
    advance(ROTATION_INTERVAL + 1);
    svc.register({ purpose: 'new' });
    const due = svc.getDueForRotation({ rotationIntervalMicro: ROTATION_INTERVAL });
    expect(due).toHaveLength(1);
    expect(due[0]?.purpose).toBe('old');
  });
});

describe('KeyRotationService — stats', () => {
  it('reports key status counts', () => {
    const { deps } = createDeps();
    const svc = createKeyRotationService(deps);
    svc.register({ purpose: 'a' });
    const b = svc.register({ purpose: 'b' });
    const c = svc.register({ purpose: 'c' });
    svc.rotate(b.keyId);
    svc.retire(c.keyId);
    const stats = svc.getStats();
    expect(stats.totalKeys).toBe(3);
    expect(stats.activeKeys).toBe(1);
    expect(stats.rotatedKeys).toBe(1);
    expect(stats.retiredKeys).toBe(1);
  });
});
