/**
 * Shuttle Orchestrator — Proves the NPC lifecycle driver works.
 */

import { describe, it, expect } from 'vitest';
import { createShuttleOrchestrator } from '../shuttle-orchestrator.js';
import type {
  ShuttleOrchestratorDeps,
  ShuttleNpcRecord,
  ShuttleDecision,
  ShuttleDecisionRequest,
  ShuttleTreeContext,
  ShuttleTreeResult,
} from '../shuttle-orchestrator.js';

// ─── Mock Factories ─────────────────────────────────────────────────

function npc(id: string, tier: number, world: string): ShuttleNpcRecord {
  return { npcId: id, worldId: world, tier, displayName: 'NPC-' + id };
}

function actDecision(npcId: string): ShuttleDecision {
  return { npcId, actionType: 'move', outcome: 'act', confidence: 0.8 };
}

function idleDecision(npcId: string): ShuttleDecision {
  return { npcId, actionType: 'idle', outcome: 'idle', confidence: 1.0 };
}

function createMockPopulation(records: ShuttleNpcRecord[]) {
  return { listActiveNpcs: (_w: string) => records };
}

function createMockDecision() {
  const log: ShuttleDecisionRequest[] = [];
  return {
    log: () => [...log],
    decide: (req: ShuttleDecisionRequest) => {
      log.push(req);
      return actDecision(req.npcId);
    },
    decideBatch: (reqs: ReadonlyArray<ShuttleDecisionRequest>) => {
      for (const r of reqs) log.push(r);
      return reqs.map((r) => actDecision(r.npcId));
    },
  };
}

function createMockBehaviorTree(results?: Map<string, ShuttleTreeResult>) {
  const map: Map<string, ShuttleTreeResult> = results ?? new Map<string, ShuttleTreeResult>();
  return {
    hasTree: (name: string) => map.has(name),
    tickTree: (_name: string, _ctx: ShuttleTreeContext): ShuttleTreeResult => {
      const found = map.get(_name);
      return found ?? 'failure';
    },
  };
}

function createMockMemory() {
  const recorded: Array<{ npcId: string; content: string }> = [];
  let pruned = 0;
  return {
    recorded: () => [...recorded],
    prunedCount: () => pruned,
    record: (params: { npcId: string; content: string }) => {
      recorded.push({ npcId: params.npcId, content: params.content });
      return 'mem-' + String(recorded.length);
    },
    recall: (_id: string) => [],
    prune: (_id: string, _maxAge: number) => {
      pruned += 1;
      return 1;
    },
  };
}

function createMockSchedule(blocks?: Map<string, string>) {
  const map: Map<string, string> = blocks ?? new Map<string, string>();
  return {
    getActiveBlock: (id: string, _t: number): string | null => {
      const found = map.get(id);
      return found ?? null;
    },
  };
}

function mockClock(): { readonly nowMicroseconds: () => number } {
  let t = 1000;
  return { nowMicroseconds: () => t++ };
}

function buildDeps(overrides?: Partial<ShuttleOrchestratorDeps>) {
  const deps: ShuttleOrchestratorDeps = {
    population: createMockPopulation([]),
    decision: createMockDecision(),
    behaviorTree: createMockBehaviorTree(),
    memory: createMockMemory(),
    schedule: createMockSchedule(),
    clock: mockClock(),
    ...overrides,
  };
  return deps;
}

// ─── Construction ───────────────────────────────────────────────────

describe('ShuttleOrchestrator — construction', () => {
  it('creates with default config', () => {
    const orch = createShuttleOrchestrator(buildDeps());
    expect(orch.getTickCount()).toBe(0);
    expect(orch.getStats().totalTicks).toBe(0);
  });

  it('accepts custom config', () => {
    const orch = createShuttleOrchestrator(buildDeps(), { maxBatchSize: 100 });
    expect(orch.getTickCount()).toBe(0);
  });
});

// ─── Basic Tick ─────────────────────────────────────────────────────

describe('ShuttleOrchestrator — basic tick', () => {
  it('increments tick count', () => {
    const orch = createShuttleOrchestrator(buildDeps());
    orch.tick('earth', 33000);
    expect(orch.getTickCount()).toBe(1);
    orch.tick('earth', 33000);
    expect(orch.getTickCount()).toBe(2);
  });

  it('processes zero NPCs on empty world', () => {
    const orch = createShuttleOrchestrator(buildDeps());
    const result = orch.tick('earth', 33000);
    expect(result.npcsProcessed).toBe(0);
    expect(result.tier1Batched).toBe(0);
  });
});

// ─── Tier Routing ───────────────────────────────────────────────────

