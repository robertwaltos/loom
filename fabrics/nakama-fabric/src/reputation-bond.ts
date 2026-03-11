/**
 * Reputation Bond System — Stake KALON as reputation collateral with slashing on violations.
 *
 * Bonders register and create bonds by staking KALON against a beneficiary.
 * Bonds can be slashed (partial or full reduction), released (ACTIVE → RELEASED),
 * or expired (ACTIVE → EXPIRED). Full slash drives status to SLASHED.
 *
 * All KALON amounts in bigint micro-KALON (10^6 precision).
 */

export type BondId = string;
export type BonderId = string;
export type BeneficiaryId = string;

export type BondStatus = 'ACTIVE' | 'SLASHED' | 'RELEASED' | 'EXPIRED';

export type BondError =
  | 'bond-not-found'
  | 'bonder-not-found'
  | 'invalid-amount'
  | 'invalid-duration'
  | 'wrong-status'
  | 'slash-exceeds-bond';

export interface ReputationBond {
  readonly bondId: BondId;
  readonly bonderId: BonderId;
  readonly beneficiaryId: BeneficiaryId;
  readonly stakedKalon: bigint;
  readonly remainingKalon: bigint;
  readonly status: BondStatus;
  readonly createdAt: bigint;
  readonly expiresAt: bigint;
  readonly slashedAmount: bigint;
}

export interface SlashEvent {
  readonly eventId: string;
  readonly bondId: BondId;
  readonly amount: bigint;
  readonly reason: string;
  readonly slashedAt: bigint;
}

export interface BonderProfile {
  readonly bonderId: BonderId;
  readonly activeBonds: number;
  readonly totalStakedKalon: bigint;
  readonly totalSlashedKalon: bigint;
}

export interface ReputationBondSystem {
  registerBonder(bonderId: BonderId): { success: true } | { success: false; error: BondError };
  createBond(
    bonderId: BonderId,
    beneficiaryId: BeneficiaryId,
    stakedKalon: bigint,
    durationUs: bigint,
  ): ReputationBond | BondError;
  slashBond(
    bondId: BondId,
    amount: bigint,
    reason: string,
  ): { success: true; event: SlashEvent } | { success: false; error: BondError };
  releaseBond(bondId: BondId): { success: true } | { success: false; error: BondError };
  expireBond(bondId: BondId): { success: true } | { success: false; error: BondError };
  getBond(bondId: BondId): ReputationBond | undefined;
  getSlashHistory(bondId: BondId): ReadonlyArray<SlashEvent>;
  getBonderProfile(bonderId: BonderId): BonderProfile | undefined;
}

interface MutableBond {
  bondId: BondId;
  bonderId: BonderId;
  beneficiaryId: BeneficiaryId;
  stakedKalon: bigint;
  remainingKalon: bigint;
  status: BondStatus;
  createdAt: bigint;
  expiresAt: bigint;
  slashedAmount: bigint;
}

interface ReputationBondState {
  readonly bonders: Set<BonderId>;
  readonly bonds: Map<BondId, MutableBond>;
  readonly slashEvents: Map<BondId, SlashEvent[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}

export function createReputationBondSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}): ReputationBondSystem {
  const state: ReputationBondState = {
    bonders: new Set(),
    bonds: new Map(),
    slashEvents: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerBonder: (bonderId) => registerBonderImpl(state, bonderId),
    createBond: (bonderId, beneficiaryId, stakedKalon, durationUs) =>
      createBondImpl(state, bonderId, beneficiaryId, stakedKalon, durationUs),
    slashBond: (bondId, amount, reason) => slashBondImpl(state, bondId, amount, reason),
    releaseBond: (bondId) => releaseBondImpl(state, bondId),
    expireBond: (bondId) => expireBondImpl(state, bondId),
    getBond: (bondId) => state.bonds.get(bondId),
    getSlashHistory: (bondId) => state.slashEvents.get(bondId) ?? [],
    getBonderProfile: (bonderId) => getBonderProfileImpl(state, bonderId),
  };
}

