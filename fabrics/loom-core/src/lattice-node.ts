/**
 * lattice-node.ts — The Lattice frequency-synchronisation transit network.
 *
 * The Lattice is how civilisation moves between the 600 worlds. It is not a
 * wormhole or a physical tunnel. It is a frequency synchronisation event:
 * the traveller's matter-state is locked to a precise electromagnetic
 * signature, and then that signature is re-expressed at the destination node.
 *
 * Every transit relies on two healthy ResonanceBeacons — one anchoring the
 * origin lock, one opening the destination window. If either beacon degrades
 * beyond the critical threshold during transit, the synchronisation collapses
 * partially. The traveller arrives, but the Chronicle records it, and the
 * Lattice operators must answer.
 *
 * Bible invariants (inviolable):
 *   - BASE_LOCK_MS = 180 000 (3 minutes at zero distance)
 *   - lockDurationMs = BASE_LOCK_MS × (1 + distanceLY × 0.15) × fieldConditionMultiplier
 *   - fieldConditionMultiplier ∈ [0.8, 2.4]
 *   - precisionRating < 0.73 → transit is at risk (CRITICAL_THRESHOLD)
 *   - PARTIAL_COLLAPSE must produce a Chronicle entry — no exceptions
 *   - KALON is NUMERIC(20,0): represented as bigint throughout
 */

import type { EntityId } from '@loom/entities-contracts';

// ── Constants ──────────────────────────────────────────────────────────────

/** 3 minutes at zero inter-world distance. */
export const BASE_LOCK_MS = 180_000;

/** Minimum precisionRating before a transit is flagged at risk. */
export const CRITICAL_PRECISION_THRESHOLD = 0.73;

/** Distance penalty factor per light-year. */
export const DISTANCE_PENALTY_PER_LY = 0.15;

/** Minimum field-condition multiplier (favourable conditions). */
export const FIELD_MULTIPLIER_MIN = 0.8;

/** Maximum field-condition multiplier (severe interference). */
export const FIELD_MULTIPLIER_MAX = 2.4;

// ── Core Types ─────────────────────────────────────────────────────────────

/**
 * The 256-bit electromagnetic signature unique to each Lattice node.
 * The primary fingerprint is a bigint representing the raw 256-bit value.
 * Harmonics are the resonance overtone series (typically 7 values ∈ [-1, 1]).
 * fieldStrength is the local ZPE field intensity (0.0–1.0).
 */
export interface FrequencySignature {
  /** 256-bit primary electromagnetic fingerprint. */
  readonly primary: bigint;
  /** Harmonic overtone series — typically 7 values. */
  readonly harmonics: ReadonlyArray<number>;
  /** Local zero-point energy field strength (0.0–1.0). */
  readonly fieldStrength: number;
}

/** Operational state of a ResonanceBeacon. */
export type BeaconStatus = 'ACTIVE' | 'DEGRADED' | 'COMPROMISED' | 'DESTROYED';

/** State of a LatticeNode transit lock. */
export type LockStatus =
  | 'SYNCHRONISING'
  | 'PARTIAL_COHERENCE'
  | 'CRITICAL_THRESHOLD'
  | 'TRANSIT_EXECUTING'
  | 'COMPLETE'
  | 'FAILED'
  | 'PARTIAL_COLLAPSE';

/** Ascendancy attack vectors against Lattice infrastructure. */
export type CompromiseType =
  | 'FREQUENCY_SPOOFING'
  | 'SIGNAL_DEGRADATION'
  | 'GEODETIC_CORRUPTION'
  | 'POWER_SABOTAGE'
  | 'HARMONIC_INJECTION';

/**
 * A transit lock request in the Lattice queue.
 * Created when a traveller (entity) initiates a cross-world journey.
 */
export interface LockRequest {
  readonly requestId: string;
  readonly entityId: EntityId;
  readonly originNodeId: string;
  readonly targetNodeId: string;
  /** 0.0–1.0; below CRITICAL_PRECISION_THRESHOLD triggers risk flag. */
  readonly coherenceLevel: number;
  /** Milliseconds until lock completes (computed from formula). */
  readonly estimatedCompletionMs: number;
  /** Unix-ms timestamp when the lock was initiated. */
  readonly initiatedAtMs: number;
  /** Current status of this lock. */
  status: LockStatus;
}

