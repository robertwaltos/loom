/**
 * Tax Collector — World-level tax assessment and collection tracking.
 *
 * Worlds register and set tax rates per TaxType. Taxpayers are registered
 * to worlds and receive assessments based on base amounts and configured rates.
 * Payments are recorded in full (no partial payment). World reports aggregate
 * collected amounts by tax type across all paid assessments.
 *
 * All KALON amounts in bigint micro-KALON (10^6 precision).
 * All timestamps in bigint microseconds.
 */

export type TaxId = string;
export type TaxpayerId = string;
export type WorldId = string;

export type TaxType = 'TRADE' | 'PROPERTY' | 'INCOME' | 'TRANSFER' | 'LUXURY';

export type TaxError =
  | 'taxpayer-not-found'
  | 'tax-not-found'
  | 'invalid-rate'
  | 'invalid-amount'
  | 'already-registered'
  | 'world-not-found';

export interface TaxRate {
  readonly worldId: WorldId;
  readonly taxType: TaxType;
  readonly rateBps: number;
  readonly effectiveFrom: bigint;
}

export interface TaxAssessment {
  readonly taxId: TaxId;
  readonly taxpayerId: TaxpayerId;
  readonly worldId: WorldId;
  readonly taxType: TaxType;
  readonly baseAmountKalon: bigint;
  readonly taxAmountKalon: bigint;
  readonly rateBps: number;
  readonly assessedAt: bigint;
  readonly paidAt: bigint | null;
}

export interface TaxpayerRecord {
  readonly taxpayerId: TaxpayerId;
  readonly worldId: WorldId;
  readonly totalAssessedKalon: bigint;
  readonly totalPaidKalon: bigint;
  readonly outstandingKalon: bigint;
  readonly assessmentCount: number;
}

export interface WorldTaxReport {
  readonly worldId: WorldId;
  readonly totalCollectedKalon: bigint;
  readonly totalOutstandingKalon: bigint;
  readonly byType: Record<TaxType, bigint>;
}

export interface TaxCollectorSystem {
  registerWorld(
    worldId: WorldId,
  ): { readonly success: true } | { readonly success: false; readonly error: TaxError };
  registerTaxpayer(
    taxpayerId: TaxpayerId,
    worldId: WorldId,
  ): { readonly success: true } | { readonly success: false; readonly error: TaxError };
  setTaxRate(
    worldId: WorldId,
    taxType: TaxType,
    rateBps: number,
  ):
    | { readonly success: true; readonly rate: TaxRate }
    | { readonly success: false; readonly error: TaxError };
  assessTax(
    taxpayerId: TaxpayerId,
    worldId: WorldId,
    taxType: TaxType,
    baseAmountKalon: bigint,
  ):
    | { readonly success: true; readonly assessment: TaxAssessment }
    | { readonly success: false; readonly error: TaxError };
  recordPayment(
    taxId: TaxId,
    amountKalon: bigint,
  ): { readonly success: true } | { readonly success: false; readonly error: TaxError };
  getTaxpayerRecord(taxpayerId: TaxpayerId, worldId: WorldId): TaxpayerRecord | undefined;
  getWorldReport(worldId: WorldId): WorldTaxReport | undefined;
  getAssessmentHistory(
    taxpayerId: TaxpayerId,
    worldId: WorldId,
    limit: number,
  ): ReadonlyArray<TaxAssessment>;
}

type TaxRateKey = `${WorldId}:${TaxType}`;
type TaxpayerKey = `${TaxpayerId}:${WorldId}`;

interface MutableAssessment {
  readonly taxId: TaxId;
  readonly taxpayerId: TaxpayerId;
  readonly worldId: WorldId;
  readonly taxType: TaxType;
  readonly baseAmountKalon: bigint;
  readonly taxAmountKalon: bigint;
  readonly rateBps: number;
  readonly assessedAt: bigint;
  paidAt: bigint | null;
}

interface MutableTaxpayerRecord {
  readonly taxpayerId: TaxpayerId;
  readonly worldId: WorldId;
  totalAssessedKalon: bigint;
  totalPaidKalon: bigint;
  outstandingKalon: bigint;
  assessmentCount: number;
}

