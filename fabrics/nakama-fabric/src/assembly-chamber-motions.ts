/**
 * Assembly Chamber Motions ΓÇö specific motion types that trigger sealed chamber conditions.
 *
 * Bible v1.2: Certain Assembly motions are Sealed Chamber keys ΓÇö passing them
 * unlocks narrative content, declassified documents, or structural changes
 * that cannot be achieved any other way.
 *
 * ASCENDANCY_REPRESENTATION_VOTE requires the Architect's affirmative vote.
 * This is the only motion category where the Architect's vote is formally required
 * rather than advisory.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ChamberMotionType =
  | 'WORLD_247_DECLASSIFICATION'
  | 'WORLD_499_QUARANTINE_LIFT'
  | 'WORLD_412_ACCOUNT_RELEASE'
  | 'LATTICE_DEGRADATION_PETITION'
  | 'ADEYEMI_AUDIT_MOTION'
  | 'ASCENDANCY_REPRESENTATION_VOTE';

export type ChamberMotionStatus =
  | 'PENDING'
  | 'DEBATE'
  | 'VOTED'
  | 'PASSED'
  | 'FAILED'
  | 'WITHDRAWN';

export type VoteThreshold = 'ORDINARY' | 'SIGNIFICANT' | 'CONSTITUTIONAL';

export type ArchitectVote = 'FOR' | 'AGAINST' | 'ABSTAIN' | 'NOT_CAST';

export interface ChamberMotion {
  readonly motionId: string;
  readonly motionType: ChamberMotionType;
  readonly filedByDynastyId: string;
  readonly filedAtIngameYear: number;
  readonly status: ChamberMotionStatus;
  readonly voteResult: {
    readonly for: number;
    readonly against: number;
    readonly abstain: number;
  } | null;
  readonly requiredThreshold: VoteThreshold;
  readonly architectVote: ArchitectVote;
  readonly chamberUnlockTriggered: boolean;
}

export interface MotionRequirement {
  readonly threshold: VoteThreshold;
  readonly architectRequired: boolean;
  readonly description: string;
}

export interface ArchitectRequirementCheck {
  readonly requiresArchitect: boolean;
  readonly architectHasVoted: boolean;
  readonly canPass: boolean;
}

// ΓöÇΓöÇ Motion Requirements ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const MOTION_REQUIREMENTS: ReadonlyMap<ChamberMotionType, MotionRequirement> = new Map([
  [
    'WORLD_247_DECLASSIFICATION',
    {
      threshold: 'SIGNIFICANT',
      architectRequired: false,
      description:
        'Declassifies World 247 survey data and founding-era communications. Triggers Chamber 2.',
    },
  ],
  [
    'WORLD_499_QUARANTINE_LIFT',
    {
      threshold: 'ORDINARY',
      architectRequired: false,
      description: 'Lifts the quarantine order on World 499. Triggers Chamber 4 access protocols.',
    },
  ],
  [
    'WORLD_412_ACCOUNT_RELEASE',
    {
      threshold: 'SIGNIFICANT',
      architectRequired: false,
      description:
        'Releases sealed accounts from World 412 upon reaching 10,000 Chronicle citations. Triggers Chamber 3.',
    },
  ],
  [
    'LATTICE_DEGRADATION_PETITION',
    {
      threshold: 'ORDINARY',
      architectRequired: false,
      description:
        'Formal Assembly petition regarding Lattice degradation events. One of the Kwame Papers conditions.',
    },
  ],
  [
    'ADEYEMI_AUDIT_MOTION',
    {
      threshold: 'SIGNIFICANT',
      architectRequired: false,
      description:
        "Nnamdi Achebe's founding world selection audit motion. Counts toward the founding wound debate requirement. The Architect will vote though not required to.",
    },
  ],
  [
    'ASCENDANCY_REPRESENTATION_VOTE',
    {
      threshold: 'CONSTITUTIONAL',
      architectRequired: true,
      description:
        'Seats an Ascendancy delegation in the Assembly. Requires Architect affirmative. The Kwame signatory on the technical appendix is acknowledged in the Architect vote statement.',
    },
  ],
]);

// ΓöÇΓöÇ The Architect's Statements ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ARCHITECT_VOTE_FOR_ASCENDANCY_REPRESENTATION: string = `Formal Statement of the Architect ΓÇö Assembly Session, ASCENDANCY_REPRESENTATION_VOTE

I vote to seat the delegation.

I am required by the constitutional threshold to cast this vote affirmatively for the motion to pass. I am choosing to cast it affirmatively. I want to be precise about the distinction: I am not voting under compulsion. I am voting because I believe the delegation should be seated, and because I believe the Assembly should understand why.

The Ascendancy has operated outside the Assembly's formal structure since Year 14. That exclusion was not accidental. It was the product of decisions made in Years 8 through 12 that I observed, and in some cases advised on, and did not prevent. I have carried that with me. The Assembly should know that.

I have reviewed the delegation's credentials and the technical appendix appended to their petition. The Assembly should know that I recognise the name on the technical appendix. I have always known it. I have been waiting to see whether anyone else would find it, or whether it would arrive here this way ΓÇö through a formal motion, in public record, in a session I am required to address. It has arrived this way. I find that appropriate.

Seating this delegation does not resolve what the Ascendancy represents or what the founding selection produced. It creates the conditions under which those questions can be addressed through the Assembly rather than outside it. That is the correct direction.

I vote to seat the delegation. I have always known it would come to this. I am glad it has.`;

export const ARCHITECT_VOTE_AGAINST_ASCENDANCY_REPRESENTATION: string = `Formal Statement of the Architect ΓÇö Assembly Session, ASCENDANCY_REPRESENTATION_VOTE

I vote against. I will explain this decision at a time of my choosing.`;

// ΓöÇΓöÇ Error Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export class ChamberMotionError extends Error {
  readonly code: string;
  readonly motionId: string;

  constructor(code: string, motionId: string, detail: string) {
    super(`${code}: motion ${motionId} ΓÇö ${detail}`);
    this.name = 'ChamberMotionError';
    this.code = code;
    this.motionId = motionId;
  }
}

// ΓöÇΓöÇ Terminal Status Guard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const TERMINAL_STATUSES = new Set<ChamberMotionStatus>(['PASSED', 'FAILED', 'WITHDRAWN']);

function assertNotTerminal(motion: ChamberMotion, operation: string): void {
  if (TERMINAL_STATUSES.has(motion.status)) {
    throw new ChamberMotionError(
      'INVALID_TRANSITION',
      motion.motionId,
      `status is ${motion.status}, cannot ${operation}`,
    );
  }
}

function assertStatus(
  motion: ChamberMotion,
  expected: ChamberMotionStatus,
  operation: string,
): void {
  if (motion.status !== expected) {
    throw new ChamberMotionError(
      'INVALID_TRANSITION',
      motion.motionId,
      `status is ${motion.status}, expected ${expected} to ${operation}`,
    );
  }
}

// ΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createChamberMotion(
  motionId: string,
  motionType: ChamberMotionType,
  filedByDynastyId: string,
  ingameYear: number,
): ChamberMotion {
  const requirements = MOTION_REQUIREMENTS.get(motionType);
  if (requirements === undefined) {
    throw new ChamberMotionError('UNKNOWN_MOTION_TYPE', motionId, `unknown type: ${motionType}`);
  }
  return {
    motionId,
    motionType,
    filedByDynastyId,
    filedAtIngameYear: ingameYear,
    status: 'PENDING',
    voteResult: null,
    requiredThreshold: requirements.threshold,
    architectVote: 'NOT_CAST',
    chamberUnlockTriggered: false,
  };
}

// ΓöÇΓöÇ State Transitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function beginDebate(motion: ChamberMotion): ChamberMotion {
  assertStatus(motion, 'PENDING', 'begin debate');
  return { ...motion, status: 'DEBATE' };
}

export function castVote(
  motion: ChamberMotion,
  result: { readonly for: number; readonly against: number; readonly abstain: number },
  architectVote: 'FOR' | 'AGAINST' | 'ABSTAIN',
): ChamberMotion {
  assertStatus(motion, 'DEBATE', 'cast vote');
  return {
    ...motion,
    status: 'VOTED',
    voteResult: result,
    architectVote,
  };
}

export function resolveMotion(motion: ChamberMotion, passed: boolean): ChamberMotion {
  assertStatus(motion, 'VOTED', 'resolve motion');
  return {
    ...motion,
    status: passed ? 'PASSED' : 'FAILED',
    chamberUnlockTriggered: passed,
  };
}

export function withdrawMotion(motion: ChamberMotion): ChamberMotion {
  assertNotTerminal(motion, 'withdraw');
  return { ...motion, status: 'WITHDRAWN' };
}

// ΓöÇΓöÇ Queries ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function checkArchitectRequirement(motion: ChamberMotion): ArchitectRequirementCheck {
  const requirements = MOTION_REQUIREMENTS.get(motion.motionType);
  const requiresArchitect = requirements?.architectRequired === true;
  const architectHasVoted = motion.architectVote !== 'NOT_CAST';
  const architectApproved = motion.architectVote === 'FOR';
  const canPass = requiresArchitect ? architectHasVoted && architectApproved : true;
  return { requiresArchitect, architectHasVoted, canPass };
}
