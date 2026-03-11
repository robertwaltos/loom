/**
 * spawn-system.ts — Entity spawning service.
 *
 * Creates entities at designated spawn points with the correct
 * component archetypes based on entity type. Manages cooldowns
 * and capacity limits per spawn point.
 *
 * Not a tick system — called on demand when entities need spawning.
 * Cooldown tracking is tick-aware via the clock.
 */

import type { EntityId, EntityType } from '@loom/entities-contracts';
import type { EntityRegistry } from './entity-registry.js';
import type { ComponentStore } from './component-store.js';
import type { Clock } from './clock.js';

import type {
  TransformComponent,
  MovementComponent,
  PlayerInputComponent,
  CameraTargetComponent,
  VisualMeshComponent,
  AnimationComponent,
  SpawnPointComponent,
  NpcTierComponent,
  WorldMembershipComponent,
  Vec3,
  Quat,
} from '@loom/entities-contracts';

// ── Ports ────────────────────────────────────────────────────────

export interface SpawnSystemDeps {
  readonly entityRegistry: EntityRegistry;
  readonly componentStore: ComponentStore;
  readonly clock: Clock;
}

// ── Types ────────────────────────────────────────────────────────

export interface SpawnPlayerParams {
  readonly spawnPointEntityId: string;
  readonly playerId: string;
  readonly displayName: string;
  readonly meshContentHash: string;
  readonly assetName: string;
}

export interface SpawnNpcParams {
  readonly spawnPointEntityId: string;
  readonly displayName: string;
  readonly meshContentHash: string;
  readonly assetName: string;
  readonly tier: 0 | 1 | 2 | 3;
}

export type SpawnResult =
  | { readonly ok: true; readonly entityId: EntityId }
  | { readonly ok: false; readonly reason: string };

export interface SpawnSystemService {
  readonly spawnPlayer: (params: SpawnPlayerParams) => SpawnResult;
  readonly spawnNpc: (params: SpawnNpcParams) => SpawnResult;
  readonly releaseSpawn: (spawnPointEntityId: string) => boolean;
}

// ── State ────────────────────────────────────────────────────────

interface SpawnState {
  readonly deps: SpawnSystemDeps;
  readonly lastSpawnTime: Map<string, number>;
}

// ── Defaults ────────────────────────────────────────────────────

const IDENTITY_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

/** Casts external string to branded EntityId at API boundary. */
function asEntityId(raw: string): EntityId {
  return raw as EntityId;
}

// ── Validation ──────────────────────────────────────────────────

function validateSpawnPoint(state: SpawnState, spId: EntityId): SpawnResult | undefined {
  const sp = state.deps.componentStore.tryGet(spId, 'spawn-point') as
    | SpawnPointComponent
    | undefined;
  if (!sp) return { ok: false, reason: 'spawn-point-not-found' };
  if (sp.activeSpawns >= sp.capacity) return { ok: false, reason: 'spawn-point-full' };
  return checkCooldown(state, spId, sp);
}

function checkCooldown(
  state: SpawnState,
  spId: EntityId,
  sp: SpawnPointComponent,
): SpawnResult | undefined {
  const lastTime = state.lastSpawnTime.get(spId) ?? 0;
  const now = state.deps.clock.nowMicroseconds();
  if (now - lastTime < sp.cooldownMicroseconds) {
    return { ok: false, reason: 'spawn-on-cooldown' };
  }
  return undefined;
}

// ── Spawn Helpers ───────────────────────────────────────────────

function getSpawnTransform(state: SpawnState, spId: EntityId): TransformComponent {
  const t = state.deps.componentStore.tryGet(spId, 'transform') as TransformComponent | undefined;
  return t ?? { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY_ROTATION, scale: UNIT_SCALE };
}

function getSpawnWorldId(state: SpawnState, spId: EntityId): string {
  const wm = state.deps.componentStore.tryGet(spId, 'world-membership') as
    | WorldMembershipComponent
    | undefined;
  return wm?.worldId ?? 'default';
}

function incrementActiveSpawns(state: SpawnState, spId: EntityId): void {
  const sp = state.deps.componentStore.tryGet(spId, 'spawn-point') as
    | SpawnPointComponent
    | undefined;
  if (!sp) return;
  const updated: SpawnPointComponent = {
    spawnType: sp.spawnType,
    capacity: sp.capacity,
    activeSpawns: sp.activeSpawns + 1,
    cooldownMicroseconds: sp.cooldownMicroseconds,
  };
  state.deps.componentStore.set(spId, 'spawn-point', updated);
  state.lastSpawnTime.set(spId, state.deps.clock.nowMicroseconds());
}

// ── Shared Archetype Helpers ────────────────────────────────────

function defaultMovement(): MovementComponent {
  return { speed: 0, maxSpeed: 3.5, isGrounded: true, movementMode: 'walking' };
}

function defaultInput(): PlayerInputComponent {
  return {
    moveDirection: { x: 0, y: 0, z: 0 },
    lookDirection: { x: 0, y: 0, z: -1 },
    actions: [],
    sequenceNumber: 0,
  };
}

