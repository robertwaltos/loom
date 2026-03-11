/**
 * Archive-Chronicle Flow — Integration test.
 *
 * Proves the vertical slice from dynasty continuity transitions
 * through chronicle recording in the real Archive service. The flow:
 *
 *   1. ContinuityOrchestrator detects inactivity transition
 *   2. Chronicle port adapter bridges to real Archive chronicle
 *   3. Archive records entry with SHA-256 hash chain
 *   4. Entries are queryable by subject and category
 *   5. Hash chain remains valid after multiple entries
 *
 * Uses real services: ContinuityEngine, ContinuityOrchestrator, Chronicle.
 * Mocks: clock, dynasty registry, auction engine.
 */

import { describe, it, expect } from 'vitest';
import { createContinuityEngine, createContinuityOrchestrator } from '@loom/nakama-fabric';
import type { ContinuityOrchestratorDeps } from '@loom/nakama-fabric';
import { createChronicle } from '@loom/archive';
import type { Chronicle } from '@loom/archive';

// ── Clock ───────────────────────────────────────────────────────

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

function mockClock(start = 1_000_000): {
  readonly nowMicroseconds: () => number;
  advanceDays: (days: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advanceDays: (days: number) => {
      t += days * US_PER_DAY;
    },
  };
}

// ── Chronicle Adapter ───────────────────────────────────────────

interface ChronicleAdapter {
  readonly port: ContinuityOrchestratorDeps['chronicle'];
  readonly flush: () => Promise<void>;
}

function createChronicleAdapter(archive: Chronicle): ChronicleAdapter {
  const pending: Array<Promise<unknown>> = [];

  return {
    port: {
      append: (entry) => {
        const p = archive.record({
          category: 'system.event',
          worldId: entry.worldId,
          subjectId: entry.subject,
          content: entry.content,
        });
        pending.push(p);
        return 'pending';
      },
    },
    flush: async () => {
      await Promise.all(pending);
      pending.length = 0;
    },
  };
}

// ── Wiring ──────────────────────────────────────────────────────

interface ArchiveFlowContext {
  readonly orchestrator: ReturnType<typeof createContinuityOrchestrator>;
  readonly continuity: ReturnType<typeof createContinuityEngine>;
  readonly archive: Chronicle;
  readonly adapter: ChronicleAdapter;
}

function wireArchiveFlow(clock: { nowMicroseconds: () => number }): ArchiveFlowContext {
  let idCounter = 0;
  const continuity = createContinuityEngine({ clock });
  const archive = createChronicle({
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return 'entry-' + String(idCounter);
      },
    },
    clock,
  });
  const adapter = createChronicleAdapter(archive);

  const deps: ContinuityOrchestratorDeps = {
    continuity: {
      evaluateAll: () => continuity.evaluateAll(),
      completeRedistribution: (id) => continuity.completeRedistribution(id),
    },
    dynasty: {
      setStatus: () => {
        /* noop for this test */
      },
    },
    auction: {
      createAuction: () => {
        /* noop for this test */
      },
      evaluatePhase: () => null,
    },
    chronicle: adapter.port,
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'auction-' + String(idCounter);
      },
    },
  };

  const orchestrator = createContinuityOrchestrator(deps);
  return { orchestrator, continuity, archive, adapter };
}

// ── Integration: Transitions → Chronicle ────────────────────────

describe('Archive-Chronicle Flow — transition recording', () => {
  it('records continuity transitions in the archive', async () => {
    const clock = mockClock();
    const { orchestrator, continuity, archive, adapter } = wireArchiveFlow(clock);

    continuity.initializeRecord('house-atreides', 'free');

    // Day 31: active → dormant_30 triggers chronicle entry
    clock.advanceDays(31);
    orchestrator.tick();
    await adapter.flush();

    expect(archive.count()).toBe(1);
    const entry = archive.latest();
    expect(entry).toBeDefined();
    if (entry === undefined) return;
    expect(entry.subjectId).toBe('house-atreides');
    expect(entry.content).toContain('house-atreides');
  });

  it('builds valid hash chain across multiple transitions', async () => {
    const clock = mockClock();
    const { orchestrator, continuity, archive, adapter } = wireArchiveFlow(clock);

    continuity.initializeRecord('house-corrino', 'free');

    // Three transitions: dormant_30, dormant_60, continuity_triggered
    clock.advanceDays(31);
    orchestrator.tick();
    await adapter.flush();

    clock.advanceDays(30);
    orchestrator.tick();
    await adapter.flush();

    clock.advanceDays(31);
    orchestrator.tick();
    await adapter.flush();

    expect(archive.count()).toBe(3);
    const verification = await archive.verifyChain();
    expect(verification.valid).toBe(true);
    expect(verification.entriesChecked).toBe(3);
    expect(verification.brokenAt).toBeNull();
  });
});

describe('Archive-Chronicle Flow — query by subject', () => {
  it('queries chronicle entries for a specific dynasty', async () => {
    const clock = mockClock();
    const { orchestrator, continuity, archive, adapter } = wireArchiveFlow(clock);

    continuity.initializeRecord('house-alpha', 'free');
    continuity.initializeRecord('house-beta', 'free');

    // Both go dormant at day 31
    clock.advanceDays(31);
    orchestrator.tick();
    await adapter.flush();

    expect(archive.count()).toBe(2);

    const alphaEntries = archive.query({ subjectId: 'house-alpha' });
    expect(alphaEntries).toHaveLength(1);

    const betaEntries = archive.query({ subjectId: 'house-beta' });
    expect(betaEntries).toHaveLength(1);
  });
});

describe('Archive-Chronicle Flow — hash integrity', () => {
  it('maintains separate hash chains for sequential entries', async () => {
    const clock = mockClock();
    const { orchestrator, continuity, archive, adapter } = wireArchiveFlow(clock);

    continuity.initializeRecord('house-one', 'free');

    clock.advanceDays(31);
    orchestrator.tick();
    await adapter.flush();

    clock.advanceDays(30);
    orchestrator.tick();
    await adapter.flush();

    const first = archive.getByIndex(0);
    const second = archive.getByIndex(1);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    // Each entry has a unique hash
    expect(first.hash).not.toBe(second.hash);
    // Second entry's previousHash links to first entry's hash
    expect(second.previousHash).toBe(first.hash);
  });
});
