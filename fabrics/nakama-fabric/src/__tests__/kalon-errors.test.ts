import { describe, it, expect } from 'vitest';
import {
  KalonError,
  insufficientBalance,
  accountNotFound,
  accountAlreadyExists,
  invalidAmount,
  selfTransfer,
  wealthCapExceeded,
  vaultDepleted,
  worldNotRegistered,
  worldAlreadyRegistered,
  dynastyNotFound,
  dynastyAlreadyExists,
  integrityOutOfRange,
  continuityRecordNotFound,
  continuityRecordAlreadyExists,
  continuityInvalidTransition,
  heirNotRegistered,
  continuityTerminalState,
} from '../kalon-errors.js';

describe('KalonError', () => {
  it('is an instance of Error with custom name', () => {
    const err = new KalonError('ACCOUNT_NOT_FOUND', 'not found');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('KalonError');
    expect(err.code).toBe('ACCOUNT_NOT_FOUND');
    expect(err.context).toEqual({});
  });

  it('stores provided context', () => {
    const err = new KalonError('INVALID_AMOUNT', 'bad', { amount: '5' });
    expect(err.context['amount']).toBe('5');
  });
});

describe('insufficientBalance', () => {
  it('encodes bigint values as strings in context', () => {
    const err = insufficientBalance('acc1', 100n, 50n);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(err.context['required']).toBe('100');
    expect(err.context['available']).toBe('50');
  });
});

describe('accountNotFound', () => {
  it('stores accountId', () => {
    const err = accountNotFound('acc1');
    expect(err.code).toBe('ACCOUNT_NOT_FOUND');
    expect(err.context['accountId']).toBe('acc1');
  });
});

describe('accountAlreadyExists', () => {
  it('creates correct code', () => {
    expect(accountAlreadyExists('acc1').code).toBe('ACCOUNT_ALREADY_EXISTS');
  });
});

describe('invalidAmount', () => {
  it('stringifies amount in context', () => {
    const err = invalidAmount(0n);
    expect(err.code).toBe('INVALID_AMOUNT');
    expect(err.context['amount']).toBe('0');
  });
});

describe('selfTransfer', () => {
  it('stores accountId', () => {
    expect(selfTransfer('me').context['accountId']).toBe('me');
  });
});

describe('wealthCapExceeded', () => {
  it('stores balance and cap as strings', () => {
    const err = wealthCapExceeded('acc1', 999n, 1000n);
    expect(err.code).toBe('WEALTH_CAP_EXCEEDED');
    expect(err.context['balance']).toBe('999');
    expect(err.context['cap']).toBe('1000');
  });
});

describe('vaultDepleted', () => {
  it('stores vault name and amounts', () => {
    const err = vaultDepleted('genesis', 50n, 10n);
    expect(err.code).toBe('VAULT_DEPLETED');
    expect(err.context['vaultName']).toBe('genesis');
  });
});

describe('worldNotRegistered / worldAlreadyRegistered', () => {
  it('worldNotRegistered carries worldId', () => {
    expect(worldNotRegistered('w1').code).toBe('WORLD_NOT_REGISTERED');
  });

  it('worldAlreadyRegistered carries worldId', () => {
    expect(worldAlreadyRegistered('w1').code).toBe('WORLD_ALREADY_REGISTERED');
  });
});

describe('dynastyNotFound / dynastyAlreadyExists', () => {
  it('dynastyNotFound carries dynastyId', () => {
    expect(dynastyNotFound('d1').context['dynastyId']).toBe('d1');
  });

  it('dynastyAlreadyExists carries dynastyId', () => {
    expect(dynastyAlreadyExists('d1').code).toBe('DYNASTY_ALREADY_EXISTS');
  });
});

describe('integrityOutOfRange', () => {
  it('stores worldId and numeric value', () => {
    const err = integrityOutOfRange('w1', 101);
    expect(err.code).toBe('INTEGRITY_OUT_OF_RANGE');
    expect(err.context['value']).toBe(101);
  });
});

describe('continuity errors', () => {
  it('continuityRecordNotFound includes dynastyId', () => {
    expect(continuityRecordNotFound('d1').code).toBe('CONTINUITY_RECORD_NOT_FOUND');
  });

  it('continuityRecordAlreadyExists includes dynastyId', () => {
    expect(continuityRecordAlreadyExists('d1').code).toBe('CONTINUITY_RECORD_ALREADY_EXISTS');
  });

  it('continuityInvalidTransition stores from/to states', () => {
    const err = continuityInvalidTransition('d1', 'active', 'sealed');
    expect(err.context['from']).toBe('active');
    expect(err.context['to']).toBe('sealed');
  });

  it('heirNotRegistered stores dynastyId and heirDynastyId', () => {
    const err = heirNotRegistered('d1', 'd2');
    expect(err.context['heirDynastyId']).toBe('d2');
  });

  it('continuityTerminalState stores state', () => {
    const err = continuityTerminalState('d1', 'extinct');
    expect(err.context['state']).toBe('extinct');
  });
});
