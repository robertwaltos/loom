/**
 * Constitutional Amendment Engine
 *
 * Bible v2.0 Rule 9: "The Permanence Covenant requires Architect affirmative
 * for Constitutional changes." Constitutional changes require BOTH a 75%
 * Assembly supermajority AND explicit Architect approval.
 *
 * Lifecycle: PROPOSED → DEBATING → VOTING → RATIFICATION → ENACTED | REJECTED
 * The Architect may veto at any point before ENACTED.
 *
 * This module wraps the Assembly's voting and adds:
 *   - A mandatory debate period before voting
 *   - A ratification window after voting passes
 *   - Explicit Architect affirmative requirement (Rule 9)
 *   - Chronicle linkage for permanent record
 */

// ─── Types ───────────────────────────────────────────────────────

export type AmendmentPhase =
  | 'PROPOSED'
  | 'DEBATING'
  | 'VOTING'
  | 'RATIFICATION'
  | 'ENACTED'
  | 'REJECTED';

export type RejectionReason =
  | 'ARCHITECT_VETO'
  | 'VOTE_FAILED'
  | 'RATIFICATION_EXPIRED'
  | 'PROPOSER_WITHDRAWN';

export interface Amendment {
  readonly amendmentId: string;
  readonly title: string;
  readonly description: string;
  readonly proposerDynastyId: string;
  readonly worldId: string;
  readonly phase: AmendmentPhase;
  readonly proposedAt: number;
  readonly debateEndsAt: number;
  readonly votingMotionId: string | null;
  readonly votePassed: boolean | null;
  readonly votePercentage: number | null;
  readonly architectApproved: boolean | null;
  readonly ratificationDeadline: number | null;
  readonly enactedAt: number | null;
  readonly rejectedAt: number | null;
  readonly rejectionReason: RejectionReason | null;
  readonly chronicleRef: string | null;
}

export interface ProposeAmendmentParams {
  readonly title: string;
  readonly description: string;
  readonly proposerDynastyId: string;
  readonly worldId: string;
}

export interface AmendmentVoteResult {
  readonly passed: boolean;
  readonly percentageFor: number;
  readonly totalWeight: number;
}

// ─── Config ──────────────────────────────────────────────────────

export interface AmendmentConfig {
  /** Microseconds — mandatory debate before voting opens */
  readonly debatePeriodUs: number;
  /** Microseconds — ratification window after vote passes */
  readonly ratificationPeriodUs: number;
  /** Supermajority threshold — default 0.75 (75%) */
  readonly supermajorityThreshold: number;
}

const ONE_DAY_US = 24 * 60 * 60 * 1_000_000;

export const DEFAULT_AMENDMENT_CONFIG: AmendmentConfig = {
  debatePeriodUs: 7 * ONE_DAY_US,         // 7 real days debate
  ratificationPeriodUs: 14 * ONE_DAY_US,  // 14 real days ratification
  supermajorityThreshold: 0.75,           // 75% constitutional threshold
};

// ─── Ports ───────────────────────────────────────────────────────

export interface AmendmentDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly next: () => string };
}

// ─── Stats ───────────────────────────────────────────────────────

export interface AmendmentStats {
  readonly total: number;
  readonly proposed: number;
  readonly debating: number;
  readonly voting: number;
  readonly ratification: number;
  readonly enacted: number;
  readonly rejected: number;
}

// ─── Public Interface ────────────────────────────────────────────

export interface ConstitutionalAmendmentEngine {
  readonly propose: (params: ProposeAmendmentParams) => Amendment;
  readonly advanceToVoting: (amendmentId: string) => Amendment;
  readonly recordVoteResult: (amendmentId: string, result: AmendmentVoteResult) => Amendment;
  readonly architectApprove: (amendmentId: string) => Amendment;
  readonly architectVeto: (amendmentId: string) => Amendment;
  readonly enact: (amendmentId: string, chronicleRef: string) => Amendment;
  readonly withdraw: (amendmentId: string, dynastyId: string) => Amendment;
  readonly getAmendment: (amendmentId: string) => Amendment;
  readonly getPending: () => ReadonlyArray<Amendment>;
  readonly getEnacted: () => ReadonlyArray<Amendment>;
  readonly getStats: () => AmendmentStats;
  readonly checkExpired: () => ReadonlyArray<Amendment>;
}

// ─── Mutable State ───────────────────────────────────────────────

interface MutableAmendment {
  readonly amendmentId: string;
  readonly title: string;
  readonly description: string;
  readonly proposerDynastyId: string;
  readonly worldId: string;
  phase: AmendmentPhase;
  readonly proposedAt: number;
  readonly debateEndsAt: number;
  votingMotionId: string | null;
  votePassed: boolean | null;
  votePercentage: number | null;
  architectApproved: boolean | null;
  ratificationDeadline: number | null;
  enactedAt: number | null;
  rejectedAt: number | null;
  rejectionReason: RejectionReason | null;
  chronicleRef: string | null;
}