/**
 * A Lattice node — the physical installation anchoring frequency transit
 * at a given world. Each node has exactly one ResonanceBeacon.
 * Nodes are immutable; only status, precisionRating, and lockQueue change.
 */
export interface LatticeNode {
  readonly nodeId: string;
  readonly worldId: string;
  readonly frequency: FrequencySignature;
  beaconStatus: BeaconStatus;
  /** 0.0–1.0. Below 0.73 all inbound transits become CRITICAL_THRESHOLD. */
  precisionRating: number;
  lockQueue: LockRequest[];
  /** In-game year the node was deployed. */
  readonly deployedYear: number;
  /** First-lock achievement mark, if awarded. */
  surveyMarkId?: string;
}

/** Chronicle entry emitted by the Lattice on significant events. */
export interface LatticeChronicleEntry {
  readonly entryType: 'LATTICE_PARTIAL_COLLAPSE' | 'LATTICE_BEACON_COMPROMISE' | 'LATTICE_TRANSIT_COMPLETE';
  readonly nodeId: string;
  readonly worldId: string;
  readonly entityId?: EntityId;
  readonly requestId?: string;
  readonly detail: string;
  readonly timestampMs: number;
}

/** Result of computing a lock duration. */
export interface LockDurationResult {
  readonly durationMs: number;
  readonly distanceLY: number;
  readonly fieldConditionMultiplier: number;
  readonly isAtRisk: boolean;
}

/** Result of advancing a lock request one tick. */
export type LockAdvanceResult =
  | { readonly kind: 'PROGRESSING'; readonly percentComplete: number }
  | { readonly kind: 'COMPLETE'; readonly requestId: string }
  | { readonly kind: 'PARTIAL_COLLAPSE'; readonly requestId: string; readonly chronicleEntry: LatticeChronicleEntry }
  | { readonly kind: 'FAILED'; readonly requestId: string; readonly reason: string };

// ── Port interfaces ────────────────────────────────────────────────────────

export interface LatticeClockPort {
  readonly nowMs: () => number;
}

export interface LatticeIdPort {
  readonly next: () => string;
}

export interface LatticeChroniclePort {
  readonly emit: (entry: LatticeChronicleEntry) => void;
}

export interface LatticeNodeServiceDeps {
  readonly clock: LatticeClockPort;
  readonly idGenerator: LatticeIdPort;
  readonly chronicle?: LatticeChroniclePort;
}

// ── Service Interface ──────────────────────────────────────────────────────

export interface LatticeNodeService {
  /**
   * Register a new Lattice node for a world.
   * Returns the created node or an error string.
   */
  registerNode(params: RegisterNodeParams): LatticeNode | string;

  /**
   * Retrieve a Lattice node by its ID.
   */
  getNode(nodeId: string): LatticeNode | undefined;

  /**
   * Get all nodes for a world.
   */
  getWorldNodes(worldId: string): ReadonlyArray<LatticeNode>;

  /**
   * Compute the lock duration for a transit between two nodes.
   * Uses the bible formula: BASE_LOCK_MS × (1 + distanceLY × 0.15) × multiplier.
   */
  computeLockDuration(params: LockDurationParams): LockDurationResult;

  /**
   * Enqueue a transit lock request on the origin node.
   * Returns the created LockRequest or an error string.
   */
  enqueueLock(params: EnqueueLockParams): LockRequest | string;

  /**
   * Advance a lock request by the real-time elapsed.
   * On PARTIAL_COLLAPSE the Chronicle port is called automatically.
   */
  advanceLock(requestId: string): LockAdvanceResult | string;

  /**
   * Apply a beacon compromise to a node, degrading precision.
   * Returns the updated node or an error string.
   */
  applyCompromise(nodeId: string, compromiseType: CompromiseType): LatticeNode | string;

