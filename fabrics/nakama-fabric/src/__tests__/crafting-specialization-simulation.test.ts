import { describe, expect, it } from 'vitest';
import { createSpecializationEngine } from '../crafting-specialization.js';

describe('crafting-specialization simulation', () => {
  const make = () => {
    let now = 1_000_000;
    return createSpecializationEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });
  };

  it('simulates progression from novice to expert with gated node unlock sequence', () => {
    const spec = make();

    spec.registerNode({
      id: 'bs-1',
      specId: 'blacksmith',
      tier: 'novice',
      name: 'Forge Basics',
      description: 'start',
      prerequisiteNodes: [],
      qualityBonus: 0.04,
      costReduction: 0.02,
      speedBonus: 0.01,
      unlockRecipes: ['r-iron'],
    });
    spec.registerNode({
      id: 'bs-2',
      specId: 'blacksmith',
      tier: 'apprentice',
      name: 'Steel Discipline',
      description: 'mid',
      prerequisiteNodes: ['bs-1'],
      qualityBonus: 0.08,
      costReduction: 0.03,
      speedBonus: 0.02,
      unlockRecipes: ['r-steel'],
    });

    spec.activateSpecialization({ dynastyId: 'd1', specId: 'blacksmith', slot: 'primary' });
    spec.gainExperience('d1', 'blacksmith', 2_500);

    const earlyUnlock = spec.unlockNode({ dynastyId: 'd1', specId: 'blacksmith', nodeId: 'bs-2' });
    expect(earlyUnlock).toBe('missing_prerequisites');

    spec.unlockNode({ dynastyId: 'd1', specId: 'blacksmith', nodeId: 'bs-1' });
    spec.unlockNode({ dynastyId: 'd1', specId: 'blacksmith', nodeId: 'bs-2' });

    const profile = spec.getSpecialization('d1', 'blacksmith');
    expect(profile?.tier).toBe('expert');

    const bonus = spec.calculateBonus('d1', 'blacksmith');
    expect(bonus.additionalRecipes.sort()).toEqual(['r-iron', 'r-steel']);
    expect(bonus.qualityBonus).toBeCloseTo(0.12, 10);
  });

  it('simulates mixed primary/secondary portfolios and aggregate specialization stats', () => {
    const spec = make();

    spec.activateSpecialization({ dynastyId: 'd1', specId: 'blacksmith', slot: 'primary' });
    spec.activateSpecialization({ dynastyId: 'd1', specId: 'alchemist', slot: 'primary' });
    spec.activateSpecialization({ dynastyId: 'd1', specId: 'weaver', slot: 'secondary' });
    spec.activateSpecialization({ dynastyId: 'd2', specId: 'architect', slot: 'secondary' });

    spec.gainExperience('d1', 'blacksmith', 5_500);
    spec.gainExperience('d1', 'alchemist', 10_500);

    const stats = spec.getStats();
    expect(stats.totalSpecializations).toBe(4);
    expect(stats.primaryCount).toBe(2);
    expect(stats.secondaryCount).toBe(2);
    expect(stats.masteryCount).toBe(2);
  });
});
