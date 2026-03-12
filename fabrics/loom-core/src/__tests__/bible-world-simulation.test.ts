/**
 * bible-world-simulation.test.ts — Bible-driven world seeding tests.
 *
 * Proves that:
 *   - The character registry contains all 15 canonical characters
 *   - The world registry contains all 8 launch worlds
 *   - Bible-to-appearance mapper produces valid components
 *   - Bible world seed creates real entities with full component stacks
 *   - Alkahest seeds with 8 resident + multi-world characters
 *   - Every NPC has identity, health, AI brain, and appearance
 *   - World objects match sovereignty type
 *   - Characters are sorted by tier (Tier 4 first)
 */

import { describe, it, expect } from 'vitest';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createSpawnSystem } from '../spawn-system.js';
import { createSilentLogger } from '../logger.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createEventFactory } from '../event-factory.js';
import {
  getCharacterById,
  getCharactersForWorld,
  getMultiWorldCharacters,
  getAllCharacters,
  getCharacterCount,
  getCharactersByTier,
  getCharactersByFaction,
} from '../character-bible-registry.js';
import {
  getWorldById,
  getAllWorlds,
  getWorldCount,
  getWorldsByStellarClass,
  getWorldsBySovereignty,
  STELLAR_ISSUANCE_MULTIPLIER,
} from '../world-bible-registry.js';
import {
  mapToCharacterAppearance,
  mapToAppearanceComponent,
} from '../bible-appearance-mapper.js';
import {
  createBibleWorldSeed,
  seedBibleWorld,
  getAvailableBibleWorldIds,
} from '../bible-world-seed.js';
import type { EntityId } from '@loom/entities-contracts';
import type { AppearanceComponent, CharacterEntry } from '@loom/entities-contracts';

// ── Test Helpers ────────────────────────────────────────────────

function eid(id: string): EntityId {
  return id as unknown as EntityId;
}

function createTestDeps() {
  const logger = createSilentLogger();
  const idGen = createSequentialIdGenerator('test');
  const clock = { nowMicroseconds: () => Date.now() * 1000 };
  const eventBus = createInProcessEventBus({ logger });
  const eventFactory = createEventFactory(clock, idGen);
  const components = createComponentStore();
  const registry = createEntityRegistry({
    eventBus,
    eventFactory,
    componentStore: components,
    idGenerator: idGen,
    clock,
  });
  const spawnSystem = createSpawnSystem({
    entityRegistry: registry,
    componentStore: components,
    clock,
  });
  return { entityRegistry: registry, spawnSystem, components };
}

// ── Character Registry Tests ────────────────────────────────────

