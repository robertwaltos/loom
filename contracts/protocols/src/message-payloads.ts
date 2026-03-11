/**
 * Typed Payload Interfaces
 *
 * Flat data structures for each MessageType. Optimized for
 * serialization — arrays instead of objects for hot paths,
 * nullable primitives instead of optional nested types.
 *
 * These are the canonical payload shapes. Codec implementations
 * (JSON, MessagePack, FlatBuffers) encode/decode these.
 */

// ── State Snapshot ──────────────────────────────────────────────

/** Per-entity visual data packed for transmission. */
export interface VisualEntityPayload {
  readonly entityId: string;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly meshContentHash: string | null;
  readonly meshAssetName: string | null;
  readonly animClipName: string | null;
  readonly animNormalizedTime: number;
  readonly animBlendWeight: number;
  readonly animPlaybackRate: number;
  readonly visibility: boolean;
  readonly renderPriority: number;
}

/** Batch visual state pushed at Loom tick rate. */
export interface StateSnapshotPayload {
  readonly worldId: string;
  readonly tickNumber: number;
  readonly entityCount: number;
  readonly states: ReadonlyArray<VisualEntityPayload>;
}

// ── Entity Lifecycle ────────────────────────────────────────────

export interface EntitySpawnPayload {
  readonly entityId: string;
  readonly worldId: string;
  readonly entityType: string;
  readonly initialState: VisualEntityPayload;
}

export interface EntityDespawnPayload {
  readonly entityId: string;
  readonly worldId: string;
  readonly reason: string;
}

// ── Player Input ────────────────────────────────────────────────

export interface PlayerInputPayload {
  readonly entityId: string;
  readonly sequenceNumber: number;
  readonly moveDirection: readonly [number, number, number];
  readonly lookDirection: readonly [number, number, number];
  readonly actions: ReadonlyArray<string>;
}

// ── Physics Events ──────────────────────────────────────────────

export interface PhysicsEventPayload {
  readonly entityId: string;
  readonly eventType: string;
  readonly position: readonly [number, number, number];
  readonly normal: readonly [number, number, number];
  readonly impulse: number;
  readonly otherEntityId: string | null;
}

// ── Weave Transitions ───────────────────────────────────────────

export interface WeaveBeginPayload {
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
  readonly durationSeconds: number;
  readonly blendCurve: string;
  readonly fallbackStrategy: string;
}

export interface WeaveUpdatePayload {
  readonly blendFactor: number;
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
}

export interface WeaveCompletePayload {
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
  readonly actualDurationSeconds: number;
}

export interface WeaveAbortPayload {
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
  readonly reason: string;
}

// ── Capability Negotiation ──────────────────────────────────────

export interface CapabilityNegotiatePayload {
  readonly fabricId: string;
  readonly fabricName: string;
  readonly currentTier: string;
  readonly maxVisibleEntities: number;
  readonly preferredStateUpdateRate: number;
  readonly supportsWeaveZoneOverlap: boolean;
  readonly supportsPixelStreaming: boolean;
}

// ── Health ──────────────────────────────────────────────────────

export interface HealthCheckPayload {
  readonly probeId: string;
  readonly sentAt: number;
}

export interface HealthResponsePayload {
  readonly probeId: string;
  readonly healthy: boolean;
  readonly currentFps: number;
  readonly frameTimeMs: number;
  readonly visibleEntities: number;
  readonly memoryUsageMb: number;
  readonly gpuUsagePercent: number;
}

// ── Payload Map ─────────────────────────────────────────────────

/** Maps each MessageType to its typed payload. */
export interface MessagePayloadMap {
  readonly 'state-snapshot': StateSnapshotPayload;
  readonly 'entity-spawn': EntitySpawnPayload;
  readonly 'entity-despawn': EntityDespawnPayload;
  readonly 'player-input': PlayerInputPayload;
  readonly 'physics-event': PhysicsEventPayload;
  readonly 'weave-begin': WeaveBeginPayload;
  readonly 'weave-update': WeaveUpdatePayload;
  readonly 'weave-complete': WeaveCompletePayload;
  readonly 'weave-abort': WeaveAbortPayload;
  readonly 'capability-negotiate': CapabilityNegotiatePayload;
  readonly 'health-check': HealthCheckPayload;
  readonly 'health-response': HealthResponsePayload;
}
