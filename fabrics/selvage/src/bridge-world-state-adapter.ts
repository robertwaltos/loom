/**
 * bridge-world-state-adapter.ts — Bridges BridgeService → BridgeWorldStateProvider.
 *
 * Adapts the game orchestrator's bridge service (which pushes visual
 * state snapshots each tick) into the BridgeWorldStateProvider interface
 * consumed by BridgeGrpcServer for broadcasting to UE5 clients.
 *
 * The adapter observes entity spawn/despawn and state push events,
 * converting MappedVisualState → FlatBuffer-ready ServerStreamMessages
 * with proper sequencing and timestamps.
 *
 * Thread: bridge/selvage/bridge-world-state-adapter
 * Tier: 1
 */

import type {
  BridgeWorldStateProvider,
  ServerStreamMessage,
  BridgeGrpcClockPort,
} from './bridge-grpc-server.js';
import {
  buildEntitySnapshot,
  buildEntitySpawn,
  buildEntityDespawn,
  DespawnReason,
} from '@loom/protocols-contracts';
import type {
  EntitySnapshotData,
  EntitySpawnData,
  TransformData,
} from '@loom/protocols-contracts';

// ── Types from bridge-service (structural compatibility) ─────────

interface BridgeVisualUpdate {
  readonly entityId: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly delta: Partial<{
    readonly entityId: string;
    readonly transform: {
      readonly position: { readonly x: number; readonly y: number; readonly z: number };
      readonly rotation: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
        readonly w: number;
      };
      readonly scale: { readonly x: number; readonly y: number; readonly z: number };
    };
    readonly mesh?: {
      readonly contentHash: string;
      readonly assetName: string;
      readonly availableTiers: ReadonlyArray<string>;
    };
    readonly animation?: {
      readonly clipName: string;
      readonly normalizedTime: number;
      readonly blendWeight: number;
      readonly playbackRate: number;
    };
    readonly visibility: boolean;
    readonly renderPriority: number;
  }>;
}

// ── Ports ────────────────────────────────────────────────────────

export interface WorldStateAdapterDeps {
  readonly clock: BridgeGrpcClockPort;
}

// ── State ────────────────────────────────────────────────────────

interface AdapterState {
  readonly clock: BridgeGrpcClockPort;
  spawnQueue: ServerStreamMessage[];
  despawnQueue: ServerStreamMessage[];
  snapshotBuffer: ServerStreamMessage[];
  facialPoses: ServerStreamMessage[];
  timeWeather: ServerStreamMessage | undefined;
  sequence: number;
}

// ── Serialization helpers (FlatBuffers binary on hot path) ───────

const IDENTITY_TRANSFORM: TransformData = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

function toTransformData(t: BridgeVisualUpdate['delta']['transform']): TransformData {
  if (!t) return IDENTITY_TRANSFORM;
  return {
    position: { x: t.position.x, y: t.position.y, z: t.position.z },
    rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z, w: t.rotation.w },
    scale: { x: t.scale.x, y: t.scale.y, z: t.scale.z },
  };
}

function toSnapshotData(entityId: string, delta: BridgeVisualUpdate['delta']): EntitySnapshotData {
  return {
    entityId,
    transform: toTransformData(delta.transform),
    meshHash: delta.mesh?.contentHash ?? '',
    animationClip: delta.animation?.clipName ?? '',
    animationTime: delta.animation?.normalizedTime ?? 0,
    animationBlend: delta.animation?.blendWeight ?? 1,
    animationRate: delta.animation?.playbackRate ?? 1,
    materialOverrides: [],
    visibility: delta.visibility ?? true,
    renderPriority: delta.renderPriority ?? 0,
    lodBias: 1.0,
  };
}

function encodeSnapshotPayload(update: BridgeVisualUpdate): Uint8Array {
  return buildEntitySnapshot(toSnapshotData(update.entityId, update.delta));
}

function encodeSpawnPayload(entityId: string, update: BridgeVisualUpdate): Uint8Array {
  const spawnData: EntitySpawnData = {
    entityId,
    initialState: toSnapshotData(entityId, update.delta),
    archetype: 'default',
    metahumanPreset: '',
  };
  return buildEntitySpawn(spawnData);
}

function encodeDespawnPayload(entityId: string): Uint8Array {
  return buildEntityDespawn({ entityId, reason: DespawnReason.Normal });
}

// ── Building ServerStreamMessages from visual updates ────────────

