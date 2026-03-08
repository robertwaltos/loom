/**
 * session-store.ts — Session data storage.
 *
 * Associates arbitrary key-value data with authenticated sessions.
 * Each session has a unique ID, creation time, optional expiry, and
 * a data map. Supports expiration sweeps, data updates, and
 * per-session metadata.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SessionStoreIdGenerator {
  readonly next: () => string;
}

interface SessionStoreClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

interface SessionRecord {
  readonly sessionId: string;
  readonly dynastyId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly data: Readonly<Record<string, string>>;
}

interface CreateSessionParams {
  readonly dynastyId: string;
  readonly ttlUs: number;
  readonly data?: Readonly<Record<string, string>>;
}

interface SessionStoreStats {
  readonly activeSessions: number;
  readonly totalCreated: number;
  readonly totalExpired: number;
  readonly totalDestroyed: number;
}

// ── Public API ───────────────────────────────────────────────────

interface SessionStore {
  readonly create: (params: CreateSessionParams) => SessionRecord;
  readonly get: (sessionId: string) => SessionRecord | undefined;
  readonly setData: (sessionId: string, key: string, value: string) => boolean;
  readonly getData: (sessionId: string, key: string) => string | undefined;
  readonly destroy: (sessionId: string) => boolean;
  readonly isValid: (sessionId: string) => boolean;
  readonly sweepExpired: () => number;
  readonly getByDynasty: (dynastyId: string) => SessionRecord | undefined;
  readonly getStats: () => SessionStoreStats;
}

interface SessionStoreDeps {
  readonly idGenerator: SessionStoreIdGenerator;
  readonly clock: SessionStoreClock;
}

// ── State ────────────────────────────────────────────────────────

interface StoreState {
  readonly sessions: Map<string, MutableSession>;
  readonly dynastyIndex: Map<string, string>;
  readonly deps: SessionStoreDeps;
  totalCreated: number;
  totalExpired: number;
  totalDestroyed: number;
}

interface MutableSession {
  readonly sessionId: string;
  readonly dynastyId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly data: Map<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toRecord(session: MutableSession): SessionRecord {
  return {
    sessionId: session.sessionId,
    dynastyId: session.dynastyId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    data: Object.fromEntries(session.data),
  };
}

// ── Operations ───────────────────────────────────────────────────

function createImpl(
  state: StoreState,
  params: CreateSessionParams,
): SessionRecord {
  const now = state.deps.clock.nowMicroseconds();
  const id = state.deps.idGenerator.next();
  const dataMap = new Map<string, string>();
  if (params.data) {
    for (const [k, v] of Object.entries(params.data)) {
      dataMap.set(k, v);
    }
  }
  const session: MutableSession = {
    sessionId: id,
    dynastyId: params.dynastyId,
    createdAt: now,
    expiresAt: now + params.ttlUs,
    data: dataMap,
  };
  state.sessions.set(id, session);
  state.dynastyIndex.set(params.dynastyId, id);
  state.totalCreated++;
  return toRecord(session);
}

function getImpl(
  state: StoreState,
  sessionId: string,
): SessionRecord | undefined {
  const session = state.sessions.get(sessionId);
  if (!session) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  if (now >= session.expiresAt) return undefined;
  return toRecord(session);
}

function setDataImpl(
  state: StoreState,
  sessionId: string,
  key: string,
  value: string,
): boolean {
  const session = state.sessions.get(sessionId);
  if (!session) return false;
  session.data.set(key, value);
  return true;
}

function destroyImpl(state: StoreState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (!session) return false;
  state.dynastyIndex.delete(session.dynastyId);
  state.sessions.delete(sessionId);
  state.totalDestroyed++;
  return true;
}

function sweepExpiredImpl(state: StoreState): number {
  const now = state.deps.clock.nowMicroseconds();
  const expired: string[] = [];
  for (const [id, session] of state.sessions) {
    if (now >= session.expiresAt) expired.push(id);
  }
  for (const id of expired) {
    const session = state.sessions.get(id);
    if (session) state.dynastyIndex.delete(session.dynastyId);
    state.sessions.delete(id);
  }
  state.totalExpired += expired.length;
  return expired.length;
}

function getStatsImpl(state: StoreState): SessionStoreStats {
  return {
    activeSessions: state.sessions.size,
    totalCreated: state.totalCreated,
    totalExpired: state.totalExpired,
    totalDestroyed: state.totalDestroyed,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createSessionStore(deps: SessionStoreDeps): SessionStore {
  const state: StoreState = {
    sessions: new Map(),
    dynastyIndex: new Map(),
    deps,
    totalCreated: 0,
    totalExpired: 0,
    totalDestroyed: 0,
  };
  return {
    create: (p) => createImpl(state, p),
    get: (id) => getImpl(state, id),
    setData: (id, k, v) => setDataImpl(state, id, k, v),
    getData: (id, k) => state.sessions.get(id)?.data.get(k),
    destroy: (id) => destroyImpl(state, id),
    isValid: (id) => getImpl(state, id) !== undefined,
    sweepExpired: () => sweepExpiredImpl(state),
    getByDynasty: (did) => {
      const sid = state.dynastyIndex.get(did);
      return sid !== undefined ? getImpl(state, sid) : undefined;
    },
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSessionStore };
export type {
  SessionStore,
  SessionStoreDeps,
  SessionRecord,
  CreateSessionParams,
  SessionStoreStats,
};
