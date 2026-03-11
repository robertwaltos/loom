/**
 * performance-profiler.ts — Frame-by-frame system performance tracking.
 *
 * Tracks per-system timing and memory metrics across named sessions.
 * Computes stats (min, max, avg, p95) per system per session. Supports
 * slow-frame detection and session lifecycle management.
 *
 * All durations are in microseconds (bigint) to match Loom tick precision.
 * The Loom must stay under 0.5ms (500µs) per game thread tick.
 */

// ── Types ─────────────────────────────────────────────────────────

export type ProfilerSessionId = string;
export type SystemName = string;

export interface FrameMetric {
  readonly frameId: bigint;
  readonly systemName: SystemName;
  readonly durationUs: bigint;
  readonly memoryBytes: bigint;
  readonly timestamp: bigint;
}

export interface ProfilerSession {
  readonly sessionId: ProfilerSessionId;
  readonly name: string;
  readonly startedAt: bigint;
  readonly endedAt: bigint | null;
  readonly sampleCount: number;
  readonly totalDurationUs: bigint;
}

export interface SystemStats {
  readonly systemName: SystemName;
  readonly totalSamples: number;
  readonly totalDurationUs: bigint;
  readonly minDurationUs: bigint;
  readonly maxDurationUs: bigint;
  readonly avgDurationUs: number;
  readonly p95DurationUs: bigint;
}

export type ProfilerError =
  | 'session-not-found'
  | 'session-already-ended'
  | 'invalid-duration'
  | 'invalid-memory';

export interface PerformanceProfilerSystem {
  startSession(name: string): ProfilerSession;
  endSession(
    sessionId: ProfilerSessionId,
  ): { success: true; session: ProfilerSession } | { success: false; error: ProfilerError };
  recordFrame(
    sessionId: ProfilerSessionId,
    systemName: SystemName,
    durationUs: bigint,
    memoryBytes: bigint,
  ): { success: true } | { success: false; error: ProfilerError };
  getSystemStats(
    sessionId: ProfilerSessionId,
    systemName: SystemName,
  ): SystemStats | { error: ProfilerError };
  getSlowFrames(sessionId: ProfilerSessionId, thresholdUs: bigint): ReadonlyArray<FrameMetric>;
  getSession(sessionId: ProfilerSessionId): ProfilerSession | undefined;
  listSessions(): ReadonlyArray<ProfilerSession>;
  clearSession(
    sessionId: ProfilerSessionId,
  ): { success: true } | { success: false; error: ProfilerError };
}

// ── Ports ─────────────────────────────────────────────────────────

interface ProfilerClock {
  nowUs(): bigint;
}

interface ProfilerIdGenerator {
  generate(): string;
}

