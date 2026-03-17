/**
 * Dynasty Warfare Protocol ΓÇö Concord-law-constrained inter-dynasty conflict registry.
 *
 * In The Concord, open warfare destabilizes the lattice and is heavily regulated
 * by the Assembly. Most conflict takes the form of economic, political, or proxy
 * warfare. Sanctioned wars require Assembly approval (or Ascendancy coercion).
 *
 * This module provides canonical conflict records spanning Year 10ΓÇô105,
 * including war declaration requests and their Assembly/Architect outcomes.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ConflictType =
  | 'ECONOMIC_WAR'
  | 'POLITICAL_CAMPAIGN'
  | 'PROXY_CONFLICT'
  | 'SANCTIONED_WAR'
  | 'BORDER_DISPUTE'
  | 'INFORMATION_WAR';

export type ConflictStatus =
  | 'ACTIVE'
  | 'CEASEFIRE'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'ASSEMBLY_MEDIATED';

export type WarDeclarationOutcome =
  | 'APPROVED'
  | 'REJECTED'
  | 'VETOED_BY_ARCHITECT'
  | 'WITHDRAWN'
  | 'MODIFIED';

export type HistoricalSignificance = 'MINOR' | 'SIGNIFICANT' | 'MAJOR' | 'CIVILISATIONAL';

export interface DynastyConflictRecord {
  readonly conflictId: string;
  readonly type: ConflictType;
  readonly status: ConflictStatus;
  readonly aggressorDynastyId: string;
  readonly defenderDynastyId: string;
  readonly worldId: string | null;
  readonly yearStarted: number;
  readonly yearEnded: number | null;
  readonly assemblyApprovalRequired: boolean;
  readonly assemblyVoteOutcome: WarDeclarationOutcome | null;
  readonly latticeImpactScore: number;
  readonly kalonCostToAggressorMicro: bigint;
  readonly kalonCostToDefenderMicro: bigint;
  readonly chronicleEntryCount: number;
  readonly outcome: string | null;
  readonly historicalSignificance: HistoricalSignificance;
}

export interface WarDeclarationRequest {
  readonly requestId: string;
  readonly requestingDynastyId: string;
  readonly targetDynastyId: string;
  readonly conflictType: ConflictType;
  readonly proposedStartYear: number;
  readonly justification: string;
  readonly outcome: WarDeclarationOutcome;
  readonly assemblyVotePct: number | null;
}

// ΓöÇΓöÇΓöÇ Canonical Conflicts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const CANONICAL_CONFLICTS: ReadonlyArray<DynastyConflictRecord> = [
  {
    conflictId: 'conflict-001',
    type: 'SANCTIONED_WAR',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-ascendancy-prime',
    defenderDynastyId: 'dynasty-iron-lattice',
    worldId: 'world-012',
    yearStarted: 10,
    yearEnded: 14,
    assemblyApprovalRequired: true,
    assemblyVoteOutcome: 'APPROVED',
    latticeImpactScore: 78,
    kalonCostToAggressorMicro: 42_000_000_000n,
    kalonCostToDefenderMicro: 91_000_000_000n,
    chronicleEntryCount: 47,
    outcome:
      'Ascendancy forced Assembly approval; Iron Lattice conceded mining rights on World 012. ' +
      'Marked the first use of sanctioned war as political leverage.',
    historicalSignificance: 'CIVILISATIONAL',
  },
  {
    conflictId: 'conflict-002',
    type: 'ECONOMIC_WAR',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-vorthan-combine',
    defenderDynastyId: 'dynasty-meridian-guild',
    worldId: 'world-031',
    yearStarted: 22,
    yearEnded: 29,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 18,
    kalonCostToAggressorMicro: 7_500_000_000n,
    kalonCostToDefenderMicro: 12_200_000_000n,
    chronicleEntryCount: 22,
    outcome: 'Meridian Guild collapsed trade routes; Vorthan Combine absorbed two subsidiary dynasties.',
    historicalSignificance: 'SIGNIFICANT',
  },
  {
    conflictId: 'conflict-003',
    type: 'BORDER_DISPUTE',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-sol-covenant',
    defenderDynastyId: 'dynasty-deep-survey',
    worldId: 'world-089',
    yearStarted: 62,
    yearEnded: 65,
    assemblyApprovalRequired: true,
    assemblyVoteOutcome: 'APPROVED',
    latticeImpactScore: 44,
    kalonCostToAggressorMicro: 3_100_000_000n,
    kalonCostToDefenderMicro: 3_800_000_000n,
    chronicleEntryCount: 19,
    outcome:
      'One of three concurrent border disputes triggered by the Year 62 lattice crisis. ' +
      'Assembly mediation set precedent for lattice-zone boundary arbitration.',
    historicalSignificance: 'MAJOR',
  },
  {
    conflictId: 'conflict-004',
    type: 'BORDER_DISPUTE',
    status: 'ASSEMBLY_MEDIATED',
    aggressorDynastyId: 'dynasty-hollow-crown',
    defenderDynastyId: 'dynasty-arc-seven',
    worldId: 'world-101',
    yearStarted: 62,
    yearEnded: 67,
    assemblyApprovalRequired: true,
    assemblyVoteOutcome: 'MODIFIED',
    latticeImpactScore: 39,
    kalonCostToAggressorMicro: 2_800_000_000n,
    kalonCostToDefenderMicro: 2_100_000_000n,
    chronicleEntryCount: 15,
    outcome:
      'Second Year 62 lattice-crisis border dispute. Assembly modified the declaration terms; ' +
      'mediation enforced a 40-year lattice exclusion zone.',
    historicalSignificance: 'MAJOR',
  },
  {
    conflictId: 'conflict-005',
    type: 'BORDER_DISPUTE',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-vorthan-combine',
    defenderDynastyId: 'dynasty-pale-signal',
    worldId: 'world-114',
    yearStarted: 62,
    yearEnded: 63,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 29,
    kalonCostToAggressorMicro: 900_000_000n,
    kalonCostToDefenderMicro: 1_200_000_000n,
    chronicleEntryCount: 9,
    outcome:
      'Third concurrent Year 62 border dispute. Quickly resolved by bilateral agreement; ' +
      'Pale Signal ceded northern lattice access rights.',
    historicalSignificance: 'MINOR',
  },
  {
    conflictId: 'conflict-006',
    type: 'PROXY_CONFLICT',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-ascendancy-prime',
    defenderDynastyId: 'dynasty-free-meridian',
    worldId: 'world-394',
    yearStarted: 70,
    yearEnded: 84,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 91,
    kalonCostToAggressorMicro: 38_000_000_000n,
    kalonCostToDefenderMicro: 55_000_000_000n,
    chronicleEntryCount: 134,
    outcome:
      'The longest proxy conflict in Concord history. Ascendancy-backed factions systematically ' +
      'destabilized World 394 governance over 14 years. The conflict contributed directly to ' +
      'the World 394 lattice collapse in Year 84. Classified as the defining atrocity of the era.',
    historicalSignificance: 'CIVILISATIONAL',
  },
  {
    conflictId: 'conflict-007',
    type: 'POLITICAL_CAMPAIGN',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-arc-seven',
    defenderDynastyId: 'dynasty-ascendancy-prime',
    worldId: null,
    yearStarted: 75,
    yearEnded: 78,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 12,
    kalonCostToAggressorMicro: 4_300_000_000n,
    kalonCostToDefenderMicro: 1_100_000_000n,
    chronicleEntryCount: 31,
    outcome:
      'Cross-world political campaign to unseat Ascendancy allies from Assembly sub-committees. ' +
      'Partially successful; two committee chairs replaced.',
    historicalSignificance: 'SIGNIFICANT',
  },
  {
    conflictId: 'conflict-008',
    type: 'INFORMATION_WAR',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-pale-signal',
    defenderDynastyId: 'dynasty-reparations-accord',
    worldId: null,
    yearStarted: 88,
    yearEnded: 94,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 22,
    kalonCostToAggressorMicro: 5_600_000_000n,
    kalonCostToDefenderMicro: 3_400_000_000n,
    chronicleEntryCount: 58,
    outcome:
      'Post-Ascendancy information war between anti-reparations bloc and pro-reparations dynasties. ' +
      'Pale Signal led disinformation campaign disputing World 394 casualty figures. ' +
      'Reparations Accord successfully defended the historical record in the Chronicle.',
    historicalSignificance: 'MAJOR',
  },
  {
    conflictId: 'conflict-009',
    type: 'ECONOMIC_WAR',
    status: 'RESOLVED',
    aggressorDynastyId: 'dynasty-hollow-crown',
    defenderDynastyId: 'dynasty-deep-survey',
    worldId: 'world-201',
    yearStarted: 95,
    yearEnded: 99,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 15,
    kalonCostToAggressorMicro: 8_700_000_000n,
    kalonCostToDefenderMicro: 6_300_000_000n,
    chronicleEntryCount: 27,
    outcome: 'Resource embargo resolved by joint survey compact; both dynasties accepted neutral arbitration.',
    historicalSignificance: 'MINOR',
  },
  {
    conflictId: 'conflict-010',
    type: 'ECONOMIC_WAR',
    status: 'ACTIVE',
    aggressorDynastyId: 'dynasty-vorthan-combine',
    defenderDynastyId: 'dynasty-meridian-guild',
    worldId: null,
    yearStarted: 103,
    yearEnded: null,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 31,
    kalonCostToAggressorMicro: 11_200_000_000n,
    kalonCostToDefenderMicro: 9_800_000_000n,
    chronicleEntryCount: 14,
    outcome: null,
    historicalSignificance: 'SIGNIFICANT',
  },
  {
    conflictId: 'conflict-011',
    type: 'POLITICAL_CAMPAIGN',
    status: 'ACTIVE',
    aggressorDynastyId: 'dynasty-reparations-accord',
    defenderDynastyId: 'dynasty-pale-signal',
    worldId: null,
    yearStarted: 105,
    yearEnded: null,
    assemblyApprovalRequired: false,
    assemblyVoteOutcome: null,
    latticeImpactScore: 8,
    kalonCostToAggressorMicro: 2_100_000_000n,
    kalonCostToDefenderMicro: 800_000_000n,
    chronicleEntryCount: 5,
    outcome: null,
    historicalSignificance: 'MINOR',
  },
] as const;

// ΓöÇΓöÇΓöÇ War Declaration Requests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const WAR_DECLARATION_REQUESTS: ReadonlyArray<WarDeclarationRequest> = [
  {
    requestId: 'wdr-001',
    requestingDynastyId: 'dynasty-ascendancy-prime',
    targetDynastyId: 'dynasty-iron-lattice',
    conflictType: 'SANCTIONED_WAR',
    proposedStartYear: 10,
    justification:
      'Claim of unlawful lattice encroachment on World 012 mining zones; ' +
      'prior arbitration failed to reach binding resolution.',
    outcome: 'APPROVED',
    assemblyVotePct: 68.2,
  },
  {
    requestId: 'wdr-002',
    requestingDynastyId: 'dynasty-sol-covenant',
    targetDynastyId: 'dynasty-iron-lattice',
    conflictType: 'SANCTIONED_WAR',
    proposedStartYear: 18,
    justification:
      'Claim of resource theft from surveyed but unregistered lattice zone. ' +
      'Iron Lattice denies all jurisdictional standing.',
    outcome: 'REJECTED',
    assemblyVotePct: 41.7,
  },
  {
    requestId: 'wdr-003',
    requestingDynastyId: 'dynasty-hollow-crown',
    targetDynastyId: 'dynasty-vorthan-combine',
    conflictType: 'SANCTIONED_WAR',
    proposedStartYear: 38,
    justification:
      'Retaliatory sanction for Vorthan economic blockade of three subsidiary worlds. ' +
      'Full military engagement requested.',
    outcome: 'REJECTED',
    assemblyVotePct: 38.1,
  },
  {
    requestId: 'wdr-004',
    requestingDynastyId: 'dynasty-arc-seven',
    targetDynastyId: 'dynasty-ascendancy-prime',
    conflictType: 'SANCTIONED_WAR',
    proposedStartYear: 71,
    justification:
      'Formal charge that Ascendancy operations on World 394 constitute acts of war ' +
      'against the sovereign governance of that world.',
    outcome: 'VETOED_BY_ARCHITECT',
    assemblyVotePct: 72.3,
  },
  {
    requestId: 'wdr-005',
    requestingDynastyId: 'dynasty-deep-survey',
    targetDynastyId: 'dynasty-pale-signal',
    conflictType: 'SANCTIONED_WAR',
    proposedStartYear: 89,
    justification:
      'Repeated sabotage of Survey Corps navigation beacons attributed to Pale Signal operatives. ' +
      'Three survey ships lost.',
    outcome: 'WITHDRAWN',
    assemblyVotePct: null,
  },
  {
    requestId: 'wdr-006',
    requestingDynastyId: 'dynasty-free-meridian',
    targetDynastyId: 'dynasty-vorthan-combine',
    conflictType: 'SANCTIONED_WAR',
    proposedStartYear: 97,
    justification:
      'Unlawful seizure of jointly-held lattice relay station on World 201. ' +
      'Immediate military redress sought.',
    outcome: 'MODIFIED',
    assemblyVotePct: 61.4,
  },
] as const;

// ΓöÇΓöÇΓöÇ Derived Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ACTIVE_CONFLICT_COUNT: number = CANONICAL_CONFLICTS.filter(
  (c) => c.status === 'ACTIVE',
).length;

export const TOTAL_KALON_EXPENDED_IN_CONFLICTS_MICRO: bigint = CANONICAL_CONFLICTS.reduce(
  (sum, c) => sum + c.kalonCostToAggressorMicro + c.kalonCostToDefenderMicro,
  0n,
);

const _worstLatticeConflict: DynastyConflictRecord = CANONICAL_CONFLICTS.slice(1).reduce(
  (worst, c) => (c.latticeImpactScore > worst.latticeImpactScore ? c : worst),
  CANONICAL_CONFLICTS[0] as DynastyConflictRecord,
);
export const WORST_LATTICE_IMPACT_CONFLICT_ID: string = _worstLatticeConflict.conflictId;

export const ARCHITECT_VETOED_CONFLICTS_COUNT: number = WAR_DECLARATION_REQUESTS.filter(
  (r) => r.outcome === 'VETOED_BY_ARCHITECT',
).length;

// ΓöÇΓöÇΓöÇ Lookup Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Look up a conflict record by its ID */
export function getConflict(conflictId: string): DynastyConflictRecord | undefined {
  return CANONICAL_CONFLICTS.find((c) => c.conflictId === conflictId);
}

