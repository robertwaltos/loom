/**
 * world-seed-system.ts — Bootstrap a world with entities at server start.
 *
 * Called once when a world loads. Creates:
 *   - Spawn points (player + NPC)
 *   - NPCs at NPC spawn points via the SpawnSystemService
 *   - Interactable objects (traders, quest-givers)
 *   - Environmental objects (landmarks)
 *
 * Not a tick system — runs once during world initialization.
 * All entity creation flows through the existing EntityRegistry + SpawnSystem.
 */

import type { EntityId, EntityType } from '@loom/entities-contracts';
import type {
  TransformComponent,
  SpawnPointComponent,
  InteractionComponent,
  WorldMembershipComponent,
  Vec3,
  Quat,
} from '@loom/entities-contracts';
import type { HealthComponent, IdentityComponent, AIBrainComponent } from '@loom/entities-contracts';
import type { EntityRegistry } from './entity-registry.js';
import type { SpawnSystemService, SpawnNpcParams } from './spawn-system.js';

// ── Config Types ────────────────────────────────────────────────

export interface SpawnPointSeed {
  readonly position: Vec3;
  readonly spawnType: 'player' | 'npc' | 'creature';
  readonly capacity: number;
  readonly cooldownMicroseconds?: number;
}

export interface NpcSeed {
  readonly spawnPointIndex: number;
  readonly displayName: string;
  readonly tier: 0 | 1 | 2 | 3;
  readonly hostility: 'friendly' | 'neutral' | 'hostile';
  readonly health: number;
  readonly interactions?: ReadonlyArray<'talk' | 'trade' | 'inspect' | 'use' | 'pickup'>;
}

export interface ObjectSeed {
  readonly position: Vec3;
  readonly entityType: EntityType;
  readonly displayName: string;
  readonly interactions?: ReadonlyArray<'talk' | 'trade' | 'inspect' | 'use' | 'pickup'>;
  readonly health?: number;
}

export interface WorldSeedConfig {
  readonly worldId: string;
  readonly spawnPoints: ReadonlyArray<SpawnPointSeed>;
  readonly npcs: ReadonlyArray<NpcSeed>;
  readonly objects: ReadonlyArray<ObjectSeed>;
}

// ── Result Types ────────────────────────────────────────────────

export interface WorldSeedResult {
  readonly worldId: string;
  readonly spawnPointIds: ReadonlyArray<EntityId>;
  readonly npcIds: ReadonlyArray<EntityId>;
  readonly objectIds: ReadonlyArray<EntityId>;
  readonly errors: ReadonlyArray<string>;
}

// ── Ports ───────────────────────────────────────────────────────

export interface WorldSeedDeps {
  readonly entityRegistry: EntityRegistry;
  readonly spawnSystem: SpawnSystemService;
}

// ── Defaults ────────────────────────────────────────────────────

const IDENTITY_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };
const DEFAULT_COOLDOWN_US = 0; // Zero during seeding; runtime cooldowns set by gameplay
const DEFAULT_NPC_MESH = 'mesh_npc_default';
const DEFAULT_OBJECT_MESH = 'mesh_object_default';

// ── Spawn Point Creation ────────────────────────────────────────

function createSpawnPointEntity(
  registry: EntityRegistry,
  worldId: string,
  seed: SpawnPointSeed,
): EntityId {
  const transform: TransformComponent = {
    position: seed.position,
    rotation: IDENTITY_ROTATION,
    scale: UNIT_SCALE,
  };
  const spawnPoint: SpawnPointComponent = {
    spawnType: seed.spawnType,
    capacity: seed.capacity,
    activeSpawns: 0,
    cooldownMicroseconds: seed.cooldownMicroseconds ?? DEFAULT_COOLDOWN_US,
  };
  const membership: WorldMembershipComponent = {
    worldId,
    enteredAt: Date.now(),
    isTransitioning: false,
    transitionTargetWorldId: null,
  };

  return registry.spawn('trigger-zone', worldId, {
    transform,
    'spawn-point': spawnPoint,
    'world-membership': membership,
  });
}

