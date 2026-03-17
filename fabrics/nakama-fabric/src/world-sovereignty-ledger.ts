/**
 * World Sovereignty Ledger ΓÇö Tracks dynasty sovereignty over surveyed worlds.
 *
 * Each surveyed world has exactly one sovereignty record. Sovereignty can be
 * CLAIMED (single dynasty), CONTESTED (active challenge), OPEN (unclaimed),
 * RESTRICTED (under Architect restriction), or COMMONS (Assembly-designated
 * communal world ΓÇö no dynasty may claim).
 *
 * The ledger is append-only for transitions; records are updated in-place
 * on state changes. All KALON values use BigInt micro-KALON (10^6 precision).
 */

export type SovereigntyStatus = 'CLAIMED' | 'CONTESTED' | 'OPEN' | 'RESTRICTED' | 'COMMONS';

export type SovereigntyTransitionReason =
  | 'INITIAL_CLAIM'
  | 'CHALLENGE_WON'
  | 'VOLUNTARY_RELEASE'
  | 'FORFEIT'
  | 'COMMONS_VOTE'
  | 'ARCHITECT_RULING';

export interface SovereigntyRecord {
  readonly worldId: string;
  readonly status: SovereigntyStatus;
  readonly currentSovereignDynastyId: string | null;
  readonly claimedAtYear: number | null;
  readonly lastTransitionYear: number | null;
  readonly lastTransitionReason: SovereigntyTransitionReason | null;
  readonly challengeCount: number;
  readonly annualTaxMicro: bigint;
  readonly worldClass: 'G' | 'K' | 'M' | 'F' | 'O' | 'A';
  readonly populationTier: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface SovereigntyTransition {
  readonly transitionId: string;
  readonly worldId: string;
  readonly fromDynastyId: string | null;
  readonly toDynastyId: string | null;
  readonly year: number;
  readonly reason: SovereigntyTransitionReason;
  readonly kalonStakeMicro: bigint;
}

export interface WorldSovereigntyService {
  getRecord(worldId: string): SovereigntyRecord | undefined;
  getClaimedWorlds(): ReadonlyArray<SovereigntyRecord>;
  getOpenWorlds(): ReadonlyArray<SovereigntyRecord>;
  getContestableWorlds(): ReadonlyArray<SovereigntyRecord>;
  getDynastyWorlds(dynastyId: string): ReadonlyArray<SovereigntyRecord>;
  computeTotalTaxRevenueMicro(): bigint;
  getTransitionsForWorld(worldId: string): ReadonlyArray<SovereigntyTransition>;
  getMostContestedWorld(): SovereigntyRecord | undefined;
}

// ---------------------------------------------------------------------------
// Seed data ΓÇö 20 worlds with realistic history
// ---------------------------------------------------------------------------

const MICRO = 1_000_000n;
const M = (kalon: bigint): bigint => kalon * MICRO;

export const WORLD_SOVEREIGNTY_RECORDS: ReadonlyArray<SovereigntyRecord> = [
  // --- Core worlds: G-class founding tier ---
  {
    worldId: 'world-001',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-founders',
    claimedAtYear: 0,
    lastTransitionYear: 0,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 3,
    annualTaxMicro: M(500_000_000n),
    worldClass: 'G',
    populationTier: 5,
  },
  {
    worldId: 'world-002',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-aurelius',
    claimedAtYear: 2,
    lastTransitionYear: 45,
    lastTransitionReason: 'CHALLENGE_WON',
    challengeCount: 2,
    annualTaxMicro: M(380_000_000n),
    worldClass: 'G',
    populationTier: 4,
  },
  {
    worldId: 'world-003',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-kestrel',
    claimedAtYear: 5,
    lastTransitionYear: 5,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 1,
    annualTaxMicro: M(290_000_000n),
    worldClass: 'G',
    populationTier: 4,
  },
  {
    worldId: 'world-004',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-voss',
    claimedAtYear: 8,
    lastTransitionYear: 72,
    lastTransitionReason: 'VOLUNTARY_RELEASE',
    challengeCount: 0,
    annualTaxMicro: M(210_000_000n),
    worldClass: 'K',
    populationTier: 4,
  },
  {
    worldId: 'world-005',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-voss',
    claimedAtYear: 12,
    lastTransitionYear: 12,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 0,
    annualTaxMicro: M(175_000_000n),
    worldClass: 'K',
    populationTier: 3,
  },
  // --- Mid-ring worlds: K/M class, contested ---
  {
    worldId: 'world-006',
    status: 'CONTESTED',
    currentSovereignDynastyId: 'dynasty-aurelius',
    claimedAtYear: 18,
    lastTransitionYear: 88,
    lastTransitionReason: 'CHALLENGE_WON',
    challengeCount: 4,
    annualTaxMicro: M(130_000_000n),
    worldClass: 'K',
    populationTier: 3,
  },
  {
    worldId: 'world-007',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-sorel',
    claimedAtYear: 22,
    lastTransitionYear: 22,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 1,
    annualTaxMicro: M(95_000_000n),
    worldClass: 'K',
    populationTier: 3,
  },
  {
    worldId: 'world-008',
    status: 'OPEN',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: 55,
    lastTransitionReason: 'FORFEIT',
    challengeCount: 2,
    annualTaxMicro: 0n,
    worldClass: 'M',
    populationTier: 2,
  },
  {
    worldId: 'world-009',
    status: 'CONTESTED',
    currentSovereignDynastyId: 'dynasty-kestrel',
    claimedAtYear: 30,
    lastTransitionYear: 95,
    lastTransitionReason: 'CHALLENGE_WON',
    challengeCount: 5,
    annualTaxMicro: M(70_000_000n),
    worldClass: 'M',
    populationTier: 2,
  },
  {
    worldId: 'world-010',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-sorel',
    claimedAtYear: 35,
    lastTransitionYear: 35,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 0,
    annualTaxMicro: M(55_000_000n),
    worldClass: 'M',
    populationTier: 2,
  },
  // --- Outer worlds: M/F class, lower population ---
  {
    worldId: 'world-011',
    status: 'COMMONS',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: 40,
    lastTransitionReason: 'COMMONS_VOTE',
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'M',
    populationTier: 2,
  },
  {
    worldId: 'world-012',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-orin',
    claimedAtYear: 42,
    lastTransitionYear: 42,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 1,
    annualTaxMicro: M(40_000_000n),
    worldClass: 'F',
    populationTier: 1,
  },
  {
    worldId: 'world-013',
    status: 'OPEN',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: null,
    lastTransitionReason: null,
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'F',
    populationTier: 1,
  },
  {
    worldId: 'world-014',
    status: 'COMMONS',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: 60,
    lastTransitionReason: 'COMMONS_VOTE',
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'M',
    populationTier: 1,
  },
  {
    worldId: 'world-015',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-orin',
    claimedAtYear: 65,
    lastTransitionYear: 80,
    lastTransitionReason: 'ARCHITECT_RULING',
    challengeCount: 1,
    annualTaxMicro: M(25_000_000n),
    worldClass: 'F',
    populationTier: 1,
  },
  // --- Frontier worlds: recently surveyed ---
  {
    worldId: 'world-016',
    status: 'OPEN',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: null,
    lastTransitionReason: null,
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'M',
    populationTier: 0,
  },
  {
    worldId: 'world-017',
    status: 'RESTRICTED',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: 90,
    lastTransitionReason: 'ARCHITECT_RULING',
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'F',
    populationTier: 0,
  },
  {
    worldId: 'world-018',
    status: 'OPEN',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: null,
    lastTransitionReason: null,
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'M',
    populationTier: 0,
  },
  {
    worldId: 'world-019',
    status: 'CLAIMED',
    currentSovereignDynastyId: 'dynasty-aurelius',
    claimedAtYear: 98,
    lastTransitionYear: 98,
    lastTransitionReason: 'INITIAL_CLAIM',
    challengeCount: 0,
    annualTaxMicro: M(12_000_000n),
    worldClass: 'M',
    populationTier: 0,
  },
  {
    worldId: 'world-020',
    status: 'OPEN',
    currentSovereignDynastyId: null,
    claimedAtYear: null,
    lastTransitionYear: null,
    lastTransitionReason: null,
    challengeCount: 0,
    annualTaxMicro: 0n,
    worldClass: 'O',
    populationTier: 0,
  },
];

export const SOVEREIGNTY_TRANSITIONS: ReadonlyArray<SovereigntyTransition> = [
  // Year 0 ΓÇö Founding claims
  {
    transitionId: 'txn-001',
    worldId: 'world-001',
    fromDynastyId: null,
    toDynastyId: 'dynasty-founders',
    year: 0,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(1_000_000n),
  },
  {
    transitionId: 'txn-002',
    worldId: 'world-002',
    fromDynastyId: null,
    toDynastyId: 'dynasty-founders',
    year: 2,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(800_000n),
  },
  {
    transitionId: 'txn-003',
    worldId: 'world-003',
    fromDynastyId: null,
    toDynastyId: 'dynasty-kestrel',
    year: 5,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(600_000n),
  },
  {
    transitionId: 'txn-004',
    worldId: 'world-004',
    fromDynastyId: null,
    toDynastyId: 'dynasty-voss',
    year: 8,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(500_000n),
  },
  {
    transitionId: 'txn-005',
    worldId: 'world-005',
    fromDynastyId: null,
    toDynastyId: 'dynasty-voss',
    year: 12,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(450_000n),
  },
  // Year 18-40 ΓÇö Mid-ring expansion
  {
    transitionId: 'txn-006',
    worldId: 'world-006',
    fromDynastyId: null,
    toDynastyId: 'dynasty-sorel',
    year: 18,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(350_000n),
  },
  {
    transitionId: 'txn-007',
    worldId: 'world-007',
    fromDynastyId: null,
    toDynastyId: 'dynasty-sorel',
    year: 22,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(300_000n),
  },
  {
    transitionId: 'txn-008',
    worldId: 'world-011',
    fromDynastyId: null,
    toDynastyId: null,
    year: 40,
    reason: 'COMMONS_VOTE',
    kalonStakeMicro: 0n,
  },
  // Year 40-65 ΓÇö Challenge era
  {
    transitionId: 'txn-009',
    worldId: 'world-002',
    fromDynastyId: 'dynasty-founders',
    toDynastyId: 'dynasty-aurelius',
    year: 45,
    reason: 'CHALLENGE_WON',
    kalonStakeMicro: M(2_000_000n),
  },
  {
    transitionId: 'txn-010',
    worldId: 'world-008',
    fromDynastyId: 'dynasty-kestrel',
    toDynastyId: null,
    year: 55,
    reason: 'FORFEIT',
    kalonStakeMicro: M(200_000n),
  },
  {
    transitionId: 'txn-011',
    worldId: 'world-014',
    fromDynastyId: null,
    toDynastyId: null,
    year: 60,
    reason: 'COMMONS_VOTE',
    kalonStakeMicro: 0n,
  },
  {
    transitionId: 'txn-012',
    worldId: 'world-015',
    fromDynastyId: null,
    toDynastyId: 'dynasty-orin',
    year: 65,
    reason: 'INITIAL_CLAIM',
    kalonStakeMicro: M(150_000n),
  },
  // Year 70-100 ΓÇö Modern transitions
  {
    transitionId: 'txn-013',
    worldId: 'world-004',
    fromDynastyId: 'dynasty-voss',
    toDynastyId: 'dynasty-voss',
    year: 72,
    reason: 'VOLUNTARY_RELEASE',
    kalonStakeMicro: 0n,
  },
  {
    transitionId: 'txn-014',
    worldId: 'world-015',
    fromDynastyId: 'dynasty-orin',
    toDynastyId: 'dynasty-orin',
    year: 80,
    reason: 'ARCHITECT_RULING',
    kalonStakeMicro: 0n,
  },
  {
    transitionId: 'txn-015',
    worldId: 'world-006',
    fromDynastyId: 'dynasty-sorel',
    toDynastyId: 'dynasty-aurelius',
    year: 88,
    reason: 'CHALLENGE_WON',
    kalonStakeMicro: M(1_500_000n),
  },
];

// ---------------------------------------------------------------------------
// Derived constants
// ---------------------------------------------------------------------------

export const CLAIMED_WORLD_COUNT: number = WORLD_SOVEREIGNTY_RECORDS.filter(
  (r) => r.status === 'CLAIMED' || r.status === 'CONTESTED',
).length;

export const COMMONS_WORLD_COUNT: number = WORLD_SOVEREIGNTY_RECORDS.filter(
  (r) => r.status === 'COMMONS',
).length;

export const MOST_CONTESTED_WORLD_ID: string = findMostContestedId(WORLD_SOVEREIGNTY_RECORDS);

function findMostContestedId(records: ReadonlyArray<SovereigntyRecord>): string {
  let best: SovereigntyRecord | undefined;
  for (const record of records) {
    if (best === undefined || record.challengeCount > best.challengeCount) {
      best = record;
    }
  }
  return best?.worldId ?? '';
}

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------

interface ServiceState {
  readonly recordMap: ReadonlyMap<string, SovereigntyRecord>;
  readonly transitionIndex: ReadonlyMap<string, ReadonlyArray<SovereigntyTransition>>;
}

function buildServiceState(): ServiceState {
  const recordMap = new Map<string, SovereigntyRecord>();
  for (const record of WORLD_SOVEREIGNTY_RECORDS) {
    recordMap.set(record.worldId, record);
  }

  const transitionIndex = new Map<string, SovereigntyTransition[]>();
  for (const txn of SOVEREIGNTY_TRANSITIONS) {
    const existing = transitionIndex.get(txn.worldId) ?? [];
    transitionIndex.set(txn.worldId, [...existing, txn]);
  }

  return { recordMap, transitionIndex };
}

function filterByStatus(
  recordMap: ReadonlyMap<string, SovereigntyRecord>,
  status: SovereigntyStatus,
): ReadonlyArray<SovereigntyRecord> {
  return [...recordMap.values()].filter((r) => r.status === status);
}

function computeTotalTax(recordMap: ReadonlyMap<string, SovereigntyRecord>): bigint {
  let total = 0n;
  for (const record of recordMap.values()) {
    total += record.annualTaxMicro;
  }
  return total;
}

function findTopContested(
  recordMap: ReadonlyMap<string, SovereigntyRecord>,
): SovereigntyRecord | undefined {
  let best: SovereigntyRecord | undefined;
  for (const record of recordMap.values()) {
    if (best === undefined || record.challengeCount > best.challengeCount) {
      best = record;
    }
  }
  return best;
}

export function createWorldSovereigntyService(): WorldSovereigntyService {
  const state = buildServiceState();

  return {
    getRecord: (worldId) => state.recordMap.get(worldId),

    getClaimedWorlds: () => filterByStatus(state.recordMap, 'CLAIMED'),

    getOpenWorlds: () => filterByStatus(state.recordMap, 'OPEN'),

    getContestableWorlds: () =>
      [...state.recordMap.values()].filter(
        (r) => r.status === 'CLAIMED' || r.status === 'CONTESTED',
      ),

    getDynastyWorlds: (dynastyId) =>
      [...state.recordMap.values()].filter((r) => r.currentSovereignDynastyId === dynastyId),

    computeTotalTaxRevenueMicro: () => computeTotalTax(state.recordMap),

    getTransitionsForWorld: (worldId) => state.transitionIndex.get(worldId) ?? [],

    getMostContestedWorld: () => findTopContested(state.recordMap),
  };
}
