/**
 * Commons Fund — The collective economic safety net.
 *
 * Bible v1.2: Receives 9% of every world's annual issuance.
 * Funds Universal Basic KALON (UBK) distribution and emergency
 * economic stabilization.
 *
 * The Commons Fund is a single global account on the KALON Ledger.
 * Distribution cycles process UBK for all eligible dynasties on
 * each registered world.
 *
 * All amounts in micro-KALON (BigInt).
 */

import { calculateUbkAllocation } from './ubk.js';
import { kalonToMicro } from './kalon-constants.js';

// ─── Types ───────────────────────────────────────────────────────────

export interface UbkDistributionResult {
  readonly worldId: string;
  readonly dynastyCount: number;
  readonly perDynastyKalon: bigint;
  readonly totalDistributed: bigint;
  readonly timestamp: number;
}

export interface CommonsFundSummary {
  readonly balance: bigint;
  readonly totalDeposited: bigint;
  readonly totalDistributed: bigint;
  readonly distributionCount: number;
}

// ─── Ports ─────────────────────────────────────────────────────────

export interface CommonsLedgerPort {
  mint(accountId: string, amount: bigint): void;
  transfer(fromId: string, toId: string, amount: bigint): void;
  getBalance(accountId: string): bigint;
  accountExists(accountId: string): boolean;
  createAccount(accountId: string): void;
}

export interface CommonsDynastyPort {
  /** Returns KALON account IDs for active dynasties on a world. */
  getActiveDynastyAccounts(worldId: string): ReadonlyArray<string>;
}

export interface CommonsWorldPort {
  /** Returns the annual issuance (whole KALON) for a registered world. */
  getAnnualIssuance(worldId: string): bigint;
}

// ─── Engine Interface ────────────────────────────────────────────────

export interface CommonsFund {
  deposit(amount: bigint): void;
  distributeUbk(worldId: string): UbkDistributionResult | null;
  getSummary(): CommonsFundSummary;
  getBalance(): bigint;
}

// ─── Deps ──────────────────────────────────────────────────────────

export interface CommonsFundDeps {
  readonly ledger: CommonsLedgerPort;
  readonly dynastyPort: CommonsDynastyPort;
  readonly worldPort: CommonsWorldPort;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Constants ─────────────────────────────────────────────────────

export const COMMONS_ACCOUNT_ID = 'commons:global';

// ─── State ─────────────────────────────────────────────────────────

interface FundState {
  totalDeposited: bigint;
  totalDistributed: bigint;
  distributionCount: number;
}

// ─── Factory ───────────────────────────────────────────────────────

export function createCommonsFund(deps: CommonsFundDeps): CommonsFund {
  const state: FundState = {
    totalDeposited: 0n,
    totalDistributed: 0n,
    distributionCount: 0,
  };

  ensureAccountExists(deps);

  return {
    deposit: (amount) => {
      depositImpl(state, deps, amount);
    },
    distributeUbk: (worldId) => distributeUbkImpl(state, deps, worldId),
    getSummary: () => buildSummary(state, deps),
    getBalance: () => deps.ledger.getBalance(COMMONS_ACCOUNT_ID),
  };
}

// ─── Account Setup ─────────────────────────────────────────────────

function ensureAccountExists(deps: CommonsFundDeps): void {
  if (!deps.ledger.accountExists(COMMONS_ACCOUNT_ID)) {
    deps.ledger.createAccount(COMMONS_ACCOUNT_ID);
  }
}

// ─── Deposit ───────────────────────────────────────────────────────

function depositImpl(state: FundState, deps: CommonsFundDeps, amount: bigint): void {
  if (amount <= 0n) return;
  deps.ledger.mint(COMMONS_ACCOUNT_ID, amount);
  state.totalDeposited += amount;
}

// ─── UBK Distribution ──────────────────────────────────────────────

function distributeUbkImpl(
  state: FundState,
  deps: CommonsFundDeps,
  worldId: string,
): UbkDistributionResult | null {
  const accounts = deps.dynastyPort.getActiveDynastyAccounts(worldId);
  if (accounts.length === 0) return null;

  const annualIssuance = deps.worldPort.getAnnualIssuance(worldId);
  const perDynastyKalon = calculateUbkAllocation(annualIssuance);
  const perDynastyMicro = kalonToMicro(perDynastyKalon);

  const totalNeeded = perDynastyMicro * BigInt(accounts.length);
  const available = deps.ledger.getBalance(COMMONS_ACCOUNT_ID);
  if (available < totalNeeded) return null;

  for (const accountId of accounts) {
    deps.ledger.transfer(COMMONS_ACCOUNT_ID, accountId, perDynastyMicro);
  }

  state.totalDistributed += totalNeeded;
  state.distributionCount += 1;

  return {
    worldId,
    dynastyCount: accounts.length,
    perDynastyKalon,
    totalDistributed: totalNeeded,
    timestamp: deps.clock.nowMicroseconds(),
  };
}

// ─── Summary ───────────────────────────────────────────────────────

function buildSummary(state: FundState, deps: CommonsFundDeps): CommonsFundSummary {
  return {
    balance: deps.ledger.getBalance(COMMONS_ACCOUNT_ID),
    totalDeposited: state.totalDeposited,
    totalDistributed: state.totalDistributed,
    distributionCount: state.distributionCount,
  };
}
