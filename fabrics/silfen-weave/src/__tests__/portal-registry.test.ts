import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPortalRegistrySystem,
  type PortalRegistrySystem,
  type PortalClock,
  type PortalIdGenerator,
  type PortalLogger,
} from '../portal-registry.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements PortalClock {
  private readonly time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
}

class TestIdGen implements PortalIdGenerator {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements PortalLogger {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  info(m: string): void {
    this.infos.push(m);
  }
  warn(m: string): void {
    this.warns.push(m);
  }
  error(m: string): void {
    this.errors.push(m);
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function makeSystem(): { sys: PortalRegistrySystem; logger: TestLogger } {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createPortalRegistrySystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, logger };
}

// ── Tests ────────────────────────────────────────────────────────

describe('PortalRegistry — openPortal', () => {
  let sys: PortalRegistrySystem;
  let logger: TestLogger;

  beforeEach(() => {
    ({ sys, logger } = makeSystem());
  });

  it('creates a portal with valid params', () => {
    const result = sys.openPortal('world-A', 'world-B', 80, 500n);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.fromWorldId).toBe('world-A');
    expect(result.toWorldId).toBe('world-B');
    expect(result.stabilityScore).toBe(80);
    expect(result.energyCostKalon).toBe(500n);
    expect(result.traversalCount).toBe(0);
    expect(result.lastTraversedAt).toBeNull();
  });

  it('assigns STABLE status for stability >= 25', () => {
    const result = sys.openPortal('A', 'B', 50, 100n);
    if (typeof result === 'string') return;
    expect(result.status).toBe('STABLE');
  });

  it('assigns UNSTABLE status for stability 1–24', () => {
    const result = sys.openPortal('A', 'B', 10, 100n);
    if (typeof result === 'string') return;
    expect(result.status).toBe('UNSTABLE');
  });

  it('assigns CLOSED status for stability 0', () => {
    const result = sys.openPortal('A', 'B', 0, 100n);
    if (typeof result === 'string') return;
    expect(result.status).toBe('CLOSED');
  });

  it('rejects same-world portals', () => {
    const result = sys.openPortal('world-X', 'world-X', 50, 100n);
    expect(result).toBe('invalid-world');
    expect(logger.errors.length).toBeGreaterThan(0);
  });

  it('rejects stability above 100', () => {
    expect(sys.openPortal('A', 'B', 101, 100n)).toBe('invalid-stability');
  });

  it('rejects negative stability', () => {
    expect(sys.openPortal('A', 'B', -1, 100n)).toBe('invalid-stability');
  });

  it('rejects duplicate directional pair', () => {
    sys.openPortal('A', 'B', 50, 100n);
    expect(sys.openPortal('A', 'B', 60, 200n)).toBe('already-exists');
  });

  it('allows reverse direction of existing pair', () => {
    sys.openPortal('A', 'B', 50, 100n);
    const result = sys.openPortal('B', 'A', 50, 100n);
    expect(typeof result).not.toBe('string');
  });

  it('logs creation', () => {
    sys.openPortal('A', 'B', 50, 100n);
    expect(logger.infos.some((m) => m.includes('Opened portal'))).toBe(true);
  });
});

describe('PortalRegistry — recordTraversal', () => {
  let sys: PortalRegistrySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('records traversal on a STABLE portal', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    const result = sys.recordTraversal(portal.portalId, 'entity-1', 'FORWARD');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.traversal.direction).toBe('FORWARD');
    expect(result.traversal.entityId).toBe('entity-1');
  });

  it('increments traversalCount', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    sys.recordTraversal(portal.portalId, 'e1', 'FORWARD');
    sys.recordTraversal(portal.portalId, 'e2', 'REVERSE');
    expect(sys.getPortal(portal.portalId)?.traversalCount).toBe(2);
  });

  it('sets lastTraversedAt after traversal', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    sys.recordTraversal(portal.portalId, 'e1', 'FORWARD');
    expect(sys.getPortal(portal.portalId)?.lastTraversedAt).not.toBeNull();
  });

  it('rejects traversal on CLOSED portal', () => {
    const portal = sys.openPortal('A', 'B', 0, 100n);
    if (typeof portal === 'string') return;
    const result = sys.recordTraversal(portal.portalId, 'e1', 'FORWARD');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('portal-closed');
  });

  it('rejects traversal on COLLAPSED portal', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    sys.collapsePortal(portal.portalId);
    const result = sys.recordTraversal(portal.portalId, 'e1', 'FORWARD');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('portal-closed');
  });

  it('returns portal-not-found for unknown portal', () => {
    const result = sys.recordTraversal('fake', 'e1', 'FORWARD');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('portal-not-found');
  });
});

