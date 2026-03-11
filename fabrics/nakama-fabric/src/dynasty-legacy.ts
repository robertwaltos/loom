/**
 * Dynasty Legacy System — Generational play, inheritance, heirlooms.
 *
 *   - Character death and succession: heir selection, inheritance rules
 *   - Legacy traits: personality/skill traits inherited from ancestors
 *   - Heirloom items: named items gaining history across generations
 *   - Dynasty reputation compound interest over generations
 *   - Ancestral knowledge: forebears' recipes, maps, contacts
 *   - Legacy quests: revenge, treasure, prophecy triggered by ancestor actions
 *   - Dynasty chronicle: auto-generated narrative of dynasty history
 *   - Heritage buildings: estate structures persisting across character generations
 *
 * "The blood remembers what the mind forgets."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface LegacyClockPort {
  readonly now: () => bigint;
}

export interface LegacyIdPort {
  readonly next: () => string;
}

export interface LegacyLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface LegacyEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface LegacyStorePort {
  readonly saveCharacter: (character: LegacyCharacter) => Promise<void>;
  readonly getCharacter: (characterId: string) => Promise<LegacyCharacter | undefined>;
  readonly getCharactersByDynasty: (dynastyId: string) => Promise<readonly LegacyCharacter[]>;
  readonly saveHeirloom: (heirloom: Heirloom) => Promise<void>;
  readonly getHeirloom: (heirloomId: string) => Promise<Heirloom | undefined>;
  readonly getHeirloomsByDynasty: (dynastyId: string) => Promise<readonly Heirloom[]>;
  readonly saveLegacyQuest: (quest: LegacyQuest) => Promise<void>;
  readonly getLegacyQuests: (dynastyId: string) => Promise<readonly LegacyQuest[]>;
  readonly saveChronicle: (chronicle: DynastyChronicle) => Promise<void>;
  readonly getChronicle: (dynastyId: string) => Promise<DynastyChronicle | undefined>;
  readonly saveHeritageBuilding: (building: HeritageBuilding) => Promise<void>;
  readonly getHeritageBuildings: (dynastyId: string) => Promise<readonly HeritageBuilding[]>;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_LEGACY_TRAITS = 5;
const TRAIT_INHERITANCE_CHANCE = 0.6;
const REPUTATION_COMPOUND_RATE = 0.05;
const MAX_HEIRLOOM_HISTORY = 50;
const MAX_ANCESTRAL_KNOWLEDGE = 100;
const HEIRLOOM_POWER_GROWTH = 0.02;

export const LEGACY_TRAIT_CATEGORIES = [
  'personality', 'combat', 'crafting', 'social', 'intellectual', 'physical',
] as const;

export type LegacyTraitCategory = typeof LEGACY_TRAIT_CATEGORIES[number];

export const SUCCESSION_RULES = [
  'primogeniture', 'ultimogeniture', 'elective', 'merit', 'appointment',
] as const;

export type SuccessionRule = typeof SUCCESSION_RULES[number];

export const QUEST_TRIGGERS = [
  'revenge', 'treasure', 'prophecy', 'oath', 'discovery', 'redemption',
] as const;

export type QuestTrigger = typeof QUEST_TRIGGERS[number];

// ─── Types ──────────────────────────────────────────────────────────

export interface LegacyTrait {
  readonly id: string;
  readonly name: string;
  readonly category: LegacyTraitCategory;
  readonly description: string;
  readonly strength: number;
  readonly originCharacterId: string;
  readonly generationsActive: number;
  readonly mutated: boolean;
}

export interface LegacyCharacter {
  readonly id: string;
  readonly dynastyId: string;
  readonly name: string;
  readonly birthYear: number;
  readonly deathYear?: number;
  readonly alive: boolean;
  readonly parentId?: string;
  readonly heirId?: string;
  readonly traits: readonly LegacyTrait[];
  readonly successionRule: SuccessionRule;
  readonly reputation: number;
  readonly generation: number;
  readonly ancestralKnowledge: readonly AncestralKnowledge[];
}

export interface AncestralKnowledge {
  readonly type: 'recipe' | 'map' | 'contact' | 'technique' | 'secret';
  readonly name: string;
  readonly description: string;
  readonly discoveredBy: string;
  readonly discoveredYear: number;
  readonly unlocked: boolean;
}

export interface Heirloom {
  readonly id: string;
  readonly dynastyId: string;
  readonly name: string;
  readonly description: string;
  readonly itemType: string;
  readonly baseStats: Readonly<Record<string, number>>;
  readonly currentStats: Readonly<Record<string, number>>;
  readonly history: readonly HeirloomEvent[];
  readonly currentOwnerId?: string;
  readonly createdYear: number;
  readonly powerLevel: number;
  readonly generationsHeld: number;
}

export interface HeirloomEvent {
  readonly year: number;
  readonly event: string;
  readonly characterId: string;
  readonly characterName: string;
  readonly statChange?: Readonly<Record<string, number>>;
}

export interface LegacyQuest {
  readonly id: string;
  readonly dynastyId: string;
  readonly trigger: QuestTrigger;
  readonly title: string;
  readonly description: string;
  readonly originCharacterId: string;
  readonly originCharacterName: string;
  readonly originYear: number;
  readonly active: boolean;
  readonly assignedTo?: string;
  readonly completedBy?: string;
  readonly completedYear?: number;
  readonly reward: LegacyQuestReward;
}

export interface LegacyQuestReward {
  readonly kalon?: number;
  readonly trait?: LegacyTrait;
  readonly heirloomId?: string;
  readonly reputationBonus?: number;
  readonly knowledgeUnlock?: string;
}

export interface DynastyChronicle {
  readonly dynastyId: string;
  readonly dynastyName: string;
  readonly chapters: readonly ChronicleChapter[];
  readonly totalGenerations: number;
  readonly foundingYear: number;
  readonly lastUpdated: bigint;
}

export interface ChronicleChapter {
  readonly generation: number;
  readonly characterName: string;
  readonly characterId: string;
  readonly reignStart: number;
  readonly reignEnd?: number;
  readonly narrative: string;
  readonly keyEvents: readonly string[];
  readonly legacyScore: number;
}

export interface HeritageBuilding {
  readonly id: string;
  readonly dynastyId: string;
  readonly name: string;
  readonly buildingType: string;
  readonly builtYear: number;
  readonly builtBy: string;
  readonly condition: number;
  readonly upgrades: readonly string[];
  readonly generationsStanding: number;
  readonly bonuses: Readonly<Record<string, number>>;
}

export interface InheritanceResult {
  readonly heirId: string;
  readonly inheritedTraits: readonly LegacyTrait[];
  readonly inheritedHeirlooms: readonly string[];
  readonly reputationCarried: number;
  readonly knowledgeUnlocked: readonly string[];
  readonly legacyQuestsTriggered: readonly string[];
}

export interface LegacyStats {
  readonly totalDynasties: number;
  readonly averageGenerations: number;
  readonly totalHeirlooms: number;
  readonly totalLegacyQuests: number;
  readonly activeQuests: number;
  readonly oldestDynastyYears: number;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface DynastyLegacyDeps {
  readonly clock: LegacyClockPort;
  readonly ids: LegacyIdPort;
  readonly log: LegacyLogPort;
  readonly events: LegacyEventPort;
  readonly store: LegacyStorePort;
}

export interface DynastyLegacyConfig {
  readonly maxLegacyTraits: number;
  readonly traitInheritanceChance: number;
  readonly reputationCompoundRate: number;
  readonly maxHeirloomHistory: number;
  readonly maxAncestralKnowledge: number;
  readonly heirloomPowerGrowth: number;
}

const DEFAULT_CONFIG: DynastyLegacyConfig = {
  maxLegacyTraits: MAX_LEGACY_TRAITS,
  traitInheritanceChance: TRAIT_INHERITANCE_CHANCE,
  reputationCompoundRate: REPUTATION_COMPOUND_RATE,
  maxHeirloomHistory: MAX_HEIRLOOM_HISTORY,
  maxAncestralKnowledge: MAX_ANCESTRAL_KNOWLEDGE,
  heirloomPowerGrowth: HEIRLOOM_POWER_GROWTH,
};

// ─── Engine ─────────────────────────────────────────────────────────

export interface DynastyLegacyEngine {
  /** Create a new character in a dynasty lineage. */
  readonly createCharacter: (
    dynastyId: string,
    name: string,
    birthYear: number,
    parentId?: string,
    successionRule?: SuccessionRule,
  ) => Promise<LegacyCharacter>;

  /** Process character death and succession. */
  readonly processSuccession: (characterId: string, deathYear: number) => Promise<InheritanceResult>;

  /** Select an heir for a living character. */
  readonly designateHeir: (characterId: string, heirId: string) => Promise<void>;

  /** Create a new heirloom item. */
  readonly createHeirloom: (
    dynastyId: string,
    name: string,
    description: string,
    itemType: string,
    baseStats: Readonly<Record<string, number>>,
    createdYear: number,
    creatorId: string,
    creatorName: string,
  ) => Promise<Heirloom>;

  /** Record a notable event on an heirloom. */
  readonly recordHeirloomEvent: (
    heirloomId: string,
    year: number,
    event: string,
    characterId: string,
    characterName: string,
    statChange?: Readonly<Record<string, number>>,
  ) => Promise<Heirloom>;

  /** Transfer an heirloom to a new owner. */
  readonly transferHeirloom: (heirloomId: string, newOwnerId: string) => Promise<Heirloom>;

  /** Trigger a legacy quest from an ancestor's actions. */
  readonly triggerLegacyQuest: (
    dynastyId: string,
    trigger: QuestTrigger,
    title: string,
    description: string,
    originCharacterId: string,
    originCharacterName: string,
    originYear: number,
    reward: LegacyQuestReward,
  ) => Promise<LegacyQuest>;

  /** Complete a legacy quest. */
  readonly completeLegacyQuest: (questId: string, completedBy: string, completedYear: number) => Promise<LegacyQuest>;

  /** Add ancestral knowledge to a character's inheritance. */
  readonly addAncestralKnowledge: (
    characterId: string,
    knowledge: Omit<AncestralKnowledge, 'unlocked'>,
  ) => Promise<void>;

  /** Build or update the dynasty chronicle. */
  readonly buildChronicle: (dynastyId: string, dynastyName: string) => Promise<DynastyChronicle>;

  /** Register a heritage building. */
  readonly registerHeritageBuilding: (
    dynastyId: string,
    name: string,
    buildingType: string,
    builtYear: number,
    builtBy: string,
    bonuses: Readonly<Record<string, number>>,
  ) => Promise<HeritageBuilding>;

  /** Get dynasty legacy stats. */
  readonly getStats: () => Promise<LegacyStats>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createDynastyLegacyEngine(
  deps: DynastyLegacyDeps,
  config?: Partial<DynastyLegacyConfig>,
): DynastyLegacyEngine {
  const cfg: DynastyLegacyConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store } = deps;

  function inheritTraits(parentTraits: readonly LegacyTrait[]): readonly LegacyTrait[] {
    const inherited: LegacyTrait[] = [];
    for (const trait of parentTraits) {
      if (Math.random() < cfg.traitInheritanceChance && inherited.length < cfg.maxLegacyTraits) {
        const mutated = Math.random() < 0.1;
        inherited.push({
          ...trait,
          id: ids.next(),
          strength: mutated
            ? Math.min(10, trait.strength + (Math.random() > 0.5 ? 1 : -1))
            : trait.strength,
          generationsActive: trait.generationsActive + 1,
          mutated,
        });
      }
    }
    return inherited;
  }

  function computeInheritedReputation(
    parentReputation: number,
    generation: number,
  ): number {
    const carried = parentReputation * (1 + cfg.reputationCompoundRate);
    const generationBonus = generation * 0.01;
    return Math.round((carried + carried * generationBonus) * 100) / 100;
  }

  function growHeirloomStats(
    heirloom: Heirloom,
  ): Readonly<Record<string, number>> {
    const grown: Record<string, number> = {};
    for (const [stat, value] of Object.entries(heirloom.currentStats)) {
      grown[stat] = Math.round((value + value * cfg.heirloomPowerGrowth) * 100) / 100;
    }
    return grown;
  }

  const engine: DynastyLegacyEngine = {
    async createCharacter(dynastyId, name, birthYear, parentId, successionRule) {
      let traits: readonly LegacyTrait[] = [];
      let generation = 1;
      let reputation = 0;
      let ancestralKnowledge: readonly AncestralKnowledge[] = [];

      if (parentId) {
        const parent = await store.getCharacter(parentId);
        if (parent) {
          traits = inheritTraits(parent.traits);
          generation = parent.generation + 1;
          reputation = computeInheritedReputation(parent.reputation, generation);
          ancestralKnowledge = parent.ancestralKnowledge
            .slice(0, cfg.maxAncestralKnowledge)
            .map((k) => ({ ...k, unlocked: false }));
        }
      }

      const character: LegacyCharacter = {
        id: ids.next(),
        dynastyId,
        name,
        birthYear,
        alive: true,
        parentId,
        traits,
        successionRule: successionRule ?? 'primogeniture',
        reputation,
        generation,
        ancestralKnowledge,
      };

      await store.saveCharacter(character);

      log.info('Legacy character created', {
        id: character.id,
        dynastyId,
        name,
        generation,
        inheritedTraits: traits.length,
      });

      events.emit({
        type: 'legacy.character-created',
        payload: { characterId: character.id, dynastyId, generation },
      } as LoomEvent);

      return character;
    },

    async processSuccession(characterId, deathYear) {
      const character = await store.getCharacter(characterId);
      if (!character) {
        throw new Error(`Character ${characterId} not found`);
      }
      if (!character.alive) {
        throw new Error(`Character ${characterId} already dead`);
      }

      const updated: LegacyCharacter = { ...character, alive: false, deathYear };
      await store.saveCharacter(updated);

      let heirId = character.heirId;
      if (!heirId) {
        const siblings = await store.getCharactersByDynasty(character.dynastyId);
        const candidates = siblings.filter(
          (c) => c.alive && c.id !== characterId && c.parentId === character.parentId,
        );
        const firstCandidate = candidates[0];
        heirId = firstCandidate?.id;
      }

      if (!heirId) {
        const newHeir = await engine.createCharacter(
          character.dynastyId,
          `Heir of ${character.name}`,
          deathYear,
          characterId,
          character.successionRule,
        );
        heirId = newHeir.id;
      }

      const heir = await store.getCharacter(heirId);
      if (!heir) {
        throw new Error(`Heir ${heirId} not found after selection`);
      }

      const inheritedTraits = inheritTraits(character.traits);
      const reputationCarried = computeInheritedReputation(character.reputation, heir.generation);

      const heirlooms = await store.getHeirloomsByDynasty(character.dynastyId);
      const inheritedHeirlooms: string[] = [];
      for (const h of heirlooms) {
        if (h.currentOwnerId === characterId) {
          const grownStats = growHeirloomStats(h);
          const transferred: Heirloom = {
            ...h,
            currentOwnerId: heirId,
            currentStats: grownStats,
            generationsHeld: h.generationsHeld + 1,
            powerLevel: h.powerLevel + h.powerLevel * cfg.heirloomPowerGrowth,
          };
          await store.saveHeirloom(transferred);
          inheritedHeirlooms.push(h.id);
        }
      }

      const knowledgeUnlocked: string[] = [];
      for (const k of character.ancestralKnowledge) {
        if (!k.unlocked) {
          knowledgeUnlocked.push(k.name);
        }
      }

      const legacyQuestsTriggered: string[] = [];

      log.info('Succession processed', {
        deceasedId: characterId,
        heirId,
        inheritedTraits: inheritedTraits.length,
        inheritedHeirlooms: inheritedHeirlooms.length,
      });

      events.emit({
        type: 'legacy.succession-processed',
        payload: {
          deceasedId: characterId,
          heirId,
          dynastyId: character.dynastyId,
          generation: heir.generation,
        },
      } as LoomEvent);

      return {
        heirId,
        inheritedTraits,
        inheritedHeirlooms,
        reputationCarried,
        knowledgeUnlocked,
        legacyQuestsTriggered,
      };
    },

    async designateHeir(characterId, heirId) {
      const character = await store.getCharacter(characterId);
      if (!character) {
        throw new Error(`Character ${characterId} not found`);
      }
      const updated: LegacyCharacter = { ...character, heirId };
      await store.saveCharacter(updated);

      log.info('Heir designated', { characterId, heirId });
    },

    async createHeirloom(dynastyId, name, description, itemType, baseStats, createdYear, creatorId, creatorName) {
      const heirloom: Heirloom = {
        id: ids.next(),
        dynastyId,
        name,
        description,
        itemType,
        baseStats,
        currentStats: { ...baseStats },
        history: [{
          year: createdYear,
          event: `Forged by ${creatorName}`,
          characterId: creatorId,
          characterName: creatorName,
        }],
        currentOwnerId: creatorId,
        createdYear,
        powerLevel: 1.0,
        generationsHeld: 1,
      };

      await store.saveHeirloom(heirloom);

      log.info('Heirloom created', {
        id: heirloom.id,
        dynastyId,
        name,
        itemType,
      });

      events.emit({
        type: 'legacy.heirloom-created',
        payload: { heirloomId: heirloom.id, dynastyId, name },
      } as LoomEvent);

      return heirloom;
    },

    async recordHeirloomEvent(heirloomId, year, event, characterId, characterName, statChange) {
      const heirloom = await store.getHeirloom(heirloomId);
      if (!heirloom) {
        throw new Error(`Heirloom ${heirloomId} not found`);
      }

      const newEvent: HeirloomEvent = {
        year,
        event,
        characterId,
        characterName,
        statChange,
      };

      let updatedStats = { ...heirloom.currentStats };
      if (statChange) {
        for (const [stat, delta] of Object.entries(statChange)) {
          const current = updatedStats[stat] ?? 0;
          updatedStats[stat] = current + delta;
        }
      }

      const history = [...heirloom.history, newEvent].slice(-cfg.maxHeirloomHistory);

      const updated: Heirloom = {
        ...heirloom,
        history,
        currentStats: updatedStats,
        powerLevel: heirloom.powerLevel + cfg.heirloomPowerGrowth,
      };

      await store.saveHeirloom(updated);

      log.info('Heirloom event recorded', {
        heirloomId,
        event,
        powerLevel: updated.powerLevel,
      });

      return updated;
    },

    async transferHeirloom(heirloomId, newOwnerId) {
      const heirloom = await store.getHeirloom(heirloomId);
      if (!heirloom) {
        throw new Error(`Heirloom ${heirloomId} not found`);
      }

      const updated: Heirloom = { ...heirloom, currentOwnerId: newOwnerId };
      await store.saveHeirloom(updated);

      log.info('Heirloom transferred', { heirloomId, newOwnerId });
      return updated;
    },

    async triggerLegacyQuest(dynastyId, trigger, title, description, originCharacterId, originCharacterName, originYear, reward) {
      const quest: LegacyQuest = {
        id: ids.next(),
        dynastyId,
        trigger,
        title,
        description,
        originCharacterId,
        originCharacterName,
        originYear,
        active: true,
        reward,
      };

      await store.saveLegacyQuest(quest);

      log.info('Legacy quest triggered', {
        id: quest.id,
        dynastyId,
        trigger,
        title,
      });

      events.emit({
        type: 'legacy.quest-triggered',
        payload: { questId: quest.id, dynastyId, trigger, title },
      } as LoomEvent);

      return quest;
    },

    async completeLegacyQuest(questId, completedBy, completedYear) {
      const quests = await store.getLegacyQuests('');
      let quest: LegacyQuest | undefined;
      for (const q of quests) {
        if (q.id === questId) {
          quest = q;
          break;
        }
      }

      if (!quest) {
        throw new Error(`Legacy quest ${questId} not found`);
      }
      if (!quest.active) {
        throw new Error(`Legacy quest ${questId} already completed`);
      }

      const completed: LegacyQuest = {
        ...quest,
        active: false,
        completedBy,
        completedYear,
      };

      await store.saveLegacyQuest(completed);

      log.info('Legacy quest completed', {
        questId,
        completedBy,
        trigger: quest.trigger,
      });

      events.emit({
        type: 'legacy.quest-completed',
        payload: { questId, dynastyId: quest.dynastyId, completedBy },
      } as LoomEvent);

      return completed;
    },

    async addAncestralKnowledge(characterId, knowledge) {
      const character = await store.getCharacter(characterId);
      if (!character) {
        throw new Error(`Character ${characterId} not found`);
      }

      if (character.ancestralKnowledge.length >= cfg.maxAncestralKnowledge) {
        log.warn('Ancestral knowledge limit reached', { characterId });
        return;
      }

      const entry: AncestralKnowledge = { ...knowledge, unlocked: false };
      const updated: LegacyCharacter = {
        ...character,
        ancestralKnowledge: [...character.ancestralKnowledge, entry],
      };

      await store.saveCharacter(updated);
      log.info('Ancestral knowledge added', { characterId, type: knowledge.type, name: knowledge.name });
    },

    async buildChronicle(dynastyId, dynastyName) {
      const characters = await store.getCharactersByDynasty(dynastyId);
      const sorted = [...characters].sort((a, b) => a.birthYear - b.birthYear);

      const chapters: ChronicleChapter[] = sorted.map((c) => ({
        generation: c.generation,
        characterName: c.name,
        characterId: c.id,
        reignStart: c.birthYear,
        reignEnd: c.deathYear,
        narrative: c.alive
          ? `${c.name} currently leads the dynasty in generation ${c.generation}.`
          : `${c.name} served the dynasty from year ${c.birthYear} to ${c.deathYear ?? 'unknown'}.`,
        keyEvents: c.traits.map((t) => `Inherited trait: ${t.name}`),
        legacyScore: c.reputation,
      }));

      const firstChar = sorted[0];
      const chronicle: DynastyChronicle = {
        dynastyId,
        dynastyName,
        chapters,
        totalGenerations: sorted.length > 0 ? Math.max(...sorted.map((c) => c.generation)) : 0,
        foundingYear: firstChar?.birthYear ?? 0,
        lastUpdated: clock.now(),
      };

      await store.saveChronicle(chronicle);

      log.info('Chronicle built', {
        dynastyId,
        chapters: chapters.length,
        generations: chronicle.totalGenerations,
      });

      events.emit({
        type: 'legacy.chronicle-updated',
        payload: { dynastyId, chapters: chapters.length },
      } as LoomEvent);

      return chronicle;
    },

    async registerHeritageBuilding(dynastyId, name, buildingType, builtYear, builtBy, bonuses) {
      const building: HeritageBuilding = {
        id: ids.next(),
        dynastyId,
        name,
        buildingType,
        builtYear,
        builtBy,
        condition: 100,
        upgrades: [],
        generationsStanding: 1,
        bonuses,
      };

      await store.saveHeritageBuilding(building);

      log.info('Heritage building registered', {
        id: building.id,
        dynastyId,
        name,
        buildingType,
      });

      events.emit({
        type: 'legacy.heritage-building-registered',
        payload: { buildingId: building.id, dynastyId, name },
      } as LoomEvent);

      return building;
    },

    async getStats() {
      return {
        totalDynasties: 0,
        averageGenerations: 0,
        totalHeirlooms: 0,
        totalLegacyQuests: 0,
        activeQuests: 0,
        oldestDynastyYears: 0,
      };
    },
  };

  log.info('Dynasty Legacy engine initialized', {
    maxTraits: cfg.maxLegacyTraits,
    inheritanceChance: cfg.traitInheritanceChance,
    compoundRate: cfg.reputationCompoundRate,
  });

  return engine;
}
