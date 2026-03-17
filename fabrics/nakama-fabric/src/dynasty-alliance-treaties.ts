/**
 * dynasty-alliance-treaties.ts ΓÇö Binding inter-dynasty treaty system.
 *
 * Dynasties may form bilateral or multilateral treaties spanning economic,
 * military, political, and chronicle dimensions. Each treaty carries a KALON
 * bond held in the commons as collateral against violation. The Assembly is
 * notified upon ratification of significant treaties.
 *
 * "No pact is stronger than the dynasty willing to break it, and no bond
 *  heavier than the commons that holds it." ΓÇö Architect Proverb
 */

// ΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface TreatyClock {
  nowIso(): string;
}

export interface TreatyIdGenerator {
  generate(): string;
}

export interface TreatyDeps {
  readonly clock: TreatyClock;
  readonly idGenerator: TreatyIdGenerator;
}

// ΓöÇΓöÇ Domain Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type TreatyType =
  | 'TRADE_COMPACT'
  | 'MUTUAL_DEFENSE'
  | 'SURVEY_PARTNERSHIP'
  | 'CHRONICLE_COVENANT'
  | 'NON_AGGRESSION'
  | 'RESOURCE_SHARING'
  | 'SUCCESSION_PACT';

export type TreatyStatus = 'PROPOSED' | 'ACTIVE' | 'SUSPENDED' | 'DISSOLVED' | 'EXPIRED';

export type TreatyViolationType = 'ECONOMIC' | 'MILITARY' | 'CHRONICLE' | 'POLITICAL';

export interface TreatyTerm {
  readonly termId: string;
  readonly description: string;
  readonly kalonObligationMicro: bigint;
  readonly isBreachable: boolean;
}

export interface TreatyRecord {
  readonly treatyId: string;
  readonly type: TreatyType;
  readonly status: TreatyStatus;
  readonly signatoryIds: ReadonlyArray<string>;
  readonly initiatorId: string;
  readonly ratifiedAtYear: number;
  readonly expiresAtYear: number | null;
  readonly terms: ReadonlyArray<TreatyTerm>;
  readonly totalKalonBondMicro: bigint;
  readonly assemblyNotified: boolean;
  readonly note: string;
}

export interface TreatyViolation {
  readonly violationId: string;
  readonly treatyId: string;
  readonly violatorId: string;
  readonly type: TreatyViolationType;
  readonly year: number;
  readonly penaltyMicro: bigint;
  readonly wasResolved: boolean;
}

// ΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface TreatyService {
  getTreaty(treatyId: string): TreatyRecord | undefined;
  getTreatiesByDynasty(dynastyId: string): ReadonlyArray<TreatyRecord>;
  getActiveTreaties(): ReadonlyArray<TreatyRecord>;
  getTreatiesByType(type: TreatyType): ReadonlyArray<TreatyRecord>;
  getViolationsForTreaty(treatyId: string): ReadonlyArray<TreatyViolation>;
  computeTotalBondsMicro(): bigint;
  getDissolutionsInYear(year: number): ReadonlyArray<TreatyRecord>;
}

// ΓöÇΓöÇ Canonical Dynasty IDs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// The three founding dynasties and later arrivals referenced by treaties.

const DYN_IRONFOLD = 'dynasty-ironfold';
const DYN_AURATIDE = 'dynasty-auratide';
const DYN_SELVARAN = 'dynasty-selvaran';
const DYN_THORNMERE = 'dynasty-thornmere';
const DYN_CASSIVORE = 'dynasty-cassivore';
const DYN_VELUNDRA = 'dynasty-velundra';
const DYN_PELLUCID = 'dynasty-pellucid';

// ΓöÇΓöÇ Canonical Term IDs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function makeTerm(
  termId: string,
  description: string,
  kalonObligationMicro: bigint,
  isBreachable: boolean,
): TreatyTerm {
  return { termId, description, kalonObligationMicro, isBreachable };
}