function buildEntitySnapshotMessage(
  state: AdapterState,
  update: BridgeVisualUpdate,
): ServerStreamMessage {
  const seq = state.sequence++;
  return {
    type: 'entity-snapshot',
    sequenceNumber: seq,
    timestamp: state.clock.nowMicroseconds(),
    payload: encodeSnapshotPayload(update),
  };
}

function buildSpawnMessage(
  state: AdapterState,
  entityId: string,
  update: BridgeVisualUpdate,
): ServerStreamMessage {
  const seq = state.sequence++;
  return {
    type: 'entity-spawn',
    sequenceNumber: seq,
    timestamp: state.clock.nowMicroseconds(),
    payload: encodeSpawnPayload(entityId, update),
  };
}

function buildDespawnMessage(
  state: AdapterState,
  entityId: string,
): ServerStreamMessage {
  const seq = state.sequence++;
  return {
    type: 'entity-despawn',
    sequenceNumber: seq,
    timestamp: state.clock.nowMicroseconds(),
    payload: encodeDespawnPayload(entityId),
  };
}

// ── WorldStateProvider Implementation ────────────────────────────

function createWorldStateProvider(): BridgeWorldStateProvider {
  // Stubs — the adapter fills these after onStatePush
  let snapshotBuffer: ServerStreamMessage[] = [];
  let spawnQueue: ServerStreamMessage[] = [];
  let despawnQueue: ServerStreamMessage[] = [];
  let facialPoses: ServerStreamMessage[] = [];
  let timeWeather: ServerStreamMessage | undefined;

  return {
    getEntitySnapshots: () => snapshotBuffer,
    getSpawnQueue: () => spawnQueue,
    getDespawnQueue: () => despawnQueue,
    getTimeWeather: () => timeWeather,
    getFacialPoseUpdates: () => facialPoses,
    clearQueues: () => {
      snapshotBuffer = [];
      spawnQueue = [];
      despawnQueue = [];
      facialPoses = [];
      timeWeather = undefined;
    },
  };
}

// ── Adapter: full bridge ─────────────────────────────────────────

export interface BridgeWorldStateAdapter {
  /** The provider to register with BridgeGrpcServer */
  readonly provider: BridgeWorldStateProvider;
  /** Call when the BridgeService pushes a state batch */
  readonly onStatePush: (updates: ReadonlyArray<BridgeVisualUpdate>) => void;
  /** Call when an entity is spawned to the rendering fabric */
  readonly onEntitySpawn: (entityId: string, update: BridgeVisualUpdate) => void;
  /** Call when an entity is despawned from the rendering fabric */
  readonly onEntityDespawn: (entityId: string) => void;
  /** Push time/weather data for the current tick */
  readonly onTimeWeatherUpdate: (msg: ServerStreamMessage) => void;
  /** Push facial pose updates for the current tick */
  readonly onFacialPoseUpdate: (msg: ServerStreamMessage) => void;
}

function createBridgeWorldStateAdapter(
  deps: WorldStateAdapterDeps,
): BridgeWorldStateAdapter {
  const state: AdapterState = {
    clock: deps.clock,
    spawnQueue: [],
    despawnQueue: [],
    snapshotBuffer: [],
    facialPoses: [],
    timeWeather: undefined,
    sequence: 0,
  };

  // The internal provider reads from state queues
  const provider: BridgeWorldStateProvider = {
    getEntitySnapshots: () => state.snapshotBuffer,
    getSpawnQueue: () => state.spawnQueue,
    getDespawnQueue: () => state.despawnQueue,
    getTimeWeather: () => state.timeWeather,
    getFacialPoseUpdates: () => state.facialPoses,
    clearQueues: () => {
      state.snapshotBuffer = [];
      state.spawnQueue = [];
      state.despawnQueue = [];
      state.facialPoses = [];
      state.timeWeather = undefined;
    },
  };

  return {
    provider,

    onStatePush: (updates) => {
      for (const update of updates) {
        state.snapshotBuffer.push(buildEntitySnapshotMessage(state, update));
      }
    },

    onEntitySpawn: (entityId, update) => {
      state.spawnQueue.push(buildSpawnMessage(state, entityId, update));
    },

    onEntityDespawn: (entityId) => {
      state.despawnQueue.push(buildDespawnMessage(state, entityId));
    },

    onTimeWeatherUpdate: (msg) => {
      state.timeWeather = msg;
    },

    onFacialPoseUpdate: (msg) => {
      state.facialPoses.push(msg);
    },
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createBridgeWorldStateAdapter, createWorldStateProvider };
