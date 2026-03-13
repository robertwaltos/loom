import { describe, it, expect } from 'vitest';
import { createWebSocketGateway } from '../websocket-gateway.js';

let idSeq = 0;
function makeGateway() {
  idSeq = 0;
  return createWebSocketGateway({
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { generate: () => `ws-${++idSeq}` },
    logger: { info: () => {}, warn: () => {} },
  });
}

describe('WebSocket Gateway Simulation', () => {
  it('registers connections and retrieves them', () => {
    const gateway = makeGateway();

    gateway.registerConnection({ connectionId: 'conn-1', clientId: 'client-alice' });
    gateway.registerConnection({ connectionId: 'conn-2', clientId: 'client-bob' });

    const conn1 = gateway.getConnection('conn-1');
    expect(conn1).toBeDefined();
    expect(conn1!.clientId).toBe('client-alice');

    const stats = gateway.getStats();
    expect(stats.openConnections).toBe(2);
  });

  it('sends messages to a registered connection', () => {
    const gateway = makeGateway();

    gateway.registerConnection({ connectionId: 'conn-3', clientId: 'client-charlie' });
    const result = gateway.sendMessage({ connectionId: 'conn-3', type: 'ping', payload: {} });
    expect(result).toBeUndefined();
  });

  it('closes connections and removes them', () => {
    const gateway = makeGateway();

    gateway.registerConnection({ connectionId: 'conn-4', clientId: 'client-dave' });
    gateway.disconnectClient('conn-4');

    const conn = gateway.getConnection('conn-4');
    expect(conn?.state).toBe('CLOSED');
    expect(gateway.getStats().openConnections).toBe(0);
  });

  it('updates last-seen timestamp on heartbeat', () => {
    const gateway = makeGateway();

    gateway.registerConnection({ connectionId: 'conn-5', clientId: 'client-eve' });
    gateway.heartbeat('conn-5');

    const conn = gateway.getConnection('conn-5');
    expect(conn?.lastHeartbeatAt).toBeDefined();
  });

  it('returns error for sending to unknown connection', () => {
    const gateway = makeGateway();
    const result = gateway.sendMessage({ connectionId: 'no-such-conn', type: 'ping', payload: null });
    expect(typeof result).toBe('string');
  });

  it('tracks stats across operations', () => {
    const gateway = makeGateway();

    gateway.registerConnection({ connectionId: 'stat-conn', clientId: 'stat-client' });
    gateway.sendMessage({ connectionId: 'stat-conn', type: 'data', payload: 'hello' });
    gateway.disconnectClient('stat-conn');

    const stats = gateway.getStats();
    expect(stats.totalMessagesSent).toBeGreaterThanOrEqual(1);
    expect(stats.openConnections).toBe(0);
  });
});