// ΓöÇΓöÇ Treaty Records ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const T01_FOUNDING_COMPACT: TreatyRecord = {
  treatyId: 'treaty-001',
  type: 'TRADE_COMPACT',
  status: 'ACTIVE',
  signatoryIds: [DYN_IRONFOLD, DYN_AURATIDE, DYN_SELVARAN],
  initiatorId: DYN_IRONFOLD,
  ratifiedAtYear: 5,
  expiresAtYear: null,
  terms: [
    makeTerm('t01-t01', 'Mutual tariff reduction on primary world exports', 5_000_000n, true),
    makeTerm('t01-t02', 'Shared access to founding world market nodes', 0n, true),
    makeTerm('t01-t03', 'Quarterly commons contribution: 50 KALON each', 50_000_000n, true),
  ],
  totalKalonBondMicro: 150_000_000n,
  assemblyNotified: true,
  note: 'The Founding Compact ΓÇö first multilateral trade agreement. Considered the economic constitution of early colonisation.',
};

const T02_IRON_TIDE_DEFENSE: TreatyRecord = {
  treatyId: 'treaty-002',
  type: 'MUTUAL_DEFENSE',
  status: 'SUSPENDED',
  signatoryIds: [DYN_IRONFOLD, DYN_AURATIDE],
  initiatorId: DYN_AURATIDE,
  ratifiedAtYear: 15,
  expiresAtYear: null,
  terms: [
    makeTerm('t02-t01', 'Military aid within 72 hours of declared attack', 0n, true),
    makeTerm('t02-t02', 'Annual joint readiness contribution: 200 KALON', 200_000_000n, true),
    makeTerm('t02-t03', 'Non-disclosure of combined fleet positioning', 0n, false),
  ],
  totalKalonBondMicro: 400_000_000n,
  assemblyNotified: true,
  note: 'Suspended in Year 45 during the Assembly Governance Crisis. Neither party has formally dissolved.',
};

const T03_SURVEY_FIRST_WAVE: TreatyRecord = {
  treatyId: 'treaty-003',
  type: 'SURVEY_PARTNERSHIP',
  status: 'EXPIRED',
  signatoryIds: [DYN_SELVARAN, DYN_THORNMERE],
  initiatorId: DYN_SELVARAN,
  ratifiedAtYear: 20,
  expiresAtYear: 35,
  terms: [
    makeTerm('t03-t01', 'Joint Survey Corps mission funding: 300 KALON total', 300_000_000n, true),
    makeTerm('t03-t02', 'Equal claim partition on discovered worlds', 0n, true),
  ],
  totalKalonBondMicro: 100_000_000n,
  assemblyNotified: false,
  note: 'First-wave survey partnership. Produced three habitable world discoveries. Expired on schedule Year 35.',
};

const T04_CHRONICLE_FIRST: TreatyRecord = {
  treatyId: 'treaty-004',
  type: 'CHRONICLE_COVENANT',
  status: 'ACTIVE',
  signatoryIds: [DYN_IRONFOLD, DYN_SELVARAN, DYN_CASSIVORE],
  initiatorId: DYN_SELVARAN,
  ratifiedAtYear: 25,
  expiresAtYear: null,
  terms: [
    makeTerm(
      't04-t01',
      'Submit Chronicle entries to Remembrance within 30 days of major events',
      0n,
      true,
    ),
    makeTerm('t04-t02', 'No redaction of chronicle entries without Assembly review', 0n, false),
    makeTerm(
      't04-t03',
      'Annual chronicle integrity contribution: 20 KALON each',
      20_000_000n,
      true,
    ),
  ],
  totalKalonBondMicro: 60_000_000n,
  assemblyNotified: true,
  note: 'Chronicle fidelity covenant bound to the Remembrance faction.',
};

const T05_NONAGGRESSION_CASSIVORE_THORNMERE: TreatyRecord = {
  treatyId: 'treaty-005',
  type: 'NON_AGGRESSION',
  status: 'DISSOLVED',
  signatoryIds: [DYN_CASSIVORE, DYN_THORNMERE],
  initiatorId: DYN_CASSIVORE,
  ratifiedAtYear: 30,
  expiresAtYear: 60,
  terms: [
    makeTerm('t05-t01', 'No hostile Survey Corps incursions into counterpart territory', 0n, true),
    makeTerm(
      't05-t02',
      'Escalation notice of 14 days before any formal grievance filing',
      0n,
      false,
    ),
  ],
  totalKalonBondMicro: 50_000_000n,
  assemblyNotified: false,
  note: 'Dissolved early in Year 52 after Thornmere orchestrated proxy interference on a Cassivore survey ship.',
};

