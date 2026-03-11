import { describe, it, expect, beforeEach } from 'vitest';
import {
  createExplorationTrackerSystem,
  type ExplorationTrackerSystem,
  type ExplorationClock,
  type ExplorationIdGenerator,
  type ExplorationLogger,
} from '../exploration-tracker.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements ExplorationClock {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements ExplorationIdGenerator {
  private counter = 0;
  generate(): string {
    return 'exp-' + String(++this.counter);
  }
}

class TestLogger implements ExplorationLogger {
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

function makeSystem(): {
  sys: ExplorationTrackerSystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createExplorationTrackerSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

function setupEntityAndWorld(
  sys: ExplorationTrackerSystem,
  entityId = 'entity-1',
  worldId = 'world-A',
): void {
  sys.registerEntity(entityId);
  sys.registerWorld(worldId);
}

// ── Tests ────────────────────────────────────────────────────────

describe('ExplorationTracker — registerEntity / registerWorld / registerRegion', () => {
  let sys: ExplorationTrackerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers an entity successfully', () => {
    const result = sys.registerEntity('entity-1');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate entity registration', () => {
    sys.registerEntity('entity-1');
    const result = sys.registerEntity('entity-1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });

  it('registers a world successfully', () => {
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(true);
  });

  it('registerWorld is idempotent', () => {
    sys.registerWorld('world-A');
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(true);
  });

  it('registerRegion is idempotent', () => {
    sys.registerRegion('region-1', 'world-A');
    const result = sys.registerRegion('region-1', 'world-A');
    expect(result.success).toBe(true);
  });
});

describe('ExplorationTracker — discoverWorld', () => {
  let sys: ExplorationTrackerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupEntityAndWorld(sys);
  });

  it('discovers a world with SCOUTED status', () => {
    const result = sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.worldId).toBe('world-A');
    expect(result.entityId).toBe('entity-1');
    expect(result.status).toBe('SCOUTED');
    expect(result.visitCount).toBe(1);
  });

  it('discovers a world with SETTLED status', () => {
    const result = sys.discoverWorld('entity-1', 'world-A', 'SETTLED');
    if (typeof result === 'string') return;
    expect(result.status).toBe('SETTLED');
  });

  it('rejects discovery of unregistered entity', () => {
    const result = sys.discoverWorld('unknown-entity', 'world-A', 'SCOUTED');
    expect(result).toBe('entity-not-found');
  });

  it('rejects discovery of unregistered world', () => {
    const result = sys.discoverWorld('entity-1', 'unknown-world', 'SCOUTED');
    expect(result).toBe('world-not-found');
  });

  it('rejects duplicate discovery by same entity', () => {
    sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
    const result = sys.discoverWorld('entity-1', 'world-A', 'CHARTED');
    expect(result).toBe('already-discovered');
  });

  it('allows two entities to discover the same world', () => {
    sys.registerEntity('entity-2');
    sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
    const result = sys.discoverWorld('entity-2', 'world-A', 'SCOUTED');
    expect(typeof result).not.toBe('string');
  });
});