describe('Character Bible Registry', () => {
  it('contains exactly 15 canonical characters', () => {
    expect(getCharacterCount()).toBe(15);
    expect(getAllCharacters()).toHaveLength(15);
  });

  it('indexes characters by ID (1-based)', () => {
    const architect = getCharacterById(1);
    expect(architect).toBeDefined();
    expect(architect!.displayName).toBe('The Architect');
    expect(architect!.tier).toBe('TIER_4');
    expect(architect!.faction).toBe('singular');

    const itoro = getCharacterById(2);
    expect(itoro).toBeDefined();
    expect(itoro!.displayName).toBe('Itoro Adeyemi-Okafor');

    const vael = getCharacterById(3);
    expect(vael!.title).toBe('Commodore (Ret.)');
  });

  it('returns undefined for missing character IDs', () => {
    expect(getCharacterById(999)).toBeUndefined();
    expect(getCharacterById(0)).toBeUndefined();
  });

  it('finds characters by world', () => {
    const alkahestChars = getCharactersForWorld('alkahest');
    expect(alkahestChars.length).toBeGreaterThanOrEqual(8);

    const names = alkahestChars.map((c) => c.displayName);
    expect(names).toContain('Itoro Adeyemi-Okafor');
    expect(names).toContain('Nnamdi Achebe');
    expect(names).toContain('Amara Okafor-Nwosu');
    expect(names).toContain('Ikenna Oduya-Voss');
  });

  it('returns empty for unknown worlds', () => {
    expect(getCharactersForWorld('nonexistent')).toHaveLength(0);
  });

  it('identifies multi-world characters', () => {
    const multiWorld = getMultiWorldCharacters();
    expect(multiWorld.length).toBeGreaterThanOrEqual(1);

    const architect = multiWorld.find((c) => c.characterId === 1);
    expect(architect).toBeDefined();
    expect(architect!.isMultiWorld).toBe(true);
  });

  it('filters by tier', () => {
    const tier4 = getCharactersByTier('TIER_4');
    expect(tier4).toHaveLength(5);
    for (const c of tier4) {
      expect(c.tier).toBe('TIER_4');
    }

    const tier3 = getCharactersByTier('TIER_3');
    expect(tier3).toHaveLength(10);
  });

  it('filters by faction', () => {
    const surveyCorps = getCharactersByFaction('survey-corps');
    expect(surveyCorps.length).toBeGreaterThanOrEqual(3);
    for (const c of surveyCorps) {
      expect(c.faction).toBe('survey-corps');
    }
  });

  it('every character has valid MetaHuman config', () => {
    for (const ch of getAllCharacters()) {
      expect(ch.metaHuman.presetBase).toBeTruthy();
      expect(ch.metaHuman.ageSlider).toBeGreaterThanOrEqual(0);
      expect(ch.metaHuman.ageSlider).toBeLessThanOrEqual(100);
      expect(ch.metaHuman.weightSlider).toBeGreaterThanOrEqual(0);
      expect(ch.metaHuman.muscleSlider).toBeGreaterThanOrEqual(0);
    }
  });

  it('every character has expression states', () => {
    for (const ch of getAllCharacters()) {
      expect(ch.expressions.defaultExpression).toBeTruthy();
      expect(ch.expressions.secondaryExpression).toBeTruthy();
      expect(ch.expressions.rareExpression).toBeTruthy();
    }
  });

  it('every character has base health > 0', () => {
    for (const ch of getAllCharacters()) {
      expect(ch.baseHealth).toBeGreaterThan(0);
    }
  });
});

// ── World Registry Tests ────────────────────────────────────────

describe('World Bible Registry', () => {
  it('contains exactly 8 launch worlds', () => {
    expect(getWorldCount()).toBe(8);
    expect(getAllWorlds()).toHaveLength(8);
  });

  it('indexes worlds by ID', () => {
    const alkahest = getWorldById('alkahest');
    expect(alkahest).toBeDefined();
    expect(alkahest!.name).toBe('Alkahest');
    expect(alkahest!.worldNumber).toBe(1);
    expect(alkahest!.stellarClass).toBe('G');
    expect(alkahest!.nodeDensity).toBe(8);
    expect(alkahest!.latticeIntegrity).toBe(97);
    expect(alkahest!.population).toBe(2_100_000_000);
  });

  it('returns undefined for unknown worlds', () => {
    expect(getWorldById('nonexistent')).toBeUndefined();
  });

  it('filters by stellar class', () => {
    const gClass = getWorldsByStellarClass('G');
    expect(gClass.length).toBeGreaterThanOrEqual(3);
    for (const w of gClass) {
      expect(w.stellarClass).toBe('G');
    }
  });

  it('filters by sovereignty', () => {
    const surveyCorps = getWorldsBySovereignty('survey-corps');
    expect(surveyCorps).toHaveLength(1);
    expect(surveyCorps[0]!.worldId).toBe('deep-tidal');
  });

  it('has correct KALON issuance multipliers', () => {
    expect(STELLAR_ISSUANCE_MULTIPLIER['G']).toBe(1.0);
    expect(STELLAR_ISSUANCE_MULTIPLIER['K']).toBe(0.85);
    expect(STELLAR_ISSUANCE_MULTIPLIER['M']).toBe(0.6);
    expect(STELLAR_ISSUANCE_MULTIPLIER['F']).toBe(1.2);
    expect(STELLAR_ISSUANCE_MULTIPLIER['binary']).toBe(1.4);
  });

  it('every world has valid lattice integrity [0-100]', () => {
    for (const w of getAllWorlds()) {
      expect(w.latticeIntegrity).toBeGreaterThanOrEqual(0);
      expect(w.latticeIntegrity).toBeLessThanOrEqual(100);
    }
  });

  it('every world has population > 0', () => {
    for (const w of getAllWorlds()) {
      expect(w.population).toBeGreaterThan(0);
    }
  });

  it('every world has node density 1-10', () => {
    for (const w of getAllWorlds()) {
      expect(w.nodeDensity).toBeGreaterThanOrEqual(1);
      expect(w.nodeDensity).toBeLessThanOrEqual(10);
    }
  });

  it('Veil of Kass is binary system with highest issuance', () => {
    const kass = getWorldById('veil-of-kass')!;
    expect(kass.stellarClass).toBe('binary');
    expect(kass.kalonIssuanceMillions).toBe(58);
    expect(kass.sovereignty).toBe('contested');
  });

  it("Selene's Cradle has perfect lattice integrity", () => {
    const selene = getWorldById('selenes-cradle')!;
    expect(selene.latticeIntegrity).toBe(100);
    expect(selene.sovereignty).toBe('lattice-covenant');
  });
});

