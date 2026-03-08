/**
 * Silfen Weave Orchestrator — Transit tick-loop coordination tests.
 */

import { describe, it, expect } from 'vitest';
import { createWeaveOrchestrator } from '../weave-orchestrator.js';
import type {
  WeaveOrchestratorDeps,
  WeaveQueueEntry,
  WeaveCorridorRecord,
  WeaveCorridorTransition,
} from '../weave-orchestrator.js';

// ─── Mock Factories ─────────────────────────────────────────────────

function createMockQueue(entries?: WeaveQueueEntry[]) {
  const items = entries ? [...entries] : [];
  let swept = 0;
  return {
    dequeue: (): WeaveQueueEntry | undefined => items.shift(),
    sweepExpired: () => { swept += 1; return 0; },
    getQueueDepth: () => items.length,
    sweptCount: () => swept,
  };
}

function createMockCorridor() {
  const active = new Map<string, WeaveCorridorRecord>();
  let seq = 0;
  return {
    openCorridor: (params: { entityId: string }) => {
      seq += 1;
      const id = 'cor-' + String(seq);
      const record: WeaveCorridorRecord = {
        corridorId: id,
        entityId: params.entityId,
        phase: 'route_validated',
      };
      active.set(id, record);
      return record;
    },
    initiateLock: (corridorId: string): WeaveCorridorRecord => {
      const rec = active.get(corridorId);
      const base = rec ?? { corridorId, entityId: '', phase: '' };
      return { ...base, phase: 'lock_initiated' };
    },
    advanceCoherence: (
      _corridorId: string,
      _coherence: number,
    ): WeaveCorridorTransition | null => null,
    completeTransit: (corridorId: string): WeaveCorridorTransition => {
      active.delete(corridorId);
      return { corridorId, from: 'transit_active', to: 'arrived' };
    },
    abortCorridor: (corridorId: string, _reason: string): WeaveCorridorTransition => {
      active.delete(corridorId);
      return { corridorId, from: 'transit_active', to: 'aborted' };
    },
    getActiveByEntity: (entityId: string) => {
      for (const rec of active.values()) {
        if (rec.entityId === entityId) return rec;
      }
      return undefined;
    },
    countActive: () => active.size,
    activeMap: () => new Map(active),
  };
}

function createMockCoherence(values?: Map<string, number>) {
  const map: Map<string, number> = values ?? new Map<string, number>();
  return {
    computeCoherence: (corridorId: string): number => {
      const found = map.get(corridorId);
      return found ?? 0.5;
    },
    setCoherence: (corridorId: string, v: number) => { map.set(corridorId, v); },
  };
}

function createMockSurvey(count?: number) {
  const advanced = count ?? 0;
  return { evaluateActiveMissions: () => advanced };
}

function createMockLedger() {
  const records: Array<{ entityId: string; status: string }> = [];
  return {
    recordTransit: (params: { entityId: string; status: string }) => {
      records.push({ entityId: params.entityId, status: params.status });
      return 'rec-' + String(records.length);
    },
    records: () => [...records],
  };
}

function mockClock(): { readonly nowMicroseconds: () => number } {
  let t = 1000;
  return { nowMicroseconds: () => t++ };
}

function buildDeps(overrides?: Partial<WeaveOrchestratorDeps>) {
  const deps: WeaveOrchestratorDeps = {
    queue: createMockQueue(),
    corridor: createMockCorridor(),
    coherence: createMockCoherence(),
    survey: createMockSurvey(),
    ledger: createMockLedger(),
    clock: mockClock(),
    ...overrides,
  };
  return deps;
}

function queueEntry(entityId: string, origin: string, dest: string): WeaveQueueEntry {
  return {
    requestId: 'req-' + entityId,
    entityId,
    originNodeId: origin,
    destinationNodeId: dest,
    priority: 'normal',
  };
}

// ─── Construction ───────────────────────────────────────────────────

describe('WeaveOrchestrator — construction', () => {
  it('creates with default config', () => {
    const orch = createWeaveOrchestrator(buildDeps());
    expect(orch.getTickCount()).toBe(0);
    expect(orch.getStats().totalTicks).toBe(0);
  });
});

// ─── Basic Tick ─────────────────────────────────────────────────────

