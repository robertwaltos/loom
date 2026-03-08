import { describe, it, expect } from 'vitest';
import { createSnapshotService } from '../state-snapshot.js';
import type { SnapshotServiceDeps } from '../state-snapshot.js';

function makeDeps(): SnapshotServiceDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'snap-' + String(++idCounter) },
  };
}

describe('SnapshotService — capture and retrieve', () => {
  it('captures a snapshot', () => {
    const svc = createSnapshotService(makeDeps());
    const snap = svc.capture({
      worldId: 'world-1',
      label: 'initial',
      data: new Map([['a', 1]]),
      entityCount: 10,
    });
    expect(snap.snapshotId).toBe('snap-1');
    expect(snap.label).toBe('initial');
    expect(snap.entityCount).toBe(10);
  });

  it('retrieves by id', () => {
    const svc = createSnapshotService(makeDeps());
    const snap = svc.capture({
      worldId: 'world-1',
      label: 'v1',
      data: new Map(),
      entityCount: 0,
    });
    expect(svc.getSnapshot(snap.snapshotId)?.label).toBe('v1');
  });

  it('returns undefined for unknown id', () => {
    const svc = createSnapshotService(makeDeps());
    expect(svc.getSnapshot('missing')).toBeUndefined();
  });

  it('lists by world', () => {
    const svc = createSnapshotService(makeDeps());
    svc.capture({ worldId: 'w1', label: 'a', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w1', label: 'b', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w2', label: 'c', data: new Map(), entityCount: 0 });
    expect(svc.listByWorld('w1')).toHaveLength(2);
    expect(svc.listByWorld('w2')).toHaveLength(1);
  });

  it('gets latest snapshot for world', () => {
    const svc = createSnapshotService(makeDeps());
    svc.capture({ worldId: 'w1', label: 'first', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w1', label: 'second', data: new Map(), entityCount: 0 });
    expect(svc.getLatest('w1')?.label).toBe('second');
  });

  it('returns undefined latest for unknown world', () => {
    const svc = createSnapshotService(makeDeps());
    expect(svc.getLatest('missing')).toBeUndefined();
  });
});

describe('SnapshotService — diff', () => {
  it('diffs two snapshots', () => {
    const svc = createSnapshotService(makeDeps());
    const a = svc.capture({
      worldId: 'w1',
      label: 'before',
      data: new Map([['x', 1], ['y', 2]]),
      entityCount: 5,
    });
    const b = svc.capture({
      worldId: 'w1',
      label: 'after',
      data: new Map([['y', 99], ['z', 3]]),
      entityCount: 6,
    });
    const diff = svc.diff(a.snapshotId, b.snapshotId);
    expect(diff).toBeDefined();
    expect(diff?.addedKeys).toContain('z');
    expect(diff?.removedKeys).toContain('x');
    expect(diff?.changedKeys).toContain('y');
  });

  it('returns undefined for unknown snapshot in diff', () => {
    const svc = createSnapshotService(makeDeps());
    const a = svc.capture({
      worldId: 'w1',
      label: 'a',
      data: new Map(),
      entityCount: 0,
    });
    expect(svc.diff(a.snapshotId, 'missing')).toBeUndefined();
  });
});

describe('SnapshotService — history limits', () => {
  it('enforces max snapshots per world', () => {
    const svc = createSnapshotService(makeDeps(), { maxSnapshotsPerWorld: 3 });
    svc.capture({ worldId: 'w1', label: 'a', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w1', label: 'b', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w1', label: 'c', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w1', label: 'd', data: new Map(), entityCount: 0 });
    const list = svc.listByWorld('w1');
    expect(list).toHaveLength(3);
    expect(list[0]?.label).toBe('b');
  });
});

describe('SnapshotService — remove and stats', () => {
  it('removes a snapshot', () => {
    const svc = createSnapshotService(makeDeps());
    const snap = svc.capture({
      worldId: 'w1',
      label: 'temp',
      data: new Map(),
      entityCount: 0,
    });
    expect(svc.remove(snap.snapshotId)).toBe(true);
    expect(svc.getSnapshot(snap.snapshotId)).toBeUndefined();
  });

  it('returns false for unknown removal', () => {
    const svc = createSnapshotService(makeDeps());
    expect(svc.remove('missing')).toBe(false);
  });

  it('tracks stats', () => {
    const svc = createSnapshotService(makeDeps());
    svc.capture({ worldId: 'w1', label: 'a', data: new Map(), entityCount: 0 });
    svc.capture({ worldId: 'w2', label: 'b', data: new Map(), entityCount: 0 });
    const stats = svc.getStats();
    expect(stats.totalSnapshots).toBe(2);
    expect(stats.trackedWorlds).toBe(2);
    expect(stats.oldestSnapshotAge).toBeGreaterThan(0);
  });

  it('starts with zero stats', () => {
    const svc = createSnapshotService(makeDeps());
    const stats = svc.getStats();
    expect(stats.totalSnapshots).toBe(0);
    expect(stats.trackedWorlds).toBe(0);
  });
});
