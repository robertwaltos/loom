/**
 * spectator-camera.ts — Observer camera session management.
 *
 * NEXT-STEPS Phase 13.2: "Spectator camera system: observer controls,
 * auto-camera, picture-in-picture."
 *
 * Manages the Loom-side state for spectator sessions during tournaments
 * and live competitive events.  The UE5 bridge consumes session snapshots
 * via CameraFramePort to place the actual camera in-engine.
 *
 * Features:
 *   - Spectator sessions: join/leave per matchId
 *   - Camera modes: follow, auto, free, pip, broadcast
 *   - 30-second broadcast delay queue (configurable)
 *   - POV slots: up to N cameras active simultaneously per match
 *   - Auto-camera: selects the highest-action target heuristically
 *
 * Thread: cotton/selvage/spectator-camera
 * Tier: 2
 */

// ── Ports ────────────────────────────────────────────────────────────

export interface SpectatorClockPort {
  readonly nowMs: () => number;
}

export interface SpectatorIdPort {
  readonly next: () => string;
}

export interface SpectatorLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ── Types ────────────────────────────────────────────────────────────

export type CameraMode = 'follow' | 'auto' | 'free' | 'pip' | 'broadcast';

export type SessionStatus = 'active' | 'paused' | 'ended';

export type SpectatorError =
  | 'match-not-found'
  | 'session-not-found'
  | 'slot-limit-reached'
  | 'already-in-session'
  | 'invalid-target';

export interface CameraTarget {
  readonly targetId: string;
  readonly entityId: string | undefined;
  readonly worldId: string;
  readonly actionScore: number;
}

export interface SpectatorSession {
  readonly sessionId: string;
  readonly spectatorId: string;
  readonly matchId: string;
  readonly mode: CameraMode;
  readonly target: CameraTarget | undefined;
  readonly delayMs: number;
  readonly pipSecondaryTargetId: string | undefined;
  readonly status: SessionStatus;
  readonly joinedAt: number;
}

export interface MatchCameraState {
  readonly matchId: string;
  readonly sessions: readonly SpectatorSession[];
  readonly autoTargets: readonly CameraTarget[];
  readonly spectatorCount: number;
}

export interface CameraSystemStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly totalMatchesTracked: number;
  readonly avgDelayMs: number;
}

export type SpectatorCameraConfig = {
  readonly defaultDelayMs: number;
  readonly maxSlotsPerMatch: number;
  readonly autoSelectTopN: number;
};

export const DEFAULT_CAMERA_CONFIG: SpectatorCameraConfig = Object.freeze({
  defaultDelayMs: 30_000,
  maxSlotsPerMatch: 50,
  autoSelectTopN: 3,
});

export type JoinParams = {
  readonly spectatorId: string;
  readonly matchId: string;
  readonly mode?: CameraMode;
  readonly delayMs?: number;
};

export type SetTargetParams = {
  readonly sessionId: string;
  readonly target: CameraTarget;
};

export type SetPipParams = {
  readonly sessionId: string;
  readonly secondaryTargetId: string | undefined;
};

export interface SpectatorCameraSystem {
  readonly join: (params: JoinParams) => SpectatorSession | SpectatorError;
  readonly leave: (sessionId: string) => boolean;
  readonly setMode: (sessionId: string, mode: CameraMode) => SpectatorSession | SpectatorError;
  readonly setTarget: (params: SetTargetParams) => SpectatorSession | SpectatorError;
  readonly setPip: (params: SetPipParams) => SpectatorSession | SpectatorError;
  readonly updateAutoTargets: (matchId: string, targets: readonly CameraTarget[]) => void;
  readonly resolveAutoTarget: (sessionId: string) => CameraTarget | undefined;
  readonly getSession: (sessionId: string) => SpectatorSession | undefined;
  readonly getMatchState: (matchId: string) => MatchCameraState | undefined;
  readonly getStats: () => CameraSystemStats;
}

export type SpectatorCameraDeps = {
  readonly clock: SpectatorClockPort;
  readonly id: SpectatorIdPort;
  readonly log: SpectatorLogPort;
};

// ── Helpers ──────────────────────────────────────────────────────────

type CameraState = {
  sessions: Map<string, SpectatorSession>;
  autoTargets: Map<string, CameraTarget[]>;
  totalSessions: number;
};

function updateSession(
  sessions: Map<string, SpectatorSession>,
  sessionId: string,
  patch: Partial<SpectatorSession>,
): SpectatorSession | SpectatorError {
  const existing = sessions.get(sessionId);
  if (existing === undefined) return 'session-not-found';
  const updated = Object.freeze({ ...existing, ...patch });
  sessions.set(sessionId, updated);
  return updated;
}

