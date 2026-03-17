/**
 * World Local Governance ΓÇö Per-world political system.
 *
 * Bible v1.2: By Era III, the Assembly has 340+ world delegations. Each world
 * has its own governance model shaped by its founding circumstances ΓÇö who
 * discovered it, how it was settled, whether the Ascendancy took root there.
 *
 * Governance models range from direct democracy to NPC sovereign states.
 * Local elections feed into delegate selection for the Assembly.
 *
 * WORLD_03_GOVERNANCE_NOTE: Amber Reach holds 4 million NPC votes per year ΓÇö
 * sovereignty means something different here.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type WorldGovernanceModel =
  | 'DIRECT_DEMOCRACY'
  | 'REPRESENTATIVE'
  | 'FOUNDING_FAMILY'
  | 'COMPACT_CONSORTIUM'
  | 'COVENANT_ADMINISTERED'
  | 'SURVEY_CORPS_ADMINISTERED'
  | 'ASSEMBLY_COMMON_TRUST'
  | 'FREE_PORT'
  | 'CONTESTED'
  | 'NPC_SOVEREIGN_STATE';

export type LocalElectionStatus =
  | 'NO_ELECTION'
  | 'CAMPAIGN_PERIOD'
  | 'VOTING_OPEN'
  | 'VOTE_COUNTING'
  | 'RESULT_CERTIFIED'
  | 'CONTESTED_RESULT';

export interface GovernanceTransition {
  readonly fromModel: WorldGovernanceModel;
  readonly toModel: WorldGovernanceModel;
  readonly year: number;
  readonly reason: string;
  readonly chronicleEntryId: string;
}

export interface WorldGovernanceState {
  readonly worldId: string;
  readonly governanceModel: WorldGovernanceModel;
  readonly currentSovereignDynastyId?: string;
  readonly localElectionStatus: LocalElectionStatus;
  readonly lastElectionYear?: number;
  readonly electionCycleYears: number;
  readonly delegateSlots: number;
  readonly currentDelegateIds: readonly string[];
  readonly npcSovereignStateApplicationFiled: boolean;
  readonly historicalTransitions: readonly GovernanceTransition[];
}

export interface GovernanceChronicleEntry {
  readonly worldId: string;
  readonly governanceModel: WorldGovernanceModel;
  readonly electionStatus: LocalElectionStatus;
  readonly currentSovereignDynastyId: string | undefined;
  readonly delegateSlots: number;
  readonly currentDelegateIds: readonly string[];
  readonly year: number;
  readonly category: 'GOVERNANCE';
  readonly summary: string;
}

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const WORLD_03_GOVERNANCE_NOTE =
  'Amber Reach holds 4 million NPC votes per year ΓÇö sovereignty means something different here';

export const DEFAULT_ELECTION_CYCLE_YEARS = 5;

/** Population ΓåÆ delegate count tiers per the Assembly Compact. */
export const POPULATION_DELEGATE_TIERS: ReadonlyArray<{
  readonly maxPopulation: number;
  readonly delegates: number;
}> = [
  { maxPopulation: 100_000_000, delegates: 1 },
  { maxPopulation: 500_000_000, delegates: 2 },
  { maxPopulation: 1_000_000_000, delegates: 3 },
  { maxPopulation: 3_000_000_000, delegates: 4 },
  { maxPopulation: Number.MAX_SAFE_INTEGER, delegates: 5 },
];

// ΓöÇΓöÇ Pure Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Maps a world population to its Assembly delegate count.
 * Populations > 3B receive the maximum of 5 delegates.
 */
export function computeDelegateSlots(population: number): number {
  const tier = POPULATION_DELEGATE_TIERS.find((t) => population < t.maxPopulation);
  return tier !== undefined ? tier.delegates : 5;
}

/**
 * Returns true when a new election is overdue based on the last election year
 * and the world's configured election cycle length.
 */
export function isElectionDue(state: WorldGovernanceState, currentYear: number): boolean {
  if (state.lastElectionYear === undefined) return true;
  return currentYear - state.lastElectionYear >= state.electionCycleYears;
}

/**
 * Schedules a new local election, advancing status to CAMPAIGN_PERIOD.
 * Has no effect if an election is already in progress.
 */
export function scheduleLocalElection(
  state: WorldGovernanceState,
  year: number,
): WorldGovernanceState {
  const inProgress: readonly LocalElectionStatus[] = [
    'CAMPAIGN_PERIOD',
    'VOTING_OPEN',
    'VOTE_COUNTING',
  ];
  if (inProgress.includes(state.localElectionStatus)) return state;
  return { ...state, localElectionStatus: 'CAMPAIGN_PERIOD', lastElectionYear: year };
}

/**
 * Advances election to VOTING_OPEN phase.
 */
export function openElectionVoting(state: WorldGovernanceState): WorldGovernanceState {
  if (state.localElectionStatus !== 'CAMPAIGN_PERIOD') return state;
  return { ...state, localElectionStatus: 'VOTING_OPEN' };
}

/**
 * Advances election to VOTE_COUNTING phase.
 */