describe('ShuttleOrchestrator — tier routing', () => {
  it('routes tier 1 NPCs to batch processing', () => {
    const npcs = [npc('a', 1, 'earth'), npc('b', 1, 'earth')];
    const deps = buildDeps({ population: createMockPopulation(npcs) });
    const orch = createShuttleOrchestrator(deps);
    const result = orch.tick('earth', 33000);

    expect(result.tier1Batched).toBe(2);
    expect(result.tier2Treed).toBe(0);
    expect(result.tier3Decided).toBe(0);
  });

  it('routes tier 2 NPCs to behavior trees', () => {
    const npcs = [npc('c', 2, 'earth')];
    const trees = new Map([['npc-c', 'success' as const]]);
    const deps = buildDeps({
      population: createMockPopulation(npcs),
      behaviorTree: createMockBehaviorTree(trees),
    });
    const orch = createShuttleOrchestrator(deps);
    const result = orch.tick('earth', 33000);

    expect(result.tier2Treed).toBe(1);
    expect(result.decisionsActed).toBeGreaterThanOrEqual(1);
  });

  it('routes tier 3+ NPCs to decision engine', () => {
    const npcs = [npc('d', 3, 'earth'), npc('e', 4, 'earth')];
    const deps = buildDeps({ population: createMockPopulation(npcs) });
    const orch = createShuttleOrchestrator(deps);
    const result = orch.tick('earth', 33000);

    expect(result.tier3Decided).toBe(2);
  });

  it('handles mixed tiers correctly', () => {
    const npcs = [npc('a', 1, 'earth'), npc('b', 2, 'earth'), npc('c', 3, 'earth')];
    const trees = new Map([['npc-b', 'running' as const]]);
    const deps = buildDeps({
      population: createMockPopulation(npcs),
      behaviorTree: createMockBehaviorTree(trees),
    });
    const orch = createShuttleOrchestrator(deps);
    const result = orch.tick('earth', 33000);

    expect(result.tier1Batched).toBe(1);
    expect(result.tier2Treed).toBe(1);
    expect(result.tier3Decided).toBe(1);
    expect(result.npcsProcessed).toBe(3);
  });
});

// ─── Memory Integration ─────────────────────────────────────────────

describe('ShuttleOrchestrator — memory', () => {
  it('records memories for acted decisions', () => {
    const npcs = [npc('a', 3, 'earth')];
    const memory = createMockMemory();
    const deps = buildDeps({
      population: createMockPopulation(npcs),
      memory,
    });
    const orch = createShuttleOrchestrator(deps);
    orch.tick('earth', 33000);

    expect(memory.recorded().length).toBe(1);
    expect(memory.recorded()[0]?.npcId).toBe('a');
  });

  it('skips memory for idle decisions', () => {
    const memory = createMockMemory();
    const decision = {
      decide: (_r: ShuttleDecisionRequest) => idleDecision(_r.npcId),
      decideBatch: (reqs: ReadonlyArray<ShuttleDecisionRequest>) =>
        reqs.map((r) => idleDecision(r.npcId)),
    };
    const npcs = [npc('a', 3, 'earth')];
    const deps = buildDeps({
      population: createMockPopulation(npcs),
      memory,
      decision,
    });
    const orch = createShuttleOrchestrator(deps);
    orch.tick('earth', 33000);

    expect(memory.recorded().length).toBe(0);
  });

  it('prunes stale memories for tier 1 and 2', () => {
    const npcs = [npc('a', 1, 'earth'), npc('b', 2, 'earth')];
    const memory = createMockMemory();
    const deps = buildDeps({
      population: createMockPopulation(npcs),
      memory,
    });
    const orch = createShuttleOrchestrator(deps, {
      tier1PruneAgeUs: 1000,
      tier2PruneAgeUs: 2000,
    });
    const result = orch.tick('earth', 33000);

    expect(result.memoriesPruned).toBe(2);
  });
});

// ─── Schedule Integration ───────────────────────────────────────────

describe('ShuttleOrchestrator — schedule', () => {
  it('passes schedule block to decision context', () => {
    const npcs = [npc('a', 3, 'earth')];
    const scheduleBlocks = new Map([['a', 'patrol']]);
    const decision = createMockDecision();
    const deps = buildDeps({
      population: createMockPopulation(npcs),
      schedule: createMockSchedule(scheduleBlocks),
      decision,
    });
    const orch = createShuttleOrchestrator(deps);
    orch.tick('earth', 33000);

    expect(decision.log()[0]?.context).toContain('patrol');
  });
});

// ─── Cumulative Stats ───────────────────────────────────────────────

describe('ShuttleOrchestrator — cumulative stats', () => {
  it('accumulates stats across ticks', () => {
    const npcs = [npc('a', 3, 'earth')];
    const deps = buildDeps({ population: createMockPopulation(npcs) });
    const orch = createShuttleOrchestrator(deps);

    orch.tick('earth', 33000);
    orch.tick('earth', 33000);
    orch.tick('earth', 33000);

    const stats = orch.getStats();
    expect(stats.totalTicks).toBe(3);
    expect(stats.totalNpcsProcessed).toBe(3);
    expect(stats.totalDecisionsActed).toBe(3);
  });
});
