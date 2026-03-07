import { describe, it, expect } from 'vitest';
import { createConsequenceEngine } from '../consequence-engine.js';
import { createMarksRegistry } from '../marks-registry.js';
import type {
  ConsequenceEngine,
  ConsequenceEngineDeps,
  ConsequenceChroniclePort,
  ConsequenceChronicleEntry,
  WorldSurveyedCallback,
  SurveyCompleteEvent,
  UnrestNotifyEvent,
  VoteCompleteEvent,
} from '../consequence-engine.js';

// ─── Test Helpers ───────────────────────────────────────────────────

let idCounter = 0;
let chronicleCounter = 0;

function createMockChronicle(): ConsequenceChroniclePort & {
  entries: ConsequenceChronicleEntry[];
} {
  const entries: ConsequenceChronicleEntry[] = [];
  return {
    entries,
    append(entry: ConsequenceChronicleEntry): string {
      chronicleCounter += 1;
      entries.push(entry);
      return 'chr-' + String(chronicleCounter);
    },
  };
}

function createMockCallback(): WorldSurveyedCallback & {
  calls: Array<{ worldId: string; beaconId: string }>;
} {
  const calls: Array<{ worldId: string; beaconId: string }> = [];
  return {
    calls,
    onWorldSurveyed(worldId: string, beaconId: string): void {
      calls.push({ worldId, beaconId });
    },
  };
}

function createTestEngine(): {
  engine: ConsequenceEngine;
  chronicle: ReturnType<typeof createMockChronicle>;
  callback: ReturnType<typeof createMockCallback>;
  deps: ConsequenceEngineDeps;
} {
  idCounter = 0;
  chronicleCounter = 0;
  const chronicle = createMockChronicle();
  const callback = createMockCallback();
  const clock = { nowMicroseconds: () => 1_000_000 };
  const deps: ConsequenceEngineDeps = {
    chronicle,
    marksRegistry: createMarksRegistry({
      idGenerator: {
        next() {
          idCounter += 1;
          return 'mark-' + String(idCounter);
        },
      },
      clock,
    }),
    worldSurveyedCallback: callback,
  };
  return { engine: createConsequenceEngine(deps), chronicle, callback, deps };
}

function surveyEvent(overrides?: Partial<SurveyCompleteEvent>): SurveyCompleteEvent {
  return {
    missionId: 'mission-1',
    dynastyId: 'dyn-1',
    worldId: 'earth',
    beaconId: 'beacon-alpha',
    completedAtUs: 5_000_000,
    ...overrides,
  };
}

function unrestEvent(overrides?: Partial<UnrestNotifyEvent>): UnrestNotifyEvent {
  return {
    worldId: 'earth',
    unrestLevel: 0.75,
    triggeredAtUs: 6_000_000,
    ...overrides,
  };
}

function voteEvent(overrides?: Partial<VoteCompleteEvent>): VoteCompleteEvent {
  return {
    motionId: 'motion-42',
    worldId: 'earth',
    passed: true,
    yesWeight: 75,
    noWeight: 25,
    completedAtUs: 7_000_000,
    ...overrides,
  };
}

// ─── Survey Consequences ────────────────────────────────────────────

