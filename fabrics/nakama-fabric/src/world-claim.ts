/**
 * World Claim Flow ΓÇö Dynasty sovereignty establishment over surveyed worlds.
 *
 * Bible v1.1 Part 6: When a Survey Corps expedition completes, a 48-hour
 * claim window opens. Dynasties stake KALON to claim sovereignty.
 *
 * Resolution rules:
 *   - Single claimant       ΓåÆ auto-RESOLVED, that dynasty is sovereign
 *   - Multiple + FOUNDING   ΓåÆ Founding Mark holder wins immediately
 *   - Multiple, no FOUNDING ΓåÆ highest stake wins after 48h
 *   - Window expires, none  ΓåÆ UNCLAIMED ΓåÆ OPEN_WORLD
 *
 * Sovereign dynasty receives a WORLD MARK. Loser stakes return to their
 * dynasties; winner's stake flows to the Commons Fund.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ClaimStatus =
  | 'ELIGIBLE'
  | 'CONTESTED'
  | 'RESOLVED'
  | 'UNCLAIMED'
  | 'OPEN_WORLD'
  | 'PENDING_RATIFICATION'
  | 'ABANDONED';

export type WorldZone =
  | 'OUTER_ARC'      // Uncharted / outer arc
  | 'MID_RING'       // Surveyed but unclaimed
  | 'INNER_RING'     // High-traffic near launch worlds
  | 'UNIQUE';        // Hand-authored worlds (breach-312, world-394, etc.)

export interface ClaimantRecord {
  readonly dynastyId: string;
  readonly stakeAmount: bigint;
  readonly filedAt: string;
  readonly hasFoundingMark: boolean;
  readonly hasWorldMark: boolean;
}

export interface WorldClaim {
  readonly claimId: string;
  readonly worldId: string;
  readonly expeditionId: string;
  readonly claimWindowOpensAt: string;
  readonly claimWindowClosesAt: string;
  readonly status: ClaimStatus;
  readonly claimants: ClaimantRecord[];
  readonly resolvesAt?: string;
  readonly sovereignDynastyId?: string;
  readonly requiresAssemblyRatification?: boolean;
  readonly assemblyRatificationWindowClosesAt?: string;
}

// ΓöÇΓöÇΓöÇ Events (outbound ports) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface WorldClaimEventPort {
  onWorldMarkAwarded(worldId: string, dynastyId: string, claimId: string): void;
  onStakeReturned(dynastyId: string, amount: bigint, reason: string): void;
  onStakeToCommons(amount: bigint, reason: string): void;
  onStakeBurned(amount: bigint, reason: string): void;
  onAssemblyRatificationRequired(claimId: string, worldId: string, dynastyId: string, stakeAmount: bigint, closesAt: string): void;
}

// ΓöÇΓöÇΓöÇ Errors ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export class WorldClaimError extends Error {
  constructor(
    readonly code: WorldClaimErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WorldClaimError';
  }
}

export type WorldClaimErrorCode =
  | 'WORLD_ALREADY_HAS_CLAIM'
  | 'CLAIM_NOT_FOUND'
  | 'CLAIM_WINDOW_CLOSED'
  | 'DUPLICATE_CLAIMANT'
  | 'CLAIM_NOT_ELIGIBLE'
  | 'CLAIM_ALREADY_RESOLVED';

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CLAIM_WINDOW_HOURS = 48;
const ASSEMBLY_RATIFICATION_WINDOW_HOURS = 72;
const ABANDONED_CLAIM_EXPIRY_DAYS = 90;
const MS_PER_HOUR = 3_600_000;

/** Minimum bond amounts per world zone (in KALON micro-units ├ù 1_000_000) */
export const WORLD_CLAIM_BOND_MIN: Record<WorldZone, bigint> = {
  OUTER_ARC:  100_000_000_000n,  // 100K KALON
  MID_RING:   500_000_000_000n,  // 500K KALON
  INNER_RING: 2_000_000_000_000n, // 2M KALON
  UNIQUE:     0n,                 // Hand-authored ΓÇö no minimum (case-by-case)
};

/** Claims above this threshold trigger mandatory 72-hr Assembly ratification */
export const ASSEMBLY_RATIFICATION_THRESHOLD = 5_000_000_000_000n; // 5M KALON

