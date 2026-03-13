/**
 * unity-adapter.ts — Unity rendering-fabric adapter (proof-of-concept).
 *
 * NEXT-STEPS Phase 17.8: "Unity adapter proof-of-concept: validate
 * engine portability."
 *
 * Demonstrates that The Loom's RenderingFabric contract can be satisfied
 * by engines other than UE5.  Unity's WebGL/IL2CPP runtime accepts JSON
 * commands over a WebSocket; this adapter serialises fabric calls into
 * that protocol and deserialises Unity callbacks back.
 *
 * This is a PoC stub — Unity-specific native code would implement the
 * receiving end (`UnityBridge.cs`).
 *
 * Thread: bridge/bridge-loom-ue5/unity-adapter
 * Tier: 2
 */

import type { CapabilityManifest } from '../capabilities.js';
import type { EntityVisualState, VisualUpdate } from '../visual-state.js';
import type {
  RenderingFabric,
  EntityId,
  WorldId,
  PlayerInput,
  PhysicsEvent,
  FabricHealthStatus,
  PlayerInputHandler,
  PhysicsEventHandler,
} from '../rendering-fabric.js';

// ── Transport port ─────────────────────────────────────────────────────

export interface UnityTransportPort {
  readonly send: (command: string, payload: unknown) => Promise<unknown>;
  readonly onMessage: (handler: (event: string, payload: unknown) => void) => void;
  readonly isConnected: () => boolean;
}

// ── Deps ───────────────────────────────────────────────────────────────

export interface UnityAdapterDeps {
  readonly transport: UnityTransportPort;
}

// ── Capability defaults ────────────────────────────────────────────────

function unityCapabilities(): CapabilityManifest {
  return {
    fabricId: 'unity-adapter-poc',
    fabricName: 'Unity (PoC)',
    maxResolution: { width: 3840, height: 2160 },
    maxRefreshRate: 144,
    currentTier: 'high',
    features: {
      naniteGeometry: false, hardwareRayTracing: false, softwareRayTracing: false,
      globalIllumination: true, virtualShadowMaps: true, volumetricClouds: false,
      hairSimulation: false, clothSimulation: false, facialAnimation: true,
      proceduralGeneration: false, metaHumanSupport: false, massEntityFramework: false,
      chaosPhysics: false, metaSoundAudio: false,
    },
    maxVisibleEntities: 5_000,
    supportsWeaveZoneOverlap: false,
    supportsPixelStreaming: false,
    preferredStateUpdateRate: 60,
  };
}

function unityHealthFromRaw(raw: Record<string, unknown>): FabricHealthStatus {
  return {
    healthy: typeof raw['healthy'] === 'boolean' ? raw['healthy'] : false,
    currentFps: typeof raw['currentFps'] === 'number' ? raw['currentFps'] : 0,
    frameTimeMs: typeof raw['frameTimeMs'] === 'number' ? raw['frameTimeMs'] : 0,
    visibleEntities: typeof raw['visibleEntities'] === 'number' ? raw['visibleEntities'] : 0,
    memoryUsageMb: typeof raw['memoryUsageMb'] === 'number' ? raw['memoryUsageMb'] : 0,
    gpuUsagePercent: typeof raw['gpuUsagePercent'] === 'number' ? raw['gpuUsagePercent'] : 0,
  };
}

function unhealthyStats(): FabricHealthStatus {
  return { healthy: false, currentFps: 0, frameTimeMs: 0, visibleEntities: 0, memoryUsageMb: 0, gpuUsagePercent: 0 };
}

// ── Adapter helpers ────────────────────────────────────────────────────

function assertConnected(transport: UnityTransportPort): void {
  if (!transport.isConnected()) throw new Error('Unity transport is not connected');
}

function wireMessageHandlers(
  transport: UnityTransportPort,
  inputHandlers: PlayerInputHandler[],
  physicsHandlers: PhysicsEventHandler[],
): void {
  transport.onMessage((event, payload) => {
    const p = payload as Record<string, unknown>;
    if (event === 'playerInput') inputHandlers.forEach((h) => { h(p as unknown as PlayerInput); });
    if (event === 'physicsEvent') physicsHandlers.forEach((h) => { h(p as unknown as PhysicsEvent); });
  });
}

function makeHealthCheck(transport: UnityTransportPort) {
  return async function healthCheck(): Promise<FabricHealthStatus> {
    if (!transport.isConnected()) return unhealthyStats();
    const raw = await transport.send('healthCheck', {});
    return unityHealthFromRaw(raw as Record<string, unknown>);
  };
}

// ── Adapter implementation ─────────────────────────────────────────────

export function createUnityAdapter(deps: UnityAdapterDeps): RenderingFabric {
  const { transport } = deps;
  const inputHandlers: PlayerInputHandler[] = [];
  const physicsHandlers: PhysicsEventHandler[] = [];
  wireMessageHandlers(transport, inputHandlers, physicsHandlers);

  return Object.freeze({
    negotiate: async () => { await transport.send('negotiate', {}); return unityCapabilities(); },
    pushStateSnapshot: (updates: ReadonlyArray<VisualUpdate>) => { if (transport.isConnected()) void transport.send('pushStateSnapshot', { updates }); },
    spawnVisual: async (entityId: EntityId, initialState: EntityVisualState) => { assertConnected(transport); await transport.send('spawnVisual', { entityId, initialState }); },
    despawnVisual: async (entityId: EntityId) => { assertConnected(transport); await transport.send('despawnVisual', { entityId }); },
    preloadWorld: async (worldId: WorldId, assetManifest: ReadonlyArray<string>) => { assertConnected(transport); await transport.send('preloadWorld', { worldId, assetManifest }); },
    unloadWorld: async (worldId: WorldId) => { assertConnected(transport); await transport.send('unloadWorld', { worldId }); },
    getWeaveZoneRenderer: () => null,
    onPlayerInput: (h: PlayerInputHandler) => { inputHandlers.push(h); },
    onPhysicsEvent: (h: PhysicsEventHandler) => { physicsHandlers.push(h); },
    healthCheck: makeHealthCheck(transport),
    disconnect: async () => { await transport.send('disconnect', {}); },
  });
}
