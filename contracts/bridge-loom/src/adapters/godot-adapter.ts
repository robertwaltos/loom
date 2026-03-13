/**
 * godot-adapter.ts — Godot rendering-fabric adapter (proof-of-concept).
 *
 * NEXT-STEPS Phase 17.8: "Godot adapter proof-of-concept: validate
 * engine portability."
 *
 * Demonstrates that The Loom's RenderingFabric contract can be satisfied
 * by Godot 4.x.  A GDScript / C# bridge plugin receives JSON commands
 * over a WebSocket or named pipe; this adapter serialises fabric calls
 * into that protocol.
 *
 * This is a PoC stub — Godot-specific native code would implement the
 * receiving end (`LoomBridge.gd`).
 *
 * Thread: bridge/bridge-loom-ue5/godot-adapter
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

export interface GodotTransportPort {
  readonly send: (command: string, payload: unknown) => Promise<unknown>;
  readonly onMessage: (handler: (event: string, payload: unknown) => void) => void;
  readonly isConnected: () => boolean;
}

// ── Deps ───────────────────────────────────────────────────────────────

export interface GodotAdapterDeps {
  readonly transport: GodotTransportPort;
}

// ── Capability defaults ────────────────────────────────────────────────

function godotCapabilities(): CapabilityManifest {
  return {
    fabricId: 'godot-adapter-poc',
    fabricName: 'Godot 4 (PoC)',
    maxResolution: { width: 1920, height: 1080 },
    maxRefreshRate: 60,
    currentTier: 'performance',
    features: {
      naniteGeometry: false, hardwareRayTracing: false, softwareRayTracing: true,
      globalIllumination: true, virtualShadowMaps: false, volumetricClouds: false,
      hairSimulation: false, clothSimulation: false, facialAnimation: false,
      proceduralGeneration: true, metaHumanSupport: false, massEntityFramework: false,
      chaosPhysics: false, metaSoundAudio: false,
    },
    maxVisibleEntities: 2_000,
    supportsWeaveZoneOverlap: false,
    supportsPixelStreaming: false,
    preferredStateUpdateRate: 30,
  };
}

function godotHealthFromRaw(raw: Record<string, unknown>): FabricHealthStatus {
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

function assertConnected(transport: GodotTransportPort): void {
  if (!transport.isConnected()) throw new Error('Godot transport is not connected');
}

function wireMessageHandlers(
  transport: GodotTransportPort,
  inputHandlers: PlayerInputHandler[],
  physicsHandlers: PhysicsEventHandler[],
): void {
  transport.onMessage((event, payload) => {
    const p = payload as Record<string, unknown>;
    if (event === 'playerInput') inputHandlers.forEach((h) => { h(p as unknown as PlayerInput); });
    if (event === 'physicsEvent') physicsHandlers.forEach((h) => { h(p as unknown as PhysicsEvent); });
  });
}

function makeHealthCheck(transport: GodotTransportPort) {
  return async function healthCheck(): Promise<FabricHealthStatus> {
    if (!transport.isConnected()) return unhealthyStats();
    const raw = await transport.send('healthCheck', {});
    return godotHealthFromRaw(raw as Record<string, unknown>);
  };
}

// ── Adapter implementation ─────────────────────────────────────────────

export function createGodotAdapter(deps: GodotAdapterDeps): RenderingFabric {
  const { transport } = deps;
  const inputHandlers: PlayerInputHandler[] = [];
  const physicsHandlers: PhysicsEventHandler[] = [];
  wireMessageHandlers(transport, inputHandlers, physicsHandlers);

  return Object.freeze({
    negotiate: async () => { await transport.send('negotiate', {}); return godotCapabilities(); },
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
