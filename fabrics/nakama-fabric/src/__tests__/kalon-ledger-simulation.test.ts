/**
 * KALON Ledger - Simulation Tests
 *
 * Exercises economy flows with realistic sequencing and invariants.
 */

import { describe, expect, it } from 'vitest';
import { createKalonLedger } from '../kalon-ledger.js';
import { kalonToMicro } from '../kalon-constants.js';
import { structuralCapAmount } from '../wealth-zones.js';
import { KalonError } from '../kalon-errors.js';

const LARGE_SUPPLY = kalonToMicro(100_000_000n);

function createLedger() {
  let now = 10_000;
  return createKalonLedger({
    clock: {
      nowMicroseconds: () => {
        now += 100;
        return now;
      },
    },
  });
}

describe('kalon ledger simulation', () => {
  it('records deterministic account creation timeline', () => {
    const ledger = createLedger();

    ledger.createAccount('alpha');
    ledger.createAccount('beta');
    ledger.createAccount('gamma');

    const accounts = ledger.listAccounts();
    expect(accounts).toHaveLength(3);
    expect(accounts[0]?.createdAt).toBeLessThan(accounts[1]?.createdAt ?? 0);
    expect(accounts[1]?.createdAt).toBeLessThan(accounts[2]?.createdAt ?? 0);
  });

  it('keeps circulating supply invariant across taxed transfers', () => {
    const ledger = createLedger();
    ledger.createAccount('treasury');
    ledger.createAccount('merchant');
    ledger.createAccount('artisan');

    ledger.mint('treasury', LARGE_SUPPLY);
    const before = ledger.totalCirculating();

    ledger.transfer('treasury', 'merchant', kalonToMicro(1_000n));
    ledger.transfer('merchant', 'artisan', kalonToMicro(250n));
    ledger.transfer('artisan', 'merchant', kalonToMicro(100n));

    expect(ledger.totalCirculating()).toBe(before);
    expect(ledger.commonsFundBalance()).toBeGreaterThan(0n);
  });

  it('returns transfer snapshot values that align with ledger state', () => {
    const ledger = createLedger();
    ledger.createAccount('sender');
    ledger.createAccount('receiver');

    ledger.mint('sender', LARGE_SUPPLY);
    const result = ledger.transfer('sender', 'receiver', kalonToMicro(1_000n));

    expect(result.netAmount).toBe(result.grossAmount - result.levy);
    expect(ledger.getBalance('sender')).toBe(result.senderBalance);
    expect(ledger.getBalance('receiver')).toBe(result.recipientBalance);
    expect(ledger.commonsFundBalance()).toBe(result.commonsFundBalance);
  });

  it('increases wealth-cap headroom when global minted supply rises', () => {
    const ledger = createLedger();
    ledger.createAccount('issuer');
    ledger.createAccount('receiver');

    ledger.mint('issuer', kalonToMicro(1_000_000n));
    const firstCap = structuralCapAmount(ledger.totalMinted());

    // Fill receiver near cap, then confirm a top-up transfer is rejected.
    ledger.mint('receiver', firstCap - kalonToMicro(1n));
    expect(() => ledger.transfer('issuer', 'receiver', kalonToMicro(5n))).toThrow('wealth cap');

    // Expand supply; new cap should permit the same transfer.
    ledger.mint('issuer', kalonToMicro(3_000_000n));
    const secondCap = structuralCapAmount(ledger.totalMinted());
    expect(secondCap).toBeGreaterThan(firstCap);

    const result = ledger.transfer('issuer', 'receiver', kalonToMicro(5n));
    expect(result.netAmount).toBeGreaterThan(0n);
    expect(ledger.getBalance('receiver')).toBeLessThanOrEqual(secondCap);
  });

  it('surfaces structured INVALID_AMOUNT errors for zero transfer and mint', () => {
    const ledger = createLedger();
    ledger.createAccount('a');
    ledger.createAccount('b');

    try {
      ledger.transfer('a', 'b', 0n);
      throw new Error('expected transfer error');
    } catch (error) {
      expect(error).toBeInstanceOf(KalonError);
      expect((error as KalonError).code).toBe('INVALID_AMOUNT');
    }

    try {
      ledger.mint('a', 0n);
      throw new Error('expected mint error');
    } catch (error) {
      expect(error).toBeInstanceOf(KalonError);
      expect((error as KalonError).code).toBe('INVALID_AMOUNT');
    }
  });

  it('surfaces ACCOUNT_NOT_FOUND when interacting with unknown accounts', () => {
    const ledger = createLedger();
    ledger.createAccount('known');
    ledger.mint('known', kalonToMicro(1n));

    expect(() => ledger.getBalance('unknown')).toThrow('not found');
    expect(() => ledger.mint('unknown', 1n)).toThrow('not found');
    expect(() => ledger.transfer('known', 'unknown', 1n)).toThrow('not found');
  });

  it('accumulates commons fund monotonically over repeated transactions', () => {
    const ledger = createLedger();
    ledger.createAccount('bank');
    ledger.createAccount('p1');
    ledger.createAccount('p2');

    ledger.mint('bank', LARGE_SUPPLY);

    const checkpoints: bigint[] = [];
    checkpoints.push(ledger.commonsFundBalance());

    ledger.transfer('bank', 'p1', kalonToMicro(1_000n));
    checkpoints.push(ledger.commonsFundBalance());

    ledger.transfer('bank', 'p2', kalonToMicro(1_000n));
    checkpoints.push(ledger.commonsFundBalance());

    ledger.transfer('p1', 'p2', kalonToMicro(250n));
    checkpoints.push(ledger.commonsFundBalance());

    expect(checkpoints[1]).toBeGreaterThanOrEqual(checkpoints[0] ?? 0n);
    expect(checkpoints[2]).toBeGreaterThanOrEqual(checkpoints[1] ?? 0n);
    expect(checkpoints[3]).toBeGreaterThanOrEqual(checkpoints[2] ?? 0n);
  });

  it('exposes account existence and optional balances for onboarding flow', () => {
    const ledger = createLedger();

    expect(ledger.accountExists('newcomer')).toBe(false);
    expect(ledger.tryGetBalance('newcomer')).toBeUndefined();

    ledger.createAccount('newcomer');
    ledger.mint('newcomer', kalonToMicro(42n));

    expect(ledger.accountExists('newcomer')).toBe(true);
    expect(ledger.tryGetBalance('newcomer')).toBe(kalonToMicro(42n));
  });

  it('prevents self-transfer with structured error code', () => {
    const ledger = createLedger();
    ledger.createAccount('solo');
    ledger.mint('solo', kalonToMicro(100n));

    try {
      ledger.transfer('solo', 'solo', kalonToMicro(10n));
      throw new Error('expected self transfer rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(KalonError);
      expect((error as KalonError).code).toBe('SELF_TRANSFER');
    }
  });

  it('rejects duplicate account creation with ACCOUNT_ALREADY_EXISTS', () => {
    const ledger = createLedger();
    ledger.createAccount('dup');

    try {
      ledger.createAccount('dup');
      throw new Error('expected duplicate account rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(KalonError);
      expect((error as KalonError).code).toBe('ACCOUNT_ALREADY_EXISTS');
    }
  });
});