describe('WeaveOrchestrator — basic tick', () => {
  it('increments tick count', () => {
    const orch = createWeaveOrchestrator(buildDeps());
    orch.tick();
    orch.tick();
    expect(orch.getTickCount()).toBe(2);
  });

  it('returns tick number in result', () => {
    const orch = createWeaveOrchestrator(buildDeps());
    const r1 = orch.tick();
    const r2 = orch.tick();
    expect(r1.tickNumber).toBe(1);
    expect(r2.tickNumber).toBe(2);
  });

  it('sweeps expired requests each tick', () => {
    const queue = createMockQueue();
    const deps = buildDeps({ queue });
    const orch = createWeaveOrchestrator(deps);
    orch.tick();
    expect(queue.sweptCount()).toBe(1);
  });
});

// ─── Queue Processing ───────────────────────────────────────────────

describe('WeaveOrchestrator — queue processing', () => {
  it('opens corridors for queued entries', () => {
    const entries = [queueEntry('e1', 'node-a', 'node-b')];
    const queue = createMockQueue(entries);
    const deps = buildDeps({ queue });
    const orch = createWeaveOrchestrator(deps);
    const result = orch.tick();

    expect(result.corridorsOpened).toBe(1);
    expect(result.activeCorridors).toBe(1);
  });

  it('respects max concurrent transits', () => {
    const entries = [
      queueEntry('e1', 'a', 'b'),
      queueEntry('e2', 'c', 'd'),
      queueEntry('e3', 'e', 'f'),
    ];
    const queue = createMockQueue(entries);
    const deps = buildDeps({ queue });
    const orch = createWeaveOrchestrator(deps, { maxConcurrentTransits: 2 });
    const result = orch.tick();

    expect(result.corridorsOpened).toBe(2);
    expect(result.activeCorridors).toBe(2);
  });
});

// ─── Coherence Advancement ──────────────────────────────────────────

describe('WeaveOrchestrator — coherence', () => {
  it('completes transit when coherence reaches threshold', () => {
    const entries = [queueEntry('e1', 'a', 'b')];
    const coherence = createMockCoherence();
    const ledger = createMockLedger();
    const deps = buildDeps({
      queue: createMockQueue(entries),
      coherence,
      ledger,
    });
    const orch = createWeaveOrchestrator(deps);

    // First tick: open corridor
    orch.tick();

    // Set coherence above threshold for the opened corridor
    coherence.setCoherence('cor-1', 0.999);

    // Second tick: advance and complete
    const result = orch.tick();
    expect(result.transitsCompleted).toBe(1);
    expect(result.activeCorridors).toBe(0);
    expect(ledger.records()[0]?.status).toBe('completed');
  });

  it('aborts transit when coherence drops below threshold', () => {
    const entries = [queueEntry('e1', 'a', 'b')];
    const coherence = createMockCoherence();
    const ledger = createMockLedger();
    const deps = buildDeps({
      queue: createMockQueue(entries),
      coherence,
      ledger,
    });
    const orch = createWeaveOrchestrator(deps);

    orch.tick();
    coherence.setCoherence('cor-1', 0.05);

    const result = orch.tick();
    expect(result.transitsAborted).toBe(1);
    expect(result.activeCorridors).toBe(0);
    expect(ledger.records()[0]?.status).toBe('failed');
  });

  it('keeps corridor active at moderate coherence', () => {
    const entries = [queueEntry('e1', 'a', 'b')];
    const coherence = createMockCoherence();
    const deps = buildDeps({
      queue: createMockQueue(entries),
      coherence,
    });
    const orch = createWeaveOrchestrator(deps);

    orch.tick();
    coherence.setCoherence('cor-1', 0.5);

    const result = orch.tick();
    expect(result.transitsCompleted).toBe(0);
    expect(result.transitsAborted).toBe(0);
    expect(result.activeCorridors).toBe(1);
  });
});

// ─── Survey Integration ─────────────────────────────────────────────

describe('WeaveOrchestrator — survey', () => {
  it('reports survey missions advanced', () => {
    const deps = buildDeps({ survey: createMockSurvey(3) });
    const orch = createWeaveOrchestrator(deps);
    const result = orch.tick();
    expect(result.surveysAdvanced).toBe(3);
  });
});

// ─── Cumulative Stats ───────────────────────────────────────────────

describe('WeaveOrchestrator — cumulative stats', () => {
  it('accumulates across ticks', () => {
    const deps = buildDeps({ survey: createMockSurvey(1) });
    const orch = createWeaveOrchestrator(deps);

    orch.tick();
    orch.tick();
    orch.tick();

    const stats = orch.getStats();
    expect(stats.totalTicks).toBe(3);
    expect(stats.totalSurveysAdvanced).toBe(3);
  });
});