const T06_SURVEY_SECOND_WAVE: TreatyRecord = {
  treatyId: 'treaty-006',
  type: 'SURVEY_PARTNERSHIP',
  status: 'ACTIVE',
  signatoryIds: [DYN_AURATIDE, DYN_VELUNDRA],
  initiatorId: DYN_VELUNDRA,
  ratifiedAtYear: 35,
  expiresAtYear: 75,
  terms: [
    makeTerm('t06-t01', 'Joint crew quotas: 40/60 split Velundra/Auratide', 0n, true),
    makeTerm('t06-t02', 'Survey hazard insurance pool: 500 KALON combined', 500_000_000n, true),
  ],
  totalKalonBondMicro: 200_000_000n,
  assemblyNotified: true,
  note: 'Second-wave survey pact with Velundra, who joined the Loom at Year 33.',
};

const T07_RESOURCE_SHARING_PELLUCID: TreatyRecord = {
  treatyId: 'treaty-007',
  type: 'RESOURCE_SHARING',
  status: 'ACTIVE',
  signatoryIds: [DYN_PELLUCID, DYN_IRONFOLD],
  initiatorId: DYN_PELLUCID,
  ratifiedAtYear: 40,
  expiresAtYear: 80,
  terms: [
    makeTerm('t07-t01', 'Pellucid grants Ironfold access to Zeta-7 extraction zone', 0n, false),
    makeTerm(
      't07-t02',
      'Ironfold transfers 10 KALON/year to Pellucid as access fee',
      10_000_000n,
      true,
    ),
    makeTerm('t07-t03', 'Shared environmental restoration obligation', 0n, true),
  ],
  totalKalonBondMicro: 80_000_000n,
  assemblyNotified: false,
  note: 'Access to rare isotopes on Zeta-7 in exchange for annual KALON transfer.',
};

const T08_DEFENSE_QUADRANT_PACT: TreatyRecord = {
  treatyId: 'treaty-008',
  type: 'MUTUAL_DEFENSE',
  status: 'ACTIVE',
  signatoryIds: [DYN_SELVARAN, DYN_VELUNDRA, DYN_PELLUCID],
  initiatorId: DYN_SELVARAN,
  ratifiedAtYear: 48,
  expiresAtYear: null,
  terms: [
    makeTerm('t08-t01', 'Respond to Ascendancy incursions within 96 hours', 0n, true),
    makeTerm('t08-t02', 'Quadrant readiness fund: 150 KALON each per year', 150_000_000n, true),
    makeTerm('t08-t03', 'Shared intelligence on Ascendancy movement', 0n, false),
  ],
  totalKalonBondMicro: 450_000_000n,
  assemblyNotified: true,
  note: 'Formed in Year 48 as post-crisis defense restructuring. Replaced the suspended T02.',
};

const T09_CHRONICLE_COVENANT_EXPANDED: TreatyRecord = {
  treatyId: 'treaty-009',
  type: 'CHRONICLE_COVENANT',
  status: 'ACTIVE',
  signatoryIds: [DYN_AURATIDE, DYN_THORNMERE, DYN_VELUNDRA],
  initiatorId: DYN_AURATIDE,
  ratifiedAtYear: 55,
  expiresAtYear: null,
  terms: [
    makeTerm('t09-t01', 'Trilateral chronicle synchronisation every 5 years', 0n, false),
    makeTerm(
      't09-t02',
      'Each dynasty contributes 15 KALON/year to archive upkeep',
      15_000_000n,
      true,
    ),
    makeTerm('t09-t03', 'No selective chronicle submissions during Assembly elections', 0n, true),
  ],
  totalKalonBondMicro: 90_000_000n,
  assemblyNotified: true,
  note: 'Expanded Remembrance covenant following the archival disruptions of Year 50.',
};