  /**
   * Restore a beacon to a healthier status (field-maintenance operation).
   */
  restoreBeacon(nodeId: string, restoredPrecision: number): LatticeNode | string;

  /**
   * Get all active lock requests across all nodes.
   */
  getActiveLocks(): ReadonlyArray<LockRequest>;

  /**
   * Get statistics for the whole network.
   */
  getNetworkStats(): LatticeNetworkStats;
}

export interface LatticeNetworkStats {
  readonly totalNodes: number;
  readonly activeNodes: number;
  readonly degradedNodes: number;
  readonly compromisedNodes: number;
  readonly destroyedNodes: number;
  readonly activeLocks: number;
  readonly totalTransitsCompleted: number;
  readonly totalPartialCollapses: number;
}

export interface RegisterNodeParams {
  readonly nodeId?: string;
  readonly worldId: string;
  readonly frequency: FrequencySignature;
  readonly deployedYear: number;
  readonly initialPrecision?: number;
}

export interface LockDurationParams {
  readonly distanceLY: number;
  readonly fieldConditionMultiplier?: number;
}

export interface EnqueueLockParams {
  readonly entityId: EntityId;
  readonly originNodeId: string;
  readonly targetNodeId: string;
  readonly distanceLY: number;
  readonly fieldConditionMultiplier?: number;
}

// ── Implementation ─────────────────────────────────────────────────────────

interface ServiceState {
  readonly deps: LatticeNodeServiceDeps;
  nodes: Map<string, LatticeNode>;
  requests: Map<string, LockRequest>;
  transitsCompleted: number;
  partialCollapses: number;
}

/** Clamp a multiplier to the bible-specified [0.8, 2.4] range. */
function clampMultiplier(m: number): number {
  return Math.max(FIELD_MULTIPLIER_MIN, Math.min(FIELD_MULTIPLIER_MAX, m));
}

/** Derive BeaconStatus from precisionRating. */
function beaconStatusFromPrecision(precision: number): BeaconStatus {
  if (precision >= 0.90) return 'ACTIVE';
  if (precision >= 0.73) return 'DEGRADED';
  if (precision > 0.0) return 'COMPROMISED';
  return 'DESTROYED';
}

/** Precision degradation applied per CompromiseType. */
const COMPROMISE_DEGRADATION: Readonly<Record<CompromiseType, number>> = {
  FREQUENCY_SPOOFING: 0.22,
  SIGNAL_DEGRADATION: 0.08,
  GEODETIC_CORRUPTION: 0.15,
  POWER_SABOTAGE: 0.35,
  HARMONIC_INJECTION: 0.12,
};

