/**
 * Permanence Covenant Engine ΓÇö The Concord's legal and technical commitment to players.
 *
 * The Permanence Covenant guarantees The Concord cannot simply shut down.
 * When the studio faces a financial crisis (Tier 4 incident), this engine
 * activates automatically, beginning a 30-day countdown to source code release,
 * MARKS migration to self-custody, and community governance transfer.
 *
 * Key properties:
 *   - Immutable once activated: status can only progress forward, never reverse.
 *   - Automated: Tier 4 activation does not require a human decision.
 *   - Transparent: all transitions are logged with evidence and timestamps.
 *   - Permanent: the PRESERVED state is terminal ΓÇö the game lives on regardless.
 *
 * Status progression:
 *   DORMANT ΓåÆ MONITORING ΓåÆ ACTIVATED ΓåÆ COUNTDOWN ΓåÆ SOURCE_RELEASED
 *     ΓåÆ COMMUNITY_HANDED ΓåÆ PRESERVED
 *
 * "The Weave endures. Even if the studio falls, the world remains."
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CovenantStatus =
  | 'DORMANT' // Normal operation
  | 'MONITORING' // Financial stress detected, watching
  | 'ACTIVATED' // Tier 4 incident declared
  | 'COUNTDOWN' // 30-day countdown running
  | 'SOURCE_RELEASED' // Source code released to escrow
  | 'COMMUNITY_HANDED' // Game transferred to community governance
  | 'PRESERVED'; // Permanent archive state

export interface CovenantState {
  readonly status: CovenantStatus;
  readonly activatedAt?: string;
  readonly countdownEndsAt?: string; // 30 days after activation
  readonly sourceCodeEscrowUrl?: string;
  readonly archiveUrl?: string;
  readonly communityGovernanceAddress?: string; // Ethereum L2 DAO address
  readonly lastUpdatedAt: string;
}

export interface CovenantTrigger {
  readonly triggerId: string;
  readonly type: 'FINANCIAL_THRESHOLD' | 'STUDIO_VOTE' | 'COURT_ORDER' | 'MANUAL';
  readonly triggeredAt: string;
  readonly triggeredBy: string;
  readonly evidence: string;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const COUNTDOWN_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ΓöÇΓöÇΓöÇ Valid transitions (must be explicit ΓÇö no skipping allowed) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const VALID_TRANSITIONS: Record<CovenantStatus, CovenantStatus | null> = {
  DORMANT: 'MONITORING',
  MONITORING: 'ACTIVATED',
  ACTIVATED: 'COUNTDOWN',
  COUNTDOWN: 'SOURCE_RELEASED',
  SOURCE_RELEASED: 'COMMUNITY_HANDED',
  COMMUNITY_HANDED: 'PRESERVED',
  PRESERVED: null,
};

// DORMANT may also jump directly to ACTIVATED (Tier 4 auto-activation)
const EXTRA_VALID_TRANSITIONS: Partial<Record<CovenantStatus, CovenantStatus>> = {
  DORMANT: 'ACTIVATED',
};

function assertForwardTransition(current: CovenantStatus, next: CovenantStatus): void {
  const standard = VALID_TRANSITIONS[current];
  const extra = EXTRA_VALID_TRANSITIONS[current];
  if (next !== standard && next !== extra) {
    throw new Error(
      `Invalid covenant transition: ${current} ΓåÆ ${next}. Covenant can only progress forward.`,
    );
  }
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PermanenceCovenantDeps {
  readonly clock: { nowIso(): string; nowMs(): number };
  readonly logger: { info(msg: string, ctx?: Record<string, unknown>): void };
}

// ΓöÇΓöÇΓöÇ Engine Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PermanenceCovenantEngine {
  getCurrentState(): CovenantState;
  beginMonitoring(): CovenantState;
  activateCovenant(trigger: CovenantTrigger): CovenantState;
  startCountdown(state: CovenantState): CovenantState;
  releaseSourceCode(escrowUrl: string): CovenantState;
  handToCommunity(daoAddress: string): CovenantState;
  archiveAndPreserve(archiveUrl: string): CovenantState;
  getTimeRemainingMs(state: CovenantState): number;
}

// ΓöÇΓöÇΓöÇ Engine State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface EngineState {
  current: CovenantState;
  readonly deps: PermanenceCovenantDeps;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createPermanenceCovenantEngine(
  deps: PermanenceCovenantDeps,
): PermanenceCovenantEngine {
  const state: EngineState = {
    current: { status: 'DORMANT', lastUpdatedAt: deps.clock.nowIso() },
    deps,
  };
  return {
    getCurrentState: () => state.current,
    beginMonitoring: () => beginMonitoring(state),
    activateCovenant: (trigger) => activateCovenant(state, trigger),
    startCountdown: (covenantState) => startCountdown(state, covenantState),
    releaseSourceCode: (escrowUrl) => releaseSourceCode(state, escrowUrl),
    handToCommunity: (daoAddress) => handToCommunity(state, daoAddress),
    archiveAndPreserve: (archiveUrl) => archiveAndPreserve(state, archiveUrl),
    getTimeRemainingMs: (covenantState) => getTimeRemainingMs(state, covenantState),
  };
}

// ΓöÇΓöÇΓöÇ Transitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function beginMonitoring(state: EngineState): CovenantState {
  assertForwardTransition(state.current.status, 'MONITORING');
  const next: CovenantState = {
    ...state.current,
    status: 'MONITORING',
    lastUpdatedAt: state.deps.clock.nowIso(),
  };
  state.current = next;
  state.deps.logger.info('Permanence Covenant: monitoring activated', { status: 'MONITORING' });
  return next;
}

function activateCovenant(state: EngineState, trigger: CovenantTrigger): CovenantState {
  assertForwardTransition(state.current.status, 'ACTIVATED');
  const activatedAt = state.deps.clock.nowIso();
  const next: CovenantState = {
    ...state.current,
    status: 'ACTIVATED',
    activatedAt,
    lastUpdatedAt: activatedAt,
  };
  state.current = next;
  state.deps.logger.info('Permanence Covenant: ACTIVATED', {
    triggerId: trigger.triggerId,
    triggerType: trigger.type,
    triggeredBy: trigger.triggeredBy,
  });
  return next;
}

function startCountdown(state: EngineState, covenantState: CovenantState): CovenantState {
  assertForwardTransition(covenantState.status, 'COUNTDOWN');
  const nowMs = state.deps.clock.nowMs();
  const countdownEndsAt = new Date(nowMs + COUNTDOWN_DURATION_MS).toISOString();
  const next: CovenantState = {
    ...covenantState,
    status: 'COUNTDOWN',
    countdownEndsAt,
    lastUpdatedAt: state.deps.clock.nowIso(),
  };
  state.current = next;
  state.deps.logger.info('Permanence Covenant: 30-day countdown started', { countdownEndsAt });
  return next;
}

function releaseSourceCode(state: EngineState, escrowUrl: string): CovenantState {
  assertForwardTransition(state.current.status, 'SOURCE_RELEASED');
  const next: CovenantState = {
    ...state.current,
    status: 'SOURCE_RELEASED',
    sourceCodeEscrowUrl: escrowUrl,
    lastUpdatedAt: state.deps.clock.nowIso(),
  };
  state.current = next;
  state.deps.logger.info('Permanence Covenant: source code released', { escrowUrl });
  return next;
}

function handToCommunity(state: EngineState, daoAddress: string): CovenantState {
  assertForwardTransition(state.current.status, 'COMMUNITY_HANDED');
  const next: CovenantState = {
    ...state.current,
    status: 'COMMUNITY_HANDED',
    communityGovernanceAddress: daoAddress,
    lastUpdatedAt: state.deps.clock.nowIso(),
  };
  state.current = next;
  state.deps.logger.info('Permanence Covenant: community governance established', { daoAddress });
  return next;
}

function archiveAndPreserve(state: EngineState, archiveUrl: string): CovenantState {
  assertForwardTransition(state.current.status, 'PRESERVED');
  const next: CovenantState = {
    ...state.current,
    status: 'PRESERVED',
    archiveUrl,
    lastUpdatedAt: state.deps.clock.nowIso(),
  };
  state.current = next;
  state.deps.logger.info('Permanence Covenant: PRESERVED ΓÇö the Weave endures', { archiveUrl });
  return next;
}

// ΓöÇΓöÇΓöÇ Countdown Timer ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getTimeRemainingMs(state: EngineState, covenantState: CovenantState): number {
  if (!covenantState.countdownEndsAt) return 0;
  const endsAt = new Date(covenantState.countdownEndsAt).getTime();
  const remaining = endsAt - state.deps.clock.nowMs();
  return Math.max(0, remaining);
}
