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
  | 'WEALTH_CAP_EXCEEDED'
  | 'VAULT_DEPLETED'
  | 'WORLD_NOT_REGISTERED'
  | 'WORLD_ALREADY_REGISTERED'
  | 'INTEGRITY_OUT_OF_RANGE'
  | 'DYNASTY_NOT_FOUND'
  | 'DYNASTY_ALREADY_EXISTS'
  | 'CONTINUITY_RECORD_NOT_FOUND'
  | 'CONTINUITY_RECORD_ALREADY_EXISTS'
  | 'CONTINUITY_INVALID_TRANSITION'
  | 'HEIR_NOT_REGISTERED'
  | 'CONTINUITY_TERMINAL_STATE';

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

export function wealthCapExceeded(accountId: string, balance: bigint, cap: bigint): KalonError {
  return new KalonError('WEALTH_CAP_EXCEEDED', `Account ${accountId} would exceed wealth cap`, {
    accountId,
    balance: balance.toString(),
    cap: cap.toString(),
  });
}

export function vaultDepleted(vaultName: string, requested: bigint, available: bigint): KalonError {
  return new KalonError('VAULT_DEPLETED', `${vaultName} has insufficient KALON`, {
    vaultName,
    requested: requested.toString(),
    available: available.toString(),
  });
}

export function worldNotRegistered(worldId: string): KalonError {
  return new KalonError('WORLD_NOT_REGISTERED', `World ${worldId} not registered for issuance`, {
    worldId,
  });
}

export function worldAlreadyRegistered(worldId: string): KalonError {
  return new KalonError(
    'WORLD_ALREADY_REGISTERED',
    `World ${worldId} already registered for issuance`,
    { worldId },
  );
}

export function dynastyNotFound(dynastyId: string): KalonError {
  return new KalonError('DYNASTY_NOT_FOUND', `Dynasty ${dynastyId} not found`, { dynastyId });
}

export function dynastyAlreadyExists(dynastyId: string): KalonError {
  return new KalonError('DYNASTY_ALREADY_EXISTS', `Dynasty ${dynastyId} already exists`, {
    dynastyId,
  });
}

export function integrityOutOfRange(worldId: string, value: number): KalonError {
  return new KalonError(
    'INTEGRITY_OUT_OF_RANGE',
    `Integrity value ${String(value)} out of range [0, 100] for world ${worldId}`,
    { worldId, value },
  );
}

export function continuityRecordNotFound(dynastyId: string): KalonError {
  return new KalonError('CONTINUITY_RECORD_NOT_FOUND', `Continuity record for ${dynastyId} not found`, {
    dynastyId,
  });
}

export function continuityRecordAlreadyExists(dynastyId: string): KalonError {
  return new KalonError(
    'CONTINUITY_RECORD_ALREADY_EXISTS',
    `Continuity record for ${dynastyId} already exists`,
    { dynastyId },
  );
}

export function continuityInvalidTransition(
  dynastyId: string,
  from: string,
  to: string,
): KalonError {
  return new KalonError(
    'CONTINUITY_INVALID_TRANSITION',
    `Invalid continuity transition for ${dynastyId}: ${from} → ${to}`,
    { dynastyId, from, to },
  );
}

export function heirNotRegistered(dynastyId: string, heirDynastyId: string): KalonError {
  return new KalonError(
    'HEIR_NOT_REGISTERED',
    `Heir ${heirDynastyId} not registered for dynasty ${dynastyId}`,
    { dynastyId, heirDynastyId },
  );
}

export function continuityTerminalState(dynastyId: string, state: string): KalonError {
  return new KalonError(
    'CONTINUITY_TERMINAL_STATE',
    `Dynasty ${dynastyId} is in terminal state: ${state}`,
    { dynastyId, state },
  );
}
