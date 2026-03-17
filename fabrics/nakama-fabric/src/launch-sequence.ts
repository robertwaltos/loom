/**
 * Launch Sequence Monitor ΓÇö Pre-launch milestone tracking and Founding Mark window.
 *
 * Implementation Bible Part 17:
 * Eight milestones must be VERIFIED before launch is cleared.
 * The Founding Mark window opens at launch (2027-01-01), runs 30 days,
 * and closes when either the window expires or 500 marks are issued.
 *
 * FOUNDING MARK is the rarest designation in The Concord ΓÇö holders are
 * the civilisation's grandparents. PROMETHEUS or higher founder tier required.
 */

import type { FounderTier } from './subscription-lifecycle.js';

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type MilestoneStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

export interface LaunchMilestone {
  readonly milestoneId: string;
  readonly name: string;
  readonly description: string;
  readonly status: MilestoneStatus;
  readonly verifiedAt?: string;
  readonly failureReason?: string;
  readonly requiredForLaunch: boolean;
}

export interface FoundingMarkWindow {
  readonly opensAt: string;
  readonly closesAt: string;
  readonly maxMarks: number;
  readonly marksIssued: number;
  readonly isOpen: boolean;
  readonly dynastiesEligible: string[];
}

export interface LaunchState {
  readonly launchDate: string;
  readonly isLaunched: boolean;
  readonly milestones: LaunchMilestone[];
  readonly foundingMarkWindow: FoundingMarkWindow;
  readonly allMilestonesGreen: boolean;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const LAUNCH_DATE = '2027-01-01T00:00:00Z';
const FOUNDING_MARK_WINDOW_DAYS = 30;
const FOUNDING_MARK_MAX = 500;
const MS_PER_DAY = 86_400_000;

const ELIGIBLE_FOUNDER_TIERS: ReadonlySet<FounderTier> = new Set([
  'PROMETHEUS',
  'SHEPHERD',
  'FIRST_LIGHT',
]);

// ΓöÇΓöÇΓöÇ Predefined Milestones (Part 17.1) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const INITIAL_MILESTONES: ReadonlyArray<
  Omit<LaunchMilestone, 'status' | 'verifiedAt' | 'failureReason'>
> = [
  {
    milestoneId: 'worlds-populated',
    name: 'All 20 launch worlds populated (min 3 residents)',
    description: 'Every launch world has at least 3 active dynasty residents.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'chronicle-integrity',
    name: 'Chronicle hash chain integrity verified',
    description: 'SHA-256 hash chain across entire Remembrance archive is valid.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'assembly-tested',
    name: 'Assembly governance tested (1000 simulated votes)',
    description: 'The Assembly ran 1000 simulated votes with correct quorum outcomes.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'founding-mark-eligibility',
    name: 'Founding Mark eligibility system verified',
    description: 'All PROMETHEUS+ founder eligibility checks pass in staging.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'first-light-records',
    name: 'FIRST_LIGHT records in Year 0 Chronicle',
    description: 'All FIRST_LIGHT founders named and sealed in the Year 0 Chronicle entry.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'witness-protocol',
    name: 'Witness Protocol accepting signups',
    description: 'Teaser site witness protocol is live and accepting player signups.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'grpc-bridge-health',
    name: 'gRPC bridge health check passing',
    description: 'Bridge Loom Γåö UE5 gRPC bridge passes all liveness + readiness checks.',
    requiredForLaunch: true,
  },
  {
    milestoneId: 'kalon-supply-initialized',
    name: 'KALON total supply initialized (GENESIS account)',
    description: 'GENESIS vault funded, world issuance seeded, supply verified.',
    requiredForLaunch: true,
  },
];

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface LaunchSequenceState {
  milestones: Map<string, LaunchMilestone>;
  isLaunched: boolean;
  foundingMarkWindow: FoundingMarkWindow;
  foundersByDynasty: Map<string, FounderTier>; // dynastyId ΓåÆ founderTier
  foundingMarkIssuees: Set<string>; // dynastyIds that received a FOUNDING MARK
}

export function createLaunchSequenceState(): LaunchSequenceState {
  const closesAt = new Date(
    new Date(LAUNCH_DATE).getTime() + FOUNDING_MARK_WINDOW_DAYS * MS_PER_DAY,
  ).toISOString();

  const milestones = new Map<string, LaunchMilestone>(
    INITIAL_MILESTONES.map((m) => [m.milestoneId, { ...m, status: 'PENDING' as MilestoneStatus }]),
  );

  const foundingMarkWindow: FoundingMarkWindow = {
    opensAt: LAUNCH_DATE,
    closesAt,
    maxMarks: FOUNDING_MARK_MAX,
    marksIssued: 0,
    isOpen: false,
    dynastiesEligible: [],
  };

  return {
    milestones,
    isLaunched: false,
    foundingMarkWindow,
    foundersByDynasty: new Map(),
    foundingMarkIssuees: new Set(),
  };
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function nowIso(): string {
  return new Date().toISOString();
}

function requireMilestone(state: LaunchSequenceState, milestoneId: string): LaunchMilestone {
  const m = state.milestones.get(milestoneId);
  if (!m) throw new Error(`Unknown milestone: ${milestoneId}`);
  return m;
}

function isWindowOpenAt(window: FoundingMarkWindow, now: Date): boolean {
  if (!window.isOpen) return false;
  if (window.marksIssued >= window.maxMarks) return false;
  return now >= new Date(window.opensAt) && now <= new Date(window.closesAt);
}

// ΓöÇΓöÇΓöÇ Service Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function verifyMilestone(state: LaunchSequenceState, milestoneId: string): LaunchMilestone {
  const m = requireMilestone(state, milestoneId);
  const updated: LaunchMilestone = {
    ...m,
    status: 'VERIFIED',
    verifiedAt: nowIso(),
  };
  state.milestones.set(milestoneId, updated);
  return updated;
}

export function failMilestone(
  state: LaunchSequenceState,
  milestoneId: string,
  reason: string,
): LaunchMilestone {
  const m = requireMilestone(state, milestoneId);
  const updated: LaunchMilestone = {
    ...m,
    status: 'FAILED',
    failureReason: reason,
  };
  state.milestones.set(milestoneId, updated);
  return updated;
}

export function isReadyToLaunch(state: LaunchSequenceState): boolean {
  for (const milestone of state.milestones.values()) {
    if (milestone.requiredForLaunch && milestone.status !== 'VERIFIED') {
      return false;
    }
  }
  return true;
}

export function registerFounderDynasty(
  state: LaunchSequenceState,
  dynastyId: string,
  founderTier: FounderTier,
): void {
  state.foundersByDynasty.set(dynastyId, founderTier);
}

export function openFoundingMarkWindow(state: LaunchSequenceState): FoundingMarkWindow {
  const eligible = [...state.foundersByDynasty.entries()]
    .filter(([, tier]) => ELIGIBLE_FOUNDER_TIERS.has(tier))
    .map(([id]) => id);

  state.foundingMarkWindow = {
    ...state.foundingMarkWindow,
    isOpen: true,
    dynastiesEligible: eligible,
  };
  state.isLaunched = true;
  return state.foundingMarkWindow;
}

export function issueFoundingMark(
  state: LaunchSequenceState,
  dynastyId: string,
  now: Date = new Date(),
): { issued: boolean; reason?: string } {
  const window = state.foundingMarkWindow;

  if (!isWindowOpenAt(window, now)) {
    return { issued: false, reason: 'Founding Mark window is not open' };
  }

  const founderTier = state.foundersByDynasty.get(dynastyId);
  if (!founderTier || !ELIGIBLE_FOUNDER_TIERS.has(founderTier)) {
    return { issued: false, reason: 'Dynasty does not hold PROMETHEUS or higher founder tier' };
  }

  if (state.foundingMarkIssuees.has(dynastyId)) {
    return { issued: false, reason: 'Dynasty already received a Founding Mark' };
  }

  state.foundingMarkIssuees.add(dynastyId);
  const newCount = window.marksIssued + 1;
  const exhausted = newCount >= window.maxMarks;

  state.foundingMarkWindow = {
    ...window,
    marksIssued: newCount,
    isOpen: !exhausted,
  };

  return { issued: true };
}

export function closeFoundingMarkWindow(state: LaunchSequenceState): FoundingMarkWindow {
  state.foundingMarkWindow = {
    ...state.foundingMarkWindow,
    isOpen: false,
  };
  return state.foundingMarkWindow;
}

export function getLaunchState(state: LaunchSequenceState): LaunchState {
  const milestones = [...state.milestones.values()];
  const allMilestonesGreen = milestones
    .filter((m) => m.requiredForLaunch)
    .every((m) => m.status === 'VERIFIED');

  return {
    launchDate: LAUNCH_DATE,
    isLaunched: state.isLaunched,
    milestones,
    foundingMarkWindow: state.foundingMarkWindow,
    allMilestonesGreen,
  };
}