// ── Appearance Mapper Tests ─────────────────────────────────────

describe('Bible Appearance Mapper', () => {
  it('maps The Architect to CharacterAppearance', () => {
    const architect = getCharacterById(1)!;
    const appearance = mapToCharacterAppearance(architect, 'entity-001');

    expect(appearance.entityId).toBe('entity-001');
    expect(appearance.displayName).toBe('The Architect');
    expect(appearance.apparentSex).toBe('androgynous');
    expect(appearance.ageRange).toBe('middle-aged'); // 'indeterminate' has no number
    expect(appearance.bodyBuild).toBe('lean');
    expect(appearance.skinTone).toBe('pale ochre');
    expect(appearance.hair.color).toBe('silver-white');
    expect(appearance.archetype).toBe('legendary');
  });

  it('maps Itoro to CharacterAppearance with correct age', () => {
    const itoro = getCharacterById(2)!;
    const appearance = mapToCharacterAppearance(itoro, 'entity-002');

    expect(appearance.displayName).toBe('Itoro Adeyemi-Okafor');
    expect(appearance.apparentSex).toBe('feminine');
    expect(appearance.ageRange).toBe('ancient'); // 128 years old
    expect(appearance.bodyBuild).toBe('slight');
    expect(appearance.culturalStyle).toBe('West African — Nigerian-Yoruba lineage');
  });

  it('maps titled character with title in display name', () => {
    const vael = getCharacterById(3)!;
    const appearance = mapToCharacterAppearance(vael, 'entity-003');
    expect(appearance.displayName).toBe('Commodore (Ret.) Seren Vael');
  });

  it('maps to AppearanceComponent with MetaHuman data', () => {
    const itoro = getCharacterById(2)!;
    const comp = mapToAppearanceComponent(itoro);

    expect(comp.metaHumanPresetId).toBe('F_AfricanAmerican_03');
    expect(comp.bodyBuild).toBe('slight');
    expect(comp.ageRange).toBe('ancient');
    expect(comp.skinTone).toBe('deep brown — warm undertone');
    expect(comp.heightScale).toBe(1.0); // medium height
    expect(comp.hairColor).toBe('#C0C0C0'); // silver-white
    expect(comp.eyeColor).toBe('#3B2F2F'); // deep brown
    expect(comp.facialOverrides['age_intensity']).toBe(0.65);
    expect(comp.facialOverrides['weight_intensity']).toBe(0.3);
    expect(comp.facialOverrides['muscle_definition']).toBe(0.2);
  });

  it('maps Admiral height to tall scale', () => {
    const yara = getCharacterById(9)!;
    const comp = mapToAppearanceComponent(yara);
    expect(comp.heightScale).toBe(1.08);
  });

  it('maps all 15 characters without error', () => {
    for (const ch of getAllCharacters()) {
      const appearance = mapToCharacterAppearance(ch, `entity-${ch.characterId}`);
      expect(appearance.entityId).toBeTruthy();
      expect(appearance.displayName).toBeTruthy();

      const component = mapToAppearanceComponent(ch);
      expect(component.metaHumanPresetId).toBeTruthy();
    }
  });

  it('extracts accessories correctly', () => {
    const architect = getCharacterById(1)!;
    const comp = mapToAppearanceComponent(architect);
    // Architect has "none" accessories
    expect(comp.accessories).toHaveLength(0);

    const nnamdi = getCharacterById(5)!;
    const nnamdiComp = mapToAppearanceComponent(nnamdi);
    // Has "a plain band on the left hand"
    expect(nnamdiComp.accessories.length).toBeGreaterThan(0);
  });

  it('maps eye colors to hex correctly', () => {
    const vael = getCharacterById(3)!;
    const comp = mapToAppearanceComponent(vael);
    expect(comp.eyeColor).toBe('#5B8C5A'); // pale green

    const dagna = getCharacterById(12)!;
    const dagnaComp = mapToAppearanceComponent(dagna);
    expect(dagnaComp.eyeColor).toBe('#6B8FAF'); // pale blue-grey
  });
});