describe('PortalRegistry — updateStability / close / collapse', () => {
  let sys: PortalRegistrySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('updates stability and status', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    const result = sys.updateStability(portal.portalId, 10);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.portal.stabilityScore).toBe(10);
    expect(result.portal.status).toBe('UNSTABLE');
  });

  it('transitions to STABLE when stability reaches 25', () => {
    const portal = sys.openPortal('A', 'B', 10, 100n);
    if (typeof portal === 'string') return;
    sys.updateStability(portal.portalId, 25);
    expect(sys.getPortal(portal.portalId)?.status).toBe('STABLE');
  });

  it('rejects stability out of range', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    const result = sys.updateStability(portal.portalId, 150);
    expect(result.success).toBe(false);
  });

  it('updateStability returns portal-not-found for unknown id', () => {
    expect(sys.updateStability('fake', 50).success).toBe(false);
  });

  it('closes an open portal', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    expect(sys.closePortal(portal.portalId).success).toBe(true);
    expect(sys.getPortal(portal.portalId)?.status).toBe('CLOSED');
  });

  it('collapses a portal', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    expect(sys.collapsePortal(portal.portalId).success).toBe(true);
    expect(sys.getPortal(portal.portalId)?.status).toBe('COLLAPSED');
  });

  it('closePortal returns portal-not-found on unknown', () => {
    expect(sys.closePortal('fake').success).toBe(false);
  });

  it('collapsePortal returns portal-not-found on unknown', () => {
    expect(sys.collapsePortal('fake').success).toBe(false);
  });
});

describe('PortalRegistry — listPortals', () => {
  let sys: PortalRegistrySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('lists all portals when no worldId given', () => {
    sys.openPortal('A', 'B', 50, 100n);
    sys.openPortal('C', 'D', 50, 100n);
    expect(sys.listPortals().length).toBe(2);
  });

  it('filters by fromWorldId', () => {
    sys.openPortal('A', 'B', 50, 100n);
    sys.openPortal('C', 'D', 50, 100n);
    expect(sys.listPortals('A').length).toBe(1);
  });

  it('filters by toWorldId', () => {
    sys.openPortal('A', 'B', 50, 100n);
    sys.openPortal('C', 'D', 50, 100n);
    expect(sys.listPortals('B').length).toBe(1);
  });

  it('includes portal where world is either endpoint', () => {
    sys.openPortal('A', 'B', 50, 100n);
    sys.openPortal('B', 'C', 50, 100n);
    expect(sys.listPortals('B').length).toBe(2);
  });
});

describe('PortalRegistry — traversal history and stats', () => {
  let sys: PortalRegistrySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('getTraversalHistory respects limit', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    sys.recordTraversal(portal.portalId, 'e1', 'FORWARD');
    sys.recordTraversal(portal.portalId, 'e2', 'REVERSE');
    sys.recordTraversal(portal.portalId, 'e3', 'FORWARD');
    expect(sys.getTraversalHistory(portal.portalId, 2).length).toBe(2);
  });

  it('getTraversalHistory filters by portal', () => {
    const p1 = sys.openPortal('A', 'B', 80, 100n);
    const p2 = sys.openPortal('C', 'D', 80, 100n);
    if (typeof p1 === 'string' || typeof p2 === 'string') return;
    sys.recordTraversal(p1.portalId, 'e1', 'FORWARD');
    sys.recordTraversal(p2.portalId, 'e2', 'FORWARD');
    const history = sys.getTraversalHistory(p1.portalId, 10);
    expect(history.length).toBe(1);
    expect(history[0]?.entityId).toBe('e1');
  });

  it('getStats returns zeroed stats initially', () => {
    const stats = sys.getStats();
    expect(stats.totalPortals).toBe(0);
    expect(stats.totalTraversals).toBe(0);
  });

  it('getStats counts portals by status', () => {
    sys.openPortal('A', 'B', 80, 100n);
    sys.openPortal('C', 'D', 10, 100n);
    sys.openPortal('E', 'F', 0, 100n);
    const p4 = sys.openPortal('G', 'H', 80, 100n);
    if (typeof p4 !== 'string') sys.collapsePortal(p4.portalId);
    const stats = sys.getStats();
    expect(stats.stableCount).toBe(1);
    expect(stats.unstableCount).toBe(1);
    expect(stats.closedCount).toBe(1);
    expect(stats.collapsedCount).toBe(1);
  });

  it('getStats counts total traversals', () => {
    const portal = sys.openPortal('A', 'B', 80, 100n);
    if (typeof portal === 'string') return;
    sys.recordTraversal(portal.portalId, 'e1', 'FORWARD');
    sys.recordTraversal(portal.portalId, 'e2', 'REVERSE');
    expect(sys.getStats().totalTraversals).toBe(2);
  });
});
