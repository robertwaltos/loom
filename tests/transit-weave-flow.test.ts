/**
 * Transit-Weave Flow — Integration test.
 *
 * Proves the vertical slice from transit request through weave corridor
 * completion. The flow:
 *
 *   1. TransitRequestService validates and queues a transit request
 *   2. TransitWeaveAdapter bridges the queue (write → read)
 *   3. WeaveOrchestrator dequeues entry, opens corridor, locks frequency
 *   4. Coherence advances to threshold → transit completes
 *   5. Transit ledger records the completed transit
 *
 * Uses real services: TransitRequestService, TransitWeaveAdapter, WeaveOrchestrator.
 * Mocks: presence, worlds, entities, corridor engine, coherence, survey, ledger.
 */

import { describe, it, expect } from 'vitest';
import { createTransitRequestService } from '@loom/nakama-fabric';
import type { TransitRequestDeps } from '@loom/nakama-fabric';
import { createTransitWeaveAdapter } from '@loom/loom-core';
import { createWeaveOrchestrator } from '@loom/silfen-weave';
import type {
  WeaveOrchestratorDeps,
  WeaveCorridorRecord,
  WeaveCorridorTransition,
} from '@loom/silfen-weave';

// ── Clock ───────────────────────────────────────────────────────

function mockClock(start = 1_000_000): {
  readonly nowMicroseconds: () => number;
  advance: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
  };
}

// ── Transit Request Deps ────────────────────────────────────────

function createTransitDeps(
  queueAdapter: ReturnType<typeof createTransitWeaveAdapter>,
): TransitRequestDeps {
  let idCounter = 0;
  return {
    presence: {
      getStatus: () => 'online',
      getWorldId: () => 'earth',
    },
    worlds: {
      exists: () => true,
      getIntegrity: () => 85,
    },
    entities: {
      getEntityForDynasty: (dynastyId) => 'entity-' + dynastyId,
      isInTransit: () => false,
    },
    queue: queueAdapter.writePort,
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'req-' + String(idCounter);
      },
    },
    clock: { nowMicroseconds: () => 1_000_000 },
  };
}

// ── Weave Orchestrator Deps ─────────────────────────────────────

interface LedgerEntry {
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly status: string;
}

function createMockCorridorPort(): WeaveOrchestratorDeps['corridor'] {
  let corridorIdCounter = 0;
  const corridors = new Map<string, { phase: string; entityId: string }>();

  return {
    openCorridor: (params): WeaveCorridorRecord => {
      corridorIdCounter += 1;
      const id = 'corridor-' + String(corridorIdCounter);
      corridors.set(id, { phase: 'route_validated', entityId: params.entityId });
      return { corridorId: id, entityId: params.entityId, phase: 'route_validated' };
    },
    initiateLock: (corridorId, _fieldCondition): WeaveCorridorRecord => {
      const c = corridors.get(corridorId);
      if (c !== undefined) c.phase = 'lock_initiated';
      return { corridorId, entityId: c?.entityId ?? '', phase: 'lock_initiated' };
    },
    advanceCoherence: (corridorId, _coherence): WeaveCorridorTransition | null => {
      const c = corridors.get(corridorId);
      if (c !== undefined) c.phase = 'transit_active';
      return { corridorId, from: 'lock_initiated', to: 'transit_active' };
    },
    completeTransit: (corridorId): WeaveCorridorTransition => {
      const c = corridors.get(corridorId);
      if (c !== undefined) c.phase = 'arrived';
      return { corridorId, from: 'transit_active', to: 'arrived' };
    },
    abortCorridor: (corridorId, _reason): WeaveCorridorTransition => {
      const c = corridors.get(corridorId);
      if (c !== undefined) c.phase = 'failed';
      return { corridorId, from: 'transit_active', to: 'failed' };
    },
    getActiveByEntity: () => undefined,
    countActive: () => corridors.size,
  };
}

function createWeaveDeps(
  queueAdapter: ReturnType<typeof createTransitWeaveAdapter>,
  coherenceValue: number,
): { readonly deps: WeaveOrchestratorDeps; readonly ledgerEntries: LedgerEntry[] } {
  const ledgerEntries: LedgerEntry[] = [];

  const deps: WeaveOrchestratorDeps = {
    queue: queueAdapter.readPort,
    corridor: createMockCorridorPort(),
    coherence: { computeCoherence: () => coherenceValue },
    survey: { evaluateActiveMissions: () => 0 },
    ledger: {
      recordTransit: (params) => {
        ledgerEntries.push({
          entityId: params.entityId,
          originNodeId: params.originNodeId,
          destinationNodeId: params.destinationNodeId,
          status: params.status,
        });
        return 'ledger-' + String(ledgerEntries.length);
      },
    },
    clock: { nowMicroseconds: () => 1_000_000 },
  };

  return { deps, ledgerEntries };
}

