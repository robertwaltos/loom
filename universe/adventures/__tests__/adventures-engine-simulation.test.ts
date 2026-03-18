/**
 * Adventures Engine — Simulation Tests
 *
 * Query and state-resolution tests for adventure config lookup,
 * prerequisite gating, estimated-minutes aggregation, and stats.
 *
 * Thread: silk/universe/adventures-engine-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import { createAdventuresEngine } from '../engine.js';
import type { AdventuresEngineDeps, AdventuresEngine } from '../engine.js';
import type { AdventureConfig, AdventureProgress } from '../types.js';

// ─── Fixtures ─────────────────────────────────────────────────────

function makeConfig(
  overrides: Omit<Partial<AdventureConfig>, 'worldId'> & { entryId: string; worldId: string; guideId: string },
): AdventureConfig {
  return {
    type: 'guided_expedition',
    difficultyTier: 1,
    estimatedMinutes: 10,
    interactionMode: 'guided_walk',
    ...overrides,
  } as AdventureConfig;
}

function makeProgress(
  overrides: Partial<AdventureProgress> & { kindlerId: string; entryId: string },
): AdventureProgress {
  return {
    state: 'in_progress',
    startedAt: Date.now(),
    completedAt: null,
    interactionCount: 1,
    luminanceContributed: 0,
    ...overrides,
  };
}

function makeEngine(
  configs: AdventureConfig[],
  prereqs?: ReadonlyMap<string, readonly string[]>,
): AdventuresEngine {
  const deps: AdventuresEngineDeps = prereqs !== undefined
    ? { configs, entryPrereqs: prereqs }
    : { configs };
  return createAdventuresEngine(deps);
}

// ─── Config Lookup ─────────────────────────────────────────────────

describe('getConfigForEntry', () => {
  it('returns the config for a known entryId', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'entry-a', worldId: 'world-x', guideId: 'guide-1' }),
    ]);
    const result = engine.getConfigForEntry('entry-a');
    expect(result).toBeDefined();
    expect(result!.entryId).toBe('entry-a');
  });

  it('returns undefined for an unknown entryId', () => {
    const engine = makeEngine([]);
    expect(engine.getConfigForEntry('nonexistent')).toBeUndefined();
  });

  it('returns the first matching config when multiple share an entryId', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1' }),
      makeConfig({ entryId: 'e1', worldId: 'w2', guideId: 'g2' }),
    ]);
    // Should return a config for e1 — not crash
    expect(engine.getConfigForEntry('e1')?.entryId).toBe('e1');
  });
});

// ─── World / Guide Filters ─────────────────────────────────────────

describe('getConfigsForWorld', () => {
  it('returns all configs for a given worldId', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'story-tree', guideId: 'g1' }),
      makeConfig({ entryId: 'e2', worldId: 'story-tree', guideId: 'g1' }),
      makeConfig({ entryId: 'e3', worldId: 'number-garden', guideId: 'g2' }),
    ]);
    const results = engine.getConfigsForWorld('story-tree');
    expect(results.length).toBe(2);
    expect(results.every(c => c.worldId === 'story-tree')).toBe(true);
  });

  it('returns empty array when world has no configs', () => {
    const engine = makeEngine([]);
    expect(engine.getConfigsForWorld('cloud-kingdom')).toHaveLength(0);
  });
});

describe('getConfigsForGuide', () => {
  it('returns all configs assigned to a guide', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'zara-ngozi' }),
      makeConfig({ entryId: 'e2', worldId: 'w1', guideId: 'zara-ngozi' }),
      makeConfig({ entryId: 'e3', worldId: 'w2', guideId: 'baxter' }),
    ]);
    const results = engine.getConfigsForGuide('zara-ngozi');
    expect(results.length).toBe(2);
    expect(results.every(c => c.guideId === 'zara-ngozi')).toBe(true);
  });
});

// ─── Adventure State Resolution ────────────────────────────────────

describe('computeAdventureState', () => {
  it('returns available when entry has no prerequisites and no progress', () => {
    const engine = makeEngine([makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1' })]);
    expect(engine.computeAdventureState('e1', [])).toBe('available');
  });

  it('returns locked when prerequisite entry is not completed', () => {
    const prereqs = new Map([['e2', ['e1']]]);
    const engine = makeEngine(
      [makeConfig({ entryId: 'e2', worldId: 'w1', guideId: 'g1' })],
      prereqs,
    );
    expect(engine.computeAdventureState('e2', [])).toBe('locked');
  });

  it('returns available once prerequisite is completed', () => {
    const prereqs = new Map([['e2', ['e1']]]);
    const engine = makeEngine(
      [makeConfig({ entryId: 'e2', worldId: 'w1', guideId: 'g1' })],
      prereqs,
    );
    expect(engine.computeAdventureState('e2', ['e1'])).toBe('available');
  });

  it('returns progress.state when progress is provided', () => {
    const engine = makeEngine([makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1' })]);
    const progress = makeProgress({ kindlerId: 'k1', entryId: 'e1', state: 'completed' });
    expect(engine.computeAdventureState('e1', ['e1'], progress)).toBe('completed');
  });

  it('returns mastered when progress.state is mastered', () => {
    const engine = makeEngine([makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1' })]);
    const progress = makeProgress({ kindlerId: 'k1', entryId: 'e1', state: 'mastered' });
    expect(engine.computeAdventureState('e1', [], progress)).toBe('mastered');
  });

  it('prerequisite check requires ALL prereqs, not just one', () => {
    const prereqs = new Map([['e3', ['e1', 'e2']]]);
    const engine = makeEngine(
      [makeConfig({ entryId: 'e3', worldId: 'w1', guideId: 'g1' })],
      prereqs,
    );
    // Only e1 done — e2 still missing
    expect(engine.computeAdventureState('e3', ['e1'])).toBe('locked');
    // Both done
    expect(engine.computeAdventureState('e3', ['e1', 'e2'])).toBe('available');
  });
});

// ─── Estimated Minutes ─────────────────────────────────────────────

describe('getTotalEstimatedMinutes', () => {
  it('sums estimatedMinutes for a given world', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'story-tree', guideId: 'g1', estimatedMinutes: 15 }),
      makeConfig({ entryId: 'e2', worldId: 'story-tree', guideId: 'g1', estimatedMinutes: 20 }),
      makeConfig({ entryId: 'e3', worldId: 'number-garden', guideId: 'g2', estimatedMinutes: 12 }),
    ]);
    expect(engine.getTotalEstimatedMinutes('story-tree')).toBe(35);
  });

  it('returns 0 for a world with no configs', () => {
    const engine = makeEngine([]);
    expect(engine.getTotalEstimatedMinutes('empty-world')).toBe(0);
  });
});

// ─── Stats ─────────────────────────────────────────────────────────

describe('getStats', () => {
  it('reports total config count', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1' }),
      makeConfig({ entryId: 'e2', worldId: 'w1', guideId: 'g1' }),
      makeConfig({ entryId: 'e3', worldId: 'w2', guideId: 'g2' }),
    ]);
    expect(engine.getStats().totalConfigs).toBe(3);
  });

  it('reports total estimated minutes across all worlds', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1', estimatedMinutes: 10 }),
      makeConfig({ entryId: 'e2', worldId: 'w2', guideId: 'g2', estimatedMinutes: 20 }),
    ]);
    expect(engine.getStats().totalEstimatedMinutes).toBe(30);
  });

  it('configsByWorld counts entries per worldId', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'story-tree', guideId: 'g1' }),
      makeConfig({ entryId: 'e2', worldId: 'story-tree', guideId: 'g1' }),
      makeConfig({ entryId: 'e3', worldId: 'number-garden', guideId: 'g2' }),
    ]);
    const stats = engine.getStats();
    expect(stats.configsByWorld.get('story-tree')).toBe(2);
    expect(stats.configsByWorld.get('number-garden')).toBe(1);
  });

  it('configsByType counts entries per adventure type', () => {
    const engine = makeEngine([
      makeConfig({ entryId: 'e1', worldId: 'w1', guideId: 'g1', type: 'guided_expedition' }),
      makeConfig({ entryId: 'e2', worldId: 'w1', guideId: 'g1', type: 'guided_expedition' }),
      makeConfig({ entryId: 'e3', worldId: 'w1', guideId: 'g1', type: 'artifact_hunt' }),
    ]);
    const stats = engine.getStats();
    expect(stats.configsByType.get('guided_expedition')).toBe(2);
    expect(stats.configsByType.get('artifact_hunt')).toBe(1);
  });

  it('returns zero stats for an empty engine', () => {
    const engine = makeEngine([]);
    const stats = engine.getStats();
    expect(stats.totalConfigs).toBe(0);
    expect(stats.totalEstimatedMinutes).toBe(0);
  });
});
