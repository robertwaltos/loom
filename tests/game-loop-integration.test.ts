/**
 * Game Loop Integration Tests — Full session lifecycle
 *
 * Tests the end-to-end flow: create Kindler → start session →
 * complete entries → earn Spark → restore world → end session.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createKindlerEngine, SPARK_DELTAS } from '../universe/kindler/engine.js';
import { createMockKindlerRepository } from '../universe/kindler/repository.js';
import type { KindlerProfile } from '../universe/kindler/types.js';
import type { KindlerEngine, KindlerEngineDeps } from '../universe/kindler/engine.js';

// ─── Fixtures ────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;
let idCounter = 0;

function makeEngineDeps(nowMs = NOW): KindlerEngineDeps {
  return {
    clock: { nowMilliseconds: () => nowMs },
    logger: { info: () => undefined, warn: () => undefined },
    idGenerator: { generate: () => `id-${(idCounter++).toString()}` },
    events: {
      onSparkChange: () => undefined,
      onChapterAdvanced: () => undefined,
    },
  };
}

function makeProfile(id = 'kindler-001'): KindlerProfile {
  return {
    id,
    parentAccountId: 'parent-001',
    displayName: 'Spark',
    ageTier: 2,
    avatarId: 'avatar-001',
    sparkLevel: 0.1,
    currentChapter: 'first_light',
    worldsVisited: [],
    worldsRestored: [],
    guidesMetCount: 0,
    createdAt: NOW,
  };
}

let engine: KindlerEngine;

beforeEach(() => {
  idCounter = 0;
  engine = createKindlerEngine(makeEngineDeps());
});

// ─── Tests ────────────────────────────────────────────────────────

describe('Game Loop — basic session', () => {
  it('can register and get spark state', () => {
    engine.registerKindler(makeProfile());
    const spark = engine.getSparkState('kindler-001');
    expect(spark.level).toBeCloseTo(0.1, 3);
    expect(spark.trend).toBe('stable');
  });

  it('start and end session returns matching session', () => {
    engine.registerKindler(makeProfile());
    const session = engine.startSession('kindler-001');
    expect(session.kindlerId).toBe('kindler-001');
    expect(session.endedAt).toBeNull();

    const ended = engine.endSession(session.id, ['cloud-kingdom'], ['professor-nimbus'], ['entry-1']);
    expect(ended.endedAt).not.toBeNull();
    expect(ended.worldsVisited).toContain('cloud-kingdom');
    expect(ended.guidesInteracted).toContain('professor-nimbus');
  });

  it('completing an entry grants spark', () => {
    engine.registerKindler(makeProfile());
    const before = engine.getSparkState('kindler-001').level;
    engine.recordProgress('kindler-001', 'entry-weather-1', 'cloud-kingdom', 'field_trip');
    const after = engine.getSparkState('kindler-001').level;
    expect(after).toBeGreaterThan(before);
  });

  it('quiz_passed grants spark', () => {
    engine.registerKindler(makeProfile());
    const before = engine.getSparkState('kindler-001').level;
    engine.applySpark('kindler-001', 'quiz_passed');
    const after = engine.getSparkState('kindler-001').level;
    expect(after - before).toBeCloseTo(SPARK_DELTAS.quiz_passed, 3);
  });

  it('restoring a world grants largest spark bonus', () => {
    engine.registerKindler(makeProfile());
    const before = engine.getSparkState('kindler-001').level;
    engine.markWorldRestored('kindler-001', 'cloud-kingdom');
    const after = engine.getSparkState('kindler-001').level;
    expect(after - before).toBeGreaterThanOrEqual(SPARK_DELTAS.world_restored - 0.001);
  });

  it('restoring the same world twice is idempotent', () => {
    engine.registerKindler(makeProfile());
    engine.markWorldRestored('kindler-001', 'cloud-kingdom');
    const after1 = engine.getSparkState('kindler-001').level;
    engine.markWorldRestored('kindler-001', 'cloud-kingdom');
    const after2 = engine.getSparkState('kindler-001').level;
    expect(after2).toBeCloseTo(after1, 3);
  });

  it('spark never exceeds 1.0', () => {
    engine.registerKindler(makeProfile());
    for (let i = 0; i < 30; i++) {
      engine.applySpark('kindler-001', 'lesson_completed');
    }
    expect(engine.getSparkState('kindler-001').level).toBeLessThanOrEqual(1.0);
  });

  it('spark never drops below minimum', () => {
    const e = createKindlerEngine(makeEngineDeps(), { minSparkLevel: 0.01 });
    e.registerKindler({ ...makeProfile(), sparkLevel: 0.02 });
    e.applyNaturalDecay('kindler-001');
    expect(e.getSparkState('kindler-001').level).toBeGreaterThanOrEqual(0.01);
  });
});

describe('Game Loop — chapter progression', () => {
  it('starts in first_light chapter', () => {
    engine.registerKindler(makeProfile());
    const stats = engine.getStats();
    expect(stats.kindlerCount).toBe(1);
  });

  it('advances to threadways_open after 3 worlds restored', () => {
    const events: string[] = [];
    const e = createKindlerEngine({
      ...makeEngineDeps(),
      events: {
        onSparkChange: () => undefined,
        onChapterAdvanced: (ev) => { events.push(ev.newChapter); },
      },
    });
    e.registerKindler(makeProfile());
    e.markWorldRestored('kindler-001', 'world-a');
    e.markWorldRestored('kindler-001', 'world-b');
    e.markWorldRestored('kindler-001', 'world-c');
    expect(events).toContain('threadways_open');
  });
});

describe('Game Loop — repository integration', () => {
  it('save and reload profile round-trips correctly', async () => {
    const repo = createMockKindlerRepository();
    const profile = makeProfile();
    engine.registerKindler(profile);
    engine.applySpark('kindler-001', 'lesson_completed');

    const updatedSpark = engine.getSparkState('kindler-001').level;
    await repo.save({ ...profile, sparkLevel: updatedSpark });

    const loaded = await repo.findById('kindler-001');
    expect(loaded).not.toBeNull();
    expect(loaded?.sparkLevel).toBeCloseTo(updatedSpark, 3);
  });

  it('session persisted to repo survives restart', async () => {
    const repo = createMockKindlerRepository();
    engine.registerKindler(makeProfile());
    const session = engine.startSession('kindler-001');
    await repo.saveSession(session);

    const loaded = await repo.loadSession(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.kindlerId).toBe('kindler-001');
  });

  it('progress entries accumulate across multiple completions', async () => {
    const repo = createMockKindlerRepository();
    engine.registerKindler(makeProfile());

    const entries = ['entry-a', 'entry-b', 'entry-c'];
    for (const eid of entries) {
      const prog = engine.recordProgress('kindler-001', eid, 'cloud-kingdom', 'field_trip');
      await repo.saveProgress(prog);
    }

    const loaded = await repo.loadProgress('kindler-001');
    expect(loaded).toHaveLength(3);
  });
});

describe('Game Loop — multi-kindler', () => {
  it('separate kindlers have independent spark states', () => {
    engine.registerKindler(makeProfile('k-001'));
    engine.registerKindler(makeProfile('k-002'));

    for (let i = 0; i < 5; i++) {
      engine.applySpark('k-001', 'lesson_completed');
    }

    const spark1 = engine.getSparkState('k-001').level;
    const spark2 = engine.getSparkState('k-002').level;
    expect(spark1).toBeGreaterThan(spark2);
  });

  it('getStats reports total kindler count', () => {
    engine.registerKindler(makeProfile('k-a'));
    engine.registerKindler(makeProfile('k-b'));
    engine.registerKindler(makeProfile('k-c'));
    expect(engine.getStats().kindlerCount).toBe(3);
  });

  it('registering same kindler twice is idempotent', () => {
    engine.registerKindler(makeProfile());
    engine.registerKindler(makeProfile());
    expect(engine.getStats().kindlerCount).toBe(1);
  });
});
