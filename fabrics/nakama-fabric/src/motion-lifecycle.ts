/**
 * Motion Lifecycle Engine ΓÇö tracks a governance motion through its full state machine.
 *
 * Bible v1.2: Every motion passes through structured phases with real-time windows:
 *   Debate: 72 real hours
 *   Vote:   48 real hours
 *
 * Invalid phase transitions throw typed errors.
 */

export type MotionPhase =
  | 'DRAFT'
  | 'FILED'
  | 'DEBATE'
  | 'VOTE_OPEN'
  | 'VOTE_CLOSED'
  | 'PASSED'
  | 'FAILED'
  | 'CONSTITUTIONAL_BLOCKED'
  | 'WITHDRAWN';

export type MotionType = 'ORDINARY' | 'SIGNIFICANT' | 'CONSTITUTIONAL';

export interface MotionLifecycle {
  readonly motionId: string;
  readonly title: string;
  readonly type: MotionType;
  readonly filedBy: string;
  readonly filedAt: string;
  readonly phase: MotionPhase;
  readonly debateOpensAt?: string;
  readonly debateClosesAt?: string;
  readonly voteOpensAt?: string;
  readonly voteClosesAt?: string;
  readonly resolvedAt?: string;
  readonly chronicleEntryId?: string;
}

export interface MotionLifecycleError {
  readonly code: 'INVALID_TRANSITION' | 'MOTION_NOT_FOUND';
  readonly motionId: string;
  readonly currentPhase: MotionPhase;
  readonly attemptedTransition: string;
}

export class MotionTransitionError extends Error {
  readonly detail: MotionLifecycleError;

  constructor(detail: MotionLifecycleError) {
    super(
      `INVALID_TRANSITION: motion ${detail.motionId} is ${detail.currentPhase}, cannot ${detail.attemptedTransition}`,
    );
    this.name = 'MotionTransitionError';
    this.detail = detail;
  }
}

export interface MotionLifecycleService {
  draftMotion(dynastyId: string, title: string, type: MotionType): MotionLifecycle;
  fileMotion(motionId: string): MotionLifecycle;
  openDebate(motionId: string): MotionLifecycle;
  openVote(motionId: string): MotionLifecycle;
  closeVote(motionId: string): MotionLifecycle;
  resolveMotion(motionId: string, result: 'passed' | 'failed' | 'blocked'): MotionLifecycle;
  withdraw(motionId: string): MotionLifecycle;
  getMotion(motionId: string): MotionLifecycle;
}

export interface MotionLifecycleConfig {
  readonly clock: { nowIso(): string };
  readonly debateWindowMs: number;
  readonly voteWindowMs: number;
}

const DEBATE_WINDOW_MS = 72 * 60 * 60 * 1000;
const VOTE_WINDOW_MS = 48 * 60 * 60 * 1000;

const TERMINAL_PHASES = new Set<MotionPhase>([
  'PASSED',
  'FAILED',
  'CONSTITUTIONAL_BLOCKED',
  'WITHDRAWN',
]);

interface MutableMotionLifecycle {
  motionId: string;
  title: string;
  type: MotionType;
  filedBy: string;
  filedAt: string;
  phase: MotionPhase;
  debateOpensAt?: string;
  debateClosesAt?: string;
  voteOpensAt?: string;
  voteClosesAt?: string;
  resolvedAt?: string;
  chronicleEntryId?: string;
}

interface LifecycleState {
  readonly motions: Map<string, MutableMotionLifecycle>;
  readonly clock: { nowIso(): string };
  readonly debateWindowMs: number;
  readonly voteWindowMs: number;
  nextId: number;
}

function freeze(m: MutableMotionLifecycle): MotionLifecycle {
  return { ...m };
}

function getOrThrow(state: LifecycleState, motionId: string): MutableMotionLifecycle {
  const m = state.motions.get(motionId);
  if (m === undefined) {
    throw new MotionTransitionError({
      code: 'MOTION_NOT_FOUND',
      motionId,
      currentPhase: 'DRAFT',
      attemptedTransition: 'access',
    });
  }
  return m;
}

function requirePhase(m: MutableMotionLifecycle, expected: MotionPhase, transition: string): void {
  if (m.phase !== expected) {
    throw new MotionTransitionError({
      code: 'INVALID_TRANSITION',
      motionId: m.motionId,
      currentPhase: m.phase,
      attemptedTransition: transition,
    });
  }
}

