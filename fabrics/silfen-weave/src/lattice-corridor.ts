/**
 * Lattice Corridor — Transit orchestration across the Silfen Weave.
 *
 * Bible v1.1 Part 8: A corridor is the high-level transit operation that
 * coordinates route validation, frequency lock establishment, and entity
 * movement between worlds.
 *
 * Corridor Phases:
 *   ROUTE_VALIDATED  → Route exists, resonance checked
 *   LOCK_INITIATED   → Frequency lock started, coherence climbing
 *   TRANSIT_ACTIVE   → Lock achieved transit threshold, entity moving
 *   ARRIVED          → Entity reached destination (terminal)
 *   ABORTED          → Transit cancelled before lock achieved (terminal)
 *   COLLAPSED        → Lock collapsed during transit (terminal)
 *
 * The corridor owns no subsystems — it delegates to injected ports
 * (LatticeNodeRegistry, FrequencyLockEngine) and emits transit events.
 */

import {
  corridorNotFound,
  corridorAlreadyExists,
  corridorNoRoute,
  corridorEntityInTransit,
  corridorInvalidPhase,
} from './weave-errors.js';
import type { LatticeRoute } from './lattice-node.js';
import type { FrequencyLock, LockTransition } from './frequency-lock.js';

// ─── Types ───────────────────────────────────────────────────────────

export type CorridorPhase =
  | 'route_validated'
  | 'lock_initiated'
  | 'transit_active'
  | 'arrived'
  | 'aborted'
  | 'collapsed';

export interface TransitCorridor {
  readonly corridorId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly phase: CorridorPhase;
  readonly lockId: string | null;
  readonly route: LatticeRoute;
  readonly createdAt: number;
  readonly completedAt: number | null;
  readonly failureReason: string | null;
}

export interface OpenCorridorParams {
  readonly corridorId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
}

export interface CorridorTransition {
  readonly corridorId: string;
  readonly from: CorridorPhase;
  readonly to: CorridorPhase;
  readonly at: number;
}

export interface TransitEvent {
  readonly corridorId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly phase: CorridorPhase;
  readonly at: number;
}

// ─── Ports ─────────────────────────────────────────────────────────

export interface CorridorNodePort {
  getRoute(originId: string, destinationId: string): LatticeRoute | undefined;
}

export interface CorridorLockPort {
  initiateLock(params: {
    readonly lockId: string;
    readonly originNodeId: string;
    readonly destinationNodeId: string;
    readonly entityId: string;
    readonly distanceLY: number;
    readonly fieldCondition: number;
  }): FrequencyLock;
  updateCoherence(lockId: string, coherence: number): LockTransition | null;
  completeLock(lockId: string): LockTransition;
  abortLock(lockId: string, reason: string): LockTransition;
  triggerPartialCollapse(lockId: string, reason: string): LockTransition;
}

export interface CorridorIdGenerator {
  next(): string;
}

// ─── Engine Interface ────────────────────────────────────────────────

export interface LatticeCorridorEngine {
  openCorridor(params: OpenCorridorParams): TransitCorridor;
  initiateLock(corridorId: string, fieldCondition: number): TransitCorridor;
  advanceCoherence(corridorId: string, coherence: number): CorridorTransition | null;
  completeTransit(corridorId: string): CorridorTransition;
  abortCorridor(corridorId: string, reason: string): CorridorTransition;
  collapseCorridor(corridorId: string, reason: string): CorridorTransition;
  getCorridor(corridorId: string): TransitCorridor;
  tryGetCorridor(corridorId: string): TransitCorridor | undefined;
  getActiveByEntity(entityId: string): TransitCorridor | undefined;
  countActive(): number;
}

// ─── Deps ──────────────────────────────────────────────────────────