// ─── Factory ─────────────────────────────────────────────────────

export function createConstitutionalAmendmentEngine(
  deps: AmendmentDeps,
  config?: Partial<AmendmentConfig>,
): ConstitutionalAmendmentEngine {
  const cfg: AmendmentConfig = { ...DEFAULT_AMENDMENT_CONFIG, ...config };
  const amendments = new Map<string, MutableAmendment>();

  return {
    propose: (params) => freeze(proposeAmendment(deps, cfg, amendments, params)),
    advanceToVoting: (id) => freeze(toVoting(deps, cfg, amendments, id)),
    recordVoteResult: (id, result) => freeze(recordVote(deps, amendments, id, result)),
    architectApprove: (id) => freeze(approve(deps, cfg, amendments, id)),
    architectVeto: (id) => freeze(veto(deps, amendments, id)),
    enact: (id, ref) => freeze(enactAmendment(deps, amendments, id, ref)),
    withdraw: (id, dynastyId) => freeze(withdrawAmendment(deps, amendments, id, dynastyId)),
    getAmendment: (id) => freeze(getOrThrow(amendments, id)),
    getPending: () => getPendingAmendments(amendments),
    getEnacted: () => getEnactedAmendments(amendments),
    getStats: () => computeStats(amendments),
    checkExpired: () => checkExpiredAmendments(deps, amendments),
  };
}

// ─── Propose ─────────────────────────────────────────────────────

function proposeAmendment(
  deps: AmendmentDeps,
  cfg: AmendmentConfig,
  amendments: Map<string, MutableAmendment>,
  params: ProposeAmendmentParams,
): MutableAmendment {
  const now = deps.clock.nowMicroseconds();
  const amendment: MutableAmendment = {
    amendmentId: deps.idGenerator.next(),
    title: params.title,
    description: params.description,
    proposerDynastyId: params.proposerDynastyId,
    worldId: params.worldId,
    phase: 'PROPOSED',
    proposedAt: now,
    debateEndsAt: now + cfg.debatePeriodUs,
    votingMotionId: null,
    votePassed: null,
    votePercentage: null,
    architectApproved: null,
    ratificationDeadline: null,
    enactedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    chronicleRef: null,
  };

  amendments.set(amendment.amendmentId, amendment);
  return amendment;
}

// ─── Phase Transitions ───────────────────────────────────────────

function toVoting(
  deps: AmendmentDeps,
  cfg: AmendmentConfig,
  amendments: Map<string, MutableAmendment>,
  amendmentId: string,
): MutableAmendment {
  const a = getOrThrow(amendments, amendmentId);
  assertPhase(a, ['PROPOSED', 'DEBATING']);

  const now = deps.clock.nowMicroseconds();
  if (a.phase === 'PROPOSED' && now < a.debateEndsAt) {
    a.phase = 'DEBATING';
    return a;
  }

  a.phase = 'VOTING';
  a.votingMotionId = deps.idGenerator.next();
  return a;
}

function recordVote(
  deps: AmendmentDeps,
  amendments: Map<string, MutableAmendment>,
  amendmentId: string,
  result: AmendmentVoteResult,
): MutableAmendment {
  const a = getOrThrow(amendments, amendmentId);
  assertPhase(a, ['VOTING']);

  a.votePassed = result.passed;
  a.votePercentage = result.percentageFor;

  if (!result.passed) {
    a.phase = 'REJECTED';
    a.rejectedAt = deps.clock.nowMicroseconds();
    a.rejectionReason = 'VOTE_FAILED';
  } else {
    a.phase = 'RATIFICATION';
    a.ratificationDeadline = null; // set when architect approves
  }

  return a;
}

function approve(
  deps: AmendmentDeps,
  cfg: AmendmentConfig,
  amendments: Map<string, MutableAmendment>,
  amendmentId: string,
): MutableAmendment {
  const a = getOrThrow(amendments, amendmentId);
  assertPhase(a, ['RATIFICATION']);

  const now = deps.clock.nowMicroseconds();
  a.architectApproved = true;
  a.ratificationDeadline = now + cfg.ratificationPeriodUs;
  return a;
}

function veto(
  deps: AmendmentDeps,
  amendments: Map<string, MutableAmendment>,
  amendmentId: string,
): MutableAmendment {
  const a = getOrThrow(amendments, amendmentId);
  const vetoablePhases: AmendmentPhase[] = ['PROPOSED', 'DEBATING', 'VOTING', 'RATIFICATION'];
  assertPhase(a, vetoablePhases);

  a.phase = 'REJECTED';
  a.rejectedAt = deps.clock.nowMicroseconds();
  a.rejectionReason = 'ARCHITECT_VETO';
  a.architectApproved = false;
  return a;
}

