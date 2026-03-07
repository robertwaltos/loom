import { describe, it, expect } from 'vitest';
import {
  createNpcTierRegistry,
  TIER_CONFIGS,
  tierRequiresChronicle,
  tierIsEconomicParticipant,
  tierCanMigrate,
  aiBackendForTier,
} from '../npc-tiers.js';
import type { NpcTier } from '../npc-tiers.js';

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

function createTestClock(initialDays = 0) {
  let time = initialDays * US_PER_DAY;
  return {
    nowMicroseconds: () => time,
    advanceDays(days: number) { time += days * US_PER_DAY; },
  };
}

function createTestRegistry(initialDays = 0) {
  const clock = createTestClock(initialDays);
  const registry = createNpcTierRegistry({ clock });
  return { registry, clock };
}

// ─── Tier Config Constants ──────────────────────────────────────────

describe('NPC tier config constants', () => {
  it('tier 1 is Crowd Agent with mass entity', () => {
    const cfg = TIER_CONFIGS[1];
    expect(cfg.name).toBe('Crowd Agent');
    expect(cfg.typicalCountPerWorld).toBe(100_000);
    expect(cfg.aiBackend).toBe('mass_entity');
    expect(cfg.memoryModel).toBe('none');
    expect(cfg.hasChronicleIdentity).toBe(false);
    expect(cfg.isEconomicParticipant).toBe(false);
    expect(cfg.usesMassEntity).toBe(true);
  });

  it('tier 2 is Inhabitant with behavior trees', () => {
    const cfg = TIER_CONFIGS[2];
    expect(cfg.name).toBe('Inhabitant');
    expect(cfg.typicalCountPerWorld).toBe(10_000);
    expect(cfg.aiBackend).toBe('behavior_tree');
    expect(cfg.memoryModel).toBe('rolling_90d');
    expect(cfg.hasChronicleIdentity).toBe(false);
    expect(cfg.isEconomicParticipant).toBe(false);
  });

  it('tier 3 is Notable Agent with LLM Haiku', () => {
    const cfg = TIER_CONFIGS[3];
    expect(cfg.name).toBe('Notable Agent');
    expect(cfg.typicalCountPerWorld).toBe(1_000);
    expect(cfg.aiBackend).toBe('llm_haiku');
    expect(cfg.memoryModel).toBe('permanent');
    expect(cfg.hasChronicleIdentity).toBe(true);
    expect(cfg.isEconomicParticipant).toBe(true);
  });

  it('tier 4 is Architect Agent with LLM Opus', () => {
    const cfg = TIER_CONFIGS[4];
    expect(cfg.name).toBe("Architect's Agent");
    expect(cfg.globalCap).toBe(50);
    expect(cfg.typicalCountPerWorld).toBeNull();
    expect(cfg.aiBackend).toBe('llm_opus');
    expect(cfg.memoryModel).toBe('permanent_universe');
    expect(cfg.canMigrateWorlds).toBe(true);
  });
});

// ─── Classification ─────────────────────────────────────────────────

describe('NPC tier classification', () => {
  it('classifies a tier 1 NPC', () => {
    const { registry } = createTestRegistry();
    const npc = registry.classify({
      npcId: 'crowd-001',
      worldId: 'earth',
      tier: 1,
    });
    expect(npc.npcId).toBe('crowd-001');
    expect(npc.tier).toBe(1);
    expect(npc.name).toBeNull();
    expect(npc.dynastyId).toBeNull();
  });

  it('classifies a tier 3 NPC with name', () => {
    const { registry } = createTestRegistry();
    const npc = registry.classify({
      npcId: 'notable-001',
      worldId: 'earth',
      tier: 3,
      name: 'Elder Kaisa',
    });
    expect(npc.name).toBe('Elder Kaisa');
    expect(npc.tier).toBe(3);
  });

  it('rejects tier 3 NPC without name', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.classify({
      npcId: 'notable-bad',
      worldId: 'earth',
      tier: 3,
    })).toThrow('require a name');
  });

  it('rejects tier 4 NPC without name', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.classify({
      npcId: 'architect-bad',
      worldId: 'earth',
      tier: 4,
    })).toThrow('require a name');
  });

  it('rejects duplicate classification', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'npc-1', worldId: 'earth', tier: 1 });
    expect(() => registry.classify({
      npcId: 'npc-1', worldId: 'earth', tier: 1,
    })).toThrow('already classified');
  });

  it('assigns dynasty to NPC', () => {
    const { registry } = createTestRegistry();
    const npc = registry.classify({
      npcId: 'notable-002',
      worldId: 'earth',
      tier: 3,
      name: 'Merchant Kael',
      dynastyId: 'dynasty-npc-001',
    });
    expect(npc.dynastyId).toBe('dynasty-npc-001');
  });
});

// ─── Promotion ──────────────────────────────────────────────────────

