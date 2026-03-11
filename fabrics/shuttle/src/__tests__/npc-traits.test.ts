import { describe, it, expect } from 'vitest';
import { createTraitSystem } from '../npc-traits.js';
import type { TraitSystemDeps } from '../npc-traits.js';

function makeDeps(): TraitSystemDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'trait-' + String(++idCounter) },
  };
}

describe('TraitSystem — assign and retrieve', () => {
  it('assigns a trait', () => {
    const sys = createTraitSystem(makeDeps());
    const trait = sys.assign({
      npcId: 'npc-1',
      name: 'courageous',
      category: 'temperament',
      intensity: 0.8,
    });
    expect(trait.traitId).toBe('trait-1');
    expect(trait.name).toBe('courageous');
    expect(trait.intensity).toBe(0.8);
  });

  it('clamps intensity to [0,1]', () => {
    const sys = createTraitSystem(makeDeps());
    const over = sys.assign({ npcId: 'npc-1', name: 'a', category: 'intellect', intensity: 5 });
    const under = sys.assign({ npcId: 'npc-1', name: 'b', category: 'intellect', intensity: -2 });
    expect(over.intensity).toBe(1);
    expect(under.intensity).toBe(0);
  });

  it('gets profile for npc', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'npc-1', name: 'brave', category: 'temperament', intensity: 0.7 });
    sys.assign({ npcId: 'npc-1', name: 'clever', category: 'intellect', intensity: 0.9 });
    const profile = sys.getProfile('npc-1');
    expect(profile.traits).toHaveLength(2);
    expect(profile.dominantCategory).toBe('intellect');
  });

  it('returns empty profile for unknown npc', () => {
    const sys = createTraitSystem(makeDeps());
    const profile = sys.getProfile('missing');
    expect(profile.traits).toHaveLength(0);
    expect(profile.dominantCategory).toBeUndefined();
  });

  it('filters traits by category', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'npc-1', name: 'brave', category: 'temperament', intensity: 0.7 });
    sys.assign({ npcId: 'npc-1', name: 'clever', category: 'intellect', intensity: 0.9 });
    expect(sys.getTraitsByCategory('npc-1', 'temperament')).toHaveLength(1);
  });
});

describe('TraitSystem — remove traits', () => {
  it('removes a trait', () => {
    const sys = createTraitSystem(makeDeps());
    const trait = sys.assign({
      npcId: 'npc-1',
      name: 'brave',
      category: 'temperament',
      intensity: 0.7,
    });
    expect(sys.remove('npc-1', trait.traitId)).toBe(true);
    expect(sys.getProfile('npc-1').traits).toHaveLength(0);
  });

  it('returns false for unknown npc', () => {
    const sys = createTraitSystem(makeDeps());
    expect(sys.remove('missing', 'any')).toBe(false);
  });

  it('returns false for unknown trait', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'npc-1', name: 'brave', category: 'temperament', intensity: 0.7 });
    expect(sys.remove('npc-1', 'wrong-id')).toBe(false);
  });
});

describe('TraitSystem — compatibility', () => {
  it('computes compatibility between npcs', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'npc-1', name: 'brave', category: 'temperament', intensity: 0.7 });
    sys.assign({ npcId: 'npc-2', name: 'bold', category: 'temperament', intensity: 0.6 });
    const compat = sys.compatibility('npc-1', 'npc-2');
    expect(compat.score).toBeGreaterThan(0);
  });

  it('returns zero for unknown npcs', () => {
    const sys = createTraitSystem(makeDeps());
    const compat = sys.compatibility('a', 'b');
    expect(compat.score).toBe(0);
  });
});

describe('TraitSystem — inheritance', () => {
  it('inherits traits from two parents', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'parent-a', name: 'brave', category: 'temperament', intensity: 0.8 });
    sys.assign({ npcId: 'parent-b', name: 'clever', category: 'intellect', intensity: 0.6 });
    const inherited = sys.inherit({
      parentAId: 'parent-a',
      parentBId: 'parent-b',
      childNpcId: 'child-1',
    });
    expect(inherited.length).toBeGreaterThanOrEqual(2);
    const childProfile = sys.getProfile('child-1');
    expect(childProfile.traits).toHaveLength(inherited.length);
  });

  it('averages shared category traits', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'pa', name: 'brave', category: 'temperament', intensity: 1.0 });
    sys.assign({ npcId: 'pb', name: 'calm', category: 'temperament', intensity: 0.5 });
    const inherited = sys.inherit({ parentAId: 'pa', parentBId: 'pb', childNpcId: 'child' });
    const tempTrait = inherited.find((t) => t.category === 'temperament');
    expect(tempTrait?.intensity).toBeCloseTo(0.75);
  });
});

describe('TraitSystem — stats', () => {
  it('starts with zero stats', () => {
    const sys = createTraitSystem(makeDeps());
    const stats = sys.getStats();
    expect(stats.trackedNpcs).toBe(0);
    expect(stats.totalTraits).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const sys = createTraitSystem(makeDeps());
    sys.assign({ npcId: 'npc-1', name: 'brave', category: 'temperament', intensity: 0.7 });
    sys.assign({ npcId: 'npc-1', name: 'clever', category: 'intellect', intensity: 0.9 });
    sys.assign({ npcId: 'npc-2', name: 'strong', category: 'physical', intensity: 0.6 });
    const stats = sys.getStats();
    expect(stats.trackedNpcs).toBe(2);
    expect(stats.totalTraits).toBe(3);
    expect(stats.averageTraitsPerNpc).toBeCloseTo(1.5);
  });
});
