/**
 * World Discovery System — Survey Corps progression
 * Tracks world unlock stages: SURVEYED → CHARTED → OPEN
 */

// ============================================================================
// Ports (Duplicated)
// ============================================================================

interface DiscoveryClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface DiscoveryLoggerPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
  readonly error: (message: string, context: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type DiscoveryStage = 'SURVEYED' | 'CHARTED' | 'OPEN';

export interface UnlockCondition {
  readonly type: 'TIME_ELAPSED' | 'SURVEY_COUNT' | 'PREREQUISITE_WORLD' | 'MANUAL';
  readonly param: string | bigint;
}

export interface SurveyProgress {
  readonly worldId: string;
  readonly percentComplete: number;
  readonly surveysCompleted: number;
  readonly surveysRequired: number;
}

export interface WorldDiscoveryRecord {
  readonly worldId: string;
  readonly stage: DiscoveryStage;
  readonly discoveredAtMicros: bigint;
  readonly chartedAtMicros: bigint | null;
  readonly openedAtMicros: bigint | null;
  readonly unlockConditions: ReadonlyArray<UnlockCondition>;
  readonly surveysCompleted: number;
}

// ============================================================================
// State
// ============================================================================

interface WorldDiscoveryState {
  readonly records: Map<string, WorldDiscoveryRecord>;
  readonly surveyRequirements: Map<string, number>;
}

// ============================================================================
// Dependencies
// ============================================================================

export interface WorldDiscoveryDeps {
  readonly clock: DiscoveryClockPort;
  readonly logger: DiscoveryLoggerPort;
}

// ============================================================================
// Module Interface
// ============================================================================

export interface WorldDiscoveryModule {
  readonly recordSurvey: (worldId: string) => RecordSurveyResult;
  readonly checkUnlockConditions: (worldId: string) => CheckConditionsResult;
  readonly advanceStage: (worldId: string) => AdvanceStageResult;
  readonly getDiscoveredWorlds: () => ReadonlyArray<WorldDiscoveryRecord>;
  readonly getUnlockProgress: (worldId: string) => GetProgressResult;
  readonly setUnlockConditions: (
    worldId: string,
    conditions: ReadonlyArray<UnlockCondition>,
  ) => SetConditionsResult;
  readonly setSurveyRequirement: (worldId: string, required: number) => void;
}

export type RecordSurveyResult =
  | { readonly success: true; readonly surveysCompleted: number }
  | { readonly success: false; readonly error: string };
export type CheckConditionsResult =
  | { readonly canAdvance: true }
  | { readonly canAdvance: false; readonly reason: string };
export type AdvanceStageResult =
  | { readonly success: true; readonly newStage: DiscoveryStage }
  | { readonly success: false; readonly error: string };
export type GetProgressResult =
  | { readonly found: true; readonly progress: SurveyProgress }
  | { readonly found: false; readonly error: string };
export type SetConditionsResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: string };

// ============================================================================
// Factory
// ============================================================================

export function createWorldDiscoveryModule(deps: WorldDiscoveryDeps): WorldDiscoveryModule {
  const state: WorldDiscoveryState = {
    records: new Map(),
    surveyRequirements: new Map(),
  };

  return {
    recordSurvey: (worldId) => recordSurvey(state, deps, worldId),
    checkUnlockConditions: (worldId) => checkUnlockConditions(state, deps, worldId),
    advanceStage: (worldId) => advanceStage(state, deps, worldId),
    getDiscoveredWorlds: () => getDiscoveredWorlds(state),
    getUnlockProgress: (worldId) => getUnlockProgress(state, worldId),
    setUnlockConditions: (worldId, conditions) => setUnlockConditions(state, worldId, conditions),
    setSurveyRequirement: (worldId, required) => setSurveyRequirement(state, worldId, required),
  };
}

// ============================================================================
// Functions
// ============================================================================

function recordSurvey(
  state: WorldDiscoveryState,
  deps: WorldDiscoveryDeps,
  worldId: string,
): RecordSurveyResult {
  const existing = state.records.get(worldId);
  const nowMicros = deps.clock.nowMicroseconds();

  if (existing === undefined) {
    const record: WorldDiscoveryRecord = {
      worldId,
      stage: 'SURVEYED',
      discoveredAtMicros: nowMicros,
      chartedAtMicros: null,
      openedAtMicros: null,
      unlockConditions: [],
      surveysCompleted: 1,
    };
    state.records.set(worldId, record);
    deps.logger.info('World surveyed for first time', { worldId, surveysCompleted: 1 });
    return { success: true, surveysCompleted: 1 };
  }

  const updated: WorldDiscoveryRecord = {
    ...existing,
    surveysCompleted: existing.surveysCompleted + 1,
  };
  state.records.set(worldId, updated);
  deps.logger.info('Survey recorded', { worldId, surveysCompleted: updated.surveysCompleted });
  return { success: true, surveysCompleted: updated.surveysCompleted };
}