// ── Integration: Request → Queue → Corridor → Complete ──────────

describe('Transit-Weave Flow — full transit', () => {
  it('routes transit request through queue to completed corridor', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });

    const transitService = createTransitRequestService(createTransitDeps(adapter));
    const { deps: weaveDeps, ledgerEntries } = createWeaveDeps(adapter, 1.0);
    const weaveOrch = createWeaveOrchestrator(weaveDeps, {
      coherenceTransitThreshold: 0.999,
    });

    // Step 1: Player requests transit earth → mars
    const result = transitService.requestTransit({
      dynastyId: 'd-alice',
      destinationWorldId: 'mars',
    });
    expect(result.ok).toBe(true);
    expect(adapter.getStats().totalEnqueued).toBe(1);

    // Step 2: Weave tick — dequeues, opens corridor, coherence is 1.0 → completes
    const tick1 = weaveOrch.tick();
    expect(tick1.corridorsOpened).toBe(1);
    expect(tick1.transitsCompleted).toBe(1);

    // Step 3: Verify ledger recorded the transit
    expect(ledgerEntries).toHaveLength(1);
    const entry = ledgerEntries[0];
    expect(entry).toBeDefined();
    if (entry === undefined) return;
    expect(entry.entityId).toBe('entity-d-alice');
    expect(entry.originNodeId).toBe('earth');
    expect(entry.destinationNodeId).toBe('mars');
    expect(entry.status).toBe('completed');
  });
});

// ── Integration: Multiple Transits ──────────────────────────────

describe('Transit-Weave Flow — concurrent transits', () => {
  it('processes multiple transit requests in order', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });

    const transitService = createTransitRequestService(createTransitDeps(adapter));
    const { deps: weaveDeps, ledgerEntries } = createWeaveDeps(adapter, 1.0);
    const weaveOrch = createWeaveOrchestrator(weaveDeps, {
      maxConcurrentTransits: 5,
      coherenceTransitThreshold: 0.999,
    });

    transitService.requestTransit({ dynastyId: 'd-1', destinationWorldId: 'mars' });
    transitService.requestTransit({ dynastyId: 'd-2', destinationWorldId: 'venus' });

    expect(adapter.getStats().totalEnqueued).toBe(2);

    // Single tick opens both corridors and completes (coherence is 1.0)
    const tick1 = weaveOrch.tick();
    expect(tick1.corridorsOpened).toBe(2);
    expect(tick1.transitsCompleted).toBe(2);

    expect(ledgerEntries).toHaveLength(2);
  });
});

// ── Integration: Queue Expiration ───────────────────────────────

describe('Transit-Weave Flow — queue expiration', () => {
  it('expires stale transit requests before weave picks them up', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock }, { requestTtlMicroseconds: 5_000_000 });

    const transitService = createTransitRequestService(createTransitDeps(adapter));
    const { deps: weaveDeps } = createWeaveDeps(adapter, 1.0);
    const weaveOrch = createWeaveOrchestrator(weaveDeps);

    transitService.requestTransit({ dynastyId: 'd-1', destinationWorldId: 'mars' });
    expect(adapter.getStats().totalEnqueued).toBe(1);

    // Advance past TTL
    clock.advance(10_000_000);

    // Weave ticks — sweeps expired, opens nothing
    const tick = weaveOrch.tick();
    expect(tick.expiredSwept).toBe(1);
    expect(tick.corridorsOpened).toBe(0);
  });
});

// ── Integration: Rejected Transit ───────────────────────────────

describe('Transit-Weave Flow — validation rejection', () => {
  it('does not queue rejected transit requests', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });

    // Create deps with offline presence to trigger rejection
    const transitDeps: TransitRequestDeps = {
      ...createTransitDeps(adapter),
      presence: {
        getStatus: () => 'offline',
        getWorldId: () => undefined,
      },
    };
    const transitService = createTransitRequestService(transitDeps);

    const result = transitService.requestTransit({
      dynastyId: 'd-offline',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    expect(adapter.getStats().totalEnqueued).toBe(0);
  });
});
