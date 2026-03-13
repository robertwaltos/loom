/**
 * kindler-engine.test.ts — Unit tests for the Kindler Progression Engine.
 *
 * Covers: registerKindler, applySpark (all causes + return bonus), applyNaturalDecay
 * (24h gate, floor), recordProgress, markWorldRestored (idempotency, chapter
 * advancement), startSession / endSession (sparkDelta), getSparkState
 * (trend, streakDays), getStats, error paths.
 *
 * Philosophy tested: returning after absence is never punishing — the return
 * bonus makes a long-absent Kindler feel welcomed back, not penalised.
 *
 * Thread: silk/loom-core/kindler-engine
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createKindlerEngine,
  SPARK_DELTAS,
  MIN_SPARK_LEVEL,
  CHAPTER_THRESHOLDS,
  RETURN_BONUS_THRESHOLD_DAYS,
} from '../universe/kindler/engine.js';
import type {
  KindlerEngineDeps,
  KindlerEngine,
  SparkChangeEvent,
  ChapterAdvancedEvent,
} from '../universe/kindler/engine.js';
import type { KindlerProfile } from '../universe/kindler/types.js';

// ─── Test Helpers ─────────────────────────────────────────────────

type DepsWithControl = KindlerEngineDeps & {
  advance: (ms: number) => void;
  sparkChanges: SparkChangeEvent[];
  chapterAdvances: ChapterAdvancedEvent[];
};

function makeDeps(startMs = 1_000_000): DepsWithControl {
  let now = startMs;
  let seq = 0;
  const sparkChanges: SparkChangeEvent[] = [];
  const chapterAdvances: ChapterAdvancedEvent[] = [];
  return {
    advance: (ms) => { now += ms; },
    sparkChanges,
    chapterAdvances,
    clock: { nowMilliseconds: () => now },
    idGenerator: { generate: () => `id-${String(++seq)}` },
    logger: { info: () => undefined, warn: () => undefined },
    events: {
      onSparkChange:    (e) => { sparkChanges.push(e); },
      onChapterAdvanced:(e) => { chapterAdvances.push(e); },
    },
  };
}

const BASE_PROFILE: KindlerProfile = {
  id:             'k1',
  parentAccountId: 'p1',
  displayName:    'Aria',
  ageTier:        2,
  avatarId:       'av1',
  sparkLevel:     0.5,
  currentChapter: 'first_light',
  worldsVisited:  [],
  worldsRestored: [],
  guidesMetCount: 0,
  createdAt:      1_000_000,
};

function makeEngine(overrides?: Partial<KindlerProfile>): { engine: KindlerEngine; deps: DepsWithControl } {
  const deps = makeDeps();
  const engine = createKindlerEngine(deps);
  engine.registerKindler({ ...BASE_PROFILE, ...overrides });
  return { engine, deps };
}

// ─── registerKindler ─────────────────────────────────────────────

describe('registerKindler', () => {
  it('registers a new kindler without error', () => {
    const { engine } = makeEngine();
    expect(engine.getKindlerCount()).toBe(1);
  });

  it('registering twice is idempotent (no error, count stays 1)', () => {
    const { engine } = makeEngine();
    engine.registerKindler(BASE_PROFILE);
    expect(engine.getKindlerCount()).toBe(1);
  });

  it('hydrates initial spark from profile', () => {
    const { engine } = makeEngine({ sparkLevel: 0.8 });
    const state = engine.getSparkState('k1');
    expect(state.level).toBe(0.8);
  });

  it('multiple kindlers tracked independently', () => {
    const deps = makeDeps();
    const engine = createKindlerEngine(deps);
    engine.registerKindler({ ...BASE_PROFILE, id: 'k1', sparkLevel: 0.3 });
    engine.registerKindler({ ...BASE_PROFILE, id: 'k2', sparkLevel: 0.7 });
    expect(engine.getKindlerCount()).toBe(2);
    expect(engine.getSparkState('k1').level).toBe(0.3);
    expect(engine.getSparkState('k2').level).toBe(0.7);
  });
});

// ─── applySpark ──────────────────────────────────────────────────

describe('applySpark', () => {
  it('lesson_completed increases spark by SPARK_DELTAS.lesson_completed', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    const before = engine.getSparkState('k1').level;
    engine.applySpark('k1', 'lesson_completed');
    const after = engine.getSparkState('k1').level;
    expect(after - before).toBeCloseTo(SPARK_DELTAS.lesson_completed, 3);
  });

  it('quiz_passed applies correct delta', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    engine.applySpark('k1', 'quiz_passed');
    expect(engine.getSparkState('k1').level).toBeCloseTo(0.5 + SPARK_DELTAS.quiz_passed, 3);
  });

  it('collaborative_quest applies correct delta', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    engine.applySpark('k1', 'collaborative_quest');
    expect(engine.getSparkState('k1').level).toBeCloseTo(0.5 + SPARK_DELTAS.collaborative_quest, 3);
  });

  it('spark is clamped at 1.0', () => {
    const { engine } = makeEngine({ sparkLevel: 0.98 });
    engine.applySpark('k1', 'lesson_completed');
    expect(engine.getSparkState('k1').level).toBeLessThanOrEqual(1.0);
  });

  it('fires onSparkChange event with correct data', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    engine.applySpark('k1', 'quiz_passed');
    const last = deps.sparkChanges[deps.sparkChanges.length - 1];
    expect(last?.cause).toBe('quiz_passed');
    expect(last?.previousSpark).toBe(0.5);
    expect(last?.newSpark).toBeCloseTo(0.5 + SPARK_DELTAS.quiz_passed, 3);
    expect(last?.delta).toBeCloseTo(SPARK_DELTAS.quiz_passed, 3);
  });

  it('returns a SparkLogEntry with kindlerId and timestamp', () => {
    const { engine } = makeEngine();
    const entry = engine.applySpark('k1', 'lesson_completed');
    expect(entry.kindlerId).toBe('k1');
    expect(entry.cause).toBe('lesson_completed');
    expect(typeof entry.timestamp).toBe('number');
  });

  it('throws when kindlerId is not registered', () => {
    const { engine } = makeEngine();
    expect(() => engine.applySpark('unknown', 'lesson_completed')).toThrow();
  });
});

// ─── return bonus ─────────────────────────────────────────────────

describe('return bonus', () => {
  it('is NOT applied when absent less than threshold days', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    // Advance less than RETURN_BONUS_THRESHOLD_DAYS
    deps.advance((RETURN_BONUS_THRESHOLD_DAYS - 1) * 86_400_000);
    engine.applySpark('k1', 'lesson_completed');
    const causes = deps.sparkChanges.map((e) => e.cause);
    expect(causes).not.toContain('return_bonus');
  });

  it('IS applied when absent >= threshold days', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    deps.advance(RETURN_BONUS_THRESHOLD_DAYS * 86_400_000);
    engine.applySpark('k1', 'lesson_completed');
    const causes = deps.sparkChanges.map((e) => e.cause);
    expect(causes).toContain('return_bonus');
  });

  it('return bonus fires before the lesson delta', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    deps.advance(RETURN_BONUS_THRESHOLD_DAYS * 86_400_000);
    engine.applySpark('k1', 'lesson_completed');
    const causes = deps.sparkChanges.map((e) => e.cause);
    const bonusIdx = causes.indexOf('return_bonus');
    const lessonIdx = causes.indexOf('lesson_completed');
    expect(bonusIdx).toBeLessThan(lessonIdx);
  });

  it('return bonus is only applied to lesson_completed, not quiz_passed', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    deps.advance(RETURN_BONUS_THRESHOLD_DAYS * 86_400_000);
    engine.applySpark('k1', 'quiz_passed');
    const causes = deps.sparkChanges.map((e) => e.cause);
    expect(causes).not.toContain('return_bonus');
  });
});

// ─── applyNaturalDecay ────────────────────────────────────────────

describe('applyNaturalDecay', () => {
  it('returns null when inactive less than 24 hours', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    deps.advance(23 * 3_600_000);
    const result = engine.applyNaturalDecay('k1');
    expect(result).toBeNull();
  });

  it('returns an entry when inactive >= 24 hours', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    deps.advance(25 * 3_600_000);
    const result = engine.applyNaturalDecay('k1');
    expect(result).not.toBeNull();
    expect(result?.delta).toBeLessThan(0);
  });

  it('spark does not drop below MIN_SPARK_LEVEL', () => {
    const { engine, deps } = makeEngine({ sparkLevel: MIN_SPARK_LEVEL + 0.001 });
    deps.advance(10_000 * 3_600_000);  // extreme absence
    engine.applyNaturalDecay('k1');
    expect(engine.getSparkState('k1').level).toBeGreaterThanOrEqual(MIN_SPARK_LEVEL);
  });

  it('returns null when spark is already at MIN_SPARK_LEVEL', () => {
    const { engine, deps } = makeEngine({ sparkLevel: MIN_SPARK_LEVEL });
    deps.advance(48 * 3_600_000);
    const result = engine.applyNaturalDecay('k1');
    expect(result).toBeNull();
  });

  it('decay scales with hours of inactivity', () => {
    const deps1 = makeDeps();
    const e1 = createKindlerEngine(deps1);
    e1.registerKindler({ ...BASE_PROFILE, sparkLevel: 0.9 });

    const deps2 = makeDeps();
    const e2 = createKindlerEngine(deps2);
    e2.registerKindler({ ...BASE_PROFILE, sparkLevel: 0.9 });

    deps1.advance(24 * 3_600_000);
    deps2.advance(48 * 3_600_000);

    const r1 = e1.applyNaturalDecay('k1');
    const r2 = e2.applyNaturalDecay('k1');
    expect(Math.abs(r2?.delta ?? 0)).toBeGreaterThan(Math.abs(r1?.delta ?? 0));
  });
});

// ─── recordProgress ───────────────────────────────────────────────

describe('recordProgress', () => {
  it('returns a KindlerProgress with matching fields', () => {
    const { engine } = makeEngine();
    const progress = engine.recordProgress('k1', 'entry-1', 'cloud-kingdom', 'lesson', 95);
    expect(progress.kindlerId).toBe('k1');
    expect(progress.entryId).toBe('entry-1');
    expect(progress.adventureType).toBe('lesson');
    expect(progress.score).toBe(95);
  });

  it('score can be null', () => {
    const { engine } = makeEngine();
    const progress = engine.recordProgress('k1', 'entry-2', 'cloud-kingdom', 'exploration');
    expect(progress.score).toBeNull();
  });

  it('recording progress increases spark (lesson_completed applied)', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    engine.recordProgress('k1', 'entry-1', 'cloud-kingdom', 'lesson');
    expect(engine.getSparkState('k1').level).toBeGreaterThan(0.5);
  });

  it('onSparkChange fires with lesson_completed cause', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    engine.recordProgress('k1', 'entry-1', 'cloud-kingdom', 'lesson');
    const causes = deps.sparkChanges.map((e) => e.cause);
    expect(causes).toContain('lesson_completed');
  });
});

// ─── markWorldRestored ────────────────────────────────────────────

describe('markWorldRestored', () => {
  it('grants world_restored spark delta', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    engine.markWorldRestored('k1', 'cloud-kingdom');
    const causes = deps.sparkChanges.map((e) => e.cause);
    expect(causes).toContain('world_restored');
  });

  it('is idempotent — second call on same world is a no-op', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    engine.markWorldRestored('k1', 'cloud-kingdom');
    const sparkAfterFirst = engine.getSparkState('k1').level;
    const countAfterFirst = deps.sparkChanges.length;
    engine.markWorldRestored('k1', 'cloud-kingdom');     // duplicate
    expect(engine.getSparkState('k1').level).toBe(sparkAfterFirst);
    expect(deps.sparkChanges.length).toBe(countAfterFirst);
  });

  it('advances chapter when worlds-restored threshold is reached', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    // threadways_open requires 3 worlds restored
    const needed = CHAPTER_THRESHOLDS['threadways_open'];
    const worlds = Array.from({ length: needed }, (_, i) => `world-${String(i)}`);
    for (const w of worlds) engine.markWorldRestored('k1', w);
    const advance = deps.chapterAdvances[0];
    expect(advance?.previousChapter).toBe('first_light');
    expect(advance?.newChapter).toBe('threadways_open');
  });

  it('does NOT advance chapter before threshold', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    const needed = CHAPTER_THRESHOLDS['threadways_open'];
    const worlds = Array.from({ length: needed - 1 }, (_, i) => `w-${String(i)}`);
    for (const w of worlds) engine.markWorldRestored('k1', w);
    expect(deps.chapterAdvances.length).toBe(0);
  });

  it('incrementally advances chapters as more worlds are restored', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.8 });
    const t2 = CHAPTER_THRESHOLDS['threadways_open'];   // 3
    const t3 = CHAPTER_THRESHOLDS['deep_fade'];         // 10
    for (let i = 0; i < t3; i++) engine.markWorldRestored('k1', `w-${String(i)}`);
    expect(deps.chapterAdvances.length).toBeGreaterThanOrEqual(2);
    const chapters = deps.chapterAdvances.map((e) => e.newChapter);
    expect(chapters).toContain('threadways_open');
    expect(chapters).toContain('deep_fade');
    // Sanity: t2 threshold is less than t3
    expect(t2).toBeLessThan(t3);
  });
});

// ─── startSession / endSession ────────────────────────────────────

describe('startSession / endSession', () => {
  it('startSession returns a session with correct kindlerId', () => {
    const { engine } = makeEngine();
    const session = engine.startSession('k1');
    expect(session.kindlerId).toBe('k1');
    expect(session.endedAt).toBeNull();
    expect(session.sparkDelta).toBe(0);
  });

  it('endSession computes sparkDelta correctly', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    const session = engine.startSession('k1');
    engine.applySpark('k1', 'quiz_passed');
    const ended = engine.endSession(session.id, ['cloud-kingdom'], [], []);
    expect(ended.endedAt).not.toBeNull();
    expect(ended.sparkDelta).toBeCloseTo(SPARK_DELTAS.quiz_passed, 3);
  });

  it('sparkDelta is 0 when no spark changes during session', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    const session = engine.startSession('k1');
    const ended = engine.endSession(session.id, [], [], []);
    expect(ended.sparkDelta).toBe(0);
  });

  it('sparkDelta is negative when only decay applied during session', () => {
    const { engine, deps } = makeEngine({ sparkLevel: 0.5 });
    const session = engine.startSession('k1');
    deps.advance(48 * 3_600_000);
    engine.applyNaturalDecay('k1');
    const ended = engine.endSession(session.id, [], [], []);
    expect(ended.sparkDelta).toBeLessThan(0);
  });

  it('endSession records worldsVisited and entriesCompleted', () => {
    const { engine } = makeEngine();
    const session = engine.startSession('k1');
    const ended = engine.endSession(
      session.id,
      ['cloud-kingdom', 'tideline-bay'],
      ['guide-nimbus'],
      ['entry-1', 'entry-2'],
    );
    expect(ended.worldsVisited).toEqual(['cloud-kingdom', 'tideline-bay']);
    expect(ended.guidesInteracted).toEqual(['guide-nimbus']);
    expect(ended.entriesCompleted).toEqual(['entry-1', 'entry-2']);
  });

  it('throws when ending a session that does not exist', () => {
    const { engine } = makeEngine();
    expect(() => engine.endSession('bad-session-id', [], [], [])).toThrow();
  });

  it('totalSessions increments per started session', () => {
    const { engine } = makeEngine();
    engine.startSession('k1');
    engine.startSession('k1');
    expect(engine.getStats().totalSessions).toBe(2);
  });
});

// ─── getSparkState ────────────────────────────────────────────────

describe('getSparkState', () => {
  it('trend is stable at rest', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    expect(engine.getSparkState('k1').trend).toBe('stable');
  });

  it('trend is growing after several positive spark events', () => {
    const { engine } = makeEngine({ sparkLevel: 0.3 });
    for (let i = 0; i < 5; i++) engine.applySpark('k1', 'quiz_passed');
    expect(engine.getSparkState('k1').trend).toBe('growing');
  });

  it('streakDays is 0 with no log entries', () => {
    const { engine } = makeEngine();
    expect(engine.getSparkState('k1').streakDays).toBe(0);
  });

  it('streakDays increments when spark events occur on consecutive days', () => {
    const deps = makeDeps(0);
    const engine = createKindlerEngine(deps);
    engine.registerKindler({ ...BASE_PROFILE, createdAt: 0 });
    // Day 1
    engine.applySpark('k1', 'lesson_completed');
    // Day 2
    deps.advance(86_400_000);
    engine.applySpark('k1', 'lesson_completed');
    // Day 3
    deps.advance(86_400_000);
    engine.applySpark('k1', 'lesson_completed');
    expect(engine.getSparkState('k1').streakDays).toBeGreaterThanOrEqual(1);
  });

  it('throws for unregistered kindlerId', () => {
    const { engine } = makeEngine();
    expect(() => engine.getSparkState('ghost')).toThrow();
  });
});

// ─── getStats ─────────────────────────────────────────────────────

describe('getStats', () => {
  it('initial stats are all zeros', () => {
    const deps = makeDeps();
    const engine = createKindlerEngine(deps);
    const stats = engine.getStats();
    expect(stats.kindlerCount).toBe(0);
    expect(stats.totalSparkUpdates).toBe(0);
    expect(stats.totalWorldsRestored).toBe(0);
    expect(stats.totalSessions).toBe(0);
  });

  it('kindlerCount reflects registered kindlers', () => {
    const { engine } = makeEngine();
    expect(engine.getStats().kindlerCount).toBe(1);
  });

  it('totalSparkUpdates increments with each apply call', () => {
    const { engine } = makeEngine({ sparkLevel: 0.4 });
    engine.applySpark('k1', 'quiz_passed');
    engine.applySpark('k1', 'lesson_completed');
    expect(engine.getStats().totalSparkUpdates).toBeGreaterThanOrEqual(2);
  });

  it('totalWorldsRestored counts unique world restorations', () => {
    const { engine } = makeEngine({ sparkLevel: 0.5 });
    engine.markWorldRestored('k1', 'world-a');
    engine.markWorldRestored('k1', 'world-b');
    engine.markWorldRestored('k1', 'world-a');   // duplicate — ignored
    expect(engine.getStats().totalWorldsRestored).toBe(2);
  });
});
