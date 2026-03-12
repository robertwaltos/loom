/**
 * action-dispatch-system.ts — Routes player actions to game systems.
 *
 * Each tick:
 *   1. Reads PlayerInputComponent.actions for every entity with player-input
 *   2. Checks prerequisites (cooldowns, proximity, resources)
 *   3. Dispatches to registered ActionHandler ports
 *   4. Writes results to entity components (health, inventory, animation)
 *
 * Actions flow:  UE5 bitflags → actionFlagsToNames → player-input.actions → HERE
 *
 * Server-authoritative: the Loom validates and resolves all actions.
 * The rendering fabric receives results via component snapshots.
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  PlayerInputComponent,
  TransformComponent,
  InteractionComponent,
  AnimationComponent,
} from '@loom/entities-contracts';
import type { HealthComponent, InventoryComponent } from '@loom/entities-contracts';

// ── Types ─────────────────────────────────────────────────────────

export type ActionName =
  | 'jump'
  | 'interact'
  | 'attack'
  | 'defend'
  | 'dodge'
  | 'use-item'
  | 'trade'
  | 'build'
  | 'mount'
  | 'survey'
  | 'vote'
  | 'emote'
  | 'chat'
  | 'toggle-map'
  | 'open-menu';

export type ActionResult =
  | { readonly ok: true; readonly action: ActionName }
  | { readonly ok: false; readonly action: ActionName; readonly reason: ActionFailReason };

export type ActionFailReason =
  | 'on-cooldown'
  | 'no-target-in-range'
  | 'insufficient-resources'
  | 'target-not-alive'
  | 'already-mounted'
  | 'no-mount-nearby'
  | 'inventory-full'
  | 'not-in-build-zone'
  | 'no-active-vote'
  | 'no-survey-equipment'
  | 'not-interactable';

export interface ActionEvent {
  readonly entityId: EntityId;
  readonly action: ActionName;
  readonly targetEntityId: EntityId | null;
  readonly timestamp: number;
  readonly result: ActionResult;
}

/** Port for external systems to observe action results. */
export interface ActionEventSink {
  onAction(event: ActionEvent): void;
}

// ── Cooldown Tracking ─────────────────────────────────────────────

interface CooldownEntry {
  readonly expiresAtUs: number;
}

const ACTION_COOLDOWNS_US: Partial<Record<ActionName, number>> = {
  attack: 500_000,
  defend: 300_000,
  dodge: 800_000,
  interact: 200_000,
  'use-item': 300_000,
  emote: 1_000_000,
  vote: 2_000_000,
  survey: 5_000_000,
  build: 1_000_000,
};

// ── Combat Constants ──────────────────────────────────────────────

const BASE_ATTACK_DAMAGE = 10;
const DEFEND_DAMAGE_MULTIPLIER = 0.5;
const DODGE_INVULNERABILITY_US = 400_000;
const INTERACTION_RANGE = 5.0;
const ATTACK_RANGE = 3.0;

// ── Deps ──────────────────────────────────────────────────────────

export interface ActionDispatchDeps {
  readonly componentStore: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly eventSink?: ActionEventSink;
}

// ── Internal State ────────────────────────────────────────────────

interface ActionDispatchState {
  readonly store: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly eventSink: ActionEventSink | undefined;
  readonly cooldowns: Map<string, CooldownEntry>;
  readonly dodgeActive: Map<string, number>;
  readonly prevActions: Map<string, ReadonlySet<string>>;
}

// ── Cooldown Helpers ──────────────────────────────────────────────

function cooldownKey(entityId: EntityId, action: ActionName): string {
  return `${entityId}:${action}`;
}

function isOnCooldown(state: ActionDispatchState, entityId: EntityId, action: ActionName): boolean {
  const entry = state.cooldowns.get(cooldownKey(entityId, action));
  if (entry === undefined) return false;
  return state.clock.nowMicroseconds() < entry.expiresAtUs;
}

function setCooldown(state: ActionDispatchState, entityId: EntityId, action: ActionName): void {
  const durationUs = ACTION_COOLDOWNS_US[action];
  if (durationUs === undefined) return;
  const key = cooldownKey(entityId, action);
  state.cooldowns.set(key, { expiresAtUs: state.clock.nowMicroseconds() + durationUs });
}

// ── Edge Detection ────────────────────────────────────────────────

function isNewAction(
  state: ActionDispatchState,
  entityId: EntityId,
  action: string,
): boolean {
  const prev = state.prevActions.get(entityId as string);
  if (prev === undefined) return true;
  return !prev.has(action);
}

// ── Proximity Helpers ─────────────────────────────────────────────

