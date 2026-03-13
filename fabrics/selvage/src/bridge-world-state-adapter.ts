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

// ── Serialization helpers ────────────────────────────────────────
// Encode payloads as JSON bytes. When the FlatBuffers codegen is
// integrated into the tick path, swap these to use buildEntity*.

const encoder = new TextEncoder();

function encodeSnapshotPayload(update: BridgeVisualUpdate): Uint8Array {
  const delta = update.delta;
  return encoder.encode(JSON.stringify({
    entity_id: update.entityId,
    transform: delta.transform
      ? {
          px: delta.transform.position.x,
          py: delta.transform.position.y,
          pz: delta.transform.position.z,
          rx: delta.transform.rotation.x,
          ry: delta.transform.rotation.y,
          rz: delta.transform.rotation.z,
          rw: delta.transform.rotation.w,
          sx: delta.transform.scale.x,
          sy: delta.transform.scale.y,
          sz: delta.transform.scale.z,
        }
      : undefined,
    mesh_hash: delta.mesh?.contentHash,
    animation_clip: delta.animation?.clipName,
    animation_time: delta.animation?.normalizedTime,
    animation_blend: delta.animation?.blendWeight,
    animation_rate: delta.animation?.playbackRate,
    visibility: delta.visibility,
    lod_bias: delta.renderPriority,
  }));
}

function encodeSpawnPayload(entityId: string, update: BridgeVisualUpdate): Uint8Array {
  return encoder.encode(JSON.stringify({
    entity_id: entityId,
    archetype: 'default',
    initial_state: {
      entity_id: entityId,
      transform: update.delta.transform
        ? {
            px: update.delta.transform.position.x,
            py: update.delta.transform.position.y,
            pz: update.delta.transform.position.z,
          }
        : { px: 0, py: 0, pz: 0 },
      mesh_hash: update.delta.mesh?.contentHash ?? '',
    },
  }));
}

function encodeDespawnPayload(entityId: string, reason: string): Uint8Array {
  return encoder.encode(JSON.stringify({
    entity_id: entityId,
    reason,
  }));
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
    payload: encodeDespawnPayload(entityId, 'Normal'),
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
