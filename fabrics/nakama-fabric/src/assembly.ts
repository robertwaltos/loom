/**
 * The Assembly — Governance voting system.
 *
 * Bible v1.2: The Assembly is the civilisation's parliament.
 * Every dynasty with civic score > 0 can vote. The Architect
 * (game designer) holds a weighted advisory vote.
 *
 * Vote categories and thresholds:
 *   Ordinary (50%)  — trade agreements, minor policy
 *   Significant (65%) — war declarations, territory changes
 *   Constitutional (75%) — fundamental law changes
 *
 * Voting period: configurable (default 21 days in-game).
 * Architect's vote weight: 7% ordinary, 14% significant, null constitutional.
 *
 * Votes are tallied by weighted civic score. Every dynasty gets
 * at least the dignity floor (0.001) as voting weight.
 */

import type { CivicScoreResult } from './civic-score.js';

export type VoteCategory = 'ordinary' | 'significant' | 'constitutional';

export type VoteChoice = 'for' | 'against' | 'abstain';

export type MotionStatus = 'open' | 'passed' | 'failed' | 'expired';

export interface Motion {
  readonly motionId: string;
  readonly title: string;
  readonly description: string;
  readonly category: VoteCategory;
  readonly proposerDynastyId: string;
  readonly worldId: string;
  readonly status: MotionStatus;
  readonly createdAt: number;
  readonly closesAt: number;
}

export interface CastVoteParams {
  readonly motionId: string;
  readonly dynastyId: string;
  readonly choice: VoteChoice;
  readonly civicScore: CivicScoreResult;
}

export interface VoteRecord {
  readonly dynastyId: string;
  readonly choice: VoteChoice;
  readonly weight: number;
  readonly castAt: number;
}

export interface TallyResult {
  readonly motionId: string;
  readonly category: VoteCategory;
  readonly status: MotionStatus;
  readonly weightedFor: number;
  readonly weightedAgainst: number;
  readonly weightedAbstain: number;
  readonly totalWeight: number;
  readonly threshold: number;
  readonly percentageFor: number;
  readonly voteCount: number;
}

export interface Assembly {
  proposeMotion(params: ProposeMotionParams): Motion;
  castVote(params: CastVoteParams): VoteRecord;
  castArchitectVote(motionId: string, choice: VoteChoice): VoteRecord;
  tallyMotion(motionId: string): TallyResult;
  getMotion(motionId: string): Motion;
  listOpenMotions(): ReadonlyArray<Motion>;
  getVotesForMotion(motionId: string): ReadonlyArray<VoteRecord>;
  closeExpiredMotions(currentTime: number): ReadonlyArray<TallyResult>;
}

export interface ProposeMotionParams {
  readonly motionId: string;
  readonly title: string;
  readonly description: string;
  readonly category: VoteCategory;
  readonly proposerDynastyId: string;
  readonly worldId: string;
}

const THRESHOLDS: Readonly<Record<VoteCategory, number>> = {
  ordinary: 0.5,
  significant: 0.65,
  constitutional: 0.75,
};

const ARCHITECT_WEIGHT: Readonly<Record<VoteCategory, number>> = {
  ordinary: 0.07,
  significant: 0.14,
  constitutional: 0,
};

const ARCHITECT_DYNASTY_ID = '__architect__';

interface MutableMotion {
  readonly motionId: string;
  readonly title: string;
  readonly description: string;
  readonly category: VoteCategory;
  readonly proposerDynastyId: string;
  readonly worldId: string;
  status: MotionStatus;
  readonly createdAt: number;
  readonly closesAt: number;
}

interface AssemblyState {
  readonly motions: Map<string, MutableMotion>;
  readonly votes: Map<string, VoteRecord[]>;
  readonly clock: { nowMicroseconds(): number };
  readonly votingPeriodMicroseconds: number;
}

export interface AssemblyConfig {
  readonly clock: { nowMicroseconds(): number };
  readonly votingPeriodMicroseconds: number;
}

export function createAssembly(config: AssemblyConfig): Assembly {
  const state: AssemblyState = {
    motions: new Map(),
    votes: new Map(),
    clock: config.clock,
    votingPeriodMicroseconds: config.votingPeriodMicroseconds,
  };

  return {
    proposeMotion: (params) => proposeMotionImpl(state, params),
    castVote: (params) => castVoteImpl(state, params),
    castArchitectVote: (id, choice) => castArchitectVoteImpl(state, id, choice),
    tallyMotion: (id) => tallyMotionImpl(state, id),
    getMotion: (id) => getMotionImpl(state, id),
    listOpenMotions: () => listOpenImpl(state),
    getVotesForMotion: (id) => getVotesImpl(state, id),
    closeExpiredMotions: (time) => closeExpiredImpl(state, time),
  };
}

