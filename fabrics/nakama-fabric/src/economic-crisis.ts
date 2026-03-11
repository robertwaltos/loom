/**
 * Economic Crisis System — Monitor macroeconomic indicators and crisis management.
 *
 * Tracks key economic indicators (inflation, unemployment, trade deficit, debt-to-GDP).
 * When multiple indicators breach thresholds simultaneously, triggers crisis phases.
 * Crisis phases: WATCH → WARNING → CRISIS → DEPRESSION → RECOVERY
 *
 * Interventions reduce crisis severity and accelerate recovery.
 * All rates stored as numbers (0.0-1.0 for percentages as decimals).
 */

export type CrisisPhase = 'STABLE' | 'WATCH' | 'WARNING' | 'CRISIS' | 'DEPRESSION' | 'RECOVERY';

export type IndicatorType =
  | 'INFLATION_RATE'
  | 'UNEMPLOYMENT_RATE'
  | 'TRADE_DEFICIT_RATIO'
  | 'DEBT_TO_GDP_RATIO'
  | 'CONSUMER_CONFIDENCE';

export type InterventionType =
  | 'MONETARY_EASING'
  | 'FISCAL_STIMULUS'
  | 'TRADE_POLICY_REFORM'
  | 'DEBT_RESTRUCTURING'
  | 'EMERGENCY_RELIEF';

export type WorldId = string;

export interface EconomicIndicator {
  readonly indicatorType: IndicatorType;
  readonly worldId: WorldId;
  readonly currentValue: number;
  readonly threshold: number;
  readonly breached: boolean;
  readonly lastUpdated: bigint;
}

export interface CrisisTrigger {
  readonly triggerId: string;
  readonly worldId: WorldId;
  readonly breachedIndicators: ReadonlyArray<IndicatorType>;
  readonly crisisScore: number;
  readonly phase: CrisisPhase;
  readonly triggeredAt: bigint;
}

export interface Intervention {
  readonly interventionId: string;
  readonly worldId: WorldId;
  readonly interventionType: InterventionType;
  readonly severityReduction: number;
  readonly appliedAt: bigint;
}

export interface MacroReport {
  readonly worldId: WorldId;
  readonly currentPhase: CrisisPhase;
  readonly crisisScore: number;
  readonly breachedCount: number;
  readonly indicators: ReadonlyArray<EconomicIndicator>;
  readonly activeInterventions: number;
  readonly generatedAt: bigint;
}

export interface CrisisHistory {
  readonly worldId: WorldId;
  readonly triggers: ReadonlyArray<CrisisTrigger>;
  readonly interventions: ReadonlyArray<Intervention>;
}

export interface EconomicCrisisSystem {
  updateIndicator(
    worldId: WorldId,
    indicatorType: IndicatorType,
    value: number,
  ): { readonly success: true } | { readonly success: false; readonly error: string };
  checkCrisisTriggers(worldId: WorldId):
    | {
        readonly triggered: true;
        readonly crisisTrigger: CrisisTrigger;
      }
    | { readonly triggered: false };
  advanceCrisisPhase(
    worldId: WorldId,
    targetPhase: CrisisPhase,
  ): { readonly success: true } | { readonly success: false; readonly error: string };
  applyIntervention(
    worldId: WorldId,
    interventionType: InterventionType,
  ):
    | { readonly success: true; readonly intervention: Intervention }
    | { readonly success: false; readonly error: string };
  getMacroReport(worldId: WorldId): MacroReport;
  getCrisisHistory(worldId: WorldId): CrisisHistory;
  getCrisisScore(worldId: WorldId): number;
  getCurrentPhase(worldId: WorldId): CrisisPhase;
  getIndicator(worldId: WorldId, indicatorType: IndicatorType): EconomicIndicator | undefined;
}

interface EconomicCrisisState {
  readonly indicators: Map<string, MutableIndicator>;
  readonly worldPhases: Map<WorldId, CrisisPhase>;
  readonly crisisTriggers: MutableCrisisTrigger[];
  readonly interventions: MutableIntervention[];
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}

interface MutableIndicator {
  readonly indicatorType: IndicatorType;
  readonly worldId: WorldId;
  currentValue: number;
  readonly threshold: number;
  breached: boolean;
  lastUpdated: bigint;
}

interface MutableCrisisTrigger {
  readonly triggerId: string;
  readonly worldId: WorldId;
  readonly breachedIndicators: IndicatorType[];
  readonly crisisScore: number;
  readonly phase: CrisisPhase;
  readonly triggeredAt: bigint;
}

