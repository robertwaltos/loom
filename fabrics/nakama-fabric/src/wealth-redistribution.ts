/**
 * Wealth Redistribution System — Track wealth transfer programs, UBI supplements,
 * and commons fund allocation.
 *
 * Programs draw from CommonsPool funds and distribute to enrolled beneficiaries.
 * Supports five program types: UBI_SUPPLEMENT, EMERGENCY_RELIEF, COMMUNITY_GRANT,
 * SKILL_STIPEND, SETTLEMENT_BONUS. All amounts in micro-KALON (BigInt).
 */

// ============================================================================
// Types
// ============================================================================

export type ProgramId = string;
export type BeneficiaryId = string;
export type FundId = string;

export type RedistributionError =
  | 'program-not-found'
  | 'fund-not-found'
  | 'beneficiary-not-found'
  | 'invalid-amount'
  | 'insufficient-funds'
  | 'already-registered'
  | 'program-inactive';

export type ProgramType =
  | 'UBI_SUPPLEMENT'
  | 'EMERGENCY_RELIEF'
  | 'COMMUNITY_GRANT'
  | 'SKILL_STIPEND'
  | 'SETTLEMENT_BONUS';

export interface DistributionProgram {
  readonly programId: ProgramId;
  readonly name: string;
  readonly type: ProgramType;
  readonly fundId: FundId;
  readonly amountPerBeneficiaryKalon: bigint;
  readonly active: boolean;
  readonly createdAt: bigint;
  readonly distributionCount: number;
}

export interface CommonsPool {
  readonly fundId: FundId;
  readonly name: string;
  readonly balanceKalon: bigint;
  readonly totalDepositedKalon: bigint;
  readonly totalDistributedKalon: bigint;
}

export interface BeneficiaryRecord {
  readonly beneficiaryId: BeneficiaryId;
  readonly programId: ProgramId;
  readonly totalReceivedKalon: bigint;
  readonly lastDistributionAt: bigint | null;
}

export interface DistributionEvent {
  readonly eventId: string;
  readonly programId: ProgramId;
  readonly beneficiaryId: BeneficiaryId;
  readonly amountKalon: bigint;
  readonly distributedAt: bigint;
}

export interface WealthRedistributionSystem {
  createFund(name: string, initialBalanceKalon: bigint): CommonsPool | RedistributionError;
  depositToFund(
    fundId: FundId,
    amountKalon: bigint,
  ): { success: true } | { success: false; error: RedistributionError };
  createProgram(
    name: string,
    type: ProgramType,
    fundId: FundId,
    amountPerBeneficiaryKalon: bigint,
  ): DistributionProgram | RedistributionError;
  enrollBeneficiary(
    programId: ProgramId,
    beneficiaryId: BeneficiaryId,
  ): { success: true } | { success: false; error: RedistributionError };
  distribute(
    programId: ProgramId,
    beneficiaryId: BeneficiaryId,
  ): { success: true; event: DistributionEvent } | { success: false; error: RedistributionError };
  distributeAll(
    programId: ProgramId,
  ):
    | { success: true; distributed: number; totalKalon: bigint }
    | { success: false; error: RedistributionError };
  deactivateProgram(
    programId: ProgramId,
  ): { success: true } | { success: false; error: RedistributionError };
  getPool(fundId: FundId): CommonsPool | undefined;
  getProgram(programId: ProgramId): DistributionProgram | undefined;
  getBeneficiaryRecord(
    programId: ProgramId,
    beneficiaryId: BeneficiaryId,
  ): BeneficiaryRecord | undefined;
}

// ============================================================================
// Internal State
// ============================================================================

type EnrollmentKey = `${ProgramId}:${BeneficiaryId}`;

interface MutablePool {
  fundId: FundId;
  name: string;
  balanceKalon: bigint;
  totalDepositedKalon: bigint;
  totalDistributedKalon: bigint;
}

