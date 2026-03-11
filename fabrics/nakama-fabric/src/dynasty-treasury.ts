/**
 * dynasty-treasury.ts — Dynasty KALON management.
 *
 * Each dynasty has a treasury with a balance (BigInt micro-KALON).
 * Supports deposits, withdrawals, transfer between treasuries,
 * and transaction history tracking.
 */

// ── Ports ────────────────────────────────────────────────────────

interface TreasuryClock {
  readonly nowMicroseconds: () => number;
}

interface TreasuryIdGenerator {
  readonly next: () => string;
}

interface DynastyTreasuryDeps {
  readonly clock: TreasuryClock;
  readonly idGenerator: TreasuryIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type TransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';

interface TreasuryTransaction {
  readonly transactionId: string;
  readonly dynastyId: string;
  readonly type: TransactionType;
  readonly amount: bigint;
  readonly memo: string;
  readonly recordedAt: number;
}

interface TreasuryAccount {
  readonly dynastyId: string;
  balance: bigint;
  readonly transactions: TreasuryTransaction[];
}

interface DepositParams {
  readonly dynastyId: string;
  readonly amount: bigint;
  readonly memo: string;
}

interface WithdrawParams {
  readonly dynastyId: string;
  readonly amount: bigint;
  readonly memo: string;
}

interface TransferParams {
  readonly fromDynastyId: string;
  readonly toDynastyId: string;
  readonly amount: bigint;
  readonly memo: string;
}

type TreasuryResult =
  | { readonly ok: true; readonly transaction: TreasuryTransaction }
  | { readonly ok: false; readonly reason: string };

type TransferResult =
  | { readonly ok: true; readonly outTx: TreasuryTransaction; readonly inTx: TreasuryTransaction }
  | { readonly ok: false; readonly reason: string };

interface DynastyTreasuryStats {
  readonly totalAccounts: number;
  readonly totalTransactions: number;
}

interface DynastyTreasuryService {
  readonly openAccount: (dynastyId: string) => boolean;
  readonly getBalance: (dynastyId: string) => bigint | undefined;
  readonly deposit: (params: DepositParams) => TreasuryResult;
  readonly withdraw: (params: WithdrawParams) => TreasuryResult;
  readonly transfer: (params: TransferParams) => TransferResult;
  readonly getHistory: (dynastyId: string) => readonly TreasuryTransaction[];
  readonly getStats: () => DynastyTreasuryStats;
}

// ── State ────────────────────────────────────────────────────────

interface TreasuryState {
  readonly deps: DynastyTreasuryDeps;
  readonly accounts: Map<string, TreasuryAccount>;
  totalTransactions: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function makeTx(
  state: TreasuryState,
  dynastyId: string,
  type: TransactionType,
  amount: bigint,
  memo: string,
): TreasuryTransaction {
  return {
    transactionId: state.deps.idGenerator.next(),
    dynastyId,
    type,
    amount,
    memo,
    recordedAt: state.deps.clock.nowMicroseconds(),
  };
}

// ── Operations ───────────────────────────────────────────────────

function depositImpl(state: TreasuryState, params: DepositParams): TreasuryResult {
  const acct = state.accounts.get(params.dynastyId);
  if (!acct) return { ok: false, reason: 'account_not_found' };
  if (params.amount <= 0n) return { ok: false, reason: 'invalid_amount' };
  const tx = makeTx(state, params.dynastyId, 'deposit', params.amount, params.memo);
  acct.balance += params.amount;
  acct.transactions.push(tx);
  state.totalTransactions++;
  return { ok: true, transaction: tx };
}

function withdrawImpl(state: TreasuryState, params: WithdrawParams): TreasuryResult {
  const acct = state.accounts.get(params.dynastyId);
  if (!acct) return { ok: false, reason: 'account_not_found' };
  if (params.amount <= 0n) return { ok: false, reason: 'invalid_amount' };
  if (acct.balance < params.amount) return { ok: false, reason: 'insufficient_balance' };
  const tx = makeTx(state, params.dynastyId, 'withdrawal', params.amount, params.memo);
  acct.balance -= params.amount;
  acct.transactions.push(tx);
  state.totalTransactions++;
  return { ok: true, transaction: tx };
}

function transferImpl(state: TreasuryState, params: TransferParams): TransferResult {
  if (params.fromDynastyId === params.toDynastyId) return { ok: false, reason: 'self_transfer' };
  const from = state.accounts.get(params.fromDynastyId);
  const to = state.accounts.get(params.toDynastyId);
  if (!from) return { ok: false, reason: 'source_not_found' };
  if (!to) return { ok: false, reason: 'destination_not_found' };
  if (params.amount <= 0n) return { ok: false, reason: 'invalid_amount' };
  if (from.balance < params.amount) return { ok: false, reason: 'insufficient_balance' };
  const outTx = makeTx(state, params.fromDynastyId, 'transfer_out', params.amount, params.memo);
  const inTx = makeTx(state, params.toDynastyId, 'transfer_in', params.amount, params.memo);
  from.balance -= params.amount;
  to.balance += params.amount;
  from.transactions.push(outTx);
  to.transactions.push(inTx);
  state.totalTransactions += 2;
  return { ok: true, outTx, inTx };
}

// ── Factory ──────────────────────────────────────────────────────

function createDynastyTreasuryService(deps: DynastyTreasuryDeps): DynastyTreasuryService {
  const state: TreasuryState = { deps, accounts: new Map(), totalTransactions: 0 };
  return {
    openAccount: (id) => {
      if (state.accounts.has(id)) return false;
      state.accounts.set(id, { dynastyId: id, balance: 0n, transactions: [] });
      return true;
    },
    getBalance: (id) => state.accounts.get(id)?.balance,
    deposit: (p) => depositImpl(state, p),
    withdraw: (p) => withdrawImpl(state, p),
    transfer: (p) => transferImpl(state, p),
    getHistory: (id) => state.accounts.get(id)?.transactions ?? [],
    getStats: () => ({
      totalAccounts: state.accounts.size,
      totalTransactions: state.totalTransactions,
    }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDynastyTreasuryService };
export type {
  DynastyTreasuryService,
  DynastyTreasuryDeps,
  TransactionType,
  TreasuryTransaction,
  DepositParams as TreasuryDepositParams,
  WithdrawParams as TreasuryWithdrawParams,
  TransferParams as TreasuryTransferParams,
  TreasuryResult,
  TransferResult as TreasuryTransferResult,
  DynastyTreasuryStats,
};