export function closeElectionVoting(state: WorldGovernanceState): WorldGovernanceState {
  if (state.localElectionStatus !== 'VOTING_OPEN') return state;
  return { ...state, localElectionStatus: 'VOTE_COUNTING' };
}

/**
 * Certifies an election result, installs the winning dynasty as sovereign,
 * and marks the election as RESULT_CERTIFIED.
 */
export function certifyElectionResult(
  state: WorldGovernanceState,
  winningDynastyId: string,
  year: number,
): WorldGovernanceState {
  return {
    ...state,
    localElectionStatus: 'RESULT_CERTIFIED',
    currentSovereignDynastyId: winningDynastyId,
    lastElectionYear: year,
  };
}

/**
 * Marks an election result as contested (disputed outcome).
 */
export function contestElectionResult(state: WorldGovernanceState): WorldGovernanceState {
  if (state.localElectionStatus !== 'RESULT_CERTIFIED') return state;
  return { ...state, localElectionStatus: 'CONTESTED_RESULT' };
}

/**
 * Resolves a contested result, accepting the original or override winner.
 */
export function resolveContestedElection(
  state: WorldGovernanceState,
  resolvedDynastyId: string,
  year: number,
): WorldGovernanceState {
  if (state.localElectionStatus !== 'CONTESTED_RESULT') return state;
  return {
    ...state,
    localElectionStatus: 'RESULT_CERTIFIED',
    currentSovereignDynastyId: resolvedDynastyId,
    lastElectionYear: year,
  };
}

/**
 * Transitions a world to a new governance model, recording the change in
 * the historical transitions log.
 */
export function transitionGovernanceModel(
  state: WorldGovernanceState,
  toModel: WorldGovernanceModel,
  reason: string,
  year: number,
  chronicleEntryId: string,
): WorldGovernanceState {
  const transition: GovernanceTransition = {
    fromModel: state.governanceModel,
    toModel,
    year,
    reason,
    chronicleEntryId,
  };
  return {
    ...state,
    governanceModel: toModel,
    historicalTransitions: [...state.historicalTransitions, transition],
  };
}

/**
 * Installs a new set of delegates for this world's Assembly representation.
 */
export function setDelegates(
  state: WorldGovernanceState,
  delegateIds: readonly string[],
): WorldGovernanceState {
  if (delegateIds.length > state.delegateSlots) {
    throw new Error(
      `Cannot install ${delegateIds.length} delegates ΓÇö world ${state.worldId} has ${state.delegateSlots} slot(s)`,
    );
  }
  return { ...state, currentDelegateIds: delegateIds };
}

/**
 * Files (or retracts) an NPC sovereign state application for this world.
 */
export function setNpcSovereignStateApplication(
  state: WorldGovernanceState,
  filed: boolean,
): WorldGovernanceState {
  return { ...state, npcSovereignStateApplicationFiled: filed };
}

/**
 * Resets election status back to NO_ELECTION (e.g., after term begins).
 */
export function clearElectionStatus(state: WorldGovernanceState): WorldGovernanceState {
  return { ...state, localElectionStatus: 'NO_ELECTION' };
}

/**
 * Builds a formal Remembrance-compatible chronicle entry for the world's
 * current governance state. Intended for submission to the archive fabric.
 */
export function buildGovernanceChronicleEntry(
  state: WorldGovernanceState,
  year: number,
): GovernanceChronicleEntry {
  const modelLabel = state.governanceModel.replace(/_/g, ' ').toLowerCase();
  const summary =
    `World ${state.worldId} is governed under ${modelLabel} as of year ${year}. ` +
    `Election status: ${state.localElectionStatus}. ` +
    `Assembly delegates: ${state.delegateSlots} slot(s), ` +
    `${state.currentDelegateIds.length} filled.`;
  return {
    worldId: state.worldId,
    governanceModel: state.governanceModel,
    electionStatus: state.localElectionStatus,
    currentSovereignDynastyId: state.currentSovereignDynastyId,
    delegateSlots: state.delegateSlots,
    currentDelegateIds: state.currentDelegateIds,
    year,
    category: 'GOVERNANCE',
    summary,
  };
}

/**
 * Factory: create an initial governance state for a newly admitted world.
 */
export function createWorldGovernanceState(params: {
  readonly worldId: string;
  readonly governanceModel: WorldGovernanceModel;
  readonly population: number;
  readonly currentSovereignDynastyId?: string;
  readonly electionCycleYears?: number;
}): WorldGovernanceState {
  return {
    worldId: params.worldId,
    governanceModel: params.governanceModel,
    currentSovereignDynastyId: params.currentSovereignDynastyId,
    localElectionStatus: 'NO_ELECTION',
    lastElectionYear: undefined,
    electionCycleYears: params.electionCycleYears ?? DEFAULT_ELECTION_CYCLE_YEARS,
    delegateSlots: computeDelegateSlots(params.population),
    currentDelegateIds: [],
    npcSovereignStateApplicationFiled: false,
    historicalTransitions: [],
  };
}
