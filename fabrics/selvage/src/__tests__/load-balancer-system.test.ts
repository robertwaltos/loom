import { describe, it, expect } from 'vitest';
import { createLoadBalancerSystem } from '../load-balancer-system.js';
import type {
  LoadBalancerSystem,
  ServiceInstance,
  RoutingDecision,
} from '../load-balancer-system.js';

// ============================================================================
// HELPERS
// ============================================================================

function makeDeps() {
  let time = 1_000_000n;
  let counter = 0;
  const logs: string[] = [];
  return {
    clock: { now: () => time },
    idGen: {
      generate: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: (msg: string) => {
        logs.push('INFO: ' + msg);
      },
      warn: (msg: string) => {
        logs.push('WARN: ' + msg);
      },
    },
    advance: (us: bigint) => {
      time += us;
    },
    getLogs: () => logs,
  };
}

function makeBalancer(): { lb: LoadBalancerSystem; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { lb: createLoadBalancerSystem(deps), deps };
}

function isInstance(r: ServiceInstance | string): r is ServiceInstance {
  return typeof r !== 'string';
}

function isDecision(r: RoutingDecision | string): r is RoutingDecision {
  return typeof r !== 'string';
}

// ============================================================================
// registerInstance
// ============================================================================

describe('registerInstance', () => {
  it('registers a new instance', () => {
    const { lb } = makeBalancer();
    const result = lb.registerInstance('api', 'http://host1:8080', 50);
    expect(isInstance(result)).toBe(true);
    if (!isInstance(result)) return;
    expect(result.serviceName).toBe('api');
    expect(result.endpoint).toBe('http://host1:8080');
    expect(result.weight).toBe(50);
    expect(result.status).toBe('HEALTHY');
    expect(result.currentConnections).toBe(0);
    expect(result.totalRequests).toBe(0);
  });

  it('returns invalid-weight for weight < 1', () => {
    const { lb } = makeBalancer();
    expect(lb.registerInstance('api', 'host', 0)).toBe('invalid-weight');
  });

  it('returns invalid-weight for weight > 100', () => {
    const { lb } = makeBalancer();
    expect(lb.registerInstance('api', 'host', 101)).toBe('invalid-weight');
  });

  it('accepts boundary weights 1 and 100', () => {
    const { lb } = makeBalancer();
    expect(isInstance(lb.registerInstance('api', 'h1', 1))).toBe(true);
    expect(isInstance(lb.registerInstance('api', 'h2', 100))).toBe(true);
  });

  it('each registration gets a unique instanceId', () => {
    const { lb } = makeBalancer();
    const a = lb.registerInstance('api', 'h1', 10);
    const b = lb.registerInstance('api', 'h2', 10);
    if (!isInstance(a) || !isInstance(b)) return;
    expect(a.instanceId).not.toBe(b.instanceId);
  });
});

// ============================================================================
// deregisterInstance
// ============================================================================

describe('deregisterInstance', () => {
  it('deregisters a known instance', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    expect(lb.deregisterInstance(inst.instanceId)).toEqual({ success: true });
    expect(lb.listInstances('api')).toHaveLength(0);
  });

  it('returns instance-not-found for unknown id', () => {
    const { lb } = makeBalancer();
    expect(lb.deregisterInstance('nope')).toEqual({ success: false, error: 'instance-not-found' });
  });
});

// ============================================================================
// updateStatus
// ============================================================================

describe('updateStatus', () => {
  it('updates instance status', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    expect(lb.updateStatus(inst.instanceId, 'DEGRADED')).toEqual({ success: true });
    const listed = lb.listInstances('api');
    expect(listed[0]?.status).toBe('DEGRADED');
  });

  it('returns instance-not-found for unknown id', () => {
    const { lb } = makeBalancer();
    expect(lb.updateStatus('nope', 'UNHEALTHY')).toEqual({
      success: false,
      error: 'instance-not-found',
    });
  });
});

// ============================================================================
// routeRequest
// ============================================================================