/** Return all currently active conflicts */
export function getActiveConflicts(): ReadonlyArray<DynastyConflictRecord> {
  return CANONICAL_CONFLICTS.filter((c) => c.status === 'ACTIVE');
}

/** Return all conflicts of a given type */
export function getConflictsByType(type: ConflictType): ReadonlyArray<DynastyConflictRecord> {
  return CANONICAL_CONFLICTS.filter((c) => c.type === type);
}

/** Return all conflicts that occurred on a specific world */
export function getConflictsByWorld(worldId: string): ReadonlyArray<DynastyConflictRecord> {
  return CANONICAL_CONFLICTS.filter((c) => c.worldId === worldId);
}

/** Return all conflicts where a dynasty was aggressor or defender */
export function getConflictsForDynasty(dynastyId: string): ReadonlyArray<DynastyConflictRecord> {
  return CANONICAL_CONFLICTS.filter(
    (c) => c.aggressorDynastyId === dynastyId || c.defenderDynastyId === dynastyId,
  );
}

/** Look up a war declaration request by ID */
export function getWarDeclarationRequest(requestId: string): WarDeclarationRequest | undefined {
  return WAR_DECLARATION_REQUESTS.find((r) => r.requestId === requestId);
}

/** Return all war declaration requests vetoed by the Architect */
export function getVetoedDeclarations(): ReadonlyArray<WarDeclarationRequest> {
  return WAR_DECLARATION_REQUESTS.filter((r) => r.outcome === 'VETOED_BY_ARCHITECT');
}

/** Compute the total KALON cost (both sides) for a single conflict */
export function computeTotalWarCost(conflictId: string): bigint {
  const conflict = getConflict(conflictId);
  if (conflict === undefined) return 0n;
  return conflict.kalonCostToAggressorMicro + conflict.kalonCostToDefenderMicro;
}
