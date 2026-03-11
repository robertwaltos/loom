import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFactionTerritorySystem,
  type FactionTerritorySystem,
  type TerritoryClockPort,
  type TerritoryIdGeneratorPort,
  type TerritoryLoggerPort,
} from '../faction-territory.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements TerritoryClockPort {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements TerritoryIdGeneratorPort {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements TerritoryLoggerPort {
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
  sys: FactionTerritorySystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createFactionTerritorySystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

function setupBasicWorld(sys: FactionTerritorySystem): void {
  sys.registerFaction('faction-A');
  sys.registerFaction('faction-B');
  sys.registerWorld('world-1');
  sys.addRegion('region-X', 'world-1');
}

// ── Tests ────────────────────────────────────────────────────────

describe('FactionTerritorySystem — registration', () => {
  let sys: FactionTerritorySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers a faction successfully', () => {
    const result = sys.registerFaction('faction-A');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate faction registration', () => {
    sys.registerFaction('faction-A');
    const result = sys.registerFaction('faction-A');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });

  it('registers a world successfully', () => {
    const result = sys.registerWorld('world-1');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate world registration', () => {
    sys.registerWorld('world-1');
    const result = sys.registerWorld('world-1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });

  it('adds a region to a registered world', () => {
    sys.registerWorld('world-1');
    const result = sys.addRegion('region-X', 'world-1');
    expect(result.success).toBe(true);
  });

  it('rejects region addition for unregistered world', () => {
    const result = sys.addRegion('region-X', 'world-unknown');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('world-not-found');
  });

  it('rejects duplicate region registration', () => {
    sys.registerWorld('world-1');
    sys.addRegion('region-X', 'world-1');
    const result = sys.addRegion('region-X', 'world-1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });
});

describe('FactionTerritorySystem — claimRegion', () => {
  let sys: FactionTerritorySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupBasicWorld(sys);
  });

  it('claims a NEUTRAL region successfully', () => {
    const result = sys.claimRegion('faction-A', 'region-X');
    expect(result.success).toBe(true);
    const regions = sys.listRegions('world-1');
    expect(regions[0]?.status).toBe('CONTROLLED');
    expect(regions[0]?.factionId).toBe('faction-A');
  });

  it('sets controlledSince on successful claim', () => {
    sys.claimRegion('faction-A', 'region-X');
    const regions = sys.listRegions('world-1');
    expect(regions[0]?.controlledSince).not.toBeNull();
  });

  it('rejects claim by unregistered faction', () => {
    const result = sys.claimRegion('ghost-faction', 'region-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('faction-not-found');
  });

  it('rejects claim of unregistered region', () => {
    const result = sys.claimRegion('faction-A', 'region-unknown');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('region-not-found');
  });

  it('rejects claim of already CONTROLLED region', () => {
    sys.claimRegion('faction-A', 'region-X');
    const result = sys.claimRegion('faction-B', 'region-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-claimed');
  });

  it('allows claiming an ABANDONED region', () => {
    sys.claimRegion('faction-A', 'region-X');
    sys.abandonRegion('faction-A', 'region-X');
    const result = sys.claimRegion('faction-B', 'region-X');
    expect(result.success).toBe(true);
  });
});

describe('FactionTerritorySystem — contestRegion and resolveConflict', () => {
  let sys: FactionTerritorySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupBasicWorld(sys);
    sys.claimRegion('faction-A', 'region-X');
  });

  it('creates a conflict when contesting a controlled region', () => {
    const result = sys.contestRegion('faction-B', 'region-X');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.conflict.aggressorId).toBe('faction-B');
    expect(result.conflict.defenderId).toBe('faction-A');
    expect(result.conflict.resolvedAt).toBeNull();
  });

  it('sets region status to CONTESTED after contest', () => {
    sys.contestRegion('faction-B', 'region-X');
    const regions = sys.listRegions('world-1');
    expect(regions[0]?.status).toBe('CONTESTED');
  });

  it('rejects contest by unregistered faction', () => {
    const result = sys.contestRegion('ghost-faction', 'region-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('faction-not-found');
  });

  it('rejects contest of NEUTRAL region', () => {
    sys.registerWorld('world-2');
    sys.addRegion('region-Y', 'world-2');
    const result = sys.contestRegion('faction-B', 'region-Y');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('not-claimed');
  });

  it('rejects self-contest of own region', () => {
    const result = sys.contestRegion('faction-A', 'region-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('not-claimed');
  });

  it('resolves conflict in favor of defender — region stays CONTROLLED by defender', () => {
    const contestResult = sys.contestRegion('faction-B', 'region-X');
    if (!contestResult.success) return;
    const conflictId = contestResult.conflict.conflictId;
    const result = sys.resolveConflict(conflictId, 'faction-A');
    expect(result.success).toBe(true);
    const regions = sys.listRegions('world-1');
    expect(regions[0]?.status).toBe('CONTROLLED');
    expect(regions[0]?.factionId).toBe('faction-A');
  });

  it('resolves conflict in favor of aggressor — transfers control', () => {
    const contestResult = sys.contestRegion('faction-B', 'region-X');
    if (!contestResult.success) return;
    sys.resolveConflict(contestResult.conflict.conflictId, 'faction-B');
    const regions = sys.listRegions('world-1');
    expect(regions[0]?.factionId).toBe('faction-B');
    expect(regions[0]?.status).toBe('CONTROLLED');
  });

  it('rejects resolveConflict for unknown conflict', () => {
    const result = sys.resolveConflict('no-such-conflict', 'faction-A');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('conflict-not-found');
  });

  it('getConflicts returns conflicts for a world', () => {
    sys.contestRegion('faction-B', 'region-X');
    const conflicts = sys.getConflicts('world-1');
    expect(conflicts.length).toBe(1);
  });
});

describe('FactionTerritorySystem — abandonRegion and getFactionTerritory', () => {
  let sys: FactionTerritorySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupBasicWorld(sys);
  });

  it('abandons a controlled region', () => {
    sys.claimRegion('faction-A', 'region-X');
    const result = sys.abandonRegion('faction-A', 'region-X');
    expect(result.success).toBe(true);
    const regions = sys.listRegions('world-1');
    expect(regions[0]?.status).toBe('ABANDONED');
    expect(regions[0]?.factionId).toBeNull();
  });

  it('rejects abandon by non-controlling faction', () => {
    sys.claimRegion('faction-A', 'region-X');
    const result = sys.abandonRegion('faction-B', 'region-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('not-claimed');
  });

  it('rejects abandon by unregistered faction', () => {
    const result = sys.abandonRegion('ghost', 'region-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('faction-not-found');
  });

  it('getFactionTerritory returns undefined for unknown faction', () => {
    expect(sys.getFactionTerritory('ghost')).toBeUndefined();
  });

  it('getFactionTerritory counts controlled and contested regions', () => {
    sys.addRegion('region-Y', 'world-1');
    sys.claimRegion('faction-A', 'region-X');
    sys.claimRegion('faction-A', 'region-Y');
    sys.contestRegion('faction-B', 'region-X');
    const territory = sys.getFactionTerritory('faction-A');
    expect(territory?.controlledRegions).toBe(1);
    expect(territory?.contestedRegions).toBe(1);
    expect(territory?.totalRegions).toBe(2);
  });

  it('listRegions filters by factionId', () => {
    sys.addRegion('region-Y', 'world-1');
    sys.claimRegion('faction-A', 'region-X');
    sys.claimRegion('faction-B', 'region-Y');
    const regions = sys.listRegions('world-1', 'faction-A');
    expect(regions.length).toBe(1);
    expect(regions[0]?.regionId).toBe('region-X');
  });
});