export interface LatticeCorridorDeps {
  readonly nodePort: CorridorNodePort;
  readonly lockPort: CorridorLockPort;
  readonly idGenerator: CorridorIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── State ─────────────────────────────────────────────────────────

interface MutableCorridor {
  readonly corridorId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  phase: CorridorPhase;
  lockId: string | null;
  readonly route: LatticeRoute;
  readonly createdAt: number;
  completedAt: number | null;
  failureReason: string | null;
}

interface CorridorState {
  readonly corridors: Map<string, MutableCorridor>;
}

const TERMINAL_PHASES: ReadonlyArray<CorridorPhase> = [
  'arrived', 'aborted', 'collapsed',
];

// ─── Factory ───────────────────────────────────────────────────────

export function createLatticeCorridorEngine(
  deps: LatticeCorridorDeps,
): LatticeCorridorEngine {
  const state: CorridorState = { corridors: new Map() };
  return {
    openCorridor: (p) => openCorridorImpl(state, deps, p),
    initiateLock: (id, fc) => initiateLockImpl(state, deps, id, fc),
    advanceCoherence: (id, c) => advanceCoherenceImpl(state, deps, id, c),
    completeTransit: (id) => completeTransitImpl(state, deps, id),
    abortCorridor: (id, r) => abortCorridorImpl(state, deps, id, r),
    collapseCorridor: (id, r) => collapseCorridorImpl(state, deps, id, r),
    getCorridor: (id) => getCorridorImpl(state, id),
    tryGetCorridor: (id) => tryGetCorridorImpl(state, id),
    getActiveByEntity: (eid) => getActiveByEntityImpl(state, eid),
    countActive: () => countActiveImpl(state),
  };
}

// ─── Open Corridor ─────────────────────────────────────────────────

function openCorridorImpl(
  state: CorridorState,
  deps: LatticeCorridorDeps,
  params: OpenCorridorParams,
): TransitCorridor {
  if (state.corridors.has(params.corridorId)) {
    throw corridorAlreadyExists(params.corridorId);
  }
  assertNoActiveTransit(state, params.entityId);
  const route = resolveRoute(deps, params.originNodeId, params.destinationNodeId);
  const corridor: MutableCorridor = {
    corridorId: params.corridorId,
    entityId: params.entityId,
    originNodeId: params.originNodeId,
    destinationNodeId: params.destinationNodeId,
    phase: 'route_validated',
    lockId: null,
    route,
    createdAt: deps.clock.nowMicroseconds(),
    completedAt: null,
    failureReason: null,
  };
  state.corridors.set(params.corridorId, corridor);
  return toReadonly(corridor);
}

function resolveRoute(
  deps: LatticeCorridorDeps,
  originId: string,
  destinationId: string,
): LatticeRoute {
  const route = deps.nodePort.getRoute(originId, destinationId);
  if (route === undefined) {
    throw corridorNoRoute(originId, destinationId);
  }
  return route;
}

function assertNoActiveTransit(state: CorridorState, entityId: string): void {
  const active = findActiveByEntity(state, entityId);
  if (active !== undefined) {
    throw corridorEntityInTransit(entityId);
  }
}

// ─── Initiate Lock ─────────────────────────────────────────────────

function initiateLockImpl(
  state: CorridorState,
  deps: LatticeCorridorDeps,
  corridorId: string,
  fieldCondition: number,
): TransitCorridor {
  const corridor = getMutable(state, corridorId);
  assertPhase(corridor, 'route_validated');
  const lockId = deps.idGenerator.next();
  deps.lockPort.initiateLock({
    lockId,
    originNodeId: corridor.originNodeId,
    destinationNodeId: corridor.destinationNodeId,
    entityId: corridor.entityId,
    distanceLY: corridor.route.distanceLY,
    fieldCondition,
  });
  corridor.lockId = lockId;
  corridor.phase = 'lock_initiated';
  return toReadonly(corridor);
}

// ─── Advance Coherence ─────────────────────────────────────────────

function advanceCoherenceImpl(
  state: CorridorState,
  deps: LatticeCorridorDeps,
  corridorId: string,
  coherence: number,
): CorridorTransition | null {
  const corridor = getMutable(state, corridorId);
  assertLockPhase(corridor);
  const lockTransition = deps.lockPort.updateCoherence(corridor.lockId as string, coherence);
  if (lockTransition === null) return null;
  if (lockTransition.to !== 'transit_executing') return null;
  return transitionTo(corridor, 'transit_active', deps.clock.nowMicroseconds());
}

function assertLockPhase(corridor: MutableCorridor): void {
  if (corridor.phase !== 'lock_initiated' && corridor.phase !== 'transit_active') {
    throw corridorInvalidPhase(corridor.corridorId, corridor.phase, 'lock_initiated');
  }
}

// ─── Complete Transit ──────────────────────────────────────────────

function completeTransitImpl(
  state: CorridorState,
  deps: LatticeCorridorDeps,
  corridorId: string,
): CorridorTransition {
  const corridor = getMutable(state, corridorId);
  assertPhase(corridor, 'transit_active');
  deps.lockPort.completeLock(corridor.lockId as string);
  return applyTerminal(corridor, 'arrived', null, deps.clock.nowMicroseconds());
}

// ─── Abort Corridor ────────────────────────────────────────────────

function abortCorridorImpl(
  state: CorridorState,
  deps: LatticeCorridorDeps,
  corridorId: string,
  reason: string,
): CorridorTransition {
  const corridor = getMutable(state, corridorId);
  if (corridor.phase !== 'route_validated' && corridor.phase !== 'lock_initiated') {
    throw corridorInvalidPhase(corridor.corridorId, corridor.phase, 'route_validated|lock_initiated');
  }
  if (corridor.lockId !== null) {
    deps.lockPort.abortLock(corridor.lockId, reason);
  }
  return applyTerminal(corridor, 'aborted', reason, deps.clock.nowMicroseconds());
}

// ─── Collapse Corridor ─────────────────────────────────────────────

function collapseCorridorImpl(
  state: CorridorState,
  deps: LatticeCorridorDeps,
  corridorId: string,
  reason: string,
): CorridorTransition {
  const corridor = getMutable(state, corridorId);
  assertPhase(corridor, 'transit_active');
  deps.lockPort.triggerPartialCollapse(corridor.lockId as string, reason);
  return applyTerminal(corridor, 'collapsed', reason, deps.clock.nowMicroseconds());
}

// ─── Queries ───────────────────────────────────────────────────────

function getCorridorImpl(state: CorridorState, corridorId: string): TransitCorridor {
  return toReadonly(getMutable(state, corridorId));
}

function tryGetCorridorImpl(
  state: CorridorState,
  corridorId: string,
): TransitCorridor | undefined {
  const corridor = state.corridors.get(corridorId);
  return corridor !== undefined ? toReadonly(corridor) : undefined;
}

function getActiveByEntityImpl(
  state: CorridorState,
  entityId: string,
): TransitCorridor | undefined {
  const found = findActiveByEntity(state, entityId);
  return found !== undefined ? toReadonly(found) : undefined;
}

function countActiveImpl(state: CorridorState): number {
  let count = 0;
  for (const c of state.corridors.values()) {
    if (!isTerminal(c.phase)) count += 1;
  }
  return count;
}

// ─── Helpers ───────────────────────────────────────────────────────

function getMutable(state: CorridorState, corridorId: string): MutableCorridor {
  const corridor = state.corridors.get(corridorId);
  if (corridor === undefined) throw corridorNotFound(corridorId);
  return corridor;
}

function assertPhase(corridor: MutableCorridor, expected: CorridorPhase): void {
  if (corridor.phase !== expected) {
    throw corridorInvalidPhase(corridor.corridorId, corridor.phase, expected);
  }
}

function transitionTo(
  corridor: MutableCorridor,
  to: CorridorPhase,
  now: number,
): CorridorTransition {
  const from = corridor.phase;
  corridor.phase = to;
  return { corridorId: corridor.corridorId, from, to, at: now };
}

function applyTerminal(
  corridor: MutableCorridor,
  to: CorridorPhase,
  reason: string | null,
  now: number,
): CorridorTransition {
  const from = corridor.phase;
  corridor.phase = to;
  corridor.completedAt = now;
  corridor.failureReason = reason;
  return { corridorId: corridor.corridorId, from, to, at: now };
}

function findActiveByEntity(
  state: CorridorState,
  entityId: string,
): MutableCorridor | undefined {
  for (const c of state.corridors.values()) {
    if (c.entityId === entityId && !isTerminal(c.phase)) return c;
  }
  return undefined;
}

function isTerminal(phase: CorridorPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

function toReadonly(corridor: MutableCorridor): TransitCorridor {
  return {
    corridorId: corridor.corridorId,
    entityId: corridor.entityId,
    originNodeId: corridor.originNodeId,
    destinationNodeId: corridor.destinationNodeId,
    phase: corridor.phase,
    lockId: corridor.lockId,
    route: corridor.route,
    createdAt: corridor.createdAt,
    completedAt: corridor.completedAt,
    failureReason: corridor.failureReason,
  };
}