// ── NPC Spawning ────────────────────────────────────────────────

function spawnNpcAtPoint(
  deps: WorldSeedDeps,
  worldId: string,
  seed: NpcSeed,
  spawnPointId: EntityId,
  errors: string[],
): EntityId | null {
  const params: SpawnNpcParams = {
    spawnPointEntityId: spawnPointId as string,
    displayName: seed.displayName,
    meshContentHash: `hash_${seed.displayName.toLowerCase().replace(/\s+/g, '_')}`,
    assetName: DEFAULT_NPC_MESH,
    tier: seed.tier,
  };

  const result = deps.spawnSystem.spawnNpc(params);
  if (!result.ok) {
    errors.push(`Failed to spawn NPC "${seed.displayName}": ${result.reason}`);
    return null;
  }

  const entityId = result.entityId;
  const store = deps.entityRegistry.components;

  const health: HealthComponent = {
    current: seed.health,
    maximum: seed.health,
    regenerationRate: 1,
    isAlive: true,
  };
  store.set(entityId, 'health', health);

  const brain: AIBrainComponent = {
    behaviorTreeId: `bt_tier${seed.tier}`,
    currentGoal: 'idle',
    awarenessRadius: 15 + seed.tier * 10,
    hostility: seed.hostility,
    knownEntities: [],
  };
  store.set(entityId, 'ai-brain', brain);

  if (seed.interactions && seed.interactions.length > 0) {
    const interaction: InteractionComponent = {
      availableInteractions: seed.interactions,
      interactionRadius: 3,
      requiresLineOfSight: false,
      promptText: seed.displayName,
    };
    store.set(entityId, 'interaction', interaction);
  }

  return entityId;
}

// ── Object Creation ─────────────────────────────────────────────

function createWorldObject(
  registry: EntityRegistry,
  worldId: string,
  seed: ObjectSeed,
): EntityId {
  const transform: TransformComponent = {
    position: seed.position,
    rotation: IDENTITY_ROTATION,
    scale: UNIT_SCALE,
  };
  const membership: WorldMembershipComponent = {
    worldId,
    enteredAt: Date.now(),
    isTransitioning: false,
    transitionTargetWorldId: null,
  };
  const identity: IdentityComponent = {
    displayName: seed.displayName,
    playerId: null,
    faction: null,
    reputation: 0,
  };

  const components: Record<string, unknown> = {
    transform,
    'world-membership': membership,
    identity,
  };

  if (seed.interactions && seed.interactions.length > 0) {
    const interaction: InteractionComponent = {
      availableInteractions: seed.interactions,
      interactionRadius: 3,
      requiresLineOfSight: false,
      promptText: seed.displayName,
    };
    components['interaction'] = interaction;
  }

  if (seed.health !== undefined) {
    const health: HealthComponent = {
      current: seed.health,
      maximum: seed.health,
      regenerationRate: 0,
      isAlive: true,
    };
    components['health'] = health;
  }

  return registry.spawn(seed.entityType, worldId, components);
}

// ── Default World Config ────────────────────────────────────────

