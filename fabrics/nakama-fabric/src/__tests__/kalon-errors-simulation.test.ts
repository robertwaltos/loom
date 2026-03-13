/**
 * KALON Errors - Simulation Tests
 *
 * Verifies structured error codes, messages, and diagnostic context.
 */

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
  integrityOutOfRange,
  dynastyNotFound,
  dynastyAlreadyExists,
  continuityRecordNotFound,
  continuityRecordAlreadyExists,
  continuityInvalidTransition,
  heirNotRegistered,
  continuityTerminalState,
} from '../kalon-errors.js';

describe('kalon errors', () => {
  describe('KalonError base class', () => {
    it('creates an error with expected name, code, message, and context', () => {
      const error = new KalonError('INVALID_AMOUNT', 'Invalid amount', { amount: '0' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(KalonError);
      expect(error.name).toBe('KalonError');
      expect(error.code).toBe('INVALID_AMOUNT');
      expect(error.message).toBe('Invalid amount');
      expect(error.context).toEqual({ amount: '0' });
    });

    it('defaults context to an empty object when omitted', () => {
      const error = new KalonError('ACCOUNT_NOT_FOUND', 'Missing account');
      expect(error.context).toEqual({});
    });
  });

  describe('error factory functions', () => {
    it('builds insufficientBalance with stringified bigint context', () => {
      const error = insufficientBalance('acc-1', 150n, 75n);
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.message).toContain('Insufficient KALON balance on acc-1');
      expect(error.context).toEqual({ accountId: 'acc-1', required: '150', available: '75' });
    });

    it('builds accountNotFound with account id in context', () => {
      const error = accountNotFound('acc-404');
      expect(error.code).toBe('ACCOUNT_NOT_FOUND');
      expect(error.message).toContain('acc-404');
      expect(error.context).toEqual({ accountId: 'acc-404' });
    });

    it('builds accountAlreadyExists with account id in context', () => {
      const error = accountAlreadyExists('acc-dup');
      expect(error.code).toBe('ACCOUNT_ALREADY_EXISTS');
      expect(error.context).toEqual({ accountId: 'acc-dup' });
    });

    it('builds invalidAmount with stringified amount in context', () => {
      const error = invalidAmount(0n);
      expect(error.code).toBe('INVALID_AMOUNT');
      expect(error.message).toContain('0');
      expect(error.context).toEqual({ amount: '0' });
    });

    it('builds selfTransfer with account id in context', () => {
      const error = selfTransfer('acc-self');
      expect(error.code).toBe('SELF_TRANSFER');
      expect(error.context).toEqual({ accountId: 'acc-self' });
    });

    it('builds wealthCapExceeded with stringified balance and cap', () => {
      const error = wealthCapExceeded('acc-rich', 9000n, 8000n);
      expect(error.code).toBe('WEALTH_CAP_EXCEEDED');
      expect(error.message).toContain('acc-rich');
      expect(error.context).toEqual({ accountId: 'acc-rich', balance: '9000', cap: '8000' });
    });

    it('builds vaultDepleted with stringified requested and available amounts', () => {
      const error = vaultDepleted('reserve-vault', 2000n, 250n);
      expect(error.code).toBe('VAULT_DEPLETED');
      expect(error.message).toContain('reserve-vault');
      expect(error.context).toEqual({ vaultName: 'reserve-vault', requested: '2000', available: '250' });
    });

    it('builds worldNotRegistered with world id in context', () => {
      const error = worldNotRegistered('world-alpha');
      expect(error.code).toBe('WORLD_NOT_REGISTERED');
      expect(error.context).toEqual({ worldId: 'world-alpha' });
    });

    it('builds worldAlreadyRegistered with world id in context', () => {
      const error = worldAlreadyRegistered('world-alpha');
      expect(error.code).toBe('WORLD_ALREADY_REGISTERED');
      expect(error.context).toEqual({ worldId: 'world-alpha' });
    });

    it('builds dynastyNotFound with dynasty id in context', () => {
      const error = dynastyNotFound('dynasty-404');
      expect(error.code).toBe('DYNASTY_NOT_FOUND');
      expect(error.context).toEqual({ dynastyId: 'dynasty-404' });
    });

    it('builds dynastyAlreadyExists with dynasty id in context', () => {
      const error = dynastyAlreadyExists('dynasty-dup');
      expect(error.code).toBe('DYNASTY_ALREADY_EXISTS');
      expect(error.context).toEqual({ dynastyId: 'dynasty-dup' });
    });

    it('builds integrityOutOfRange with world id and numeric value', () => {
      const error = integrityOutOfRange('world-zeta', 101);
      expect(error.code).toBe('INTEGRITY_OUT_OF_RANGE');
      expect(error.message).toContain('out of range [0, 100]');
      expect(error.context).toEqual({ worldId: 'world-zeta', value: 101 });
    });

    it('builds continuityRecordNotFound with dynasty id context', () => {
      const error = continuityRecordNotFound('dynasty-a');
      expect(error.code).toBe('CONTINUITY_RECORD_NOT_FOUND');
      expect(error.context).toEqual({ dynastyId: 'dynasty-a' });
    });

    it('builds continuityRecordAlreadyExists with dynasty id context', () => {
      const error = continuityRecordAlreadyExists('dynasty-a');
      expect(error.code).toBe('CONTINUITY_RECORD_ALREADY_EXISTS');
      expect(error.context).toEqual({ dynastyId: 'dynasty-a' });
    });

    it('builds continuityInvalidTransition with from/to states', () => {
      const error = continuityInvalidTransition('dynasty-b', 'alive', 'deceased');
      expect(error.code).toBe('CONTINUITY_INVALID_TRANSITION');
      expect(error.message).toContain('alive');
      expect(error.message).toContain('deceased');
      expect(error.context).toEqual({ dynastyId: 'dynasty-b', from: 'alive', to: 'deceased' });
    });

    it('builds heirNotRegistered with dynasty and heir ids', () => {
      const error = heirNotRegistered('dynasty-main', 'dynasty-heir');
      expect(error.code).toBe('HEIR_NOT_REGISTERED');
      expect(error.context).toEqual({ dynastyId: 'dynasty-main', heirDynastyId: 'dynasty-heir' });
    });

    it('builds continuityTerminalState with current terminal state', () => {
      const error = continuityTerminalState('dynasty-main', 'deceased');
      expect(error.code).toBe('CONTINUITY_TERMINAL_STATE');
      expect(error.message).toContain('deceased');
      expect(error.context).toEqual({ dynastyId: 'dynasty-main', state: 'deceased' });
    });
  });
});