function registerBonderImpl(
  state: ReputationBondState,
  bonderId: BonderId,
): { success: true } | { success: false; error: BondError } {
  if (state.bonders.has(bonderId)) {
    return { success: false, error: 'bonder-not-found' };
  }
  state.bonders.add(bonderId);
  state.logger.info('Bonder registered', { bonderId });
  return { success: true };
}

function buildBond(
  state: ReputationBondState,
  bondId: BondId,
  bonderId: BonderId,
  beneficiaryId: BeneficiaryId,
  stakedKalon: bigint,
  durationUs: bigint,
): MutableBond {
  const now = state.clock.nowMicroseconds();
  return {
    bondId,
    bonderId,
    beneficiaryId,
    stakedKalon,
    remainingKalon: stakedKalon,
    status: 'ACTIVE',
    createdAt: now,
    expiresAt: now + durationUs,
    slashedAmount: 0n,
  };
}

function createBondImpl(
  state: ReputationBondState,
  bonderId: BonderId,
  beneficiaryId: BeneficiaryId,
  stakedKalon: bigint,
  durationUs: bigint,
): ReputationBond | BondError {
  if (!state.bonders.has(bonderId)) return 'bonder-not-found';
  if (stakedKalon < 1n) return 'invalid-amount';
  if (durationUs < 1n) return 'invalid-duration';
  const bondId = state.idGen.generateId();
  const bond = buildBond(state, bondId, bonderId, beneficiaryId, stakedKalon, durationUs);
  state.bonds.set(bondId, bond);
  state.slashEvents.set(bondId, []);
  state.logger.info('Reputation bond created', {
    bondId,
    bonderId,
    stakedKalon: String(stakedKalon),
  });
  return bond;
}

function slashBondImpl(
  state: ReputationBondState,
  bondId: BondId,
  amount: bigint,
  reason: string,
): { success: true; event: SlashEvent } | { success: false; error: BondError } {
  if (amount < 1n) return { success: false, error: 'invalid-amount' };
  const bond = state.bonds.get(bondId);
  if (!bond) return { success: false, error: 'bond-not-found' };
  if (bond.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };
  if (amount > bond.remainingKalon) return { success: false, error: 'slash-exceeds-bond' };

  bond.remainingKalon -= amount;
  bond.slashedAmount += amount;
  if (bond.remainingKalon === 0n) bond.status = 'SLASHED';

  const event: SlashEvent = {
    eventId: state.idGen.generateId(),
    bondId,
    amount,
    reason,
    slashedAt: state.clock.nowMicroseconds(),
  };
  state.slashEvents.get(bondId)?.push(event);
  state.logger.info('Bond slashed', { bondId, amount: String(amount), reason });
  return { success: true, event };
}

function releaseBondImpl(
  state: ReputationBondState,
  bondId: BondId,
): { success: true } | { success: false; error: BondError } {
  const bond = state.bonds.get(bondId);
  if (!bond) return { success: false, error: 'bond-not-found' };
  if (bond.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };

  bond.status = 'RELEASED';
  state.logger.info('Bond released', { bondId });
  return { success: true };
}

function expireBondImpl(
  state: ReputationBondState,
  bondId: BondId,
): { success: true } | { success: false; error: BondError } {
  const bond = state.bonds.get(bondId);
  if (!bond) return { success: false, error: 'bond-not-found' };
  if (bond.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };

  bond.status = 'EXPIRED';
  state.logger.info('Bond expired', { bondId });
  return { success: true };
}

function getBonderProfileImpl(
  state: ReputationBondState,
  bonderId: BonderId,
): BonderProfile | undefined {
  if (!state.bonders.has(bonderId)) return undefined;

  let activeBonds = 0;
  let totalStakedKalon = 0n;
  let totalSlashedKalon = 0n;

  for (const bond of state.bonds.values()) {
    if (bond.bonderId !== bonderId) continue;
    totalStakedKalon += bond.stakedKalon;
    totalSlashedKalon += bond.slashedAmount;
    if (bond.status === 'ACTIVE') activeBonds += 1;
  }

  return { bonderId, activeBonds, totalStakedKalon, totalSlashedKalon };
}
