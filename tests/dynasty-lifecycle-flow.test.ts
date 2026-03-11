/**
 * Dynasty Lifecycle Flow — Integration test.
 *
 * Proves the vertical slice from dynasty creation through continuity
 * state machine to estate auction completion. The flow:
 *
 *   1. ContinuityEngine tracks inactivity progression
 *   2. ContinuityOrchestrator evaluates all records per tick
 *   3. Transitions sync to DynastyRegistry status
 *   4. Redistribution triggers estate auction creation
 *   5. Auction phases advance through time-gated windows
 *   6. Completed auction triggers final redistribution
 *
 * Uses real services: ContinuityEngine, EstateAuctionEngine,
 * ContinuityOrchestrator. Mocks: clock, dynasty registry, chronicle.
 */

import { describe, it, expect } from 'vitest';
import {
  createContinuityEngine,
  createEstateAuctionEngine,
  createContinuityOrchestrator,
} from '@loom/nakama-fabric';
import type { ContinuityOrchestratorDeps, PhaseTransition } from '@loom/nakama-fabric';

// ── Clock ───────────────────────────────────────────────────────

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;
const US_PER_HOUR = 60 * 60 * 1_000_000;

function mockClock(start = 1_000_000): {
  readonly nowMicroseconds: () => number;
  advanceDays: (days: number) => void;
  advanceHours: (hours: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advanceDays: (days: number) => {
      t += days * US_PER_DAY;
    },
    advanceHours: (hours: number) => {
      t += hours * US_PER_HOUR;
    },
  };
}

// ── Chronicle Mock ──────────────────────────────────────────────

interface ChronicleEntry {
  readonly category: string;
  readonly subject: string;
  readonly content: string;
}

function createMockChronicle(): {
  readonly port: ContinuityOrchestratorDeps['chronicle'];
  readonly entries: ChronicleEntry[];
} {
  const entries: ChronicleEntry[] = [];
  return {
    entries,
    port: {
      append: (entry) => {
        entries.push({
          category: entry.category,
          subject: entry.subject,
          content: entry.content,
        });
        return 'chr-' + String(entries.length);
      },
    },
  };
}

// ── Dynasty Status Mock ─────────────────────────────────────────

function createMockDynasty(): {
  readonly port: ContinuityOrchestratorDeps['dynasty'];
  readonly statuses: Map<string, string>;
} {
  const statuses = new Map<string, string>();
  return {
    statuses,
    port: {
      setStatus: (dynastyId, status) => {
        statuses.set(dynastyId, status);
      },
    },
  };
}

// ── Orchestrator Wiring ─────────────────────────────────────────

function wireOrchestrator(clock: { nowMicroseconds: () => number }): {
  readonly orchestrator: ReturnType<typeof createContinuityOrchestrator>;
  readonly continuity: ReturnType<typeof createContinuityEngine>;
  readonly auction: ReturnType<typeof createEstateAuctionEngine>;
  readonly chronicle: ReturnType<typeof createMockChronicle>;
  readonly dynasty: ReturnType<typeof createMockDynasty>;
} {
  const continuity = createContinuityEngine({ clock });
  const auction = createEstateAuctionEngine({ clock });
  const chronicle = createMockChronicle();
  const dynasty = createMockDynasty();

  let idCounter = 0;

  const deps: ContinuityOrchestratorDeps = {
    continuity: {
      evaluateAll: () => continuity.evaluateAll(),
      completeRedistribution: (id) => continuity.completeRedistribution(id),
    },
    dynasty: dynasty.port,
    auction: {
      createAuction: (id, dynastyId) => {
        auction.createAuction(id, dynastyId);
      },
      evaluatePhase: (id) => {
        const result: PhaseTransition | null = auction.evaluatePhase(id);
        if (result === null) return null;
        return { to: result.to };
      },
    },
    chronicle: chronicle.port,
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'auction-' + String(idCounter);
      },
    },
  };

  const orchestrator = createContinuityOrchestrator(deps);

  return { orchestrator, continuity, auction, chronicle, dynasty };
}

// ── Integration: Full Lifecycle ─────────────────────────────────

describe('Dynasty Lifecycle — active to dormant', () => {
  it('transitions dynasty through dormancy stages', () => {
    const clock = mockClock();
    const { orchestrator, continuity, dynasty } = wireOrchestrator(clock);

    continuity.initializeRecord('house-atreides', 'free');

    // Day 0: active — no transitions
    const tick0 = orchestrator.tick();
    expect(tick0.transitions).toHaveLength(0);

    // Day 31: active → dormant_30
    clock.advanceDays(31);
    const tick1 = orchestrator.tick();
    expect(tick1.transitions).toHaveLength(1);
    expect(dynasty.statuses.get('house-atreides')).toBe('dormant');
    expect(continuity.getRecord('house-atreides').state).toBe('dormant_30');

    // Day 61: dormant_30 → dormant_60
    clock.advanceDays(30);
    const tick2 = orchestrator.tick();
    expect(tick2.transitions).toHaveLength(1);
    expect(continuity.getRecord('house-atreides').state).toBe('dormant_60');
  });
});