describe('routeRequest', () => {
  it('routes to a healthy instance', () => {
    const { lb } = makeBalancer();
    lb.registerInstance('api', 'h1', 50);
    const result = lb.routeRequest('api', 'req-1');
    expect(isDecision(result)).toBe(true);
    if (!isDecision(result)) return;
    expect(result.requestId).toBe('req-1');
    expect(result.serviceName).toBe('api');
  });

  it('returns no-healthy-instances when none exist', () => {
    const { lb } = makeBalancer();
    expect(lb.routeRequest('api', 'req-1')).toBe('no-healthy-instances');
  });

  it('returns no-healthy-instances when all UNHEALTHY', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    lb.updateStatus(inst.instanceId, 'UNHEALTHY');
    expect(lb.routeRequest('api', 'req-1')).toBe('no-healthy-instances');
  });

  it('routes to DEGRADED instances', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    lb.updateStatus(inst.instanceId, 'DEGRADED');
    expect(isDecision(lb.routeRequest('api', 'req-1'))).toBe(true);
  });

  it('skips DRAINING instances', () => {
    const { lb } = makeBalancer();
    const a = lb.registerInstance('api', 'h1', 50);
    const b = lb.registerInstance('api', 'h2', 50);
    if (!isInstance(a) || !isInstance(b)) return;
    lb.updateStatus(a.instanceId, 'DRAINING');
    const result = lb.routeRequest('api', 'req-1');
    if (!isDecision(result)) return;
    expect(result.instanceId).toBe(b.instanceId);
  });

  it('increments currentConnections and totalRequests on routing', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    lb.routeRequest('api', 'req-1');
    const listed = lb.listInstances('api');
    expect(listed[0]?.currentConnections).toBe(1);
    expect(listed[0]?.totalRequests).toBe(1);
  });

  it('uses least-loaded-by-weight: picks instance with lower totalRequests/weight ratio', () => {
    const { lb } = makeBalancer();
    const a = lb.registerInstance('api', 'h-a', 10);
    const b = lb.registerInstance('api', 'h-b', 50);
    if (!isInstance(a) || !isInstance(b)) return;

    // route to a first (both have 0 requests, sorted by instanceId)
    lb.routeRequest('api', 'r1');
    // now a has 1 request at weight 10 (ratio=0.1), b has 0 at weight 50 (ratio=0)
    // b should be chosen next
    const decision = lb.routeRequest('api', 'r2');
    if (!isDecision(decision)) return;
    expect(decision.instanceId).toBe(b.instanceId);
  });
});

// ============================================================================
// releaseConnection
// ============================================================================

describe('releaseConnection', () => {
  it('decrements currentConnections', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    lb.routeRequest('api', 'r1');
    lb.routeRequest('api', 'r2');
    lb.releaseConnection(inst.instanceId);
    expect(lb.listInstances('api')[0]?.currentConnections).toBe(1);
  });

  it('does not go below zero', () => {
    const { lb } = makeBalancer();
    const inst = lb.registerInstance('api', 'h1', 50);
    if (!isInstance(inst)) return;
    lb.releaseConnection(inst.instanceId);
    lb.releaseConnection(inst.instanceId);
    expect(lb.listInstances('api')[0]?.currentConnections).toBe(0);
  });

  it('returns instance-not-found for unknown id', () => {
    const { lb } = makeBalancer();
    expect(lb.releaseConnection('nope')).toEqual({ success: false, error: 'instance-not-found' });
  });
});

// ============================================================================
// getStats / listInstances
// ============================================================================

describe('getStats', () => {
  it('returns stats for a registered service', () => {
    const { lb } = makeBalancer();
    lb.registerInstance('api', 'h1', 50);
    lb.registerInstance('api', 'h2', 50);
    const stats = lb.getStats('api');
    expect(stats).toBeDefined();
    if (!stats) return;
    expect(stats.totalInstances).toBe(2);
    expect(stats.healthyInstances).toBe(2);
    expect(stats.serviceName).toBe('api');
  });

  it('returns undefined for unknown service', () => {
    const { lb } = makeBalancer();
    expect(lb.getStats('unknown')).toBeUndefined();
  });

  it('counts only HEALTHY and DEGRADED as healthy', () => {
    const { lb } = makeBalancer();
    const a = lb.registerInstance('api', 'h1', 50);
    const b = lb.registerInstance('api', 'h2', 50);
    const c = lb.registerInstance('api', 'h3', 50);
    if (!isInstance(a) || !isInstance(b) || !isInstance(c)) return;
    lb.updateStatus(b.instanceId, 'DEGRADED');
    lb.updateStatus(c.instanceId, 'UNHEALTHY');
    const stats = lb.getStats('api');
    expect(stats?.healthyInstances).toBe(2);
  });

  it('returns correct avgConnectionsPerInstance', () => {
    const { lb } = makeBalancer();
    lb.registerInstance('api', 'h1', 50);
    lb.registerInstance('api', 'h2', 50);
    lb.routeRequest('api', 'r1');
    lb.routeRequest('api', 'r2');
    lb.routeRequest('api', 'r3');
    const stats = lb.getStats('api');
    expect(stats?.avgConnectionsPerInstance).toBe(1.5);
  });
});

describe('listInstances', () => {
  it('lists instances for a service', () => {
    const { lb } = makeBalancer();
    lb.registerInstance('api', 'h1', 50);
    lb.registerInstance('api', 'h2', 50);
    lb.registerInstance('other', 'h3', 50);
    expect(lb.listInstances('api')).toHaveLength(2);
    expect(lb.listInstances('other')).toHaveLength(1);
  });

  it('returns empty for unknown service', () => {
    const { lb } = makeBalancer();
    expect(lb.listInstances('nope')).toHaveLength(0);
  });
});