interface TaxCollectorState {
  readonly worlds: Set<WorldId>;
  readonly taxpayers: Set<TaxpayerKey>;
  readonly rates: Map<TaxRateKey, TaxRate>;
  readonly assessments: Map<TaxId, MutableAssessment>;
  readonly taxpayerRecords: Map<TaxpayerKey, MutableTaxpayerRecord>;
  readonly assessmentsByTaxpayerWorld: Map<TaxpayerKey, TaxId[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}

const ALL_TAX_TYPES: TaxType[] = ['TRADE', 'PROPERTY', 'INCOME', 'TRANSFER', 'LUXURY'];

export function createTaxCollectorSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}): TaxCollectorSystem {
  const state: TaxCollectorState = {
    worlds: new Set(),
    taxpayers: new Set(),
    rates: new Map(),
    assessments: new Map(),
    taxpayerRecords: new Map(),
    assessmentsByTaxpayerWorld: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerWorld: (worldId) => registerWorldImpl(state, worldId),
    registerTaxpayer: (taxpayerId, worldId) => registerTaxpayerImpl(state, taxpayerId, worldId),
    setTaxRate: (worldId, taxType, rateBps) => setTaxRateImpl(state, worldId, taxType, rateBps),
    assessTax: (taxpayerId, worldId, taxType, baseAmount) =>
      assessTaxImpl(state, taxpayerId, worldId, taxType, baseAmount),
    recordPayment: (taxId, amountKalon) => recordPaymentImpl(state, taxId, amountKalon),
    getTaxpayerRecord: (taxpayerId, worldId) =>
      state.taxpayerRecords.get(`${taxpayerId}:${worldId}`),
    getWorldReport: (worldId) => getWorldReportImpl(state, worldId),
    getAssessmentHistory: (taxpayerId, worldId, limit) =>
      getAssessmentHistoryImpl(state, taxpayerId, worldId, limit),
  };
}

function registerWorldImpl(
  state: TaxCollectorState,
  worldId: WorldId,
): { readonly success: true } | { readonly success: false; readonly error: TaxError } {
  if (state.worlds.has(worldId)) return { success: false, error: 'already-registered' };
  state.worlds.add(worldId);
  state.logger.info('World registered for tax collection', { worldId });
  return { success: true };
}

function registerTaxpayerImpl(
  state: TaxCollectorState,
  taxpayerId: TaxpayerId,
  worldId: WorldId,
): { readonly success: true } | { readonly success: false; readonly error: TaxError } {
  if (!state.worlds.has(worldId)) return { success: false, error: 'world-not-found' };
  const key: TaxpayerKey = `${taxpayerId}:${worldId}`;
  if (state.taxpayers.has(key)) return { success: false, error: 'already-registered' };

  state.taxpayers.add(key);
  const record: MutableTaxpayerRecord = {
    taxpayerId,
    worldId,
    totalAssessedKalon: 0n,
    totalPaidKalon: 0n,
    outstandingKalon: 0n,
    assessmentCount: 0,
  };
  state.taxpayerRecords.set(key, record);
  state.logger.info('Taxpayer registered', { taxpayerId, worldId });
  return { success: true };
}

function setTaxRateImpl(
  state: TaxCollectorState,
  worldId: WorldId,
  taxType: TaxType,
  rateBps: number,
):
  | { readonly success: true; readonly rate: TaxRate }
  | { readonly success: false; readonly error: TaxError } {
  if (!state.worlds.has(worldId)) return { success: false, error: 'world-not-found' };
  if (rateBps < 0 || rateBps > 10000) return { success: false, error: 'invalid-rate' };

  const key: TaxRateKey = `${worldId}:${taxType}`;
  const rate: TaxRate = {
    worldId,
    taxType,
    rateBps,
    effectiveFrom: state.clock.nowMicroseconds(),
  };
  state.rates.set(key, rate);
  state.logger.info('Tax rate set', { worldId, taxType, rateBps });
  return { success: true, rate };
}

function computeTaxAmount(
  state: TaxCollectorState,
  worldId: WorldId,
  taxType: TaxType,
  base: bigint,
): { rateBps: number; taxAmountKalon: bigint } {
  const rateKey: TaxRateKey = `${worldId}:${taxType}`;
  const rate = state.rates.get(rateKey);
  const rateBps = rate?.rateBps ?? 0;
  return { rateBps, taxAmountKalon: (base * BigInt(rateBps)) / 10000n };
}

function buildAssessment(
  taxpayerId: TaxpayerId,
  worldId: WorldId,
  taxType: TaxType,
  baseAmountKalon: bigint,
  rateBps: number,
  taxAmountKalon: bigint,
  taxId: TaxId,
  now: bigint,
): MutableAssessment {
  return {
    taxId,
    taxpayerId,
    worldId,
    taxType,
    baseAmountKalon,
    taxAmountKalon,
    rateBps,
    assessedAt: now,
    paidAt: null,
  };
}

function validateAssessTax(
  state: TaxCollectorState,
  taxpayerId: TaxpayerId,
  worldId: WorldId,
  baseAmountKalon: bigint,
): TaxError | undefined {
  if (!state.worlds.has(worldId)) return 'world-not-found';
  const key: TaxpayerKey = `${taxpayerId}:${worldId}`;
  if (!state.taxpayers.has(key)) return 'taxpayer-not-found';
  if (baseAmountKalon < 0n) return 'invalid-amount';
  return undefined;
}