// ── Bible World Seed Config Tests ───────────────────────────────

describe('Bible World Seed Config', () => {
  it('returns null for unknown world', () => {
    expect(createBibleWorldSeed('nonexistent')).toBeNull();
  });

  it('creates valid config for Alkahest', () => {
    const config = createBibleWorldSeed('alkahest')!;
    expect(config).toBeDefined();
    expect(config.worldId).toBe('alkahest');

    // Should have player and NPC spawn points
    const playerSpawns = config.spawnPoints.filter((s) => s.spawnType === 'player');
    expect(playerSpawns).toHaveLength(2);

    const npcSpawns = config.spawnPoints.filter((s) => s.spawnType === 'npc');
    expect(npcSpawns.length).toBeGreaterThanOrEqual(3);

    // Should have all resident + multi-world characters
    expect(config.npcs.length).toBeGreaterThanOrEqual(8);
  });

  it('lists 8 available bible world IDs', () => {
    const ids = getAvailableBibleWorldIds();
    expect(ids).toHaveLength(8);
    expect(ids).toContain('alkahest');
    expect(ids).toContain('deep-tidal');
    expect(ids).toContain('varantha-station');
  });

  it('generates Chronicle Terminal for every world', () => {
    for (const worldId of getAvailableBibleWorldIds()) {
      const config = createBibleWorldSeed(worldId)!;
      expect(config).toBeDefined();
      const terminal = config.objects.find((o) => o.displayName === 'Chronicle Terminal');
      expect(terminal).toBeDefined();
    }
  });

  it('generates Assembly Chamber for Alkahest', () => {
    const config = createBibleWorldSeed('alkahest')!;
    const chamber = config.objects.find((o) => o.displayName === 'Assembly Chamber');
    expect(chamber).toBeDefined();
  });

  it('generates Survey Corps Hub for Deep Tidal', () => {
    const config = createBibleWorldSeed('deep-tidal')!;
    const hub = config.objects.find((o) => o.displayName === 'Survey Corps Hub');
    expect(hub).toBeDefined();
  });

  it('generates Free Port Exchange for Varantha Station', () => {
    const config = createBibleWorldSeed('varantha-station')!;
    const exchange = config.objects.find((o) => o.displayName === 'Free Port Exchange');
    expect(exchange).toBeDefined();
  });

  it('NPCs sorted by tier (Tier 4 first)', () => {
    const config = createBibleWorldSeed('alkahest')!;
    const tiers = config.npcs.map((n) => n.tier);
    // First NPCs should be tier 3 (mapped from TIER_4)
    expect(tiers[0]).toBe(3);
  });
});

// ── Bible World Seed Execution Tests ────────────────────────────

