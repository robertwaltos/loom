import { describe, it, expect } from 'vitest';
import {
  createDynastyReputationGlobalEngine,
  SCORE_MIN,
  SCORE_MAX,
} from '../dynasty-reputation-global.js';
import type {
  GlobalRepDeps,
  DynastyReputationGlobalEngine,
  WorldReputationEntry,
  GlobalReputationScore,
  ReputationAggregate,
} from '../dynasty-reputation-global.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeDeps(): GlobalRepDeps & { setTime: (us: number) => void } {
  let now = 1_000_000;
  let counter = 0;
  return {
    setTime: (us: number) => {
      now = us;
    },
    clock: { nowMicroseconds: () => now },
    idGenerator: {
      next: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
  };
}

function makeEngine(): {
  engine: DynastyReputationGlobalEngine;
  deps: ReturnType<typeof makeDeps>;
} {
  const deps = makeDeps();
  return { engine: createDynastyReputationGlobalEngine(deps), deps };
}

function isEntry(r: WorldReputationEntry | string): r is WorldReputationEntry {
  return typeof r !== 'string';
}

function isGlobal(r: GlobalReputationScore | string): r is GlobalReputationScore {
  return typeof r !== 'string';
}

function isAggregate(r: ReputationAggregate | string): r is ReputationAggregate {
  return typeof r !== 'string';
}

// ─── recordWorldReputation ────────────────────────────────────────────

describe('recordWorldReputation', () => {
  it('records a world reputation entry', () => {
    const { engine } = makeEngine();
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: 500,
      worldTier: 3,
    });
    expect(isEntry(result)).toBe(true);
    if (!isEntry(result)) return;
    expect(result.dynastyId).toBe('d1');
    expect(result.worldId).toBe('w1');
    expect(result.score).toBe(500);
    expect(result.worldTier).toBe(3);
  });

  it('rejects score below SCORE_MIN', () => {
    const { engine } = makeEngine();
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: SCORE_MIN - 1,
      worldTier: 3,
    });
    expect(typeof result).toBe('string');
    expect(result as string).toContain(String(SCORE_MIN));
  });

  it('rejects score above SCORE_MAX', () => {
    const { engine } = makeEngine();
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: SCORE_MAX + 1,
      worldTier: 3,
    });
    expect(typeof result).toBe('string');
  });

  it('rejects worldTier 0', () => {
    const { engine } = makeEngine();
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: 0,
      worldTier: 0,
    });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('worldTier');
  });

  it('rejects worldTier 6', () => {
    const { engine } = makeEngine();
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: 0,
      worldTier: 6,
    });
    expect(typeof result).toBe('string');
  });

  it('updates an existing entry (same dynasty + world)', () => {
    const { engine, deps } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 100, worldTier: 3 });
    deps.setTime(2_000_000);
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: 800,
      worldTier: 3,
    });
    expect(isEntry(result)).toBe(true);
    if (!isEntry(result)) return;
    expect(result.score).toBe(800);
    expect(result.updatedAt).toBe(2_000_000);
  });

  it('preserves original recordedAt on update', () => {
    const { engine, deps } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 100, worldTier: 3 });
    const firstTime = 1_000_000;
    deps.setTime(5_000_000);
    const result = engine.recordWorldReputation({
      dynastyId: 'd1',
      worldId: 'w1',
      score: 200,
      worldTier: 3,
    });
    expect(isEntry(result)).toBe(true);
    if (!isEntry(result)) return;
    expect(result.recordedAt).toBe(firstTime);
  });

  it('retrieves entry via getWorldEntry', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 400, worldTier: 2 });
    const entry = engine.getWorldEntry('d1', 'w1');
    expect(entry).toBeDefined();
    expect(entry?.score).toBe(400);
  });
});

// ─── computeGlobalScore ───────────────────────────────────────────────

