import { describe, it, expect } from 'vitest';
import { calculateChronicleDepth, DEFAULT_DEPTH_CONFIG } from '../depth-scoring.js';
import type { ChronicleEntry, ChronicleCategory } from '../chronicle.js';

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;
const NOW = 1000 * US_PER_DAY;

function makeEntry(
  overrides: Partial<ChronicleEntry> & { category: ChronicleCategory },
): ChronicleEntry {
  return {
    entryId: 'e-1',
    index: 0,
    timestamp: NOW,
    worldId: 'kelath-prime',
    subjectId: 'player-1',
    content: 'test',
    hash: '0'.repeat(64),
    previousHash: '0'.repeat(64),
    ...overrides,
  };
}

function makeEntries(
  count: number,
  category: ChronicleCategory,
  worldId = 'kelath-prime',
  timestamp = NOW,
): ChronicleEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({ entryId: `e-${String(i)}`, index: i, category, worldId, timestamp }),
  );
}

describe('Chronicle Depth empty entries', () => {
  it('returns zero score for empty entries', () => {
    const score = calculateChronicleDepth([], NOW);
    expect(score.totalScore).toBe(0);
    expect(score.entryCount).toBe(0);
    expect(score.diversityBonus).toBe(0);
    expect(score.worldSpreadBonus).toBe(0);
  });
});

describe('Chronicle Depth single entry', () => {
  it('scores a single entity.lifecycle entry', () => {
    const entries = [makeEntry({ category: 'entity.lifecycle' })];
    const score = calculateChronicleDepth(entries, NOW);
    expect(score.totalScore).toBeGreaterThan(0);
    expect(score.entryCount).toBe(1);
    expect(score.categoryBreakdown['entity.lifecycle']).toBeGreaterThan(0);
  });

  it('single entry has zero diversity bonus', () => {
    const entries = [makeEntry({ category: 'entity.lifecycle' })];
    const score = calculateChronicleDepth(entries, NOW);
    expect(score.diversityBonus).toBe(0);
  });
});

describe('Chronicle Depth category weights', () => {
  it('entity.lifecycle scores higher than economy.transaction', () => {
    const lifecycle = calculateChronicleDepth(
      [makeEntry({ category: 'entity.lifecycle' })], NOW,
    );
    const transaction = calculateChronicleDepth(
      [makeEntry({ category: 'economy.transaction' })], NOW,
    );
    expect(lifecycle.totalScore).toBeGreaterThan(transaction.totalScore);
  });

  it('governance.vote scores higher than npc.action', () => {
    const governance = calculateChronicleDepth(
      [makeEntry({ category: 'governance.vote' })], NOW,
    );
    const npc = calculateChronicleDepth(
      [makeEntry({ category: 'npc.action' })], NOW,
    );
    expect(governance.totalScore).toBeGreaterThan(npc.totalScore);
  });

  it('system.event is the lowest weight', () => {
    const system = calculateChronicleDepth(
      [makeEntry({ category: 'system.event' })], NOW,
    );
    const npc = calculateChronicleDepth(
      [makeEntry({ category: 'npc.action' })], NOW,
    );
    expect(system.totalScore).toBeLessThan(npc.totalScore);
  });
});

describe('Chronicle Depth diversity bonus', () => {
  it('multiple categories increase diversity bonus', () => {
    const singleCat = calculateChronicleDepth(
      makeEntries(7, 'entity.lifecycle'), NOW,
    );
    const multiCat = calculateChronicleDepth([
      makeEntry({ category: 'entity.lifecycle', entryId: 'a' }),
      makeEntry({ category: 'economy.transaction', entryId: 'b' }),
      makeEntry({ category: 'governance.vote', entryId: 'c' }),
      makeEntry({ category: 'world.transition', entryId: 'd' }),
      makeEntry({ category: 'player.achievement', entryId: 'e' }),
      makeEntry({ category: 'npc.action', entryId: 'f' }),
      makeEntry({ category: 'system.event', entryId: 'g' }),
    ], NOW);
    expect(multiCat.diversityBonus).toBeGreaterThan(singleCat.diversityBonus);
  });

  it('all categories give maximum diversity bonus (1.0)', () => {
    const entries = [
      makeEntry({ category: 'entity.lifecycle', entryId: 'a' }),
      makeEntry({ category: 'economy.transaction', entryId: 'b' }),
      makeEntry({ category: 'governance.vote', entryId: 'c' }),
      makeEntry({ category: 'world.transition', entryId: 'd' }),
      makeEntry({ category: 'player.achievement', entryId: 'e' }),
      makeEntry({ category: 'npc.action', entryId: 'f' }),
      makeEntry({ category: 'system.event', entryId: 'g' }),
    ];
    const score = calculateChronicleDepth(entries, NOW);
    expect(score.diversityBonus).toBeCloseTo(1.0, 5);
  });
});