function enactAmendment(
  deps: AmendmentDeps,
  amendments: Map<string, MutableAmendment>,
  amendmentId: string,
  chronicleRef: string,
): MutableAmendment {
  const a = getOrThrow(amendments, amendmentId);
  assertPhase(a, ['RATIFICATION']);

  if (a.architectApproved !== true) {
    throw new Error('Cannot enact without Architect affirmative (Rule 9)');
  }

  const now = deps.clock.nowMicroseconds();
  if (a.ratificationDeadline !== null && now > a.ratificationDeadline) {
    a.phase = 'REJECTED';
    a.rejectedAt = now;
    a.rejectionReason = 'RATIFICATION_EXPIRED';
    return a;
  }

  a.phase = 'ENACTED';
  a.enactedAt = now;
  a.chronicleRef = chronicleRef;
  return a;
}

function withdrawAmendment(
  deps: AmendmentDeps,
  amendments: Map<string, MutableAmendment>,
  amendmentId: string,
  dynastyId: string,
): MutableAmendment {
  const a = getOrThrow(amendments, amendmentId);

  if (a.proposerDynastyId !== dynastyId) {
    throw new Error('Only the proposer can withdraw an amendment');
  }
  if (a.phase === 'ENACTED' || a.phase === 'REJECTED') {
    throw new Error(`Cannot withdraw amendment in phase: ${a.phase}`);
  }

  a.phase = 'REJECTED';
  a.rejectedAt = deps.clock.nowMicroseconds();
  a.rejectionReason = 'PROPOSER_WITHDRAWN';
  return a;
}

// ─── Queries ─────────────────────────────────────────────────────

function getPendingAmendments(
  amendments: Map<string, MutableAmendment>,
): ReadonlyArray<Amendment> {
  const result: Amendment[] = [];
  for (const a of amendments.values()) {
    if (a.phase !== 'ENACTED' && a.phase !== 'REJECTED') {
      result.push(freeze(a));
    }
  }
  return result;
}

function getEnactedAmendments(
  amendments: Map<string, MutableAmendment>,
): ReadonlyArray<Amendment> {
  const result: Amendment[] = [];
  for (const a of amendments.values()) {
    if (a.phase === 'ENACTED') result.push(freeze(a));
  }
  return result;
}

function checkExpiredAmendments(
  deps: AmendmentDeps,
  amendments: Map<string, MutableAmendment>,
): ReadonlyArray<Amendment> {
  const now = deps.clock.nowMicroseconds();
  const expired: Amendment[] = [];

  for (const a of amendments.values()) {
    if (
      a.phase === 'RATIFICATION' &&
      a.ratificationDeadline !== null &&
      now > a.ratificationDeadline
    ) {
      a.phase = 'REJECTED';
      a.rejectedAt = now;
      a.rejectionReason = 'RATIFICATION_EXPIRED';
      expired.push(freeze(a));
    }
  }

  return expired;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getOrThrow(
  amendments: Map<string, MutableAmendment>,
  id: string,
): MutableAmendment {
  const a = amendments.get(id);
  if (a === undefined) throw new Error(`Unknown amendment: ${id}`);
  return a;
}

function assertPhase(a: MutableAmendment, allowed: ReadonlyArray<AmendmentPhase>): void {
  if (!allowed.includes(a.phase)) {
    throw new Error(
      `Amendment ${a.amendmentId} is in phase ${a.phase}; expected one of: ${allowed.join(', ')}`,
    );
  }
}

function freeze(a: MutableAmendment): Amendment {
  return {
    amendmentId: a.amendmentId,
    title: a.title,
    description: a.description,
    proposerDynastyId: a.proposerDynastyId,
    worldId: a.worldId,
    phase: a.phase,
    proposedAt: a.proposedAt,
    debateEndsAt: a.debateEndsAt,
    votingMotionId: a.votingMotionId,
    votePassed: a.votePassed,
    votePercentage: a.votePercentage,
    architectApproved: a.architectApproved,
    ratificationDeadline: a.ratificationDeadline,
    enactedAt: a.enactedAt,
    rejectedAt: a.rejectedAt,
    rejectionReason: a.rejectionReason,
    chronicleRef: a.chronicleRef,
  };
}

function computeStats(amendments: Map<string, MutableAmendment>): AmendmentStats {
  let proposed = 0;
  let debating = 0;
  let voting = 0;
  let ratification = 0;
  let enacted = 0;
  let rejected = 0;

  for (const a of amendments.values()) {
    switch (a.phase) {
      case 'PROPOSED': proposed += 1; break;
      case 'DEBATING': debating += 1; break;
      case 'VOTING': voting += 1; break;
      case 'RATIFICATION': ratification += 1; break;
      case 'ENACTED': enacted += 1; break;
      case 'REJECTED': rejected += 1; break;
    }
  }

  return {
    total: amendments.size,
    proposed,
    debating,
    voting,
    ratification,
    enacted,
    rejected,
  };
}
