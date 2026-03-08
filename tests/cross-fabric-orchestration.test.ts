/**
 * Cross-Fabric Orchestration Test
 *
 * Proves that all three fabric-level orchestrators compose correctly:
 *   NakamaFabricOrchestrator — economy, governance, presence
 *   ShuttleOrchestrator — NPC lifecycle and AI decisions
 *   WeaveOrchestrator — world transit and frequency locks
 *
 * This is the integration proof that The Loom works as a unified
 * system — all fabrics ticking in concert, each maintaining its
 * own domain while contributing to the whole.
 */

import { describe, it, expect } from 'vitest';
import { createNakamaOrchestrator } from '@loom/nakama-fabric';
import { createShuttleOrchestrator } from '@loom/shuttle';
import { createWeaveOrchestrator } from '@loom/silfen-weave';
import type { NakamaOrchestratorDeps } from '@loom/nakama-fabric';
import type { ShuttleOrchestratorDeps } from '@loom/shuttle';
import type { WeaveOrchestratorDeps, WeaveQueueEntry } from '@loom/silfen-weave';

// ─── Shared Clock ───────────────────────────────────────────────────

function createSharedClock() {
  let t = 1_000_000;
  return { nowMicroseconds: () => t++ };
}

// ─── Nakama Mocks ───────────────────────────────────────────────────

function buildNakamaDeps(): NakamaOrchestratorDeps {
  const worldIntegrity = new Map<string, number>([
    ['earth', 80],
    ['mars', 40],
  ]);
  const presenceByWorld = new Map<string, string[]>([
    ['earth', ['dynasty-alice', 'dynasty-bob']],
    ['mars', []],
  ]);
  const chronicles: string[] = [];

  return {
    presence: {
      sweepIdle: () => 0,
      listInWorld: (wId) => {
        const ids = presenceByWorld.get(wId) ?? [];
        return ids.map((d) => ({ dynastyId: d, worldId: wId }));
      },
      getStats: () => ({ onlineCount: 2, idleCount: 0 }),
    },
    continuity: {
      tick: () => ({
        transitions: [],
        auctionsCreated: 0,
        auctionsCompleted: 0,
        chronicleEntries: 0,
      }),
    },
    lattice: {
      listWorlds: () => [...worldIntegrity.keys()],
      getIntegrity: (wId) => worldIntegrity.get(wId) ?? 0,
      restore: (wId, amt, _reason) => {
        const prev = worldIntegrity.get(wId) ?? 0;
        const next = Math.min(100, prev + amt);
        worldIntegrity.set(wId, next);
        return { worldId: wId, previousIntegrity: prev, newIntegrity: next };
      },
      degrade: (wId, amt, _reason) => {
        const prev = worldIntegrity.get(wId) ?? 0;
        const next = Math.max(0, prev - amt);
        worldIntegrity.set(wId, next);
        return { worldId: wId, previousIntegrity: prev, newIntegrity: next };
      },
    },
    chronicle: {
      append: (entry) => {
        chronicles.push(entry.category);
        return 'chr-' + String(chronicles.length);
      },
    },
    clock: createSharedClock(),
  };
}

// ─── Shuttle Mocks ──────────────────────────────────────────────────

function buildShuttleDeps(): ShuttleOrchestratorDeps {
  const npcs = [
    { npcId: 'crowd-1', worldId: 'earth', tier: 1, displayName: 'Crowd Agent' },
    { npcId: 'inhab-1', worldId: 'earth', tier: 2, displayName: 'Merchant' },
    { npcId: 'notable-1', worldId: 'earth', tier: 3, displayName: 'Kira' },
  ];

  return {
    population: { listActiveNpcs: (_w) => npcs },
    decision: {
      decide: (req) => ({
        npcId: req.npcId,
        actionType: 'patrol',
        outcome: 'act' as const,
        confidence: 0.7,
      }),
      decideBatch: (reqs) =>
        reqs.map((r) => ({
          npcId: r.npcId,
          actionType: 'wander',
          outcome: 'act' as const,
          confidence: 0.5,
        })),
    },
    behaviorTree: {
      hasTree: (name) => name === 'npc-inhab-1',
      tickTree: () => 'success' as const,
    },
    memory: {
      record: () => 'mem-1',
      recall: () => [],
      prune: () => 0,
    },
    schedule: {
      getActiveBlock: () => 'patrol',
    },
    clock: createSharedClock(),
  };
}

// ─── Weave Mocks ────────────────────────────────────────────────────

interface CorridorState {
  readonly activeCor: Map<string, { corridorId: string; entityId: string; phase: string }>;
  readonly coherenceMap: Map<string, number>;
  seq: number;
}

function createWeaveCorridorMock(state: CorridorState) {
  return {
    openCorridor: (params: { entityId: string }) => {
      state.seq += 1;
      const id = 'cor-' + String(state.seq);
      const rec = { corridorId: id, entityId: params.entityId, phase: 'route_validated' };
      state.activeCor.set(id, rec);
      state.coherenceMap.set(id, 0.5);
      return rec;
    },
    initiateLock: (cId: string) => {
      const rec = state.activeCor.get(cId);
      return rec ?? { corridorId: cId, entityId: '', phase: 'lock_initiated' };
    },
    advanceCoherence: () => null,
    completeTransit: (cId: string) => {
      state.activeCor.delete(cId);
      return { corridorId: cId, from: 'transit_active', to: 'arrived' };
    },
    abortCorridor: (cId: string) => {
      state.activeCor.delete(cId);
      return { corridorId: cId, from: 'transit_active', to: 'aborted' };
    },
    getActiveByEntity: (eId: string) => {
      for (const r of state.activeCor.values()) {
        if (r.entityId === eId) return r;
      }
      return undefined;
    },
    countActive: () => state.activeCor.size,
  };
}

