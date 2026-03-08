/**
 * Full-Stack Tick Simulation
 *
 * Proves the complete vertical slice: GameOrchestrator + all three
 * fabric orchestrators running through the ECS tick loop for 10 ticks.
 *
 * This is the integration proof that The Loom works end-to-end:
 *   - loom-core ECS (entities, components, systems, tick loop)
 *   - NakamaFabricOrchestrator (presence, integrity, continuity)
 *   - ShuttleOrchestrator (NPC lifecycle, tier routing)
 *   - WeaveOrchestrator (transit queue, corridors, coherence)
 *   - GameOrchestrator wires everything into SystemRegistry
 *
 * All fabrics tick in concert through the same SystemContext.
 */

import { describe, it, expect } from 'vitest';
import {
  createGameOrchestrator,
  createSilentLogger,
  createEcsPopulationAdapter,
  createComponentStore,
} from '@loom/loom-core';
import { createNakamaOrchestrator } from '@loom/nakama-fabric';
import { createShuttleOrchestrator } from '@loom/shuttle';
import { createWeaveOrchestrator } from '@loom/silfen-weave';
import type { BridgeRenderingFabric } from '@loom/loom-core';
import type { EntityId } from '@loom/entities-contracts';
import type { NakamaOrchestratorDeps } from '@loom/nakama-fabric';
import type { ShuttleOrchestratorDeps } from '@loom/shuttle';
import type { WeaveOrchestratorDeps, WeaveQueueEntry } from '@loom/silfen-weave';
import type { WeaveCompletedTransit } from '@loom/loom-core';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

// ── Rendering Fabric Mock ──────────────────────────────────────────

function createMockFabric(): BridgeRenderingFabric & {
  readonly pushCount: () => number;
} {
  let pushes = 0;
  return {
    pushCount: () => pushes,
    pushStateSnapshot: () => { pushes++; },
    spawnVisual: () => Promise.resolve(),
    despawnVisual: () => Promise.resolve(),
  };
}

// ── Shared Clock ───────────────────────────────────────────────────

function createSharedClock(): { readonly nowMicroseconds: () => number } {
  let t = 1_000_000;
  return { nowMicroseconds: () => t++ };
}

// ── Nakama Fabric Mocks ────────────────────────────────────────────