describe('Chronicle Depth world spread bonus', () => {
  it('more unique worlds increase spread bonus', () => {
    const oneWorld = calculateChronicleDepth(
      makeEntries(3, 'entity.lifecycle', 'world-1'), NOW,
    );
    const threeWorlds = calculateChronicleDepth([
      makeEntry({ category: 'entity.lifecycle', worldId: 'w1', entryId: 'a' }),
      makeEntry({ category: 'entity.lifecycle', worldId: 'w2', entryId: 'b' }),
      makeEntry({ category: 'entity.lifecycle', worldId: 'w3', entryId: 'c' }),
    ], NOW);
    expect(threeWorlds.worldSpreadBonus).toBeGreaterThan(oneWorld.worldSpreadBonus);
  });

  it('caps at 1.0 for 10+ worlds', () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      makeEntry({
        category: 'entity.lifecycle',
        worldId: `world-${String(i)}`,
        entryId: `e-${String(i)}`,
        index: i,
      }),
    );
    const score = calculateChronicleDepth(entries, NOW);
    expect(score.worldSpreadBonus).toBe(1.0);
  });
});

describe('Chronicle Depth diminishing returns', () => {
  it('marginal value decreases with same-category entries', () => {
    const one = calculateChronicleDepth(makeEntries(1, 'entity.lifecycle'), NOW);
    const two = calculateChronicleDepth(makeEntries(2, 'entity.lifecycle'), NOW);
    const ten = calculateChronicleDepth(makeEntries(10, 'entity.lifecycle'), NOW);

    const marginalSecond = two.totalScore - one.totalScore;
    const marginalTenth = ten.totalScore - calculateChronicleDepth(
      makeEntries(9, 'entity.lifecycle'), NOW,
    ).totalScore;
    expect(marginalSecond).toBeGreaterThan(marginalTenth);
  });
});

describe('Chronicle Depth recency decay', () => {
  it('recent entries score higher than old entries', () => {
    const recent = calculateChronicleDepth(
      [makeEntry({ category: 'entity.lifecycle', timestamp: NOW })], NOW,
    );
    const old = calculateChronicleDepth(
      [makeEntry({ category: 'entity.lifecycle', timestamp: NOW - 730 * US_PER_DAY })], NOW,
    );
    expect(recent.totalScore).toBeGreaterThan(old.totalScore);
  });

  it('enforces recency floor (very old entries still score > 0)', () => {
    const veryOld = calculateChronicleDepth(
      [makeEntry({ category: 'entity.lifecycle', timestamp: 0 })], NOW,
    );
    expect(veryOld.totalScore).toBeGreaterThan(0);
  });
});

describe('Chronicle Depth Bible v1.4 invariant', () => {
  it('50 significant entries outscore 1000 trivial ones', () => {
    const significant = calculateChronicleDepth([
      ...makeEntries(15, 'entity.lifecycle'),
      ...makeEntries(10, 'governance.vote').map((e, i) =>
        ({ ...e, entryId: `gv-${String(i)}`, worldId: `w-${String(i % 5)}` })),
      ...makeEntries(10, 'world.transition').map((e, i) =>
        ({ ...e, entryId: `wt-${String(i)}`, worldId: `w-${String(i)}` })),
      ...makeEntries(10, 'player.achievement').map((e, i) =>
        ({ ...e, entryId: `pa-${String(i)}` })),
      ...makeEntries(5, 'economy.transaction').map((e, i) =>
        ({ ...e, entryId: `et-${String(i)}` })),
    ], NOW);

    const trivial = calculateChronicleDepth(
      makeEntries(1000, 'system.event'), NOW,
    );

    expect(significant.totalScore).toBeGreaterThan(trivial.totalScore);
    expect(significant.entryCount).toBe(50);
    expect(trivial.entryCount).toBe(1000);
  });
});

describe('Chronicle Depth config defaults', () => {
  it('exports default config', () => {
    expect(DEFAULT_DEPTH_CONFIG.categoryWeights['entity.lifecycle']).toBe(150);
    expect(DEFAULT_DEPTH_CONFIG.diversityScale).toBe(0.3);
    expect(DEFAULT_DEPTH_CONFIG.worldSpreadScale).toBe(0.25);
    expect(DEFAULT_DEPTH_CONFIG.recencyFloor).toBe(0.1);
  });
});
