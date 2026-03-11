/**
 * Tax Collection — Progressive KALON tax system with commons fund routing.
 *
 * Bible v1.1: The Assembly manages wealth redistribution through progressive
 * taxation. Tax brackets operate on balances in micro-KALON (10^6 precision).
 * All tax collected routes to the Commons Fund for UBK and public works.
 *
 * Tax Brackets (on assessed KALON balance):
 *   0 – 1,000 KALON:      2%  (2,000  in 0.01 bps = 200 bps)
 *   1,000 – 10,000:        5%
 *   10,000 – 100,000:     10%
 *   100,000+:             15%
 *
 * All amounts stored and computed in micro-KALON (bigint).
 * 1 KALON = 1_000_000n micro-KALON.
 *
 * "A dynasty is measured not by what it hoards, but by what it builds."
 */

// ─── Port Interfaces ─────────────────────────────────────────────────

export interface TaxClockPort {
  readonly nowMicroseconds: () => number;
}

export interface TaxIdGeneratorPort {
  readonly next: () => string;
}

export interface TaxDeps {
  readonly clock: TaxClockPort;
  readonly idGenerator: TaxIdGeneratorPort;
}

// ─── Constants ────────────────────────────────────────────────────────

export const MICRO_KALON = 1_000_000n;

// Bracket thresholds in micro-KALON
export const BRACKET_THRESHOLDS = {
  T1_MAX: 1_000n * MICRO_KALON, // 1,000 KALON
  T2_MAX: 10_000n * MICRO_KALON, // 10,000 KALON
  T3_MAX: 100_000n * MICRO_KALON, // 100,000 KALON
} as const;

// Basis points (100 bps = 1%)
export const BRACKET_RATES_BPS = {
  T1: 200n, // 2%
  T2: 500n, // 5%
  T3: 1000n, // 10%
  T4: 1500n, // 15%
} as const;

const BPS_DIVISOR = 10_000n;

// ─── Types ───────────────────────────────────────────────────────────

export interface TaxBracket {
  readonly label: string;
  readonly floorMicroKalon: bigint;
  readonly ceilingMicroKalon: bigint | null;
  readonly rateBps: bigint;
}

export interface TaxAssessment {
  readonly assessmentId: string;
  readonly dynastyId: string;
  readonly assessedBalanceMicroKalon: bigint;
  readonly bracketBreakdown: ReadonlyArray<BracketContribution>;
  readonly totalTaxMicroKalon: bigint;
  readonly effectiveRateBps: bigint;
  readonly assessedAt: number;
}

export interface BracketContribution {
  readonly bracketLabel: string;
  readonly taxableAmountMicroKalon: bigint;
  readonly taxMicroKalon: bigint;
  readonly rateBps: bigint;
}

export interface TaxCollectionResult {
  readonly collectionId: string;
  readonly dynastyId: string;
  readonly assessmentId: string;
  readonly collectedMicroKalon: bigint;
  readonly newBalanceMicroKalon: bigint;
  readonly commonsFundMicroKalon: bigint;
  readonly collectedAt: number;
}

export interface TaxRollEntry {
  readonly dynastyId: string;
  readonly totalAssessedMicroKalon: bigint;
  readonly totalCollectedMicroKalon: bigint;
  readonly assessmentCount: number;
  readonly lastAssessedAt: number;
}

export interface TaxRoll {
  readonly entries: ReadonlyArray<TaxRollEntry>;
  readonly totalCollectedMicroKalon: bigint;
  readonly totalDynasties: number;
  readonly generatedAt: number;
}

// ─── Module Interface ─────────────────────────────────────────────────

export interface TaxCollectionEngine {
  readonly assessTax: (dynastyId: string, balanceMicroKalon: bigint) => TaxAssessment | string;
  readonly collectTax: (
    dynastyId: string,
    currentBalanceMicroKalon: bigint,
  ) => TaxCollectionResult | string;
  readonly getTaxRoll: () => TaxRoll;
  readonly getEffectiveRate: (balanceMicroKalon: bigint) => bigint;
  readonly getAssessment: (assessmentId: string) => TaxAssessment | undefined;
  readonly getCollectionHistory: (dynastyId: string) => ReadonlyArray<TaxCollectionResult>;
  readonly commonsFundTotal: () => bigint;
}