function distanceBetween(a: TransformComponent, b: TransformComponent): number {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function findNearestTarget(
  state: ActionDispatchState,
  entityId: EntityId,
  maxRange: number,
  filter: (targetId: EntityId) => boolean,
): EntityId | null {
  const myTransform = state.store.tryGet(entityId, 'transform') as TransformComponent | undefined;
  if (myTransform === undefined) return null;

  const candidates = state.store.findEntitiesWith('transform');
  let bestId: EntityId | null = null;
  let bestDist = maxRange;

  for (const candidateId of candidates) {
    if (candidateId === entityId) continue;
    if (!filter(candidateId)) continue;
    const candidateTransform = state.store.tryGet(candidateId, 'transform') as TransformComponent | undefined;
    if (candidateTransform === undefined) continue;
    const dist = distanceBetween(myTransform, candidateTransform);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = candidateId;
    }
  }
  return bestId;
}

// ── Action Handlers ───────────────────────────────────────────────

function handleAttack(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'attack';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  const targetId = findNearestTarget(state, entityId, ATTACK_RANGE, (tid) => {
    const health = state.store.tryGet(tid, 'health') as HealthComponent | undefined;
    return health !== undefined && health.isAlive;
  });

  if (targetId === null) {
    return { ok: false, action, reason: 'no-target-in-range' };
  }

  const targetHealth = state.store.tryGet(targetId, 'health') as HealthComponent;
  const isDodging = state.dodgeActive.has(targetId as string);
  const isDefending = hasAction(state.store, targetId, 'defend');

  let damage = BASE_ATTACK_DAMAGE;
  if (isDodging) damage = 0;
  if (isDefending) damage = Math.floor(damage * DEFEND_DAMAGE_MULTIPLIER);

  const newCurrent = Math.max(0, targetHealth.current - damage);
  const updatedHealth: HealthComponent = {
    current: newCurrent,
    maximum: targetHealth.maximum,
    regenerationRate: targetHealth.regenerationRate,
    isAlive: newCurrent > 0,
  };
  state.store.set(targetId, 'health', updatedHealth);

  setAnimation(state.store, entityId, 'attack');
  setCooldown(state, entityId, action);

  emitEvent(state, entityId, action, targetId, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleDefend(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'defend';
  setAnimation(state.store, entityId, 'defend');
  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleDodge(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'dodge';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  state.dodgeActive.set(entityId as string, nowUs + DODGE_INVULNERABILITY_US);
  setAnimation(state.store, entityId, 'dodge');
  setCooldown(state, entityId, action);

  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleInteract(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'interact';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  const targetId = findNearestTarget(state, entityId, INTERACTION_RANGE, (tid) => {
    const interact = state.store.tryGet(tid, 'interaction') as InteractionComponent | undefined;
    return interact !== undefined && interact.availableInteractions.length > 0;
  });

  if (targetId === null) {
    return { ok: false, action, reason: 'no-target-in-range' };
  }

  setAnimation(state.store, entityId, 'interact');
  setCooldown(state, entityId, action);

  emitEvent(state, entityId, action, targetId, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleUseItem(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'use-item';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  const inventory = state.store.tryGet(entityId, 'inventory') as InventoryComponent | undefined;
  if (inventory === undefined || inventory.slots.every((s) => s.itemEntityId === null)) {
    return { ok: false, action, reason: 'insufficient-resources' };
  }

  setAnimation(state.store, entityId, 'use-item');
  setCooldown(state, entityId, action);

  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleTrade(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'trade';

  const targetId = findNearestTarget(state, entityId, INTERACTION_RANGE, (tid) => {
    const interact = state.store.tryGet(tid, 'interaction') as InteractionComponent | undefined;
    return interact !== undefined && interact.availableInteractions.includes('trade');
  });

  if (targetId === null) {
    return { ok: false, action, reason: 'no-target-in-range' };
  }

  emitEvent(state, entityId, action, targetId, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleBuild(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'build';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  setCooldown(state, entityId, action);
  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleEmote(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'emote';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  setAnimation(state.store, entityId, 'emote');
  setCooldown(state, entityId, action);

  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleSurvey(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'survey';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  setCooldown(state, entityId, action);
  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleVote(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'vote';
  if (isOnCooldown(state, entityId, action)) {
    return { ok: false, action, reason: 'on-cooldown' };
  }

  setCooldown(state, entityId, action);
  emitEvent(state, entityId, action, null, nowUs, { ok: true, action });
  return { ok: true, action };
}

function handleMount(state: ActionDispatchState, entityId: EntityId, nowUs: number): ActionResult {
  const action: ActionName = 'mount';

  const targetId = findNearestTarget(state, entityId, INTERACTION_RANGE, (tid) => {
    const interact = state.store.tryGet(tid, 'interaction') as InteractionComponent | undefined;
    return interact !== undefined && interact.availableInteractions.includes('use');
  });

  if (targetId === null) {
    return { ok: false, action, reason: 'no-mount-nearby' };
  }

  setAnimation(state.store, entityId, 'mount');
  emitEvent(state, entityId, action, targetId, nowUs, { ok: true, action });
  return { ok: true, action };
}

// ── Shared Helpers ────────────────────────────────────────────────

function hasAction(store: ComponentStore, entityId: EntityId, action: string): boolean {
  const input = store.tryGet(entityId, 'player-input') as PlayerInputComponent | undefined;
  return input !== undefined && input.actions.includes(action);
}

function setAnimation(store: ComponentStore, entityId: EntityId, clip: string): void {
  const existing = store.tryGet(entityId, 'animation') as AnimationComponent | undefined;
  const updated: AnimationComponent = {
    currentClip: clip,
    normalizedTime: 0,
    blendWeight: existing?.blendWeight ?? 1.0,
    playbackRate: 1.0,
    nextClip: null,
  };
  store.set(entityId, 'animation', updated);
}

function emitEvent(
  state: ActionDispatchState,
  entityId: EntityId,
  action: ActionName,
  targetId: EntityId | null,
  nowUs: number,
  result: ActionResult,
): void {
  state.eventSink?.onAction({
    entityId,
    action,
    targetEntityId: targetId,
    timestamp: nowUs,
    result,
  });
}

// ── Action Router ─────────────────────────────────────────────────

const ACTION_HANDLERS: Record<ActionName, (state: ActionDispatchState, entityId: EntityId, nowUs: number) => ActionResult> = {
  jump: (_state, _entityId, _nowUs) => ({ ok: true, action: 'jump' }),
  interact: handleInteract,
  attack: handleAttack,
  defend: handleDefend,
  dodge: handleDodge,
  'use-item': handleUseItem,
  trade: handleTrade,
  build: handleBuild,
  mount: handleMount,
  survey: handleSurvey,
  vote: handleVote,
  emote: handleEmote,
  chat: (_state, _entityId, _nowUs) => ({ ok: true, action: 'chat' }),
  'toggle-map': (_state, _entityId, _nowUs) => ({ ok: true, action: 'toggle-map' }),
  'open-menu': (_state, _entityId, _nowUs) => ({ ok: true, action: 'open-menu' }),
};

// ── Tick Update ───────────────────────────────────────────────────

function tickEntity(state: ActionDispatchState, entityId: EntityId, nowUs: number): void {
  const input = state.store.tryGet(entityId, 'player-input') as PlayerInputComponent | undefined;
  if (input === undefined) return;

  for (const actionStr of input.actions) {
    const action = actionStr as ActionName;
    const handler = ACTION_HANDLERS[action];
    if (handler === undefined) continue;
    if (!isNewAction(state, entityId, actionStr)) continue;
    const result = handler(state, entityId, nowUs);
    if (!result.ok) {
      emitEvent(state, entityId, action, null, nowUs, result);
    }
  }
}

function expireDodges(state: ActionDispatchState, nowUs: number): void {
  for (const [key, expiresAt] of state.dodgeActive) {
    if (nowUs >= expiresAt) {
      state.dodgeActive.delete(key);
    }
  }
}

function updatePrevActions(state: ActionDispatchState): void {
  const entities = state.store.findEntitiesWith('player-input');
  for (const entityId of entities) {
    const input = state.store.tryGet(entityId, 'player-input') as PlayerInputComponent | undefined;
    if (input === undefined) continue;
    state.prevActions.set(entityId as string, new Set(input.actions));
  }
}

function pruneCooldowns(state: ActionDispatchState, nowUs: number): void {
  for (const [key, entry] of state.cooldowns) {
    if (nowUs >= entry.expiresAtUs) {
      state.cooldowns.delete(key);
    }
  }
}

// ── Health Regeneration ───────────────────────────────────────────

function tickHealthRegen(state: ActionDispatchState, deltaMs: number): void {
  const entities = state.store.findEntitiesWith('health');
  for (const entityId of entities) {
    const health = state.store.tryGet(entityId, 'health') as HealthComponent | undefined;
    if (health === undefined || !health.isAlive) continue;
    if (health.current >= health.maximum) continue;
    if (health.regenerationRate <= 0) continue;

    const regenAmount = health.regenerationRate * (deltaMs / 1000);
    const newCurrent = Math.min(health.maximum, health.current + regenAmount);
    state.store.set(entityId, 'health', {
      current: newCurrent,
      maximum: health.maximum,
      regenerationRate: health.regenerationRate,
      isAlive: true,
    });
  }
}

// ── Factory ───────────────────────────────────────────────────────

/** Priority 150: runs after movement (100), before visual mapping (200). */
const ACTION_DISPATCH_PRIORITY = 150;

function createActionDispatchSystem(deps: ActionDispatchDeps): SystemFn {
  const state: ActionDispatchState = {
    store: deps.componentStore,
    clock: deps.clock,
    eventSink: deps.eventSink,
    cooldowns: new Map(),
    dodgeActive: new Map(),
    prevActions: new Map(),
  };

  return (context: SystemContext) => {
    const nowUs = deps.clock.nowMicroseconds();

    expireDodges(state, nowUs);

    const entities = state.store.findEntitiesWith('player-input');
    for (const entityId of entities) {
      tickEntity(state, entityId, nowUs);
    }

    tickHealthRegen(state, context.deltaMs);
    updatePrevActions(state);

    if (context.tickNumber % 100 === 0) {
      pruneCooldowns(state, nowUs);
    }
  };
}

// ── Exports ───────────────────────────────────────────────────────

export { createActionDispatchSystem, ACTION_DISPATCH_PRIORITY };