function defaultCamera(): CameraTargetComponent {
  return {
    mode: 'third-person',
    fieldOfView: 90,
    distance: 5,
    offset: { x: 0, y: 1.8, z: 0 },
    pitchLimits: { min: -89, max: 89 },
  };
}

function defaultAnimation(): AnimationComponent {
  return {
    currentClip: 'Idle_Breathe',
    normalizedTime: 0,
    blendWeight: 1,
    playbackRate: 1,
    nextClip: null,
  };
}

function makeWorldMembership(worldId: string): WorldMembershipComponent {
  return { worldId, enteredAt: Date.now(), isTransitioning: false, transitionTargetWorldId: null };
}

// ── Player Archetype ────────────────────────────────────────────

function buildPlayerComponents(
  params: SpawnPlayerParams,
  transform: TransformComponent,
  worldId: string,
): Record<string, unknown> {
  return {
    transform: transform,
    identity: {
      displayName: params.displayName,
      playerId: params.playerId,
      faction: null,
      reputation: 0,
    },
    movement: defaultMovement(),
    'player-input': defaultInput(),
    'camera-target': defaultCamera(),
    'visual-mesh': {
      meshContentHash: params.meshContentHash,
      assetName: params.assetName,
      lodTier: 'high',
      materialVariant: null,
    },
    animation: defaultAnimation(),
    'network-replication': {
      priority: 'critical',
      relevancyRadius: 200,
      updateFrequency: 30,
      ownerConnectionId: params.playerId,
    },
    'world-membership': makeWorldMembership(worldId),
  };
}

// ── NPC Archetype ───────────────────────────────────────────────

function resolveNpcAiBackend(
  tier: 0 | 1 | 2 | 3,
): 'rule-based' | 'behavior-tree' | 'llm-haiku' | 'llm-opus' {
  if (tier === 0) return 'rule-based';
  if (tier === 1) return 'behavior-tree';
  if (tier === 2) return 'llm-haiku';
  return 'llm-opus';
}

function resolveMemoryWindow(tier: 0 | 1 | 2 | 3): number | null {
  if (tier === 1) return 90;
  return null;
}

function makeNpcTier(tier: 0 | 1 | 2 | 3): NpcTierComponent {
  return {
    tier,
    memoryWindowDays: resolveMemoryWindow(tier),
    aiBackend: resolveNpcAiBackend(tier),
    canCreateAssets: tier >= 2,
  };
}

function makeNpcMesh(params: SpawnNpcParams): VisualMeshComponent {
  return {
    meshContentHash: params.meshContentHash,
    assetName: params.assetName,
    lodTier: params.tier >= 2 ? 'high' : 'performance',
    materialVariant: null,
  };
}

function buildNpcComponents(
  params: SpawnNpcParams,
  transform: TransformComponent,
  worldId: string,
): Record<string, unknown> {
  return {
    transform: transform,
    identity: { displayName: params.displayName, playerId: null, faction: null, reputation: 0 },
    'npc-tier': makeNpcTier(params.tier),
    'visual-mesh': makeNpcMesh(params),
    animation: defaultAnimation(),
    'world-membership': makeWorldMembership(worldId),
  };
}

// ── Core Spawn Logic ────────────────────────────────────────────

function spawnEntity(
  state: SpawnState,
  entityType: EntityType,
  spId: EntityId,
  buildComponents: () => Record<string, unknown>,
): SpawnResult {
  const validation = validateSpawnPoint(state, spId);
  if (validation) return validation;
  const worldId = getSpawnWorldId(state, spId);
  const components = buildComponents();
  const entityId = state.deps.entityRegistry.spawn(entityType, worldId, components);
  incrementActiveSpawns(state, spId);
  return { ok: true, entityId };
}

function releaseSpawnPoint(state: SpawnState, spId: EntityId): boolean {
  const sp = state.deps.componentStore.tryGet(spId, 'spawn-point') as
    | SpawnPointComponent
    | undefined;
  if (!sp || sp.activeSpawns <= 0) return false;
  const updated: SpawnPointComponent = {
    spawnType: sp.spawnType,
    capacity: sp.capacity,
    activeSpawns: sp.activeSpawns - 1,
    cooldownMicroseconds: sp.cooldownMicroseconds,
  };
  state.deps.componentStore.set(spId, 'spawn-point', updated);
  return true;
}

// ── Factory ─────────────────────────────────────────────────────

function createSpawnSystem(deps: SpawnSystemDeps): SpawnSystemService {
  const state: SpawnState = { deps, lastSpawnTime: new Map() };

  return {
    spawnPlayer: (params) => {
      const spId = asEntityId(params.spawnPointEntityId);
      return spawnEntity(state, 'player', spId, () =>
        buildPlayerComponents(params, getSpawnTransform(state, spId), getSpawnWorldId(state, spId)),
      );
    },
    spawnNpc: (params) => {
      const spId = asEntityId(params.spawnPointEntityId);
      return spawnEntity(state, 'npc', spId, () =>
        buildNpcComponents(params, getSpawnTransform(state, spId), getSpawnWorldId(state, spId)),
      );
    },
    releaseSpawn: (id) => releaseSpawnPoint(state, asEntityId(id)),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createSpawnSystem };
