/**
 * interaction-system.ts — Detects player proximity to interactable entities.
 *
 * Each tick:
 *   1. Finds all entities with InteractionComponent
 *   2. For each, checks distance to all player entities
 *   3. If a player enters interaction radius → emits 'interaction.available'
 *   4. If a player leaves interaction radius → emits 'interaction.unavailable'
 *   5. Processes pending interaction requests from PlayerInputComponent actions
 *
 * Runs at priority 175 — after npc-ai (125) and action-dispatch (150),
 * before visual-state-mapper (200). This ordering ensures NPC state
 * is settled before interaction eligibility is calculated.
 *
 * Performance: Scans every 2 ticks (configurable). Only interactable
 * entities are checked, not every NPC — most NPCs are hostile and
 * have no InteractionComponent.
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  InteractionComponent,
  PlayerInputComponent,
  IdentityComponent,
  HealthComponent,
} from '@loom/entities-contracts';
import type { InteractionKind } from '@loom/events-contracts';

// ── Constants ───────────────────────────────────────────────────

/** Priority: after respawn (175), before visual-state-mapper (200). */
export const INTERACTION_SYSTEM_PRIORITY = 180;

/** Ticks between proximity scans (reduces cost in dense worlds). */
const SCAN_INTERVAL_TICKS = 2;

// ── Types ───────────────────────────────────────────────────────

export interface InteractionEvent {
  readonly type: 'available' | 'unavailable' | 'started' | 'completed';
  readonly playerEntityId: EntityId;
  readonly targetEntityId: EntityId;
  readonly targetDisplayName: string;
  readonly availableInteractions: ReadonlyArray<InteractionKind>;
  readonly interactionKind: InteractionKind | null;
  readonly worldId: string;
  readonly timestamp: number;
}

/** Port for external systems to observe interaction state changes. */
export interface InteractionEventSink {
  onInteraction(event: InteractionEvent): void;
}

export interface InteractionSystemDeps {
  readonly componentStore: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly worldId: string;
  readonly eventSink?: InteractionEventSink;
}

// ── Internal State ──────────────────────────────────────────────

interface InteractionState {
  /** Set of "playerEntityId:targetEntityId" pairs currently in range. */
  readonly inRange: Set<string>;
  /** Set of "playerEntityId:targetEntityId" pairs with an active started interaction. */
  readonly activeInteractions: Set<string>;
  readonly store: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly worldId: string;
  readonly eventSink: InteractionEventSink | undefined;
  ticksSinceLastScan: number;
}

// ── Helpers ─────────────────────────────────────────────────────

function distanceSq(a: TransformComponent, b: TransformComponent): number {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  return dx * dx + dy * dy + dz * dz;
}

function pairKey(playerId: EntityId, targetId: EntityId): string {
  return `${playerId}:${targetId}`;
}

function getDisplayName(store: ComponentStore, entityId: EntityId): string {
  const identity = store.tryGet<IdentityComponent>(entityId, 'identity');
  return identity?.displayName ?? 'Unknown';
}

function isPlayerEntity(store: ComponentStore, entityId: EntityId): boolean {
  const input = store.tryGet<PlayerInputComponent>(entityId, 'player-input');
  const brain = store.tryGet(entityId, 'ai-brain');
  // Players have player-input but no ai-brain
  return input !== undefined && brain === undefined;
}

function isAlive(store: ComponentStore, entityId: EntityId): boolean {
  const health = store.tryGet<HealthComponent>(entityId, 'health');
  return health === undefined || health.isAlive;
}

// ── Core Logic ──────────────────────────────────────────────────

function runProximityScan(state: InteractionState): void {
  const { store, worldId, eventSink, inRange } = state;

  // Find all interactable entities
  const interactables = store.findEntitiesWith('interaction');
  if (interactables.length === 0) return;

  // Find all player entities (have player-input, no ai-brain)
  const allWithInput = store.findEntitiesWith('player-input');
  const players = allWithInput.filter((id) => isPlayerEntity(store, id));
  if (players.length === 0) return;

  // Track which pairs are still in range this tick
  const stillInRange = new Set<string>();

  for (const targetId of interactables) {
    if (!isAlive(store, targetId)) continue;

    const interaction = store.tryGet<InteractionComponent>(targetId, 'interaction');
    const targetTransform = store.tryGet<TransformComponent>(targetId, 'transform');
    if (!interaction || !targetTransform) continue;

    const radiusSq = interaction.interactionRadius * interaction.interactionRadius;

    for (const playerId of players) {
      if (playerId === targetId) continue;
      if (!isAlive(store, playerId)) continue;

      const playerTransform = store.tryGet<TransformComponent>(playerId, 'transform');
      if (!playerTransform) continue;

      const dSq = distanceSq(playerTransform, targetTransform);
      const key = pairKey(playerId, targetId);

      if (dSq <= radiusSq) {
        stillInRange.add(key);

        if (!inRange.has(key)) {
          // Entered range — emit available
          inRange.add(key);
          eventSink?.onInteraction({
            type: 'available',
            playerEntityId: playerId,
            targetEntityId: targetId,
            targetDisplayName: getDisplayName(store, targetId),
            availableInteractions: interaction.availableInteractions,
            interactionKind: null,
            worldId,
            timestamp: state.clock.nowMicroseconds(),
          });
        }
      }
    }
  }

  // Find pairs that left range
  for (const key of inRange) {
    if (!stillInRange.has(key)) {
      inRange.delete(key);
      state.activeInteractions.delete(key);
      const [playerId, targetId] = key.split(':') as [string, string];
      eventSink?.onInteraction({
        type: 'unavailable',
        playerEntityId: playerId as EntityId,
        targetEntityId: targetId as EntityId,
        targetDisplayName: getDisplayName(store, targetId as EntityId),
        availableInteractions: [],
        interactionKind: null,
        worldId,
        timestamp: state.clock.nowMicroseconds(),
      });
    }
  }
}

