import { describe, it, expect } from 'vitest';
import { createConnectionManager } from '../connection-manager.js';
import type {
  ConnectionManager,
  PlayerEntityPort,
  ClockPort,
  IdPort,
  LogPort,
} from '../connection-manager.js';
import type { ClientHello } from '../server-protocol.js';
import { SelvageError } from '../selvage-errors.js';

function fakeClock(initial = 1_000_000): ClockPort {
  let now = initial;
  return {
    nowMicroseconds: () => {
      now += 1000;
      return now;
    },
  };
}

function fakeIdGenerator(): IdPort {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `conn-${String(counter)}`;
    },
  };
}

function fakePlayerEntities(): PlayerEntityPort & { spawned: string[]; despawned: string[] } {
  const spawned: string[] = [];
  const despawned: string[] = [];
  let counter = 0;
  return {
    spawned,
    despawned,
    spawnPlayer: (_connId: string, _worldId: string) => {
      counter += 1;
      const id = `player-entity-${String(counter)}`;
      spawned.push(id);
      return id;
    },
    despawnPlayer: (entityId: string) => {
      despawned.push(entityId);
    },
  };
}

function silentLogger(): LogPort {
  return {
    info: () => {},
    warn: () => {},
  };
}

function hello(clientId = 'client-1'): ClientHello {
  return {
    type: 'client-hello',
    protocolVersion: 1,
    clientId,
    platform: 'test',
    renderingTier: 'high',
  };
}

function createTestManager(): {
  manager: ConnectionManager;
  entities: ReturnType<typeof fakePlayerEntities>;
} {
  const entities = fakePlayerEntities();
  const manager = createConnectionManager({
    playerEntities: entities,
    clock: fakeClock(),
    idGenerator: fakeIdGenerator(),
    logger: silentLogger(),
    defaultWorldId: 'terra',
  });
  return { manager, entities };
}

describe('ConnectionManager accept', () => {
  it('creates a pending connection', () => {
    const { manager } = createTestManager();
    const connId = manager.acceptConnection();
    expect(connId).toBe('conn-1');

    const info = manager.getConnection(connId);
    expect(info.state).toBe('handshaking');
    expect(info.playerEntityId).toBeNull();
  });

  it('tracks multiple connections', () => {
    const { manager } = createTestManager();
    manager.acceptConnection();
    manager.acceptConnection();
    expect(manager.count()).toBe(2);
  });
});

describe('ConnectionManager handshake', () => {
  it('spawns a player entity on handshake', () => {
    const { manager, entities } = createTestManager();
    const connId = manager.acceptConnection();
    const result = manager.completeHandshake(connId, hello());

    expect(result.playerEntityId).toBe('player-entity-1');
    expect(result.worldId).toBe('terra');
    expect(entities.spawned).toHaveLength(1);

    const info = manager.getConnection(connId);
    expect(info.state).toBe('active');
    expect(info.clientId).toBe('client-1');
  });

  it('rejects duplicate client IDs', () => {
    const { manager } = createTestManager();
    const c1 = manager.acceptConnection();
    const c2 = manager.acceptConnection();

    manager.completeHandshake(c1, hello('dupe'));
    expect(() => {
      manager.completeHandshake(c2, hello('dupe'));
    }).toThrow(SelvageError);
  });

  it('rejects double handshake', () => {
    const { manager } = createTestManager();
    const connId = manager.acceptConnection();
    manager.completeHandshake(connId, hello());

    expect(() => {
      manager.completeHandshake(connId, hello('other'));
    }).toThrow(SelvageError);
  });
});

describe('ConnectionManager input tracking', () => {
  it('records input sequence numbers', () => {
    const { manager } = createTestManager();
    const connId = manager.acceptConnection();
    manager.completeHandshake(connId, hello());

    manager.recordInput(connId, 42);
    const info = manager.getConnection(connId);
    expect(info.lastInputSequence).toBe(42);
    expect(info.messagesReceived).toBe(1);
  });

  it('rejects input on non-active connections', () => {
    const { manager } = createTestManager();
    const connId = manager.acceptConnection();

    expect(() => {
      manager.recordInput(connId, 1);
    }).toThrow(SelvageError);
  });
});

describe('ConnectionManager disconnect', () => {
  it('despawns player entity on disconnect', () => {
    const { manager, entities } = createTestManager();
    const connId = manager.acceptConnection();
    manager.completeHandshake(connId, hello());

    const result = manager.disconnect(connId, 'voluntary');
    expect(result.wasActive).toBe(true);
    expect(result.playerEntityId).toBe('player-entity-1');
    expect(entities.despawned).toHaveLength(1);
    expect(manager.count()).toBe(0);
  });

  it('allows new connection with same client ID after disconnect', () => {
    const { manager } = createTestManager();
    const c1 = manager.acceptConnection();
    manager.completeHandshake(c1, hello('reuse'));
    manager.disconnect(c1, 'voluntary');

    const c2 = manager.acceptConnection();
    expect(() => {
      manager.completeHandshake(c2, hello('reuse'));
    }).not.toThrow();
  });

  it('throws on unknown connection', () => {
    const { manager } = createTestManager();
    expect(() => {
      manager.disconnect('nonexistent', 'test');
    }).toThrow(SelvageError);
  });
});

describe('ConnectionManager queries', () => {
  it('lists only active connections', () => {
    const { manager } = createTestManager();
    const c1 = manager.acceptConnection();
    const c2 = manager.acceptConnection();
    manager.completeHandshake(c1, hello('a'));

    const active = manager.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.connectionId).toBe(c1);
    expect(manager.countActive()).toBe(1);
    expect(manager.count()).toBe(2);

    // Complete second handshake
    manager.completeHandshake(c2, hello('b'));
    expect(manager.countActive()).toBe(2);
  });

  it('tryGetConnection returns undefined for missing', () => {
    const { manager } = createTestManager();
    expect(manager.tryGetConnection('nope')).toBeUndefined();
  });
});
