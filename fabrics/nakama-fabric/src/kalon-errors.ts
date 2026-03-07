/**
 * KALON Ledger errors — structured error types for the economy.
 *
 * Every error carries a code and context for diagnostics.
 */

export type KalonErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_ALREADY_EXISTS'
  | 'INVALID_AMOUNT'
  | 'SELF_TRANSFER'
  | 'SUPPLY_EXCEEDED'
  | 'WEALTH_CAP_EXCEEDED';

export class KalonError extends Error {
  readonly code: KalonErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: KalonErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'KalonError';
    this.code = code;
    this.context = context;
  }
}

export function insufficientBalance(
  accountId: string,
  required: bigint,
  available: bigint,
): KalonError {
  return new KalonError('INSUFFICIENT_BALANCE', `Insufficient KALON balance on ${accountId}`, {
    accountId,
    required: required.toString(),
    available: available.toString(),
  });
}

export function accountNotFound(accountId: string): KalonError {
  return new KalonError('ACCOUNT_NOT_FOUND', `KALON account ${accountId} not found`, {
    accountId,
  });
}

export function accountAlreadyExists(accountId: string): KalonError {
  return new KalonError('ACCOUNT_ALREADY_EXISTS', `KALON account ${accountId} already exists`, {
    accountId,
  });
}

export function invalidAmount(amount: bigint): KalonError {
  return new KalonError('INVALID_AMOUNT', `Invalid KALON amount: ${amount.toString()}`, {
    amount: amount.toString(),
  });
}

export function selfTransfer(accountId: string): KalonError {
  return new KalonError('SELF_TRANSFER', `Cannot transfer KALON to self: ${accountId}`, {
    accountId,
  });
}

export function supplyExceeded(total: bigint, max: bigint): KalonError {
  return new KalonError('SUPPLY_EXCEEDED', 'KALON supply would exceed fixed cap', {
    total: total.toString(),
    max: max.toString(),
  });
}

export function wealthCapExceeded(accountId: string, balance: bigint, cap: bigint): KalonError {
  return new KalonError('WEALTH_CAP_EXCEEDED', `Account ${accountId} would exceed wealth cap`, {
    accountId,
    balance: balance.toString(),
    cap: cap.toString(),
  });
}
