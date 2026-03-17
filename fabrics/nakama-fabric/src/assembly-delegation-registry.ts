/**
 * Assembly Delegation Registry ΓÇö Tracks all world delegations to the Assembly.
 *
 * Bible v1.2: By Era III the Assembly has 340+ world delegations. Each world
 * sends delegates proportional to its population tier. Founding worlds (1ΓÇô20)
 * hold permanent seats and carry additional historical weight.
 *
 * Delegations are admitted, suspended, revoked, or granted observer status.
 * The registry is the authoritative record of who speaks in the Assembly
 * chamber at any point in the Concord's history.
 */

import { computeDelegateSlots } from './world-local-governance.js';

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type DelegationStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_RATIFICATION'
  | 'REVOKED'
  | 'OBSERVER_STATUS';

export interface AssemblyDelegation {
  readonly worldId: string;
  readonly worldName: string;
  readonly delegationStatus: DelegationStatus;
  readonly delegateIds: readonly string[];
  readonly delegateSlots: number;
  readonly admittedYear: number;
  readonly lastElectionYear?: number;
  readonly votingWeightTotal: number;
  readonly isFoundingWorld: boolean;
  readonly arcId: string;
}

export interface DelegationSuspensionRecord {
  readonly worldId: string;
  readonly reason: string;
  readonly year: number;
}

export interface DelegationRegistryState {
  readonly delegations: Readonly<Record<string, AssemblyDelegation>>;
  readonly totalDelegates: number;
  readonly foundingWorldDelegates: number;
  readonly outerArcDelegates: number;
  readonly suspensionLog: readonly DelegationSuspensionRecord[];
}

export interface DelegationSummaryChronicleEntry {
  readonly year: number;
  readonly totalWorlds: number;
  readonly totalDelegates: number;
  readonly foundingWorldDelegates: number;
  readonly outerArcDelegates: number;
  readonly activeDelegations: number;
  readonly suspendedDelegations: number;
  readonly totalVotingCapacity: number;
  readonly category: 'ASSEMBLY_COMPOSITION';
  readonly summary: string;
}

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Founding worlds are those with numeric IDs 1ΓÇô20 (arc-0). */
export const FOUNDING_WORLD_COUNT = 20;

/** Estimated Assembly delegation size at key years in the Concord timeline. */
export const ASSEMBLY_SIZE_AT_YEAR: Readonly<Record<number, number>> = {
  1: 20,
  10: 60,
  25: 150,
  40: 220,
  70: 380,
  105: 600,
};

/** Default voting weight per delegate seat ΓÇö can be overridden per world. */
export const DEFAULT_DELEGATE_VOTING_WEIGHT = 1.0;

/** Founding worlds receive elevated base weight per delegate. */
export const FOUNDING_WORLD_DELEGATE_WEIGHT = 1.5;

/**
 * Pre-seeded delegations for all 20 launch worlds.
 * Population tiers are representative of founding settlement sizes.
 */
export const LAUNCH_WORLD_DELEGATIONS: Readonly<Record<string, AssemblyDelegation>> =
  _buildLaunchDelegations();

// ΓöÇΓöÇ Pure Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Computes the sum of voting weights across all ACTIVE delegations.
 */
export function computeTotalVotingCapacity(state: DelegationRegistryState): number {
  return Object.values(state.delegations)
    .filter((d) => d.delegationStatus === 'ACTIVE')
    .reduce((sum, d) => sum + d.votingWeightTotal, 0);
}

/**
 * Returns all founding world delegations (worlds admitted in arc-0).
 */
export function getFoundingWorldDelegations(state: DelegationRegistryState): AssemblyDelegation[] {
  return Object.values(state.delegations).filter((d) => d.isFoundingWorld);
}

/**
 * Returns all delegations from outer arc worlds (non-founding).
 */
export function getOuterArcDelegations(state: DelegationRegistryState): AssemblyDelegation[] {
  return Object.values(state.delegations).filter((d) => !d.isFoundingWorld);
}

/**
 * Returns all delegations by their current status.
 */
export function getDelegationsByStatus(
  state: DelegationRegistryState,
  status: DelegationStatus,
): AssemblyDelegation[] {
  return Object.values(state.delegations).filter((d) => d.delegationStatus === status);
}

/**
 * Admits a new world delegation to the registry.
 * Throws if the world already has a delegation.
 */
export function admitNewDelegation(
  state: DelegationRegistryState,
  delegation: AssemblyDelegation,
): DelegationRegistryState {
  if (state.delegations[delegation.worldId] !== undefined) {
    throw new Error(`World ${delegation.worldId} already has a delegation in the Assembly`);
  }
  const updated = { ...state.delegations, [delegation.worldId]: delegation };
  return rebuildCounters({ ...state, delegations: updated });
}

