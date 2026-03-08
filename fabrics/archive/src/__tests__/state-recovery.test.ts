import { describe, it, expect } from 'vitest';
import { createStateRecoveryService } from '../state-recovery.js';
import type {
  StateRecoveryDeps,
  RecoverySnapshotPort,
  RecoveryHasherPort,
  RecoveryApplyPort,
} from '../state-recovery.js';

const TEST_DATA = new Uint8Array([1, 2, 3, 4]);
const TEST_HASH = 'abc123';

function makeSnapshotPort(
  snapshots?: Record<string, {
    snapshotId: string;
    worldId: string;
    tickNumber: number;
    capturedAt: number;
    contentHash: string;
    sizeBytes: number;
  }>,
): RecoverySnapshotPort {
  const map = new Map(Object.entries(snapshots ?? {}));
  return {
    getSnapshot: (id) => map.get(id),
    getLatest: (worldId) => {
      for (const snap of map.values()) {
        if (snap.worldId === worldId) return snap;
      }
      return undefined;
    },
    findByTick: (worldId, tick) => {
      for (const snap of map.values()) {
        if (snap.worldId === worldId && snap.tickNumber === tick) return snap;
      }
      return undefined;
    },
    restore: () => ({ stateData: TEST_DATA }),
  };
}

function makeHasher(returnHash?: string): RecoveryHasherPort {
  return { hash: () => returnHash ?? TEST_HASH };
}

function makeApplyPort(result?: boolean): RecoveryApplyPort {
  return { apply: () => result ?? true };
}

let idCounter = 0;
function makeDeps(overrides?: {
  snapshotPort?: RecoverySnapshotPort;
  hasherPort?: RecoveryHasherPort;
  applyPort?: RecoveryApplyPort;
}): StateRecoveryDeps {
  let time = 1_000_000;
  return {
    snapshotPort: overrides?.snapshotPort ?? makeSnapshotPort({
      'snap-1': {
        snapshotId: 'snap-1',
        worldId: 'world-1',
        tickNumber: 100,
        capturedAt: 500_000,
        contentHash: TEST_HASH,
        sizeBytes: 4,
      },
    }),
    hasherPort: overrides?.hasherPort ?? makeHasher(),
    applyPort: overrides?.applyPort ?? makeApplyPort(),
    idGenerator: { next: () => 'recovery-' + String(++idCounter) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('StateRecoveryService — successful recovery', () => {
  it('recovers from latest snapshot', () => {
    const service = createStateRecoveryService(makeDeps());
    const result = service.recover({ worldId: 'world-1' });
    expect(result.status).toBe('success');
    expect(result.worldId).toBe('world-1');
    expect(result.snapshotId).toBe('snap-1');
    expect(result.restoredTick).toBe(100);
    expect(result.error).toBeNull();
  });

  it('recovers from specific snapshot id', () => {
    const service = createStateRecoveryService(makeDeps());
    const result = service.recover({
      worldId: 'world-1',
      targetSnapshotId: 'snap-1',
    });
    expect(result.status).toBe('success');
    expect(result.snapshotId).toBe('snap-1');
  });

  it('recovers by tick number', () => {
    const service = createStateRecoveryService(makeDeps());
    const result = service.recover({
      worldId: 'world-1',
      targetTick: 100,
    });
    expect(result.status).toBe('success');
    expect(result.restoredTick).toBe(100);
  });
});

describe('StateRecoveryService — failure cases', () => {
  it('fails when no snapshot found', () => {
    const service = createStateRecoveryService(makeDeps({
      snapshotPort: makeSnapshotPort({}),
    }));
    const result = service.recover({ worldId: 'world-1' });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('No snapshot found');
  });

  it('fails when integrity check fails', () => {
    const service = createStateRecoveryService(makeDeps({
      hasherPort: makeHasher('wrong-hash'),
    }));
    const result = service.recover({ worldId: 'world-1' });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Integrity check failed');
  });

  it('fails when apply returns false', () => {
    const service = createStateRecoveryService(makeDeps({
      applyPort: makeApplyPort(false),
    }));
    const result = service.recover({ worldId: 'world-1' });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Apply failed');
  });
});

describe('StateRecoveryService — integrity verification', () => {
  it('verifies valid snapshot', () => {
    const service = createStateRecoveryService(makeDeps());
    const candidate = service.verifyIntegrity('snap-1');
    expect(candidate?.integrityValid).toBe(true);
    expect(candidate?.snapshotId).toBe('snap-1');
  });

  it('detects invalid integrity', () => {
    const service = createStateRecoveryService(makeDeps({
      hasherPort: makeHasher('wrong'),
    }));
    const candidate = service.verifyIntegrity('snap-1');
    expect(candidate?.integrityValid).toBe(false);
  });

  it('returns undefined for unknown snapshot', () => {
    const service = createStateRecoveryService(makeDeps());
    expect(service.verifyIntegrity('unknown')).toBeUndefined();
  });
});

describe('StateRecoveryService — history', () => {
  it('records recovery in history', () => {
    const service = createStateRecoveryService(makeDeps());
    service.recover({ worldId: 'world-1' });
    const history = service.getHistory(10);
    expect(history).toHaveLength(1);
    expect(history[0]?.status).toBe('success');
  });

  it('returns last recovery for a world', () => {
    const service = createStateRecoveryService(makeDeps());
    service.recover({ worldId: 'world-1' });
    const last = service.getLastRecovery('world-1');
    expect(last?.worldId).toBe('world-1');
  });

  it('returns undefined for unknown world', () => {
    const service = createStateRecoveryService(makeDeps());
    expect(service.getLastRecovery('world-x')).toBeUndefined();
  });

  it('limits history', () => {
    const service = createStateRecoveryService(makeDeps(), 3);
    for (let i = 0; i < 5; i++) {
      service.recover({ worldId: 'world-1' });
    }
    const history = service.getHistory(10);
    expect(history).toHaveLength(3);
  });
});

describe('StateRecoveryService — stats', () => {
  it('tracks success and failure counts', () => {
    const service = createStateRecoveryService(makeDeps());
    service.recover({ worldId: 'world-1' });
    service.recover({ worldId: 'unknown' });

    const stats = service.getStats();
    expect(stats.totalRecoveries).toBe(2);
    expect(stats.successCount).toBe(1);
    expect(stats.failureCount).toBe(1);
    expect(stats.lastRecoveryAt).toBeGreaterThan(0);
  });

  it('starts with zero stats', () => {
    const service = createStateRecoveryService(makeDeps());
    const stats = service.getStats();
    expect(stats.totalRecoveries).toBe(0);
    expect(stats.lastRecoveryAt).toBeNull();
  });
});