/** Loser penalty in basis points (30%) for Assembly-arbitrated contested claims */
const CONTESTED_LOSER_BURN_BPS = 3000n;

/** Abandoned claim return in basis points (50%) ΓÇö 90-day timeout */
const ABANDONED_CLAIM_RETURN_BPS = 5000n;

// ΓöÇΓöÇΓöÇ Internal State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface MutableWorldClaim {
  readonly claimId: string;
  readonly worldId: string;
  readonly expeditionId: string;
  readonly claimWindowOpensAt: string;
  readonly claimWindowClosesAt: string;
  status: ClaimStatus;
  readonly claimants: MutableClaimantRecord[];
  resolvesAt?: string;
  sovereignDynastyId?: string;
  requiresAssemblyRatification?: boolean;
  assemblyRatificationWindowClosesAt?: string;
}

interface MutableClaimantRecord {
  readonly dynastyId: string;
  readonly stakeAmount: bigint;
  readonly filedAt: string;
  readonly hasFoundingMark: boolean;
  readonly hasWorldMark: boolean;
}

interface ClaimState {
  readonly claims: Map<string, MutableWorldClaim>;
  readonly claimsByWorld: Map<string, string>;
}

function createClaimState(): ClaimState {
  return {
    claims: new Map(),
    claimsByWorld: new Map(),
  };
}

// ΓöÇΓöÇΓöÇ Deps ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface WorldClaimDeps {
  readonly idGenerator: { next(): string };
  readonly clock: { nowIso(): string };
  readonly events: WorldClaimEventPort;
}

// ΓöÇΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface WorldClaimService {
  openClaimWindow(worldId: string, expeditionId: string): WorldClaim;
  fileClaim(
    claimId: string,
    dynastyId: string,
    stakeAmount: bigint,
    hasFoundingMark: boolean,
    hasWorldMark?: boolean,
  ): WorldClaim;
  resolveContestedClaim(claimId: string): WorldClaim;
  expireUnclaimedWorld(claimId: string): WorldClaim;
  /**
   * Abandons a claim after the 90-day expiry window.
   * Returns 50% of all claimant stakes, burns the remaining 50%.
   */
  abandonClaim(claimId: string): WorldClaim;
  /**
   * Completes Assembly ratification for a high-stake claim.
   * If approved, finalises sovereignty. If rejected, full stake is returned.
   */
  completeAssemblyRatification(claimId: string, approved: boolean): WorldClaim;
  getActiveClaims(): WorldClaim[];
  getClaimForWorld(worldId: string): WorldClaim | undefined;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createWorldClaimService(deps: WorldClaimDeps): WorldClaimService {
  const state = createClaimState();

  return {
    openClaimWindow: (worldId, expeditionId) =>
      openClaimWindowImpl(state, deps, worldId, expeditionId),
    fileClaim: (claimId, dynastyId, stakeAmount, hasFoundingMark, hasWorldMark) =>
      fileClaimImpl(
        state,
        deps,
        claimId,
        dynastyId,
        stakeAmount,
        hasFoundingMark,
        hasWorldMark ?? false,
      ),
    resolveContestedClaim: (claimId) => resolveContestedClaimImpl(state, deps, claimId),
    expireUnclaimedWorld: (claimId) => expireUnclaimedWorldImpl(state, deps, claimId),
    abandonClaim: (claimId) => abandonClaimImpl(state, deps, claimId),
    completeAssemblyRatification: (claimId, approved) =>
      completeAssemblyRatificationImpl(state, deps, claimId, approved),
    getActiveClaims: () => getActiveClaimsImpl(state),
    getClaimForWorld: (worldId) => getClaimForWorldImpl(state, worldId),
  };
}

// ΓöÇΓöÇΓöÇ Open Claim Window ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function openClaimWindowImpl(
  state: ClaimState,
  deps: WorldClaimDeps,
  worldId: string,
  expeditionId: string,
): WorldClaim {
  if (state.claimsByWorld.has(worldId)) {
    throw new WorldClaimError(
      'WORLD_ALREADY_HAS_CLAIM',
      `World ${worldId} already has an active or resolved claim`,
    );
  }

  const opensAt = deps.clock.nowIso();
  const closesAt = addHours(opensAt, CLAIM_WINDOW_HOURS);

  const claim: MutableWorldClaim = {
    claimId: deps.idGenerator.next(),
    worldId,
    expeditionId,
    claimWindowOpensAt: opensAt,
    claimWindowClosesAt: closesAt,
    status: 'ELIGIBLE',
    claimants: [],
  };

  state.claims.set(claim.claimId, claim);
  state.claimsByWorld.set(worldId, claim.claimId);
  return toReadonly(claim);
}

