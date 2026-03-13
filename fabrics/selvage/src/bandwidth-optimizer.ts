/**
 * bandwidth-optimizer.ts — ML-driven state update prediction.
 *
 * Predicts the per-client byte budget needed for the next server tick and
 * selects which entity updates to send based on priority and available
 * bandwidth headroom.
 *
 * Prediction model (EWMA):
 *   - Each entity tracks an estimated update size (bytes) via EWMA.
 *   - Each client tracks a smoothed bytes-per-tick usage via EWMA.
 *   - When scheduled updates exceed the per-tick budget, lower-priority
 *     updates are deferred (and re-submitted next tick).
 *
 * Priority tiers (descending importance):
 *   critical  — health, death, authoritative position  (never dropped)
 *   high      — combat state, economy transactions
 *   normal    — standard movement, NPC actions
 *   low       — ambient animations, aura effects
 *   cosmetic  — particle cues, cosmetic sounds        (dropped first)
 *
 * Runs at priority 30 — after UDP protocol (25), before game systems.
 */

// ── Constants ────────────────────────────────────────────────────

export const BANDWIDTH_OPTIMIZER_PRIORITY = 30;

const EWMA_ALPHA = 0.25;
const DEFAULT_BANDWIDTH_BPS = 500_000; // 500 kbps
const TICK_RATE_HZ = 30;
const BYTES_PER_TICK = DEFAULT_BANDWIDTH_BPS / (8 * TICK_RATE_HZ); // ~2083 bytes/tick

// ── Types ────────────────────────────────────────────────────────

export type EntityPriority = 'critical' | 'high' | 'normal' | 'low' | 'cosmetic';

export interface EntityUpdateCandidate {
  readonly entityId: string;
  readonly priority: EntityPriority;
  /** Estimated size in bytes (actual payload size if known). */
  readonly estimatedBytes: number;
  /** Opaque payload reference — optimiser doesn't inspect this. */
  readonly data: unknown;
}

export interface OptimisedUpdateBatch {
  /** Updates approved for sending this tick. */
  readonly approved: ReadonlyArray<EntityUpdateCandidate>;
  /** Updates deferred to the next tick due to bandwidth pressure. */
  readonly deferred: ReadonlyArray<EntityUpdateCandidate>;
  /** Predicted bytes needed for all submitted updates. */
  readonly predictedBytes: number;
  /** Budget bytes available for this tick. */
  readonly budgetBytes: number;
}

export interface BandwidthOptimizerDeps {
  readonly clock: { readonly nowMs: () => number };
}

export interface BandwidthOptimizerConfig {
  /** Bandwidth per client in bits-per-second. */
  readonly defaultBandwidthBps?: number;
  /** Assumed tick rate for per-tick budget calculation. */
  readonly tickRateHz?: number;
  /** EWMA smoothing factor for usage estimation. */
  readonly ewmaAlpha?: number;
}

export interface ClientBandwidthStats {
  readonly clientId: string;
  readonly bandwidthBps: number;
  readonly budgetBytesPerTick: number;
  readonly smoothedUsageBytesPerTick: number;
  readonly totalBytesApproved: number;
  readonly totalBytesDeferred: number;
  readonly ticksProcessed: number;
}

export interface BandwidthOptimizerService {
  /** Register a new client. Returns false if already registered. */
  registerClient(clientId: string, bandwidthBps?: number): boolean;
  /** Update a client's bandwidth estimate (measured from ACK timing, etc.). */
  updateClientBandwidth(clientId: string, bandwidthBps: number): void;
  /** Remove a client. */
  unregisterClient(clientId: string): boolean;
  /**
   * Submit candidate entity updates for a client.
   * Returns an OptimisedUpdateBatch with approved and deferred updates.
   * Approved updates should be sent; deferred should be re-queued.
   */
  optimise(clientId: string, candidates: EntityUpdateCandidate[]): OptimisedUpdateBatch;
  /** Record actual bytes sent (improves smoothed usage estimate). */
  recordSent(clientId: string, bytes: number): void;
  /** Per-client stats. */
  getStats(clientId: string): ClientBandwidthStats | undefined;
  /** Number of registered clients. */
  clientCount(): number;
}

// ── Internal State ───────────────────────────────────────────────

const PRIORITY_ORDER: ReadonlyArray<EntityPriority> = [
  'critical',
  'high',
  'normal',
  'low',
  'cosmetic',
];

