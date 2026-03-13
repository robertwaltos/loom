import { describe, it, expect } from 'vitest';
import { createMessageRouter } from '../message-router.js';

let idSeq = 0;
function makeRouter() {
  idSeq = 0;
  const delivered: Array<{ connId: string; payload: string }> = [];
  const activeConnections = ['conn-1', 'conn-2', 'conn-3'];
  const dynastyMap: Record<string, string[]> = {
    'dynasty-A': ['conn-1', 'conn-2'],
    'dynasty-B': ['conn-3'],
  };

  const router = createMessageRouter({
    deliveryPort: {
      deliver: (connId: string, payload: string) => {
        delivered.push({ connId, payload });
        return true;
      },
    },
    connectionPort: {
      listActiveConnectionIds: () => activeConnections,
      getConnectionsByDynasty: (dynastyId: string) => dynastyMap[dynastyId] ?? [],
    },
    idGenerator: { next: () => `route-${++idSeq}` },
    clock: { nowMicroseconds: () => 1_000_000 },
  });

  return { router, delivered };
}

describe('Message Router Simulation', () => {
  it('sends direct messages to a specific connection', () => {
    const { router, delivered } = makeRouter();

    const result = router.sendDirect({ connectionId: 'conn-1', payload: JSON.stringify({ event: 'ping' }) });
    expect(result.recipientCount).toBe(1);
    expect(delivered.find(d => d.connId === 'conn-1')).toBeDefined();
  });

  it('broadcasts messages to all active connections', () => {
    const { router, delivered } = makeRouter();

    const result = router.broadcast({ payload: JSON.stringify({ event: 'server-shutdown' }) });
    expect(result.recipientCount).toBe(3);
    expect(delivered).toHaveLength(3);
  });

  it('broadcasts excluding specified connections', () => {
    const { router, delivered } = makeRouter();

    router.broadcast({ payload: JSON.stringify({ event: 'world-event' }), excludeConnectionIds: ['conn-2'] });
    expect(delivered.map(d => d.connId)).not.toContain('conn-2');
    expect(delivered).toHaveLength(2);
  });

  it('routes messages to all connections in a dynasty', () => {
    const { router, delivered } = makeRouter();

    const result = router.sendToDynasty({ dynastyId: 'dynasty-A', payload: JSON.stringify({ event: 'dynasty-quest' }) });
    expect(result.recipientCount).toBe(2);
    expect(delivered.map(d => d.connId)).toContain('conn-1');
    expect(delivered.map(d => d.connId)).toContain('conn-2');
    expect(delivered.map(d => d.connId)).not.toContain('conn-3');
  });

  it('tracks delivery stats', () => {
    const { router } = makeRouter();
    router.sendDirect({ connectionId: 'conn-1', payload: '{}' });
    router.broadcast({ payload: '{}' });
    const stats = router.getStats();
    expect(stats.totalMessagesSent).toBeGreaterThanOrEqual(2);
  });
});