// ΓöÇΓöÇΓöÇ File Claim ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function fileClaimImpl(
  state: ClaimState,
  deps: WorldClaimDeps,
  claimId: string,
  dynastyId: string,
  stakeAmount: bigint,
  hasFoundingMark: boolean,
  hasWorldMark: boolean,
): WorldClaim {
  const claim = getMutableClaim(state, claimId);
  assertClaimEligibleForFiling(claim);
  assertNoDuplicateClaimant(claim, dynastyId);

  const record: MutableClaimantRecord = {
    dynastyId,
    stakeAmount,
    filedAt: deps.clock.nowIso(),
    hasFoundingMark,
    hasWorldMark,
  };

  claim.claimants.push(record);
  updateClaimStatus(claim);

  return toReadonly(claim);
}

function assertClaimEligibleForFiling(claim: MutableWorldClaim): void {
  if (claim.status !== 'ELIGIBLE' && claim.status !== 'CONTESTED') {
    throw new WorldClaimError(
      'CLAIM_NOT_ELIGIBLE',
      `Claim ${claim.claimId} is in status ${claim.status}, cannot file`,
    );
  }
}

function assertNoDuplicateClaimant(claim: MutableWorldClaim, dynastyId: string): void {
  const existing = claim.claimants.find((c) => c.dynastyId === dynastyId);
  if (existing !== undefined) {
    throw new WorldClaimError(
      'DUPLICATE_CLAIMANT',
      `Dynasty ${dynastyId} already filed a claim for ${claim.claimId}`,
    );
  }
}

function updateClaimStatus(claim: MutableWorldClaim): void {
  if (claim.claimants.length === 1) {
    claim.status = 'ELIGIBLE';
  } else {
    claim.status = 'CONTESTED';
  }
}

// ΓöÇΓöÇΓöÇ Auto-resolve Single Claimant ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function tryAutoResolve(claim: MutableWorldClaim, deps: WorldClaimDeps): boolean {
  if (claim.claimants.length !== 1) return false;

  const winner = claim.claimants[0];
  if (winner === undefined) return false;

  const reason = `World ${claim.worldId} claimed by single claimant ${winner.dynastyId}`;
  deps.events.onStakeToCommons(winner.stakeAmount, reason);
  applySovereignty(claim, winner.dynastyId, winner.stakeAmount, deps);
  return true;
}

// ΓöÇΓöÇΓöÇ Resolve Contested Claim ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function resolveContestedClaimImpl(
  state: ClaimState,
  deps: WorldClaimDeps,
  claimId: string,
): WorldClaim {
  const claim = getMutableClaim(state, claimId);
  assertNotResolved(claim);

  if (claim.claimants.length === 0) {
    return expireUnclaimedWorldImpl(state, deps, claimId);
  }

  if (tryAutoResolve(claim, deps)) {
    return toReadonly(claim);
  }

  const winner = pickContestWinner(claim.claimants);
  applyContestResolution(claim, winner, claim.claimants, deps);

  return toReadonly(claim);
}

function pickContestWinner(claimants: MutableClaimantRecord[]): MutableClaimantRecord {
  const foundingHolder = claimants.find((c) => c.hasFoundingMark);
  if (foundingHolder !== undefined) return foundingHolder;
  return pickHighestStake(claimants);
}

function pickHighestStake(claimants: MutableClaimantRecord[]): MutableClaimantRecord {
  let best = claimants[0];
  if (best === undefined) throw new WorldClaimError('CLAIM_NOT_FOUND', 'No claimants found');

  for (const claimant of claimants) {
    if (claimant.stakeAmount > best.stakeAmount) {
      best = claimant;
    }
  }
  return best;
}

function applyContestResolution(
  claim: MutableWorldClaim,
  winner: MutableClaimantRecord,
  allClaimants: MutableClaimantRecord[],
  deps: WorldClaimDeps,
): void {
  // Losers receive 70% back; 30% is burned as Assembly arbitration penalty
  returnLoserStakesWithPenalty(winner.dynastyId, allClaimants, deps);
  // Winner's stake goes to the Commons Fund
  deps.events.onStakeToCommons(
    winner.stakeAmount,
    `World ${claim.worldId} claim won by ${winner.dynastyId} (Assembly arbitration)`,
  );
  applySovereignty(claim, winner.dynastyId, winner.stakeAmount, deps);
}

