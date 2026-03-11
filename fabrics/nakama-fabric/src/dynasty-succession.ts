/**
 * Dynasty Succession — Succession planning and dispute resolution.
 *
 * Tracks succession lines with primary and backup heirs. Regency when
 * primary heir is a minor. Succession contests when multiple heirs
 * dispute control (resolved by voting). Legitimacy scoring based on
 * bloodline proximity, civic score, and service time.
 */

export type SuccessionStatus = 'ACTIVE' | 'IN_REGENCY' | 'IN_CONTEST' | 'DISPUTED' | 'RESOLVED';

export type ContestVoteType = 'SUPPORT' | 'OPPOSE' | 'ABSTAIN';

export interface SuccessionLine {
  readonly dynastyId: string;
  readonly primaryHeir: string | null;
  readonly backupHeirs: ReadonlyArray<string>;
  readonly status: SuccessionStatus;
  readonly establishedAt: bigint;
  readonly lastUpdatedAt: bigint;
}

export interface HeirDesignation {
  readonly dynastyId: string;
  readonly heirDynastyId: string;
  readonly position: number;
  readonly designatedAt: bigint;
  readonly designatedBy: string;
}

export interface RegencyRecord {
  readonly dynastyId: string;
  readonly regentDynastyId: string;
  readonly minorHeirId: string;
  readonly startedAt: bigint;
  readonly endedAt: bigint | null;
  readonly reason: string;
}

export interface SuccessionContest {
  readonly contestId: string;
  readonly dynastyId: string;
  readonly claimants: ReadonlyArray<string>;
  readonly startedAt: bigint;
  readonly resolvedAt: bigint | null;
  readonly winner: string | null;
  readonly voteCount: number;
}

export interface ContestVote {
  readonly contestId: string;
  readonly voterId: string;
  readonly claimantId: string;
  readonly voteType: ContestVoteType;
  readonly timestamp: bigint;
}

export interface LegitimacyScore {
  readonly dynastyId: string;
  readonly heirId: string;
  readonly bloodlineProximity: number;
  readonly civicScore: number;
  readonly timeServed: number;
  readonly totalScore: number;
}

export interface ContestOutcome {
  readonly contestId: string;
  readonly winner: string;
  readonly totalVotes: number;
  readonly supportVotes: number;
  readonly opposeVotes: number;
  readonly abstainVotes: number;
  readonly resolvedAt: bigint;
}

export interface DynastySuccession {
  designateHeir(
    dynastyId: string,
    heirId: string,
    position: number,
    designatedBy: string,
  ): 'success' | 'invalid-position';
  getSuccessionLine(dynastyId: string): SuccessionLine | 'not-found';
  setSuccessionOrder(dynastyId: string, heirIds: ReadonlyArray<string>): 'success';
  openContest(dynastyId: string, claimants: ReadonlyArray<string>): string;
  voteInContest(contestId: string, voterId: string, claimantId: string): 'success' | 'not-found';
  resolveContest(contestId: string): ContestOutcome | 'not-found' | 'already-resolved';
  getLegitimacy(
    dynastyId: string,
    heirId: string,
    proximity: number,
    civic: number,
    served: number,
  ): LegitimacyScore;
  enterRegency(
    dynastyId: string,
    regentId: string,
    minorId: string,
    reason: string,
  ): 'success' | 'already-in-regency';
  exitRegency(dynastyId: string): 'success' | 'not-in-regency';
  getRegencyRecord(dynastyId: string): RegencyRecord | 'not-found';
  getAllContests(): ReadonlyArray<SuccessionContest>;
  getContestVotes(contestId: string): ReadonlyArray<ContestVote>;
}

interface SuccessionState {
  readonly lines: Map<string, MutableSuccessionLine>;
  readonly contests: Map<string, MutableContest>;
  readonly votes: Map<string, Array<ContestVote>>;
  readonly regencies: Map<string, MutableRegency>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
  contestCounter: number;
}

interface MutableSuccessionLine {
  readonly dynastyId: string;
  primaryHeir: string | null;
  backupHeirs: Array<string>;
  status: SuccessionStatus;
  readonly establishedAt: bigint;
  lastUpdatedAt: bigint;
}

interface MutableContest {
  readonly contestId: string;
  readonly dynastyId: string;
  readonly claimants: ReadonlyArray<string>;
  readonly startedAt: bigint;
  resolvedAt: bigint | null;
  winner: string | null;
  voteCount: number;
}

interface MutableRegency {
  readonly dynastyId: string;
  readonly regentDynastyId: string;
  readonly minorHeirId: string;
  readonly startedAt: bigint;
  endedAt: bigint | null;
  readonly reason: string;
}

