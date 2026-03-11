/**
 * Visual State Types
 *
 * These types describe how an entity LOOKS, not what it IS.
 * The Loom owns game state. The Rendering Fabric owns visual state.
 * This contract maps between them.
 *
 * All values are resolution-independent (world units, not pixels).
 * The rendering fabric handles the projection to screen space.
 */

import type { EntityId } from './rendering-fabric.js';

export interface EntityVisualState {
  readonly entityId: EntityId;
  readonly transform: Transform;
  readonly mesh?: MeshReference;
  readonly animation?: AnimationState;
  readonly materialOverrides?: ReadonlyArray<MaterialOverride>;
  readonly facialPose?: FacialPoseState;
  readonly visibility: boolean;
  readonly renderPriority: number;
}

export interface VisualUpdate {
  readonly entityId: EntityId;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly delta: Partial<EntityVisualState>;
}

export interface Transform {
  readonly position: Vector3;
  readonly rotation: Quaternion;
  readonly scale: Vector3;
}

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface MeshReference {
  /** Content-addressed hash — not a file path. Same asset = same hash. */
  readonly contentHash: string;
  /** Logical asset name for debugging */
  readonly assetName: string;
  /** Quality tier variants available for this mesh */
  readonly availableTiers: ReadonlyArray<string>;
}

export interface AnimationState {
  readonly clipName: string;
  readonly normalizedTime: number;
  readonly blendWeight: number;
  readonly playbackRate: number;
}

export interface MaterialOverride {
  readonly slotIndex: number;
  readonly parameterName: string;
  readonly value: number | Vector3 | string;
}

/**
 * Facial pose state for MetaHuman / ARKit blend shape targets.
 * 52 standard ARKit blend shapes mapped to morph target weights.
 * Driven by the Loom Shuttle (AI NPC) or motion capture.
 */
export interface FacialPoseState {
  /** Blend shape weights keyed by ARKit name (0.0 – 1.0) */
  readonly blendShapes: Readonly<Record<string, number>>;
  /** High-level emotion tag for animation blending */
  readonly emotionTag?: string;
  /** Current viseme for lip sync (e.g., 'AA', 'EE', 'OH') */
  readonly speechViseme?: string;
  /** Speech amplitude for jaw/lip intensity (0.0 – 1.0) */
  readonly speechAmplitude?: number;
  /** Gaze target in world space (eyes track this point) */
  readonly gazeTarget?: Vector3;
  /** MetaHuman preset name for this entity */
  readonly metaHumanPreset?: string;
}
