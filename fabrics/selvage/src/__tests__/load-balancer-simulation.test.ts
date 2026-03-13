import { describe, it, expect } from 'vitest';
import { createLoadBalancer } from '../load-balancer.js';

function makeBalancer() {
  let time = 1_000_000n;
  return {
    lb: createLoadBalancer({
      clock: { nowMicroseconds: () => time },
      logger: { info: () => {}, warn: () => {} },
    }),
    advance: (us: bigint) => { time += us; },
  };
}

describe('Load Balancer Simulation', () => {
  it('registers instances and routes traffic among them', () => {
    const { lb } = makeBalancer();

    const r1 = lb.registerInstance({ id: 'srv-1', host: '10.0.0.1', port: 8080, weight: 5 });
    const r2 = lb.registerInstance({ id: 'srv-2', host: '10.0.0.2', port: 8080, weight: 5 });
    expect(r1).toBe('OK');
    expect(r2).toBe('OK');

    const decision = lb.selectInstance();
    expect(decision).not.toBe('NO_HEALTHY_INSTANCES');
    expect(['srv-1', 'srv-2']).toContain((decision as { instance: { id: string } }).instance.id);
  });

  it('marks an instance unhealthy and routes only to healthy ones', () => {
    const { lb } = makeBalancer();

    lb.registerInstance({ id: 'srv-A', host: '10.0.1.1', port: 80, weight: 10 });
    lb.registerInstance({ id: 'srv-B', host: '10.0.1.2', port: 80, weight: 10 });

    lb.markUnhealthy('srv-A');

    for (let i = 0; i < 5; i++) {
      const decision = lb.selectInstance();
      expect((decision as { instance: { id: string } }).instance.id).toBe('srv-B');
    }
  });

  it('restores traffic when an instance is marked healthy again', () => {
    const { lb } = makeBalancer();

    lb.registerInstance({ id: 'srv-X', host: '10.0.2.1', port: 80, weight: 10 });
    lb.markUnhealthy('srv-X');
    lb.markHealthy('srv-X');

    const decision = lb.selectInstance();
    expect(decision).not.toBe('NO_HEALTHY_INSTANCES');
  });

  it('returns no-healthy-instances when all are down', () => {
    const { lb } = makeBalancer();
    lb.registerInstance({ id: 'only', host: '10.0.3.1', port: 80, weight: 5 });
    lb.markUnhealthy('only');

    const decision = lb.selectInstance();
    expect(decision).toBe('NO_HEALTHY_INSTANCES');
  });

  it('tracks stats', () => {
    const { lb } = makeBalancer();
    lb.registerInstance({ id: 'stat-1', host: '10.0.4.1', port: 80, weight: 3 });
    lb.selectInstance();
    const stats = lb.getStats();
    expect(stats.totalInstances).toBe(1);
    expect(stats.totalRequests).toBeGreaterThanOrEqual(1);
  });
});