const T10_SURVEY_THIRD_WAVE: TreatyRecord = {
  treatyId: 'treaty-010',
  type: 'SURVEY_PARTNERSHIP',
  status: 'ACTIVE',
  signatoryIds: [DYN_CASSIVORE, DYN_PELLUCID, DYN_IRONFOLD],
  initiatorId: DYN_CASSIVORE,
  ratifiedAtYear: 55,
  expiresAtYear: 100,
  terms: [
    makeTerm('t10-t01', 'Equal thirds claim partition on undiscovered worlds', 0n, true),
    makeTerm('t10-t02', 'Survey Corps crew pool: 600 KALON combined', 600_000_000n, true),
    makeTerm('t10-t03', 'Cassivore holds navigational data custody', 0n, false),
  ],
  totalKalonBondMicro: 300_000_000n,
  assemblyNotified: true,
  note: 'Third-wave survey pact. Cassivore leads following their probe network expansion.',
};

const T11_TRADE_COMPACT_VELUNDRA: TreatyRecord = {
  treatyId: 'treaty-011',
  type: 'TRADE_COMPACT',
  status: 'ACTIVE',
  signatoryIds: [DYN_VELUNDRA, DYN_AURATIDE, DYN_THORNMERE],
  initiatorId: DYN_VELUNDRA,
  ratifiedAtYear: 62,
  expiresAtYear: null,
  terms: [
    makeTerm('t11-t01', 'Shared trade route access through Velundra corridor', 0n, true),
    makeTerm('t11-t02', 'Quarterly settlement: 75 KALON each', 75_000_000n, true),
    makeTerm('t11-t03', 'Thornmere provides customs facilitation services', 0n, false),
  ],
  totalKalonBondMicro: 225_000_000n,
  assemblyNotified: false,
  note: 'Velundra corridor opens faster transit between the outer survey zone and core worlds.',
};

const T12_SUCCESSION_PACT_FOUNDING: TreatyRecord = {
  treatyId: 'treaty-012',
  type: 'SUCCESSION_PACT',
  status: 'ACTIVE',
  signatoryIds: [DYN_IRONFOLD, DYN_AURATIDE, DYN_SELVARAN, DYN_CASSIVORE],
  initiatorId: DYN_IRONFOLD,
  ratifiedAtYear: 70,
  expiresAtYear: null,
  terms: [
    makeTerm(
      't12-t01',
      'Extinct dynasty assets distributed equally among surviving signatories',
      0n,
      false,
    ),
    makeTerm(
      't12-t02',
      'Surviving signatories bear chronicle obligations of extinct dynasty for 10 years',
      0n,
      true,
    ),
    makeTerm('t12-t03', 'Extinction bond held: 1000 KALON per signatory', 1_000_000_000n, true),
  ],
  totalKalonBondMicro: 4_000_000_000n,
  assemblyNotified: true,
  note: 'Succession pact covering extinction protocol. The 1000 KALON bond per dynasty is the largest in treaty history.',
};

const T13_RESOURCE_SHARING_THORNMERE_CASSIVORE: TreatyRecord = {
  treatyId: 'treaty-013',
  type: 'RESOURCE_SHARING',
  status: 'ACTIVE',
  signatoryIds: [DYN_THORNMERE, DYN_CASSIVORE],
  initiatorId: DYN_THORNMERE,
  ratifiedAtYear: 78,
  expiresAtYear: 110,
  terms: [
    makeTerm('t13-t01', 'Cassivore grants Thornmere mining access on Epsilon-3', 0n, false),
    makeTerm('t13-t02', 'Thornmere pays 25 KALON/year resource extraction fee', 25_000_000n, true),
  ],
  totalKalonBondMicro: 100_000_000n,
  assemblyNotified: false,
  note: 'Epsilon-3 rare mineral agreement. Replaces informal arrangement that preceded it.',
};

const T14_NON_AGGRESSION_BROAD: TreatyRecord = {
  treatyId: 'treaty-014',
  type: 'NON_AGGRESSION',
  status: 'ACTIVE',
  signatoryIds: [
    DYN_IRONFOLD,
    DYN_AURATIDE,
    DYN_SELVARAN,
    DYN_THORNMERE,
    DYN_CASSIVORE,
    DYN_VELUNDRA,
    DYN_PELLUCID,
  ],
  initiatorId: DYN_SELVARAN,
  ratifiedAtYear: 90,
  expiresAtYear: null,
  terms: [
    makeTerm('t14-t01', 'No hostile military action between any signatory dynasties', 0n, true),
    makeTerm('t14-t02', 'Mandatory mediation before Assembly referral', 0n, false),
    makeTerm('t14-t03', 'Annual peace bond: 30 KALON each', 30_000_000n, true),
  ],
  totalKalonBondMicro: 210_000_000n,
  assemblyNotified: true,
  note: 'The Grand Non-Aggression Compact. First treaty signed by all seven dynasties simultaneously.',
};

