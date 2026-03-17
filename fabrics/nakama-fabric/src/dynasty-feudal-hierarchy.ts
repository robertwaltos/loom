/**
 * Dynasty Feudal Hierarchy ΓÇö The ranked power pyramid of The Concord.
 *
 * Where the patron system tracks informal protection-and-loyalty exchanges,
 * the feudal hierarchy records the *formal* ranked structure: who owes military
 * service, KALON tithe, and oath of fealty to whom. Sovereign dynasties sit
 * atop a pyramid of arch-, greater-, and lesser-dynasties, with petitioners
 * seeking admission at the bottom.
 *
 * The Ascendancy's rise in Years 1ΓÇô22 shattered several bonds ΓÇö particularly
 * among lesser dynasties intimidated into neutrality. The post-Suppression era
 * (Year 23+) has seen contested bonds proliferate as old obligations are
 * re-litigated before the Assembly.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type FeudalTier =
  | 'SOVEREIGN'
  | 'ARCH-DYNASTY'
  | 'GREATER-DYNASTY'
  | 'LESSER-DYNASTY'
  | 'PETITIONER';

export type FeudalObligationType =
  | 'MILITARY_SERVICE'
  | 'KALON_TITHE'
  | 'LABOR_LEVY'
  | 'LOYALTY_OATH'
  | 'INTELLIGENCE_SHARING';

export type FeudalStatus = 'ACTIVE' | 'CONTESTED' | 'DISSOLVED' | 'SUSPENDED';

// ΓöÇΓöÇ Interfaces ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface FeudalObligation {
  readonly obligationId: string;
  readonly type: FeudalObligationType;
  readonly annualValueMicro: bigint;
  readonly isHonored: boolean;
  readonly lastFulfillmentYear: number;
}

export interface FeudalBond {
  readonly bondId: string;
  readonly overlordDynastyId: string;
  readonly vassalDynastyId: string;
  readonly tier: FeudalTier;
  readonly bondYear: number;
  readonly status: FeudalStatus;
  readonly obligations: readonly FeudalObligation[];
  readonly worldsGranted: readonly string[];
}

export interface DynastyFeudalProfile {
  readonly dynastyId: string;
  readonly tier: FeudalTier;
  readonly overlordBonds: readonly FeudalBond[];
  readonly vassalBonds: readonly FeudalBond[];
  readonly totalTitheMicro: bigint;
}

export interface FeudalSummary {
  readonly totalBonds: number;
  readonly activeBonds: number;
  readonly contestedBonds: number;
  readonly dissolvedBonds: number;
  readonly suspendedBonds: number;
  readonly totalAnnualTitheMicro: bigint;
}

// ΓöÇΓöÇ Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const FEUDAL_BONDS: readonly FeudalBond[] = [
  // ΓöÇΓöÇ dynasty-first-light (SOVEREIGN) holds arch-bonds ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-001',
    overlordDynastyId: 'dynasty-first-light',
    vassalDynastyId: 'dynasty-iron-meridian',
    tier: 'ARCH-DYNASTY',
    bondYear: -10,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-001-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-001-b',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 12_000_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: ['world-ferrous-prime', 'world-anvil-reach'],
  },
  {
    bondId: 'bond-002',
    overlordDynastyId: 'dynasty-first-light',
    vassalDynastyId: 'dynasty-celeste-rising',
    tier: 'ARCH-DYNASTY',
    bondYear: -8,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-002-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-002-b',
        type: 'KALON_TITHE',
        annualValueMicro: 9_000_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-002-c',
        type: 'INTELLIGENCE_SHARING',
        annualValueMicro: 1_500_000_000n,
        isHonored: true,
        lastFulfillmentYear: 29,
      },
    ],
    worldsGranted: ['world-celeste-origin', 'world-aurora-shelf'],
  },
  // ΓöÇΓöÇ dynasty-iron-meridian (ARCH) holds greater-bonds ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-003',
    overlordDynastyId: 'dynasty-iron-meridian',
    vassalDynastyId: 'dynasty-thornwall',
    tier: 'GREATER-DYNASTY',
    bondYear: -5,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-003-a',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 6_500_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-003-b',
        type: 'KALON_TITHE',
        annualValueMicro: 4_000_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: ['world-thornwall-bastion'],
  },
  {
    bondId: 'bond-004',
    overlordDynastyId: 'dynasty-iron-meridian',
    vassalDynastyId: 'dynasty-pale-standard',
    tier: 'GREATER-DYNASTY',
    bondYear: -3,
    status: 'CONTESTED',
    obligations: [
      {
        obligationId: 'obl-004-a',
        type: 'KALON_TITHE',
        annualValueMicro: 5_200_000_000n,
        isHonored: false,
        lastFulfillmentYear: 21,
      },
      {
        obligationId: 'obl-004-b',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: false,
        lastFulfillmentYear: 21,
      },
    ],
    worldsGranted: ['world-pale-reach'],
  },
  // ΓöÇΓöÇ dynasty-celeste-rising (ARCH) holds greater-bonds ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-005',
    overlordDynastyId: 'dynasty-celeste-rising',
    vassalDynastyId: 'dynasty-vermillion-coast',
    tier: 'LESSER-DYNASTY',
    bondYear: 1,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-005-a',
        type: 'KALON_TITHE',
        annualValueMicro: 2_800_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-005-b',
        type: 'LABOR_LEVY',
        annualValueMicro: 1_200_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: ['world-vermillion-shelf'],
  },
  {
    bondId: 'bond-006',
    overlordDynastyId: 'dynasty-celeste-rising',
    vassalDynastyId: 'dynasty-golden-margin',
    tier: 'LESSER-DYNASTY',
    bondYear: 3,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-006-a',
        type: 'KALON_TITHE',
        annualValueMicro: 3_100_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-006-b',
        type: 'INTELLIGENCE_SHARING',
        annualValueMicro: 800_000_000n,
        isHonored: true,
        lastFulfillmentYear: 29,
      },
    ],
    worldsGranted: ['world-golden-strand', 'world-margin-delta'],
  },
  // ΓöÇΓöÇ dynasty-thornwall (GREATER) holds lesser-bonds ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-007',
    overlordDynastyId: 'dynasty-thornwall',
    vassalDynastyId: 'dynasty-ashen-meridian',
    tier: 'LESSER-DYNASTY',
    bondYear: 2,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-007-a',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 2_000_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-007-b',
        type: 'KALON_TITHE',
        annualValueMicro: 1_500_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: ['world-ashen-flats'],
  },
  {
    bondId: 'bond-008',
    overlordDynastyId: 'dynasty-thornwall',
    vassalDynastyId: 'dynasty-deep-current',
    tier: 'LESSER-DYNASTY',
    bondYear: 5,
    status: 'CONTESTED',
    obligations: [
      {
        obligationId: 'obl-008-a',
        type: 'LABOR_LEVY',
        annualValueMicro: 1_800_000_000n,
        isHonored: false,
        lastFulfillmentYear: 24,
      },
      {
        obligationId: 'obl-008-b',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: false,
        lastFulfillmentYear: 24,
      },
    ],
    worldsGranted: ['world-deep-channel'],
  },
  // ΓöÇΓöÇ Ascendancy-era bonds (now dissolved) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-009',
    overlordDynastyId: 'dynasty-ascendancy',
    vassalDynastyId: 'dynasty-pale-standard',
    tier: 'GREATER-DYNASTY',
    bondYear: 4,
    status: 'DISSOLVED',
    obligations: [
      {
        obligationId: 'obl-009-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: false,
        lastFulfillmentYear: 20,
      },
      {
        obligationId: 'obl-009-b',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 4_500_000_000n,
        isHonored: false,
        lastFulfillmentYear: 19,
      },
    ],
    worldsGranted: [],
  },
  {
    bondId: 'bond-010',
    overlordDynastyId: 'dynasty-ascendancy',
    vassalDynastyId: 'dynasty-ashen-meridian',
    tier: 'LESSER-DYNASTY',
    bondYear: 6,
    status: 'DISSOLVED',
    obligations: [
      {
        obligationId: 'obl-010-a',
        type: 'KALON_TITHE',
        annualValueMicro: 1_200_000_000n,
        isHonored: false,
        lastFulfillmentYear: 20,
      },
    ],
    worldsGranted: [],
  },
  {
    bondId: 'bond-011',
    overlordDynastyId: 'dynasty-ascendancy',
    vassalDynastyId: 'dynasty-vermillion-coast',
    tier: 'LESSER-DYNASTY',
    bondYear: 7,
    status: 'DISSOLVED',
    obligations: [
      {
        obligationId: 'obl-011-a',
        type: 'LABOR_LEVY',
        annualValueMicro: 900_000_000n,
        isHonored: false,
        lastFulfillmentYear: 21,
      },
    ],
    worldsGranted: [],
  },
  // ΓöÇΓöÇ dynasty-pale-standard sub-vassals (pre-dissolution) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-012',
    overlordDynastyId: 'dynasty-pale-standard',
    vassalDynastyId: 'dynasty-petitioner-olvane',
    tier: 'PETITIONER',
    bondYear: 10,
    status: 'DISSOLVED',
    obligations: [
      {
        obligationId: 'obl-012-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: false,
        lastFulfillmentYear: 20,
      },
    ],
    worldsGranted: [],
  },
  // ΓöÇΓöÇ dynasty-celeste-rising expanding network ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-013',
    overlordDynastyId: 'dynasty-celeste-rising',
    vassalDynastyId: 'dynasty-petitioner-veldris',
    tier: 'PETITIONER',
    bondYear: 28,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-013-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-013-b',
        type: 'INTELLIGENCE_SHARING',
        annualValueMicro: 300_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: [],
  },
  // ΓöÇΓöÇ dynasty-iron-meridian new lesser-vassals ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-014',
    overlordDynastyId: 'dynasty-iron-meridian',
    vassalDynastyId: 'dynasty-deep-current',
    tier: 'LESSER-DYNASTY',
    bondYear: 25,
    status: 'SUSPENDED',
    obligations: [
      {
        obligationId: 'obl-014-a',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 1_600_000_000n,
        isHonored: false,
        lastFulfillmentYear: 27,
      },
      {
        obligationId: 'obl-014-b',
        type: 'KALON_TITHE',
        annualValueMicro: 1_000_000_000n,
        isHonored: false,
        lastFulfillmentYear: 26,
      },
    ],
    worldsGranted: ['world-deep-channel-annex'],
  },
  // ΓöÇΓöÇ dynasty-golden-margin holds petitioners ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-015',
    overlordDynastyId: 'dynasty-golden-margin',
    vassalDynastyId: 'dynasty-petitioner-sannek',
    tier: 'PETITIONER',
    bondYear: 27,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-015-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-015-b',
        type: 'LABOR_LEVY',
        annualValueMicro: 250_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: [],
  },
  // ΓöÇΓöÇ dynasty-ashen-meridian holds petitioner ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-016',
    overlordDynastyId: 'dynasty-ashen-meridian',
    vassalDynastyId: 'dynasty-petitioner-crell',
    tier: 'PETITIONER',
    bondYear: 26,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-016-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: [],
  },
  // ΓöÇΓöÇ dynasty-vermillion-coast contested upward claim ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-017',
    overlordDynastyId: 'dynasty-celeste-rising',
    vassalDynastyId: 'dynasty-vermillion-coast',
    tier: 'LESSER-DYNASTY',
    bondYear: 23,
    status: 'CONTESTED',
    obligations: [
      {
        obligationId: 'obl-017-a',
        type: 'KALON_TITHE',
        annualValueMicro: 2_200_000_000n,
        isHonored: false,
        lastFulfillmentYear: 26,
      },
      {
        obligationId: 'obl-017-b',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 1_100_000_000n,
        isHonored: false,
        lastFulfillmentYear: 25,
      },
    ],
    worldsGranted: [],
  },
  // ΓöÇΓöÇ dynasty-first-light direct lesser grant ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-018',
    overlordDynastyId: 'dynasty-first-light',
    vassalDynastyId: 'dynasty-golden-margin',
    tier: 'LESSER-DYNASTY',
    bondYear: 15,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-018-a',
        type: 'INTELLIGENCE_SHARING',
        annualValueMicro: 2_000_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-018-b',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: ['world-golden-watch'],
  },
  // ΓöÇΓöÇ post-Suppression new bonds ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-019',
    overlordDynastyId: 'dynasty-iron-meridian',
    vassalDynastyId: 'dynasty-petitioner-orvael',
    tier: 'PETITIONER',
    bondYear: 29,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-019-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-019-b',
        type: 'LABOR_LEVY',
        annualValueMicro: 400_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: [],
  },
  {
    bondId: 'bond-020',
    overlordDynastyId: 'dynasty-thornwall',
    vassalDynastyId: 'dynasty-petitioner-mael',
    tier: 'PETITIONER',
    bondYear: 30,
    status: 'ACTIVE',
    obligations: [
      {
        obligationId: 'obl-020-a',
        type: 'LOYALTY_OATH',
        annualValueMicro: 0n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
      {
        obligationId: 'obl-020-b',
        type: 'MILITARY_SERVICE',
        annualValueMicro: 500_000_000n,
        isHonored: true,
        lastFulfillmentYear: 30,
      },
    ],
    worldsGranted: [],
  },
];

// ΓöÇΓöÇ Derived constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const TOTAL_FEUDAL_BONDS: number = FEUDAL_BONDS.length;

export const CONTESTED_BONDS_COUNT: number = FEUDAL_BONDS.filter(
  (b) => b.status === 'CONTESTED',
).length;

export const DISSOLVED_BONDS_COUNT: number = FEUDAL_BONDS.filter(
  (b) => b.status === 'DISSOLVED',
).length;

export const TOTAL_TITHE_ANNUAL_MICRO: bigint = FEUDAL_BONDS.filter(
  (b) => b.status === 'ACTIVE',
).reduce((sum, b) => {
  const bondTithe = b.obligations
    .filter((o) => o.type === 'KALON_TITHE')
    .reduce((s, o) => s + o.annualValueMicro, 0n);
  return sum + bondTithe;
}, 0n);

// ΓöÇΓöÇ Tier registry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const DYNASTY_TIERS: ReadonlyMap<string, FeudalTier> = new Map([
  ['dynasty-first-light', 'SOVEREIGN'],
  ['dynasty-iron-meridian', 'ARCH-DYNASTY'],
  ['dynasty-celeste-rising', 'ARCH-DYNASTY'],
  ['dynasty-thornwall', 'GREATER-DYNASTY'],
  ['dynasty-pale-standard', 'GREATER-DYNASTY'],
  ['dynasty-vermillion-coast', 'LESSER-DYNASTY'],
  ['dynasty-golden-margin', 'LESSER-DYNASTY'],
  ['dynasty-ashen-meridian', 'LESSER-DYNASTY'],
  ['dynasty-deep-current', 'LESSER-DYNASTY'],
  ['dynasty-petitioner-olvane', 'PETITIONER'],
  ['dynasty-petitioner-veldris', 'PETITIONER'],
  ['dynasty-petitioner-sannek', 'PETITIONER'],
  ['dynasty-petitioner-crell', 'PETITIONER'],
  ['dynasty-petitioner-orvael', 'PETITIONER'],
  ['dynasty-petitioner-mael', 'PETITIONER'],
]);

function resolveTier(dynastyId: string): FeudalTier {
  return DYNASTY_TIERS.get(dynastyId) ?? 'PETITIONER';
}

// ΓöÇΓöÇ Query functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getBond(id: string): FeudalBond | undefined {
  return FEUDAL_BONDS.find((b) => b.bondId === id);
}

export function getBondsByOverlord(dynastyId: string): readonly FeudalBond[] {
  return FEUDAL_BONDS.filter((b) => b.overlordDynastyId === dynastyId);
}

export function getBondsByVassal(dynastyId: string): readonly FeudalBond[] {
  return FEUDAL_BONDS.filter((b) => b.vassalDynastyId === dynastyId);
}

export function getContestedBonds(): readonly FeudalBond[] {
  return FEUDAL_BONDS.filter((b) => b.status === 'CONTESTED');
}

export function getDissolved(): readonly FeudalBond[] {
  return FEUDAL_BONDS.filter((b) => b.status === 'DISSOLVED');
}

function computeTotalTitheForBonds(bonds: readonly FeudalBond[]): bigint {
  return bonds.reduce((sum, b) => {
    const tithe = b.obligations
      .filter((o) => o.type === 'KALON_TITHE')
      .reduce((s, o) => s + o.annualValueMicro, 0n);
    return sum + tithe;
  }, 0n);
}

export function getDynastyFeudalProfile(dynastyId: string): DynastyFeudalProfile {
  const overlordBonds = getBondsByOverlord(dynastyId);
  const vassalBonds = getBondsByVassal(dynastyId);
  const activeTitheSource = overlordBonds.filter((b) => b.status === 'ACTIVE');
  const totalTitheMicro = computeTotalTitheForBonds(activeTitheSource);

  return {
    dynastyId,
    tier: resolveTier(dynastyId),
    overlordBonds,
    vassalBonds,
    totalTitheMicro,
  };
}

export function computeFeudalSummary(): FeudalSummary {
  const active = FEUDAL_BONDS.filter((b) => b.status === 'ACTIVE');
  const contested = FEUDAL_BONDS.filter((b) => b.status === 'CONTESTED');
  const dissolved = FEUDAL_BONDS.filter((b) => b.status === 'DISSOLVED');
  const suspended = FEUDAL_BONDS.filter((b) => b.status === 'SUSPENDED');
  const totalAnnualTitheMicro = computeTotalTitheForBonds(active);

  return {
    totalBonds: FEUDAL_BONDS.length,
    activeBonds: active.length,
    contestedBonds: contested.length,
    dissolvedBonds: dissolved.length,
    suspendedBonds: suspended.length,
    totalAnnualTitheMicro,
  };
}
