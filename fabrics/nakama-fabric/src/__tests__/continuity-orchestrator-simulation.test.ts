import { describe, expect, it } from 'vitest';
import { createContinuityOrchestrator } from '../continuity-orchestrator.js';
import type { ContinuityTransition } from '../dynasty-continuity.js';

describe('continuity-orchestrator simulation', () => {
  const make = (transitions: ContinuityTransition[]) => {
    const statusChanges: Array<{ dynastyId: string; status: string }> = [];
    const chronicle: Array<{ category: string; subject: string; content: string }> = [];
    const activeAuctions = new Map<string, string>();

    const continuity = {
      evaluateAll: () => transitions,
      completeRedistribution: (dynastyId: string) => ({
        dynastyId,
        from: 'redistribution' as const,
        to: 'completed' as const,
        at: 9_000_000,
        reason: 'completed auction redistribution',
      }),
    };

    const auction = {
      createAuction: (auctionId: string, dynastyId: string) => {
        activeAuctions.set(auctionId, dynastyId);
      },
      evaluatePhase: (auctionId: string) => {
        return activeAuctions.has(auctionId) ? { to: 'complete' } : null;
      },
    };

    let id = 0;
    const orchestrator = createContinuityOrchestrator({
      continuity,
      dynasty: {
        setStatus: (dynastyId, status) => {
          statusChanges.push({ dynastyId, status });
        },
      },
      auction,
      chronicle: {
        append: (entry) => {
          chronicle.push(entry);
          return `chr-${chronicle.length}`;
        },
      },
      idGenerator: { next: () => `auc-${++id}` },
    });

    return { orchestrator, statusChanges, chronicle };
  };

  it('simulates dormancy escalation and redistribution kickoff in a single tick', () => {
    const transitions: ContinuityTransition[] = [
      {
        dynastyId: 'house-a',
        from: 'active',
        to: 'dormant_30',
        at: 1_000_000,
        reason: 'inactive 30 days',
      },
      {
        dynastyId: 'house-b',
        from: 'continuity_triggered',
        to: 'redistribution',
        at: 1_000_000,
        reason: 'grace expired',
      },
    ];

    const { orchestrator, statusChanges, chronicle } = make(transitions);
    const tick = orchestrator.tick();

    expect(tick.transitions).toHaveLength(2);
    expect(tick.auctionsCreated).toBe(1);
    expect(tick.chronicleEntries).toBe(2);
    expect(statusChanges).toHaveLength(2);
    expect(orchestrator.getActiveAuctionCount()).toBe(0);
    expect(chronicle[0]?.category).toBe('dynasty.continuity');
  });

  it('simulates heir/vigil narrative entries with completed dynasty status synchronization', () => {
    const transitions: ContinuityTransition[] = [
      {
        dynastyId: 'house-c',
        from: 'completed',
        to: 'heir_activated',
        at: 2_000_000,
        reason: 'heir accepted claim',
      },
      {
        dynastyId: 'house-d',
        from: 'completed',
        to: 'vigil',
        at: 2_000_000,
        reason: 'memorialized lineage',
      },
    ];

    const { orchestrator, chronicle, statusChanges } = make(transitions);
    const tick = orchestrator.tick();

    expect(tick.chronicleEntries).toBe(2);
    expect(chronicle.map((e) => e.category).sort()).toEqual(['dynasty.heir', 'dynasty.vigil']);
    expect(statusChanges.every((s) => s.status === 'completed')).toBe(true);
  });
});