const T15_CHRONICLE_COVENANT_SUCCESSION: TreatyRecord = {
  treatyId: 'treaty-015',
  type: 'CHRONICLE_COVENANT',
  status: 'ACTIVE',
  signatoryIds: [DYN_IRONFOLD, DYN_SELVARAN, DYN_CASSIVORE, DYN_VELUNDRA, DYN_PELLUCID],
  initiatorId: DYN_CASSIVORE,
  ratifiedAtYear: 100,
  expiresAtYear: null,
  terms: [
    makeTerm('t15-t01', 'Chronicle of extinction events must be submitted within 7 days', 0n, true),
    makeTerm(
      't15-t02',
      'Signatories may not redact succession-related chronicle entries',
      0n,
      false,
    ),
    makeTerm('t15-t03', 'Annual covenant bond: 40 KALON each', 40_000_000n, true),
  ],
  totalKalonBondMicro: 200_000_000n,
  assemblyNotified: true,
  note: 'Chronicle covenant specifically governing succession and extinction records. Companion to T12.',
};

// ΓöÇΓöÇ Treaty Violations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const V01: TreatyViolation = {
  violationId: 'violation-001',
  treatyId: 'treaty-002',
  violatorId: DYN_IRONFOLD,
  type: 'MILITARY',
  year: 42,
  penaltyMicro: 80_000_000n,
  wasResolved: false,
};

const V02: TreatyViolation = {
  violationId: 'violation-002',
  treatyId: 'treaty-005',
  violatorId: DYN_THORNMERE,
  type: 'POLITICAL',
  year: 51,
  penaltyMicro: 25_000_000n,
  wasResolved: false,
};

const V03: TreatyViolation = {
  violationId: 'violation-003',
  treatyId: 'treaty-005',
  violatorId: DYN_THORNMERE,
  type: 'MILITARY',
  year: 52,
  penaltyMicro: 50_000_000n,
  wasResolved: false,
};

const V04: TreatyViolation = {
  violationId: 'violation-004',
  treatyId: 'treaty-004',
  violatorId: DYN_CASSIVORE,
  type: 'CHRONICLE',
  year: 58,
  penaltyMicro: 20_000_000n,
  wasResolved: true,
};

const V05: TreatyViolation = {
  violationId: 'violation-005',
  treatyId: 'treaty-007',
  violatorId: DYN_IRONFOLD,
  type: 'ECONOMIC',
  year: 65,
  penaltyMicro: 10_000_000n,
  wasResolved: true,
};

const V06: TreatyViolation = {
  violationId: 'violation-006',
  treatyId: 'treaty-009',
  violatorId: DYN_THORNMERE,
  type: 'CHRONICLE',
  year: 72,
  penaltyMicro: 15_000_000n,
  wasResolved: true,
};

const V07: TreatyViolation = {
  violationId: 'violation-007',
  treatyId: 'treaty-014',
  violatorId: DYN_CASSIVORE,
  type: 'POLITICAL',
  year: 95,
  penaltyMicro: 30_000_000n,
  wasResolved: false,
};

const V08: TreatyViolation = {
  violationId: 'violation-008',
  treatyId: 'treaty-011',
  violatorId: DYN_AURATIDE,
  type: 'ECONOMIC',
  year: 98,
  penaltyMicro: 75_000_000n,
  wasResolved: false,
};

// ΓöÇΓöÇ Canonical Exports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const TREATY_RECORDS: ReadonlyArray<TreatyRecord> = [
  T01_FOUNDING_COMPACT,
  T02_IRON_TIDE_DEFENSE,
  T03_SURVEY_FIRST_WAVE,
  T04_CHRONICLE_FIRST,
  T05_NONAGGRESSION_CASSIVORE_THORNMERE,
  T06_SURVEY_SECOND_WAVE,
  T07_RESOURCE_SHARING_PELLUCID,
  T08_DEFENSE_QUADRANT_PACT,
  T09_CHRONICLE_COVENANT_EXPANDED,
  T10_SURVEY_THIRD_WAVE,
  T11_TRADE_COMPACT_VELUNDRA,
  T12_SUCCESSION_PACT_FOUNDING,
  T13_RESOURCE_SHARING_THORNMERE_CASSIVORE,
  T14_NON_AGGRESSION_BROAD,
  T15_CHRONICLE_COVENANT_SUCCESSION,
];

