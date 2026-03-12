/**
 * npc-ai-system.ts — Autonomous NPC behavior driven by AIBrainComponent.
 *
 * Each tick:
 *   1. Reads AIBrainComponent for every NPC entity (has ai-brain, no player-input)
 *   2. Scans nearby entities within awarenessRadius
 *   3. Decides actions based on hostility + tier + goal
 *   4. Writes to player-input component so action-dispatch processes the intent
 *
 * Behavior matrix:
 *   hostile  + enemy nearby  → attack
 *   hostile  + no enemy      → patrol (wander)
 *   neutral  + attacked      → flee or fight-back
 *   neutral  + idle          → wander slowly
 *   friendly + player nearby → idle (available for interaction)
 *   friendly + no player     → patrol route
 *
 * Runs at priority 125 — after movement (100), before action-dispatch (150).
 * This ordering ensures NPC intent is written before actions are processed.
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  PlayerInputComponent,
  AIBrainComponent,
  Vec3,
} from '@loom/entities-contracts';
import type { HealthComponent } from '@loom/entities-contracts';

// ── Types ─────────────────────────────────────────────────────────

export type NpcGoal = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'return-home';

export interface NpcAiEvent {
  readonly entityId: EntityId;
  readonly goal: NpcGoal;
  readonly targetEntityId: EntityId | null;
  readonly timestamp: number;
}

/** Port for external systems to observe NPC decisions. */
export interface NpcAiEventSink {
  onNpcDecision(event: NpcAiEvent): void;
}

// ── Config ────────────────────────────────────────────────────────

/** Priority: after movement (100), before action-dispatch (150). */
export const NPC_AI_SYSTEM_PRIORITY = 125;

/** Distance at which hostile NPCs begin chasing. */
const CHASE_RANGE_FACTOR = 0.8;

/** Distance at which hostile NPCs switch from chase → attack. */
const ATTACK_RANGE = 3.0;

/** Patrol wander speed (fraction of max, slow walk). */
const PATROL_SPEED = 0.3;

/** Distance from home before NPC returns. */
const MAX_WANDER_DISTANCE = 20.0;

/** Flee speed multiplier when neutral NPC is attacked. */
const FLEE_SPEED = 0.8;

/** Ticks between awareness scans (perf optimization for large worlds). */
const SCAN_INTERVAL_TICKS = 3;

// ── Deps ──────────────────────────────────────────────────────────

export interface NpcAiSystemDeps {
  readonly componentStore: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly eventSink?: NpcAiEventSink;
}

// ── Internal State ────────────────────────────────────────────────

interface NpcState {
  goal: NpcGoal;
  targetId: EntityId | null;
  homePosition: Vec3;
  patrolDirection: Vec3;
  lastDamage: number;
  ticksSinceLastScan: number;
  cachedNearby: ReadonlyArray<EntityId>;
  /** Tracks whether attack action was written last tick (for edge detection). */
  attackWrittenLastTick: boolean;
}

interface AiSystemState {
  readonly store: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly eventSink: NpcAiEventSink | undefined;
  readonly npcStates: Map<string, NpcState>;
}

// ── Geometry Helpers ──────────────────────────────────────────────

function distanceSquared(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSquared(a, b));
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function directionTo(from: Vec3, to: Vec3): Vec3 {
  return normalize({ x: to.x - from.x, y: to.y - from.y, z: to.z - from.z });
}

function randomPatrolDirection(): Vec3 {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: 0, z: Math.sin(angle) };
}

// ── NPC State Management ──────────────────────────────────────────

function ensureNpcState(state: AiSystemState, entityId: EntityId, position: Vec3): NpcState {
  const key = entityId as string;
  let npc = state.npcStates.get(key);
  if (npc === undefined) {
    npc = {
      goal: 'idle',
      targetId: null,
      homePosition: { ...position },
      patrolDirection: randomPatrolDirection(),
      lastDamage: 0,
      ticksSinceLastScan: SCAN_INTERVAL_TICKS, // force immediate scan on first tick
      cachedNearby: [],
      attackWrittenLastTick: false,
    };
    state.npcStates.set(key, npc);
  }
  return npc;
}

// ── Awareness Scan ────────────────────────────────────────────────

function scanNearby(
  state: AiSystemState,
  entityId: EntityId,
  position: Vec3,
  radius: number,
): EntityId[] {
  const radiusSq = radius * radius;
  const allTransform = state.store.findEntitiesWith('transform');
  const nearby: EntityId[] = [];

  for (const candidateId of allTransform) {
    if (candidateId === entityId) continue;
    const ct = state.store.tryGet(candidateId, 'transform') as TransformComponent | undefined;
    if (ct === undefined) continue;
    if (distanceSquared(position, ct.position) <= radiusSq) {
      nearby.push(candidateId);
    }
  }

  return nearby;
}

