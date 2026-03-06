/**
 * Rendering Fabric Interface
 *
 * THE contract between The Loom and any rendering engine.
 * UE5 implements this. UE6 will implement this. Any future engine
 * implements this. The Loom never knows or cares what's behind it.
 *
 * Communication is async and decoupled:
 * - The Loom pushes state snapshots at its own tick rate
 * - The Rendering Fabric interpolates between snapshots
 * - Events flow back up for player input and physics results
 */

import type { CapabilityManifest } from './capabilities.js';
import type { EntityVisualState, VisualUpdate } from './visual-state.js';
import type { WeaveZoneRenderer } from './weave-zone-renderer.js';

/** Entity identifier — opaque to the rendering fabric */
export type EntityId = string & { readonly __brand: 'EntityId' };

/** World identifier — which logical world this entity belongs to */
export type WorldId = string & { readonly __brand: 'WorldId' };

/** Correlation ID for tracing events across systems */
export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

export interface RenderingFabric {
  /**
   * Called once when the fabric connects to The Loom.
   * Returns what this fabric can do.
   */
  negotiate(): Promise<CapabilityManifest>;

  /**
   * Push a batch of entity visual state updates.
   * The fabric interpolates between these snapshots for smooth rendering.
   * Called at The Loom's tick rate (typically 30-60Hz), NOT per-frame.
   */
  pushStateSnapshot(updates: ReadonlyArray<VisualUpdate>): void;

  /**
   * Spawn a visual representation of an entity.
   * The fabric creates whatever actors/meshes/materials are needed.
   */
  spawnVisual(entityId: EntityId, initialState: EntityVisualState): Promise<void>;

  /**
   * Remove the visual representation of an entity.
   * Cleanup all rendering resources.
   */
  despawnVisual(entityId: EntityId): Promise<void>;

  /**
   * Begin streaming assets for a world the player is approaching.
   * Called by The Silfen Weave before the player enters a Weave Zone.
   */
  preloadWorld(worldId: WorldId, assetManifest: ReadonlyArray<string>): Promise<void>;

  /**
   * Unload assets for a world the player has fully left.
   */
  unloadWorld(worldId: WorldId): Promise<void>;

  /**
   * Get the Weave Zone renderer for managing dual-world transitions.
   * Returns null if this fabric doesn't support overlap rendering.
   */
  getWeaveZoneRenderer(): WeaveZoneRenderer | null;

  /**
   * Subscribe to player input events from the rendering fabric.
   * The Loom processes these and decides game state changes.
   */
  onPlayerInput(handler: PlayerInputHandler): void;

  /**
   * Subscribe to physics events the rendering fabric reports back.
   * E.g., collision results that affect game logic.
   */
  onPhysicsEvent(handler: PhysicsEventHandler): void;

  /**
   * Health check. The Inspector calls this periodically.
   */
  healthCheck(): Promise<FabricHealthStatus>;

  /**
   * Graceful shutdown.
   */
  disconnect(): Promise<void>;
}

export type PlayerInputHandler = (input: PlayerInput) => void;
export type PhysicsEventHandler = (event: PhysicsEvent) => void;

export interface PlayerInput {
  readonly correlationId: CorrelationId;
  readonly entityId: EntityId;
  readonly timestamp: number;
  readonly type: string;
  readonly payload: Uint8Array;
}

export interface PhysicsEvent {
  readonly correlationId: CorrelationId;
  readonly entityId: EntityId;
  readonly timestamp: number;
  readonly type: string;
  readonly payload: Uint8Array;
}

export interface FabricHealthStatus {
  readonly healthy: boolean;
  readonly currentFps: number;
  readonly frameTimeMs: number;
  readonly visibleEntities: number;
  readonly memoryUsageMb: number;
  readonly gpuUsagePercent: number;
}
