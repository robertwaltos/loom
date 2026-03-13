/**
 * weave-network.test.ts — Unit tests for WeaveNetworkEngine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWeaveNetworkEngine,
  type WeaveNetworkEngine,
  type WeaveNetworkDeps,
  type WeaveCorridor,
} from '../weave-network.js';

// ── Test helpers ─────────────────────────────────────────────────

function makeDeps(): WeaveNetworkDeps & { corridorStore: Map<string, WeaveCorridor>; priceBook: Map<string, number> } {
  let idSeq = 0;
  let timeNs = BigInt(1_000_000_000);
  const corridorStore = new Map<string, WeaveCorridor>();
  const priceBook = new Map<string, number>();

  return {
    corridorStore,
    priceBook,
    clock: { now: () => { timeNs += BigInt(1000); return timeNs; } },
    id: { next: () => `id-${String(++idSeq)}` },
    log: { info: () => undefined, warn: () => undefined, error: () => undefined },
    events: { emit: () => undefined },
    corridors: {
      save: (c) => Promise.resolve(void corridorStore.set(c.corridorId, c)),
      getById: (id): Promise<WeaveCorridor | undefined> => Promise.resolve(corridorStore.get(id)),
      getByWorlds: (a, b): Promise<WeaveCorridor | undefined> => {
        for (const c of corridorStore.values()) {
          if ((c.worldIdA === a && c.worldIdB === b) || (c.worldIdA === b && c.worldIdB === a)) return Promise.resolve(c);
        }
        return Promise.resolve(undefined);
      },
      getAll: () => Promise.resolve([...corridorStore.values()]),
      getConnectedWorlds: (wid) => Promise.resolve([...corridorStore.values()].filter((c) => c.worldIdA === wid || c.worldIdB === wid)),
    },
    transits: {
      recordTransit: () => Promise.resolve(undefined),
      getActiveTransits: () => Promise.resolve([]),
    },
    prices: {
      getPrice: (worldId, commodityId): Promise<number> => Promise.resolve(priceBook.get(`${worldId}:${commodityId}`) ?? 100),
    },
  };
}

// ── discoverCorridor ──────────────────────────────────────────────

describe('discoverCorridor', () => {
  let engine: WeaveNetworkEngine;
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(() => {
    deps = makeDeps();
    engine = createWeaveNetworkEngine(deps);
  });

  it('creates a new corridor between two worlds', async () => {
    const c = await engine.discoverCorridor('world-A', 'world-B', 'player-1', 'standard');
    expect(c.worldIdA).toBe('world-A');
    expect(c.worldIdB).toBe('world-B');
    expect(c.discoveredBy).toBe('player-1');
    expect(c.tier).toBe('standard');
    expect(c.status).toBe('unstable');
  });

  it('returns the existing corridor if the pair already exists', async () => {
    const c1 = await engine.discoverCorridor('world-A', 'world-B', 'player-1', 'standard');
    const c2 = await engine.discoverCorridor('world-A', 'world-B', 'player-2', 'hazardous');
    expect(c1.corridorId).toBe(c2.corridorId);
  });

  it('sets danger rating based on tier', async () => {
    const tradeRoute = await engine.discoverCorridor('X', 'Y', 'p', 'trade-route');
    const uncharted = await engine.discoverCorridor('A', 'B', 'p', 'uncharted');
    expect(tradeRoute.dangerRating).toBeLessThan(uncharted.dangerRating);
  });
});

// ── closeCorridor ─────────────────────────────────────────────────

describe('closeCorridor', () => {
  it('sets corridor status to closed', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'player-1', 'standard');
    await engine.closeCorridor(c.corridorId, 'collapse');
    const updated = await engine.getCorridor(c.corridorId);
    expect(updated?.status).toBe('closed');
  });

  it('throws for unknown corridorId', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    await expect(engine.closeCorridor('no-such-id', 'reason')).rejects.toThrow();
  });
});

// ── stabilization ────────────────────────────────────────────────

describe('stabilization', () => {
  let engine: WeaveNetworkEngine;
  let corridorId: string;

  beforeEach(async () => {
    const deps = makeDeps();
    engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    corridorId = c.corridorId;
  });

  it('starts a stabilization mission', async () => {
    const mission = await engine.startStabilization(corridorId, ['p1', 'p2', 'p3']);
    expect(mission.corridorId).toBe(corridorId);
    expect(mission.completed).toBe(false);
    expect(mission.participants.length).toBe(3);
  });

  it('completes the mission after required contributions', async () => {
    const mission = await engine.startStabilization(corridorId, ['p1']);
    let current = mission;
    for (let i = 0; i < mission.requiredContributions; i++) {
      current = await engine.contributeStabilization(mission.missionId, 'p1');
    }
    expect(current.completed).toBe(true);
  });

  it('stabilizes the corridor on mission completion', async () => {
    const mission = await engine.startStabilization(corridorId, ['p1']);
    for (let i = 0; i < mission.requiredContributions; i++) {
      await engine.contributeStabilization(mission.missionId, 'p1');
    }
    const updated = await engine.getCorridor(corridorId);
    expect(updated?.status).toBe('stable');
  });
});

// ── transit ──────────────────────────────────────────────────────

describe('embarkTransit', () => {
  it('creates a transit record with correct worlds', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    const transit = await engine.embarkTransit('player-1', c.corridorId);
    expect(transit.playerId).toBe('player-1');
    expect(transit.corridorId).toBe(c.corridorId);
    expect(transit.arrivesAt).toBeGreaterThan(transit.embarkedAt);
  });

  it('throws for a closed corridor', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    await engine.closeCorridor(c.corridorId, 'test');
    await expect(engine.embarkTransit('player-1', c.corridorId)).rejects.toThrow('closed');
  });

  it('allows transit trades on an active transit', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    const transit = await engine.embarkTransit('player-1', c.corridorId);
    const trade = await engine.executeTransitTrade(transit.transitId, {
      commodityId: 'iron',
      quantity: 10,
      pricePerUnit: 25,
      buyerPlayerId: 'buyer',
      sellerPlayerId: 'seller',
    });
    expect(trade.commodityId).toBe('iron');
    expect(trade.itemId).toBeDefined();
  });
});

// ── weave events ─────────────────────────────────────────────────

describe('generateWeaveEvent', () => {
  it('creates an event and makes it active', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    await engine.generateWeaveEvent(c.corridorId, 'artifact-discovery');
    const active = engine.getActiveWeaveEvents();
    expect(active.length).toBe(1);
    expect(active.at(0)?.type).toBe('artifact-discovery');
    expect(active.at(0)?.rewardsAvailable).toBe(true);
  });

  it('marks merchant-caravan as reward-available', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    const event = await engine.generateWeaveEvent(c.corridorId, 'merchant-caravan');
    expect(event.rewardsAvailable).toBe(true);
  });
});

// ── arbitrage detection ───────────────────────────────────────────

describe('detectArbitrage', () => {
  it('finds an opportunity when price difference exceeds threshold', async () => {
    const deps = makeDeps();
    deps.priceBook.set('world-A:iron', 50);
    deps.priceBook.set('world-B:iron', 200);
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    // Stabilize to make corridor eligible
    const m = await engine.startStabilization(c.corridorId, ['p1']);
    for (let i = 0; i < m.requiredContributions; i++) {
      await engine.contributeStabilization(m.missionId, 'p1');
    }
    const opps = await engine.detectArbitrage('iron');
    expect(opps.length).toBeGreaterThan(0);
    expect(opps.at(0)?.commodityId).toBe('iron');
  });

  it('finds no opportunity when prices are similar', async () => {
    const deps = makeDeps();
    deps.priceBook.set('world-A:grain', 100);
    deps.priceBook.set('world-B:grain', 105);
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    const m = await engine.startStabilization(c.corridorId, ['p1']);
    for (let i = 0; i < m.requiredContributions; i++) {
      await engine.contributeStabilization(m.missionId, 'p1');
    }
    const opps = await engine.detectArbitrage('grain');
    expect(opps.length).toBe(0);
  });
});

// ── emergency corridor ────────────────────────────────────────────

describe('requestEmergencyCorridor', () => {
  it('auto-approves and creates an emergency corridor', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const req = await engine.requestEmergencyCorridor('world-X', 'world-Y', 'alliance-1', 'defense');
    expect(req.approved).toBe(true);
    expect(req.allianceId).toBe('alliance-1');
    const conns = await engine.getConnections('world-X');
    const emergency = conns.find((c) => c.tier === 'emergency');
    expect(emergency).toBeDefined();
  });
});

// ── analyzeTopology ───────────────────────────────────────────────

describe('analyzeTopology', () => {
  it('counts worlds and corridors correctly', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    await engine.discoverCorridor('world-B', 'world-C', 'p1', 'standard');
    const topo = await engine.analyzeTopology();
    expect(topo.worldCount).toBe(3);
    expect(topo.corridorCount).toBe(2);
  });

  it('excludes closed corridors from topology', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    await engine.closeCorridor(c.corridorId, 'test');
    const topo = await engine.analyzeTopology();
    expect(topo.corridorCount).toBe(0);
  });

  it('identifies hub worlds with 5+ connections', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    for (let i = 0; i < 6; i++) {
      await engine.discoverCorridor('hub', `world-${String(i)}`, 'p', 'standard');
    }
    const topo = await engine.analyzeTopology();
    expect(topo.hubWorlds).toContain('hub');
  });
});

// ── getStats ──────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zeros', () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const s = engine.getStats();
    expect(s.corridorsTotal).toBe(0);
    expect(s.transitsCompleted).toBe(0);
  });

  it('tracks corridors, transits, missions, and events', async () => {
    const deps = makeDeps();
    const engine = createWeaveNetworkEngine(deps);
    const c = await engine.discoverCorridor('world-A', 'world-B', 'p1', 'standard');
    await engine.embarkTransit('player-1', c.corridorId);
    await engine.startStabilization(c.corridorId, ['p1']);
    await engine.generateWeaveEvent(c.corridorId, 'temporal-anomaly');
    const s = engine.getStats();
    expect(s.corridorsTotal).toBe(1);
    expect(s.transitsCompleted).toBe(1);
    expect(s.stabilizationMissions).toBe(1);
    expect(s.eventsGenerated).toBe(1);
  });
});
