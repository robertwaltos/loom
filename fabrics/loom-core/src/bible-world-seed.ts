/**
 * bible-world-seed.ts — Seeds a world with canonical characters from the Bible.
 *
 * Replaces the placeholder NPCs from createDefaultWorldSeed with
 * real characters from the Character Bible and Visual Manifest.
 * Each NPC is spawned with full identity, health, AI brain,
 * appearance, and interaction components.
 *
 * Flow:
 *   WorldEntry (bible world data)
 *     → getCharactersForWorld (bible character registry)
 *       → mapToAppearanceComponent (bible appearance mapper)
 *         → WorldSeedConfig (standard world seed format)
 *           → seedWorld (existing world seed system)
 */

import type {
  WorldSeedConfig,
  SpawnPointSeed,
  NpcSeed,
  ObjectSeed,
} from './world-seed-system.js';
import type {
  CharacterEntry,
  WorldEntry,
  AppearanceComponent,
  NpcTier,
} from '@loom/entities-contracts';
import type { EntityId } from '@loom/entities-contracts';
import type { WorldSeedDeps, WorldSeedResult } from './world-seed-system.js';
import type { ComponentStore } from './component-store.js';
import { getCharactersForWorld, getMultiWorldCharacters } from './character-bible-registry.js';
import { getWorldById } from './world-bible-registry.js';
import { mapToAppearanceComponent } from './bible-appearance-mapper.js';
import { createWorldSeedService } from './world-seed-system.js';

// ── Bible Tier → NPC Tier Mapping ───────────────────────────────

const BIBLE_TIER_TO_NPC: Readonly<Record<string, NpcTier>> = {
  TIER_0: 0,
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
  TIER_4: 3, // Tier 4 uses same NPC tier as 3 (Opus-backed)
};

// ── Spawn Point Layout ──────────────────────────────────────────

/**
 * Generate spawn points appropriate for the world's population
 * and character density. More characters = more NPC spawn locations.
 */
function generateSpawnPoints(
  world: WorldEntry,
  characterCount: number,
): ReadonlyArray<SpawnPointSeed> {
  const points: SpawnPointSeed[] = [
    // Player spawns — always two
    { position: { x: 0, y: 0, z: 0 }, spawnType: 'player', capacity: 10 },
    { position: { x: 50, y: 0, z: 50 }, spawnType: 'player', capacity: 10 },
  ];

  // NPC spawn points spread across the world
  // Place characters at meaningful positions
  const npcPointCount = Math.max(3, Math.ceil(characterCount / 2));
  const radius = 80;

  for (let i = 0; i < npcPointCount; i++) {
    const angle = (i / npcPointCount) * 2 * Math.PI;
    const x = Math.round(Math.cos(angle) * radius);
    const z = Math.round(Math.sin(angle) * radius);
    points.push({
      position: { x, y: 0, z },
      spawnType: 'npc',
      capacity: 4,
      cooldownMicroseconds: 0,
    });
  }

  return points;
}

// ── Character → NpcSeed ─────────────────────────────────────────

/**
 * Convert a CharacterEntry to the NpcSeed format
 * expected by the world seed system.
 */
function characterToNpcSeed(
  entry: CharacterEntry,
  spawnPointIndex: number,
): NpcSeed {
  return {
    spawnPointIndex,
    displayName: entry.title
      ? `${entry.title} ${entry.displayName}`
      : entry.displayName,
    tier: BIBLE_TIER_TO_NPC[entry.tier] ?? 0,
    hostility: entry.hostility,
    health: entry.baseHealth,
    interactions: entry.interactions,
  };
}

// ── World Objects ───────────────────────────────────────────────

/**
 * Generate world objects appropriate for the world's character.
 * Assembly worlds get governance structures; Survey Corps worlds
 * get operational facilities; commercial hubs get trade infrastructure.
 */
function generateWorldObjects(world: WorldEntry): ReadonlyArray<ObjectSeed> {
  const objects: ObjectSeed[] = [];

  // Every world gets a Chronicle terminal
  objects.push({
    position: { x: 10, y: 0, z: 10 },
    entityType: 'structure',
    displayName: 'Chronicle Terminal',
    interactions: ['inspect', 'use'],
    health: 1000,
  });

  // Lattice Node — integrity affects visual state
  objects.push({
    position: { x: -30, y: 0, z: -30 },
    entityType: 'structure',
    displayName: `Lattice Node — ${world.name}`,
    interactions: ['inspect'],
    health: Math.round(world.latticeIntegrity * 100),
  });

  // World-specific structures
  if (world.sovereignty === 'assembly-common-trust' || world.sovereignty === 'commonwealth-trust') {
    objects.push({
      position: { x: 30, y: 0, z: -20 },
      entityType: 'structure',
      displayName: 'Assembly Chamber',
      interactions: ['inspect', 'use'],
      health: 5000,
    });
  }

  if (world.sovereignty === 'survey-corps') {
    objects.push({
      position: { x: -50, y: 0, z: 20 },
      entityType: 'structure',
      displayName: 'Survey Corps Hub',
      interactions: ['inspect', 'use'],
      health: 3000,
    });
  }

  if (world.sovereignty === 'free-port-compact') {
    objects.push({
      position: { x: 40, y: 0, z: 40 },
      entityType: 'structure',
      displayName: 'Free Port Exchange',
      interactions: ['trade', 'inspect'],
      health: 4000,
    });
  }

  if (world.sovereignty === 'lattice-covenant') {
    objects.push({
      position: { x: -40, y: 0, z: 40 },
      entityType: 'structure',
      displayName: 'Lattice Covenant Shrine',
      interactions: ['inspect', 'use'],
      health: 3000,
    });
  }

  if (world.sovereignty === 'industrial-consortium') {
    objects.push({
      position: { x: 60, y: 0, z: -40 },
      entityType: 'structure',
      displayName: 'Industrial Forge Complex',
      interactions: ['inspect'],
      health: 8000,
    });
  }

  return objects;
}