function proposeMotionImpl(state: AssemblyState, params: ProposeMotionParams): Motion {
  if (state.motions.has(params.motionId)) {
    throw new Error(`Motion ${params.motionId} already exists`);
  }
  const now = state.clock.nowMicroseconds();
  const motion: MutableMotion = {
    motionId: params.motionId,
    title: params.title,
    description: params.description,
    category: params.category,
    proposerDynastyId: params.proposerDynastyId,
    worldId: params.worldId,
    status: 'open',
    createdAt: now,
    closesAt: now + state.votingPeriodMicroseconds,
  };
  state.motions.set(params.motionId, motion);
  state.votes.set(params.motionId, []);
  return motion;
}

function castVoteImpl(state: AssemblyState, params: CastVoteParams): VoteRecord {
  getOpenMotion(state, params.motionId);
  const existing = getVotesImpl(state, params.motionId);
  if (existing.some((v) => v.dynastyId === params.dynastyId)) {
    throw new Error(`Dynasty ${params.dynastyId} already voted on ${params.motionId}`);
  }
  const record: VoteRecord = {
    dynastyId: params.dynastyId,
    choice: params.choice,
    weight: params.civicScore.votingWeight,
    castAt: state.clock.nowMicroseconds(),
  };
  state.votes.get(params.motionId)?.push(record);
  return record;
}

function castArchitectVoteImpl(
  state: AssemblyState,
  motionId: string,
  choice: VoteChoice,
): VoteRecord {
  const motion = getOpenMotion(state, motionId);
  const architectWeight = ARCHITECT_WEIGHT[motion.category];
  if (architectWeight === 0) {
    throw new Error('Architect cannot vote on constitutional motions');
  }
  const existing = getVotesImpl(state, motionId);
  if (existing.some((v) => v.dynastyId === ARCHITECT_DYNASTY_ID)) {
    throw new Error('Architect has already voted on this motion');
  }
  const record: VoteRecord = {
    dynastyId: ARCHITECT_DYNASTY_ID,
    choice,
    weight: architectWeight,
    castAt: state.clock.nowMicroseconds(),
  };
  state.votes.get(motionId)?.push(record);
  return record;
}

function tallyMotionImpl(state: AssemblyState, motionId: string): TallyResult {
  const motion = state.motions.get(motionId);
  if (motion === undefined) throw new Error(`Motion ${motionId} not found`);
  const votes = getVotesImpl(state, motionId);
  return computeTally(motion, votes);
}

function computeTally(motion: Motion, votes: ReadonlyArray<VoteRecord>): TallyResult {
  let weightedFor = 0;
  let weightedAgainst = 0;
  let weightedAbstain = 0;

  for (const vote of votes) {
    if (vote.choice === 'for') weightedFor += vote.weight;
    else if (vote.choice === 'against') weightedAgainst += vote.weight;
    else weightedAbstain += vote.weight;
  }

  const totalWeight = weightedFor + weightedAgainst + weightedAbstain;
  const decisive = weightedFor + weightedAgainst;
  const threshold = THRESHOLDS[motion.category];
  const percentageFor = decisive > 0 ? weightedFor / decisive : 0;
  const status = resolveStatus(motion, percentageFor, threshold);

  return {
    motionId: motion.motionId,
    category: motion.category,
    status,
    weightedFor,
    weightedAgainst,
    weightedAbstain,
    totalWeight,
    threshold,
    percentageFor,
    voteCount: votes.length,
  };
}

function resolveStatus(motion: Motion, percentageFor: number, threshold: number): MotionStatus {
  if (motion.status !== 'open') return motion.status;
  return percentageFor >= threshold ? 'passed' : 'failed';
}

function getMotionImpl(state: AssemblyState, motionId: string): Motion {
  const motion = state.motions.get(motionId);
  if (motion === undefined) throw new Error(`Motion ${motionId} not found`);
  return motion;
}

function listOpenImpl(state: AssemblyState): ReadonlyArray<Motion> {
  const result: Motion[] = [];
  for (const motion of state.motions.values()) {
    if (motion.status === 'open') result.push(motion);
  }
  return result;
}

function getVotesImpl(state: AssemblyState, motionId: string): ReadonlyArray<VoteRecord> {
  return state.votes.get(motionId) ?? [];
}

function getOpenMotion(state: AssemblyState, motionId: string): MutableMotion {
  const motion = state.motions.get(motionId);
  if (motion === undefined) throw new Error(`Motion ${motionId} not found`);
  if (motion.status !== 'open') {
    throw new Error(`Motion ${motionId} is ${motion.status}, not open`);
  }
  return motion;
}

function closeExpiredImpl(state: AssemblyState, currentTime: number): ReadonlyArray<TallyResult> {
  const results: TallyResult[] = [];
  for (const motion of state.motions.values()) {
    if (motion.status !== 'open') continue;
    if (currentTime < motion.closesAt) continue;

    const votes = getVotesImpl(state, motion.motionId);
    const tally = computeTally(motion, votes);
    motion.status = tally.status === 'open' ? 'expired' : tally.status;
    results.push({ ...tally, status: motion.status });
  }
  return results;
}