export function createDynastySuccession(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
}): DynastySuccession {
  const state: SuccessionState = {
    lines: new Map(),
    contests: new Map(),
    votes: new Map(),
    regencies: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    contestCounter: 0,
  };

  return {
    designateHeir: (dId, hId, pos, by) => designateHeirImpl(state, dId, hId, pos, by),
    getSuccessionLine: (id) => getSuccessionLineImpl(state, id),
    setSuccessionOrder: (id, heirs) => setSuccessionOrderImpl(state, id, heirs),
    openContest: (id, claimants) => openContestImpl(state, id, claimants),
    voteInContest: (cId, vId, clId) => voteInContestImpl(state, cId, vId, clId),
    resolveContest: (id) => resolveContestImpl(state, id),
    getLegitimacy: (dId, hId, prox, civic, served) =>
      getLegitimacyImpl(state, dId, hId, prox, civic, served),
    enterRegency: (dId, rId, mId, reason) => enterRegencyImpl(state, dId, rId, mId, reason),
    exitRegency: (id) => exitRegencyImpl(state, id),
    getRegencyRecord: (id) => getRegencyRecordImpl(state, id),
    getAllContests: () => getAllContestsImpl(state),
    getContestVotes: (id) => getContestVotesImpl(state, id),
  };
}

function ensureSuccessionLine(state: SuccessionState, dynastyId: string): MutableSuccessionLine {
  const existing = state.lines.get(dynastyId);
  if (existing !== undefined) return existing;
  const line: MutableSuccessionLine = {
    dynastyId,
    primaryHeir: null,
    backupHeirs: [],
    status: 'ACTIVE',
    establishedAt: state.clock.nowMicroseconds(),
    lastUpdatedAt: state.clock.nowMicroseconds(),
  };
  state.lines.set(dynastyId, line);
  return line;
}

function designateHeirImpl(
  state: SuccessionState,
  dynastyId: string,
  heirId: string,
  position: number,
  designatedBy: string,
): 'success' | 'invalid-position' {
  if (position < 0) return 'invalid-position';
  const line = ensureSuccessionLine(state, dynastyId);
  if (position === 0) {
    line.primaryHeir = heirId;
  } else {
    const idx = position - 1;
    while (line.backupHeirs.length <= idx) {
      line.backupHeirs.push('');
    }
    line.backupHeirs[idx] = heirId;
  }
  line.lastUpdatedAt = state.clock.nowMicroseconds();
  return 'success';
}

function getSuccessionLineImpl(
  state: SuccessionState,
  dynastyId: string,
): SuccessionLine | 'not-found' {
  const line = state.lines.get(dynastyId);
  if (line === undefined) return 'not-found';
  return {
    dynastyId: line.dynastyId,
    primaryHeir: line.primaryHeir,
    backupHeirs: [...line.backupHeirs],
    status: line.status,
    establishedAt: line.establishedAt,
    lastUpdatedAt: line.lastUpdatedAt,
  };
}

function setSuccessionOrderImpl(
  state: SuccessionState,
  dynastyId: string,
  heirIds: ReadonlyArray<string>,
): 'success' {
  const line = ensureSuccessionLine(state, dynastyId);
  if (heirIds.length === 0) {
    line.primaryHeir = null;
    line.backupHeirs = [];
  } else {
    const first = heirIds[0];
    line.primaryHeir = first !== undefined ? first : null;
    line.backupHeirs = heirIds.slice(1) as Array<string>;
  }
  line.lastUpdatedAt = state.clock.nowMicroseconds();
  return 'success';
}

function openContestImpl(
  state: SuccessionState,
  dynastyId: string,
  claimants: ReadonlyArray<string>,
): string {
  state.contestCounter = state.contestCounter + 1;
  const contestId = 'contest-' + String(state.contestCounter);
  const contest: MutableContest = {
    contestId,
    dynastyId,
    claimants: [...claimants],
    startedAt: state.clock.nowMicroseconds(),
    resolvedAt: null,
    winner: null,
    voteCount: 0,
  };
  state.contests.set(contestId, contest);
  state.votes.set(contestId, []);
  const line = ensureSuccessionLine(state, dynastyId);
  line.status = 'IN_CONTEST';
  line.lastUpdatedAt = state.clock.nowMicroseconds();
  return contestId;
}

function voteInContestImpl(
  state: SuccessionState,
  contestId: string,
  voterId: string,
  claimantId: string,
): 'success' | 'not-found' {
  const contest = state.contests.get(contestId);
  if (contest === undefined) return 'not-found';
  const voteList = state.votes.get(contestId);
  if (voteList === undefined) return 'not-found';
  const vote: ContestVote = {
    contestId,
    voterId,
    claimantId,
    voteType: 'SUPPORT',
    timestamp: state.clock.nowMicroseconds(),
  };
  voteList.push(vote);
  contest.voteCount = contest.voteCount + 1;
  return 'success';
}

