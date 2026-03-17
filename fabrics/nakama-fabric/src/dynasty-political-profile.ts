/**
 * Dynasty Political Profile ΓÇö A dynasty's formal political standing in the Assembly ecosystem.
 *
 * Bible v1.2: Dynasties develop political identity over the Concord's history through
 * their alignment, voting record, committee participation, and relationship to the
 * founding wounds. The Architect knows approximately 100 dynasties by name at Year 105 ΓÇö
 * this is a meaningful distinction that shapes how the Architect responds to their actions.
 *
 * AssemblyStanding evolves with civic score, committee participation, and time.
 * ARCHITECT_ADVISORY standing is capped at 7 dynasties simultaneously.
 * COUNCIL standing is capped at 42 (the FULL_RECKONING threshold).
 */

import type { CommitteeId } from './assembly-committee-system.js';

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type AssemblyStanding =
  | 'OBSERVER'
  | 'MEMBER'
  | 'NOTABLE'
  | 'INFLUENTIAL'
  | 'COUNCIL'
  | 'ARCHITECT_ADVISORY';

export type PoliticalAlignment =
  | 'CONTINUATIONIST'
  | 'RETURNIST'
  | 'ASCENDANCY_ADJACENT'
  | 'REFORMIST'
  | 'NEUTRAL'
  | 'UNDECLARED';

export interface VotingRecord {
  readonly motionId: string;
  readonly year: number;
  readonly vote: 'AYE' | 'NAY' | 'ABSTAIN' | 'ABSENT';
  readonly committeeId: CommitteeId | null;
}

export interface DynastyPoliticalProfile {
  readonly dynastyId: string;
  readonly assemblyStanding: AssemblyStanding;
  readonly alignment: PoliticalAlignment;
  readonly civicScore: number;
  readonly votingHistory: readonly VotingRecord[];
  readonly committeesMemberships: readonly CommitteeId[];
  readonly firstAssemblyYear: number;
  readonly banishments: number;
  readonly architectAudienceCount: number;
}

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * The Architect has personally met exactly 100 dynasties by Year 105.
 * Being in this group is a rare and meaningful distinction.
 */
export const ARCHITECT_KNOWN_DYNASTY_COUNT_AT_YEAR_105 = 100;

/** Never more than 7 dynasties hold ARCHITECT_ADVISORY standing simultaneously. */
export const ARCHITECT_ADVISORY_DYNASTY_CAP = 7;

/** Council standing capped at 42 ΓÇö the FULL_RECKONING threshold. */
export const COUNCIL_DYNASTY_CAP = 42;

/** Minimum civic score required to hold each AssemblyStanding tier. */
export const STANDING_CIVIC_SCORE_MINIMUMS: Record<AssemblyStanding, number> = {
  OBSERVER: 0,
  MEMBER: 0.1,
  NOTABLE: 0.3,
  INFLUENTIAL: 0.5,
  COUNCIL: 0.7,
  ARCHITECT_ADVISORY: 0.9,
};

// ΓöÇΓöÇ Profile Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Creates a new dynasty political profile with default values for a newly joined dynasty.
 */
export function createDynastyPoliticalProfile(
  dynastyId: string,
  firstAssemblyYear: number,
): DynastyPoliticalProfile {
  return {
    dynastyId,
    assemblyStanding: 'OBSERVER',
    alignment: 'UNDECLARED',
    civicScore: 0,
    votingHistory: [],
    committeesMemberships: [],
    firstAssemblyYear,
    banishments: 0,
    architectAudienceCount: 0,
  };
}

// ΓöÇΓöÇ Standing Computation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Computes the AssemblyStanding from the dynasty's civic score alone.
 * Does not enforce caps ΓÇö callers must apply ARCHITECT_ADVISORY_DYNASTY_CAP and
 * COUNCIL_DYNASTY_CAP when managing the full Assembly population.
 */
export function computeAssemblyStanding(profile: DynastyPoliticalProfile): AssemblyStanding {
  const score = profile.civicScore;
  if (score >= STANDING_CIVIC_SCORE_MINIMUMS.ARCHITECT_ADVISORY) {
    return 'ARCHITECT_ADVISORY';
  }
  if (score >= STANDING_CIVIC_SCORE_MINIMUMS.COUNCIL) {
    return 'COUNCIL';
  }
  if (score >= STANDING_CIVIC_SCORE_MINIMUMS.INFLUENTIAL) {
    return 'INFLUENTIAL';
  }
  if (score >= STANDING_CIVIC_SCORE_MINIMUMS.NOTABLE) {
    return 'NOTABLE';
  }
  if (score >= STANDING_CIVIC_SCORE_MINIMUMS.MEMBER) {
    return 'MEMBER';
  }
  return 'OBSERVER';
}

// ΓöÇΓöÇ Profile Mutations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Appends a vote to the dynasty's voting history. Returns a new profile.
 */
export function recordVote(
  profile: DynastyPoliticalProfile,
  vote: VotingRecord,
): DynastyPoliticalProfile {
  return {
    ...profile,
    votingHistory: [...profile.votingHistory, vote],
  };
}

// ΓöÇΓöÇ Eligibility Checks ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns whether the dynasty is eligible for an Architect audience.
 * Requires COUNCIL or ARCHITECT_ADVISORY standing and civicScore >= 0.85.
 */
export function isEligibleForArchitectAudience(profile: DynastyPoliticalProfile): boolean {
  const qualifyingStandings: AssemblyStanding[] = ['COUNCIL', 'ARCHITECT_ADVISORY'];
  const meetsStanding = qualifyingStandings.includes(profile.assemblyStanding);
  return meetsStanding && profile.civicScore >= 0.85;
}

// ΓöÇΓöÇ Population Analytics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns a count of each PoliticalAlignment across the provided profiles.
 */
export function getAlignmentDistribution(
  profiles: DynastyPoliticalProfile[],
): Record<PoliticalAlignment, number> {
  const distribution: Record<PoliticalAlignment, number> = {
    CONTINUATIONIST: 0,
    RETURNIST: 0,
    ASCENDANCY_ADJACENT: 0,
    REFORMIST: 0,
    NEUTRAL: 0,
    UNDECLARED: 0,
  };
  for (const profile of profiles) {
    distribution[profile.alignment] += 1;
  }
  return distribution;
}
