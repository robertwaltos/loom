import { describe, it, expect } from 'vitest';
import {
  createWeaveNetworkEngine,
  type CorridorStorePort,
  type PriceOraclePort,
  type TransitStorePort,
  type WeaveCorridor,
  type WeaveNetworkDeps,
  type TransitRecord,
} from '../weave-network.js';

function makeClock(start = 1_000n) {
  let now = start;
  return {
    now: () => now,
    tick: (delta: bigint) => {
      now += delta;
    },
  };
}

function makeId() {
  let i = 0;
  return { next: () => `id-${++i}` };
}

function makeCorridorStore(): CorridorStorePort {
  const byId = new Map<string, WeaveCorridor>();
  return {
    async save(corridor) {
      byId.set(corridor.corridorId, corridor);
    },
    async getById(corridorId) {
      return byId.get(corridorId);
    },
    async getByWorlds(worldA, worldB) {
      for (const corridor of byId.values()) {
        const direct = corridor.worldIdA === worldA && corridor.worldIdB === worldB;
        const reverse = corridor.worldIdA === worldB && corridor.worldIdB === worldA;
        if (direct || reverse) return corridor;
      }
      return undefined;
    },
    async getAll() {
      return Array.from(byId.values());
    },
    async getConnectedWorlds(worldId) {
      return Array.from(byId.values()).filter(c => c.worldIdA === worldId || c.worldIdB === worldId);
    },
  };
}

function makeTransitStore(): TransitStorePort {
  const recorded: TransitRecord[] = [];
  return {
    async recordTransit(transit) {
      recorded.push(transit);
    },
    async getActiveTransits() {
      return recorded;
    },
  };
}

function makePriceOracle(prices: Readonly<Record<string, number>>): PriceOraclePort {
  return {
    async getPrice(worldId) {
      return prices[worldId] ?? 0;
    },
  };
}

function makeDeps(priceMap: Readonly<Record<string, number>> = {}): WeaveNetworkDeps {
  const clock = makeClock();
  return {
    clock,
    id: makeId(),
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    events: {
      emit: () => {},
    },
    corridors: makeCorridorStore(),
    transits: makeTransitStore(),
    prices: makePriceOracle(priceMap),
  };
}