// ─── State ────────────────────────────────────────────────────────────

interface TaxState {
  readonly assessments: Map<string, TaxAssessment>;
  readonly collections: Map<string, TaxCollectionResult[]>;
  readonly rollByDynasty: Map<string, TaxRollEntry>;
  commonsFund: bigint;
}

// ─── Bracket Definitions ──────────────────────────────────────────────

const TAX_BRACKETS: ReadonlyArray<TaxBracket> = [
  {
    label: 'subsistence',
    floorMicroKalon: 0n,
    ceilingMicroKalon: BRACKET_THRESHOLDS.T1_MAX,
    rateBps: BRACKET_RATES_BPS.T1,
  },
  {
    label: 'commerce',
    floorMicroKalon: BRACKET_THRESHOLDS.T1_MAX,
    ceilingMicroKalon: BRACKET_THRESHOLDS.T2_MAX,
    rateBps: BRACKET_RATES_BPS.T2,
  },
  {
    label: 'prosperity',
    floorMicroKalon: BRACKET_THRESHOLDS.T2_MAX,
    ceilingMicroKalon: BRACKET_THRESHOLDS.T3_MAX,
    rateBps: BRACKET_RATES_BPS.T3,
  },
  {
    label: 'concentration',
    floorMicroKalon: BRACKET_THRESHOLDS.T3_MAX,
    ceilingMicroKalon: null,
    rateBps: BRACKET_RATES_BPS.T4,
  },
];

// ─── Factory ─────────────────────────────────────────────────────────

export function createTaxCollectionEngine(deps: TaxDeps): TaxCollectionEngine {
  const state: TaxState = {
    assessments: new Map(),
    collections: new Map(),
    rollByDynasty: new Map(),
    commonsFund: 0n,
  };

  return {
    assessTax: (dynastyId, balance) => assessTax(state, deps, dynastyId, balance),
    collectTax: (dynastyId, balance) => collectTax(state, deps, dynastyId, balance),
    getTaxRoll: () => getTaxRoll(state, deps),
    getEffectiveRate: (balance) => getEffectiveRate(balance),
    getAssessment: (assessmentId) => state.assessments.get(assessmentId),
    getCollectionHistory: (dynastyId) => state.collections.get(dynastyId) ?? [],
    commonsFundTotal: () => state.commonsFund,
  };
}

// ─── assessTax ────────────────────────────────────────────────────────

function assessTax(
  state: TaxState,
  deps: TaxDeps,
  dynastyId: string,
  balanceMicroKalon: bigint,
): TaxAssessment | string {
  if (balanceMicroKalon < 0n) {
    return 'balance cannot be negative';
  }

  const breakdown = computeBracketBreakdown(balanceMicroKalon);
  const totalTax = breakdown.reduce((sum, b) => sum + b.taxMicroKalon, 0n);
  const effectiveRate = balanceMicroKalon > 0n ? (totalTax * BPS_DIVISOR) / balanceMicroKalon : 0n;

  const assessment: TaxAssessment = {
    assessmentId: deps.idGenerator.next(),
    dynastyId,
    assessedBalanceMicroKalon: balanceMicroKalon,
    bracketBreakdown: breakdown,
    totalTaxMicroKalon: totalTax,
    effectiveRateBps: effectiveRate,
    assessedAt: deps.clock.nowMicroseconds(),
  };

  state.assessments.set(assessment.assessmentId, assessment);
  return assessment;
}