function resolveContestImpl(
  state: SuccessionState,
  contestId: string,
): ContestOutcome | 'not-found' | 'already-resolved' {
  const contest = state.contests.get(contestId);
  if (contest === undefined) return 'not-found';
  if (contest.resolvedAt !== null) return 'already-resolved';
  const voteList = state.votes.get(contestId);
  if (voteList === undefined) return 'not-found';
  const tallies = new Map<string, number>();
  for (const v of voteList) {
    const current = tallies.get(v.claimantId) ?? 0;
    tallies.set(v.claimantId, current + 1);
  }
  let maxVotes = 0;
  let winner = '';
  for (const entry of tallies.entries()) {
    const claimantId = entry[0];
    const count = entry[1];
    if (claimantId === undefined || count === undefined) continue;
    if (count > maxVotes) {
      maxVotes = count;
      winner = claimantId;
    }
  }
  const now = state.clock.nowMicroseconds();
  contest.winner = winner;
  contest.resolvedAt = now;
  const line = state.lines.get(contest.dynastyId);
  if (line !== undefined) {
    line.primaryHeir = winner;
    line.status = 'RESOLVED';
    line.lastUpdatedAt = now;
  }
  return {
    contestId,
    winner,
    totalVotes: voteList.length,
    supportVotes: maxVotes,
    opposeVotes: 0,
    abstainVotes: 0,
    resolvedAt: now,
  };
}

function getLegitimacyImpl(
  state: SuccessionState,
  dynastyId: string,
  heirId: string,
  bloodlineProximity: number,
  civicScore: number,
  timeServed: number,
): LegitimacyScore {
  const proximityScore = bloodlineProximity * 40;
  const civicWeight = civicScore * 35;
  const serviceWeight = timeServed * 25;
  const totalScore = proximityScore + civicWeight + serviceWeight;
  return {
    dynastyId,
    heirId,
    bloodlineProximity,
    civicScore,
    timeServed,
    totalScore,
  };
}

function enterRegencyImpl(
  state: SuccessionState,
  dynastyId: string,
  regentId: string,
  minorId: string,
  reason: string,
): 'success' | 'already-in-regency' {
  const existing = state.regencies.get(dynastyId);
  if (existing !== undefined && existing.endedAt === null) {
    return 'already-in-regency';
  }
  const regency: MutableRegency = {
    dynastyId,
    regentDynastyId: regentId,
    minorHeirId: minorId,
    startedAt: state.clock.nowMicroseconds(),
    endedAt: null,
    reason,
  };
  state.regencies.set(dynastyId, regency);
  const line = ensureSuccessionLine(state, dynastyId);
  line.status = 'IN_REGENCY';
  line.lastUpdatedAt = state.clock.nowMicroseconds();
  return 'success';
}

function exitRegencyImpl(state: SuccessionState, dynastyId: string): 'success' | 'not-in-regency' {
  const regency = state.regencies.get(dynastyId);
  if (regency === undefined || regency.endedAt !== null) {
    return 'not-in-regency';
  }
  regency.endedAt = state.clock.nowMicroseconds();
  const line = state.lines.get(dynastyId);
  if (line !== undefined) {
    line.status = 'ACTIVE';
    line.lastUpdatedAt = state.clock.nowMicroseconds();
  }
  return 'success';
}

function getRegencyRecordImpl(
  state: SuccessionState,
  dynastyId: string,
): RegencyRecord | 'not-found' {
  const regency = state.regencies.get(dynastyId);
  if (regency === undefined) return 'not-found';
  return {
    dynastyId: regency.dynastyId,
    regentDynastyId: regency.regentDynastyId,
    minorHeirId: regency.minorHeirId,
    startedAt: regency.startedAt,
    endedAt: regency.endedAt,
    reason: regency.reason,
  };
}

function getAllContestsImpl(state: SuccessionState): ReadonlyArray<SuccessionContest> {
  const result: Array<SuccessionContest> = [];
  for (const c of state.contests.values()) {
    result.push({
      contestId: c.contestId,
      dynastyId: c.dynastyId,
      claimants: c.claimants,
      startedAt: c.startedAt,
      resolvedAt: c.resolvedAt,
      winner: c.winner,
      voteCount: c.voteCount,
    });
  }
  return result;
}

function getContestVotesImpl(
  state: SuccessionState,
  contestId: string,
): ReadonlyArray<ContestVote> {
  const votes = state.votes.get(contestId);
  return votes !== undefined ? votes : [];
}