/**
 * Updates an existing delegation's fields (non-destructive merge).
 */
export function updateDelegation(
  state: DelegationRegistryState,
  worldId: string,
  changes: Partial<
    Pick<
      AssemblyDelegation,
      'delegateIds' | 'votingWeightTotal' | 'lastElectionYear' | 'delegationStatus'
    >
  >,
): DelegationRegistryState {
  const existing = state.delegations[worldId];
  if (existing === undefined) {
    throw new Error(`No delegation found for world ${worldId}`);
  }
  const updated = { ...state.delegations, [worldId]: { ...existing, ...changes } };
  return rebuildCounters({ ...state, delegations: updated });
}

/**
 * Suspends a world's delegation, recording the reason and year.
 */
export function suspendDelegation(
  state: DelegationRegistryState,
  worldId: string,
  reason: string,
  year: number,
): DelegationRegistryState {
  const existing = state.delegations[worldId];
  if (existing === undefined) {
    throw new Error(`No delegation found for world ${worldId}`);
  }
  const suspended = { ...existing, delegationStatus: 'SUSPENDED' as DelegationStatus };
  const record: DelegationSuspensionRecord = { worldId, reason, year };
  const updated = { ...state.delegations, [worldId]: suspended };
  return rebuildCounters({
    ...state,
    delegations: updated,
    suspensionLog: [...state.suspensionLog, record],
  });
}

/**
 * Reinstates a suspended delegation to ACTIVE status.
 */
export function reinstateDelegation(
  state: DelegationRegistryState,
  worldId: string,
): DelegationRegistryState {
  return updateDelegation(state, worldId, { delegationStatus: 'ACTIVE' });
}

/**
 * Revokes a delegation permanently (e.g., world destroyed or exited Concord).
 */
export function revokeDelegation(
  state: DelegationRegistryState,
  worldId: string,
): DelegationRegistryState {
  return updateDelegation(state, worldId, { delegationStatus: 'REVOKED' });
}

/**
 * Grants observer status to a world pending full ratification.
 */
export function grantObserverStatus(
  state: DelegationRegistryState,
  worldId: string,
): DelegationRegistryState {
  return updateDelegation(state, worldId, { delegationStatus: 'OBSERVER_STATUS' });
}

/**
 * Ratifies a pending delegation, advancing it to ACTIVE.
 */
export function ratifyDelegation(
  state: DelegationRegistryState,
  worldId: string,
): DelegationRegistryState {
  return updateDelegation(state, worldId, { delegationStatus: 'ACTIVE' });
}

/**
 * Records a new election result for a world's delegation, updating delegates.
 */
export function recordDelegationElection(
  state: DelegationRegistryState,
  worldId: string,
  newDelegateIds: readonly string[],
  year: number,
): DelegationRegistryState {
  const existing = state.delegations[worldId];
  if (existing === undefined) {
    throw new Error(`No delegation found for world ${worldId}`);
  }
  const newWeight = computeDelegateVotingWeight(existing.isFoundingWorld, newDelegateIds.length);
  return updateDelegation(state, worldId, {
    delegateIds: newDelegateIds,
    votingWeightTotal: newWeight,
    lastElectionYear: year,
  });
}

/**
 * Builds a formal chronicle entry summarising Assembly composition.
 */
export function buildDelegationSummaryChronicleEntry(
  state: DelegationRegistryState,
  year: number,
): DelegationSummaryChronicleEntry {
  const allDelegations = Object.values(state.delegations);
  const active = allDelegations.filter((d) => d.delegationStatus === 'ACTIVE').length;
  const suspended = allDelegations.filter((d) => d.delegationStatus === 'SUSPENDED').length;
  const votingCapacity = computeTotalVotingCapacity(state);

  const summary =
    `Assembly composition at year ${year}: ` +
    `${allDelegations.length} world(s) registered, ` +
    `${active} active, ${suspended} suspended. ` +
    `Total delegates: ${state.totalDelegates}. ` +
    `Founding worlds: ${state.foundingWorldDelegates} delegate(s). ` +
    `Outer arc: ${state.outerArcDelegates} delegate(s). ` +
    `Voting capacity: ${votingCapacity.toFixed(2)}.`;

  return {
    year,
    totalWorlds: allDelegations.length,
    totalDelegates: state.totalDelegates,
    foundingWorldDelegates: state.foundingWorldDelegates,
    outerArcDelegates: state.outerArcDelegates,
    activeDelegations: active,
    suspendedDelegations: suspended,
    totalVotingCapacity: votingCapacity,
    category: 'ASSEMBLY_COMPOSITION',
    summary,
  };
}