describe('computeGlobalScore', () => {
  it('returns error when no world data exists', () => {
    const { engine } = makeEngine();
    const result = engine.computeGlobalScore('unknown');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('unknown');
  });

  it('returns global score for single world entry', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 500, worldTier: 3 });
    const result = engine.computeGlobalScore('d1');
    expect(isGlobal(result)).toBe(true);
    if (!isGlobal(result)) return;
    expect(result.globalScore).toBe(500);
    expect(result.dynastyId).toBe('d1');
    expect(result.worldCount).toBe(1);
  });

  it('assigns correct tier for exalted score', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 900, worldTier: 3 });
    const result = engine.computeGlobalScore('d1');
    expect(isGlobal(result)).toBe(true);
    if (!isGlobal(result)) return;
    expect(result.globalTier).toBe('exalted');
  });

  it('assigns correct tier for reviled score', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: -900, worldTier: 3 });
    const result = engine.computeGlobalScore('d1');
    expect(isGlobal(result)).toBe(true);
    if (!isGlobal(result)) return;
    expect(result.globalTier).toBe('reviled');
  });

  it('assigns neutral tier for score near zero', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 0, worldTier: 3 });
    const result = engine.computeGlobalScore('d1');
    expect(isGlobal(result)).toBe(true);
    if (!isGlobal(result)) return;
    expect(result.globalTier).toBe('neutral');
  });

  it('weights higher-tier worlds more heavily', () => {
    const { engine } = makeEngine();
    // Tier 5 world at 1000, tier 1 world at 0
    // Weight 5: 2.0, Weight 1: 0.5 → weighted avg = (1000*2 + 0*0.5)/(2+0.5) = 800
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w-core', score: 1000, worldTier: 5 });
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w-fringe', score: 0, worldTier: 1 });
    const result = engine.computeGlobalScore('d1');
    expect(isGlobal(result)).toBe(true);
    if (!isGlobal(result)) return;
    expect(result.globalScore).toBeGreaterThan(600);
  });

  it('adds to history on each compute', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 500, worldTier: 3 });
    engine.computeGlobalScore('d1');
    engine.computeGlobalScore('d1');
    const history = engine.getReputationHistory('d1');
    expect(history).toHaveLength(2);
  });

  it('returns empty history for unknown dynasty', () => {
    const { engine } = makeEngine();
    expect(engine.getReputationHistory('unknown')).toHaveLength(0);
  });
});

// ─── getTopDynasties ──────────────────────────────────────────────────

describe('getTopDynasties', () => {
  it('returns empty array when no data', () => {
    const { engine } = makeEngine();
    expect(engine.getTopDynasties(10)).toHaveLength(0);
  });

  it('ranks dynasties by global score descending', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd-low', worldId: 'w1', score: 100, worldTier: 3 });
    engine.recordWorldReputation({ dynastyId: 'd-high', worldId: 'w1', score: 900, worldTier: 3 });
    const top = engine.getTopDynasties(10);
    expect(top[0]?.dynastyId).toBe('d-high');
    expect(top[1]?.dynastyId).toBe('d-low');
  });

  it('assigns correct rank numbers', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 500, worldTier: 3 });
    engine.recordWorldReputation({ dynastyId: 'd2', worldId: 'w1', score: 300, worldTier: 3 });
    const top = engine.getTopDynasties(10);
    expect(top[0]?.rank).toBe(1);
    expect(top[1]?.rank).toBe(2);
  });

  it('respects limit parameter', () => {
    const { engine } = makeEngine();
    for (let i = 0; i < 10; i++) {
      engine.recordWorldReputation({
        dynastyId: 'd' + String(i),
        worldId: 'w1',
        score: i * 50,
        worldTier: 3,
      });
    }
    const top = engine.getTopDynasties(3);
    expect(top).toHaveLength(3);
  });
});

// ─── getAggregate ─────────────────────────────────────────────────────

describe('getAggregate', () => {
  it('returns error for unknown dynasty', () => {
    const { engine } = makeEngine();
    const result = engine.getAggregate('unknown');
    expect(typeof result).toBe('string');
  });

  it('returns aggregate with world entries and global score', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 400, worldTier: 3 });
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w2', score: 600, worldTier: 4 });
    const result = engine.getAggregate('d1');
    expect(isAggregate(result)).toBe(true);
    if (!isAggregate(result)) return;
    expect(result.worldEntries).toHaveLength(2);
    expect(result.globalScore.dynastyId).toBe('d1');
  });
});

// ─── getStats ─────────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.totalDynasties).toBe(0);
    expect(stats.totalWorldEntries).toBe(0);
    expect(stats.averageGlobalScore).toBe(0);
  });

  it('counts dynasties and world entries', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 500, worldTier: 3 });
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w2', score: 300, worldTier: 2 });
    engine.recordWorldReputation({ dynastyId: 'd2', worldId: 'w1', score: 200, worldTier: 3 });
    const stats = engine.getStats();
    expect(stats.totalDynasties).toBe(2);
    expect(stats.totalWorldEntries).toBe(3);
  });

  it('populates tier distribution after computing scores', () => {
    const { engine } = makeEngine();
    engine.recordWorldReputation({ dynastyId: 'd1', worldId: 'w1', score: 900, worldTier: 3 });
    engine.computeGlobalScore('d1');
    const stats = engine.getStats();
    expect(stats.tierDistribution.exalted).toBeGreaterThanOrEqual(1);
  });
});
