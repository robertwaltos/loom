import { describe, it, expect } from 'vitest';
import { createDependencyGraphSystem } from '../dependency-graph.js';
import type { DependencyGraphSystem, ServiceNode, Dependency } from '../dependency-graph.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): DependencyGraphSystem {
  return createDependencyGraphSystem({
    clock: { nowMicroseconds: () => BigInt(Date.now()) * 1000n },
    idGen: { next: () => 'id-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

function asNode(r: ServiceNode | string): ServiceNode {
  if (typeof r === 'string') throw new Error('Expected ServiceNode, got: ' + r);
  return r;
}

function asDep(r: Dependency | string): Dependency {
  if (typeof r === 'string') throw new Error('Expected Dependency, got: ' + r);
  return r;
}

// ─── registerService ──────────────────────────────────────────────────────────

describe('registerService', () => {
  it('registers a new service with HEALTHY default', () => {
    const sys = createTestSystem();
    const node = asNode(sys.registerService('svc-a', 'Service A', '1.0.0'));
    expect(node.serviceId).toBe('svc-a');
    expect(node.name).toBe('Service A');
    expect(node.version).toBe('1.0.0');
    expect(node.health).toBe('HEALTHY');
  });

  it('returns already-exists for duplicate serviceId', () => {
    const sys = createTestSystem();
    sys.registerService('svc-a', 'Service A', '1.0.0');
    expect(sys.registerService('svc-a', 'Service A', '2.0.0')).toBe('already-exists');
  });

  it('getService returns undefined for unknown id', () => {
    const sys = createTestSystem();
    expect(sys.getService('ghost')).toBeUndefined();
  });
});

// ─── addDependency ────────────────────────────────────────────────────────────

describe('addDependency', () => {
  it('adds a dependency between two services', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    const dep = asDep(sys.addDependency('a', 'b', true));
    expect(dep.fromServiceId).toBe('a');
    expect(dep.toServiceId).toBe('b');
    expect(dep.required).toBe(true);
  });

  it('returns self-dependency for same service', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    expect(sys.addDependency('a', 'a', false)).toBe('self-dependency');
  });

  it('returns service-not-found for unknown fromServiceId', () => {
    const sys = createTestSystem();
    sys.registerService('b', 'B', '1.0');
    expect(sys.addDependency('ghost', 'b', false)).toBe('service-not-found');
  });

  it('returns service-not-found for unknown toServiceId', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    expect(sys.addDependency('a', 'ghost', false)).toBe('service-not-found');
  });

  it('returns already-exists for duplicate pair', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.addDependency('a', 'b', true);
    expect(sys.addDependency('a', 'b', false)).toBe('already-exists');
  });

  it('returns circular-dependency for cycle-creating edge', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.addDependency('a', 'b', true);
    expect(sys.addDependency('b', 'a', true)).toBe('circular-dependency');
  });

  it('detects transitive cycle', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.registerService('c', 'C', '1.0');
    sys.addDependency('a', 'b', true);
    sys.addDependency('b', 'c', true);
    expect(sys.addDependency('c', 'a', true)).toBe('circular-dependency');
  });
});

// ─── removeDependency ─────────────────────────────────────────────────────────

describe('removeDependency', () => {
  it('removes an existing dependency', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    const dep = asDep(sys.addDependency('a', 'b', true));
    expect(sys.removeDependency(dep.dependencyId)).toEqual({ success: true });
    expect(sys.getDependencies('a').length).toBe(0);
  });

  it('allows re-adding pair after removal', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    const dep = asDep(sys.addDependency('a', 'b', true));
    sys.removeDependency(dep.dependencyId);
    expect(typeof sys.addDependency('a', 'b', false)).not.toBe('string');
  });

  it('returns dependency-not-found for unknown id', () => {
    const sys = createTestSystem();
    expect(sys.removeDependency('bad')).toEqual({ success: false, error: 'dependency-not-found' });
  });
});

// ─── updateHealth ─────────────────────────────────────────────────────────────

describe('updateHealth', () => {
  it('updates service health', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.updateHealth('a', 'DEGRADED');
    expect(sys.getService('a')?.health).toBe('DEGRADED');
  });

  it('returns service-not-found for unknown service', () => {
    const sys = createTestSystem();
    expect(sys.updateHealth('ghost', 'DOWN')).toEqual({
      success: false,
      error: 'service-not-found',
    });
  });
});

// ─── getDependencies / getDependents ─────────────────────────────────────────

describe('getDependencies / getDependents', () => {
  it('getDependencies returns edges from a service', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.registerService('c', 'C', '1.0');
    sys.addDependency('a', 'b', true);
    sys.addDependency('a', 'c', false);
    expect(sys.getDependencies('a').length).toBe(2);
  });

  it('getDependents returns edges pointing to a service', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.addDependency('a', 'b', true);
    expect(sys.getDependents('b').length).toBe(1);
    expect(sys.getDependents('a').length).toBe(0);
  });
});

// ─── getTransitiveDependencies ────────────────────────────────────────────────

describe('getTransitiveDependencies', () => {
  it('returns all reachable services excluding self', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.registerService('c', 'C', '1.0');
    sys.addDependency('a', 'b', true);
    sys.addDependency('b', 'c', true);
    const transitive = sys.getTransitiveDependencies('a');
    expect(transitive).toContain('b');
    expect(transitive).toContain('c');
    expect(transitive).not.toContain('a');
  });

  it('returns empty for service with no dependencies', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    expect(sys.getTransitiveDependencies('a').length).toBe(0);
  });
});

// ─── detectCycles ─────────────────────────────────────────────────────────────

describe('detectCycles', () => {
  it('returns empty array when no cycles', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.addDependency('a', 'b', true);
    expect(sys.detectCycles().length).toBe(0);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('reports correct totals', () => {
    const sys = createTestSystem();
    sys.registerService('a', 'A', '1.0');
    sys.registerService('b', 'B', '1.0');
    sys.addDependency('a', 'b', true);
    const stats = sys.getStats();
    expect(stats.totalServices).toBe(2);
    expect(stats.totalDependencies).toBe(1);
    expect(stats.circularDependencies).toBe(0);
    expect(stats.avgDependenciesPerService).toBe(0.5);
  });

  it('returns 0 avgDependenciesPerService when no services', () => {
    const sys = createTestSystem();
    expect(sys.getStats().avgDependenciesPerService).toBe(0);
  });
});
