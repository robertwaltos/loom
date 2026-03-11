import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldAnchorSystem,
  type WorldAnchorSystem,
  type AnchorClock,
  type AnchorIdGenerator,
  type AnchorLogger,
  type Coordinates,
} from '../world-anchor.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements AnchorClock {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements AnchorIdGenerator {
  private counter = 0;
  generate(): string {
    return 'anchor-' + String(++this.counter);
  }
}

class TestLogger implements AnchorLogger {
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

function makeSystem(): { sys: WorldAnchorSystem; clock: TestClock; logger: TestLogger } {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createWorldAnchorSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

const coord = (x: number, y: number, z: number): Coordinates => ({ x, y, z });

// ── Tests ────────────────────────────────────────────────────────

describe('WorldAnchor — placeAnchor', () => {
  let sys: WorldAnchorSystem;
  let logger: TestLogger;

  beforeEach(() => {
    ({ sys, logger } = makeSystem());
  });

  it('creates an anchor with valid params', () => {
    const result = sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(10, 20, 5), 'Base');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.entityId).toBe('entity-1');
    expect(result.worldId).toBe('world-A');
    expect(result.type).toBe('WAYPOINT');
    expect(result.label).toBe('Base');
    expect(result.lastVisitedAt).toBeNull();
  });

  it('rejects NaN coordinates', () => {
    const result = sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(NaN, 0, 0), 'Bad');
    expect(result).toBe('invalid-coordinates');
    expect(logger.errors.length).toBeGreaterThan(0);
  });

  it('rejects Infinity coordinates', () => {
    const result = sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(Infinity, 0, 0), 'Bad');
    expect(result).toBe('invalid-coordinates');
  });

  it('allows any finite coordinates including negatives', () => {
    const result = sys.placeAnchor('entity-1', 'world-A', 'DANGER', coord(-999, -1, 0.5), 'Cave');
    expect(typeof result).not.toBe('string');
  });

  it('enforces one HOME anchor per entity per world', () => {
    sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(0, 0, 0), 'Home 1');
    const result = sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(1, 1, 1), 'Home 2');
    expect(result).toBe('already-anchored');
  });

  it('allows HOME anchors in different worlds', () => {
    sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(0, 0, 0), 'Home A');
    const result = sys.placeAnchor('entity-1', 'world-B', 'HOME', coord(0, 0, 0), 'Home B');
    expect(typeof result).not.toBe('string');
  });

  it('allows different entity HOME anchors in same world', () => {
    sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(0, 0, 0), 'Home 1');
    const result = sys.placeAnchor('entity-2', 'world-A', 'HOME', coord(0, 0, 0), 'Home 2');
    expect(typeof result).not.toBe('string');
  });

  it('enforces max 50 anchors per entity', () => {
    for (let i = 0; i < 50; i++) {
      sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(i, 0, 0), 'wp-' + String(i));
    }
    const result = sys.placeAnchor('entity-1', 'world-A', 'CLAIM', coord(99, 0, 0), 'over');
    expect(result).toBe('anchor-limit-exceeded');
  });

  it('limit is per entity, not global', () => {
    for (let i = 0; i < 50; i++) {
      sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(i, 0, 0), 'wp');
    }
    const result = sys.placeAnchor('entity-2', 'world-A', 'WAYPOINT', coord(0, 0, 0), 'ok');
    expect(typeof result).not.toBe('string');
  });

  it('logs anchor placement', () => {
    sys.placeAnchor('entity-1', 'world-A', 'RESOURCE', coord(1, 2, 3), 'Mine');
    expect(logger.infos.some((m) => m.includes('Anchor placed'))).toBe(true);
  });
});

