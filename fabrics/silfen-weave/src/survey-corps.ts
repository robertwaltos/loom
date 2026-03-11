/**
 * survey-corps.ts — Survey Corps expeditions to undiscovered worlds.
 *
 * The Survey Corps sends expedition crews into the unknown. Each expedition
 * follows a strict status machine:
 *   STAGING → DEPARTED → SURVEYING → RETURNING → COMPLETED
 * Any active status can transition to LOST via loseExpedition.
 * A SURVEYING expedition produces a SurveyReport that raises worldVerified
 * and computes a discoveryScore from habitability and hazard readings.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface SurveyCorpsClockPort {
  now(): bigint;
}

export interface SurveyCorpsIdGeneratorPort {
  generate(): string;
}

export interface SurveyCorpsLoggerPort {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type ExpeditionId = string;
export type CorpsId = string;
export type WorldId = string;

export type SurveyError =
  | 'corps-not-found'
  | 'expedition-not-found'
  | 'world-not-found'
  | 'already-active'
  | 'invalid-crew'
  | 'already-registered'
  | 'invalid-status';

export type ExpeditionStatus =
  | 'STAGING'
  | 'DEPARTED'
  | 'SURVEYING'
  | 'RETURNING'
  | 'COMPLETED'
  | 'LOST';

export interface Expedition {
  readonly expeditionId: ExpeditionId;
  readonly corpsId: CorpsId;
  readonly targetWorldId: WorldId;
  readonly crewSize: number;
  status: ExpeditionStatus;
  departedAt: bigint | null;
  completedAt: bigint | null;
  discoveryScore: number;
  worldVerified: boolean;
}

export interface CorpsRecord {
  readonly corpsId: CorpsId;
  readonly name: string;
  totalExpeditions: number;
  successfulExpeditions: number;
  crewLost: number;
  readonly founded: bigint;
}

export interface SurveyReport {
  readonly reportId: string;
  readonly expeditionId: ExpeditionId;
  readonly targetWorldId: WorldId;
  readonly findings: string;
  readonly hazardLevel: number;
  readonly habitability: number;
  readonly resources: ReadonlyArray<string>;
  readonly reportedAt: bigint;
}

// ── System Interface ──────────────────────────────────────────────

export interface SurveyCorpsSystem {
  readonly registerCorps: (
    corpsId: CorpsId,
    name: string,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly launchExpedition: (
    corpsId: CorpsId,
    targetWorldId: WorldId,
    crewSize: number,
  ) => Expedition | SurveyError;
  readonly depart: (
    expeditionId: ExpeditionId,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly beginSurveying: (
    expeditionId: ExpeditionId,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly submitReport: (
    expeditionId: ExpeditionId,
    findings: string,
    hazardLevel: number,
    habitability: number,
    resources: ReadonlyArray<string>,
  ) => SurveyReport | SurveyError;
  readonly returnHome: (
    expeditionId: ExpeditionId,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly completeExpedition: (
    expeditionId: ExpeditionId,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly loseExpedition: (
    expeditionId: ExpeditionId,
    crewLost: number,
  ) => { success: true } | { success: false; error: SurveyError };
  readonly getExpedition: (expeditionId: ExpeditionId) => Expedition | undefined;
  readonly getCorpsRecord: (corpsId: CorpsId) => CorpsRecord | undefined;
  readonly listExpeditions: (
    corpsId: CorpsId,
    status?: ExpeditionStatus,
  ) => ReadonlyArray<Expedition>;
}

// ── State ────────────────────────────────────────────────────────

interface SurveyCorpsState {
  readonly corps: Map<CorpsId, CorpsRecord>;
  readonly worlds: Set<WorldId>;
  readonly expeditions: Map<ExpeditionId, Expedition>;
  readonly reports: Map<ExpeditionId, SurveyReport>;
  readonly clock: SurveyCorpsClockPort;
  readonly idGen: SurveyCorpsIdGeneratorPort;
  readonly logger: SurveyCorpsLoggerPort;
}

// ── Helpers ──────────────────────────────────────────────────────

const ACTIVE_STATUSES: ReadonlyArray<ExpeditionStatus> = [
  'STAGING',
  'DEPARTED',
  'SURVEYING',
  'RETURNING',
];

function isActive(status: ExpeditionStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

function hasActiveExpeditionForWorld(
  expeditions: Map<ExpeditionId, Expedition>,
  corpsId: CorpsId,
  worldId: WorldId,
): boolean {
  for (const e of expeditions.values()) {
    if (e.corpsId === corpsId && e.targetWorldId === worldId && isActive(e.status)) return true;
  }
  return false;
}

function computeDiscoveryScore(habitability: number, hazardLevel: number): number {
  const raw = habitability * 0.4 + (10 - hazardLevel) * 6;
  return Math.max(0, Math.min(100, raw));
}

function transitionStatus(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
  expectedStatus: ExpeditionStatus,
  nextStatus: ExpeditionStatus,
): { success: true } | { success: false; error: SurveyError } {
  const expedition = state.expeditions.get(expeditionId);
  if (expedition === undefined) {
    state.logger.error('Expedition not found: ' + expeditionId);
    return { success: false, error: 'expedition-not-found' };
  }
  if (expedition.status !== expectedStatus) {
    state.logger.warn(
      'Invalid transition for ' + expeditionId + ': ' + expedition.status + ' -> ' + nextStatus,
    );
    return { success: false, error: 'invalid-status' };
  }
  expedition.status = nextStatus;
  state.logger.info('Expedition ' + expeditionId + ' transitioned to ' + nextStatus);
  return { success: true };
}

// ── Operations ───────────────────────────────────────────────────

function registerCorps(
  state: SurveyCorpsState,
  corpsId: CorpsId,
  name: string,
): { success: true } | { success: false; error: SurveyError } {
  if (state.corps.has(corpsId)) {
    state.logger.warn('Corps already registered: ' + corpsId);
    return { success: false, error: 'already-registered' };
  }
  const record: CorpsRecord = {
    corpsId,
    name,
    totalExpeditions: 0,
    successfulExpeditions: 0,
    crewLost: 0,
    founded: state.clock.now(),
  };
  state.corps.set(corpsId, record);
  state.logger.info('Corps registered: ' + corpsId + ' (' + name + ')');
  return { success: true };
}

function registerWorld(
  state: SurveyCorpsState,
  worldId: WorldId,
): { success: true } | { success: false; error: SurveyError } {
  if (state.worlds.has(worldId)) {
    state.logger.warn('World already registered: ' + worldId);
    return { success: false, error: 'already-registered' };
  }
  state.worlds.add(worldId);
  state.logger.info('World registered: ' + worldId);
  return { success: true };
}

function validateLaunch(
  state: SurveyCorpsState,
  corpsId: CorpsId,
  targetWorldId: WorldId,
  crewSize: number,
): SurveyError | null {
  if (!state.corps.has(corpsId)) return 'corps-not-found';
  if (!state.worlds.has(targetWorldId)) return 'world-not-found';
  if (crewSize < 1) return 'invalid-crew';
  if (hasActiveExpeditionForWorld(state.expeditions, corpsId, targetWorldId))
    return 'already-active';
  return null;
}

function launchExpedition(
  state: SurveyCorpsState,
  corpsId: CorpsId,
  targetWorldId: WorldId,
  crewSize: number,
): Expedition | SurveyError {
  const validationError = validateLaunch(state, corpsId, targetWorldId, crewSize);
  if (validationError !== null) {
    state.logger.error('Launch rejected for ' + corpsId + ': ' + validationError);
    return validationError;
  }
  const expedition: Expedition = {
    expeditionId: state.idGen.generate(),
    corpsId,
    targetWorldId,
    crewSize,
    status: 'STAGING',
    departedAt: null,
    completedAt: null,
    discoveryScore: 0,
    worldVerified: false,
  };
  state.expeditions.set(expedition.expeditionId, expedition);
  const corps = state.corps.get(corpsId) as CorpsRecord;
  corps.totalExpeditions += 1;
  state.logger.info('Expedition launched: ' + expedition.expeditionId + ' to ' + targetWorldId);
  return expedition;
}

function depart(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
): { success: true } | { success: false; error: SurveyError } {
  const result = transitionStatus(state, expeditionId, 'STAGING', 'DEPARTED');
  if (result.success) {
    const expedition = state.expeditions.get(expeditionId);
    if (expedition !== undefined) expedition.departedAt = state.clock.now();
  }
  return result;
}

function beginSurveying(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
): { success: true } | { success: false; error: SurveyError } {
  return transitionStatus(state, expeditionId, 'DEPARTED', 'SURVEYING');
}

function buildReport(
  state: SurveyCorpsState,
  expedition: Expedition,
  findings: string,
  hazardLevel: number,
  habitability: number,
  resources: ReadonlyArray<string>,
): SurveyReport {
  return {
    reportId: state.idGen.generate(),
    expeditionId: expedition.expeditionId,
    targetWorldId: expedition.targetWorldId,
    findings,
    hazardLevel,
    habitability,
    resources,
    reportedAt: state.clock.now(),
  };
}

function submitReport(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
  findings: string,
  hazardLevel: number,
  habitability: number,
  resources: ReadonlyArray<string>,
): SurveyReport | SurveyError {
  const expedition = state.expeditions.get(expeditionId);
  if (expedition === undefined) {
    state.logger.error('Expedition not found: ' + expeditionId);
    return 'expedition-not-found';
  }
  if (expedition.status !== 'SURVEYING') {
    state.logger.warn('Expedition not in SURVEYING state: ' + expeditionId);
    return 'invalid-status';
  }
  const report = buildReport(state, expedition, findings, hazardLevel, habitability, resources);
  state.reports.set(expeditionId, report);
  expedition.worldVerified = true;
  expedition.discoveryScore = computeDiscoveryScore(habitability, hazardLevel);
  state.logger.info('Report submitted for expedition: ' + expeditionId);
  return report;
}

function returnHome(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
): { success: true } | { success: false; error: SurveyError } {
  return transitionStatus(state, expeditionId, 'SURVEYING', 'RETURNING');
}

function completeExpedition(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
): { success: true } | { success: false; error: SurveyError } {
  const expedition = state.expeditions.get(expeditionId);
  if (expedition === undefined) {
    state.logger.error('Expedition not found: ' + expeditionId);
    return { success: false, error: 'expedition-not-found' };
  }
  if (expedition.status !== 'RETURNING') {
    state.logger.warn('Expedition not in RETURNING state: ' + expeditionId);
    return { success: false, error: 'invalid-status' };
  }
  expedition.status = 'COMPLETED';
  expedition.completedAt = state.clock.now();
  const corps = state.corps.get(expedition.corpsId);
  if (corps !== undefined) corps.successfulExpeditions += 1;
  state.logger.info('Expedition completed: ' + expeditionId);
  return { success: true };
}

function loseExpedition(
  state: SurveyCorpsState,
  expeditionId: ExpeditionId,
  crewLost: number,
): { success: true } | { success: false; error: SurveyError } {
  const expedition = state.expeditions.get(expeditionId);
  if (expedition === undefined) {
    state.logger.error('Expedition not found: ' + expeditionId);
    return { success: false, error: 'expedition-not-found' };
  }
  if (!isActive(expedition.status)) {
    state.logger.warn('Cannot lose non-active expedition: ' + expeditionId);
    return { success: false, error: 'invalid-status' };
  }
  expedition.status = 'LOST';
  expedition.completedAt = state.clock.now();
  const corps = state.corps.get(expedition.corpsId);
  if (corps !== undefined) corps.crewLost += crewLost;
  state.logger.warn('Expedition lost: ' + expeditionId + ' crew lost: ' + String(crewLost));
  return { success: true };
}

function listExpeditions(
  state: SurveyCorpsState,
  corpsId: CorpsId,
  status?: ExpeditionStatus,
): ReadonlyArray<Expedition> {
  const result: Expedition[] = [];
  for (const e of state.expeditions.values()) {
    if (e.corpsId !== corpsId) continue;
    if (status !== undefined && e.status !== status) continue;
    result.push(e);
  }
  return result;
}

// ── Factory ──────────────────────────────────────────────────────

function buildState(deps: {
  clock: SurveyCorpsClockPort;
  idGen: SurveyCorpsIdGeneratorPort;
  logger: SurveyCorpsLoggerPort;
}): SurveyCorpsState {
  return {
    corps: new Map(),
    worlds: new Set(),
    expeditions: new Map(),
    reports: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
}

export function createSurveyCorpsSystem(deps: {
  clock: SurveyCorpsClockPort;
  idGen: SurveyCorpsIdGeneratorPort;
  logger: SurveyCorpsLoggerPort;
}): SurveyCorpsSystem {
  const state = buildState(deps);
  return {
    registerCorps: (corpsId, name) => registerCorps(state, corpsId, name),
    registerWorld: (worldId) => registerWorld(state, worldId),
    launchExpedition: (corpsId, worldId, crewSize) =>
      launchExpedition(state, corpsId, worldId, crewSize),
    depart: (expeditionId) => depart(state, expeditionId),
    beginSurveying: (expeditionId) => beginSurveying(state, expeditionId),
    submitReport: (expeditionId, findings, hazard, habitability, resources) =>
      submitReport(state, expeditionId, findings, hazard, habitability, resources),
    returnHome: (expeditionId) => returnHome(state, expeditionId),
    completeExpedition: (expeditionId) => completeExpedition(state, expeditionId),
    loseExpedition: (expeditionId, crewLost) => loseExpedition(state, expeditionId, crewLost),
    getExpedition: (expeditionId) => state.expeditions.get(expeditionId),
    getCorpsRecord: (corpsId) => state.corps.get(corpsId),
    listExpeditions: (corpsId, status) => listExpeditions(state, corpsId, status),
  };
}