describe('weave-network simulation', () => {
  it('discovers a new corridor with expected defaults', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-a', 'w-b', 'player-1', 'trade-route');

    expect(corridor.status).toBe('unstable');
    expect(corridor.tollKalon).toBe(50);
    expect(corridor.dangerRating).toBe(0.05);
    expect(engine.getStats().corridorsTotal).toBe(1);
  });

  it('returns existing corridor if worlds already connected', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const first = await engine.discoverCorridor('w-a', 'w-b', 'player-1', 'standard');
    const second = await engine.discoverCorridor('w-b', 'w-a', 'player-2', 'hazardous');
    expect(second.corridorId).toBe(first.corridorId);
    expect(engine.getStats().corridorsTotal).toBe(1);
  });

  it('gets corridor by id', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const created = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    const found = await engine.getCorridor(created.corridorId);
    expect(found?.corridorId).toBe(created.corridorId);
  });

  it('gets connections for a world', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    await engine.discoverCorridor('w-1', 'w-3', 'p', 'standard');
    const connected = await engine.getConnections('w-1');
    expect(connected.length).toBe(2);
  });

  it('closes a corridor', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    await engine.closeCorridor(corridor.corridorId, 'maintenance');
    const after = await engine.getCorridor(corridor.corridorId);
    expect(after?.status).toBe('closed');
  });

  it('throws when closing unknown corridor', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    await expect(engine.closeCorridor('missing', 'none')).rejects.toThrow('not found');
  });

  it('starts stabilization mission', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'hazardous');
    const mission = await engine.startStabilization(corridor.corridorId, ['p1', 'p2']);
    expect(mission.requiredContributions).toBe(10);
    expect(engine.getStats().stabilizationMissions).toBe(1);
  });

  it('throws when starting stabilization for missing corridor', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    await expect(engine.startStabilization('none', ['p'])).rejects.toThrow('not found');
  });

  it('completes stabilization and marks corridor stable', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'hazardous');
    const mission = await engine.startStabilization(corridor.corridorId, ['p1']);
    for (let i = 0; i < 10; i++) {
      await engine.contributeStabilization(mission.missionId, `p-${i}`);
    }
    const updated = await engine.getCorridor(corridor.corridorId);
    expect(updated?.status).toBe('stable');
    expect(updated?.stability).toBe(1);
    expect(engine.getStats().corridorsStable).toBe(1);
  });

  it('rejects contributions for unknown mission', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    await expect(engine.contributeStabilization('missing', 'p')).rejects.toThrow('not found');
  });

  it('embarks transit and increments traffic/stat counters', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    const transit = await engine.embarkTransit('player-1', corridor.corridorId);
    expect(transit.sourceWorldId).toBe('w-1');
    expect(engine.getStats().transitsCompleted).toBe(1);
    const after = await engine.getCorridor(corridor.corridorId);
    expect(after?.trafficCount).toBe(1);
  });

  it('blocks transit on closed corridor', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    await engine.closeCorridor(corridor.corridorId, 'closed');
    await expect(engine.embarkTransit('p1', corridor.corridorId)).rejects.toThrow('closed');
  });

  it('executes transit trade and generates trade item id', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    const transit = await engine.embarkTransit('p1', corridor.corridorId);
    const trade = await engine.executeTransitTrade(transit.transitId, {
      commodityId: 'iron',
      quantity: 10,
      pricePerUnit: 8,
      buyerPlayerId: 'buyer',
      sellerPlayerId: 'seller',
    });
    expect(trade.itemId.startsWith('id-')).toBe(true);
    expect(engine.getStats().transitTrades).toBe(1);
  });

  it('throws when trading on unknown transit', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    await expect(
      engine.executeTransitTrade('missing', {
        commodityId: 'wood',
        quantity: 1,
        pricePerUnit: 2,
        buyerPlayerId: 'b',
        sellerPlayerId: 's',
      }),
    ).rejects.toThrow('not found');
  });

  it('generates weave events and filters active window', async () => {
    const clock = makeClock();
    const deps = {
      ...makeDeps(),
      clock: { now: () => clock.now() },
    } satisfies WeaveNetworkDeps;
    const engine = createWeaveNetworkEngine(deps);
    const corridor = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    await engine.generateWeaveEvent(corridor.corridorId, 'artifact-discovery');
    expect(engine.getActiveWeaveEvents().length).toBe(1);
    clock.tick(BigInt(2 * 60 * 60 * 1000));
    expect(engine.getActiveWeaveEvents().length).toBe(0);
  });

  it('detects arbitrage only across stable corridors above threshold', async () => {
    const engine = createWeaveNetworkEngine(makeDeps({ 'w-1': 10, 'w-2': 20, 'w-3': 11 }));
    const c1 = await engine.discoverCorridor('w-1', 'w-2', 'p', 'standard');
    const c2 = await engine.discoverCorridor('w-1', 'w-3', 'p', 'standard');
    const m1 = await engine.startStabilization(c1.corridorId, ['p']);
    const m2 = await engine.startStabilization(c2.corridorId, ['p']);
    for (let i = 0; i < 10; i++) {
      await engine.contributeStabilization(m1.missionId, `a-${i}`);
      await engine.contributeStabilization(m2.missionId, `b-${i}`);
    }
    const opportunities = await engine.detectArbitrage('grain');
    expect(opportunities.length).toBe(1);
    expect(opportunities[0]?.buyWorldId).toBe('w-1');
    expect(opportunities[0]?.sellWorldId).toBe('w-2');
  });

  it('opens emergency corridor and increments counter', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const req = await engine.requestEmergencyCorridor('w-9', 'w-10', 'alliance-7', 'defense');
    expect(req.approved).toBe(true);
    expect(engine.getStats().emergencyCorridors).toBe(1);
    const connections = await engine.getConnections('w-9');
    expect(connections.some(c => c.tier === 'emergency')).toBe(true);
  });

  it('analyzes network topology for hubs and connectivity', async () => {
    const engine = createWeaveNetworkEngine(makeDeps());
    const spokeWorlds = ['w-a', 'w-b', 'w-c', 'w-d', 'w-e'];
    for (const world of spokeWorlds) {
      await engine.discoverCorridor('hub', world, 'p', 'standard');
    }
    const topology = await engine.analyzeTopology();
    expect(topology.worldCount).toBe(6);
    expect(topology.hubWorlds).toContain('hub');
    expect(topology.avgConnectivity).toBeGreaterThan(1);
  });
});