/**
 * Creates an initial registry state pre-loaded with the 20 launch worlds.
 */
export function createDelegationRegistryState(): DelegationRegistryState {
  return rebuildCounters({
    delegations: { ...LAUNCH_WORLD_DELEGATIONS },
    totalDelegates: 0,
    foundingWorldDelegates: 0,
    outerArcDelegates: 0,
    suspensionLog: [],
  });
}

/**
 * Creates an empty registry state with no delegations.
 */
export function createEmptyDelegationRegistryState(): DelegationRegistryState {
  return {
    delegations: {},
    totalDelegates: 0,
    foundingWorldDelegates: 0,
    outerArcDelegates: 0,
    suspensionLog: [],
  };
}

// ΓöÇΓöÇ Internal Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function rebuildCounters(state: DelegationRegistryState): DelegationRegistryState {
  const all = Object.values(state.delegations);
  const active = all.filter((d) => d.delegationStatus === 'ACTIVE');

  const totalDelegates = active.reduce((sum, d) => sum + d.delegateIds.length, 0);
  const foundingWorldDelegates = active
    .filter((d) => d.isFoundingWorld)
    .reduce((sum, d) => sum + d.delegateIds.length, 0);
  const outerArcDelegates = active
    .filter((d) => !d.isFoundingWorld)
    .reduce((sum, d) => sum + d.delegateIds.length, 0);

  return { ...state, totalDelegates, foundingWorldDelegates, outerArcDelegates };
}

function computeDelegateVotingWeight(isFoundingWorld: boolean, delegateCount: number): number {
  const weight = isFoundingWorld ? FOUNDING_WORLD_DELEGATE_WEIGHT : DEFAULT_DELEGATE_VOTING_WEIGHT;
  return weight * delegateCount;
}

function _buildLaunchDelegations(): Readonly<Record<string, AssemblyDelegation>> {
  const launchWorldData: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly population: number;
    readonly arcId: string;
  }> = [
    { id: 'world-001', name: 'Verdant Prime', population: 8_000_000_000, arcId: 'arc-0' },
    { id: 'world-002', name: 'Kel Arnath', population: 2_500_000_000, arcId: 'arc-0' },
    { id: 'world-003', name: 'Amber Reach', population: 4_000_000_000, arcId: 'arc-0' },
    { id: 'world-004', name: 'Thorn Basin', population: 900_000_000, arcId: 'arc-0' },
    { id: 'world-005', name: 'Solace Drift', population: 350_000_000, arcId: 'arc-0' },
    { id: 'world-006', name: 'The Pale Reach', population: 120_000_000, arcId: 'arc-0' },
    { id: 'world-007', name: 'Dusk Margin', population: 1_800_000_000, arcId: 'arc-0' },
    { id: 'world-008', name: 'Fenhold', population: 650_000_000, arcId: 'arc-0' },
    { id: 'world-009', name: 'Calder Station', population: 80_000_000, arcId: 'arc-0' },
    { id: 'world-010', name: 'Iron Gradient', population: 2_100_000_000, arcId: 'arc-0' },
    { id: 'world-011', name: 'Veil Shore', population: 400_000_000, arcId: 'arc-0' },
    { id: 'world-012', name: 'Bright Meridian', population: 3_200_000_000, arcId: 'arc-0' },
    { id: 'world-013', name: 'Quarrel Deep', population: 700_000_000, arcId: 'arc-0' },
    { id: 'world-014', name: 'Ashen Fields', population: 250_000_000, arcId: 'arc-0' },
    { id: 'world-015', name: 'Covenant Reach', population: 500_000_000, arcId: 'arc-0' },
    { id: 'world-016', name: 'Sunken Lattice', population: 1_400_000_000, arcId: 'arc-0' },
    { id: 'world-017', name: 'Ember Strand', population: 60_000_000, arcId: 'arc-0' },
    { id: 'world-018', name: 'Hollow March', population: 900_000_000, arcId: 'arc-0' },
    { id: 'world-019', name: 'Saltwind Station', population: 180_000_000, arcId: 'arc-0' },
    { id: 'world-020', name: 'The Concord Heart', population: 5_000_000_000, arcId: 'arc-0' },
  ];

  const result: Record<string, AssemblyDelegation> = {};
  for (const world of launchWorldData) {
    const slots = computeDelegateSlots(world.population);
    const weight = computeDelegateVotingWeight(true, 0);
    result[world.id] = {
      worldId: world.id,
      worldName: world.name,
      delegationStatus: 'ACTIVE',
      delegateIds: [],
      delegateSlots: slots,
      admittedYear: 1,
      lastElectionYear: undefined,
      votingWeightTotal: weight,
      isFoundingWorld: true,
      arcId: world.arcId,
    };
  }
  return result;
}