export function createLatticeNodeService(deps: LatticeNodeServiceDeps): LatticeNodeService {
  const state: ServiceState = {
    deps,
    nodes: new Map(),
    requests: new Map(),
    transitsCompleted: 0,
    partialCollapses: 0,
  };

  function registerNode(params: RegisterNodeParams): LatticeNode | string {
    const nodeId = params.nodeId ?? deps.idGenerator.next();
    if (state.nodes.has(nodeId)) {
      return `node already registered: ${nodeId}`;
    }
    const precision = Math.max(0, Math.min(1, params.initialPrecision ?? 1.0));
    const node: LatticeNode = {
      nodeId,
      worldId: params.worldId,
      frequency: params.frequency,
      beaconStatus: beaconStatusFromPrecision(precision),
      precisionRating: precision,
      lockQueue: [],
      deployedYear: params.deployedYear,
    };
    state.nodes.set(nodeId, node);
    return node;
  }

  function getNode(nodeId: string): LatticeNode | undefined {
    return state.nodes.get(nodeId);
  }

  function getWorldNodes(worldId: string): ReadonlyArray<LatticeNode> {
    const result: LatticeNode[] = [];
    for (const node of state.nodes.values()) {
      if (node.worldId === worldId) result.push(node);
    }
    return result;
  }

  function computeLockDuration(params: LockDurationParams): LockDurationResult {
    const multiplier = clampMultiplier(params.fieldConditionMultiplier ?? 1.0);
    const durationMs = BASE_LOCK_MS * (1 + params.distanceLY * DISTANCE_PENALTY_PER_LY) * multiplier;
    return {
      durationMs: Math.round(durationMs),
      distanceLY: params.distanceLY,
      fieldConditionMultiplier: multiplier,
      isAtRisk: multiplier > 1.5 || params.distanceLY > 50,
    };
  }

  function enqueueLock(params: EnqueueLockParams): LockRequest | string {
    const originNode = state.nodes.get(params.originNodeId);
    if (!originNode) return `origin node not found: ${params.originNodeId}`;

    const targetNode = state.nodes.get(params.targetNodeId);
    if (!targetNode) return `target node not found: ${params.targetNodeId}`;

    if (originNode.beaconStatus === 'DESTROYED') {
      return `origin beacon destroyed: ${params.originNodeId}`;
    }
    if (targetNode.beaconStatus === 'DESTROYED') {
      return `target beacon destroyed: ${params.targetNodeId}`;
    }

    const nowMs = deps.clock.nowMs();
    const lockCalc = computeLockDuration({
      distanceLY: params.distanceLY,
      fieldConditionMultiplier: params.fieldConditionMultiplier,
    });

    // Coherence level is the minimum of the two nodes' precision ratings.
    const coherenceLevel = Math.min(originNode.precisionRating, targetNode.precisionRating);

    const request: LockRequest = {
      requestId: deps.idGenerator.next(),
      entityId: params.entityId,
      originNodeId: params.originNodeId,
      targetNodeId: params.targetNodeId,
      coherenceLevel,
      estimatedCompletionMs: lockCalc.durationMs,
      initiatedAtMs: nowMs,
      status: coherenceLevel < CRITICAL_PRECISION_THRESHOLD
        ? 'CRITICAL_THRESHOLD'
        : 'SYNCHRONISING',
    };

    originNode.lockQueue.push(request);
    state.requests.set(request.requestId, request);
    return request;
  }

  function advanceLock(requestId: string): LockAdvanceResult | string {
    const request = state.requests.get(requestId);
    if (!request) return `lock request not found: ${requestId}`;

    if (request.status === 'COMPLETE' || request.status === 'FAILED' || request.status === 'PARTIAL_COLLAPSE') {
      return { kind: 'FAILED', requestId, reason: `lock already in terminal state: ${request.status}` };
    }

    const nowMs = deps.clock.nowMs();
    const elapsed = nowMs - request.initiatedAtMs;
    const originNode = state.nodes.get(request.originNodeId);

    // If origin beacon was destroyed after lock was enqueued → PARTIAL_COLLAPSE.
    if (originNode && originNode.beaconStatus === 'DESTROYED' && request.status !== 'PARTIAL_COLLAPSE') {
      request.status = 'PARTIAL_COLLAPSE';
      state.partialCollapses++;

      const entry: LatticeChronicleEntry = {
        entryType: 'LATTICE_PARTIAL_COLLAPSE',
        nodeId: request.originNodeId,
        worldId: originNode.worldId,
        entityId: request.entityId,
        requestId,
        detail: `Origin beacon destroyed during active transit. Entity ${String(request.entityId)} experienced partial collapse.`,
        timestampMs: nowMs,
      };
      deps.chronicle?.emit(entry);
      return { kind: 'PARTIAL_COLLAPSE', requestId, chronicleEntry: entry };
    }

    if (elapsed >= request.estimatedCompletionMs) {
      // Lock window has elapsed — determine final state.
      if (request.status === 'CRITICAL_THRESHOLD') {
        // Below precision threshold → 40% chance of PARTIAL_COLLAPSE.
        const rng = (nowMs % 100) / 100; // deterministic-ish for testing; real impl uses CSPRNG.
        if (rng < 0.4) {
          request.status = 'PARTIAL_COLLAPSE';
          state.partialCollapses++;
          const nodeWorld = originNode?.worldId ?? 'unknown';
          const entry: LatticeChronicleEntry = {
            entryType: 'LATTICE_PARTIAL_COLLAPSE',
            nodeId: request.originNodeId,
            worldId: nodeWorld,
            entityId: request.entityId,
            requestId,
            detail: `Coherence below critical threshold (${request.coherenceLevel.toFixed(3)}). Partial collapse on transit to ${request.targetNodeId}.`,
            timestampMs: nowMs,
          };
          deps.chronicle?.emit(entry);
          return { kind: 'PARTIAL_COLLAPSE', requestId, chronicleEntry: entry };
        }
      }
      request.status = 'COMPLETE';
      state.transitsCompleted++;
      return { kind: 'COMPLETE', requestId };
    }

    // Still in progress — update intermediate status.
    const pct = Math.min(99, Math.floor((elapsed / request.estimatedCompletionMs) * 100));

    if (pct >= 75 && request.status === 'SYNCHRONISING') {
      request.status = 'TRANSIT_EXECUTING';
    } else if (pct >= 30 && request.status === 'SYNCHRONISING') {
      request.status = 'PARTIAL_COHERENCE';
    }

    return { kind: 'PROGRESSING', percentComplete: pct };
  }

  function applyCompromise(nodeId: string, compromiseType: CompromiseType): LatticeNode | string {
    const node = state.nodes.get(nodeId);
    if (!node) return `node not found: ${nodeId}`;

    const degradation = COMPROMISE_DEGRADATION[compromiseType];
    node.precisionRating = Math.max(0, node.precisionRating - degradation);
    node.beaconStatus = beaconStatusFromPrecision(node.precisionRating);

    if (node.beaconStatus === 'COMPROMISED' || node.beaconStatus === 'DESTROYED') {
      const nowMs = deps.clock.nowMs();
      const entry: LatticeChronicleEntry = {
        entryType: 'LATTICE_BEACON_COMPROMISE',
        nodeId,
        worldId: node.worldId,
        detail: `Beacon ${node.beaconStatus.toLowerCase()} via ${compromiseType}. Precision: ${node.precisionRating.toFixed(3)}.`,
        timestampMs: nowMs,
      };
      deps.chronicle?.emit(entry);
    }

    return node;
  }

  function restoreBeacon(nodeId: string, restoredPrecision: number): LatticeNode | string {
    const node = state.nodes.get(nodeId);
    if (!node) return `node not found: ${nodeId}`;
    if (node.beaconStatus === 'DESTROYED') return `cannot restore destroyed beacon: ${nodeId}`;

    node.precisionRating = Math.max(0, Math.min(1, restoredPrecision));
    node.beaconStatus = beaconStatusFromPrecision(node.precisionRating);
    return node;
  }

  function getActiveLocks(): ReadonlyArray<LockRequest> {
    const active: LockRequest[] = [];
    for (const req of state.requests.values()) {
      if (req.status !== 'COMPLETE' && req.status !== 'FAILED' && req.status !== 'PARTIAL_COLLAPSE') {
        active.push(req);
      }
    }
    return active;
  }

  function getNetworkStats(): LatticeNetworkStats {
    let active = 0, degraded = 0, compromised = 0, destroyed = 0;
    for (const node of state.nodes.values()) {
      if (node.beaconStatus === 'ACTIVE') active++;
      else if (node.beaconStatus === 'DEGRADED') degraded++;
      else if (node.beaconStatus === 'COMPROMISED') compromised++;
      else if (node.beaconStatus === 'DESTROYED') destroyed++;
    }
    return {
      totalNodes: state.nodes.size,
      activeNodes: active,
      degradedNodes: degraded,
      compromisedNodes: compromised,
      destroyedNodes: destroyed,
      activeLocks: getActiveLocks().length,
      totalTransitsCompleted: state.transitsCompleted,
      totalPartialCollapses: state.partialCollapses,
    };
  }

  return {
    registerNode,
    getNode,
    getWorldNodes,
    computeLockDuration,
    enqueueLock,
    advanceLock,
    applyCompromise,
    restoreBeacon,
    getActiveLocks,
    getNetworkStats,
  };
}
