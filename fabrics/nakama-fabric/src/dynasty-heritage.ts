/**
 * Dynasty Heritage — Lineage tracking and inheritance rules.
 *
 * Tracks the lineage chains of dynasties, computes heritage bonuses
 * based on ancestor achievements, and manages inheritance rules for
 * passing on dynasty assets and titles when a dynasty transitions
 * states or a new dynasty is founded in a lineage.
 *
 * Heritage bonuses compound across generations with diminishing returns:
 *   - Generation 1 (parent): 100% of bonus value
 *   - Generation 2 (grandparent): 50%
 *   - Generation N: 1 / 2^(N-1) multiplier
 *
 * "Every dynasty stands on the shoulders of those who came before."
 */

// ─── Port Interfaces ─────────────────────────────────────────────────

export interface HeritageClockPort {
  readonly nowMicroseconds: () => number;
}

export interface HeritageIdGeneratorPort {
  readonly next: () => string;
}

export interface HeritageDeps {
  readonly clock: HeritageClockPort;
  readonly idGenerator: HeritageIdGeneratorPort;
}

// ─── Types ───────────────────────────────────────────────────────────

export type BonusCategory =
  | 'economic'
  | 'civic'
  | 'military'
  | 'cultural'
  | 'diplomatic'
  | 'exploration';

export type InheritanceRuleType =
  | 'eldest_heir'
  | 'assembly_appointed'
  | 'treasury_split'
  | 'auction';

export interface HeritageRecord {
  readonly heritageId: string;
  readonly dynastyId: string;
  readonly ancestorId: string;
  readonly generation: number;
  readonly achievementIds: ReadonlyArray<string>;
  readonly recordedAt: number;
}

export interface LineageChain {
  readonly dynastyId: string;
  readonly ancestors: ReadonlyArray<{ readonly dynastyId: string; readonly generation: number }>;
  readonly depth: number;
}

export interface HeritageBonus {
  readonly dynastyId: string;
  readonly category: BonusCategory;
  readonly rawValue: number;
  readonly effectiveValue: number;
  readonly sourceAncestorId: string;
  readonly generation: number;
}

export interface InheritanceRule {
  readonly ruleId: string;
  readonly dynastyId: string;
  readonly ruleType: InheritanceRuleType;
  readonly targetHeirs: ReadonlyArray<string>;
  readonly treasurySplitBps: ReadonlyArray<number>;
  readonly createdAt: number;
}

export interface InheritanceApplication {
  readonly ruleId: string;
  readonly dynastyId: string;
  readonly ruleType: InheritanceRuleType;
  readonly appliedHeirs: ReadonlyArray<string>;
  readonly appliedAt: number;
}

export interface HeritageStats {
  readonly totalRecords: number;
  readonly totalRules: number;
  readonly deepestLineage: number;
  readonly dynastiesWithHeritage: number;
}

// ─── Module Interface ─────────────────────────────────────────────────

export interface DynastyHeritageEngine {
  readonly recordHeritage: (params: RecordHeritageParams) => HeritageRecord | string;
  readonly computeBonus: (
    dynastyId: string,
    category: BonusCategory,
  ) => ReadonlyArray<HeritageBonus>;
  readonly getLineage: (dynastyId: string) => LineageChain;
  readonly setInheritanceRule: (params: SetRuleParams) => InheritanceRule | string;
  readonly applyInheritanceRules: (dynastyId: string) => InheritanceApplication | string;
  readonly getInheritanceRule: (dynastyId: string) => InheritanceRule | undefined;
  readonly getHeritageRecords: (dynastyId: string) => ReadonlyArray<HeritageRecord>;
  readonly getStats: () => HeritageStats;
}

export interface RecordHeritageParams {
  readonly dynastyId: string;
  readonly ancestorId: string;
  readonly generation: number;
  readonly achievementIds: ReadonlyArray<string>;
}

export interface SetRuleParams {
  readonly dynastyId: string;
  readonly ruleType: InheritanceRuleType;
  readonly targetHeirs: ReadonlyArray<string>;
  readonly treasurySplitBps?: ReadonlyArray<number>;
}

// ─── Bonus Lookup ─────────────────────────────────────────────────────

const ACHIEVEMENT_BONUS_MAP: Readonly<Record<string, { category: BonusCategory; value: number }>> =
  {
    'founding-world': { category: 'exploration', value: 10 },
    'survey-pioneer': { category: 'exploration', value: 8 },
    'civic-champion': { category: 'civic', value: 12 },
    'assembly-elder': { category: 'civic', value: 15 },
    'trade-magnate': { category: 'economic', value: 12 },
    'commons-benefactor': { category: 'economic', value: 10 },
    'peace-broker': { category: 'diplomatic', value: 14 },
    'cultural-patron': { category: 'cultural', value: 11 },
  };

// ─── State ────────────────────────────────────────────────────────────