function checkUnlockConditions(
  state: WorldDiscoveryState,
  deps: WorldDiscoveryDeps,
  worldId: string,
): CheckConditionsResult {
  const record = state.records.get(worldId);
  if (record === undefined) {
    return { canAdvance: false, reason: 'World not discovered' };
  }

  if (record.stage === 'OPEN') {
    return { canAdvance: false, reason: 'Already OPEN' };
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const conditions = record.unlockConditions;

  for (let i = 0; i < conditions.length; i = i + 1) {
    const condition = conditions[i];
    if (condition === undefined) {
      continue;
    }
    const checkResult = checkSingleCondition(state, record, condition, nowMicros);
    if (!checkResult.satisfied) {
      return { canAdvance: false, reason: checkResult.reason };
    }
  }

  return { canAdvance: true };
}

function checkSingleCondition(
  state: WorldDiscoveryState,
  record: WorldDiscoveryRecord,
  condition: UnlockCondition,
  nowMicros: bigint,
): { readonly satisfied: boolean; readonly reason: string } {
  if (condition.type === 'TIME_ELAPSED') {
    const elapsed = nowMicros - record.discoveredAtMicros;
    const required = typeof condition.param === 'bigint' ? condition.param : BigInt(0);
    if (elapsed < required) {
      return { satisfied: false, reason: 'Time not elapsed' };
    }
    return { satisfied: true, reason: '' };
  }

  if (condition.type === 'SURVEY_COUNT') {
    const required = state.surveyRequirements.get(record.worldId);
    if (required === undefined) {
      return { satisfied: false, reason: 'Survey requirement not set' };
    }
    if (record.surveysCompleted < required) {
      return { satisfied: false, reason: 'Surveys incomplete' };
    }
    return { satisfied: true, reason: '' };
  }

  if (condition.type === 'PREREQUISITE_WORLD') {
    const prereqId = String(condition.param);
    const prereq = state.records.get(prereqId);
    if (prereq === undefined || prereq.stage !== 'OPEN') {
      return { satisfied: false, reason: 'Prerequisite not open' };
    }
    return { satisfied: true, reason: '' };
  }

  if (condition.type === 'MANUAL') {
    return { satisfied: false, reason: 'Manual unlock required' };
  }

  return { satisfied: false, reason: 'Unknown condition type' };
}

function advanceStage(
  state: WorldDiscoveryState,
  deps: WorldDiscoveryDeps,
  worldId: string,
): AdvanceStageResult {
  const record = state.records.get(worldId);
  if (record === undefined) {
    return { success: false, error: 'World not discovered' };
  }

  const conditionsCheck = checkUnlockConditions(state, deps, worldId);
  if (!conditionsCheck.canAdvance) {
    return { success: false, error: conditionsCheck.reason };
  }

  const nowMicros = deps.clock.nowMicroseconds();

  if (record.stage === 'SURVEYED') {
    const updated: WorldDiscoveryRecord = {
      ...record,
      stage: 'CHARTED',
      chartedAtMicros: nowMicros,
    };
    state.records.set(worldId, updated);
    deps.logger.info('World advanced to CHARTED', { worldId });
    return { success: true, newStage: 'CHARTED' };
  }

  if (record.stage === 'CHARTED') {
    const updated: WorldDiscoveryRecord = {
      ...record,
      stage: 'OPEN',
      openedAtMicros: nowMicros,
    };
    state.records.set(worldId, updated);
    deps.logger.info('World advanced to OPEN', { worldId });
    return { success: true, newStage: 'OPEN' };
  }

  return { success: false, error: 'Already OPEN' };
}

function getDiscoveredWorlds(state: WorldDiscoveryState): ReadonlyArray<WorldDiscoveryRecord> {
  return Array.from(state.records.values());
}

function getUnlockProgress(state: WorldDiscoveryState, worldId: string): GetProgressResult {
  const record = state.records.get(worldId);
  if (record === undefined) {
    return { found: false, error: 'World not discovered' };
  }

  const required = state.surveyRequirements.get(worldId);
  if (required === undefined) {
    return { found: false, error: 'Survey requirement not set' };
  }

  const percent = Math.min(100, (record.surveysCompleted / required) * 100);

  const progress: SurveyProgress = {
    worldId,
    percentComplete: percent,
    surveysCompleted: record.surveysCompleted,
    surveysRequired: required,
  };

  return { found: true, progress };
}

function setUnlockConditions(
  state: WorldDiscoveryState,
  worldId: string,
  conditions: ReadonlyArray<UnlockCondition>,
): SetConditionsResult {
  const record = state.records.get(worldId);
  if (record === undefined) {
    return { success: false, error: 'World not discovered' };
  }

  const updated: WorldDiscoveryRecord = {
    ...record,
    unlockConditions: conditions,
  };
  state.records.set(worldId, updated);
  return { success: true };
}

function setSurveyRequirement(state: WorldDiscoveryState, worldId: string, required: number): void {
  state.surveyRequirements.set(worldId, required);
}