interface MutableProgram {
  programId: ProgramId;
  name: string;
  type: ProgramType;
  fundId: FundId;
  amountPerBeneficiaryKalon: bigint;
  active: boolean;
  createdAt: bigint;
  distributionCount: number;
}

interface MutableBeneficiaryRecord {
  beneficiaryId: BeneficiaryId;
  programId: ProgramId;
  totalReceivedKalon: bigint;
  lastDistributionAt: bigint | null;
}

interface RedistributionState {
  readonly funds: Map<FundId, MutablePool>;
  readonly programs: Map<ProgramId, MutableProgram>;
  readonly enrollments: Map<EnrollmentKey, MutableBeneficiaryRecord>;
  readonly programBeneficiaries: Map<ProgramId, BeneficiaryId[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generate(): string };
  readonly logger: { info(msg: string, ctx: Record<string, unknown>): void };
}

function enrollmentKey(programId: ProgramId, beneficiaryId: BeneficiaryId): EnrollmentKey {
  return `${programId}:${beneficiaryId}`;
}

// ============================================================================
// Core Implementation Functions
// ============================================================================

function createFundImpl(
  state: RedistributionState,
  name: string,
  initialBalanceKalon: bigint,
): CommonsPool | RedistributionError {
  if (initialBalanceKalon < 0n) return 'invalid-amount';

  const fundId = state.idGen.generate();
  const pool: MutablePool = {
    fundId,
    name,
    balanceKalon: initialBalanceKalon,
    totalDepositedKalon: initialBalanceKalon,
    totalDistributedKalon: 0n,
  };
  state.funds.set(fundId, pool);
  state.logger.info('Commons pool created', {
    fundId,
    name,
    initialBalanceKalon: String(initialBalanceKalon),
  });
  return pool;
}

function depositToFundImpl(
  state: RedistributionState,
  fundId: FundId,
  amountKalon: bigint,
): { success: true } | { success: false; error: RedistributionError } {
  if (amountKalon < 1n) return { success: false, error: 'invalid-amount' };
  const pool = state.funds.get(fundId);
  if (!pool) return { success: false, error: 'fund-not-found' };

  pool.balanceKalon += amountKalon;
  pool.totalDepositedKalon += amountKalon;
  state.logger.info('Deposit to fund', { fundId, amountKalon: String(amountKalon) });
  return { success: true };
}

function createProgramImpl(
  state: RedistributionState,
  name: string,
  type: ProgramType,
  fundId: FundId,
  amountPerBeneficiaryKalon: bigint,
): DistributionProgram | RedistributionError {
  if (amountPerBeneficiaryKalon < 1n) return 'invalid-amount';
  if (!state.funds.has(fundId)) return 'fund-not-found';

  const programId = state.idGen.generate();
  const program: MutableProgram = {
    programId,
    name,
    type,
    fundId,
    amountPerBeneficiaryKalon,
    active: true,
    createdAt: state.clock.nowMicroseconds(),
    distributionCount: 0,
  };
  state.programs.set(programId, program);
  state.programBeneficiaries.set(programId, []);
  state.logger.info('Distribution program created', { programId, name, type, fundId });
  return program;
}

function enrollBeneficiaryImpl(
  state: RedistributionState,
  programId: ProgramId,
  beneficiaryId: BeneficiaryId,
): { success: true } | { success: false; error: RedistributionError } {
  if (!state.programs.has(programId)) return { success: false, error: 'program-not-found' };
  const key = enrollmentKey(programId, beneficiaryId);
  if (state.enrollments.has(key)) return { success: false, error: 'already-registered' };

  const record: MutableBeneficiaryRecord = {
    beneficiaryId,
    programId,
    totalReceivedKalon: 0n,
    lastDistributionAt: null,
  };
  state.enrollments.set(key, record);
  state.programBeneficiaries.get(programId)?.push(beneficiaryId);
  return { success: true };
}