function processInteractionRequests(state: InteractionState): void {
  const { store, worldId, eventSink, inRange } = state;

  // Check all players for 'interact' actions in their input
  const allWithInput = store.findEntitiesWith('player-input');
  const players = allWithInput.filter((id) => isPlayerEntity(store, id));

  for (const playerId of players) {
    const input = store.tryGet<PlayerInputComponent>(playerId, 'player-input');
    if (!input) continue;

    // Look for interaction actions: 'talk', 'trade', 'inspect', 'use', 'pickup'
    const interactAction = input.actions.find(
      (a) => a === 'talk' || a === 'trade' || a === 'inspect' || a === 'use' || a === 'pickup',
    );
    if (!interactAction) continue;

    // Find the closest in-range interactable target for this player
    const targetId = findClosestInRangeTarget(state, playerId);
    if (!targetId) continue;

    const interaction = store.tryGet<InteractionComponent>(targetId, 'interaction');
    if (!interaction) continue;

    // Verify the requested interaction is available
    if (!interaction.availableInteractions.includes(interactAction as InteractionKind)) {
      continue;
    }

    // Emit started event (only once per (player, target) pair)
    const startKey = pairKey(playerId, targetId);
    if (state.activeInteractions.has(startKey)) continue;
    state.activeInteractions.add(startKey);
    eventSink?.onInteraction({
      type: 'started',
      playerEntityId: playerId,
      targetEntityId: targetId,
      targetDisplayName: getDisplayName(store, targetId),
      availableInteractions: interaction.availableInteractions,
      interactionKind: interactAction as InteractionKind,
      worldId,
      timestamp: state.clock.nowMicroseconds(),
    });

    // For simple interactions (inspect, pickup), auto-complete immediately and clear active state
    if (interactAction === 'inspect' || interactAction === 'pickup') {
      state.activeInteractions.delete(startKey);
      eventSink?.onInteraction({
        type: 'completed',
        playerEntityId: playerId,
        targetEntityId: targetId,
        targetDisplayName: getDisplayName(store, targetId),
        availableInteractions: interaction.availableInteractions,
        interactionKind: interactAction as InteractionKind,
        worldId,
        timestamp: state.clock.nowMicroseconds(),
      });
    }
  }
}

function findClosestInRangeTarget(
  state: InteractionState,
  playerId: EntityId,
): EntityId | null {
  const { store, inRange } = state;
  const playerTransform = store.tryGet<TransformComponent>(playerId, 'transform');
  if (!playerTransform) return null;

  let closest: EntityId | null = null;
  let closestDistSq = Infinity;

  for (const key of inRange) {
    if (!key.startsWith(`${playerId}:`)) continue;
    const targetId = key.split(':')[1] as EntityId;

    const targetTransform = store.tryGet<TransformComponent>(targetId, 'transform');
    if (!targetTransform) continue;

    const dSq = distanceSq(playerTransform, targetTransform);
    if (dSq < closestDistSq) {
      closestDistSq = dSq;
      closest = targetId;
    }
  }

  return closest;
}

// ── Factory ─────────────────────────────────────────────────────

export function createInteractionSystem(deps: InteractionSystemDeps): SystemFn {
  const state: InteractionState = {
    inRange: new Set(),
    activeInteractions: new Set(),
    store: deps.componentStore,
    clock: deps.clock,
    worldId: deps.worldId,
    eventSink: deps.eventSink,
    ticksSinceLastScan: 0,
  };

  return (_context: SystemContext) => {
    state.ticksSinceLastScan++;

    // Proximity scan on interval
    if (state.ticksSinceLastScan >= SCAN_INTERVAL_TICKS) {
      state.ticksSinceLastScan = 0;
      runProximityScan(state);
    }

    // Always process interaction requests (player input is immediate)
    processInteractionRequests(state);
  };
}