interface HeritageState {
  readonly records: Map<string, HeritageRecord[]>;
  readonly rules: Map<string, InheritanceRule>;
  readonly ancestorIndex: Map<string, string[]>;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createDynastyHeritageEngine(deps: HeritageDeps): DynastyHeritageEngine {
  const state: HeritageState = {
    records: new Map(),
    rules: new Map(),
    ancestorIndex: new Map(),
  };

  return {
    recordHeritage: (params) => recordHeritage(state, deps, params),
    computeBonus: (dynastyId, category) => computeBonus(state, dynastyId, category),
    getLineage: (dynastyId) => getLineage(state, dynastyId),
    setInheritanceRule: (params) => setInheritanceRule(state, deps, params),
    applyInheritanceRules: (dynastyId) => applyInheritanceRules(state, deps, dynastyId),
    getInheritanceRule: (dynastyId) => state.rules.get(dynastyId),
    getHeritageRecords: (dynastyId) => state.records.get(dynastyId) ?? [],
    getStats: () => getStats(state),
  };
}

// ─── recordHeritage ───────────────────────────────────────────────────

function recordHeritage(
  state: HeritageState,
  deps: HeritageDeps,
  params: RecordHeritageParams,
): HeritageRecord | string {
  if (params.generation < 1) {
    return 'generation must be >= 1';
  }
  if (params.dynastyId === params.ancestorId) {
    return 'dynastyId and ancestorId must differ';
  }

  const record: HeritageRecord = {
    heritageId: deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    ancestorId: params.ancestorId,
    generation: params.generation,
    achievementIds: params.achievementIds,
    recordedAt: deps.clock.nowMicroseconds(),
  };

  const existing = state.records.get(params.dynastyId) ?? [];
  existing.push(record);
  state.records.set(params.dynastyId, existing);

  const ancestorDynasties = state.ancestorIndex.get(params.ancestorId) ?? [];
  ancestorDynasties.push(params.dynastyId);
  state.ancestorIndex.set(params.ancestorId, ancestorDynasties);

  return record;
}

// ─── computeBonus ─────────────────────────────────────────────────────

function computeBonus(
  state: HeritageState,
  dynastyId: string,
  category: BonusCategory,
): ReadonlyArray<HeritageBonus> {
  const records = state.records.get(dynastyId) ?? [];
  const bonuses: HeritageBonus[] = [];

  for (const record of records) {
    extractBonusesFromRecord(record, category, bonuses);
  }

  return bonuses;
}

function extractBonusesFromRecord(
  record: HeritageRecord,
  category: BonusCategory,
  bonuses: HeritageBonus[],
): void {
  const generationMultiplier = 1 / Math.pow(2, record.generation - 1);

  for (const achievementId of record.achievementIds) {
    const bonusInfo = ACHIEVEMENT_BONUS_MAP[achievementId];
    if (bonusInfo === undefined || bonusInfo.category !== category) {
      continue;
    }
    bonuses.push({
      dynastyId: record.dynastyId,
      category,
      rawValue: bonusInfo.value,
      effectiveValue: bonusInfo.value * generationMultiplier,
      sourceAncestorId: record.ancestorId,
      generation: record.generation,
    });
  }
}

// ─── getLineage ───────────────────────────────────────────────────────

function getLineage(state: HeritageState, dynastyId: string): LineageChain {
  const records = state.records.get(dynastyId) ?? [];
  const ancestors = records.map((r) => ({ dynastyId: r.ancestorId, generation: r.generation }));
  const maxDepth = ancestors.reduce((max, a) => Math.max(max, a.generation), 0);

  return { dynastyId, ancestors, depth: maxDepth };
}

// ─── setInheritanceRule ───────────────────────────────────────────────

function setInheritanceRule(
  state: HeritageState,
  deps: HeritageDeps,
  params: SetRuleParams,
): InheritanceRule | string {
  if (params.ruleType === 'treasury_split') {
    const splitError = validateTreasurySplit(params);
    if (splitError !== null) {
      return splitError;
    }
  }

  const rule: InheritanceRule = {
    ruleId: deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    ruleType: params.ruleType,
    targetHeirs: params.targetHeirs,
    treasurySplitBps: params.treasurySplitBps ?? [],
    createdAt: deps.clock.nowMicroseconds(),
  };

  state.rules.set(params.dynastyId, rule);
  return rule;
}

function validateTreasurySplit(params: SetRuleParams): string | null {
  const splitBps = params.treasurySplitBps ?? [];
  if (splitBps.length !== params.targetHeirs.length) {
    return 'treasurySplitBps length must match targetHeirs length';
  }
  const total = splitBps.reduce((sum, bps) => sum + bps, 0);
  if (total !== 10000) {
    return 'treasurySplitBps must sum to 10000 (100%)';
  }
  return null;
}

// ─── applyInheritanceRules ────────────────────────────────────────────

function applyInheritanceRules(
  state: HeritageState,
  deps: HeritageDeps,
  dynastyId: string,
): InheritanceApplication | string {
  const rule = state.rules.get(dynastyId);
  if (rule === undefined) {
    return 'no inheritance rule found for dynasty ' + dynastyId;
  }

  const appliedHeirs = selectHeirs(rule);

  return {
    ruleId: rule.ruleId,
    dynastyId,
    ruleType: rule.ruleType,
    appliedHeirs,
    appliedAt: deps.clock.nowMicroseconds(),
  };
}

function selectHeirs(rule: InheritanceRule): ReadonlyArray<string> {
  if (rule.ruleType === 'eldest_heir') {
    const first = rule.targetHeirs[0];
    return first !== undefined ? [first] : [];
  }
  return rule.targetHeirs;
}

// ─── getStats ─────────────────────────────────────────────────────────

function getStats(state: HeritageState): HeritageStats {
  let deepest = 0;
  for (const records of state.records.values()) {
    for (const r of records) {
      if (r.generation > deepest) {
        deepest = r.generation;
      }
    }
  }

  return {
    totalRecords: Array.from(state.records.values()).reduce((sum, r) => sum + r.length, 0),
    totalRules: state.rules.size,
    deepestLineage: deepest,
    dynastiesWithHeritage: state.records.size,
  };
}