function distributeImpl(
  state: RedistributionState,
  programId: ProgramId,
  beneficiaryId: BeneficiaryId,
): { success: true; event: DistributionEvent } | { success: false; error: RedistributionError } {
  const program = state.programs.get(programId);
  if (!program) return { success: false, error: 'program-not-found' };
  if (!program.active) return { success: false, error: 'program-inactive' };

  const key = enrollmentKey(programId, beneficiaryId);
  const record = state.enrollments.get(key);
  if (!record) return { success: false, error: 'beneficiary-not-found' };

  const pool = state.funds.get(program.fundId);
  if (!pool) return { success: false, error: 'fund-not-found' };
  if (pool.balanceKalon < program.amountPerBeneficiaryKalon) {
    return { success: false, error: 'insufficient-funds' };
  }

  const now = state.clock.nowMicroseconds();
  pool.balanceKalon -= program.amountPerBeneficiaryKalon;
  pool.totalDistributedKalon += program.amountPerBeneficiaryKalon;
  record.totalReceivedKalon += program.amountPerBeneficiaryKalon;
  record.lastDistributionAt = now;
  program.distributionCount += 1;

  const event: DistributionEvent = {
    eventId: state.idGen.generate(),
    programId,
    beneficiaryId,
    amountKalon: program.amountPerBeneficiaryKalon,
    distributedAt: now,
  };
  state.logger.info('Distribution executed', {
    eventId: event.eventId,
    programId,
    beneficiaryId,
    amountKalon: String(event.amountKalon),
  });
  return { success: true, event };
}

function distributeAllImpl(
  state: RedistributionState,
  programId: ProgramId,
):
  | { success: true; distributed: number; totalKalon: bigint }
  | { success: false; error: RedistributionError } {
  const program = state.programs.get(programId);
  if (!program) return { success: false, error: 'program-not-found' };
  if (!program.active) return { success: false, error: 'program-inactive' };

  const beneficiaries = state.programBeneficiaries.get(programId) ?? [];
  let distributed = 0;
  let totalKalon = 0n;

  for (const beneficiaryId of beneficiaries) {
    const result = distributeImpl(state, programId, beneficiaryId);
    if (result.success) {
      distributed += 1;
      totalKalon += result.event.amountKalon;
    } else if (result.error === 'insufficient-funds') {
      break;
    }
  }

  return { success: true, distributed, totalKalon };
}

function deactivateProgramImpl(
  state: RedistributionState,
  programId: ProgramId,
): { success: true } | { success: false; error: RedistributionError } {
  const program = state.programs.get(programId);
  if (!program) return { success: false, error: 'program-not-found' };
  program.active = false;
  state.logger.info('Program deactivated', { programId });
  return { success: true };
}

// ============================================================================
// Factory
// ============================================================================

export function createWealthRedistributionSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generate(): string };
  readonly logger: { info(msg: string, ctx: Record<string, unknown>): void };
}): WealthRedistributionSystem {
  const state: RedistributionState = {
    funds: new Map(),
    programs: new Map(),
    enrollments: new Map(),
    programBeneficiaries: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    createFund: (name, initialBalanceKalon) => createFundImpl(state, name, initialBalanceKalon),
    depositToFund: (fundId, amountKalon) => depositToFundImpl(state, fundId, amountKalon),
    createProgram: (name, type, fundId, amountPerBeneficiaryKalon) =>
      createProgramImpl(state, name, type, fundId, amountPerBeneficiaryKalon),
    enrollBeneficiary: (programId, beneficiaryId) =>
      enrollBeneficiaryImpl(state, programId, beneficiaryId),
    distribute: (programId, beneficiaryId) => distributeImpl(state, programId, beneficiaryId),
    distributeAll: (programId) => distributeAllImpl(state, programId),
    deactivateProgram: (programId) => deactivateProgramImpl(state, programId),
    getPool: (fundId) => state.funds.get(fundId),
    getProgram: (programId) => state.programs.get(programId),
    getBeneficiaryRecord: (programId, beneficiaryId) =>
      state.enrollments.get(enrollmentKey(programId, beneficiaryId)),
  };
}