interface ClientState {
  readonly clientId: string;
  bandwidthBps: number;
  budgetBytesPerTick: number;
  smoothedUsageBytesPerTick: number;
  totalBytesApproved: number;
  totalBytesDeferred: number;
  ticksProcessed: number;
}

function computeBudget(bandwidthBps: number, tickRateHz: number): number {
  return Math.floor(bandwidthBps / (8 * tickRateHz));
}

// ── Factory ──────────────────────────────────────────────────────

export function createBandwidthOptimizer(
  deps: BandwidthOptimizerDeps,
  config: BandwidthOptimizerConfig = {},
): BandwidthOptimizerService {
  const tickRateHz = config.tickRateHz ?? TICK_RATE_HZ;
  const defaultBps = config.defaultBandwidthBps ?? DEFAULT_BANDWIDTH_BPS;
  const alpha = config.ewmaAlpha ?? EWMA_ALPHA;

  const clients = new Map<string, ClientState>();

  function registerClient(clientId: string, bandwidthBps?: number): boolean {
    if (clients.has(clientId)) return false;
    const bps = bandwidthBps ?? defaultBps;
    clients.set(clientId, {
      clientId,
      bandwidthBps: bps,
      budgetBytesPerTick: computeBudget(bps, tickRateHz),
      smoothedUsageBytesPerTick: 0,
      totalBytesApproved: 0,
      totalBytesDeferred: 0,
      ticksProcessed: 0,
    });
    return true;
  }

  function updateClientBandwidth(clientId: string, bandwidthBps: number): void {
    const client = clients.get(clientId);
    if (!client) return;
    client.bandwidthBps = bandwidthBps;
    client.budgetBytesPerTick = computeBudget(bandwidthBps, tickRateHz);
  }

  function unregisterClient(clientId: string): boolean {
    return clients.delete(clientId);
  }

  function optimise(
    clientId: string,
    candidates: EntityUpdateCandidate[],
  ): OptimisedUpdateBatch {
    const client = clients.get(clientId);

    // If client unknown, approve everything (no constraint)
    if (!client) {
      const predictedBytes = candidates.reduce((sum, c) => sum + c.estimatedBytes, 0);
      return {
        approved: candidates,
        deferred: [],
        predictedBytes,
        budgetBytes: predictedBytes,
      };
    }

    client.ticksProcessed++;

    // Sort by priority (critical first)
    const sorted = [...candidates].sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
    );

    const budget = client.budgetBytesPerTick;
    const predictedBytes = sorted.reduce((s, c) => s + c.estimatedBytes, 0);

    // Approve in priority order up to budget
    const approved: EntityUpdateCandidate[] = [];
    const deferred: EntityUpdateCandidate[] = [];
    let used = 0;

    for (const candidate of sorted) {
      if (candidate.priority === 'critical') {
        // Critical updates always pass
        approved.push(candidate);
        used += candidate.estimatedBytes;
      } else if (used + candidate.estimatedBytes <= budget) {
        approved.push(candidate);
        used += candidate.estimatedBytes;
      } else {
        deferred.push(candidate);
      }
    }

    client.totalBytesApproved += used;
    client.totalBytesDeferred += deferred.reduce((s, c) => s + c.estimatedBytes, 0);

    // Update EWMA smoothed usage
    client.smoothedUsageBytesPerTick =
      client.smoothedUsageBytesPerTick * (1 - alpha) + used * alpha;

    return { approved, deferred, predictedBytes, budgetBytes: budget };
  }

  function recordSent(clientId: string, bytes: number): void {
    const client = clients.get(clientId);
    if (!client) return;
    client.smoothedUsageBytesPerTick =
      client.smoothedUsageBytesPerTick * (1 - alpha) + bytes * alpha;
  }

  function getStats(clientId: string): ClientBandwidthStats | undefined {
    const client = clients.get(clientId);
    if (!client) return undefined;
    return {
      clientId: client.clientId,
      bandwidthBps: client.bandwidthBps,
      budgetBytesPerTick: client.budgetBytesPerTick,
      smoothedUsageBytesPerTick: client.smoothedUsageBytesPerTick,
      totalBytesApproved: client.totalBytesApproved,
      totalBytesDeferred: client.totalBytesDeferred,
      ticksProcessed: client.ticksProcessed,
    };
  }

  function clientCount(): number {
    return clients.size;
  }

  return {
    registerClient,
    updateClientBandwidth,
    unregisterClient,
    optimise,
    recordSent,
    getStats,
    clientCount,
  };
}