function isPlayer(state: AiSystemState, entityId: EntityId): boolean {
  return state.store.has(entityId, 'player-input') && !state.store.has(entityId, 'ai-brain');
}

function isAlive(state: AiSystemState, entityId: EntityId): boolean {
  const health = state.store.tryGet(entityId, 'health') as HealthComponent | undefined;
  return health === undefined || health.isAlive;
}

function wasRecentlyDamaged(npc: NpcState, nowUs: number): boolean {
  return npc.lastDamage > 0 && (nowUs - npc.lastDamage) < 5_000_000;
}

// ── Decision Functions ────────────────────────────────────────────

function findNearestPlayer(
  state: AiSystemState,
  nearby: ReadonlyArray<EntityId>,
): EntityId | null {
  for (const id of nearby) {
    if (isPlayer(state, id) && isAlive(state, id)) return id;
  }
  return null;
}

function decideHostile(
  state: AiSystemState,
  entityId: EntityId,
  npc: NpcState,
  position: Vec3,
  brain: AIBrainComponent,
): void {
  const playerId = findNearestPlayer(state, npc.cachedNearby);

  if (playerId !== null) {
    const playerPos = (state.store.tryGet(playerId, 'transform') as TransformComponent).position;
    const dist = distance(position, playerPos);

    if (dist <= ATTACK_RANGE) {
      npc.goal = 'attack';
      npc.targetId = playerId;
    } else if (dist <= brain.awarenessRadius * CHASE_RANGE_FACTOR) {
      npc.goal = 'chase';
      npc.targetId = playerId;
    } else {
      npc.goal = 'patrol';
      npc.targetId = null;
    }
  } else {
    if (distance(position, npc.homePosition) > MAX_WANDER_DISTANCE) {
      npc.goal = 'return-home';
      npc.targetId = null;
    } else {
      npc.goal = 'patrol';
      npc.targetId = null;
    }
  }
}

function decideNeutral(
  state: AiSystemState,
  entityId: EntityId,
  npc: NpcState,
  position: Vec3,
  nowUs: number,
): void {
  if (wasRecentlyDamaged(npc, nowUs)) {
    const playerId = findNearestPlayer(state, npc.cachedNearby);
    if (playerId !== null) {
      npc.goal = 'flee';
      npc.targetId = playerId;
    } else {
      npc.goal = 'return-home';
      npc.targetId = null;
    }
    return;
  }

  if (distance(position, npc.homePosition) > MAX_WANDER_DISTANCE) {
    npc.goal = 'return-home';
    npc.targetId = null;
  } else {
    npc.goal = 'patrol';
    npc.targetId = null;
  }
}

function decideFriendly(
  state: AiSystemState,
  npc: NpcState,
  position: Vec3,
): void {
  const nearPlayer = findNearestPlayer(state, npc.cachedNearby);

  if (nearPlayer !== null) {
    npc.goal = 'idle';
    npc.targetId = null;
  } else if (distance(position, npc.homePosition) > MAX_WANDER_DISTANCE) {
    npc.goal = 'return-home';
    npc.targetId = null;
  } else {
    npc.goal = 'patrol';
    npc.targetId = null;
  }
}

// ── Intent Writer ─────────────────────────────────────────────────