describe('Dynasty Lifecycle — login recovery', () => {
  it('recovers dynasty from dormancy on login', () => {
    const clock = mockClock();
    const { orchestrator, continuity, dynasty } = wireOrchestrator(clock);

    continuity.initializeRecord('house-harkonnen', 'free');

    // Push to dormant_30
    clock.advanceDays(31);
    orchestrator.tick();
    expect(dynasty.statuses.get('house-harkonnen')).toBe('dormant');

    // Login recovers to active
    const recovery = continuity.recordLogin('house-harkonnen');
    expect(recovery).not.toBeNull();
    if (recovery !== null) {
      expect(recovery.to).toBe('active');
    }
    expect(continuity.getRecord('house-harkonnen').state).toBe('active');
  });
});

// ── Integration: Full Death Cycle ───────────────────────────────

describe('Dynasty Lifecycle — redistribution and auction', () => {
  it('creates auction when dynasty enters redistribution', () => {
    const clock = mockClock();
    const { orchestrator, continuity, dynasty, chronicle } = wireOrchestrator(clock);

    continuity.initializeRecord('house-corrino', 'free');

    // Day 31: active → dormant_30
    clock.advanceDays(31);
    orchestrator.tick();

    // Day 61: dormant_30 → dormant_60
    clock.advanceDays(30);
    orchestrator.tick();

    // Day 92: dormant_60 → continuity_triggered (free tier, no grace)
    clock.advanceDays(31);
    orchestrator.tick();
    expect(continuity.getRecord('house-corrino').state).toBe('continuity_triggered');

    // Day 181: continuity_triggered → redistribution → auction created
    clock.advanceDays(89);
    const tickRedist = orchestrator.tick();
    expect(tickRedist.auctionsCreated).toBe(1);
    expect(continuity.getRecord('house-corrino').state).toBe('redistribution');
    expect(dynasty.statuses.get('house-corrino')).toBe('completed');
    expect(orchestrator.getActiveAuctionCount()).toBe(1);

    // Chronicle recorded all transitions
    expect(chronicle.entries.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Dynasty Lifecycle — auction completion', () => {
  it('completes redistribution when auction finishes all phases', () => {
    const clock = mockClock();
    const { orchestrator, continuity } = wireOrchestrator(clock);

    continuity.initializeRecord('house-vernius', 'free');

    // Push through to redistribution (31 + 30 + 31 + 89 = 181 days)
    clock.advanceDays(31);
    orchestrator.tick();
    clock.advanceDays(30);
    orchestrator.tick();
    clock.advanceDays(31);
    orchestrator.tick();
    clock.advanceDays(89);
    orchestrator.tick();
    expect(orchestrator.getActiveAuctionCount()).toBe(1);

    // Advance through all 4 auction phases (192 hours total)
    // Phase 1: heirs (48h)
    clock.advanceHours(49);
    orchestrator.tick();
    expect(orchestrator.getActiveAuctionCount()).toBe(1);

    // Phase 2: allies (48h)
    clock.advanceHours(49);
    orchestrator.tick();
    expect(orchestrator.getActiveAuctionCount()).toBe(1);

    // Phase 3: assembly (72h)
    clock.advanceHours(73);
    orchestrator.tick();
    expect(orchestrator.getActiveAuctionCount()).toBe(1);

    // Phase 4: liquidation (24h) → complete
    clock.advanceHours(25);
    const tickComplete = orchestrator.tick();
    expect(tickComplete.auctionsCompleted).toBe(1);
    expect(orchestrator.getActiveAuctionCount()).toBe(0);
    expect(continuity.getRecord('house-vernius').state).toBe('completed');
  });
});

// ── Integration: Multiple Dynasties ─────────────────────────────

describe('Dynasty Lifecycle — multiple dynasties', () => {
  it('tracks independent lifecycle timelines', () => {
    const clock = mockClock();
    const { orchestrator, continuity, dynasty } = wireOrchestrator(clock);

    continuity.initializeRecord('house-alpha', 'free');

    // Day 15: second dynasty joins
    clock.advanceDays(15);
    continuity.initializeRecord('house-beta', 'free');

    // Day 31: alpha → dormant_30, beta still active
    clock.advanceDays(16);
    const tick1 = orchestrator.tick();
    expect(tick1.transitions).toHaveLength(1);
    expect(dynasty.statuses.get('house-alpha')).toBe('dormant');
    expect(dynasty.statuses.has('house-beta')).toBe(false);

    // Day 46: beta → dormant_30, alpha → dormant_60
    clock.advanceDays(15);
    orchestrator.tick();
    clock.advanceDays(15);
    const tick2 = orchestrator.tick();
    expect(tick2.transitions.length).toBeGreaterThanOrEqual(1);

    // Alpha should be further along
    const alphaState = continuity.getRecord('house-alpha').state;
    const betaState = continuity.getRecord('house-beta').state;
    expect(alphaState).toBe('dormant_60');
    expect(betaState).toBe('dormant_30');
  });
});
