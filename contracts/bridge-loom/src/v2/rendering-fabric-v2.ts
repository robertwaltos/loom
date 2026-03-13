/**
 * Bridge Loom Contract — v2
 *
 * V1 contract is locked (backward-compatible; no breaking changes).
 * V2 adds capabilities negotiated during this phase:
 *
 *   • contractVersion field in all negotiation responses
 *   • Audio state push: loom-controlled positional audio
 *   • Batch input subscriptions (replace single handler registration)
 *   • Hot-swap support: fabric can signal readiness to swap without disconnect
 *   • Diagnostic observer: side-channel metrics without polluting the main path
 *   • migrateFromV1: adapter helper to promote V1 implementations to V2
 *
 * V2 is a strict superset of V1. Any V1 implementation wraps cleanly via
 * `wrapV1AsV2`.
 *
 * Thread: cotton/contracts/bridge-loom/v2
 * Tier: 0
 */

import type {
  RenderingFabric,
  EntityId,
  CorrelationId,
  PlayerInput,
  PhysicsEvent,
} from '../rendering-fabric.js';
import type { CapabilityManifest } from '../capabilities.js';

// ── V2 contract version ───────────────────────────────────────────────

export const BRIDGE_LOOM_CONTRACT_VERSION = '2.0.0' as const;

// ── Audio state push (new in v2) ─────────────────────────────────────

export interface AudioCue {
  readonly correlationId: CorrelationId;
  readonly entityId: EntityId;
  readonly clipContentHash: string;
  readonly volume: number;
  readonly pitch: number;
  readonly looping: boolean;
  readonly spatialBlend: number;
}

export type AudioAction = 'play' | 'stop' | 'pause' | 'resume';

export interface AudioUpdate {
  readonly action: AudioAction;
  readonly cue: AudioCue;
}

// ── Batch input handler (replaces single onPlayerInput) ──────────────

export type BatchInputHandler = (inputs: ReadonlyArray<PlayerInput>) => void;
export type BatchPhysicsHandler = (events: ReadonlyArray<PhysicsEvent>) => void;

// ── Diagnostics observer (new in v2) ─────────────────────────────────

export interface FabricDiagnosticFrame {
  readonly timestamp: number;
  readonly drawCalls: number;
  readonly triangleCount: number;
  readonly gpuFrameMs: number;
  readonly cpuFrameMs: number;
  readonly entitiesRendered: number;
}

export type DiagnosticsObserver = (frame: FabricDiagnosticFrame) => void;

// ── Hot-swap signal (new in v2) ───────────────────────────────────────

export interface HotSwapReadySignal {
  readonly fabricId: string;
  readonly incomingFabricId: string;
  readonly handoffToken: string;
}

export type HotSwapHandler = (signal: HotSwapReadySignal) => void;

// ── Extended capability manifest (v2 superset) ────────────────────────

export interface CapabilityManifestV2 extends CapabilityManifest {
  readonly contractVersion: typeof BRIDGE_LOOM_CONTRACT_VERSION;
  readonly supportsAudioStatePush: boolean;
  readonly supportsBatchInputHandlers: boolean;
  readonly supportsDiagnosticsObserver: boolean;
  readonly supportsHotSwap: boolean;
}

// ── RenderingFabricV2 interface ───────────────────────────────────────

export interface RenderingFabricV2 extends Omit<RenderingFabric, 'negotiate'> {
  /** V2 negotiate returns extended manifest */
  negotiate(): Promise<CapabilityManifestV2>;

  /** Push positional audio cues — new in v2 */
  pushAudioUpdates(updates: ReadonlyArray<AudioUpdate>): void;

  /** Batch input subscription — supersedes onPlayerInput for v2 */
  onBatchPlayerInput(handler: BatchInputHandler): void;

  /** Batch physics subscription — supersedes onPhysicsEvent for v2 */
  onBatchPhysicsEvent(handler: BatchPhysicsHandler): void;

  /** Diagnostics side-channel — non-blocking, best-effort */
  subscribeDiagnostics(observer: DiagnosticsObserver): () => void;

  /** Hot-swap readiness notification */
  onHotSwapReady(handler: HotSwapHandler): void;
}

// ── V1 → V2 adapter ──────────────────────────────────────────────────

function buildV2Manifest(v1: CapabilityManifest): CapabilityManifestV2 {
  return {
    ...v1,
    contractVersion: BRIDGE_LOOM_CONTRACT_VERSION,
    supportsAudioStatePush: false,
    supportsBatchInputHandlers: false,
    supportsDiagnosticsObserver: false,
    supportsHotSwap: false,
  };
}

function buildV1BridgeMethods(v1: RenderingFabric): Pick<
  RenderingFabricV2,
  'pushStateSnapshot' | 'spawnVisual' | 'despawnVisual' | 'preloadWorld' | 'unloadWorld' |
  'getWeaveZoneRenderer' | 'onPlayerInput' | 'onPhysicsEvent' | 'healthCheck' | 'disconnect'
> {
  return {
    pushStateSnapshot: (u) => { v1.pushStateSnapshot(u); },
    spawnVisual: (id, s) => v1.spawnVisual(id, s),
    despawnVisual: (id) => v1.despawnVisual(id),
    preloadWorld: (id, m) => v1.preloadWorld(id, m),
    unloadWorld: (id) => v1.unloadWorld(id),
    getWeaveZoneRenderer: () => v1.getWeaveZoneRenderer(),
    onPlayerInput: (h) => { v1.onPlayerInput(h); },
    onPhysicsEvent: (h) => { v1.onPhysicsEvent(h); },
    healthCheck: () => v1.healthCheck(),
    disconnect: () => v1.disconnect(),
  };
}

function buildV2NoOpMethods(): Pick<
  RenderingFabricV2,
  'pushAudioUpdates' | 'onBatchPlayerInput' | 'onBatchPhysicsEvent' | 'subscribeDiagnostics' | 'onHotSwapReady'
> {
  return {
    pushAudioUpdates: () => undefined,
    onBatchPlayerInput: () => undefined,
    onBatchPhysicsEvent: () => undefined,
    subscribeDiagnostics: () => () => undefined,
    onHotSwapReady: () => undefined,
  };
}

/**
 * Wraps a V1 RenderingFabric to satisfy the V2 interface.
 * V2-only features are no-ops; callers must check capability flags first.
 */
export function wrapV1AsV2(v1: RenderingFabric): RenderingFabricV2 {
  return {
    async negotiate(): Promise<CapabilityManifestV2> {
      return buildV2Manifest(await v1.negotiate());
    },
    ...buildV1BridgeMethods(v1),
    ...buildV2NoOpMethods(),
  };
}