describe('ExplorationTracker — upgradeWorldStatus / visitWorld', () => {
  let sys: ExplorationTrackerSystem;
  let clock: TestClock;

  beforeEach(() => {
    ({ sys, clock } = makeSystem());
    setupEntityAndWorld(sys);
    sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
  });

  it('upgrades world status from SCOUTED to CHARTED', () => {
    const result = sys.upgradeWorldStatus('entity-1', 'world-A', 'CHARTED');
    expect(result.success).toBe(true);
    expect(sys.getWorldExploration('entity-1', 'world-A')?.status).toBe('CHARTED');
  });

  it('upgrades world status from CHARTED to SETTLED', () => {
    sys.upgradeWorldStatus('entity-1', 'world-A', 'CHARTED');
    const result = sys.upgradeWorldStatus('entity-1', 'world-A', 'SETTLED');
    expect(result.success).toBe(true);
    expect(sys.getWorldExploration('entity-1', 'world-A')?.status).toBe('SETTLED');
  });

  it('rejects downgrade from CHARTED to SCOUTED', () => {
    sys.upgradeWorldStatus('entity-1', 'world-A', 'CHARTED');
    const result = sys.upgradeWorldStatus('entity-1', 'world-A', 'SCOUTED');
    expect(result.success).toBe(false);
  });

  it('rejects setting same status as current', () => {
    const result = sys.upgradeWorldStatus('entity-1', 'world-A', 'SCOUTED');
    expect(result.success).toBe(false);
  });

  it('upgradeWorldStatus returns error for undiscovered world', () => {
    sys.registerWorld('world-Z');
    const result = sys.upgradeWorldStatus('entity-1', 'world-Z', 'CHARTED');
    expect(result.success).toBe(false);
  });

  it('visitWorld increments visitCount', () => {
    sys.visitWorld('entity-1', 'world-A');
    const exploration = sys.getWorldExploration('entity-1', 'world-A');
    expect(exploration?.visitCount).toBe(2);
  });

  it('visitWorld updates lastVisitedAt', () => {
    const before = sys.getWorldExploration('entity-1', 'world-A')?.lastVisitedAt;
    clock.advance(5000n);
    sys.visitWorld('entity-1', 'world-A');
    const after = sys.getWorldExploration('entity-1', 'world-A')?.lastVisitedAt;
    expect(after).not.toEqual(before);
  });

  it('visitWorld returns error for undiscovered world', () => {
    sys.registerWorld('world-Z');
    const result = sys.visitWorld('entity-1', 'world-Z');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('world-not-found');
  });
});

describe('ExplorationTracker — discoverRegion / profile / list', () => {
  let sys: ExplorationTrackerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerEntity('entity-1');
    sys.registerWorld('world-A');
    sys.registerRegion('region-1', 'world-A');
    sys.registerRegion('region-2', 'world-A');
  });

  it('discovers a region with SCOUTED status by default', () => {
    const result = sys.discoverRegion('entity-1', 'region-1');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.status).toBe('SCOUTED');
    expect(result.regionId).toBe('region-1');
    expect(result.worldId).toBe('world-A');
  });

  it('rejects discovery of unregistered region', () => {
    const result = sys.discoverRegion('entity-1', 'region-unknown');
    expect(result).toBe('region-not-found');
  });

  it('rejects discovery by unregistered entity', () => {
    const result = sys.discoverRegion('ghost-entity', 'region-1');
    expect(result).toBe('entity-not-found');
  });

  it('rejects duplicate region discovery by same entity', () => {
    sys.discoverRegion('entity-1', 'region-1');
    const result = sys.discoverRegion('entity-1', 'region-1');
    expect(result).toBe('already-discovered');
  });

  it('getExplorationProfile returns correct counts', () => {
    sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
    sys.discoverRegion('entity-1', 'region-1');
    sys.discoverRegion('entity-1', 'region-2');
    const profile = sys.getExplorationProfile('entity-1');
    expect(profile?.worldsDiscovered).toBe(1);
    expect(profile?.regionsDiscovered).toBe(2);
    expect(profile?.settledWorlds).toBe(0);
  });

  it('getExplorationProfile counts settled worlds', () => {
    sys.discoverWorld('entity-1', 'world-A', 'SETTLED');
    const profile = sys.getExplorationProfile('entity-1');
    expect(profile?.settledWorlds).toBe(1);
  });

  it('getExplorationProfile returns undefined for unregistered entity', () => {
    expect(sys.getExplorationProfile('ghost')).toBeUndefined();
  });

  it('listDiscoveredWorlds returns all worlds for entity', () => {
    sys.registerWorld('world-B');
    sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
    sys.discoverWorld('entity-1', 'world-B', 'CHARTED');
    expect(sys.listDiscoveredWorlds('entity-1').length).toBe(2);
  });

  it('listDiscoveredWorlds is isolated per entity', () => {
    sys.registerEntity('entity-2');
    sys.discoverWorld('entity-1', 'world-A', 'SCOUTED');
    expect(sys.listDiscoveredWorlds('entity-2').length).toBe(0);
  });
});