function buildNakamaDeps(): NakamaOrchestratorDeps {
  const integrity = new Map<string, number>([['earth', 75]]);
  const presence = new Map<string, string[]>([['earth', ['alice', 'bob']]]);

  return {
    presence: {
      sweepIdle: () => 0,
      listInWorld: (wId) => {
        const ids = presence.get(wId) ?? [];
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
      listWorlds: () => [...integrity.keys()],
      getIntegrity: (wId) => integrity.get(wId) ?? 0,
      restore: (wId, amt) => {
        const prev = integrity.get(wId) ?? 0;
        const next = Math.min(100, prev + amt);
        integrity.set(wId, next);
        return { worldId: wId, previousIntegrity: prev, newIntegrity: next };
      },
      degrade: (wId, amt) => {
        const prev = integrity.get(wId) ?? 0;
        const next = Math.max(0, prev - amt);
        integrity.set(wId, next);
        return { worldId: wId, previousIntegrity: prev, newIntegrity: next };
      },
    },
    chronicle: {
      append: () => 'chr-1',
    },
    clock: createSharedClock(),
  };
}

// ── Shuttle Fabric Mocks ───────────────────────────────────────────

function buildShuttleDeps(
  populationPort: { readonly listActiveNpcs: (w: string) => ReadonlyArray<{ npcId: string; worldId: string; tier: number; displayName: string }> },
): ShuttleOrchestratorDeps {
  return {
    population: populationPort,
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
      hasTree: () => false,
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

// ── Weave Fabric Mocks ─────────────────────────────────────────────

function buildWeaveDeps(): {
  readonly deps: WeaveOrchestratorDeps;
  readonly completionQueue: WeaveCompletedTransit[];
} {
  const active = new Map<string, { corridorId: string; entityId: string; phase: string }>();
  const coherence = new Map<string, number>();
  let seq = 0;
  const completionQueue: WeaveCompletedTransit[] = [];
  const entries: WeaveQueueEntry[] = [];

  const deps: WeaveOrchestratorDeps = {
    queue: {
      dequeue: () => entries.shift(),
      sweepExpired: () => 0,
      getQueueDepth: () => entries.length,
    },
    corridor: {
      openCorridor: (params) => {
        seq += 1;
        const id = 'cor-' + String(seq);
        const rec = { corridorId: id, entityId: params.entityId, phase: 'route_validated' };
        active.set(id, rec);
        coherence.set(id, 0.5);
        return rec;
      },
      initiateLock: (cId) => {
        const rec = active.get(cId);
        return rec ?? { corridorId: cId, entityId: '', phase: 'lock_initiated' };
      },
      advanceCoherence: () => null,
      completeTransit: (cId) => {
        const rec = active.get(cId);
        if (rec !== undefined) {
          completionQueue.push({ entityId: rec.entityId, destinationNodeId: 'mars-node' });
        }
        active.delete(cId);
        return { corridorId: cId, from: 'transit_active', to: 'arrived' };
      },
      abortCorridor: (cId) => {
        active.delete(cId);
        return { corridorId: cId, from: 'transit_active', to: 'aborted' };
      },
      getActiveByEntity: (eId) => {
        for (const r of active.values()) {
          if (r.entityId === eId) return r;
        }
        return undefined;
      },
      countActive: () => active.size,
    },
    coherence: {
      computeCoherence: (cId) => coherence.get(cId) ?? 0.5,
    },
    survey: { evaluateActiveMissions: () => 0 },
    ledger: {
      recordTransit: () => 'rec-1',
    },
    clock: createSharedClock(),
  };

  return { deps, completionQueue };
}

// ── Full-Stack Simulation ──────────────────────────────────────────

describe('Full-Stack — 10-tick simulation', () => {
  it('runs all fabrics through GameOrchestrator tick loop', () => {
    const fabric = createMockFabric();
    const nakamaOrch = createNakamaOrchestrator(buildNakamaDeps(), {
      restorePerPlayer: 0.1,
      degradeEmptyWorld: 0.05,
    });

    // Build a temporary store for the population adapter — the shuttle
    // will use this to find NPCs. We populate it with entities below.
    const npcStore = createComponentStore();
    const populationAdapter = createEcsPopulationAdapter(npcStore);
    const shuttleOrch = createShuttleOrchestrator(buildShuttleDeps(populationAdapter));

    const weaveSetup = buildWeaveDeps();
    const weaveOrch = createWeaveOrchestrator(weaveSetup.deps);
    const completionQueue = weaveSetup.completionQueue;

    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
      fabrics: {
        nakama: nakamaOrch,
        shuttle: {
          orchestrator: shuttleOrch,
          worldList: { listWorldIds: () => ['earth'] },
        },
        weave: {
          orchestrator: weaveOrch,
          completions: {
            drainCompleted: () => {
              const items = [...completionQueue];
              completionQueue.length = 0;
              return items;
            },
          },
        },
      },
    });

    // Populate NPC entities in the adapter's store
    copyNpcsToStore(npcStore);

    runTicks(orchestrator, 10);

    verifyFullStackResults(orchestrator, fabric, nakamaOrch, shuttleOrch, weaveOrch);
    orchestrator.stop();
  });
});

describe('Full-Stack — system priority order', () => {
  it('registers systems in correct priority order', () => {
    const fabric = createMockFabric();
    const nakamaOrch = createNakamaOrchestrator(buildNakamaDeps());
    const weaveSetup = buildWeaveDeps();
    const weaveOrch = createWeaveOrchestrator(weaveSetup.deps);

    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
      fabrics: {
        nakama: nakamaOrch,
        weave: {
          orchestrator: weaveOrch,
          completions: { drainCompleted: () => [] },
        },
      },
    });

    const systems = orchestrator.core.systems.listSystems();
    const priorities = systems.map((s) => s.priority);

    // Priorities should be in ascending order (lower runs first)
    for (let i = 1; i < priorities.length; i++) {
      const prev = priorities[i - 1] ?? 0;
      const curr = priorities[i] ?? 0;
      expect(prev).toBeLessThanOrEqual(curr);
    }

    orchestrator.stop();
  });
});

