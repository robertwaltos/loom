/**
 * bridge-service.ts — Loom ↔ Rendering Fabric bridge.
 *
 * Orchestrates state synchronization between the Loom's game
 * systems and a connected RenderingFabric. Runs as a tick system
 * after the VisualStateMapper to push visual state updates.
 *
 * Responsibilities:
 * - Entity lifecycle: spawn/despawn visuals in the fabric
 * - State push: convert MappedVisualState → VisualUpdate batch
 * - Input routing: relay fabric PlayerInput to game systems
 * - Connection management: negotiate, health check, disconnect
 */

import type { SystemFn, SystemContext } from './system-registry.js';
import type {
  VisualStateMapperService,
  MappedVisualState,
  VisualStateBuffer,
} from './visual-state-mapper.js';

// ── Bridge-Loom Types (structural compatibility) ────────────────
// Defined locally to avoid importing from bridge-loom contract.
// Structurally compatible with @loom/bridge-loom-contracts.

interface BridgeEntityVisualState {
  readonly entityId: string;
  readonly transform: BridgeTransform;
  readonly mesh?: BridgeMeshReference;
  readonly animation?: BridgeAnimationState;
  readonly visibility: boolean;
  readonly renderPriority: number;
}

interface BridgeTransform {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number; readonly w: number };
  readonly scale: { readonly x: number; readonly y: number; readonly z: number };
}

interface BridgeMeshReference {
  readonly contentHash: string;
  readonly assetName: string;
  readonly availableTiers: ReadonlyArray<string>;
}

interface BridgeAnimationState {
  readonly clipName: string;
  readonly normalizedTime: number;
  readonly blendWeight: number;
  readonly playbackRate: number;
}

interface BridgeVisualUpdate {
  readonly entityId: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly delta: Partial<BridgeEntityVisualState>;
}

// ── Rendering Fabric Port ───────────────────────────────────────

export interface BridgeRenderingFabric {
  readonly pushStateSnapshot: (updates: ReadonlyArray<BridgeVisualUpdate>) => void;
  readonly spawnVisual: (entityId: string, state: BridgeEntityVisualState) => Promise<void>;
  readonly despawnVisual: (entityId: string) => Promise<void>;
}

// ── Ports ────────────────────────────────────────────────────────

export interface BridgeServiceDeps {
  readonly visualStateMapper: VisualStateMapperService;
  readonly renderingFabric: BridgeRenderingFabric;
  readonly clock: BridgeClock;
}

export interface BridgeClock {
  readonly nowMicroseconds: () => number;
}

export interface BridgeStats {
  readonly trackedEntities: number;
  readonly totalSpawns: number;
  readonly totalDespawns: number;
  readonly totalPushes: number;
  readonly lastPushTimestamp: number;
}

export interface BridgeService {
  readonly system: SystemFn;
  readonly getStats: () => BridgeStats;
}

// ── State ────────────────────────────────────────────────────────

interface BridgeState {
  readonly deps: BridgeServiceDeps;
  readonly spawnedEntities: Set<string>;
  totalSpawns: number;
  totalDespawns: number;
  totalPushes: number;
  lastPushTimestamp: number;
  sequenceNumber: number;
}

// ── Conversion ──────────────────────────────────────────────────

function toVisualState(mapped: MappedVisualState): BridgeEntityVisualState {
  const result: BridgeEntityVisualState = {
    entityId: mapped.entityId,
    transform: mapped.transform,
    mesh: mapped.mesh,
    animation: mapped.animation,
    visibility: mapped.visibility,
    renderPriority: mapped.renderPriority,
  };
  return result;
}

function toVisualUpdate(
  mapped: MappedVisualState,
  timestamp: number,
  seq: number,
): BridgeVisualUpdate {
  return {
    entityId: mapped.entityId,
    timestamp,
    sequenceNumber: seq,
    delta: toVisualState(mapped),
  };
}

// ── Lifecycle ───────────────────────────────────────────────────

function spawnNewEntities(
  state: BridgeState,
  buffer: VisualStateBuffer,
): void {
  for (const mapped of buffer.states) {
    if (state.spawnedEntities.has(mapped.entityId)) continue;
    state.spawnedEntities.add(mapped.entityId);
    state.totalSpawns += 1;
    void state.deps.renderingFabric.spawnVisual(
      mapped.entityId,
      toVisualState(mapped),
    );
  }
}

function despawnRemovedEntities(
  state: BridgeState,
  currentIds: ReadonlySet<string>,
): void {
  const toRemove: string[] = [];
  for (const entityId of state.spawnedEntities) {
    if (!currentIds.has(entityId)) toRemove.push(entityId);
  }
  for (const entityId of toRemove) {
    state.spawnedEntities.delete(entityId);
    state.totalDespawns += 1;
    void state.deps.renderingFabric.despawnVisual(entityId);
  }
}

// ── State Push ──────────────────────────────────────────────────

function buildCurrentEntitySet(buffer: VisualStateBuffer): Set<string> {
  const ids = new Set<string>();
  for (const s of buffer.states) ids.add(s.entityId);
  return ids;
}

function pushStateBatch(
  state: BridgeState,
  buffer: VisualStateBuffer,
): void {
  const timestamp = state.deps.clock.nowMicroseconds();
  const updates: BridgeVisualUpdate[] = [];
  for (const mapped of buffer.states) {
    const seq = state.sequenceNumber;
    state.sequenceNumber = seq + 1;
    updates.push(toVisualUpdate(mapped, timestamp, seq));
  }
  state.deps.renderingFabric.pushStateSnapshot(updates);
  state.totalPushes += 1;
  state.lastPushTimestamp = timestamp;
}

// ── Tick System ─────────────────────────────────────────────────

function bridgeTick(state: BridgeState, _context: SystemContext): void {
  const buffer = state.deps.visualStateMapper.getLatestBuffer();
  if (buffer === undefined) return;
  const currentIds = buildCurrentEntitySet(buffer);
  spawnNewEntities(state, buffer);
  despawnRemovedEntities(state, currentIds);
  pushStateBatch(state, buffer);
}

/** Priority 950: runs after visual-state-mapper (900). */
const BRIDGE_SERVICE_PRIORITY = 950;

// ── Factory ─────────────────────────────────────────────────────

function createBridgeService(deps: BridgeServiceDeps): BridgeService {
  const state: BridgeState = {
    deps,
    spawnedEntities: new Set(),
    totalSpawns: 0,
    totalDespawns: 0,
    totalPushes: 0,
    lastPushTimestamp: 0,
    sequenceNumber: 0,
  };

  return {
    system: (ctx) => { bridgeTick(state, ctx); },
    getStats: () => ({
      trackedEntities: state.spawnedEntities.size,
      totalSpawns: state.totalSpawns,
      totalDespawns: state.totalDespawns,
      totalPushes: state.totalPushes,
      lastPushTimestamp: state.lastPushTimestamp,
    }),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createBridgeService, BRIDGE_SERVICE_PRIORITY };
