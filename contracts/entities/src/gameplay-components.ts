/**
 * gameplay-components.ts — Components for the playable vertical slice.
 *
 * These extend the minimal component set with gameplay-specific
 * data needed for player movement, camera, visuals, networking,
 * NPC classification, and world interaction.
 *
 * All components are pure data — serializable, immutable snapshots.
 * No methods. No references to other entities (use entity IDs).
 */

import type { Vec3, NumericRange } from './shared-types.js';

// ── Player Input ────────────────────────────────────────────────

/** Movement mode union — makes illegal states unrepresentable. */
export type MovementMode = 'walking' | 'running' | 'sprinting' | 'falling' | 'swimming' | 'flying';

/**
 * Captures player intent from the rendering fabric.
 * Processed by the Loom each tick — never applied directly.
 */
export interface PlayerInputComponent {
  /** Normalized movement direction in world space. Zero = no input. */
  readonly moveDirection: Vec3;
  /** Normalized look direction (unit vector). */
  readonly lookDirection: Vec3;
  /** Action names active this frame (e.g. 'jump', 'interact'). */
  readonly actions: ReadonlyArray<string>;
  /** Monotonic sequence for server reconciliation. */
  readonly sequenceNumber: number;
}

// ── Movement ────────────────────────────────────────────────────

/** Movement physics state — driven by PlayerInput + game rules. */
export interface MovementComponent {
  /** Current speed in world units per second. */
  readonly speed: number;
  /** Maximum allowed speed for current mode. */
  readonly maxSpeed: number;
  /** Whether the entity is on solid ground. */
  readonly isGrounded: boolean;
  /** Current movement mode. */
  readonly movementMode: MovementMode;
}

// ── Camera ──────────────────────────────────────────────────────

/** Camera mode union. */
export type CameraMode = 'first-person' | 'third-person' | 'orbital';

/**
 * Marks an entity as a camera target.
 * The rendering fabric uses this to position its viewport.
 */
export interface CameraTargetComponent {
  /** Camera positioning mode. */
  readonly mode: CameraMode;
  /** Horizontal field of view in degrees. */
  readonly fieldOfView: number;
  /** Distance from entity pivot (third-person/orbital only). */
  readonly distance: number;
  /** Offset from entity pivot in local space. */
  readonly offset: Vec3;
  /** Vertical look limits in degrees. */
  readonly pitchLimits: NumericRange;
}

// ── Visuals ─────────────────────────────────────────────────────

/**
 * Links an entity to a visual mesh in the rendering fabric.
 * Content-addressed by hash — same asset always produces same hash.
 */
export interface VisualMeshComponent {
  /** Content-addressed hash matching MeshReference.contentHash. */
  readonly meshContentHash: string;
  /** Logical asset name for debugging and lookup. */
  readonly assetName: string;
  /** Quality tier for LOD selection. */
  readonly lodTier: string;
  /** Optional material variant override. */
  readonly materialVariant: string | null;
}

/**
 * Animation state managed by the Loom.
 * The rendering fabric interpolates between state snapshots.
 */
export interface AnimationComponent {
  /** Currently playing animation clip name. */
  readonly currentClip: string;
  /** Playback position [0, 1]. */
  readonly normalizedTime: number;
  /** Blend weight for layered animation. */
  readonly blendWeight: number;
  /** Playback rate multiplier (1.0 = normal). */
  readonly playbackRate: number;
  /** Next clip for blend transitions, null if none. */
  readonly nextClip: string | null;
}

// ── Networking ──────────────────────────────────────────────────

/** Replication priority for bandwidth allocation. */
export type ReplicationPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Controls how this entity is replicated over the wire.
 * Entities without this component are not sent to clients.
 */
export interface NetworkReplicationComponent {
  /** Bandwidth allocation tier. */
  readonly priority: ReplicationPriority;
  /** World-space radius within which clients receive updates. */
  readonly relevancyRadius: number;
  /** Target update frequency in Hz. */
  readonly updateFrequency: number;
  /** Connection ID of the authoritative client, null for server-authoritative. */
  readonly ownerConnectionId: string | null;
}

// ── World Anchors ───────────────────────────────────────────────

/** What kind of entity can spawn here. */
export type SpawnType = 'player' | 'npc' | 'creature';

/** Marks an entity as a spawn point in the world. */
export interface SpawnPointComponent {
  /** What kind of entity this point spawns. */
  readonly spawnType: SpawnType;
  /** Maximum simultaneous spawns from this point. */
  readonly capacity: number;
  /** Currently active spawn count. */
  readonly activeSpawns: number;
  /** Minimum time between spawns in microseconds. */
  readonly cooldownMicroseconds: number;
}

// ── NPC Classification ──────────────────────────────────────────

/**
 * NPC tier per the Bible:
 *   0 = Ambient (crowd, no identity, Mass Entity)
 *   1 = Inhabitants (daily routines, 90-day memory, Mass Entity)
 *   2 = Notables (LLM-Haiku, permanent memory, dedicated actor)
 *   3 = Architect's Agents (LLM-Opus, universe awareness)
 */
export type NpcTier = 0 | 1 | 2 | 3;

/** AI backend powering this NPC's decisions. */
export type NpcAiBackend = 'rule-based' | 'behavior-tree' | 'llm-haiku' | 'llm-opus';

/** Classifies an NPC within the tier hierarchy. */
export interface NpcTierComponent {
  /** Tier level [0-3]. */
  readonly tier: NpcTier;
  /** Memory window in days, null = permanent (Tier 2+). */
  readonly memoryWindowDays: number | null;
  /** AI decision backend. */
  readonly aiBackend: NpcAiBackend;
  /** Whether this NPC can create world assets (Tier 2+ only). */
  readonly canCreateAssets: boolean;
}

// ── Interaction ─────────────────────────────────────────────────

/** Available interaction types. */
export type InteractionType = 'talk' | 'trade' | 'inspect' | 'use' | 'pickup';

/** Defines what interactions an entity offers. */
export interface InteractionComponent {
  /** Available interaction types. */
  readonly availableInteractions: ReadonlyArray<InteractionType>;
  /** World-space distance at which interaction is possible. */
  readonly interactionRadius: number;
  /** Whether the interactor must have line of sight. */
  readonly requiresLineOfSight: boolean;
  /** UI prompt text shown to the player. */
  readonly promptText: string;
}