function buildMatchState(
  matchId: string,
  sessions: Map<string, SpectatorSession>,
  autoTargets: Map<string, CameraTarget[]>,
): MatchCameraState {
  const matchSessions = Array.from(sessions.values()).filter(
    (s) => s.matchId === matchId && s.status === 'active',
  );
  return Object.freeze({
    matchId,
    sessions: matchSessions,
    autoTargets: autoTargets.get(matchId) ?? [],
    spectatorCount: matchSessions.length,
  });
}

function pickAutoTarget(
  targets: readonly CameraTarget[],
  topN: number,
): CameraTarget | undefined {
  const sorted = [...targets].sort((a, b) => b.actionScore - a.actionScore);
  const top = sorted.slice(0, topN);
  if (top.length === 0) return undefined;
  return top[Math.floor(Math.random() * top.length)];
}

function makeJoin(
  state: CameraState,
  deps: SpectatorCameraDeps,
  cfg: SpectatorCameraConfig,
) {
  return function join(params: JoinParams): SpectatorSession | SpectatorError {
    const matchSessions = Array.from(state.sessions.values()).filter(
      (s) => s.matchId === params.matchId && s.status === 'active',
    );
    if (matchSessions.length >= cfg.maxSlotsPerMatch) return 'slot-limit-reached';
    if (matchSessions.some((s) => s.spectatorId === params.spectatorId)) {
      return 'already-in-session';
    }
    const session: SpectatorSession = Object.freeze({
      sessionId: deps.id.next(),
      spectatorId: params.spectatorId,
      matchId: params.matchId,
      mode: params.mode ?? 'auto',
      target: undefined,
      delayMs: params.delayMs ?? cfg.defaultDelayMs,
      pipSecondaryTargetId: undefined,
      status: 'active',
      joinedAt: deps.clock.nowMs(),
    });
    state.sessions.set(session.sessionId, session);
    state.totalSessions++;
    deps.log.info('spectator-joined', { sessionId: session.sessionId, matchId: params.matchId });
    return session;
  };
}

function makeGetStats(state: CameraState) {
  return function getStats(): CameraSystemStats {
    const all = Array.from(state.sessions.values());
    const active = all.filter((s) => s.status === 'active');
    const avgDelay =
      active.length > 0 ? active.reduce((acc, s) => acc + s.delayMs, 0) / active.length : 0;
    return Object.freeze({
      totalSessions: state.totalSessions,
      activeSessions: active.length,
      totalMatchesTracked: new Set(all.map((s) => s.matchId)).size,
      avgDelayMs: avgDelay,
    });
  };
}

function makeLeave(state: CameraState) {
  return function leave(sessionId: string): boolean {
    const s = state.sessions.get(sessionId);
    if (s === undefined) return false;
    state.sessions.set(sessionId, Object.freeze({ ...s, status: 'ended' }));
    return true;
  };
}

function makeResolveAutoTarget(state: CameraState, cfg: SpectatorCameraConfig) {
  return function resolveAutoTarget(sessionId: string): CameraTarget | undefined {
    const s = state.sessions.get(sessionId);
    if (s === undefined) return undefined;
    const targets = state.autoTargets.get(s.matchId) ?? [];
    return pickAutoTarget(targets, cfg.autoSelectTopN);
  };
}

// ── Factory ──────────────────────────────────────────────────────────

export function createSpectatorCameraSystem(
  deps: SpectatorCameraDeps,
  cfg: SpectatorCameraConfig = DEFAULT_CAMERA_CONFIG,
): SpectatorCameraSystem {
  const state: CameraState = {
    sessions: new Map<string, SpectatorSession>(),
    autoTargets: new Map<string, CameraTarget[]>(),
    totalSessions: 0,
  };
  return {
    join: makeJoin(state, deps, cfg),
    leave: makeLeave(state),
    setMode: (sessionId, mode) => updateSession(state.sessions, sessionId, { mode }),
    setTarget: ({ sessionId, target }) => updateSession(state.sessions, sessionId, { target }),
    setPip: ({ sessionId, secondaryTargetId }) =>
      updateSession(state.sessions, sessionId, { pipSecondaryTargetId: secondaryTargetId }),
    updateAutoTargets(matchId, targets) {
      state.autoTargets.set(matchId, [...targets]);
    },
    resolveAutoTarget: makeResolveAutoTarget(state, cfg),
    getSession: (sessionId) => state.sessions.get(sessionId),
    getMatchState: (matchId) => buildMatchState(matchId, state.sessions, state.autoTargets),
    getStats: makeGetStats(state),
  };
}
