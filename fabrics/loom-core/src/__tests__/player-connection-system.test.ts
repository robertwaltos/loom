/**
 * PlayerConnectionSystem — Validates player lifecycle management.
 */

import { describe, it, expect } from 'vitest';
import { createPlayerConnectionSystem } from '../player-connection-system.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function createDeps() {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
  };
}

describe('PlayerConnectionSystem — connect', () => {
  it('registers a new player connection', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    const ok = svc.connect({
      connectionId: 'conn-1',
      playerId: 'player-42',
      displayName: 'Thane Rolis',
    });
    expect(ok).toBe(true);

    const conn = svc.getConnection('conn-1');
    expect(conn?.state).toBe('pending');
    expect(conn?.playerId).toBe('player-42');
  });

  it('rejects duplicate connection ID', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'A' });
    const ok = svc.connect({ connectionId: 'conn-1', playerId: 'p2', displayName: 'B' });
    expect(ok).toBe(false);
  });

  it('rejects duplicate player ID (already connected)', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'A' });
    const ok = svc.connect({ connectionId: 'conn-2', playerId: 'p1', displayName: 'B' });
    expect(ok).toBe(false);
  });
});

describe('PlayerConnectionSystem — markSpawned', () => {
  it('transitions connection from pending to spawned', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'A' });
    const ok = svc.markSpawned('conn-1', eid('ent-1'), 'world-alpha');
    expect(ok).toBe(true);

    const conn = svc.getConnection('conn-1');
    expect(conn?.state).toBe('spawned');
    expect(conn?.entityId).toBe('ent-1');
    expect(conn?.worldId).toBe('world-alpha');
  });

  it('rejects markSpawned on unknown connection', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    expect(svc.markSpawned('nonexistent', eid('e1'), 'w1')).toBe(false);
  });

  it('rejects markSpawned on already-spawned connection', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'A' });
    svc.markSpawned('conn-1', eid('e1'), 'w1');
    expect(svc.markSpawned('conn-1', eid('e2'), 'w2')).toBe(false);
  });
});

describe('PlayerConnectionSystem — disconnect', () => {
  it('transitions connection to disconnected', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'A' });
    svc.markSpawned('conn-1', eid('e1'), 'w1');
    expect(svc.disconnect('conn-1')).toBe(true);

    const conn = svc.getConnection('conn-1');
    expect(conn?.state).toBe('disconnected');
  });

  it('frees player ID slot after disconnect', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'A' });
    svc.disconnect('conn-1');

    // Same player can reconnect with new connection
    const ok = svc.connect({ connectionId: 'conn-2', playerId: 'p1', displayName: 'A' });
    expect(ok).toBe(true);
  });

  it('returns false for unknown connection', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    expect(svc.disconnect('nonexistent')).toBe(false);
  });
});

describe('PlayerConnectionSystem — lookup', () => {
  it('finds connection by player ID', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'Thane' });
    const conn = svc.getByPlayerId('p1');
    expect(conn?.connectionId).toBe('conn-1');
  });

  it('finds connection by entity ID', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'conn-1', playerId: 'p1', displayName: 'Thane' });
    svc.markSpawned('conn-1', eid('ent-99'), 'w1');
    const conn = svc.getByEntityId(eid('ent-99'));
    expect(conn?.playerId).toBe('p1');
  });

  it('returns undefined for unknown player ID', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    expect(svc.getByPlayerId('unknown')).toBeUndefined();
  });
});

describe('PlayerConnectionSystem — stats', () => {
  it('reports active and pending counts', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'c1', playerId: 'p1', displayName: 'A' });
    svc.connect({ connectionId: 'c2', playerId: 'p2', displayName: 'B' });
    svc.markSpawned('c1', eid('e1'), 'w1');

    const stats = svc.getStats();
    expect(stats.totalConnections).toBe(2);
    expect(stats.activeConnections).toBe(1);
    expect(stats.pendingConnections).toBe(1);
  });

  it('lists only spawned connections as active', () => {
    const svc = createPlayerConnectionSystem(createDeps());
    svc.connect({ connectionId: 'c1', playerId: 'p1', displayName: 'A' });
    svc.connect({ connectionId: 'c2', playerId: 'p2', displayName: 'B' });
    svc.markSpawned('c1', eid('e1'), 'w1');
    svc.markSpawned('c2', eid('e2'), 'w1');

    const active = svc.getActiveConnections();
    expect(active).toHaveLength(2);
  });
});
