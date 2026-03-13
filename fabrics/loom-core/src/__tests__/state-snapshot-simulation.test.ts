import { describe, expect, it } from 'vitest';
import { createSnapshotService } from '../state-snapshot.js';

describe('state-snapshot simulation', () => {
  it('simulates snapshot capture history, diffing, retention, and removal', () => {
    let time = 1_000_000;
    let id = 0;
    const snapshots = createSnapshotService(
      {
        clock: { nowMicroseconds: () => (time += 1_000) },
        idGenerator: { next: () => 'snap-' + String(++id) },
      },
      { maxSnapshotsPerWorld: 3 },
    );

    const s1 = snapshots.capture({
      worldId: 'earth',
      label: 'baseline',
      data: new Map([
        ['players', 10],
        ['weather', 'clear'],
      ]),
      entityCount: 100,
    });
    const s2 = snapshots.capture({
      worldId: 'earth',
      label: 'combat',
      data: new Map([
        ['players', 12],
        ['weather', 'storm'],
        ['encounter', true],
      ]),
      entityCount: 120,
    });

    const diff = snapshots.diff(s1.snapshotId, s2.snapshotId);

    snapshots.capture({ worldId: 'earth', label: 'after', data: new Map(), entityCount: 80 });
    snapshots.capture({ worldId: 'earth', label: 'tail', data: new Map(), entityCount: 60 });

    const worldHistory = snapshots.listByWorld('earth');
    const removed = snapshots.remove(s2.snapshotId);

    expect(diff?.addedKeys).toContain('encounter');
    expect(diff?.changedKeys).toContain('players');
    expect(worldHistory).toHaveLength(3);
    expect(worldHistory[0]?.label).toBe('combat');
    expect(removed).toBe(true);
  });
});
