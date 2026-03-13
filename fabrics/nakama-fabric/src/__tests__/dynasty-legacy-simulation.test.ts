/**
 * Dynasty Legacy Engine - Simulation Tests
 *
 * Covers generational creation, succession, heirloom lifecycle,
 * quest flow, chronicle generation, and guard/error behavior.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDynastyLegacyEngine,
  LEGACY_TRAIT_CATEGORIES,
  SUCCESSION_RULES,
  QUEST_TRIGGERS,
  type DynastyLegacyDeps,
  type LegacyCharacter,
  type Heirloom,
  type LegacyQuest,
  type DynastyChronicle,
  type HeritageBuilding,
  type LegacyTrait,
} from '../dynasty-legacy.js';

interface MemoryStore {
  readonly characters: Map<string, LegacyCharacter>;
  readonly heirlooms: Map<string, Heirloom>;
  readonly quests: Map<string, LegacyQuest>;
  readonly chronicles: Map<string, DynastyChronicle>;
  readonly buildings: Map<string, HeritageBuilding>;
}

function makeStore() {
  const mem: MemoryStore = {
    characters: new Map(),
    heirlooms: new Map(),
    quests: new Map(),
    chronicles: new Map(),
    buildings: new Map(),
  };

  const store: DynastyLegacyDeps['store'] = {
    saveCharacter: async (character) => {
      mem.characters.set(character.id, character);
    },
    getCharacter: async (characterId) => mem.characters.get(characterId),
    getCharactersByDynasty: async (dynastyId) =>
      [...mem.characters.values()].filter((character) => character.dynastyId === dynastyId),
    saveHeirloom: async (heirloom) => {
      mem.heirlooms.set(heirloom.id, heirloom);
    },
    getHeirloom: async (heirloomId) => mem.heirlooms.get(heirloomId),
    getHeirloomsByDynasty: async (dynastyId) =>
      [...mem.heirlooms.values()].filter((heirloom) => heirloom.dynastyId === dynastyId),
    saveLegacyQuest: async (quest) => {
      mem.quests.set(quest.id, quest);
    },
    getLegacyQuests: async (dynastyId) => {
      if (dynastyId.length === 0) {
        return [...mem.quests.values()];
      }
      return [...mem.quests.values()].filter((quest) => quest.dynastyId === dynastyId);
    },
    saveChronicle: async (chronicle) => {
      mem.chronicles.set(chronicle.dynastyId, chronicle);
    },
    getChronicle: async (dynastyId) => mem.chronicles.get(dynastyId),
    saveHeritageBuilding: async (building) => {
      mem.buildings.set(building.id, building);
    },
    getHeritageBuildings: async (dynastyId) =>
      [...mem.buildings.values()].filter((building) => building.dynastyId === dynastyId),
  };

  return { mem, store };
}

function makeHarness() {
  const { mem, store } = makeStore();
  let now = 1_000_000n;
  let idCounter = 0;
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const emit = vi.fn();

  const deps: DynastyLegacyDeps = {
    clock: { now: () => now },
    ids: { next: () => `legacy-${++idCounter}` },
    log: { info, warn, error },
    events: { emit },
    store,
  };

  const engine = createDynastyLegacyEngine(deps, {
    traitInheritanceChance: 1,
    maxLegacyTraits: 3,
    maxAncestralKnowledge: 2,
    heirloomPowerGrowth: 0.1,
    maxHeirloomHistory: 3,
  });

  return {
    engine,
    mem,
    info,
    warn,
    error,
    emit,
    tick: (delta: bigint) => {
      now += delta;
    },
  };
}

function makeTrait(id: string, strength: number): LegacyTrait {
  return {
    id,
    name: `Trait-${id}`,
    category: 'personality',
    description: 'Inherited trait',
    strength,
    originCharacterId: 'origin',
    generationsActive: 1,
    mutated: false,
  };
}

describe('DynastyLegacyEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports non-empty category/rule/trigger constants', () => {
    expect(LEGACY_TRAIT_CATEGORIES.length).toBeGreaterThan(0);
    expect(SUCCESSION_RULES.length).toBeGreaterThan(0);
    expect(QUEST_TRIGGERS.length).toBeGreaterThan(0);
  });

  it('creates a first-generation character without parent inheritance', async () => {
    const { engine, mem, emit } = makeHarness();

    const created = await engine.createCharacter('dyn-1', 'Ari', 101);

    expect(created.generation).toBe(1);
    expect(created.reputation).toBe(0);
    expect(created.traits).toHaveLength(0);
    expect(mem.characters.get(created.id)?.name).toBe('Ari');
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'legacy.character-created' }),
    );
  });

  it('creates a child with inherited traits and locked ancestral knowledge', async () => {
    const { engine, mem } = makeHarness();
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValue(0.05);

    const founder = await engine.createCharacter('dyn-2', 'Founder', 100);
    const seededFounder: LegacyCharacter = {
      ...founder,
      reputation: 100,
      traits: [makeTrait('t1', 7), makeTrait('t2', 6)],
      ancestralKnowledge: [
        {
          type: 'recipe',
          name: 'Stone Bread',
          description: 'Ancient method',
          discoveredBy: founder.id,
          discoveredYear: 101,
          unlocked: true,
        },
      ],
    };
    mem.characters.set(founder.id, seededFounder);

    const child = await engine.createCharacter('dyn-2', 'Heir', 120, founder.id);

    expect(child.generation).toBe(2);
    expect(child.traits.length).toBeGreaterThan(0);
    expect(child.ancestralKnowledge[0]?.unlocked).toBe(false);
    expect(child.reputation).toBeGreaterThan(100);
  });

  it('designates an explicit heir for a character', async () => {
    const { engine, mem } = makeHarness();
    const char = await engine.createCharacter('dyn-3', 'Regent', 200);

    await engine.designateHeir(char.id, 'legacy-heir');

    expect(mem.characters.get(char.id)?.heirId).toBe('legacy-heir');
  });

  it('throws when designating heir for a missing character', async () => {
    const { engine } = makeHarness();
    await expect(engine.designateHeir('missing', 'heir')).rejects.toThrow('Character missing not found');
  });

  it('processes succession using explicitly designated heir', async () => {
    const { engine, mem, emit } = makeHarness();
    vi.spyOn(Math, 'random').mockReturnValue(0.05);

    const ruler = await engine.createCharacter('dyn-4', 'Ruler', 300);
    const heir = await engine.createCharacter('dyn-4', 'Heir', 320, ruler.id);

    const seededRuler: LegacyCharacter = {
      ...ruler,
      heirId: heir.id,
      reputation: 200,
      traits: [makeTrait('trait-1', 5)],
      ancestralKnowledge: [
        {
          type: 'secret',
          name: 'Vault Route',
          description: 'Hidden passage',
          discoveredBy: ruler.id,
          discoveredYear: 333,
          unlocked: false,
        },
      ],
    };
    mem.characters.set(ruler.id, seededRuler);

    const sword = await engine.createHeirloom(
      'dyn-4',
      'First Blade',
      'Dynasty weapon',
      'weapon',
      { attack: 10 },
      305,
      ruler.id,
      'Ruler',
    );
    mem.heirlooms.set(sword.id, { ...sword, currentOwnerId: ruler.id, currentStats: { attack: 10 } });

    const result = await engine.processSuccession(ruler.id, 360);

    expect(result.heirId).toBe(heir.id);
    expect(result.inheritedTraits.length).toBeGreaterThan(0);
    expect(result.inheritedHeirlooms).toContain(sword.id);
    expect(result.knowledgeUnlocked).toContain('Vault Route');
    expect(result.reputationCarried).toBeGreaterThan(200);
    expect(mem.characters.get(ruler.id)?.alive).toBe(false);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'legacy.succession-processed' }));
  });

  it('selects a sibling candidate when no explicit heir is set', async () => {
    const { engine, mem } = makeHarness();

    const parent = await engine.createCharacter('dyn-5', 'Parent', 400);
    const deceased = await engine.createCharacter('dyn-5', 'Deceased', 420, parent.id);
    const sibling = await engine.createCharacter('dyn-5', 'Sibling', 421, parent.id);

    mem.characters.set(deceased.id, { ...deceased, reputation: 12 });
    mem.characters.set(sibling.id, { ...sibling, alive: true });

    const result = await engine.processSuccession(deceased.id, 470);
    expect(result.heirId).toBe(sibling.id);
  });

  it('creates a new heir when no designated heir or sibling candidate exists', async () => {
    const { engine } = makeHarness();

    const ruler = await engine.createCharacter('dyn-6', 'Solo', 500);
    const result = await engine.processSuccession(ruler.id, 560);

    expect(result.heirId).toContain('legacy-');
  });

  it('throws when processing succession for a missing character', async () => {
    const { engine } = makeHarness();
    await expect(engine.processSuccession('missing', 1)).rejects.toThrow('Character missing not found');
  });

  it('throws when processing succession for an already-dead character', async () => {
    const { engine, mem } = makeHarness();
    const char = await engine.createCharacter('dyn-7', 'Fallen', 100);
    mem.characters.set(char.id, { ...char, alive: false, deathYear: 130 });

    await expect(engine.processSuccession(char.id, 131)).rejects.toThrow('already dead');
  });

  it('creates heirloom with creator event and default ownership state', async () => {
    const { engine, mem, emit } = makeHarness();
    const creator = await engine.createCharacter('dyn-8', 'Smith', 200);

    const heirloom = await engine.createHeirloom(
      'dyn-8',
      'Founder Ring',
      'Ceremonial ring',
      'accessory',
      { prestige: 3 },
      205,
      creator.id,
      creator.name,
    );

    expect(heirloom.history).toHaveLength(1);
    expect(heirloom.currentOwnerId).toBe(creator.id);
    expect(mem.heirlooms.get(heirloom.id)?.name).toBe('Founder Ring');
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'legacy.heirloom-created' }));
  });

  it('records heirloom events with stat deltas, history cap, and power growth', async () => {
    const { engine } = makeHarness();
    const creator = await engine.createCharacter('dyn-9', 'Crafter', 200);
    const heirloom = await engine.createHeirloom(
      'dyn-9',
      'Anvil Hammer',
      'Forging tool',
      'tool',
      { craft: 5 },
      210,
      creator.id,
      creator.name,
    );

    const afterOne = await engine.recordHeirloomEvent(heirloom.id, 220, 'Battle tested', creator.id, creator.name, {
      craft: 2,
    });
    const afterTwo = await engine.recordHeirloomEvent(heirloom.id, 221, 'Honed edge', creator.id, creator.name);
    const afterThree = await engine.recordHeirloomEvent(heirloom.id, 222, 'Polished', creator.id, creator.name);

    expect(afterOne.currentStats.craft).toBe(7);
    expect(afterOne.powerLevel).toBeGreaterThan(heirloom.powerLevel);
    expect(afterThree.history).toHaveLength(3);
    expect(afterThree.history[0]?.year).toBe(220);
    expect(afterTwo.id).toBe(heirloom.id);
  });

  it('throws when recording heirloom event for unknown heirloom', async () => {
    const { engine } = makeHarness();
    await expect(engine.recordHeirloomEvent('unknown', 1, 'x', 'c', 'n')).rejects.toThrow('Heirloom unknown not found');
  });

  it('transfers heirloom ownership to a new character', async () => {
    const { engine } = makeHarness();
    const creator = await engine.createCharacter('dyn-10', 'Founder', 100);
    const heirloom = await engine.createHeirloom(
      'dyn-10',
      'Banner',
      'Dynasty banner',
      'banner',
      { morale: 4 },
      110,
      creator.id,
      creator.name,
    );

    const transferred = await engine.transferHeirloom(heirloom.id, 'new-owner');
    expect(transferred.currentOwnerId).toBe('new-owner');
  });

  it('triggers and completes legacy quests with event emission', async () => {
    const { engine, emit } = makeHarness();

    const quest = await engine.triggerLegacyQuest(
      'dyn-11',
      'treasure',
      'Find the Hidden Vault',
      'Recover ancestral gold',
      'origin-1',
      'Ancestor',
      250,
      { kalon: 500, reputationBonus: 3 },
    );

    expect(quest.active).toBe(true);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'legacy.quest-triggered' }));

    const completed = await engine.completeLegacyQuest(quest.id, 'legacy-hero', 300);
    expect(completed.active).toBe(false);
    expect(completed.completedBy).toBe('legacy-hero');
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'legacy.quest-completed' }));
  });

  it('rejects completing unknown or already-completed legacy quests', async () => {
    const { engine } = makeHarness();

    await expect(engine.completeLegacyQuest('missing', 'x', 1)).rejects.toThrow('Legacy quest missing not found');

    const created = await engine.triggerLegacyQuest(
      'dyn-12',
      'oath',
      'Keep the Oath',
      'Honor the ancestor vow',
      'o1',
      'Ancestor',
      100,
      { reputationBonus: 2 },
    );
    await engine.completeLegacyQuest(created.id, 'hero', 111);

    await expect(engine.completeLegacyQuest(created.id, 'hero', 112)).rejects.toThrow('already completed');
  });

  it('adds ancestral knowledge and enforces configured maximum', async () => {
    const { engine, mem, warn } = makeHarness();
    const char = await engine.createCharacter('dyn-13', 'Scholar', 100);

    await engine.addAncestralKnowledge(char.id, {
      type: 'map',
      name: 'North Pass',
      description: 'Mountain route',
      discoveredBy: char.id,
      discoveredYear: 120,
    });
    await engine.addAncestralKnowledge(char.id, {
      type: 'technique',
      name: 'Silent Forge',
      description: 'Noise-free forging',
      discoveredBy: char.id,
      discoveredYear: 121,
    });
    await engine.addAncestralKnowledge(char.id, {
      type: 'secret',
      name: 'Should Not Add',
      description: 'Over cap',
      discoveredBy: char.id,
      discoveredYear: 122,
    });

    const updated = mem.characters.get(char.id);
    expect(updated?.ancestralKnowledge).toHaveLength(2);
    expect(updated?.ancestralKnowledge[0]?.unlocked).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('builds chronicle in birth-year order and emits update event', async () => {
    const { engine, tick, emit } = makeHarness();
    await engine.createCharacter('dyn-14', 'Second', 300);
    await engine.createCharacter('dyn-14', 'First', 200);
    tick(50n);

    const chronicle = await engine.buildChronicle('dyn-14', 'House Chronicle');

    expect(chronicle.chapters).toHaveLength(2);
    expect(chronicle.chapters[0]?.characterName).toBe('First');
    expect(chronicle.foundingYear).toBe(200);
    expect(chronicle.lastUpdated).toBe(1_000_050n);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'legacy.chronicle-updated' }));
  });

  it('registers heritage building with default condition and generations', async () => {
    const { engine, mem, emit } = makeHarness();

    const building = await engine.registerHeritageBuilding(
      'dyn-15',
      'Stone Keep',
      'fortress',
      410,
      'legacy-builder',
      { defense: 12 },
    );

    expect(building.condition).toBe(100);
    expect(building.generationsStanding).toBe(1);
    expect(mem.buildings.get(building.id)?.name).toBe('Stone Keep');
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'legacy.heritage-building-registered' }));
  });

  it('returns zeroed aggregate stats placeholder', async () => {
    const { engine } = makeHarness();
    const stats = await engine.getStats();

    expect(stats).toEqual({
      totalDynasties: 0,
      averageGenerations: 0,
      totalHeirlooms: 0,
      totalLegacyQuests: 0,
      activeQuests: 0,
      oldestDynastyYears: 0,
    });
  });
});
