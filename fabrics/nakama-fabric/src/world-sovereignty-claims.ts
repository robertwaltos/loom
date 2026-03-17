/**
 * World Sovereignty Claims ΓÇö Political sovereignty registry for The Concord.
 *
 * Tracks which dynasties hold legal right to govern and collect taxes on worlds.
 * The Assembly grants formal recognition; the Ascendancy holds 40+ worlds by
 * conquest, most unrecognized. Survey Corps discoveries begin as COMMONWEALTH.
 *
 * KALON values use BigInt micro-KALON (1 KALON = 1_000_000n).
 * Sovereign dynasty receives 70% of annual world issuance.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SovereigntyStatus =
  | 'RECOGNIZED'
  | 'CONTESTED'
  | 'DISPUTED'
  | 'COMMONWEALTH'
  | 'ASCENDANCY'
  | 'ASSEMBLY_AUTHORITY';

export type SovereigntyBasis =
  | 'FOUNDING_GRANT'
  | 'SURVEY_DISCOVERY'
  | 'PURCHASE'
  | 'TREATY'
  | 'CONQUEST'
  | 'EMERGENCY_ORDER';

export interface SovereigntyClaim {
  readonly claimId: string;
  readonly worldId: string;
  readonly claimantDynastyId: string;
  readonly status: SovereigntyStatus;
  readonly basis: SovereigntyBasis;
  readonly yearEstablished: number;
  readonly yearChallenged: number | null;
  readonly challengers: readonly string[];
  readonly assemblyRecognized: boolean;
  readonly annualKalonShareMicro: bigint;
  readonly note: string;
}

export interface WorldSovereigntyProfile {
  readonly worldId: string;
  readonly sovereignDynastyId: string | null;
  readonly status: SovereigntyStatus;
  readonly isContested: boolean;
  readonly competitors: readonly string[];
}

export interface SovereigntySummary {
  readonly totalClaims: number;
  readonly recognizedCount: number;
  readonly contestedCount: number;
  readonly ascendancyClaimCount: number;
  readonly assemblyAuthorityCount: number;
  readonly totalKalonAnnualMicro: bigint;
  readonly worldsWithRecognizedSovereign: number;
}

// ---------------------------------------------------------------------------
// Seed data ΓÇö 25 claims across 18+ worlds
// ---------------------------------------------------------------------------

const MICRO = 1_000_000n;
const MK = (kalon: bigint): bigint => kalon * MICRO;

export const SOVEREIGNTY_CLAIMS: readonly SovereigntyClaim[] = [
  // --- Assembly Authority worlds ---
  {
    claimId: 'claim-001',
    worldId: 'world-001',
    claimantDynastyId: 'assembly',
    status: 'ASSEMBLY_AUTHORITY',
    basis: 'FOUNDING_GRANT',
    yearEstablished: 0,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(0n),
    note: 'Concordia Prime ΓÇö collective Assembly sovereignty, no dynasty may claim',
  },
  {
    claimId: 'claim-002',
    worldId: 'world-247',
    claimantDynastyId: 'assembly',
    status: 'ASSEMBLY_AUTHORITY',
    basis: 'EMERGENCY_ORDER',
    yearEstablished: 87,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(0n),
    note: 'Quarantine Echo ΓÇö Assembly emergency authority after biohazard event Year 87',
  },

  // --- Recognized founding dynasty claims ---
  {
    claimId: 'claim-003',
    worldId: 'world-002',
    claimantDynastyId: 'dynasty-aurelius',
    status: 'RECOGNIZED',
    basis: 'FOUNDING_GRANT',
    yearEstablished: 2,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(266_000_000n),
    note: 'Founding grant confirmed Year 2; 70% of annual G-class issuance',
  },
  {
    claimId: 'claim-004',
    worldId: 'world-003',
    claimantDynastyId: 'dynasty-kestrel',
    status: 'RECOGNIZED',
    basis: 'FOUNDING_GRANT',
    yearEstablished: 5,
    yearChallenged: 44,
    challengers: ['dynasty-voss'],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(203_000_000n),
    note: 'Challenge by Voss Year 44 failed Assembly arbitration',
  },
  {
    claimId: 'claim-005',
    worldId: 'world-004',
    claimantDynastyId: 'dynasty-voss',
    status: 'RECOGNIZED',
    basis: 'FOUNDING_GRANT',
    yearEstablished: 8,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(147_000_000n),
    note: 'Voss founding claim, K-class world, unchallenged',
  },
  {
    claimId: 'claim-006',
    worldId: 'world-005',
    claimantDynastyId: 'dynasty-voss',
    status: 'RECOGNIZED',
    basis: 'FOUNDING_GRANT',
    yearEstablished: 12,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(122_500_000n),
    note: 'Second Voss world, unopposed',
  },
  {
    claimId: 'claim-007',
    worldId: 'world-007',
    claimantDynastyId: 'dynasty-sorel',
    status: 'RECOGNIZED',
    basis: 'FOUNDING_GRANT',
    yearEstablished: 22,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(66_500_000n),
    note: 'Sorel founding claim, K-class world',
  },
  {
    claimId: 'claim-008',
    worldId: 'world-010',
    claimantDynastyId: 'dynasty-sorel',
    status: 'RECOGNIZED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 35,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(38_500_000n),
    note: 'Survey discovery claim by Sorel Corps expedition',
  },
  {
    claimId: 'claim-009',
    worldId: 'world-012',
    claimantDynastyId: 'dynasty-orin',
    status: 'RECOGNIZED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 42,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(28_000_000n),
    note: 'Orin Survey Corps first discovery, F-class',
  },
  {
    claimId: 'claim-010',
    worldId: 'world-015',
    claimantDynastyId: 'dynasty-orin',
    status: 'RECOGNIZED',
    basis: 'PURCHASE',
    yearEstablished: 65,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(17_500_000n),
    note: 'Purchased from dissolving Dynasty Maren Year 65',
  },
  {
    claimId: 'claim-011',
    worldId: 'world-019',
    claimantDynastyId: 'dynasty-aurelius',
    status: 'RECOGNIZED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 98,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(8_400_000n),
    note: 'Recent Aurelius discovery, M-class frontier world',
  },

  // --- Contested claims ---
  {
    claimId: 'claim-012',
    worldId: 'world-006',
    claimantDynastyId: 'dynasty-aurelius',
    status: 'CONTESTED',
    basis: 'TREATY',
    yearEstablished: 18,
    yearChallenged: 88,
    challengers: ['dynasty-sorel', 'dynasty-kestrel'],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(91_000_000n),
    note: 'Won by contest Year 88; Sorel and Kestrel challenge pending Assembly review',
  },
  {
    claimId: 'claim-013',
    worldId: 'world-009',
    claimantDynastyId: 'dynasty-kestrel',
    status: 'CONTESTED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 30,
    yearChallenged: 95,
    challengers: ['dynasty-voss'],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(49_000_000n),
    note: 'Voss challenge Year 95 under Assembly review, M-class resource world',
  },
  {
    claimId: 'claim-014',
    worldId: 'world-023',
    claimantDynastyId: 'dynasty-sorel',
    status: 'CONTESTED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 61,
    yearChallenged: 99,
    challengers: ['dynasty-orin'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(14_700_000n),
    note: 'Overlapping survey maps; Orin disputes boundary Year 99',
  },
  {
    claimId: 'claim-015',
    worldId: 'world-031',
    claimantDynastyId: 'dynasty-voss',
    status: 'CONTESTED',
    basis: 'PURCHASE',
    yearEstablished: 74,
    yearChallenged: 101,
    challengers: ['dynasty-aurelius', 'dynasty-kestrel'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(21_000_000n),
    note: 'Purchased from Maren estate; two dynasties claim prior right',
  },

  // --- Disputed claims ---
  {
    claimId: 'claim-016',
    worldId: 'world-044',
    claimantDynastyId: 'dynasty-kestrel',
    status: 'DISPUTED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 50,
    yearChallenged: 78,
    challengers: ['ascendancy'],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(9_800_000n),
    note: 'Ascendancy invaded Year 78; Assembly upholds Kestrel recognition',
  },
  {
    claimId: 'claim-017',
    worldId: 'world-082',
    claimantDynastyId: 'dynasty-aurelius',
    status: 'DISPUTED',
    basis: 'TREATY',
    yearEstablished: 66,
    yearChallenged: 91,
    challengers: ['ascendancy'],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(6_300_000n),
    note: 'Treaty-based claim; Ascendancy occupation since Year 91',
  },

  // --- Contested world 601 ---
  {
    claimId: 'claim-018',
    worldId: 'world-601',
    claimantDynastyId: 'dynasty-voss',
    status: 'CONTESTED',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 18,
    yearChallenged: 18,
    challengers: ['dynasty-aurelius', 'dynasty-sorel', 'ascendancy'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(0n),
    note: 'Silfen Point ΓÇö disputed since discovery Year 18; no recognized sovereign',
  },

  // --- Commonwealth worlds (unclaimed Survey Corps discoveries) ---
  {
    claimId: 'claim-019',
    worldId: 'world-052',
    claimantDynastyId: 'commonwealth',
    status: 'COMMONWEALTH',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 71,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(0n),
    note: 'Unclaimed Survey Corps discovery; 48h claim window expired',
  },
  {
    claimId: 'claim-020',
    worldId: 'world-063',
    claimantDynastyId: 'commonwealth',
    status: 'COMMONWEALTH',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 83,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(0n),
    note: 'Frontier M-class world, no claim filed',
  },
  {
    claimId: 'claim-021',
    worldId: 'world-074',
    claimantDynastyId: 'commonwealth',
    status: 'COMMONWEALTH',
    basis: 'SURVEY_DISCOVERY',
    yearEstablished: 97,
    yearChallenged: null,
    challengers: [],
    assemblyRecognized: true,
    annualKalonShareMicro: MK(0n),
    note: 'Recently surveyed, claim window still open',
  },

  // --- Ascendancy claims (Assembly-unrecognized conquest) ---
  {
    claimId: 'claim-022',
    worldId: 'world-101',
    claimantDynastyId: 'ascendancy',
    status: 'ASCENDANCY',
    basis: 'CONQUEST',
    yearEstablished: 55,
    yearChallenged: 56,
    challengers: ['assembly'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(31_500_000n),
    note: 'First Ascendancy conquest; Assembly resolution 55-A declares illegitimate',
  },
  {
    claimId: 'claim-023',
    worldId: 'world-118',
    claimantDynastyId: 'ascendancy',
    status: 'ASCENDANCY',
    basis: 'CONQUEST',
    yearEstablished: 63,
    yearChallenged: 64,
    challengers: ['assembly', 'dynasty-kestrel'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(22_400_000n),
    note: 'Conquest of former Kestrel protectorate; Assembly sanctions active',
  },
  {
    claimId: 'claim-024',
    worldId: 'world-135',
    claimantDynastyId: 'ascendancy',
    status: 'ASCENDANCY',
    basis: 'CONQUEST',
    yearEstablished: 72,
    yearChallenged: 72,
    challengers: ['assembly'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(18_900_000n),
    note: 'Resource-rich K-class world seized during Ascendancy expansion wave',
  },
  {
    claimId: 'claim-025',
    worldId: 'world-167',
    claimantDynastyId: 'ascendancy',
    status: 'ASCENDANCY',
    basis: 'CONQUEST',
    yearEstablished: 80,
    yearChallenged: 81,
    challengers: ['assembly', 'dynasty-sorel'],
    assemblyRecognized: false,
    annualKalonShareMicro: MK(11_200_000n),
    note: 'Seized from Sorel trade corridor; ongoing liberation campaign Year 103',
  },
] as const;

// ---------------------------------------------------------------------------
// Derived constants
// ---------------------------------------------------------------------------

export const ASCENDANCY_CLAIM_COUNT: number = SOVEREIGNTY_CLAIMS.filter(
  (c) => c.status === 'ASCENDANCY',
).length;

export const CONTESTED_CLAIM_COUNT: number = SOVEREIGNTY_CLAIMS.filter(
  (c) => c.status === 'CONTESTED',
).length;

export const RECOGNIZED_CLAIM_COUNT: number = SOVEREIGNTY_CLAIMS.filter(
  (c) => c.status === 'RECOGNIZED',
).length;

export const TOTAL_KALON_ANNUAL_MICRO: bigint = SOVEREIGNTY_CLAIMS.reduce(
  (sum, c) => sum + c.annualKalonShareMicro,
  0n,
);

// ---------------------------------------------------------------------------
// Query functions ΓÇö pure, no side effects
// ---------------------------------------------------------------------------

export function getClaim(id: string): SovereigntyClaim | undefined {
  return SOVEREIGNTY_CLAIMS.find((c) => c.claimId === id);
}

export function getClaimsByWorld(worldId: string): readonly SovereigntyClaim[] {
  return SOVEREIGNTY_CLAIMS.filter((c) => c.worldId === worldId);
}

export function getClaimsByDynasty(dynastyId: string): readonly SovereigntyClaim[] {
  return SOVEREIGNTY_CLAIMS.filter((c) => c.claimantDynastyId === dynastyId);
}

export function getAscendancyClaims(): readonly SovereigntyClaim[] {
  return SOVEREIGNTY_CLAIMS.filter((c) => c.status === 'ASCENDANCY');
}

export function getContestedClaims(): readonly SovereigntyClaim[] {
  return SOVEREIGNTY_CLAIMS.filter((c) => c.status === 'CONTESTED');
}

export function getRecognizedClaims(): readonly SovereigntyClaim[] {
  return SOVEREIGNTY_CLAIMS.filter((c) => c.status === 'RECOGNIZED');
}

export function getWorldSovereigntyProfile(worldId: string): WorldSovereigntyProfile {
  const claims = getClaimsByWorld(worldId);
  const recognized = claims.find((c) => c.assemblyRecognized && c.status === 'RECOGNIZED');
  const authority = claims.find((c) => c.status === 'ASSEMBLY_AUTHORITY');
  const primary = recognized ?? authority ?? claims[0];

  if (primary === undefined) {
    return buildEmptyProfile(worldId);
  }

  const isContested = claims.some((c) => c.status === 'CONTESTED' || c.challengers.length > 0);
  const competitors = extractCompetitors(claims, primary.claimantDynastyId);

  return {
    worldId,
    sovereignDynastyId: primary.assemblyRecognized ? primary.claimantDynastyId : null,
    status: primary.status,
    isContested,
    competitors,
  };
}

function buildEmptyProfile(worldId: string): WorldSovereigntyProfile {
  return {
    worldId,
    sovereignDynastyId: null,
    status: 'COMMONWEALTH',
    isContested: false,
    competitors: [],
  };
}

function extractCompetitors(
  claims: readonly SovereigntyClaim[],
  primaryId: string,
): readonly string[] {
  const challengerSets = claims.flatMap((c) => [...c.challengers]);
  const otherClaimants = claims
    .map((c) => c.claimantDynastyId)
    .filter((id) => id !== primaryId);
  return [...new Set([...challengerSets, ...otherClaimants])];
}

export function getDynastyWorlds(dynastyId: string): readonly string[] {
  return SOVEREIGNTY_CLAIMS.filter(
    (c) => c.claimantDynastyId === dynastyId && c.status === 'RECOGNIZED',
  ).map((c) => c.worldId);
}

export function computeSovereigntySummary(): SovereigntySummary {
  const recognizedWorldIds = new Set(
    SOVEREIGNTY_CLAIMS.filter((c) => c.status === 'RECOGNIZED').map((c) => c.worldId),
  );

  return {
    totalClaims: SOVEREIGNTY_CLAIMS.length,
    recognizedCount: RECOGNIZED_CLAIM_COUNT,
    contestedCount: CONTESTED_CLAIM_COUNT,
    ascendancyClaimCount: ASCENDANCY_CLAIM_COUNT,
    assemblyAuthorityCount: SOVEREIGNTY_CLAIMS.filter((c) => c.status === 'ASSEMBLY_AUTHORITY')
      .length,
    totalKalonAnnualMicro: TOTAL_KALON_ANNUAL_MICRO,
    worldsWithRecognizedSovereign: recognizedWorldIds.size,
  };
}
