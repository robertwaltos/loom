/**
 * Kindler Engine — Simulation Tests
 *
 * Tests for child progression: Spark accumulation, natural decay,
 * chapter advancement, session tracking, return bonus, and trend detection.
 *
 * Thread: silk/universe/kindler-engine-sim
 * Tier: 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createKindlerEngine,
  SPARK_DELTAS,
  CHAPTER_THRESHOLDS,
} from '../engine.js';
import type { KindlerEngineDeps, KindlerEngineConfig } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────

let idCounter = 0;
let timeMs = 100_000_000;

function makeDeps() {
  idCounter = 0;
  timeMs = 100_000_000;

  const events = {
    onSparkChange: vi.fn(),
    onChapterAdvanced: vi.fn(),
  };

  const deps: KindlerEngineDeps = {
    clock: { nowMilliseconds: () => timeMs },
    logger: { info: vi.fn(), warn: vi.fn() },
    idGenerator: { generate: () => `id-${++idCounter}` },
    events,
  };

  return { deps, events };
}

function makeEngine(config?: KindlerEngineConfig) {
  const { deps, events } = makeDeps();
  const engine = createKindlerEngine(deps, config);
  return { engine, events, advance: (ms: number) => { timeMs += ms; } };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Registration ─────────────────────────────────────────────────

describe('registerKindler', () => {
  it('creates a new kindler profile', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    expect(engine.getKindlerCount()).toBe(1);
  });

  it('increments the kindler count for each unique registration', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.registerKindler('k2', 2);
    engine.registerKindler('k3', 3);
    expect(engine.getKindlerCount()).toBe(3);
  });

  it('does not double-register the same kindler', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.registerKindler('k1', 1);
    expect(engine.getKindlerCount()).toBe(1);
  });

  it('initialises kindler with zero worlds restored', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const state = engine.getSparkState('k1');
    expect(state.worldsRestored).toBe(0);
  });
});

// ─── Spark Application ────────────────────────────────────────────

describe('applySpark', () => {
  it('increases spark level on lesson_completed', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const before = engine.getSparkState('k1').level;
    engine.applySpark('k1', 'lesson_completed');
    const after = engine.getSparkState('k1').level;
    expect(after).toBeGreaterThan(before);
  });

  it('gives correct delta for quiz_passed', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const before = engine.getSparkState('k1').level;
    engine.applySpark('k1', 'quiz_passed');
    const after = engine.getSparkState('k1').level;
    expect(after - before).toBeCloseTo(SPARK_DELTAS['quiz_passed']);
  });

  it('gives the largest delta for world_restored', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const before = engine.getSparkState('k1').level;
    engine.applySpark('k1', 'world_restored');
    const after = engine.getSparkState('k1').level;
    expect(after - before).toBeCloseTo(SPARK_DELTAS['world_restored']);
  });

  it('fires the onSparkChange event', () => {
    const { engine, events } = makeEngine();
    engine.registerKindler('k1', 2);
    engine.applySpark('k1', 'lesson_completed');
    expect(events.onSparkChange).toHaveBeenCalledWith(
      expect.objectContaining({ kindlerId: 'k1' }),
    );
  });

  it('spark level does not exceed 1.0', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    for (let i = 0; i < 100; i++) engine.applySpark('k1', 'world_restored');
    expect(engine.getSparkState('k1').level).toBeLessThanOrEqual(1.0);
  });
});

// ─── Return Bonus ─────────────────────────────────────────────────

describe('return bonus on lesson_completed', () => {
  it('auto-adds return_bonus when lesson_completed after 7+ days absence', () => {
    const { engine, advance } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.applySpark('k1', 'lesson_completed');
    advance(8 * DAY_MS);
    const before = engine.getSparkState('k1').level;
    engine.applySpark('k1', 'lesson_completed');
    const after = engine.getSparkState('k1').level;
    // Should receive both lesson_completed and return_bonus deltas
    const expected = SPARK_DELTAS['lesson_completed'] + SPARK_DELTAS['return_bonus'];
    expect(after - before).toBeCloseTo(expected, 2);
  });

  it('does NOT apply return_bonus if absence is under 7 days', () => {
    const { engine, advance } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.applySpark('k1', 'lesson_completed');
    advance(3 * DAY_MS);
    const before = engine.getSparkState('k1').level;
    engine.applySpark('k1', 'lesson_completed');
    const after = engine.getSparkState('k1').level;
    expect(after - before).toBeCloseTo(SPARK_DELTAS['lesson_completed'], 3);
  });
});

// ─── Natural Decay ────────────────────────────────────────────────

describe('applyNaturalDecay', () => {
  it('returns null if fewer than 24 hours have passed', () => {
    const { engine, advance } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.applySpark('k1', 'lesson_completed');
    advance(12 * 60 * 60 * 1000); // 12 hours
    expect(engine.applyNaturalDecay('k1')).toBeNull();
  });

  it('reduces spark after 24+ hours', () => {
    const { engine, advance } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.applySpark('k1', 'lesson_completed');
    const before = engine.getSparkState('k1').level;
    advance(25 * 60 * 60 * 1000); // 25 hours
    engine.applyNaturalDecay('k1');
    const after = engine.getSparkState('k1').level;
    expect(after).toBeLessThan(before);
  });

  it('never drops spark below MIN_SPARK_LEVEL', () => {
    const { engine, advance } = makeEngine();
    engine.registerKindler('k1', 1);
    for (let i = 0; i < 500; i++) {
      advance(25 * 60 * 60 * 1000);
      engine.applyNaturalDecay('k1');
    }
    expect(engine.getSparkState('k1').level).toBeGreaterThan(0);
  });
});

// ─── Chapter Advancement ──────────────────────────────────────────

describe('markWorldRestored / chapter advancement', () => {
  it('increments worldsRestored count', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.markWorldRestored('k1', 'world-a');
    expect(engine.getSparkState('k1').worldsRestored).toBe(1);
  });

  it('is idempotent — same world does not count twice', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.markWorldRestored('k1', 'world-a');
    engine.markWorldRestored('k1', 'world-a');
    expect(engine.getSparkState('k1').worldsRestored).toBe(1);
  });

  it('fires onChapterAdvanced when threshold is crossed', () => {
    const { engine, events } = makeEngine();
    engine.registerKindler('k1', 1);
    // threadways_open threshold = 3
    const threshold = CHAPTER_THRESHOLDS['threadways_open'];
    for (let i = 0; i < threshold; i++) {
      engine.markWorldRestored('k1', `world-${i}`);
    }
    expect(events.onChapterAdvanced).toHaveBeenCalledWith(
      expect.objectContaining({ kindlerId: 'k1', chapter: 'threadways_open' }),
    );
  });

  it('does not fire onChapterAdvanced for same chapter twice', () => {
    const { engine, events } = makeEngine();
    engine.registerKindler('k1', 1);
    const threshold = CHAPTER_THRESHOLDS['threadways_open'];
    for (let i = 0; i < threshold + 2; i++) {
      engine.markWorldRestored('k1', `world-${i}`);
    }
    const calls = (events.onChapterAdvanced as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([arg]: [{ chapter: string }]) => arg.chapter === 'threadways_open',
    );
    expect(calls.length).toBe(1);
  });

  it('can advance all chapters in sequence', () => {
    const { engine, events } = makeEngine();
    engine.registerKindler('k1', 1);
    const topThreshold = CHAPTER_THRESHOLDS['kindlers_legacy'];
    for (let i = 0; i < topThreshold; i++) {
      engine.markWorldRestored('k1', `world-${i}`);
    }
    const chapters = (events.onChapterAdvanced as ReturnType<typeof vi.fn>).mock.calls.map(
      ([arg]: [{ chapter: string }]) => arg.chapter,
    );
    expect(chapters).toContain('threadways_open');
    expect(chapters).toContain('deep_fade');
    expect(chapters).toContain('the_source');
    expect(chapters).toContain('kindlers_legacy');
  });
});

// ─── Sessions ─────────────────────────────────────────────────────

describe('startSession / endSession', () => {
  it('creates and returns a session', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const session = engine.startSession('k1', 'world-x');
    expect(session.kindlerId).toBe('k1');
    expect(session.worldId).toBe('world-x');
  });

  it('records session in profile after ending', () => {
    const { engine, advance } = makeEngine();
    engine.registerKindler('k1', 1);
    const session = engine.startSession('k1', 'world-x');
    advance(5 * 60 * 1000); // 5 min
    engine.endSession(session.id);
    const profile = engine.getSparkState('k1');
    expect(profile.sessionCount).toBeGreaterThanOrEqual(1);
  });

  it('allows multiple sessions across different worlds', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const s1 = engine.startSession('k1', 'world-a');
    engine.endSession(s1.id);
    const s2 = engine.startSession('k1', 'world-b');
    engine.endSession(s2.id);
    expect(engine.getSparkState('k1').sessionCount).toBe(2);
  });
});

// ─── Spark Trend ──────────────────────────────────────────────────

describe('getSparkState trend', () => {
  it('returns growing when spark increases consistently', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    for (let i = 0; i < 6; i++) engine.applySpark('k1', 'lesson_completed');
    const state = engine.getSparkState('k1');
    expect(state.trend).toBe('growing');
  });

  it('returns steady on a flat profile', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    const state = engine.getSparkState('k1');
    expect(state.trend).toBe('steady');
  });
});

// ─── Stats ────────────────────────────────────────────────────────

describe('getStats', () => {
  it('totalRegisteredKindlers reflects all registrations', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.registerKindler('k2', 1);
    const stats = engine.getStats();
    expect(stats.totalRegisteredKindlers).toBe(2);
  });

  it('totalSparkEventsDispatched increments per applySpark call', () => {
    const { engine } = makeEngine();
    engine.registerKindler('k1', 1);
    engine.applySpark('k1', 'lesson_completed');
    engine.applySpark('k1', 'quiz_passed');
    const stats = engine.getStats();
    expect(stats.totalSparkEventsDispatched).toBeGreaterThanOrEqual(2);
  });
});
