/**
 * KALON Ledger — The economy's double-entry accounting engine.
 *
 * Fixed supply: 1 billion KALON. All math in BigInt micro-KALON.
 * Every transfer deducts a progressive levy into the Commons Fund.
 * No floating point ever touches the ledger.
 */

import {
  accountNotFound,
  accountAlreadyExists,
  insufficientBalance,
  invalidAmount,
  selfTransfer,
  supplyExceeded,
} from './kalon-errors.js';
import { TOTAL_SUPPLY_MICRO } from './kalon-constants.js';
import { calculateLevy } from './kalon-levy.js';

export interface AccountInfo {
  readonly accountId: string;
  readonly balance: bigint;
  readonly createdAt: number;
}

export interface TransferResult {
  readonly grossAmount: bigint;
  readonly levy: bigint;
  readonly netAmount: bigint;
  readonly senderBalance: bigint;
  readonly recipientBalance: bigint;
  readonly commonsFundBalance: bigint;
}

export interface KalonLedger {
  createAccount(accountId: string, initialBalance?: bigint): void;
  getBalance(accountId: string): bigint;
  tryGetBalance(accountId: string): bigint | undefined;
  transfer(from: string, to: string, amount: bigint): TransferResult;
  mint(accountId: string, amount: bigint): void;
  accountExists(accountId: string): boolean;
  totalCirculating(): bigint;
  commonsFundBalance(): bigint;
  listAccounts(): ReadonlyArray<AccountInfo>;
}

interface LedgerState {
  readonly accounts: Map<string, MutableAccount>;
  readonly clock: { nowMicroseconds(): number };
  commonsFund: bigint;
  totalMinted: bigint;
}

interface MutableAccount {
  readonly accountId: string;
  balance: bigint;
  readonly createdAt: number;
}

export function createKalonLedger(deps: {
  readonly clock: { nowMicroseconds(): number };
}): KalonLedger {
  const state: LedgerState = {
    accounts: new Map(),
    clock: deps.clock,
    commonsFund: 0n,
    totalMinted: 0n,
  };

  return {
    createAccount: (id, balance) => {
      createAccountImpl(state, id, balance);
    },
    getBalance: (id) => getBalanceImpl(state, id),
    tryGetBalance: (id) => state.accounts.get(id)?.balance,
    transfer: (from, to, amount) => transferImpl(state, from, to, amount),
    mint: (id, amount) => {
      mintImpl(state, id, amount);
    },
    accountExists: (id) => state.accounts.has(id),
    totalCirculating: () => computeCirculating(state),
    commonsFundBalance: () => state.commonsFund,
    listAccounts: () => [...state.accounts.values()],
  };
}

function createAccountImpl(state: LedgerState, accountId: string, initialBalance?: bigint): void {
  if (state.accounts.has(accountId)) throw accountAlreadyExists(accountId);
  state.accounts.set(accountId, {
    accountId,
    balance: initialBalance ?? 0n,
    createdAt: state.clock.nowMicroseconds(),
  });
}

function getBalanceImpl(state: LedgerState, accountId: string): bigint {
  const account = state.accounts.get(accountId);
  if (account === undefined) throw accountNotFound(accountId);
  return account.balance;
}

function transferImpl(
  state: LedgerState,
  from: string,
  to: string,
  amount: bigint,
): TransferResult {
  validateTransfer(state, from, to, amount);

  const sender = getAccount(state, from);
  const recipient = getAccount(state, to);
  const levy = calculateLevy(amount, sender.balance);
  const netAmount = amount - levy;

  sender.balance -= amount;
  recipient.balance += netAmount;
  state.commonsFund += levy;

  return buildTransferResult(amount, levy, netAmount, sender, recipient, state);
}

function validateTransfer(state: LedgerState, from: string, to: string, amount: bigint): void {
  if (amount <= 0n) throw invalidAmount(amount);
  if (from === to) throw selfTransfer(from);
  const sender = getAccount(state, from);
  if (sender.balance < amount) {
    throw insufficientBalance(from, amount, sender.balance);
  }
}

function mintImpl(state: LedgerState, accountId: string, amount: bigint): void {
  if (amount <= 0n) throw invalidAmount(amount);
  const newTotal = state.totalMinted + amount;
  if (newTotal > TOTAL_SUPPLY_MICRO) throw supplyExceeded(newTotal, TOTAL_SUPPLY_MICRO);

  const account = getAccount(state, accountId);
  account.balance += amount;
  state.totalMinted = newTotal;
}

function getAccount(state: LedgerState, accountId: string): MutableAccount {
  const account = state.accounts.get(accountId);
  if (account === undefined) throw accountNotFound(accountId);
  return account;
}

function computeCirculating(state: LedgerState): bigint {
  let total = 0n;
  for (const account of state.accounts.values()) {
    total += account.balance;
  }
  return total + state.commonsFund;
}

function buildTransferResult(
  grossAmount: bigint,
  levy: bigint,
  netAmount: bigint,
  sender: MutableAccount,
  recipient: MutableAccount,
  state: LedgerState,
): TransferResult {
  return {
    grossAmount,
    levy,
    netAmount,
    senderBalance: sender.balance,
    recipientBalance: recipient.balance,
    commonsFundBalance: state.commonsFund,
  };
}