describe('WorldAnchor — removeAnchor / visitAnchor / moveAnchor', () => {
  let sys: WorldAnchorSystem;
  let clock: TestClock;

  beforeEach(() => {
    ({ sys, clock } = makeSystem());
  });

  it('removes an existing anchor', () => {
    const anchor = sys.placeAnchor('entity-1', 'world-A', 'CLAIM', coord(0, 0, 0), 'Claim');
    if (typeof anchor === 'string') return;
    expect(sys.removeAnchor(anchor.anchorId).success).toBe(true);
    expect(sys.getAnchor(anchor.anchorId)).toBeUndefined();
  });

  it('removeAnchor returns anchor-not-found for unknown id', () => {
    const result = sys.removeAnchor('fake-id');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('anchor-not-found');
  });

  it('visitAnchor updates lastVisitedAt', () => {
    const anchor = sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(0, 0, 0), 'WP');
    if (typeof anchor === 'string') return;
    clock.advance(5000n);
    sys.visitAnchor(anchor.anchorId);
    expect(sys.getAnchor(anchor.anchorId)?.lastVisitedAt).not.toBeNull();
  });

  it('visitAnchor returns anchor-not-found for unknown id', () => {
    const result = sys.visitAnchor('fake-id');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('anchor-not-found');
  });

  it('moveAnchor updates coordinates', () => {
    const anchor = sys.placeAnchor('entity-1', 'world-A', 'DANGER', coord(0, 0, 0), 'Danger');
    if (typeof anchor === 'string') return;
    sys.moveAnchor(anchor.anchorId, coord(50, 50, 50));
    expect(sys.getAnchor(anchor.anchorId)?.coordinates).toEqual({ x: 50, y: 50, z: 50 });
  });

  it('moveAnchor rejects invalid coordinates', () => {
    const anchor = sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(0, 0, 0), 'WP');
    if (typeof anchor === 'string') return;
    const result = sys.moveAnchor(anchor.anchorId, coord(NaN, 0, 0));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('invalid-coordinates');
  });

  it('moveAnchor returns anchor-not-found for unknown id', () => {
    const result = sys.moveAnchor('fake-id', coord(1, 2, 3));
    expect(result.success).toBe(false);
  });
});

describe('WorldAnchor — listAnchors / getAnchorSummary / findNearby', () => {
  let sys: WorldAnchorSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('listAnchors returns all anchors for entity', () => {
    sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(0, 0, 0), 'Home');
    sys.placeAnchor('entity-1', 'world-B', 'WAYPOINT', coord(1, 1, 1), 'WP');
    sys.placeAnchor('entity-2', 'world-A', 'CLAIM', coord(2, 2, 2), 'Claim');
    expect(sys.listAnchors('entity-1').length).toBe(2);
  });

  it('listAnchors filters by worldId', () => {
    sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(0, 0, 0), 'Home');
    sys.placeAnchor('entity-1', 'world-B', 'WAYPOINT', coord(1, 1, 1), 'WP');
    expect(sys.listAnchors('entity-1', 'world-A').length).toBe(1);
  });

  it('getAnchorSummary counts by type', () => {
    sys.placeAnchor('entity-1', 'world-A', 'HOME', coord(0, 0, 0), 'Home');
    sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(1, 0, 0), 'WP1');
    sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(2, 0, 0), 'WP2');
    const summary = sys.getAnchorSummary('entity-1');
    expect(summary.totalAnchors).toBe(3);
    expect(summary.byType.HOME).toBe(1);
    expect(summary.byType.WAYPOINT).toBe(2);
  });

  it('getAnchorSummary lists unique worlds', () => {
    sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(0, 0, 0), 'A');
    sys.placeAnchor('entity-1', 'world-B', 'WAYPOINT', coord(1, 1, 1), 'B');
    sys.placeAnchor('entity-1', 'world-A', 'CLAIM', coord(2, 0, 0), 'C');
    const summary = sys.getAnchorSummary('entity-1');
    expect(summary.worlds.length).toBe(2);
  });

  it('findNearby returns anchors within radius', () => {
    sys.placeAnchor('entity-1', 'world-A', 'WAYPOINT', coord(0, 0, 0), 'Origin');
    sys.placeAnchor('entity-2', 'world-A', 'WAYPOINT', coord(3, 4, 0), 'At5');
    sys.placeAnchor('entity-3', 'world-A', 'WAYPOINT', coord(10, 10, 0), 'Far');
    const nearby = sys.findNearby('world-A', coord(0, 0, 0), 5);
    expect(nearby.length).toBe(2);
  });

  it('findNearby excludes anchors from other worlds', () => {
    sys.placeAnchor('entity-1', 'world-B', 'WAYPOINT', coord(1, 0, 0), 'Other world');
    const nearby = sys.findNearby('world-A', coord(0, 0, 0), 100);
    expect(nearby.length).toBe(0);
  });

  it('getAnchorSummary returns zero counts for entity with no anchors', () => {
    const summary = sys.getAnchorSummary('ghost-entity');
    expect(summary.totalAnchors).toBe(0);
    expect(summary.worlds.length).toBe(0);
    expect(summary.byType.HOME).toBe(0);
  });
});