function commitAssessment(
  state: TaxCollectorState,
  taxpayerId: TaxpayerId,
  worldId: WorldId,
  taxType: TaxType,
  baseAmountKalon: bigint,
): TaxAssessment {
  const { rateBps, taxAmountKalon } = computeTaxAmount(state, worldId, taxType, baseAmountKalon);
  const taxId = state.idGen.generateId();
  const assessment = buildAssessment(
    taxpayerId,
    worldId,
    taxType,
    baseAmountKalon,
    rateBps,
    taxAmountKalon,
    taxId,
    state.clock.nowMicroseconds(),
  );
  const taxpayerKey: TaxpayerKey = `${taxpayerId}:${worldId}`;
  state.assessments.set(taxId, assessment);
  updateTaxpayerOnAssess(state, taxpayerKey, taxAmountKalon);
  appendAssessmentIndex(state, taxpayerKey, taxId);
  return assessment;
}

function assessTaxImpl(
  state: TaxCollectorState,
  taxpayerId: TaxpayerId,
  worldId: WorldId,
  taxType: TaxType,
  baseAmountKalon: bigint,
):
  | { readonly success: true; readonly assessment: TaxAssessment }
  | { readonly success: false; readonly error: TaxError } {
  const error = validateAssessTax(state, taxpayerId, worldId, baseAmountKalon);
  if (error !== undefined) return { success: false, error };

  const assessment = commitAssessment(state, taxpayerId, worldId, taxType, baseAmountKalon);
  state.logger.info('Tax assessed', { taxId: assessment.taxId, taxpayerId, worldId, taxType });
  return { success: true, assessment };
}

function updateTaxpayerOnAssess(
  state: TaxCollectorState,
  key: TaxpayerKey,
  taxAmountKalon: bigint,
): void {
  const record = state.taxpayerRecords.get(key);
  if (!record) return;
  record.totalAssessedKalon += taxAmountKalon;
  record.outstandingKalon += taxAmountKalon;
  record.assessmentCount += 1;
}

function appendAssessmentIndex(state: TaxCollectorState, key: TaxpayerKey, taxId: TaxId): void {
  const list = state.assessmentsByTaxpayerWorld.get(key) ?? [];
  list.push(taxId);
  state.assessmentsByTaxpayerWorld.set(key, list);
}

function recordPaymentImpl(
  state: TaxCollectorState,
  taxId: TaxId,
  amountKalon: bigint,
): { readonly success: true } | { readonly success: false; readonly error: TaxError } {
  const assessment = state.assessments.get(taxId);
  if (!assessment) return { success: false, error: 'tax-not-found' };
  if (amountKalon < 1n) return { success: false, error: 'invalid-amount' };

  assessment.paidAt = state.clock.nowMicroseconds();

  const key: TaxpayerKey = `${assessment.taxpayerId}:${assessment.worldId}`;
  const record = state.taxpayerRecords.get(key);
  if (record) {
    record.totalPaidKalon += assessment.taxAmountKalon;
    record.outstandingKalon = record.totalAssessedKalon - record.totalPaidKalon;
  }

  state.logger.info('Tax payment recorded', { taxId, amountKalon: String(amountKalon) });
  return { success: true };
}

function getWorldReportImpl(
  state: TaxCollectorState,
  worldId: WorldId,
): WorldTaxReport | undefined {
  if (!state.worlds.has(worldId)) return undefined;

  const byType: Record<TaxType, bigint> = {
    TRADE: 0n,
    PROPERTY: 0n,
    INCOME: 0n,
    TRANSFER: 0n,
    LUXURY: 0n,
  };

  let totalCollectedKalon = 0n;
  let totalOutstandingKalon = 0n;

  for (const assessment of state.assessments.values()) {
    if (assessment.worldId !== worldId) continue;
    if (assessment.paidAt !== null) {
      byType[assessment.taxType] += assessment.taxAmountKalon;
      totalCollectedKalon += assessment.taxAmountKalon;
    } else {
      totalOutstandingKalon += assessment.taxAmountKalon;
    }
  }

  return { worldId, totalCollectedKalon, totalOutstandingKalon, byType };
}

function getAssessmentHistoryImpl(
  state: TaxCollectorState,
  taxpayerId: TaxpayerId,
  worldId: WorldId,
  limit: number,
): ReadonlyArray<TaxAssessment> {
  const key: TaxpayerKey = `${taxpayerId}:${worldId}`;
  const ids = state.assessmentsByTaxpayerWorld.get(key) ?? [];
  const result: TaxAssessment[] = [];

  for (const id of ids) {
    if (result.length >= limit) break;
    const a = state.assessments.get(id);
    if (a) result.push(a);
  }

  return result;
}

// Exported so tests can reference the full type list without duplication.
export { ALL_TAX_TYPES };
