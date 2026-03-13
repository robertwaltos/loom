import { describe, it, expect } from 'vitest';
import { createConnectionManager } from '../connection-manager.js';

let idSeq = 0;
function makeManager() {
  idSeq = 0;
  const spawned: string[] = [];
  const despawned: string[] = [];
  return {
    manager: createConnectionManager({
      playerEntities: {
        spawnPlayer: (connId: string, _worldId: string) => {
          spawned.push(connId);
          return `entity-${connId}`;
        },
        despawnPlayer: (entityId: string) => { despawned.push(entityId); },
      },
      clock: { nowMicroseconds: () => 1_000_000 },
      idGenerator: { generate: () => `conn-${++idSeq}` },
      logger: { info: () => {}, warn: () => {} },
      defaultWorldId: 'world-main',
    }),
    spawned,
    despawned,
  };
}

const HELLO = {
  type: 'client-hello' as const,
  protocolVersion: 1,
  clientId: 'player-abc',
  platform: 'pc',
  renderingTier: 2,
};

describe('Connection Manager Simulation', () => {
  it('accepts connections and completes handshake', () => {
    const { manager } = makeManager();

    const connId = manager.acceptConnection();
    expect(typeof connId).toBe('string');
    expect(manager.count()).toBe(1);
    expect(manager.countActive()).toBe(0);

    manager.completeHandshake(connId, HELLO);
    expect(manager.countActive()).toBe(1);

    const conn = manager.getConnection(connId);
    expect(conn.clientId).toBe('player-abc');
    expect(conn.platform).toBe('pc');
  });

  it('lists active connections and retrieves them', () => {
    const { manager } = makeManager();

    const id1 = manager.acceptConnection();
    const id2 = manager.acceptConnection();
    manager.completeHandshake(id1, { ...HELLO, clientId: 'player-A' });
    manager.completeHandshake(id2, { ...HELLO, clientId: 'player-B' });

    const active = manager.listActive();
    expect(active).toHaveLength(2);
    expect(active.map((c: { clientId: string }) => c.clientId)).toContain('player-A');
  });

  it('disconnects connections and removes them from active list', () => {
    const { manager, despawned } = makeManager();

    const connId = manager.acceptConnection();
    manager.completeHandshake(connId, HELLO);
    expect(manager.countActive()).toBe(1);

    manager.disconnect(connId, 'timeout');
    expect(manager.countActive()).toBe(0);
    expect(despawned).toContain(`entity-${connId}`);
  });

  it('tryGetConnection returns undefined for unknown connections', () => {
    const { manager } = makeManager();
    const result = manager.tryGetConnection('no-such-conn');
    expect(result).toBeUndefined();
  });
});
