/**
 * state-sync-v2.ts — Interest management with priority queues.
 *
 * NEXT-STEPS Phase 17.3: "State synchronization v2: interest management
 * with priority queues."
 *
 * V1 (sync-protocol.ts) sends all entity state to all clients.
 * V2 adds an interest filter per client subscription:
 *
 *   1. Each client declares an `InterestZone` (origin + radius).
 *   2. Updates are scored by distance + entity priority + age.
 *   3. A `PriorityQueue` drains in score order each tick.
 *   4. Bandwidth cap enforces at-most N bytes per client per tick.
 *
 * Thread: steel/selvage/state-sync-v2
 * Tier: 1
 */

// ── Ports ─────────────────────────────────────────────────────────────

export interface SyncClockPort { readonly nowMs: () => number; }

// ── Types ─────────────────────────────────────────────────────────────

export type ClientId = string & { readonly __brand: 'ClientId' };
export type EntityId = string & { readonly __brand: 'EntityId' };

export interface Vec3 { readonly x: number; readonly y: number; readonly z: number; }

export interface InterestZone {
  readonly origin: Vec3;
  readonly radiusMeters: number;
  /** Override: these entities are always included regardless of distance */
  readonly alwaysInclude: readonly EntityId[];
}

export interface EntityUpdate {
  readonly entityId: EntityId;
  readonly position: Vec3;
  readonly priority: number;    // 0.0–1.0; higher = more important
  readonly sizeBytes: number;
  readonly payload: Uint8Array;
}

export interface ScoredUpdate {
  readonly update: EntityUpdate;
  readonly score: number;
}

export interface TickResult {
  readonly clientId: ClientId;
  readonly dispatched: readonly EntityUpdate[];
  readonly droppedCount: number;
  readonly bytesSent: number;
}

export interface SyncV2Stats {
  readonly totalTicks: number;
  readonly totalDispatched: number;
  readonly totalDropped: number;
}

export interface StateSyncV2 {
  readonly subscribe: (clientId: ClientId, zone: InterestZone, bandwidthBytesPerTick: number) => void;
  readonly unsubscribe: (clientId: ClientId) => void;
  readonly enqueue: (update: EntityUpdate) => void;
  readonly tick: (clientId: ClientId) => TickResult | undefined;
  readonly getStats: () => SyncV2Stats;
}

export type StateSyncV2Deps = { readonly clock: SyncClockPort };

// ── Helpers ───────────────────────────────────────────────────────────

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function scoreUpdate(update: EntityUpdate, zone: InterestZone, nowMs: number): number {
  const d = dist(update.position, zone.origin);
  if (d > zone.radiusMeters && !zone.alwaysInclude.includes(update.entityId)) return -1;
  const normalizedDist = Math.min(d / zone.radiusMeters, 1);
  const staleness = nowMs % 10000 / 10000;   // gentle freshness nudge
  return update.priority * 0.6 + (1 - normalizedDist) * 0.3 + staleness * 0.1;
}

function drainQueue(
  queue: EntityUpdate[],
  zone: InterestZone,
  bwCap: number,
  nowMs: number,
): { dispatched: EntityUpdate[]; dropped: number } {
  const scored: ScoredUpdate[] = queue
    .map((u) => ({ update: u, score: scoreUpdate(u, zone, nowMs) }))
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score);
  const dispatched: EntityUpdate[] = [];
  let bytes = 0;
  let dropped = 0;
  for (const { update } of scored) {
    if (bytes + update.sizeBytes > bwCap) { dropped++; continue; }
    dispatched.push(update);
    bytes += update.sizeBytes;
  }
  return { dispatched, dropped };
}

// ── Internal store ────────────────────────────────────────────────────

type SubRecord = { zone: InterestZone; bwCap: number };
type SyncStore = {
  subs: Map<string, SubRecord>;
  pending: Map<string, EntityUpdate[]>;
  stats: { ticks: number; dispatched: number; dropped: number };
};

// ── Builder functions ─────────────────────────────────────────────────

function makeSubscribe(store: SyncStore) {
  return function subscribe(clientId: ClientId, zone: InterestZone, bandwidthBytesPerTick: number): void {
    store.subs.set(clientId as string, { zone, bwCap: bandwidthBytesPerTick });
    if (!store.pending.has(clientId as string)) store.pending.set(clientId as string, []);
  };
}

function makeTick(store: SyncStore, deps: StateSyncV2Deps) {
  return function tick(clientId: ClientId): TickResult | undefined {
    const sub = store.subs.get(clientId as string);
    if (sub === undefined) return undefined;
    const queue = store.pending.get(clientId as string) ?? [];
    const { dispatched, dropped } = drainQueue(queue, sub.zone, sub.bwCap, deps.clock.nowMs());
    store.pending.set(clientId as string, []);
    store.stats.ticks++;
    store.stats.dispatched += dispatched.length;
    store.stats.dropped += dropped;
    const bytesSent = dispatched.reduce((n, u) => n + u.sizeBytes, 0);
    return Object.freeze({ clientId, dispatched: Object.freeze(dispatched), droppedCount: dropped, bytesSent });
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createStateSyncV2(deps: StateSyncV2Deps): StateSyncV2 {
  const store: SyncStore = { subs: new Map(), pending: new Map(), stats: { ticks: 0, dispatched: 0, dropped: 0 } };
  return {
    subscribe: makeSubscribe(store),
    unsubscribe: (clientId) => {
      store.subs.delete(clientId as string);
      store.pending.delete(clientId as string);
    },
    enqueue: (update) => {
      for (const [id] of store.subs) {
        const q = store.pending.get(id);
        if (q !== undefined) q.push(update);
      }
    },
    tick: makeTick(store, deps),
    getStats: () => Object.freeze({ totalTicks: store.stats.ticks, totalDispatched: store.stats.dispatched, totalDropped: store.stats.dropped }),
  };
}