interface ProfilerLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface PerformanceProfilerDeps {
  readonly clock: ProfilerClock;
  readonly idGen: ProfilerIdGenerator;
  readonly logger: ProfilerLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableSession {
  sessionId: ProfilerSessionId;
  name: string;
  startedAt: bigint;
  endedAt: bigint | null;
  sampleCount: number;
  totalDurationUs: bigint;
}

interface ProfilerState {
  readonly sessions: Map<ProfilerSessionId, MutableSession>;
  readonly frames: Map<ProfilerSessionId, FrameMetric[]>;
  readonly clock: ProfilerClock;
  readonly idGen: ProfilerIdGenerator;
  readonly logger: ProfilerLogger;
  frameCounter: bigint;
}

// ── Helpers ───────────────────────────────────────────────────────

function toReadonlySession(s: MutableSession): ProfilerSession {
  return {
    sessionId: s.sessionId,
    name: s.name,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    sampleCount: s.sampleCount,
    totalDurationUs: s.totalDurationUs,
  };
}

function computeP95(sorted: bigint[]): bigint {
  if (sorted.length === 0) return 0n;
  const idx = Math.floor(sorted.length * 0.95);
  const clamped = Math.min(idx, sorted.length - 1);
  return sorted[clamped] ?? 0n;
}

// ── Operations ────────────────────────────────────────────────────

function startSessionImpl(state: ProfilerState, name: string): ProfilerSession {
  const sessionId = state.idGen.generate();
  const now = state.clock.nowUs();
  const session: MutableSession = {
    sessionId,
    name,
    startedAt: now,
    endedAt: null,
    sampleCount: 0,
    totalDurationUs: 0n,
  };
  state.sessions.set(sessionId, session);
  state.frames.set(sessionId, []);
  state.logger.info('profiler session started: ' + sessionId + ' name=' + name);
  return toReadonlySession(session);
}

function endSessionImpl(
  state: ProfilerState,
  sessionId: ProfilerSessionId,
): { success: true; session: ProfilerSession } | { success: false; error: ProfilerError } {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { success: false, error: 'session-not-found' };
  if (session.endedAt !== null) return { success: false, error: 'session-already-ended' };
  const frames = state.frames.get(sessionId) ?? [];
  let total = 0n;
  for (const f of frames) total += f.durationUs;
  session.endedAt = state.clock.nowUs();
  session.totalDurationUs = total;
  state.logger.info('profiler session ended: ' + sessionId);
  return { success: true, session: toReadonlySession(session) };
}

function recordFrameImpl(
  state: ProfilerState,
  sessionId: ProfilerSessionId,
  systemName: SystemName,
  durationUs: bigint,
  memoryBytes: bigint,
): { success: true } | { success: false; error: ProfilerError } {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { success: false, error: 'session-not-found' };
  if (session.endedAt !== null) return { success: false, error: 'session-already-ended' };
  if (durationUs < 0n) return { success: false, error: 'invalid-duration' };
  if (memoryBytes < 0n) return { success: false, error: 'invalid-memory' };
  const frameId = ++state.frameCounter;
  const metric: FrameMetric = {
    frameId,
    systemName,
    durationUs,
    memoryBytes,
    timestamp: state.clock.nowUs(),
  };
  const frames = state.frames.get(sessionId);
  if (frames !== undefined) frames.push(metric);
  session.sampleCount++;
  return { success: true };
}

function emptySystemStats(systemName: SystemName): SystemStats {
  return {
    systemName,
    totalSamples: 0,
    totalDurationUs: 0n,
    minDurationUs: 0n,
    maxDurationUs: 0n,
    avgDurationUs: 0,
    p95DurationUs: 0n,
  };
}

function aggregateFrameDurations(frames: FrameMetric[]): {
  total: bigint;
  min: bigint;
  max: bigint;
} {
  let total = 0n;
  let min = frames[0]?.durationUs ?? 0n;
  let max = frames[0]?.durationUs ?? 0n;
  for (const f of frames) {
    total += f.durationUs;
    if (f.durationUs < min) min = f.durationUs;
    if (f.durationUs > max) max = f.durationUs;
  }
  return { total, min, max };
}

function getSystemStatsImpl(
  state: ProfilerState,
  sessionId: ProfilerSessionId,
  systemName: SystemName,
): SystemStats | { error: ProfilerError } {
  if (!state.sessions.has(sessionId)) return { error: 'session-not-found' };
  const frames = (state.frames.get(sessionId) ?? []).filter((f) => f.systemName === systemName);
  if (frames.length === 0) return emptySystemStats(systemName);
  const { total, min, max } = aggregateFrameDurations(frames);
  const sorted = frames.map((f) => f.durationUs).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    systemName,
    totalSamples: frames.length,
    totalDurationUs: total,
    minDurationUs: min,
    maxDurationUs: max,
    avgDurationUs: Number(total) / frames.length,
    p95DurationUs: computeP95(sorted),
  };
}

function getSlowFramesImpl(
  state: ProfilerState,
  sessionId: ProfilerSessionId,
  thresholdUs: bigint,
): ReadonlyArray<FrameMetric> {
  const frames = state.frames.get(sessionId) ?? [];
  return frames.filter((f) => f.durationUs > thresholdUs);
}

function clearSessionImpl(
  state: ProfilerState,
  sessionId: ProfilerSessionId,
): { success: true } | { success: false; error: ProfilerError } {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { success: false, error: 'session-not-found' };
  state.frames.set(sessionId, []);
  session.sampleCount = 0;
  if (session.endedAt === null) session.endedAt = state.clock.nowUs();
  state.logger.info('profiler session cleared: ' + sessionId);
  return { success: true };
}

// ── Factory ───────────────────────────────────────────────────────

export function createPerformanceProfilerSystem(
  deps: PerformanceProfilerDeps,
): PerformanceProfilerSystem {
  const state: ProfilerState = {
    sessions: new Map(),
    frames: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
    frameCounter: 0n,
  };

  return {
    startSession: (name) => startSessionImpl(state, name),
    endSession: (sid) => endSessionImpl(state, sid),
    recordFrame: (sid, sys, dur, mem) => recordFrameImpl(state, sid, sys, dur, mem),
    getSystemStats: (sid, sys) => getSystemStatsImpl(state, sid, sys),
    getSlowFrames: (sid, thresh) => getSlowFramesImpl(state, sid, thresh),
    getSession: (sid) => {
      const s = state.sessions.get(sid);
      return s !== undefined ? toReadonlySession(s) : undefined;
    },
    listSessions: () => Array.from(state.sessions.values()).map(toReadonlySession),
    clearSession: (sid) => clearSessionImpl(state, sid),
  };
}