function requireNotTerminal(m: MutableMotionLifecycle, transition: string): void {
  if (TERMINAL_PHASES.has(m.phase)) {
    throw new MotionTransitionError({
      code: 'INVALID_TRANSITION',
      motionId: m.motionId,
      currentPhase: m.phase,
      attemptedTransition: transition,
    });
  }
}

function addMs(isoString: string, ms: number): string {
  return new Date(new Date(isoString).getTime() + ms).toISOString();
}

function draftMotionImpl(
  state: LifecycleState,
  dynastyId: string,
  title: string,
  type: MotionType,
): MotionLifecycle {
  const motionId = `motion-${++state.nextId}`;
  const now = state.clock.nowIso();
  const m: MutableMotionLifecycle = {
    motionId,
    title,
    type,
    filedBy: dynastyId,
    filedAt: now,
    phase: 'DRAFT',
  };
  state.motions.set(motionId, m);
  return freeze(m);
}

function fileMotionImpl(state: LifecycleState, motionId: string): MotionLifecycle {
  const m = getOrThrow(state, motionId);
  requirePhase(m, 'DRAFT', 'file');
  m.phase = 'FILED';
  return freeze(m);
}

function openDebateImpl(state: LifecycleState, motionId: string): MotionLifecycle {
  const m = getOrThrow(state, motionId);
  requirePhase(m, 'FILED', 'openDebate');
  const now = state.clock.nowIso();
  m.debateOpensAt = now;
  m.debateClosesAt = addMs(now, state.debateWindowMs);
  m.phase = 'DEBATE';
  return freeze(m);
}

function openVoteImpl(state: LifecycleState, motionId: string): MotionLifecycle {
  const m = getOrThrow(state, motionId);
  requirePhase(m, 'DEBATE', 'openVote');
  const now = state.clock.nowIso();
  m.voteOpensAt = now;
  m.voteClosesAt = addMs(now, state.voteWindowMs);
  m.phase = 'VOTE_OPEN';
  return freeze(m);
}

function closeVoteImpl(state: LifecycleState, motionId: string): MotionLifecycle {
  const m = getOrThrow(state, motionId);
  requirePhase(m, 'VOTE_OPEN', 'closeVote');
  m.phase = 'VOTE_CLOSED';
  return freeze(m);
}

function resolveMotionImpl(
  state: LifecycleState,
  motionId: string,
  result: 'passed' | 'failed' | 'blocked',
): MotionLifecycle {
  const m = getOrThrow(state, motionId);
  requirePhase(m, 'VOTE_CLOSED', 'resolve');
  m.resolvedAt = state.clock.nowIso();
  m.chronicleEntryId = `chronicle-${motionId}`;
  m.phase =
    result === 'passed' ? 'PASSED' : result === 'blocked' ? 'CONSTITUTIONAL_BLOCKED' : 'FAILED';
  return freeze(m);
}

function withdrawImpl(state: LifecycleState, motionId: string): MotionLifecycle {
  const m = getOrThrow(state, motionId);
  requireNotTerminal(m, 'withdraw');
  m.phase = 'WITHDRAWN';
  return freeze(m);
}

export function createMotionLifecycleService(
  config?: Partial<MotionLifecycleConfig>,
): MotionLifecycleService {
  const state: LifecycleState = {
    motions: new Map(),
    clock: config?.clock ?? { nowIso: () => new Date().toISOString() },
    debateWindowMs: config?.debateWindowMs ?? DEBATE_WINDOW_MS,
    voteWindowMs: config?.voteWindowMs ?? VOTE_WINDOW_MS,
    nextId: 0,
  };

  return {
    draftMotion: (d, t, ty) => draftMotionImpl(state, d, t, ty),
    fileMotion: (id) => fileMotionImpl(state, id),
    openDebate: (id) => openDebateImpl(state, id),
    openVote: (id) => openVoteImpl(state, id),
    closeVote: (id) => closeVoteImpl(state, id),
    resolveMotion: (id, r) => resolveMotionImpl(state, id, r),
    withdraw: (id) => withdrawImpl(state, id),
    getMotion: (id) => freeze(getOrThrow(state, id)),
  };
}

export { DEBATE_WINDOW_MS, VOTE_WINDOW_MS };
