import { describe, it, expect } from 'vitest';
import { createContinuityOrchestrator } from '../continuity-orchestrator.js';
import type {
  DynastyContinuityOrchestrator,
  ContinuityOrchestratorDeps,
  OrchestratorContinuityPort,
  OrchestratorDynastyPort,
  OrchestratorAuctionPort,
  OrchestratorChroniclePort,
  OrchestratorIdGenerator,
  OrchestratorChronicleEntry,
  OrchestratorPhaseResult,
} from '../continuity-orchestrator.js';
import type { ContinuityTransition } from '../dynasty-continuity.js';
import type { DynastyStatus } from '../dynasty.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createMockContinuity(
  transitions: ContinuityTransition[] = [],
): OrchestratorContinuityPort & {
  transitions: ContinuityTransition[];
  redistributionCalls: string[];
} {
  const redistributionCalls: string[] = [];
  return {
    transitions,
    redistributionCalls,
    evaluateAll() {
      return this.transitions;
    },
    completeRedistribution(dynastyId: string) {
      redistributionCalls.push(dynastyId);
      return {
        dynastyId,
        from: 'redistribution' as const,
        to: 'completed' as const,
        at: 1_000_000,
        reason: 'Estate dispersal complete',
      };
    },
  };
}

function createMockDynasty(): OrchestratorDynastyPort & {
  statusChanges: Array<{ dynastyId: string; status: DynastyStatus }>;
} {
  const statusChanges: Array<{ dynastyId: string; status: DynastyStatus }> = [];
  return {
    statusChanges,
    setStatus(dynastyId: string, status: DynastyStatus) {
      statusChanges.push({ dynastyId, status });
    },
  };
}

function createMockAuction(): OrchestratorAuctionPort & {
  created: Array<{ auctionId: string; dynastyId: string }>;
  phaseResults: Map<string, OrchestratorPhaseResult | null>;
} {
  const created: Array<{ auctionId: string; dynastyId: string }> = [];
  const phaseResults = new Map<string, OrchestratorPhaseResult | null>();
  return {
    created,
    phaseResults,
    createAuction(auctionId: string, dynastyId: string) {
      created.push({ auctionId, dynastyId });
    },
    evaluatePhase(auctionId: string) {
      return phaseResults.get(auctionId) ?? null;
    },
  };
}

function createMockChronicle(): OrchestratorChroniclePort & {
  entries: OrchestratorChronicleEntry[];
} {
  const entries: OrchestratorChronicleEntry[] = [];
  let counter = 0;
  return {
    entries,
    append(entry: OrchestratorChronicleEntry) {
      counter += 1;
      entries.push(entry);
      return 'chr-' + String(counter);
    },
  };
}

function createMockIdGenerator(): OrchestratorIdGenerator {
  let counter = 0;
  return {
    next() {
      counter += 1;
      return 'auction-' + String(counter);
    },
  };
}

function transition(overrides?: Partial<ContinuityTransition>): ContinuityTransition {
  return {
    dynastyId: 'dyn-1',
    from: 'active',
    to: 'dormant_30',
    at: 1_000_000,
    reason: 'Inactive for 30 days',
    ...overrides,
  };
}

interface TestHarness {
  orchestrator: DynastyContinuityOrchestrator;
  continuity: ReturnType<typeof createMockContinuity>;
  dynasty: ReturnType<typeof createMockDynasty>;
  auction: ReturnType<typeof createMockAuction>;
  chronicle: ReturnType<typeof createMockChronicle>;
}

function createTestHarness(transitions: ContinuityTransition[] = []): TestHarness {
  const continuity = createMockContinuity(transitions);
  const dynasty = createMockDynasty();
  const auction = createMockAuction();
  const chronicle = createMockChronicle();
  const deps: ContinuityOrchestratorDeps = {
    continuity,
    dynasty,
    auction,
    chronicle,
    idGenerator: createMockIdGenerator(),
  };
  return {
    orchestrator: createContinuityOrchestrator(deps),
    continuity,
    dynasty,
    auction,
    chronicle,
  };
}

// ─── Empty Tick ─────────────────────────────────────────────────────

describe('Continuity orchestrator empty tick', () => {
  it('returns empty result when no transitions occur', () => {
    const { orchestrator } = createTestHarness();
    const result = orchestrator.tick();
    expect(result.transitions).toHaveLength(0);
    expect(result.auctionsCreated).toBe(0);
    expect(result.auctionsCompleted).toBe(0);
    expect(result.chronicleEntries).toBe(0);
  });

  it('starts with no active auctions', () => {
    const { orchestrator } = createTestHarness();
    expect(orchestrator.getActiveAuctionCount()).toBe(0);
    expect(orchestrator.getActiveAuctionIds()).toHaveLength(0);
  });
});

