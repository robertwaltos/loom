import { describe, it, expect } from 'vitest';
import { createNetworkServer } from '../network-server.js';
import type { TransportPort, ConnectionHandler, TransportHandlers } from '../network-server.js';
import { createConnectionManager } from '../connection-manager.js';
import { createSnapshotBuilder } from '../snapshot-builder.js';
import { createJsonCodec } from '../message-codec.js';

// ─── Test Transport ──────────────────────────────────────────────

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
    onConnection: (handler) => { connectionHandler = handler; },
    send: (connectionId, data) => { sent.push({ connectionId, data }); },
    close: (connectionId, reason) => { closed.push({ connectionId, reason }); },
    shutdown: () => {},
    simulateConnection: (rawId) => {
      const handlers: TransportHandlers = { onMessage: () => {}, onClose: () => {}, onError: () => {} };
      if (connectionHandler !== null) connectionHandler(rawId, handlers);
      return handlers;
    },
  };
}

let idSeq = 0;
function makeSetup() {
  idSeq = 0;
  const transport = createTestTransport();
  const connections = createConnectionManager({
    playerEntities: { spawnPlayer: () => {}, despawnPlayer: () => {} },
    clock: { nowMicroseconds: () => Date.now() * 1_000 },
    idGenerator: { generate: () => `conn-${++idSeq}` },
    logger: { info: () => {}, warn: () => {} },
    defaultWorldId: 'world-sim',
  });
  const snapshots = createSnapshotBuilder({
    entityQuery: { queryByWorld: () => [] },
    componentQuery: { getComponents: () => ({}) },
  });
  const codec = createJsonCodec();
  const server = createNetworkServer({
    transport, connections, snapshots, codec,
    logger: { info: () => {}, warn: () => {} },
    serverId: 'sim-server',
    tickRateHz: 20,
  });
  return { transport, server };
}

function encode(msg: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

function decode(data: Uint8Array): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
}

describe('Network Server Simulation', () => {
  it('starts and stops cleanly with no connections', () => {
    const { server } = makeSetup();
    server.start();
    expect(server.connectedCount()).toBe(0);
    server.stop();
  });

  it('completes a full client handshake scenario', () => {
    const { transport, server } = makeSetup();
    server.start();

    const handlers = transport.simulateConnection('raw-client-1');
    handlers.onMessage(encode({
      type: 'client-hello',
      protocolVersion: 1,
      clientId: 'player-sim',
      platform: 'pc',
      renderingTier: 'high',
    }));

    expect(transport.sentMessages.length).toBeGreaterThanOrEqual(1);
    const welcome = decode(transport.sentMessages[0]!.data);
    expect(welcome.type).toBe('server-welcome');
    expect(welcome.serverId).toBe('sim-server');
    expect(welcome.tickRateHz).toBe(20);
  });

  it('rejects clients with wrong protocol version', () => {
    const { transport, server } = makeSetup();
    server.start();

    const handlers = transport.simulateConnection('raw-client-2');
    handlers.onMessage(encode({
      type: 'client-hello',
      protocolVersion: 99,
      clientId: 'player-wrong-ver',
      platform: 'mobile',
      renderingTier: 'low',
    }));

    expect(transport.closedConnections.length).toBeGreaterThanOrEqual(1);
    const reason = transport.closedConnections[0]!.reason;
    expect(reason).toMatch(/version/i);
  });

  it('ticks without error when connections are active', () => {
    const { transport, server } = makeSetup();
    server.start();

    const handlers = transport.simulateConnection('raw-client-3');
    handlers.onMessage(encode({
      type: 'client-hello',
      protocolVersion: 1,
      clientId: 'player-tick',
      platform: 'pc',
      renderingTier: 'medium',
    }));

    expect(() => server.broadcastSnapshot(1, Date.now())).not.toThrow();
  });
});