function computeBracketBreakdown(balanceMicroKalon: bigint): ReadonlyArray<BracketContribution> {
  const contributions: BracketContribution[] = [];
  let remaining = balanceMicroKalon;

  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0n) {
      break;
    }
    const contribution = computeBracketContribution(bracket, remaining);
    if (contribution.taxableAmountMicroKalon > 0n) {
      contributions.push(contribution);
    }
    remaining -= contribution.taxableAmountMicroKalon;
  }

  return contributions;
}

function computeBracketContribution(bracket: TaxBracket, remaining: bigint): BracketContribution {
  const bracketSize =
    bracket.ceilingMicroKalon !== null
      ? bracket.ceilingMicroKalon - bracket.floorMicroKalon
      : remaining;
  const taxable = remaining > bracketSize ? bracketSize : remaining;
  const tax = (taxable * bracket.rateBps) / BPS_DIVISOR;

  return {
    bracketLabel: bracket.label,
    taxableAmountMicroKalon: taxable,
    taxMicroKalon: tax,
    rateBps: bracket.rateBps,
  };
}

// ─── collectTax ───────────────────────────────────────────────────────

function collectTax(
  state: TaxState,
  deps: TaxDeps,
  dynastyId: string,
  currentBalanceMicroKalon: bigint,
): TaxCollectionResult | string {
  if (currentBalanceMicroKalon < 0n) {
    return 'balance cannot be negative';
  }

  const assessmentResult = assessTax(state, deps, dynastyId, currentBalanceMicroKalon);
  if (typeof assessmentResult === 'string') {
    return assessmentResult;
  }

  const newBalance = currentBalanceMicroKalon - assessmentResult.totalTaxMicroKalon;
  state.commonsFund += assessmentResult.totalTaxMicroKalon;

  const collection: TaxCollectionResult = {
    collectionId: deps.idGenerator.next(),
    dynastyId,
    assessmentId: assessmentResult.assessmentId,
    collectedMicroKalon: assessmentResult.totalTaxMicroKalon,
    newBalanceMicroKalon: newBalance,
    commonsFundMicroKalon: state.commonsFund,
    collectedAt: deps.clock.nowMicroseconds(),
  };

  updateTaxRoll(state, collection, assessmentResult);

  const history = state.collections.get(dynastyId) ?? [];
  history.push(collection);
  state.collections.set(dynastyId, history);

  return collection;
}

function updateTaxRoll(
  state: TaxState,
  collection: TaxCollectionResult,
  assessment: TaxAssessment,
): void {
  const existing = state.rollByDynasty.get(collection.dynastyId);
  const updated: TaxRollEntry = {
    dynastyId: collection.dynastyId,
    totalAssessedMicroKalon:
      (existing?.totalAssessedMicroKalon ?? 0n) + assessment.assessedBalanceMicroKalon,
    totalCollectedMicroKalon:
      (existing?.totalCollectedMicroKalon ?? 0n) + collection.collectedMicroKalon,
    assessmentCount: (existing?.assessmentCount ?? 0) + 1,
    lastAssessedAt: assessment.assessedAt,
  };
  state.rollByDynasty.set(collection.dynastyId, updated);
}

// ─── getTaxRoll ───────────────────────────────────────────────────────

function getTaxRoll(state: TaxState, deps: TaxDeps): TaxRoll {
  const entries = Array.from(state.rollByDynasty.values());
  const totalCollected = entries.reduce((sum, e) => sum + e.totalCollectedMicroKalon, 0n);

  return {
    entries,
    totalCollectedMicroKalon: totalCollected,
    totalDynasties: entries.length,
    generatedAt: deps.clock.nowMicroseconds(),
  };
}

// ─── getEffectiveRate ─────────────────────────────────────────────────

function getEffectiveRate(balanceMicroKalon: bigint): bigint {
  if (balanceMicroKalon <= 0n) {
    return 0n;
  }
  const breakdown = computeBracketBreakdown(balanceMicroKalon);
  const totalTax = breakdown.reduce((sum, b) => sum + b.taxMicroKalon, 0n);
  return (totalTax * BPS_DIVISOR) / balanceMicroKalon;
}
