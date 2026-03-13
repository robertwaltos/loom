/**
 * network-simulator/index.ts — Network condition simulation tool for
 * testing game client/server behaviour under adverse conditions.
 *
 * NEXT-STEPS Phase 17.3: "Network condition simulation: built-in
 * lag/loss/jitter simulation for testing."
 *
 * Implements a packet pipeline that applies configurable:
 *   - Latency (base + jitter)
 *   - Packet loss (random drop probability)
 *   - Bandwidth throttle (max bytes/sec)
 *   - Reordering (probabilistic out-of-order delivery)
 *
 * Wire up any transport adapter to `createNetworkSimulator()`.
 *
 * Thread: cotton/tools/network-simulator
 * Tier: 1
 */

// ── Ports ─────────────────────────────────────────────────────────────

export interface SimClockPort {
  readonly nowMs: () => number;
}

export interface SimRandomPort {
  /** Returns a pseudo-random float in [0, 1). */
  readonly random: () => number;
}

export interface SimSchedulerPort {
  /** Schedule `fn` to run after `delayMs` milliseconds. */
  readonly schedule: (fn: () => void, delayMs: number) => void;
}

// ── Types ─────────────────────────────────────────────────────────────

export interface NetworkProfile {
  readonly latencyMs: number;
  readonly jitterMs: number;
  readonly lossRate: number;
  readonly reorderRate: number;
  readonly bandwidthBytesPerSec: number;
}

export const PROFILE_PERFECT: NetworkProfile = Object.freeze({
  latencyMs: 0, jitterMs: 0, lossRate: 0, reorderRate: 0, bandwidthBytesPerSec: Infinity,
});

export const PROFILE_BROADBAND: NetworkProfile = Object.freeze({
  latencyMs: 20, jitterMs: 5, lossRate: 0.001, reorderRate: 0.005, bandwidthBytesPerSec: 12_500_000,
});

export const PROFILE_MOBILE_4G: NetworkProfile = Object.freeze({
  latencyMs: 60, jitterMs: 20, lossRate: 0.02, reorderRate: 0.02, bandwidthBytesPerSec: 2_500_000,
});

export const PROFILE_LOSSY: NetworkProfile = Object.freeze({
  latencyMs: 120, jitterMs: 40, lossRate: 0.10, reorderRate: 0.05, bandwidthBytesPerSec: 500_000,
});

export interface SimPacket {
  readonly id: string;
  readonly bytes: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly enqueuedAt: number;
}

export type DeliveryHandler = (packet: SimPacket, deliveredAt: number) => void;

export interface SimStats {
  readonly sent: number;
  readonly delivered: number;
  readonly dropped: number;
  readonly reordered: number;
  readonly avgLatencyMs: number;
}

export interface NetworkSimulator {
  readonly setProfile: (profile: NetworkProfile) => void;
  readonly getProfile: () => NetworkProfile;
  readonly send: (packet: SimPacket) => 'queued' | 'dropped';
  readonly onDeliver: (handler: DeliveryHandler) => void;
  readonly getStats: () => SimStats;
  readonly reset: () => void;
}

export type NetworkSimulatorDeps = {
  readonly clock: SimClockPort;
  readonly rng: SimRandomPort;
  readonly scheduler: SimSchedulerPort;
};

// ── Internal store ────────────────────────────────────────────────────

type SimStore = {
  profile: NetworkProfile;
  handlers: DeliveryHandler[];
  sent: number;
  delivered: number;
  dropped: number;
  reordered: number;
  totalLatencyMs: number;
  bytesInFlight: number;
  windowStartMs: number;
};

// ── Helpers ───────────────────────────────────────────────────────────

function calcDelay(profile: NetworkProfile, rng: SimRandomPort): number {
  const jitter = (rng.random() * 2 - 1) * profile.jitterMs;
  return Math.max(0, profile.latencyMs + jitter);
}

function isBandwidthExceeded(store: SimStore, packet: SimPacket, now: number): boolean {
  if (store.profile.bandwidthBytesPerSec === Infinity) return false;
  const windowMs = now - store.windowStartMs;
  const allowedBytes = (windowMs / 1_000) * store.profile.bandwidthBytesPerSec;
  return store.bytesInFlight > allowedBytes;
}

function deliver(store: SimStore, packet: SimPacket, deps: NetworkSimulatorDeps): void {
  const now = deps.clock.nowMs();
  const delay = calcDelay(store.profile, deps.rng);
  const reorder = deps.rng.random() < store.profile.reorderRate;
  const effectiveDelay = reorder ? delay * (1 + deps.rng.random()) : delay;

  store.sent++;
  store.bytesInFlight += packet.bytes;

  deps.scheduler.schedule(() => {
    store.bytesInFlight -= packet.bytes;
    store.delivered++;
    store.totalLatencyMs += effectiveDelay;
    if (reorder) store.reordered++;
    for (const h of store.handlers) h(packet, now + effectiveDelay);
  }, effectiveDelay);
}

// ── Builder functions ─────────────────────────────────────────────────

function makeSend(store: SimStore, deps: NetworkSimulatorDeps) {
  return function send(packet: SimPacket): 'queued' | 'dropped' {
    const now = deps.clock.nowMs();
    if (isBandwidthExceeded(store, packet, now)) { store.dropped++; return 'dropped'; }
    if (deps.rng.random() < store.profile.lossRate) { store.dropped++; return 'dropped'; }
    deliver(store, packet, deps);
    return 'queued';
  };
}

function makeGetStats(store: SimStore) {
  return function getStats(): SimStats {
    const avgLatencyMs = store.delivered === 0 ? 0 : store.totalLatencyMs / store.delivered;
    return Object.freeze({
      sent: store.sent,
      delivered: store.delivered,
      dropped: store.dropped,
      reordered: store.reordered,
      avgLatencyMs,
    });
  };
}

function makeReset(store: SimStore, profile: NetworkProfile) {
  return function reset(): void {
    store.sent = 0;
    store.delivered = 0;
    store.dropped = 0;
    store.reordered = 0;
    store.totalLatencyMs = 0;
    store.bytesInFlight = 0;
    store.profile = profile;
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createNetworkSimulator(
  deps: NetworkSimulatorDeps,
  initial: NetworkProfile = PROFILE_BROADBAND,
): NetworkSimulator {
  const store: SimStore = {
    profile: initial, handlers: [], sent: 0, delivered: 0,
    dropped: 0, reordered: 0, totalLatencyMs: 0,
    bytesInFlight: 0, windowStartMs: deps.clock.nowMs(),
  };
  return {
    setProfile: (p) => { store.profile = p; },
    getProfile: () => store.profile,
    send: makeSend(store, deps),
    onDeliver: (h) => { store.handlers.push(h); },
    getStats: makeGetStats(store),
    reset: makeReset(store, initial),
  };
}
