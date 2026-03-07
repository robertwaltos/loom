/**
 * KALON Ledger — The economy's double-entry accounting engine.
 *
 * Bible v1.2 Stellar Standard: supply is dynamic, growing as
 * worlds are unlocked. The ledger tracks totalMinted and
 * enforces the structural wealth cap (0.050% of total supply).
 * Every transfer deducts a progressive levy into the Commons Fund.
 * No floating point ever touches the ledger.
 */

import {
  accountNotFound,
  accountAlreadyExists,
  insufficientBalance,
  invalidAmount,
  selfTransfer,
  wealthCapExceeded,
} from './kalon-errors.js';
import { calculateLevy } from './kalon-levy.js';
import { structuralCapAmount } from './wealth-zones.js';

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
  totalMinted(): bigint;
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
    totalMinted: () => state.totalMinted,
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
  const levy = calculateLevy(amount, sender.balance, state.totalMinted);
  const netAmount = amount - levy;

  enforceWealthCap(recipient, netAmount, state.totalMinted);
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
  const account = getAccount(state, accountId);
  account.balance += amount;
  state.totalMinted += amount;
}

function enforceWealthCap(recipient: MutableAccount, incoming: bigint, totalSupply: bigint): void {
  if (totalSupply <= 0n) return;
  const cap = structuralCapAmount(totalSupply);
  const projected = recipient.balance + incoming;
  if (projected > cap) throw wealthCapExceeded(recipient.accountId, projected, cap);
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
