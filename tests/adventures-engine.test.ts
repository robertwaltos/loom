/**
 * Tests — Adventures Engine
 */

import { describe, it, expect } from 'vitest';
import { createAdventuresEngine } from '../universe/adventures/engine.js';
import type { AdventuresEngineDeps } from '../universe/adventures/engine.js';
import type { AdventureConfig, AdventureProgress } from '../universe/adventures/types.js';

// ─── Fixture Helpers ───────────────────────────────────────────────

function cfg(
  entryId: string,
  worldId: string,
  opts: { guideId?: string; minutes?: number; type?: AdventureConfig['type'] } = {},
): AdventureConfig {
  return {
    type: opts.type ?? 'guided_expedition',
    entryId,
    worldId: worldId as AdventureConfig['worldId'],
    guideId: opts.guideId ?? 'guide',
    difficultyTier: 1,
    estimatedMinutes: opts.minutes ?? 20,
    interactionMode: 'guided_walk',
  };
}

function prog(
  entryId: string,
  state: AdventureProgress['state'],
  opts: { interactionCount?: number; luminance?: number } = {},
): AdventureProgress {
  return {
    kindlerId: 'k1',
    entryId,
    state,
    startedAt: state !== 'available' ? 1_000_000 : null,
    completedAt: state === 'completed' || state === 'mastered' ? 2_000_000 : null,
    interactionCount: opts.interactionCount ?? 0,
    luminanceContributed: opts.luminance ?? 0,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('getConfigForEntry', () => {
  const deps: AdventuresEngineDeps = {
    configs: [cfg('e1', 'w1'), cfg('e2', 'w1'), cfg('e3', 'w2')],
  };
  const engine = createAdventuresEngine(deps);

  it('returns config when found', () => {
    expect(engine.getConfigForEntry('e1')?.entryId).toBe('e1');
  });

  it('returns undefined for unknown entry', () => {
    expect(engine.getConfigForEntry('nope')).toBeUndefined();
  });
});

describe('getConfigsForWorld', () => {
  const deps: AdventuresEngineDeps = {
    configs: [cfg('e1', 'w1'), cfg('e2', 'w1'), cfg('e3', 'w2')],
  };
  const engine = createAdventuresEngine(deps);

  it('returns configs for the given world', () => {
    expect(engine.getConfigsForWorld('w1').map(c => c.entryId)).toEqual(['e1', 'e2']);
  });

  it('excludes configs from other worlds', () => {
    expect(engine.getConfigsForWorld('w2').map(c => c.entryId)).toEqual(['e3']);
  });

  it('returns empty for unknown world', () => {
    expect(engine.getConfigsForWorld('ghost')).toHaveLength(0);
  });
});

describe('getConfigsForGuide', () => {
  const deps: AdventuresEngineDeps = {
    configs: [
      cfg('e1', 'w1', { guideId: 'nimbus' }),
      cfg('e2', 'w1', { guideId: 'nimbus' }),
      cfg('e3', 'w2', { guideId: 'anaya' }),
    ],
  };
  const engine = createAdventuresEngine(deps);

  it('returns configs for the given guide', () => {
    expect(engine.getConfigsForGuide('nimbus').map(c => c.entryId)).toEqual(['e1', 'e2']);
  });

  it('returns empty for unknown guide', () => {
    expect(engine.getConfigsForGuide('nobody')).toHaveLength(0);
  });
});

describe('computeAdventureState — no prereqs', () => {
  const deps: AdventuresEngineDeps = {
    configs: [cfg('e1', 'w1')],
  };
  const engine = createAdventuresEngine(deps);

  it('returns available when no progress and no prereqs', () => {
    expect(engine.computeAdventureState('e1', [])).toBe('available');
  });

  it('returns in_progress when progress state is in_progress', () => {
    expect(engine.computeAdventureState('e1', [], prog('e1', 'in_progress'))).toBe('in_progress');
  });

  it('returns completed when progress state is completed', () => {
    expect(engine.computeAdventureState('e1', [], prog('e1', 'completed'))).toBe('completed');
  });

  it('returns mastered when progress state is mastered', () => {
    expect(engine.computeAdventureState('e1', [], prog('e1', 'mastered'))).toBe('mastered');
  });
});

describe('computeAdventureState — with prereqs', () => {
  const prereqs = new Map<string, readonly string[]>([
    ['e2', ['e1']],
    ['e3', ['e1', 'e2']],
  ]);
  const deps: AdventuresEngineDeps = {
    configs: [cfg('e1', 'w1'), cfg('e2', 'w1'), cfg('e3', 'w1')],
    entryPrereqs: prereqs,
  };
  const engine = createAdventuresEngine(deps);

  it('returns locked when prereqs are not met', () => {
    expect(engine.computeAdventureState('e2', [])).toBe('locked');
  });

  it('returns available when prereqs are fully met and no progress', () => {
    expect(engine.computeAdventureState('e2', ['e1'])).toBe('available');
  });

  it('returns locked when only partial prereqs are met', () => {
    expect(engine.computeAdventureState('e3', ['e1'])).toBe('locked');
  });

  it('returns available when all multi-prereqs are met', () => {
    expect(engine.computeAdventureState('e3', ['e1', 'e2'])).toBe('available');
  });

  it('returns progress state when prereqs are met and progress exists', () => {
    expect(engine.computeAdventureState('e2', ['e1'], prog('e2', 'completed'))).toBe('completed');
  });

  it('returns available for entry with no prereqs regardless of completed ids', () => {
    expect(engine.computeAdventureState('e1', [])).toBe('available');
  });
});

describe('getTotalEstimatedMinutes', () => {
  const deps: AdventuresEngineDeps = {
    configs: [
      cfg('e1', 'w1', { minutes: 20 }),
      cfg('e2', 'w1', { minutes: 25 }),
      cfg('e3', 'w2', { minutes: 15 }),
    ],
  };
  const engine = createAdventuresEngine(deps);

  it('sums estimated minutes for the given world', () => {
    expect(engine.getTotalEstimatedMinutes('w1')).toBe(45);
  });

  it('returns 0 for unknown world', () => {
    expect(engine.getTotalEstimatedMinutes('ghost')).toBe(0);
  });

  it('does not include minutes from other worlds', () => {
    expect(engine.getTotalEstimatedMinutes('w2')).toBe(15);
  });
});

describe('getStats', () => {
  const deps: AdventuresEngineDeps = {
    configs: [
      cfg('e1', 'w1', { minutes: 20, type: 'guided_expedition' }),
      cfg('e2', 'w1', { minutes: 25, type: 'artifact_hunt' }),
      cfg('e3', 'w2', { minutes: 15, type: 'guided_expedition' }),
    ],
  };
  const stats = createAdventuresEngine(deps).getStats();

  it('counts total configs', () => {
    expect(stats.totalConfigs).toBe(3);
  });

  it('sums all estimated minutes', () => {
    expect(stats.totalEstimatedMinutes).toBe(60);
  });

  it('counts configs per world', () => {
    expect(stats.configsByWorld.get('w1')).toBe(2);
    expect(stats.configsByWorld.get('w2')).toBe(1);
  });

  it('counts configs per adventure type', () => {
    expect(stats.configsByType.get('guided_expedition')).toBe(2);
    expect(stats.configsByType.get('artifact_hunt')).toBe(1);
  });
});
