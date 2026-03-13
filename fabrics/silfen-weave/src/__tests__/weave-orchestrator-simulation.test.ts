import { describe, expect, it } from 'vitest';
import { createWeaveOrchestrator } from '../weave-orchestrator.js';
import type {
  WeaveCorridorRecord,
  WeaveCorridorTransition,
  WeaveOrchestratorDeps,
  WeaveQueueEntry,
} from '../weave-orchestrator.js';

function queueEntry(entityId: string, origin: string, destination: string): WeaveQueueEntry {
  return {
    requestId: `req-${entityId}`,
    entityId,
    originNodeId: origin,
    destinationNodeId: destination,
    priority: 'normal',
  };
}

function buildDeps(entries: WeaveQueueEntry[]): WeaveOrchestratorDeps {
  const queue = [...entries];
  const active = new Map<string, WeaveCorridorRecord>();
  const coherenceById = new Map<string, number>();
  const ledger: Array<{ entityId: string; status: string }> = [];
  let seq = 0;

  return {
    queue: {
      dequeue: () => queue.shift(),
      sweepExpired: () => 0,
      getQueueDepth: () => queue.length,
    },
    corridor: {
      openCorridor: (params) => {
        const corridorId = `cor-${++seq}`;
        const rec: WeaveCorridorRecord = { corridorId, entityId: params.entityId, phase: 'route_validated' };
        active.set(corridorId, rec);
        return rec;
      },
      initiateLock: (corridorId) => active.get(corridorId) ?? { corridorId, entityId: 'unknown', phase: 'lock_initiated' },
      advanceCoherence: () => null,
      completeTransit: (corridorId) => {
        active.delete(corridorId);
        return { corridorId, from: 'transit_active', to: 'arrived' } as WeaveCorridorTransition;
      },
      abortCorridor: (corridorId) => {
        active.delete(corridorId);
        return { corridorId, from: 'transit_active', to: 'aborted' } as WeaveCorridorTransition;
      },
      getActiveByEntity: (entityId) => [...active.values()].find((v) => v.entityId === entityId),
      countActive: () => active.size,
    },
    coherence: {
      computeCoherence: (corridorId) => coherenceById.get(corridorId) ?? 0.5,
    },
    survey: {
      evaluateActiveMissions: () => 1,
    },
    ledger: {
      recordTransit: ({ entityId, status }) => {
        ledger.push({ entityId, status });
        return `tx-${ledger.length}`;
      },
    },
    clock: { nowMicroseconds: () => 1_000_000 },
  };
}

describe('weave-orchestrator simulation', () => {
  it('advances queued traffic and reports aggregate tick statistics', () => {
    const deps = buildDeps([queueEntry('e-1', 'a', 'b'), queueEntry('e-2', 'b', 'c')]);
    const orchestrator = createWeaveOrchestrator(deps, {
      coherenceTransitThreshold: 0.9,
      coherenceAbortThreshold: 0.2,
    });

    const t1 = orchestrator.tick();
    expect(t1.corridorsOpened).toBe(2);
    expect(t1.surveysAdvanced).toBe(1);

    const t2 = orchestrator.tick();
    expect(t2.tickNumber).toBe(2);
    expect(orchestrator.getStats().totalTicks).toBe(2);
  });
});