interface MutableIntervention {
  readonly interventionId: string;
  readonly worldId: WorldId;
  readonly interventionType: InterventionType;
  readonly severityReduction: number;
  readonly appliedAt: bigint;
}

const DEFAULT_THRESHOLDS: Record<IndicatorType, number> = {
  INFLATION_RATE: 0.1,
  UNEMPLOYMENT_RATE: 0.15,
  TRADE_DEFICIT_RATIO: 0.05,
  DEBT_TO_GDP_RATIO: 0.9,
  CONSUMER_CONFIDENCE: 0.3,
} as const;

const INDICATOR_WEIGHTS: Record<IndicatorType, number> = {
  INFLATION_RATE: 30,
  UNEMPLOYMENT_RATE: 30,
  TRADE_DEFICIT_RATIO: 15,
  DEBT_TO_GDP_RATIO: 20,
  CONSUMER_CONFIDENCE: 5,
} as const;

const INTERVENTION_EFFECTS: Record<InterventionType, number> = {
  MONETARY_EASING: 15,
  FISCAL_STIMULUS: 20,
  TRADE_POLICY_REFORM: 10,
  DEBT_RESTRUCTURING: 25,
  EMERGENCY_RELIEF: 30,
} as const;

export function createEconomicCrisisSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}): EconomicCrisisSystem {
  const state: EconomicCrisisState = {
    indicators: new Map(),
    worldPhases: new Map(),
    crisisTriggers: [],
    interventions: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    updateIndicator: (wid, type, value) => updateIndicatorImpl(state, wid, type, value),
    checkCrisisTriggers: (wid) => checkCrisisTriggersImpl(state, wid),
    advanceCrisisPhase: (wid, phase) => advanceCrisisPhaseImpl(state, wid, phase),
    applyIntervention: (wid, type) => applyInterventionImpl(state, wid, type),
    getMacroReport: (wid) => getMacroReportImpl(state, wid),
    getCrisisHistory: (wid) => getCrisisHistoryImpl(state, wid),
    getCrisisScore: (wid) => getCrisisScoreImpl(state, wid),
    getCurrentPhase: (wid) => getCurrentPhaseImpl(state, wid),
    getIndicator: (wid, type) => getIndicatorImpl(state, wid, type),
  };
}

function makeKey(worldId: WorldId, indicatorType: IndicatorType): string {
  return worldId + ':' + indicatorType;
}

function updateIndicatorImpl(
  state: EconomicCrisisState,
  worldId: WorldId,
  indicatorType: IndicatorType,
  value: number,
): { readonly success: true } | { readonly success: false; readonly error: string } {
  if (value < 0) return { success: false, error: 'invalid-value' };

  const key = makeKey(worldId, indicatorType);
  const now = state.clock.nowMicroseconds();
  const threshold = DEFAULT_THRESHOLDS[indicatorType];

  let indicator = state.indicators.get(key);
  if (!indicator) {
    indicator = {
      indicatorType,
      worldId,
      currentValue: value,
      threshold,
      breached: value > threshold,
      lastUpdated: now,
    };
    state.indicators.set(key, indicator);
  } else {
    indicator.currentValue = value;
    indicator.breached = value > threshold;
    indicator.lastUpdated = now;
  }

  state.logger.info('Economic indicator updated', {
    worldId,
    indicatorType,
    value,
    threshold,
    breached: indicator.breached,
  });

  return { success: true };
}

function checkCrisisTriggersImpl(
  state: EconomicCrisisState,
  worldId: WorldId,
):
  | { readonly triggered: true; readonly crisisTrigger: CrisisTrigger }
  | { readonly triggered: false } {
  const breached: IndicatorType[] = [];

  for (const indicator of state.indicators.values()) {
    if (indicator.worldId !== worldId) continue;
    if (indicator.breached) breached.push(indicator.indicatorType);
  }

  if (breached.length === 0) return { triggered: false };

  const score = computeCrisisScore(breached);
  const phase = scoreToPhase(score);
  const now = state.clock.nowMicroseconds();
  const triggerId = state.idGen.generateId();

  const trigger: MutableCrisisTrigger = {
    triggerId,
    worldId,
    breachedIndicators: breached,
    crisisScore: score,
    phase,
    triggeredAt: now,
  };

  state.crisisTriggers.push(trigger);
  state.worldPhases.set(worldId, phase);

  state.logger.info('Crisis trigger detected', {
    worldId,
    breachedCount: breached.length,
    crisisScore: score,
    phase,
  });

  return { triggered: true, crisisTrigger: trigger };
}