// ─── Dynasty Status Sync ────────────────────────────────────────────

describe('Continuity orchestrator status sync', () => {
  it('sets dynasty to dormant on dormant_30 transition', () => {
    const t = transition({ to: 'dormant_30' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges).toHaveLength(1);
    expect(dynasty.statusChanges[0]?.status).toBe('dormant');
  });

  it('sets dynasty to dormant on dormant_60 transition', () => {
    const t = transition({ to: 'dormant_60' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('dormant');
  });

  it('sets dynasty to dormant on grace_window transition', () => {
    const t = transition({ to: 'grace_window' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('dormant');
  });

  it('sets dynasty to dormant on continuity_triggered', () => {
    const t = transition({ to: 'continuity_triggered' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('dormant');
  });

  it('sets dynasty to completed on redistribution', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('completed');
  });

  it('sets dynasty to completed on vigil', () => {
    const t = transition({ to: 'vigil' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('completed');
  });

  it('sets dynasty to active on recovery', () => {
    const t = transition({ from: 'dormant_30', to: 'active' });
    const { orchestrator, dynasty } = createTestHarness([t]);
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('active');
  });

  it('handles multiple transitions in single tick', () => {
    const t1 = transition({ dynastyId: 'dyn-1', to: 'dormant_30' });
    const t2 = transition({ dynastyId: 'dyn-2', to: 'redistribution' });
    const { orchestrator, dynasty } = createTestHarness([t1, t2]);
    orchestrator.tick();
    expect(dynasty.statusChanges).toHaveLength(2);
    expect(dynasty.statusChanges[0]?.status).toBe('dormant');
    expect(dynasty.statusChanges[1]?.status).toBe('completed');
  });
});

// ─── Chronicle Entries ──────────────────────────────────────────────

describe('Continuity orchestrator chronicle entries', () => {
  it('records chronicle for dormant_30 transition', () => {
    const t = transition({ to: 'dormant_30' });
    const { orchestrator, chronicle } = createTestHarness([t]);
    orchestrator.tick();
    expect(chronicle.entries).toHaveLength(1);
    expect(chronicle.entries[0]?.category).toBe('dynasty.continuity');
    expect(chronicle.entries[0]?.subject).toBe('dyn-1');
  });

  it('records chronicle for vigil with special category', () => {
    const t = transition({ to: 'vigil', reason: 'Real-world death' });
    const { orchestrator, chronicle } = createTestHarness([t]);
    orchestrator.tick();
    expect(chronicle.entries[0]?.category).toBe('dynasty.vigil');
  });

  it('records chronicle for heir activation', () => {
    const t = transition({ to: 'heir_activated' });
    const { orchestrator, chronicle } = createTestHarness([t]);
    orchestrator.tick();
    expect(chronicle.entries[0]?.category).toBe('dynasty.heir');
  });

  it('records chronicle for legacy NPC conversion', () => {
    const t = transition({ to: 'legacy_npc' });
    const { orchestrator, chronicle } = createTestHarness([t]);
    orchestrator.tick();
    expect(chronicle.entries[0]?.category).toBe('dynasty.legacy');
  });

  it('does not record chronicle for grace_window', () => {
    const t = transition({ to: 'grace_window' });
    const { orchestrator, chronicle } = createTestHarness([t]);
    orchestrator.tick();
    expect(chronicle.entries).toHaveLength(0);
  });

  it('includes dynasty ID and reason in content', () => {
    const t = transition({ dynastyId: 'house-alba', reason: 'Day 30 passed' });
    const { orchestrator, chronicle } = createTestHarness([t]);
    orchestrator.tick();
    expect(chronicle.entries[0]?.content).toContain('house-alba');
    expect(chronicle.entries[0]?.content).toContain('Day 30 passed');
  });

  it('counts chronicle entries in result', () => {
    const t1 = transition({ dynastyId: 'dyn-1', to: 'dormant_30' });
    const t2 = transition({ dynastyId: 'dyn-2', to: 'redistribution' });
    const { orchestrator } = createTestHarness([t1, t2]);
    const result = orchestrator.tick();
    expect(result.chronicleEntries).toBe(2);
  });
});

// ─── Auction Creation ───────────────────────────────────────────────

describe('Continuity orchestrator auction creation', () => {
  it('creates auction on redistribution transition', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator, auction } = createTestHarness([t]);
    orchestrator.tick();
    expect(auction.created).toHaveLength(1);
    expect(auction.created[0]?.dynastyId).toBe('dyn-1');
  });

  it('tracks active auction after creation', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator } = createTestHarness([t]);
    orchestrator.tick();
    expect(orchestrator.getActiveAuctionCount()).toBe(1);
    expect(orchestrator.getActiveAuctionIds()).toHaveLength(1);
  });

  it('does not create auction for non-redistribution', () => {
    const t = transition({ to: 'dormant_30' });
    const { orchestrator, auction } = createTestHarness([t]);
    orchestrator.tick();
    expect(auction.created).toHaveLength(0);
  });

  it('creates multiple auctions for multiple redistributions', () => {
    const t1 = transition({ dynastyId: 'dyn-1', to: 'redistribution' });
    const t2 = transition({ dynastyId: 'dyn-2', to: 'redistribution' });
    const { orchestrator, auction } = createTestHarness([t1, t2]);
    orchestrator.tick();
    expect(auction.created).toHaveLength(2);
    expect(orchestrator.getActiveAuctionCount()).toBe(2);
  });

  it('reports auctions created in result', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator } = createTestHarness([t]);
    const result = orchestrator.tick();
    expect(result.auctionsCreated).toBe(1);
  });
});

// ─── Auction Phase Evaluation ───────────────────────────────────────

describe('Continuity orchestrator auction completion', () => {
  it('completes redistribution when auction finishes', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator, auction, continuity } = createTestHarness([t]);
    orchestrator.tick();

    const ids = orchestrator.getActiveAuctionIds();
    const auctionId = ids[0] ?? '';
    expect(auctionId).not.toBe('');
    auction.phaseResults.set(auctionId, { to: 'complete' });
    continuity.transitions = [];

    const result = orchestrator.tick();
    expect(result.auctionsCompleted).toBe(1);
    expect(continuity.redistributionCalls).toHaveLength(1);
    expect(continuity.redistributionCalls[0]).toBe('dyn-1');
  });

  it('removes auction from active list after completion', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator, auction, continuity } = createTestHarness([t]);
    orchestrator.tick();

    const removeIds = orchestrator.getActiveAuctionIds();
    const removeAuctionId = removeIds[0] ?? '';
    auction.phaseResults.set(removeAuctionId, { to: 'complete' });
    continuity.transitions = [];
    orchestrator.tick();

    expect(orchestrator.getActiveAuctionCount()).toBe(0);
  });

  it('does not complete when auction advances to next phase', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator, auction, continuity } = createTestHarness([t]);
    orchestrator.tick();

    const phaseIds = orchestrator.getActiveAuctionIds();
    const phaseAuctionId = phaseIds[0] ?? '';
    auction.phaseResults.set(phaseAuctionId, { to: 'allies' });
    continuity.transitions = [];

    const result = orchestrator.tick();
    expect(result.auctionsCompleted).toBe(0);
    expect(orchestrator.getActiveAuctionCount()).toBe(1);
  });

  it('does not complete when auction has no phase change', () => {
    const t = transition({ to: 'redistribution' });
    const { orchestrator, continuity } = createTestHarness([t]);
    orchestrator.tick();

    continuity.transitions = [];
    const result = orchestrator.tick();
    expect(result.auctionsCompleted).toBe(0);
    expect(orchestrator.getActiveAuctionCount()).toBe(1);
  });
});

// ─── Full Lifecycle ─────────────────────────────────────────────────

describe('Continuity orchestrator full lifecycle', () => {
  it('handles dormancy through redistribution to completion', () => {
    const { orchestrator, auction, continuity, dynasty, chronicle } = createTestHarness();

    // Tick 1: dormant_30
    continuity.transitions = [transition({ to: 'dormant_30' })];
    orchestrator.tick();
    expect(dynasty.statusChanges[0]?.status).toBe('dormant');

    // Tick 2: redistribution
    continuity.transitions = [transition({ to: 'redistribution' })];
    orchestrator.tick();
    expect(dynasty.statusChanges[1]?.status).toBe('completed');
    expect(auction.created).toHaveLength(1);

    // Tick 3: auction completes
    const lcIds = orchestrator.getActiveAuctionIds();
    const lcAuctionId = lcIds[0] ?? '';
    auction.phaseResults.set(lcAuctionId, { to: 'complete' });
    continuity.transitions = [];
    const result = orchestrator.tick();
    expect(result.auctionsCompleted).toBe(1);
    expect(continuity.redistributionCalls).toHaveLength(1);
    expect(chronicle.entries.length).toBeGreaterThanOrEqual(2);
  });
});