export function createDefaultWorldSeed(worldId: string): WorldSeedConfig {
  return {
    worldId,
    spawnPoints: [
      { position: { x: 0, y: 0, z: 0 }, spawnType: 'player', capacity: 10 },
      { position: { x: 50, y: 0, z: 50 }, spawnType: 'player', capacity: 10 },
      { position: { x: 100, y: 0, z: 30 }, spawnType: 'npc', capacity: 5, cooldownMicroseconds: 0 },
      { position: { x: -40, y: 0, z: 80 }, spawnType: 'npc', capacity: 5, cooldownMicroseconds: 0 },
      { position: { x: 70, y: 0, z: -20 }, spawnType: 'npc', capacity: 3 },
      { position: { x: -80, y: 0, z: -60 }, spawnType: 'creature', capacity: 8, cooldownMicroseconds: 0 },
    ],
    npcs: [
      { spawnPointIndex: 2, displayName: 'Merchant Kael', tier: 1, hostility: 'friendly', health: 200, interactions: ['talk', 'trade'] },
      { spawnPointIndex: 2, displayName: 'Guard Torven', tier: 1, hostility: 'neutral', health: 150, interactions: ['talk'] },
      { spawnPointIndex: 3, displayName: 'Elder Mirael', tier: 2, hostility: 'friendly', health: 100, interactions: ['talk', 'inspect'] },
      { spawnPointIndex: 4, displayName: 'Bandit Scout', tier: 0, hostility: 'hostile', health: 80 },
      { spawnPointIndex: 4, displayName: 'Bandit Brute', tier: 0, hostility: 'hostile', health: 120 },
      { spawnPointIndex: 5, displayName: 'Wild Wolf', tier: 0, hostility: 'hostile', health: 60 },
      { spawnPointIndex: 5, displayName: 'Forest Bear', tier: 0, hostility: 'neutral', health: 200 },
    ],
    objects: [
      { position: { x: 20, y: 0, z: 15 }, entityType: 'structure', displayName: 'Campfire', interactions: ['use'], health: 500 },
      { position: { x: 105, y: 0, z: 35 }, entityType: 'structure', displayName: 'Market Stall', interactions: ['trade', 'inspect'] },
      { position: { x: -35, y: 0, z: 85 }, entityType: 'structure', displayName: 'Ancient Shrine', interactions: ['inspect', 'use'] },
      { position: { x: 0, y: 0, z: -30 }, entityType: 'structure', displayName: 'Notice Board', interactions: ['inspect'] },
      { position: { x: 60, y: 0, z: 60 }, entityType: 'item', displayName: 'Healing Herb', interactions: ['pickup'] },
      { position: { x: -20, y: 0, z: 40 }, entityType: 'item', displayName: 'Iron Ore', interactions: ['pickup'] },
    ],
  };
}

// ── Seed Executor ───────────────────────────────────────────────

function seedWorld(deps: WorldSeedDeps, config: WorldSeedConfig): WorldSeedResult {
  const errors: string[] = [];
  const spawnPointIds: EntityId[] = [];
  const npcIds: EntityId[] = [];
  const objectIds: EntityId[] = [];

  for (const spSeed of config.spawnPoints) {
    const id = createSpawnPointEntity(deps.entityRegistry, config.worldId, spSeed);
    spawnPointIds.push(id);
  }

  for (const npcSeed of config.npcs) {
    if (npcSeed.spawnPointIndex < 0 || npcSeed.spawnPointIndex >= spawnPointIds.length) {
      errors.push(`NPC "${npcSeed.displayName}": invalid spawnPointIndex ${npcSeed.spawnPointIndex}`);
      continue;
    }
    const spId = spawnPointIds[npcSeed.spawnPointIndex]!;
    const npcId = spawnNpcAtPoint(deps, config.worldId, npcSeed, spId, errors);
    if (npcId !== null) {
      npcIds.push(npcId);
    }
  }

  for (const objSeed of config.objects) {
    const id = createWorldObject(deps.entityRegistry, config.worldId, objSeed);
    objectIds.push(id);
  }

  return { worldId: config.worldId, spawnPointIds, npcIds, objectIds, errors };
}

// ── Factory ─────────────────────────────────────────────────────

export function createWorldSeedService(deps: WorldSeedDeps): {
  readonly seed: (config: WorldSeedConfig) => WorldSeedResult;
  readonly seedDefault: (worldId: string) => WorldSeedResult;
} {
  return {
    seed: (config) => seedWorld(deps, config),
    seedDefault: (worldId) => seedWorld(deps, createDefaultWorldSeed(worldId)),
  };
}