function writeNpcIntent(
  state: AiSystemState,
  entityId: EntityId,
  npc: NpcState,
  position: Vec3,
): void {
  let moveDirection: Vec3 = { x: 0, y: 0, z: 0 };
  const actions: string[] = [];

  if (npc.goal !== 'attack') {
    npc.attackWrittenLastTick = false;
  }

  switch (npc.goal) {
    case 'idle':
      break;

    case 'patrol': {
      moveDirection = {
        x: npc.patrolDirection.x * PATROL_SPEED,
        y: 0,
        z: npc.patrolDirection.z * PATROL_SPEED,
      };
      break;
    }

    case 'chase': {
      if (npc.targetId !== null) {
        const targetPos = state.store.tryGet(npc.targetId, 'transform') as TransformComponent | undefined;
        if (targetPos !== undefined) {
          moveDirection = directionTo(position, targetPos.position);
        }
      }
      break;
    }

    case 'attack': {
      // Toggle attack action to create edges for action-dispatch.
      // Action-dispatch uses edge detection — same action on consecutive
      // ticks is treated as "held" and ignored. NPCs must release and
      // re-press to fire repeated attacks.
      if (!npc.attackWrittenLastTick) {
        actions.push('attack');
        npc.attackWrittenLastTick = true;
      } else {
        npc.attackWrittenLastTick = false;
      }
      if (npc.targetId !== null) {
        const targetPos = state.store.tryGet(npc.targetId, 'transform') as TransformComponent | undefined;
        if (targetPos !== undefined) {
          const dist = distance(position, targetPos.position);
          if (dist > ATTACK_RANGE * 0.5) {
            moveDirection = directionTo(position, targetPos.position);
          }
        }
      }
      break;
    }

    case 'flee': {
      if (npc.targetId !== null) {
        const threatPos = state.store.tryGet(npc.targetId, 'transform') as TransformComponent | undefined;
        if (threatPos !== undefined) {
          const away = directionTo(threatPos.position, position);
          moveDirection = { x: away.x * FLEE_SPEED, y: 0, z: away.z * FLEE_SPEED };
        }
      }
      break;
    }

    case 'return-home': {
      moveDirection = directionTo(position, npc.homePosition);
      break;
    }
  }

  const existing = state.store.tryGet(entityId, 'player-input') as PlayerInputComponent | undefined;
  const seqNum = existing !== undefined ? existing.sequenceNumber + 1 : 0;

  const intent: PlayerInputComponent = {
    moveDirection,
    lookDirection: moveDirection.x === 0 && moveDirection.z === 0
      ? { x: 0, y: 0, z: 1 }
      : normalize(moveDirection),
    actions,
    sequenceNumber: seqNum,
  };

  state.store.set(entityId, 'player-input', intent);
}

// ── Damage Detection ──────────────────────────────────────────────

function detectDamage(
  state: AiSystemState,
  entityId: EntityId,
  npc: NpcState,
  nowUs: number,
): void {
  const health = state.store.tryGet(entityId, 'health') as HealthComponent | undefined;
  if (health === undefined) return;

  const prevHealth = state.store.tryGet(entityId, 'health') as HealthComponent;
  if (!prevHealth.isAlive && npc.goal !== 'idle') {
    npc.goal = 'idle';
    npc.targetId = null;
  }
}

// ── Per-NPC Tick ──────────────────────────────────────────────────

function tickNpc(
  state: AiSystemState,
  entityId: EntityId,
  brain: AIBrainComponent,
  context: SystemContext,
): void {
  const transform = state.store.tryGet(entityId, 'transform') as TransformComponent | undefined;
  if (transform === undefined) return;

  const health = state.store.tryGet(entityId, 'health') as HealthComponent | undefined;
  if (health !== undefined && !health.isAlive) return;

  const position = transform.position;
  const npc = ensureNpcState(state, entityId, position);
  const nowUs = state.clock.nowMicroseconds();

  npc.ticksSinceLastScan++;
  if (npc.ticksSinceLastScan >= SCAN_INTERVAL_TICKS) {
    npc.ticksSinceLastScan = 0;
    (npc as { cachedNearby: ReadonlyArray<EntityId> }).cachedNearby = scanNearby(
      state, entityId, position, brain.awarenessRadius,
    );
  }

  switch (brain.hostility) {
    case 'hostile':
      decideHostile(state, entityId, npc, position, brain);
      break;
    case 'neutral':
      decideNeutral(state, entityId, npc, position, nowUs);
      break;
    case 'friendly':
      decideFriendly(state, npc, position);
      break;
  }

  if (Math.random() < 0.02 && npc.goal === 'patrol') {
    npc.patrolDirection = randomPatrolDirection();
  }

  writeNpcIntent(state, entityId, npc, position);

  state.eventSink?.onNpcDecision({
    entityId,
    goal: npc.goal,
    targetEntityId: npc.targetId,
    timestamp: nowUs,
  });
}

// ── Factory ───────────────────────────────────────────────────────

export function createNpcAiSystem(deps: NpcAiSystemDeps): SystemFn {
  const state: AiSystemState = {
    store: deps.componentStore,
    clock: deps.clock,
    eventSink: deps.eventSink,
    npcStates: new Map(),
  };

  return (context: SystemContext) => {
    const npcEntities = state.store.findEntitiesWith('ai-brain');

    for (const entityId of npcEntities) {
      const brain = state.store.tryGet(entityId, 'ai-brain') as AIBrainComponent | undefined;
      if (brain === undefined) continue;
      tickNpc(state, entityId, brain, context);
    }
  };
}