describe('Full-Stack — optional fabric wiring', () => {
  it('works without any fabric deps', () => {
    const fabric = createMockFabric();
    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
    });

    const systems = orchestrator.core.systems.listSystems();
    expect(systems).toHaveLength(3);

    orchestrator.stop();
  });

  it('works with only nakama fabric', () => {
    const fabric = createMockFabric();
    const nakamaOrch = createNakamaOrchestrator(buildNakamaDeps());

    const orchestrator = createGameOrchestrator({
      renderingFabric: fabric,
      coreConfig: { logger: createSilentLogger() },
      fabrics: { nakama: nakamaOrch },
    });

    const systems = orchestrator.core.systems.listSystems();
    const names = systems.map((s) => s.name);
    expect(names).toContain('nakama-fabric');
    expect(names).not.toContain('shuttle-npc');
    expect(names).not.toContain('silfen-weave');

    orchestrator.stop();
  });
});

// ── Verification ───────────────────────────────────────────────────

function verifyFullStackResults(
  orchestrator: ReturnType<typeof createGameOrchestrator>,
  fabric: ReturnType<typeof createMockFabric>,
  nakamaOrch: ReturnType<typeof createNakamaOrchestrator>,
  shuttleOrch: ReturnType<typeof createShuttleOrchestrator>,
  weaveOrch: ReturnType<typeof createWeaveOrchestrator>,
): void {
  const systems = orchestrator.core.systems.listSystems();
  const names = systems.map((s) => s.name);
  expect(names).toContain('movement');
  expect(names).toContain('nakama-fabric');
  expect(names).toContain('shuttle-npc');
  expect(names).toContain('silfen-weave');
  expect(names).toContain('bridge-service');

  expect(fabric.pushCount()).toBe(10);
  expect(nakamaOrch.getTickCount()).toBe(10);
  expect(shuttleOrch.getTickCount()).toBe(10);
  expect(shuttleOrch.getStats().totalNpcsProcessed).toBeGreaterThan(0);
  expect(weaveOrch.getTickCount()).toBe(10);
}

// ── Helpers ────────────────────────────────────────────────────────

function copyNpcsToStore(
  store: { set(eid: EntityId, ct: string, data: unknown): void },
): void {
  for (let i = 1; i <= 5; i++) {
    const id = eid('npc-' + String(i));
    store.set(id, 'npc-tier', {
      tier: i <= 3 ? 1 : 2,
      memoryWindowDays: i <= 3 ? 90 : null,
      aiBackend: i <= 3 ? 'behavior-tree' : 'llm-haiku',
      canCreateAssets: i > 3,
    });
    store.set(id, 'world-membership', {
      worldId: 'earth',
      enteredAt: 1000,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });
    store.set(id, 'identity', {
      displayName: 'NPC-' + String(i),
      playerId: null,
      faction: null,
      reputation: 0,
    });
  }
}

function runTicks(
  orchestrator: ReturnType<typeof createGameOrchestrator>,
  count: number,
): void {
  for (let i = 1; i <= count; i++) {
    orchestrator.core.systems.runAll({
      deltaMs: 33,
      tickNumber: i,
      wallTimeMicroseconds: i * 33000,
    });
  }
}