function returnLoserStakesWithPenalty(
  winnerDynastyId: string,
  allClaimants: MutableClaimantRecord[],
  deps: WorldClaimDeps,
): void {
  for (const claimant of allClaimants) {
    if (claimant.dynastyId === winnerDynastyId) continue;
    const burnAmount = (claimant.stakeAmount * CONTESTED_LOSER_BURN_BPS) / 10000n;
    const returnAmount = claimant.stakeAmount - burnAmount;
    deps.events.onStakeReturned(
      claimant.dynastyId,
      returnAmount,
      `Stake returned (70%): lost Assembly arbitration for world claim`,
    );
    deps.events.onStakeBurned(
      burnAmount,
      `Stake burned (30%): Assembly arbitration penalty ΓÇö dynasty ${claimant.dynastyId}`,
    );
  }
}

function applySovereignty(
  claim: MutableWorldClaim,
  dynastyId: string,
  stakeAmount: bigint,
  deps: WorldClaimDeps,
): void {
  if (stakeAmount >= ASSEMBLY_RATIFICATION_THRESHOLD) {
    // High-stake claim ΓÇö requires 72-hour Assembly ratification window
    claim.status = 'PENDING_RATIFICATION';
    claim.sovereignDynastyId = dynastyId;
    claim.requiresAssemblyRatification = true;
    claim.assemblyRatificationWindowClosesAt = addHours(
      deps.clock.nowIso(),
      ASSEMBLY_RATIFICATION_WINDOW_HOURS,
    );
    deps.events.onAssemblyRatificationRequired(
      claim.claimId,
      claim.worldId,
      dynastyId,
      stakeAmount,
      claim.assemblyRatificationWindowClosesAt,
    );
  } else {
    claim.status = 'RESOLVED';
    claim.sovereignDynastyId = dynastyId;
    claim.resolvesAt = deps.clock.nowIso();
    deps.events.onWorldMarkAwarded(claim.worldId, dynastyId, claim.claimId);
  }
}

// ΓöÇΓöÇΓöÇ Expire Unclaimed World ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function expireUnclaimedWorldImpl(
  state: ClaimState,
  deps: WorldClaimDeps,
  claimId: string,
): WorldClaim {
  const claim = getMutableClaim(state, claimId);
  assertNotResolved(claim);

  for (const claimant of claim.claimants) {
    const reason = `Stake returned: world claim expired`;
    deps.events.onStakeReturned(claimant.dynastyId, claimant.stakeAmount, reason);
  }

  claim.status = claim.claimants.length === 0 ? 'OPEN_WORLD' : 'UNCLAIMED';
  claim.resolvesAt = deps.clock.nowIso();

  if (claim.status === 'OPEN_WORLD') {
    claim.status = 'OPEN_WORLD';
  } else {
    claim.status = 'UNCLAIMED';
  }

  return toReadonly(claim);
}

// ΓöÇΓöÇΓöÇ Queries ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getActiveClaimsImpl(state: ClaimState): WorldClaim[] {
  const results: WorldClaim[] = [];
  for (const claim of state.claims.values()) {
    if (
      claim.status === 'ELIGIBLE' ||
      claim.status === 'CONTESTED' ||
      claim.status === 'PENDING_RATIFICATION'
    ) {
      results.push(toReadonly(claim));
    }
  }
  return results;
}