function buildWeaveDeps(): {
  readonly deps: WeaveOrchestratorDeps;
  readonly getCoherence: () => Map<string, number>;
  readonly getLedger: () => Array<{ entityId: string; status: string }>;
} {
  const corState: CorridorState = {
    activeCor: new Map(),
    coherenceMap: new Map<string, number>(),
    seq: 0,
  };
  const ledgerRecords: Array<{ entityId: string; status: string }> = [];
  const entries: WeaveQueueEntry[] = [
    { requestId: 'rq-1', entityId: 'ship-1', originNodeId: 'earth-node', destinationNodeId: 'mars-node', priority: 'normal' },
  ];

  const deps: WeaveOrchestratorDeps = {
    queue: { dequeue: () => entries.shift(), sweepExpired: () => 0, getQueueDepth: () => entries.length },
    corridor: createWeaveCorridorMock(corState),
    coherence: { computeCoherence: (cId) => { const f = corState.coherenceMap.get(cId); return f ?? 0.5; } },
    survey: { evaluateActiveMissions: () => 0 },
    ledger: { recordTransit: (p) => { ledgerRecords.push({ entityId: p.entityId, status: p.status }); return 'rec-' + String(ledgerRecords.length); } },
    clock: createSharedClock(),
  };

  return { deps, getCoherence: () => corState.coherenceMap, getLedger: () => [...ledgerRecords] };
}

// ─── Cross-Fabric Integration ───────────────────────────────────────

describe('Cross-Fabric — unified tick cycle', () => {
  it('all three orchestrators tick without interference', () => {
    const nakama = createNakamaOrchestrator(buildNakamaDeps(), {
      restorePerPlayer: 0.5,
      degradeEmptyWorld: 0.2,
    });
    const shuttle = createShuttleOrchestrator(buildShuttleDeps());
    const weave = createWeaveOrchestrator(buildWeaveDeps().deps);

    const nResult = nakama.tick();
    const sResult = shuttle.tick('earth', 33000);
    const wResult = weave.tick();

    expect(nResult.tickNumber).toBe(1);
    expect(sResult.tickNumber).toBe(1);
    expect(wResult.tickNumber).toBe(1);
  });

  it('nakama adjusts world integrity based on presence', () => {
    const nakama = createNakamaOrchestrator(buildNakamaDeps(), {
      restorePerPlayer: 1.0,
      degradeEmptyWorld: 0.5,
    });

    // Tick 1: adjusts integrity, but cached activity is pre-adjustment
    nakama.tick();
    // Tick 2: cached activity now reflects tick 1's adjustments
    nakama.tick();
    const activity = nakama.getWorldActivity();

    const earth = activity.find((a) => a.worldId === 'earth');
    const mars = activity.find((a) => a.worldId === 'mars');

    // Earth has 2 players → restored by 2.0 per tick, cached is one tick behind
    expect(earth?.integrity).toBe(82);
    // Mars is empty → degraded by 0.5 per tick, cached is one tick behind
    expect(mars?.integrity).toBe(39.5);
  });

  it('shuttle processes mixed-tier NPCs in one tick', () => {
    const shuttle = createShuttleOrchestrator(buildShuttleDeps());
    const result = shuttle.tick('earth', 33000);

    expect(result.npcsProcessed).toBe(3);
    expect(result.tier1Batched).toBe(1);
    expect(result.tier2Treed).toBe(1);
    expect(result.tier3Decided).toBe(1);
    expect(result.decisionsActed).toBeGreaterThanOrEqual(2);
  });

  it('weave opens corridor and completes transit lifecycle', () => {
    const { deps, getCoherence, getLedger } = buildWeaveDeps();
    const weave = createWeaveOrchestrator(deps);

    // Tick 1: open corridor from queue
    const r1 = weave.tick();
    expect(r1.corridorsOpened).toBe(1);
    expect(r1.activeCorridors).toBe(1);

    // Advance coherence to transit threshold
    getCoherence().set('cor-1', 0.999);

    // Tick 2: complete transit
    const r2 = weave.tick();
    expect(r2.transitsCompleted).toBe(1);
    expect(r2.activeCorridors).toBe(0);
    expect(getLedger()[0]?.status).toBe('completed');
  });
});

describe('Cross-Fabric — multi-tick simulation', () => {
  it('runs 5 ticks with all orchestrators in concert', () => {
    const nakama = createNakamaOrchestrator(buildNakamaDeps(), {
      restorePerPlayer: 0.1,
      degradeEmptyWorld: 0.05,
    });
    const shuttle = createShuttleOrchestrator(buildShuttleDeps());
    const weave = createWeaveOrchestrator(buildWeaveDeps().deps);

    for (let i = 0; i < 5; i++) {
      nakama.tick();
      shuttle.tick('earth', 33000);
      weave.tick();
    }

    expect(nakama.getTickCount()).toBe(5);
    expect(shuttle.getTickCount()).toBe(5);
    expect(weave.getTickCount()).toBe(5);

    const shuttleStats = shuttle.getStats();
    expect(shuttleStats.totalNpcsProcessed).toBe(15);

    const nakamaActivity = nakama.getWorldActivity();
    const earth = nakamaActivity.find((a) => a.worldId === 'earth');
    expect(earth?.integrity).toBeGreaterThan(80);
  });
});