// ── Bible World Seed Config ─────────────────────────────────────

/**
 * Generate a complete WorldSeedConfig for a canonical bible world.
 * Characters are placed at NPC spawn points in tier order
 * (highest tier characters get the first spawn positions).
 */
export function createBibleWorldSeed(worldId: string): WorldSeedConfig | null {
  const world = getWorldById(worldId);
  if (!world) return null;

  // Gather all characters for this world
  const residents = getCharactersForWorld(worldId);
  const multiWorld = getMultiWorldCharacters().filter(
    (c) => c.homeWorldId !== worldId, // Avoid duplicates
  );
  const allCharacters = [...residents, ...multiWorld];

  // Sort by tier descending so important NPCs get first spawn positions
  const sorted = [...allCharacters].sort((a, b) => {
    const tierOrder: Record<string, number> = { TIER_4: 4, TIER_3: 3, TIER_2: 2, TIER_1: 1, TIER_0: 0 };
    return (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0);
  });

  const spawnPoints = generateSpawnPoints(world, sorted.length);
  const npcSpawnIndices = spawnPoints
    .map((sp, idx) => ({ sp, idx }))
    .filter((s) => s.sp.spawnType === 'npc')
    .map((s) => s.idx);

  // Assign characters to spawn points
  const npcs: NpcSeed[] = sorted.map((ch, i) => {
    const spIdx = npcSpawnIndices[i % npcSpawnIndices.length]!;
    return characterToNpcSeed(ch, spIdx);
  });

  return {
    worldId: world.worldId,
    spawnPoints,
    npcs,
    objects: generateWorldObjects(world),
  };
}

// ── Bible World Seed Result (extended) ──────────────────────────

export interface BibleWorldSeedResult extends WorldSeedResult {
  /** The canonical world data used for seeding. */
  readonly worldEntry: WorldEntry;
  /** Characters that were seeded, in spawn order. */
  readonly seededCharacters: ReadonlyArray<CharacterEntry>;
  /** Number of appearance components applied. */
  readonly appearanceCount: number;
}

// ── Bible Seed Executor ─────────────────────────────────────────

/**
 * Seed a canonical bible world with full character data.
 * Extends the base world seed by also setting AppearanceComponents
 * on every NPC that has bible visual data.
 */
export function seedBibleWorld(
  deps: WorldSeedDeps,
  worldId: string,
): BibleWorldSeedResult | null {
  const world = getWorldById(worldId);
  if (!world) return null;

  const config = createBibleWorldSeed(worldId);
  if (!config) return null;

  // Use the standard seed service
  const seedService = createWorldSeedService(deps);
  const baseResult = seedService.seed(config);

  // Gather characters in the same order they were seeded
  const residents = getCharactersForWorld(worldId);
  const multiWorld = getMultiWorldCharacters().filter(
    (c) => c.homeWorldId !== worldId,
  );
  const allCharacters = [...residents, ...multiWorld];
  const sorted = [...allCharacters].sort((a, b) => {
    const tierOrder: Record<string, number> = { TIER_4: 4, TIER_3: 3, TIER_2: 2, TIER_1: 1, TIER_0: 0 };
    return (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0);
  });

  // Apply AppearanceComponents to spawned NPCs
  let appearanceCount = 0;
  const store = deps.entityRegistry.components;

  for (let i = 0; i < baseResult.npcIds.length && i < sorted.length; i++) {
    const npcId = baseResult.npcIds[i]!;
    const character = sorted[i]!;
    const appearance = mapToAppearanceComponent(character);
    store.set(npcId, 'appearance', appearance);
    appearanceCount++;
  }

  return {
    ...baseResult,
    worldEntry: world,
    seededCharacters: sorted.slice(0, baseResult.npcIds.length),
    appearanceCount,
  };
}

/**
 * Get all world IDs available for bible seeding.
 */
export function getAvailableBibleWorldIds(): ReadonlyArray<string> {
  return [
    'alkahest',
    'meridians-rest',
    'amber-reach',
    'iron-meridian',
    'selenes-cradle',
    'veil-of-kass',
    'deep-tidal',
    'varantha-station',
  ];
}
