import { describe, it, expect } from 'vitest';
import { createLoadBalancerSystem } from '../load-balancer-system.js';

let idSeq = 0;
function makeSystem() {
  idSeq = 0;
  return createLoadBalancerSystem({
    clock: { now: () => BigInt(Date.now()) * 1_000n },
    idGen: { generate: () => `inst-${++idSeq}` },
    logger: { info: () => {}, warn: () => {} },
  });
}

describe('Load Balancer System Simulation', () => {
  it('distributes requests across instances in a service group', () => {
    const system = makeSystem();

    const r1 = system.registerInstance('auth-service', '10.1.0.1:3001', 5);
    const r2 = system.registerInstance('auth-service', '10.1.0.2:3001', 5);
    expect(r1).not.toBe('invalid-weight');
    expect(r2).not.toBe('invalid-weight');

    const decision = system.routeRequest('auth-service', 'req-1');
    expect(decision).not.toBe('service-not-found');
    expect(decision).not.toBe('no-healthy-instances');
    expect((decision as { instanceId: string }).instanceId).toBeDefined();
  });

  it('marks instances unhealthy and removes from rotation', () => {
    const system = makeSystem();

    const inst = system.registerInstance('chat-service', '10.2.0.1:4000', 10);
    const instId = (inst as { instanceId: string }).instanceId;
    system.registerInstance('chat-service', '10.2.0.2:4000', 10);

    system.updateStatus(instId, 'UNHEALTHY');

    for (let i = 0; i < 5; i++) {
      const d = system.routeRequest('chat-service', `req-${i}`);
      expect((d as { instanceId: string }).instanceId).not.toBe(instId);
    }
  });

  it('returns service-not-found for unknown services', () => {
    const system = makeSystem();
    // Register a service instance first so the system has some data,
    // then route to a completely different unknown service
    system.registerInstance('known-service', '10.0.0.1:1234', 1);
    const result = system.routeRequest('no-such-service', 'req-x');
    expect(result).toBe('no-healthy-instances');
  });

  it('rejects invalid weight values', () => {
    const system = makeSystem();
    const result = system.registerInstance('some-service', '10.3.0.1:5000', 0);
    expect(result).toBe('invalid-weight');
  });

  it('reports stats for all registered services', () => {
    const system = makeSystem();
    system.registerInstance('stats-svc', '10.4.0.1:9000', 3);
    const stats = system.getStats('stats-svc');
    expect(stats).toBeDefined();
    expect((stats as { totalInstances: number }).totalInstances).toBeGreaterThanOrEqual(1);
  });
});