describe('Consequence engine survey handling', () => {
  it('records chronicle entry for survey completion', () => {
    const { engine, chronicle } = createTestEngine();
    const result = engine.handleSurveyComplete(surveyEvent());
    expect(result.chronicleEntryId).toBe('chr-1');
    // First survey on a world creates 2 entries: survey + world mark
    expect(chronicle.entries.length).toBeGreaterThanOrEqual(1);
    expect(chronicle.entries[0]?.category).toBe('world.transition');
    expect(chronicle.entries[0]?.worldId).toBe('earth');
  });

  it('awards SURVEY mark', () => {
    const { engine } = createTestEngine();
    const result = engine.handleSurveyComplete(surveyEvent());
    expect(result.surveyMark.markType).toBe('SURVEY');
    expect(result.surveyMark.dynastyId).toBe('dyn-1');
    expect(result.surveyMark.worldId).toBe('earth');
  });

  it('awards WORLD mark on first survey of a world', () => {
    const { engine } = createTestEngine();
    const result = engine.handleSurveyComplete(surveyEvent());
    expect(result.worldMark).not.toBeNull();
    expect(result.worldMark?.markType).toBe('WORLD');
    expect(result.worldMark?.dynastyId).toBe('dyn-1');
  });

  it('creates separate chronicle entry for WORLD mark', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleSurveyComplete(surveyEvent());
    // Survey chronicle + world mark chronicle = 2 entries
    expect(chronicle.entries).toHaveLength(2);
    expect(chronicle.entries[1]?.category).toBe('player.achievement');
  });

  it('does not award WORLD mark on second survey of same world', () => {
    const { engine } = createTestEngine();
    engine.handleSurveyComplete(surveyEvent({ dynastyId: 'dyn-1' }));
    const second = engine.handleSurveyComplete(surveyEvent({ dynastyId: 'dyn-2' }));
    expect(second.worldMark).toBeNull();
  });

  it('awards WORLD mark for different worlds independently', () => {
    const { engine } = createTestEngine();
    const r1 = engine.handleSurveyComplete(surveyEvent({ worldId: 'earth' }));
    const r2 = engine.handleSurveyComplete(surveyEvent({ worldId: 'mars' }));
    expect(r1.worldMark).not.toBeNull();
    expect(r2.worldMark).not.toBeNull();
  });

  it('fires world surveyed callback', () => {
    const { engine, callback } = createTestEngine();
    engine.handleSurveyComplete(surveyEvent());
    expect(callback.calls).toHaveLength(1);
    expect(callback.calls[0]?.worldId).toBe('earth');
    expect(callback.calls[0]?.beaconId).toBe('beacon-alpha');
  });

  it('fires callback even when world mark already exists', () => {
    const { engine, callback } = createTestEngine();
    engine.handleSurveyComplete(surveyEvent({ dynastyId: 'dyn-1' }));
    engine.handleSurveyComplete(surveyEvent({ dynastyId: 'dyn-2' }));
    expect(callback.calls).toHaveLength(2);
  });
});

// ─── Unrest Consequences ────────────────────────────────────────────

describe('Consequence engine unrest handling', () => {
  it('records chronicle entry for unrest', () => {
    const { engine, chronicle } = createTestEngine();
    const result = engine.handleUnrestNotify(unrestEvent());
    expect(result.chronicleEntryId).toBe('chr-1');
    expect(chronicle.entries).toHaveLength(1);
    expect(chronicle.entries[0]?.category).toBe('governance.vote');
  });

  it('includes unrest level in chronicle content', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleUnrestNotify(unrestEvent({ unrestLevel: 0.85 }));
    expect(chronicle.entries[0]?.content).toContain('0.85');
  });

  it('uses worldId as subject', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleUnrestNotify(unrestEvent({ worldId: 'mars' }));
    expect(chronicle.entries[0]?.subject).toBe('mars');
    expect(chronicle.entries[0]?.worldId).toBe('mars');
  });
});

// ─── Vote Consequences ──────────────────────────────────────────────

describe('Consequence engine vote handling', () => {
  it('records chronicle entry for passed vote', () => {
    const { engine, chronicle } = createTestEngine();
    const result = engine.handleVoteComplete(voteEvent({ passed: true }));
    expect(result.chronicleEntryId).toBe('chr-1');
    expect(chronicle.entries[0]?.content).toContain('passed');
  });

  it('records chronicle entry for rejected vote', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleVoteComplete(voteEvent({ passed: false }));
    expect(chronicle.entries[0]?.content).toContain('rejected');
  });

  it('uses motionId as subject', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleVoteComplete(voteEvent({ motionId: 'motion-99' }));
    expect(chronicle.entries[0]?.subject).toBe('motion-99');
  });

  it('includes motionId in chronicle content', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleVoteComplete(voteEvent({ motionId: 'motion-99' }));
    expect(chronicle.entries[0]?.content).toContain('motion-99');
  });
});

// ─── Cross-Event Isolation ──────────────────────────────────────────

describe('Consequence engine event isolation', () => {
  it('handles all three event types independently', () => {
    const { engine, chronicle } = createTestEngine();
    engine.handleSurveyComplete(surveyEvent());
    engine.handleUnrestNotify(unrestEvent());
    engine.handleVoteComplete(voteEvent());
    // Survey creates 2 entries (survey + world mark), unrest 1, vote 1 = 4
    expect(chronicle.entries).toHaveLength(4);
  });

  it('survey marks accumulate across calls', () => {
    const { engine, deps } = createTestEngine();
    engine.handleSurveyComplete(surveyEvent({ worldId: 'earth', dynastyId: 'dyn-1' }));
    engine.handleSurveyComplete(surveyEvent({ worldId: 'mars', dynastyId: 'dyn-1' }));
    // 2 SURVEY marks + 2 WORLD marks = 4
    expect(deps.marksRegistry.countByDynasty('dyn-1')).toBe(4);
  });
});
