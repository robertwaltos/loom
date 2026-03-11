/**
 * crafting-specialization.test.ts — Unit tests for specialization trees.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpecializationEngine,
  MAX_PRIMARY,
  MAX_SECONDARY,
} from '../crafting-specialization.js';
import type {
  SpecializationEngine,
  SpecializationNode,
  SpecializationDeps,
} from '../crafting-specialization.js';

// ── Test Helpers ─────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  return { nowMicroseconds: () => start };
}

function createDeps(): SpecializationDeps {
  return { clock: mockClock() };
}

function blacksmithNode1(): SpecializationNode {
  return {
    id: 'bs-node-1',
    specId: 'blacksmith',
    tier: 'novice',
    name: 'Basic Forging',
    description: 'Learn basic metalwork techniques',
    prerequisiteNodes: [],
    qualityBonus: 0.05,
    costReduction: 0.02,
    speedBonus: 0.0,
    unlockRecipes: ['recipe-iron-nail'],
  };
}

function blacksmithNode2(): SpecializationNode {
  return {
    id: 'bs-node-2',
    specId: 'blacksmith',
    tier: 'apprentice',
    name: 'Advanced Tempering',
    description: 'Master heat treatment for stronger alloys',
    prerequisiteNodes: ['bs-node-1'],
    qualityBonus: 0.1,
    costReduction: 0.05,
    speedBonus: 0.03,
    unlockRecipes: ['recipe-steel-blade'],
  };
}

function alchemistNode(): SpecializationNode {
  return {
    id: 'alch-node-1',
    specId: 'alchemist',
    tier: 'novice',
    name: 'Basic Distillation',
    description: 'Extract essences from raw materials',
    prerequisiteNodes: [],
    qualityBonus: 0.03,
    costReduction: 0.01,
    speedBonus: 0.05,
    unlockRecipes: ['recipe-minor-potion'],
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('SpecializationEngine — node management', () => {
  let engine: SpecializationEngine;

  beforeEach(() => {
    engine = createSpecializationEngine(createDeps());
  });

  it('registers and retrieves a node', () => {
    engine.registerNode(blacksmithNode1());
    const node = engine.getNode('bs-node-1');
    expect(node).toBeDefined();
    expect(node?.name).toBe('Basic Forging');
  });

  it('returns undefined for unknown node', () => {
    expect(engine.getNode('unknown')).toBeUndefined();
  });

  it('gets nodes for a specialization', () => {
    engine.registerNode(blacksmithNode1());
    engine.registerNode(blacksmithNode2());
    engine.registerNode(alchemistNode());

    const bsNodes = engine.getNodesForSpec('blacksmith');
    expect(bsNodes).toHaveLength(2);

    const alchNodes = engine.getNodesForSpec('alchemist');
    expect(alchNodes).toHaveLength(1);
  });
});

describe('SpecializationEngine — activation', () => {
  let engine: SpecializationEngine;

  beforeEach(() => {
    engine = createSpecializationEngine(createDeps());
  });

  it('activates a primary specialization', () => {
    const result = engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.specId).toBe('blacksmith');
    expect(result.slot).toBe('primary');
    expect(result.tier).toBe('novice');
  });

  it('activates a secondary specialization', () => {
    const result = engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'alchemist',
      slot: 'secondary',
    });
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.slot).toBe('secondary');
  });

  it('prevents duplicate specialization', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    const second = engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'secondary',
    });
    expect(second).toBe('already_specialized');
  });

  it('enforces primary slot limit', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'alchemist',
      slot: 'primary',
    });

    const third = engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'artificer',
      slot: 'primary',
    });
    expect(third).toBe('slot_limit_reached');
  });

  it('enforces secondary slot limit', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'secondary',
    });
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'alchemist',
      slot: 'secondary',
    });
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'artificer',
      slot: 'secondary',
    });

    const fourth = engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'weaver',
      slot: 'secondary',
    });
    expect(fourth).toBe('slot_limit_reached');
  });
});

describe('SpecializationEngine — experience and tiers', () => {
  let engine: SpecializationEngine;

  beforeEach(() => {
    engine = createSpecializationEngine(createDeps());
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
  });

  it('gains experience', () => {
    const result = engine.gainExperience('house-alpha', 'blacksmith', 100);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.experience).toBe(100);
  });

  it('advances tier on experience threshold', () => {
    engine.gainExperience('house-alpha', 'blacksmith', 200);
    const spec = engine.getSpecialization('house-alpha', 'blacksmith');
    expect(spec).toBeDefined();
    expect(spec?.tier).toBe('apprentice');
  });

  it('reaches master tier', () => {
    engine.gainExperience('house-alpha', 'blacksmith', 5000);
    const spec = engine.getSpecialization('house-alpha', 'blacksmith');
    expect(spec?.tier).toBe('master');
  });

  it('reaches grandmaster tier', () => {
    engine.gainExperience('house-alpha', 'blacksmith', 10000);
    const spec = engine.getSpecialization('house-alpha', 'blacksmith');
    expect(spec?.tier).toBe('grandmaster');
  });

  it('returns error for non-specialized dynasty', () => {
    const result = engine.gainExperience('house-alpha', 'alchemist', 100);
    expect(result).toBe('not_specialized');
  });
});

describe('SpecializationEngine — node unlocking', () => {
  let engine: SpecializationEngine;

  beforeEach(() => {
    engine = createSpecializationEngine(createDeps());
    engine.registerNode(blacksmithNode1());
    engine.registerNode(blacksmithNode2());
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
  });

  it('unlocks a node with no prerequisites', () => {
    const result = engine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'bs-node-1',
    });
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.unlockedNodes.has('bs-node-1')).toBe(true);
  });

  it('blocks node with unmet prerequisites', () => {
    const result = engine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'bs-node-2',
    });
    expect(result).toBe('missing_prerequisites');
  });

  it('unlocks node after prerequisites met', () => {
    engine.unlockNode({ dynastyId: 'house-alpha', specId: 'blacksmith', nodeId: 'bs-node-1' });
    const result = engine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'bs-node-2',
    });
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.unlockedNodes.has('bs-node-2')).toBe(true);
  });

  it('prevents double unlock', () => {
    engine.unlockNode({ dynastyId: 'house-alpha', specId: 'blacksmith', nodeId: 'bs-node-1' });
    const second = engine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'bs-node-1',
    });
    expect(second).toBe('already_unlocked');
  });

  it('returns error for wrong specialization', () => {
    engine.registerNode(alchemistNode());
    const result = engine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'alch-node-1',
    });
    expect(result).toBe('wrong_specialization');
  });

  it('returns error for not specialized', () => {
    const result = engine.unlockNode({
      dynastyId: 'house-beta',
      specId: 'blacksmith',
      nodeId: 'bs-node-1',
    });
    expect(result).toBe('not_specialized');
  });
});

describe('SpecializationEngine — bonus calculation', () => {
  let engine: SpecializationEngine;

  beforeEach(() => {
    engine = createSpecializationEngine(createDeps());
    engine.registerNode(blacksmithNode1());
    engine.registerNode(blacksmithNode2());
  });

  it('returns zero bonuses for non-specialized', () => {
    const bonus = engine.calculateBonus('house-alpha', 'blacksmith');
    expect(bonus.qualityBonus).toBe(0);
    expect(bonus.costReduction).toBe(0);
    expect(bonus.speedBonus).toBe(0);
    expect(bonus.additionalRecipes).toHaveLength(0);
  });

  it('calculates primary slot bonuses at full value', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    engine.unlockNode({ dynastyId: 'house-alpha', specId: 'blacksmith', nodeId: 'bs-node-1' });

    const bonus = engine.calculateBonus('house-alpha', 'blacksmith');
    expect(bonus.qualityBonus).toBeCloseTo(0.05);
    expect(bonus.costReduction).toBeCloseTo(0.02);
    expect(bonus.additionalRecipes).toContain('recipe-iron-nail');
  });

  it('calculates secondary slot bonuses at 50%', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'secondary',
    });
    engine.unlockNode({ dynastyId: 'house-alpha', specId: 'blacksmith', nodeId: 'bs-node-1' });

    const bonus = engine.calculateBonus('house-alpha', 'blacksmith');
    expect(bonus.qualityBonus).toBeCloseTo(0.025);
    expect(bonus.costReduction).toBeCloseTo(0.01);
  });

  it('accumulates bonuses from multiple nodes', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    engine.unlockNode({ dynastyId: 'house-alpha', specId: 'blacksmith', nodeId: 'bs-node-1' });
    engine.unlockNode({ dynastyId: 'house-alpha', specId: 'blacksmith', nodeId: 'bs-node-2' });

    const bonus = engine.calculateBonus('house-alpha', 'blacksmith');
    expect(bonus.qualityBonus).toBeCloseTo(0.15);
    expect(bonus.costReduction).toBeCloseTo(0.07);
    expect(bonus.speedBonus).toBeCloseTo(0.03);
    expect(bonus.additionalRecipes).toHaveLength(2);
  });
});

describe('SpecializationEngine — queries and stats', () => {
  let engine: SpecializationEngine;

  beforeEach(() => {
    engine = createSpecializationEngine(createDeps());
  });

  it('gets all specializations for dynasty', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'alchemist',
      slot: 'secondary',
    });

    const specs = engine.getSpecializations('house-alpha');
    expect(specs).toHaveLength(2);
  });

  it('returns empty for dynasty with no specs', () => {
    expect(engine.getSpecializations('unknown')).toHaveLength(0);
  });

  it('gets single specialization', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    const spec = engine.getSpecialization('house-alpha', 'blacksmith');
    expect(spec).toBeDefined();
    expect(spec?.specId).toBe('blacksmith');
  });

  it('returns undefined for non-existent spec', () => {
    expect(engine.getSpecialization('house-alpha', 'blacksmith')).toBeUndefined();
  });

  it('reports correct stats', () => {
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    engine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'alchemist',
      slot: 'secondary',
    });
    engine.gainExperience('house-alpha', 'blacksmith', 5000);

    const stats = engine.getStats();
    expect(stats.totalSpecializations).toBe(2);
    expect(stats.primaryCount).toBe(1);
    expect(stats.secondaryCount).toBe(1);
    expect(stats.masteryCount).toBe(1);
  });

  it('starts with empty stats', () => {
    const stats = engine.getStats();
    expect(stats.totalSpecializations).toBe(0);
    expect(stats.primaryCount).toBe(0);
    expect(stats.masteryCount).toBe(0);
  });

  it('exports constants', () => {
    expect(MAX_PRIMARY).toBe(2);
    expect(MAX_SECONDARY).toBe(3);
  });
});
