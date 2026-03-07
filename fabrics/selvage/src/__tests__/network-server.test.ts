import { describe, it, expect } from 'vitest';
import { createNetworkServer } from '../network-server.js';
import type {
  TransportPort,
  ConnectionHandler,
  TransportHandlers,
  NetworkServer,
} from '../network-server.js';
import { createConnectionManager } from '../connection-manager.js';
import type { ConnectionManager } from '../connection-manager.js';
import { createSnapshotBuilder } from '../snapshot-builder.js';
import { createJsonCodec } from '../message-codec.js';
import type { ServerMessage, ServerWelcome, ServerSnapshot } from '../server-protocol.js';

// ─── Test Transport ─────────────────────────────────────────────

interface TestTransport extends TransportPort {
  simulateConnection(rawId: string): TransportHandlers;
  sentMessages: Array<{ connectionId: string; data: Uint8Array }>;
  closedConnections: Array<{ connectionId: string; reason: string }>;
}

function createTestTransport(): TestTransport {
  let connectionHandler: ConnectionHandler | null = null;
  const sent: Array<{ connectionId: string; data: Uint8Array }> = [];
  const closed: Array<{ connectionId: string; reason: string }> = [];

  return {
    sentMessages: sent,
    closedConnections: closed,
    onConnection: (handler) => {
      connectionHandler = handler;
    },
    send: (connectionId, data) => {
      sent.push({ connectionId, data });
    },
    close: (connectionId, reason) => {
      closed.push({ connectionId, reason });
    },
    shutdown: () => {},
    simulateConnection: (rawId) => {
      const handlers: TransportHandlers = {
        onMessage: () => {},
        onClose: () => {},
        onError: () => {},
      };
      if (connectionHandler !== null) {
        connectionHandler(rawId, handlers);
      }
      return handlers;
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function silentLog() {
  return { info: () => {}, warn: () => {} };
}

let idCounter = 0;

function setup(): {
  transport: TestTransport;
  server: NetworkServer;
  connections: ConnectionManager;
} {
  idCounter = 0;
  const transport = createTestTransport();
  const connections = createConnectionManager({
    playerEntities: {
      spawnPlayer: () => {
        idCounter += 1;
        return `player-${String(idCounter)}`;
      },
      despawnPlayer: () => {},
    },
    clock: { nowMicroseconds: () => Date.now() * 1000 },
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return `id-${String(idCounter)}`;
      },
    },
    logger: silentLog(),
    defaultWorldId: 'terra',
  });

  const snapshots = createSnapshotBuilder({
    entityQuery: { queryByWorld: () => [] },
    componentQuery: { getComponents: () => ({}) },
  });

  const codec = createJsonCodec();

  const server = createNetworkServer({
    transport,
    connections,
    snapshots,
    codec,
    logger: silentLog(),
    serverId: 'test-server',
    tickRateHz: 20,
  });

  return { transport, server, connections };
}

function decodeMessage(data: Uint8Array): ServerMessage {
  const text = new TextDecoder().decode(data);
  return JSON.parse(text) as ServerMessage;
}

function encodeClientMessage(msg: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

describe('NetworkServer lifecycle', () => {
  it('starts and stops without errors', () => {
    const { server } = setup();
    server.start();
    expect(server.connectedCount()).toBe(0);
    server.stop();
  });
});

describe('NetworkServer handshake', () => {
  it('accepts connection and completes handshake', () => {
    const { transport, server } = setup();
    server.start();

    const handlers = transport.simulateConnection('raw-1');

    handlers.onMessage(
      encodeClientMessage({
        type: 'client-hello',
        protocolVersion: 1,
        clientId: 'player-a',
        platform: 'test',
        renderingTier: 'high',
      }),
    );

    expect(transport.sentMessages).toHaveLength(1);
    const firstMessage = transport.sentMessages[0];
    expect(firstMessage).toBeDefined();
    const welcome = decodeMessage(firstMessage?.data ?? new Uint8Array()) as ServerWelcome;
    expect(welcome.type).toBe('server-welcome');
    expect(welcome.protocolVersion).toBe(1);
    expect(welcome.serverId).toBe('test-server');
    expect(welcome.tickRateHz).toBe(20);
    expect(welcome.playerEntityId).toBeTruthy();
  });

  it('rejects wrong protocol version', () => {
    const { transport, server } = setup();
    server.start();

    const handlers = transport.simulateConnection('raw-1');

    handlers.onMessage(
      encodeClientMessage({
        type: 'client-hello',
        protocolVersion: 99,
        clientId: 'player-a',
        platform: 'test',
        renderingTier: 'high',
      }),
    );

    expect(transport.closedConnections).toHaveLength(1);
    expect(transport.closedConnections[0]?.reason).toContain('version');
  });
});

describe('NetworkServer input', () => {
  it('records client input after handshake', () => {
    const { transport, server, connections } = setup();
    server.start();

    const handlers = transport.simulateConnection('raw-1');

    // Complete handshake first
    handlers.onMessage(
      encodeClientMessage({
        type: 'client-hello',
        protocolVersion: 1,
        clientId: 'player-a',
        platform: 'test',
        renderingTier: 'high',
      }),
    );

    // Send input
    handlers.onMessage(
      encodeClientMessage({
        type: 'client-input',
        sequence: 42,
        timestamp: 1000,
        actions: [],
      }),
    );

    const active = connections.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.lastInputSequence).toBe(42);
  });
});

describe('NetworkServer disconnect', () => {
  it('cleans up on client disconnect', () => {
    const { transport, server, connections } = setup();
    server.start();

    const handlers = transport.simulateConnection('raw-1');

    handlers.onMessage(
      encodeClientMessage({
        type: 'client-hello',
        protocolVersion: 1,
        clientId: 'player-a',
        platform: 'test',
        renderingTier: 'high',
      }),
    );

    expect(connections.countActive()).toBe(1);

    handlers.onClose('voluntary');
    expect(connections.countActive()).toBe(0);
  });
});

describe('NetworkServer snapshot broadcast', () => {
  it('sends snapshots to active connections', () => {
    const { transport, server } = setup();
    server.start();

    const handlers = transport.simulateConnection('raw-1');

    handlers.onMessage(
      encodeClientMessage({
        type: 'client-hello',
        protocolVersion: 1,
        clientId: 'player-a',
        platform: 'test',
        renderingTier: 'high',
      }),
    );

    // Clear welcome message
    transport.sentMessages.length = 0;

    server.broadcastSnapshot(1, 100);

    expect(transport.sentMessages).toHaveLength(1);
    const snapshotMsg = transport.sentMessages[0];
    expect(snapshotMsg).toBeDefined();
    const snapshot = decodeMessage(snapshotMsg?.data ?? new Uint8Array()) as ServerSnapshot;
    expect(snapshot.type).toBe('server-snapshot');
    expect(snapshot.tick).toBe(1);
  });

  it('skips connections not yet active', () => {
    const { transport, server } = setup();
    server.start();

    // Accept but don't handshake
    transport.simulateConnection('raw-1');

    server.broadcastSnapshot(1, 100);
    expect(transport.sentMessages).toHaveLength(0);
  });
});

describe('NetworkServer message codec', () => {
  it('handles malformed messages gracefully', () => {
    const { transport, server } = setup();
    server.start();

    const handlers = transport.simulateConnection('raw-1');

    // Send garbage — should not crash
    handlers.onMessage(new TextEncoder().encode('not json'));
    handlers.onMessage(new TextEncoder().encode('{}'));
    handlers.onMessage(new TextEncoder().encode('{"type":"unknown"}'));

    // Server still functional
    expect(server.connectedCount()).toBe(1);
  });
});