describe('Bible World Seed Execution', () => {
  it('seeds Alkahest with real entities', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest');

    expect(result).not.toBeNull();
    expect(result!.worldId).toBe('alkahest');
    expect(result!.worldEntry.name).toBe('Alkahest');
    expect(result!.errors).toHaveLength(0);

    // Spawn points created
    expect(result!.spawnPointIds.length).toBeGreaterThanOrEqual(5);

    // NPCs created
    expect(result!.npcIds.length).toBeGreaterThanOrEqual(8);

    // Objects created
    expect(result!.objectIds.length).toBeGreaterThanOrEqual(3);
  });

  it('every NPC has identity and health components', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest')!;

    for (const npcId of result.npcIds) {
      const identity = deps.components.tryGet(npcId, 'identity');
      expect(identity).toBeDefined();

      const health = deps.components.tryGet(npcId, 'health');
      expect(health).toBeDefined();
    }
  });

  it('every NPC has AI brain component', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest')!;

    for (const npcId of result.npcIds) {
      const brain = deps.components.tryGet(npcId, 'ai-brain');
      expect(brain).toBeDefined();
    }
  });

  it('every NPC has appearance component from bible data', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest')!;

    expect(result.appearanceCount).toBe(result.npcIds.length);

    for (const npcId of result.npcIds) {
      const appearance = deps.components.tryGet(npcId, 'appearance') as AppearanceComponent;
      expect(appearance).toBeDefined();
      expect(appearance.metaHumanPresetId).toBeTruthy();
      expect(appearance.bodyBuild).toBeTruthy();
      expect(appearance.ageRange).toBeTruthy();
    }
  });

  it('seeded characters list matches NPC count', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest')!;

    expect(result.seededCharacters.length).toBe(result.npcIds.length);
    for (const ch of result.seededCharacters) {
      expect(ch.characterId).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown world', () => {
    const deps = createTestDeps();
    expect(seedBibleWorld(deps, 'nonexistent')).toBeNull();
  });

  it('seeds Deep Tidal with Survey Corps characters', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'deep-tidal')!;

    expect(result).not.toBeNull();
    expect(result.npcIds.length).toBeGreaterThanOrEqual(2);

    // Should include Yara Sundaram-Chen and Odalys Ferreira-Asante
    const seededNames = result.seededCharacters.map((c) => c.displayName);
    expect(seededNames).toContain('Yara Sundaram-Chen');
    expect(seededNames).toContain('Odalys Ferreira-Asante');
  });

  it('seeds Varantha Station with commercial characters', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'varantha-station')!;

    expect(result).not.toBeNull();
    const seededNames = result.seededCharacters.map((c) => c.displayName);
    expect(seededNames).toContain('Dagna Thorvaldsen-Mbeki');
    expect(seededNames).toContain('Luca Okonkwo-Reinholt');
  });

  it('friendly NPCs have interaction components', () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest')!;

    // Find a friendly character (Itoro is friendly with talk+inspect)
    const itoro = result.seededCharacters.find(
      (c) => c.displayName === 'Itoro Adeyemi-Okafor',
    );
    expect(itoro).toBeDefined();
    expect(itoro!.interactions.length).toBeGreaterThan(0);

    // The NPC entity should have an interaction component
    const itIdx = result.seededCharacters.indexOf(itoro!);
    const npcId = result.npcIds[itIdx]!;
    const interaction = deps.components.tryGet(npcId, 'interaction');
    expect(interaction).toBeDefined();
  });

  it("Architect has massive health pool", () => {
    const deps = createTestDeps();
    const result = seedBibleWorld(deps, 'alkahest')!;

    const architectCh = result.seededCharacters.find(
      (c) => c.displayName === 'The Architect',
    );
    expect(architectCh).toBeDefined();
    expect(architectCh!.baseHealth).toBe(99999);
  });

  it('every available world can be seeded', () => {
    for (const worldId of getAvailableBibleWorldIds()) {
      const deps = createTestDeps();
      const result = seedBibleWorld(deps, worldId);
      expect(result).not.toBeNull();
      expect(result!.errors).toHaveLength(0);
      expect(result!.npcIds.length).toBeGreaterThanOrEqual(1);
    }
  });
});