function getClaimForWorldImpl(state: ClaimState, worldId: string): WorldClaim | undefined {
  const claimId = state.claimsByWorld.get(worldId);
  if (claimId === undefined) return undefined;
  const claim = state.claims.get(claimId);
  return claim !== undefined ? toReadonly(claim) : undefined;
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getMutableClaim(state: ClaimState, claimId: string): MutableWorldClaim {
  const claim = state.claims.get(claimId);
  if (claim === undefined) {
    throw new WorldClaimError('CLAIM_NOT_FOUND', `Claim ${claimId} not found`);
  }
  return claim;
}

function assertNotResolved(claim: MutableWorldClaim): void {
  if (
    claim.status === 'RESOLVED' ||
    claim.status === 'OPEN_WORLD' ||
    claim.status === 'UNCLAIMED' ||
    claim.status === 'ABANDONED'
  ) {
    throw new WorldClaimError(
      'CLAIM_ALREADY_RESOLVED',
      `Claim ${claim.claimId} is already in terminal status ${claim.status}`,
    );
  }
}

function addHours(isoString: string, hours: number): string {
  const ms = new Date(isoString).getTime() + hours * MS_PER_HOUR;
  return new Date(ms).toISOString();
}

function toReadonly(claim: MutableWorldClaim): WorldClaim {
  return {
    claimId: claim.claimId,
    worldId: claim.worldId,
    expeditionId: claim.expeditionId,
    claimWindowOpensAt: claim.claimWindowOpensAt,
    claimWindowClosesAt: claim.claimWindowClosesAt,
    status: claim.status,
    claimants: claim.claimants.map((c) => ({ ...c })),
    resolvesAt: claim.resolvesAt,
    sovereignDynastyId: claim.sovereignDynastyId,
    requiresAssemblyRatification: claim.requiresAssemblyRatification,
    assemblyRatificationWindowClosesAt: claim.assemblyRatificationWindowClosesAt,
  };
}

// ΓöÇΓöÇΓöÇ Abandon Claim ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function abandonClaimImpl(
  state: ClaimState,
  deps: WorldClaimDeps,
  claimId: string,
): WorldClaim {
  const claim = getMutableClaim(state, claimId);
  assertNotResolved(claim);

  // Return 50% of each claimant's stake; burn the remaining 50%
  for (const claimant of claim.claimants) {
    const returnAmount = (claimant.stakeAmount * ABANDONED_CLAIM_RETURN_BPS) / 10000n;
    const burnAmount = claimant.stakeAmount - returnAmount;
    deps.events.onStakeReturned(
      claimant.dynastyId,
      returnAmount,
      `Stake returned (50%): world claim abandoned after ${ABANDONED_CLAIM_EXPIRY_DAYS} days`,
    );
    deps.events.onStakeBurned(
      burnAmount,
      `Stake burned (50%): world claim abandoned ΓÇö dynasty ${claimant.dynastyId}`,
    );
  }

  claim.status = 'ABANDONED';
  claim.resolvesAt = deps.clock.nowIso();
  return toReadonly(claim);
}

// ΓöÇΓöÇΓöÇ Assembly Ratification ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function completeAssemblyRatificationImpl(
  state: ClaimState,
  deps: WorldClaimDeps,
  claimId: string,
  approved: boolean,
): WorldClaim {
  const claim = getMutableClaim(state, claimId);

  if (claim.status !== 'PENDING_RATIFICATION') {
    throw new WorldClaimError(
      'INVALID_STATUS',
      `Claim ${claimId} is not pending Assembly ratification (status: ${claim.status})`,
    );
  }

  if (!claim.sovereignDynastyId) {
    throw new WorldClaimError('CLAIM_NOT_FOUND', `Claim ${claimId} has no designated sovereign`);
  }

  if (approved) {
    // Assembly approved ΓÇö finalise sovereignty, sovereign's stake goes to Commons
    const winner = claim.claimants.find((c) => c.dynastyId === claim.sovereignDynastyId);
    if (winner) {
      deps.events.onStakeToCommons(
        winner.stakeAmount,
        `Assembly-ratified world claim: ${claim.worldId} ΓåÆ ${claim.sovereignDynastyId}`,
      );
    }
    claim.status = 'RESOLVED';
    claim.resolvesAt = deps.clock.nowIso();
    deps.events.onWorldMarkAwarded(claim.worldId, claim.sovereignDynastyId, claim.claimId);
  } else {
    // Assembly rejected ΓÇö return all stakes in full; no world mark awarded
    for (const claimant of claim.claimants) {
      deps.events.onStakeReturned(
        claimant.dynastyId,
        claimant.stakeAmount,
        `Stake returned: Assembly rejected ratification for world ${claim.worldId}`,
      );
    }
    claim.status = 'UNCLAIMED';
    claim.sovereignDynastyId = undefined;
    claim.requiresAssemblyRatification = undefined;
    claim.resolvesAt = deps.clock.nowIso();
  }

  return toReadonly(claim);
}