function computeCrisisScore(breachedIndicators: IndicatorType[]): number {
  let score = 0;
  for (const indicator of breachedIndicators) {
    const weight = INDICATOR_WEIGHTS[indicator];
    if (weight !== undefined) score += weight;
  }
  return score;
}

function scoreToPhase(score: number): CrisisPhase {
  if (score >= 80) return 'DEPRESSION';
  if (score >= 50) return 'CRISIS';
  if (score >= 20) return 'WARNING';
  if (score >= 10) return 'WATCH';
  return 'STABLE';
}

function advanceCrisisPhaseImpl(
  state: EconomicCrisisState,
  worldId: WorldId,
  targetPhase: CrisisPhase,
): { readonly success: true } | { readonly success: false; readonly error: string } {
  const validPhases: CrisisPhase[] = [
    'STABLE',
    'WATCH',
    'WARNING',
    'CRISIS',
    'DEPRESSION',
    'RECOVERY',
  ];

  if (!validPhases.includes(targetPhase)) {
    return { success: false, error: 'invalid-phase' };
  }

  state.worldPhases.set(worldId, targetPhase);

  state.logger.info('Crisis phase advanced', {
    worldId,
    targetPhase,
  });

  return { success: true };
}

function applyInterventionImpl(
  state: EconomicCrisisState,
  worldId: WorldId,
  interventionType: InterventionType,
):
  | { readonly success: true; readonly intervention: Intervention }
  | { readonly success: false; readonly error: string } {
  const currentPhase = state.worldPhases.get(worldId) ?? 'STABLE';
  if (currentPhase === 'STABLE') {
    return { success: false, error: 'no-crisis-active' };
  }

  const severityReduction = INTERVENTION_EFFECTS[interventionType];
  const now = state.clock.nowMicroseconds();
  const interventionId = state.idGen.generateId();

  const intervention: MutableIntervention = {
    interventionId,
    worldId,
    interventionType,
    severityReduction,
    appliedAt: now,
  };

  state.interventions.push(intervention);

  const currentScore = getCrisisScoreImpl(state, worldId);
  const newScore = Math.max(0, currentScore - severityReduction);
  const newPhase = scoreToPhase(newScore);
  state.worldPhases.set(worldId, newPhase);

  state.logger.info('Intervention applied', {
    worldId,
    interventionType,
    severityReduction,
    previousPhase: currentPhase,
    newPhase,
  });

  return { success: true, intervention };
}

function getMacroReportImpl(state: EconomicCrisisState, worldId: WorldId): MacroReport {
  const currentPhase = state.worldPhases.get(worldId) ?? 'STABLE';
  const crisisScore = getCrisisScoreImpl(state, worldId);

  const indicators: EconomicIndicator[] = [];
  let breachedCount = 0;

  for (const indicator of state.indicators.values()) {
    if (indicator.worldId !== worldId) continue;
    indicators.push(indicator);
    if (indicator.breached) breachedCount += 1;
  }

  const activeInterventions = state.interventions.filter((i) => i.worldId === worldId).length;

  const generatedAt = state.clock.nowMicroseconds();

  return {
    worldId,
    currentPhase,
    crisisScore,
    breachedCount,
    indicators,
    activeInterventions,
    generatedAt,
  };
}

function getCrisisHistoryImpl(state: EconomicCrisisState, worldId: WorldId): CrisisHistory {
  const triggers = state.crisisTriggers
    .filter((t) => t.worldId === worldId)
    .sort((a, b) => Number(b.triggeredAt - a.triggeredAt));

  const interventions = state.interventions
    .filter((i) => i.worldId === worldId)
    .sort((a, b) => Number(b.appliedAt - a.appliedAt));

  return {
    worldId,
    triggers,
    interventions,
  };
}

function getCrisisScoreImpl(state: EconomicCrisisState, worldId: WorldId): number {
  const breached: IndicatorType[] = [];

  for (const indicator of state.indicators.values()) {
    if (indicator.worldId !== worldId) continue;
    if (indicator.breached) breached.push(indicator.indicatorType);
  }

  return computeCrisisScore(breached);
}

function getCurrentPhaseImpl(state: EconomicCrisisState, worldId: WorldId): CrisisPhase {
  return state.worldPhases.get(worldId) ?? 'STABLE';
}

function getIndicatorImpl(
  state: EconomicCrisisState,
  worldId: WorldId,
  indicatorType: IndicatorType,
): EconomicIndicator | undefined {
  const key = makeKey(worldId, indicatorType);
  const indicator = state.indicators.get(key);
  if (indicator === undefined) return undefined;
  return { ...indicator };
}
