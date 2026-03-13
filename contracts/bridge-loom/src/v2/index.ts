/**
 * Bridge Loom Contract — v2 barrel
 *
 * Re-exports all v2 types and the V1→V2 adapter.
 * Also re-exports v1 types so callers can import from one place.
 */

export type {
  RenderingFabricV2,
  CapabilityManifestV2,
  AudioCue,
  AudioUpdate,
  AudioAction,
  BatchInputHandler,
  BatchPhysicsHandler,
  FabricDiagnosticFrame,
  DiagnosticsObserver,
  HotSwapReadySignal,
  HotSwapHandler,
} from './rendering-fabric-v2.js';

export { BRIDGE_LOOM_CONTRACT_VERSION, wrapV1AsV2 } from './rendering-fabric-v2.js';

// v1 re-exports for convenience
export type { RenderingFabric, EntityId, WorldId, CorrelationId } from '../rendering-fabric.js';
export type { CapabilityManifest, RenderingTier } from '../capabilities.js';
export type { EntityVisualState, VisualUpdate } from '../visual-state.js';
export type { WeaveZoneRenderer } from '../weave-zone-renderer.js';