export const TREATY_VIOLATIONS: ReadonlyArray<TreatyViolation> = [
  V01,
  V02,
  V03,
  V04,
  V05,
  V06,
  V07,
  V08,
];

export const ACTIVE_TREATY_COUNT: number = TREATY_RECORDS.filter(
  (t) => t.status === 'ACTIVE',
).length;

export const TOTAL_BOND_MICRO: bigint = TREATY_RECORDS.reduce(
  (sum, t) => sum + t.totalKalonBondMicro,
  0n,
);

// ΓöÇΓöÇ Service Implementation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface TreatyState {
  readonly treaties: ReadonlyMap<string, TreatyRecord>;
  readonly violations: ReadonlyArray<TreatyViolation>;
}

function buildTreatyIndex(records: ReadonlyArray<TreatyRecord>): ReadonlyMap<string, TreatyRecord> {
  const map = new Map<string, TreatyRecord>();
  for (const treaty of records) {
    map.set(treaty.treatyId, treaty);
  }
  return map;
}

function getTreatyImpl(state: TreatyState, treatyId: string): TreatyRecord | undefined {
  return state.treaties.get(treatyId);
}

function getTreatiesByDynastyImpl(
  state: TreatyState,
  dynastyId: string,
): ReadonlyArray<TreatyRecord> {
  const result: TreatyRecord[] = [];
  for (const treaty of state.treaties.values()) {
    if (treaty.signatoryIds.includes(dynastyId)) {
      result.push(treaty);
    }
  }
  return result;
}

function getActiveTreatiesImpl(state: TreatyState): ReadonlyArray<TreatyRecord> {
  const result: TreatyRecord[] = [];
  for (const treaty of state.treaties.values()) {
    if (treaty.status === 'ACTIVE') result.push(treaty);
  }
  return result;
}

function getTreatiesByTypeImpl(state: TreatyState, type: TreatyType): ReadonlyArray<TreatyRecord> {
  const result: TreatyRecord[] = [];
  for (const treaty of state.treaties.values()) {
    if (treaty.type === type) result.push(treaty);
  }
  return result;
}

function getViolationsForTreatyImpl(
  state: TreatyState,
  treatyId: string,
): ReadonlyArray<TreatyViolation> {
  return state.violations.filter((v) => v.treatyId === treatyId);
}

function computeTotalBondsMicroImpl(state: TreatyState): bigint {
  let total = 0n;
  for (const treaty of state.treaties.values()) {
    total += treaty.totalKalonBondMicro;
  }
  return total;
}

function getDissolutionsInYearImpl(state: TreatyState, year: number): ReadonlyArray<TreatyRecord> {
  const dissolved: TreatyRecord[] = [];
  for (const treaty of state.treaties.values()) {
    if (treaty.status !== 'DISSOLVED') continue;
    const violations = getViolationsForTreatyImpl(state, treaty.treatyId);
    const hasViolationInYear = violations.some((v) => v.year === year);
    const expiredInYear = treaty.expiresAtYear === year;
    if (hasViolationInYear || expiredInYear) dissolved.push(treaty);
  }
  return dissolved;
}

export function createTreatyService(deps: TreatyDeps): TreatyService {
  void deps; // deps reserved for future runtime treaty creation
  const state: TreatyState = {
    treaties: buildTreatyIndex(TREATY_RECORDS),
    violations: TREATY_VIOLATIONS,
  };

  return {
    getTreaty: (id) => getTreatyImpl(state, id),
    getTreatiesByDynasty: (id) => getTreatiesByDynastyImpl(state, id),
    getActiveTreaties: () => getActiveTreatiesImpl(state),
    getTreatiesByType: (type) => getTreatiesByTypeImpl(state, type),
    getViolationsForTreaty: (id) => getViolationsForTreatyImpl(state, id),
    computeTotalBondsMicro: () => computeTotalBondsMicroImpl(state),
    getDissolutionsInYear: (year) => getDissolutionsInYearImpl(state, year),
  };
}