describe('NPC tier promotion', () => {
  it('promotes tier 1 to tier 2', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'npc-1', worldId: 'earth', tier: 1 });
    const promoted = registry.promote('npc-1', 2);
    expect(promoted.tier).toBe(2);
  });

  it('promotes tier 2 to tier 3', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'npc-1', worldId: 'earth', tier: 2 });
    const promoted = registry.promote('npc-1', 3);
    expect(promoted.tier).toBe(3);
  });

  it('rejects demotion', () => {
    const { registry } = createTestRegistry();
    registry.classify({
      npcId: 'notable-1', worldId: 'earth', tier: 3, name: 'Test',
    });
    expect(() => registry.promote('notable-1', 2)).toThrow('Cannot demote');
  });

  it('rejects same-tier promotion', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'npc-1', worldId: 'earth', tier: 2 });
    expect(() => registry.promote('npc-1', 2)).toThrow('Cannot demote');
  });

  it('throws for unknown NPC', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.promote('nope', 3)).toThrow('not found');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('NPC tier queries', () => {
  it('gets classification by id', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'npc-1', worldId: 'earth', tier: 1 });
    const result = registry.getClassification('npc-1');
    expect(result.tier).toBe(1);
  });

  it('returns undefined for unknown on tryGet', () => {
    const { registry } = createTestRegistry();
    expect(registry.tryGetClassification('nope')).toBeUndefined();
  });

  it('lists by world', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'e1', worldId: 'earth', tier: 1 });
    registry.classify({ npcId: 'e2', worldId: 'earth', tier: 2 });
    registry.classify({ npcId: 'm1', worldId: 'mars', tier: 1 });
    expect(registry.listByWorld('earth')).toHaveLength(2);
    expect(registry.listByWorld('mars')).toHaveLength(1);
  });

  it('lists by tier', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'a', worldId: 'earth', tier: 1 });
    registry.classify({ npcId: 'b', worldId: 'earth', tier: 1 });
    registry.classify({ npcId: 'c', worldId: 'mars', tier: 2 });
    expect(registry.listByTier(1)).toHaveLength(2);
    expect(registry.listByTier(2)).toHaveLength(1);
  });

  it('counts by world and tier', () => {
    const { registry } = createTestRegistry();
    registry.classify({ npcId: 'a', worldId: 'earth', tier: 1 });
    registry.classify({ npcId: 'b', worldId: 'earth', tier: 1 });
    registry.classify({ npcId: 'c', worldId: 'earth', tier: 2 });
    expect(registry.countByWorldAndTier('earth', 1)).toBe(2);
    expect(registry.countByWorldAndTier('earth', 2)).toBe(1);
    expect(registry.countByWorldAndTier('mars', 1)).toBe(0);
  });

  it('counts total classifications', () => {
    const { registry } = createTestRegistry();
    expect(registry.count()).toBe(0);
    registry.classify({ npcId: 'a', worldId: 'earth', tier: 1 });
    expect(registry.count()).toBe(1);
  });
});

// ─── Pure Tier Query Functions ──────────────────────────────────────

describe('NPC tier pure query functions', () => {
  it('tierRequiresChronicle is true for 3 and 4', () => {
    expect(tierRequiresChronicle(1)).toBe(false);
    expect(tierRequiresChronicle(2)).toBe(false);
    expect(tierRequiresChronicle(3)).toBe(true);
    expect(tierRequiresChronicle(4)).toBe(true);
  });

  it('tierIsEconomicParticipant is true for 3 and 4', () => {
    expect(tierIsEconomicParticipant(1)).toBe(false);
    expect(tierIsEconomicParticipant(2)).toBe(false);
    expect(tierIsEconomicParticipant(3)).toBe(true);
    expect(tierIsEconomicParticipant(4)).toBe(true);
  });

  it('tierCanMigrate is true only for tier 4', () => {
    expect(tierCanMigrate(1)).toBe(false);
    expect(tierCanMigrate(2)).toBe(false);
    expect(tierCanMigrate(3)).toBe(false);
    expect(tierCanMigrate(4)).toBe(true);
  });

  it('aiBackendForTier returns correct backend', () => {
    expect(aiBackendForTier(1)).toBe('mass_entity');
    expect(aiBackendForTier(2)).toBe('behavior_tree');
    expect(aiBackendForTier(3)).toBe('llm_haiku');
    expect(aiBackendForTier(4)).toBe('llm_opus');
  });
});

// ─── Tier Ordering Invariants ───────────────────────────────────────

describe('NPC tier ordering invariants', () => {
  const tiers: ReadonlyArray<NpcTier> = [1, 2, 3, 4];

  it('chronicle identity only at tier 3+', () => {
    for (const tier of tiers) {
      const cfg = TIER_CONFIGS[tier];
      if (tier < 3) expect(cfg.hasChronicleIdentity).toBe(false);
      else expect(cfg.hasChronicleIdentity).toBe(true);
    }
  });

  it('economic participation only at tier 3+', () => {
    for (const tier of tiers) {
      const cfg = TIER_CONFIGS[tier];
      if (tier < 3) expect(cfg.isEconomicParticipant).toBe(false);
      else expect(cfg.isEconomicParticipant).toBe(true);
    }
  });

  it('only tier 1 uses mass entity framework', () => {
    expect(TIER_CONFIGS[1].usesMassEntity).toBe(true);
    expect(TIER_CONFIGS[2].usesMassEntity).toBe(false);
    expect(TIER_CONFIGS[3].usesMassEntity).toBe(false);
    expect(TIER_CONFIGS[4].usesMassEntity).toBe(false);
  });
});
