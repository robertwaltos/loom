/**
 * Tests — Worlds Engine
 */

import { describe, it, expect } from 'vitest';
import { createWorldsEngine, computeFadingStage } from '../universe/worlds/engine.js';
import type { WorldsEngineDeps } from '../universe/worlds/engine.js';
import type { WorldDefinition, Realm } from '../universe/worlds/types.js';

// ─── Fixture Helpers ───────────────────────────────────────────────

function w(
  id: string,
  realm: Realm,
  opts: {
    entryIds?: readonly string[];
    connections?: readonly string[];
  } = {},
): WorldDefinition {
  return {
    id,
    name: id,
    realm,
    subject: 'Test',
    guideId: 'guide',
    description: '',
    colorPalette: {
      primary: '#000',
      secondary: '#000',
      accent: '#000',
      fadedVariant: '#000',
      restoredVariant: '#000',
    },
    lightingMood: '',
    biomeKit: 'test',
    entryIds: opts.entryIds ?? [],
    threadwayConnections: opts.connections ?? [],
  };
}

function makeDeps(worlds: readonly WorldDefinition[]): WorldsEngineDeps {
  return { worlds };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('getWorldById', () => {
  const engine = createWorldsEngine(makeDeps([w('alpha', 'discovery'), w('beta', 'exchange')]));

  it('returns the world when found', () => {
    expect(engine.getWorldById('alpha')?.id).toBe('alpha');
  });

  it('returns undefined for unknown id', () => {
    expect(engine.getWorldById('nope')).toBeUndefined();
  });
});

describe('getWorldsByRealm', () => {
  const deps = makeDeps([
    w('d1', 'discovery'),
    w('d2', 'discovery'),
    w('e1', 'expression'),
    w('ex1', 'exchange'),
  ]);
  const engine = createWorldsEngine(deps);

  it('returns worlds matching the realm', () => {
    expect(engine.getWorldsByRealm('discovery').map(x => x.id)).toEqual(['d1', 'd2']);
  });

  it('excludes worlds from other realms', () => {
    expect(engine.getWorldsByRealm('expression').map(x => x.id)).toEqual(['e1']);
  });

  it('returns empty for realm with no worlds', () => {
    expect(engine.getWorldsByRealm('crossroads')).toHaveLength(0);
  });
});

describe('getThreadwayNeighbors', () => {
  const deps = makeDeps([
    w('hub', 'crossroads', { connections: ['a', 'b'] }),
    w('a', 'discovery', { connections: ['hub'] }),
    w('b', 'expression', { connections: ['hub'] }),
  ]);
  const engine = createWorldsEngine(deps);

  it('returns neighbor world objects', () => {
    const ids = engine.getThreadwayNeighbors('hub').map(x => x.id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('returns only neighbors that exist in the registry', () => {
    const deps2 = makeDeps([w('c', 'discovery', { connections: ['ghost-world'] })]);
    const eng2 = createWorldsEngine(deps2);
    expect(eng2.getThreadwayNeighbors('c')).toHaveLength(0);
  });

  it('returns empty for unknown world', () => {
    expect(engine.getThreadwayNeighbors('missing')).toHaveLength(0);
  });

  it('returns neighbors for world with single connection', () => {
    expect(engine.getThreadwayNeighbors('a')).toHaveLength(1);
  });
});

describe('getWorldsContainingEntry', () => {
  const deps = makeDeps([
    w('world-1', 'discovery', { entryIds: ['e1', 'e2'] }),
    w('world-2', 'discovery', { entryIds: ['e2', 'e3'] }),
    w('world-3', 'exchange', { entryIds: [] }),
  ]);
  const engine = createWorldsEngine(deps);

  it('returns worlds that include the entry', () => {
    const ids = engine.getWorldsContainingEntry('e2').map(x => x.id);
    expect(ids).toEqual(['world-1', 'world-2']);
  });

  it('returns single world when entry is unique', () => {
    expect(engine.getWorldsContainingEntry('e1').map(x => x.id)).toEqual(['world-1']);
  });

  it('returns empty for unknown entry', () => {
    expect(engine.getWorldsContainingEntry('no-entry')).toHaveLength(0);
  });
});

describe('computeFadingStage', () => {
  it('returns radiant for luminance >= 0.8', () => {
    expect(computeFadingStage(1.0)).toBe('radiant');
    expect(computeFadingStage(0.8)).toBe('radiant');
  });

  it('returns glowing for luminance in [0.6, 0.8)', () => {
    expect(computeFadingStage(0.79)).toBe('glowing');
    expect(computeFadingStage(0.6)).toBe('glowing');
  });

  it('returns dimming for luminance in [0.4, 0.6)', () => {
    expect(computeFadingStage(0.59)).toBe('dimming');
    expect(computeFadingStage(0.4)).toBe('dimming');
  });

  it('returns fading for luminance in [0.2, 0.4)', () => {
    expect(computeFadingStage(0.39)).toBe('fading');
    expect(computeFadingStage(0.2)).toBe('fading');
  });

  it('returns deep_fade for luminance < 0.2', () => {
    expect(computeFadingStage(0.19)).toBe('deep_fade');
    expect(computeFadingStage(0.0)).toBe('deep_fade');
  });

  it('engine.computeFadingStage delegates to the pure function', () => {
    const engine = createWorldsEngine(makeDeps([]));
    expect(engine.computeFadingStage(0.9)).toBe('radiant');
    expect(engine.computeFadingStage(0.1)).toBe('deep_fade');
  });
});

describe('getWorldsNeedingRestoration', () => {
  const deps = makeDeps([
    w('w1', 'discovery'),
    w('w2', 'discovery'),
    w('w3', 'expression'),
  ]);
  const engine = createWorldsEngine(deps);

  it('returns worlds below threshold when luminance is set', () => {
    const map = new Map([['w1', 0.9], ['w2', 0.3], ['w3', 0.5]]);
    const ids = engine.getWorldsNeedingRestoration(map, 0.5).map(x => x.id);
    expect(ids).toEqual(['w2']);
  });

  it('treats missing map entries as luminance 0', () => {
    const ids = engine.getWorldsNeedingRestoration(new Map(), 0.5).map(x => x.id);
    expect(ids).toEqual(['w1', 'w2', 'w3']);
  });

  it('returns empty when all worlds meet threshold', () => {
    const map = new Map([['w1', 1.0], ['w2', 0.8], ['w3', 0.6]]);
    expect(engine.getWorldsNeedingRestoration(map, 0.5)).toHaveLength(0);
  });
});

describe('getStats', () => {
  const deps = makeDeps([
    w('d1', 'discovery'),
    w('d2', 'discovery'),
    w('e1', 'expression'),
    w('ex1', 'exchange'),
    w('ex2', 'exchange'),
    w('c1', 'crossroads'),
  ]);
  const stats = createWorldsEngine(deps).getStats();

  it('counts total worlds', () => {
    expect(stats.totalWorlds).toBe(6);
  });

  it('counts discovery worlds', () => {
    expect(stats.worldsByRealm.discovery).toBe(2);
  });

  it('counts expression worlds', () => {
    expect(stats.worldsByRealm.expression).toBe(1);
  });

  it('counts exchange worlds', () => {
    expect(stats.worldsByRealm.exchange).toBe(2);
  });

  it('counts crossroads worlds', () => {
    expect(stats.worldsByRealm.crossroads).toBe(1);
  });
});
