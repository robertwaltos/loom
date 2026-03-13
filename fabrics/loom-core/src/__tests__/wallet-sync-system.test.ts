/**
 * wallet-sync-system.test.ts — Unit tests for WalletSyncSystem.
 *
 * Thread: silk/loom-core/wallet-sync-system
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import { createWalletSyncSystem, WALLET_SYNC_PRIORITY, SYNC_INTERVAL_TICKS } from '../wallet-sync-system.js';
import { createComponentStore } from '../component-store.js';
import type { WalletSyncService, LedgerPort, WalletEventSink, WalletBalanceChange } from '../wallet-sync-system.js';
import type { ComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';
import type { SystemContext } from '../system-registry.js';

// ── Fake Ledger ────────────────────────────────────────────────────

class FakeLedger implements LedgerPort {
  private readonly accounts = new Map<string, bigint>();

  createAccount(accountId: string, initialBalance: bigint = 0n): boolean {
    if (this.accounts.has(accountId)) return false;
    this.accounts.set(accountId, initialBalance);
    return true;
  }

  getBalance(accountId: string): bigint {
    return this.accounts.get(accountId) ?? 0n;
  }

  transfer(from: string, to: string, amount: bigint): { ok: boolean; reason?: string } {
    const fromBal = this.accounts.get(from) ?? 0n;
    const toBal = this.accounts.get(to) ?? 0n;
    if (fromBal < amount) return { ok: false, reason: 'insufficient funds' };
    this.accounts.set(from, fromBal - amount);
    this.accounts.set(to, toBal + amount);
    return { ok: true };
  }

  /** Test helper: manually set a balance to simulate external changes. */
  setBalance(accountId: string, balance: bigint): void {
    this.accounts.set(accountId, balance);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function entityId(raw: string): EntityId {
  return raw as EntityId;
}

const CTX = (tickNumber: number): SystemContext => ({
  deltaMs: 16,
  tickNumber,
  wallTimeMicroseconds: tickNumber * 16_000,
});

interface TestCtx {
  store: ComponentStore;
  ledger: FakeLedger;
  events: WalletBalanceChange[];
  wallet: WalletSyncService;
}

function makeCtx(): TestCtx {
  const store = createComponentStore();
  const ledger = new FakeLedger();
  const events: WalletBalanceChange[] = [];

  const eventSink: WalletEventSink = { onBalanceChanged: (e) => { events.push(e); } };

  const wallet = createWalletSyncSystem({
    componentStore: store,
    clock: { nowMicroseconds: () => 1_000_000 },
    ledger,
    eventSink,
  });

  return { store, ledger, events, wallet };
}

// ── Module-level constants ──────────────────────────────────────

describe('module constants', () => {
  it('WALLET_SYNC_PRIORITY is 50', () => {
    expect(WALLET_SYNC_PRIORITY).toBe(50);
  });
});

// ── initializeWallet ────────────────────────────────────────────

describe('initializeWallet', () => {
  it('returns true and creates wallet component', () => {
    const { wallet } = makeCtx();
    const entityA = entityId('entity-a');
    const created = wallet.initializeWallet(entityA, 'acct-a', 1_000n);
    expect(created).toBe(true);
    expect(wallet.getBalance(entityA)).toBe(1_000n);
  });

  it('returns false when account already exists', () => {
    const { wallet } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a', 500n);
    expect(wallet.initializeWallet(entityA, 'acct-a')).toBe(false);
  });

  it('initializes with zero balance by default', () => {
    const { wallet } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a');
    expect(wallet.getBalance(entityA)).toBe(0n);
  });

  it('increments walletCount', () => {
    const { wallet } = makeCtx();
    expect(wallet.walletCount()).toBe(0);
    wallet.initializeWallet(entityId('a'), 'acct-a');
    wallet.initializeWallet(entityId('b'), 'acct-b');
    expect(wallet.walletCount()).toBe(2);
  });
});

// ── getBalance ──────────────────────────────────────────────────

describe('getBalance', () => {
  it('returns 0n for entity with no wallet', () => {
    const { wallet } = makeCtx();
    expect(wallet.getBalance(entityId('no-wallet'))).toBe(0n);
  });

  it('reads from ECS component (no ledger round-trip)', () => {
    const { wallet, ledger } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a', 999n);
    // Mutate the ledger without triggering sync — ECS should still hold old value
    ledger.setBalance('acct-a', 1_234n);
    expect(wallet.getBalance(entityA)).toBe(999n); // ECS snapshot, not ledger
  });
});

// ── transfer ────────────────────────────────────────────────────

describe('transfer', () => {
  it('transfers KALON between two wallets', () => {
    const { wallet } = makeCtx();
    const alice = entityId('alice');
    const bob = entityId('bob');
    wallet.initializeWallet(alice, 'acct-alice', 1_000n);
    wallet.initializeWallet(bob, 'acct-bob', 0n);

    const result = wallet.transfer(alice, bob, 400n);
    expect(result.ok).toBe(true);
    expect(wallet.getBalance(alice)).toBe(600n);
    expect(wallet.getBalance(bob)).toBe(400n);
  });

  it('emits balance change events for both parties', () => {
    const { wallet, events } = makeCtx();
    const alice = entityId('alice');
    const bob = entityId('bob');
    wallet.initializeWallet(alice, 'acct-alice', 500n);
    wallet.initializeWallet(bob, 'acct-bob', 100n);

    wallet.transfer(alice, bob, 200n);
    const aliceEvt = events.find((e) => String(e.entityId) === 'alice');
    const bobEvt = events.find((e) => String(e.entityId) === 'bob');

    expect(aliceEvt).toBeDefined();
    expect(aliceEvt?.delta).toBe(-200n);
    expect(bobEvt).toBeDefined();
    expect(bobEvt?.delta).toBe(200n);
  });

  it('returns failure when sender has insufficient funds', () => {
    const { wallet } = makeCtx();
    const alice = entityId('alice');
    const bob = entityId('bob');
    wallet.initializeWallet(alice, 'acct-alice', 50n);
    wallet.initializeWallet(bob, 'acct-bob', 0n);

    const result = wallet.transfer(alice, bob, 100n);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('returns failure when source entity has no wallet', () => {
    const { wallet } = makeCtx();
    const bob = entityId('bob');
    wallet.initializeWallet(bob, 'acct-bob', 100n);

    const result = wallet.transfer(entityId('no-wallet'), bob, 10n);
    expect(result.ok).toBe(false);
  });

  it('updates totalSpent and totalEarned on ECS component', () => {
    const { wallet, store } = makeCtx();
    const alice = entityId('alice');
    const bob = entityId('bob');
    wallet.initializeWallet(alice, 'acct-alice', 1_000n);
    wallet.initializeWallet(bob, 'acct-bob', 0n);

    wallet.transfer(alice, bob, 300n);

    const aliceWallet = store.tryGet<{ totalSpent: bigint; totalEarned: bigint }>(alice, 'wallet');
    const bobWallet = store.tryGet<{ totalSpent: bigint; totalEarned: bigint }>(bob, 'wallet');

    expect(aliceWallet?.totalSpent).toBe(300n);
    expect(bobWallet?.totalEarned).toBe(300n);
  });
});

// ── system tick (sync interval) ─────────────────────────────────

describe('system tick', () => {
  it('syncs wallet balance from ledger on sync interval', () => {
    const { wallet, ledger } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a', 100n);

    // Simulate ledger balance changed externally (e.g. server-side grant)
    ledger.setBalance('acct-a', 500n);

    // Run ticks until sync fires (SYNC_INTERVAL_TICKS)
    for (let i = 1; i <= SYNC_INTERVAL_TICKS; i++) {
      wallet.system(CTX(i));
    }

    expect(wallet.getBalance(entityA)).toBe(500n);
  });

  it('does not sync before interval completes', () => {
    const { wallet, ledger } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a', 100n);
    ledger.setBalance('acct-a', 999n);

    // Run fewer ticks than interval
    for (let i = 1; i < SYNC_INTERVAL_TICKS; i++) {
      wallet.system(CTX(i));
    }

    expect(wallet.getBalance(entityA)).toBe(100n); // still old value
  });

  it('emits balance change event on sync when balance differs', () => {
    const { wallet, ledger, events } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a', 100n);
    ledger.setBalance('acct-a', 200n);

    for (let i = 1; i <= SYNC_INTERVAL_TICKS; i++) {
      wallet.system(CTX(i));
    }

    const evt = events.find((e) => e.reason === 'sync');
    expect(evt).toBeDefined();
    expect(evt?.delta).toBe(100n);
    expect(evt?.previousBalance).toBe(100n);
    expect(evt?.newBalance).toBe(200n);
  });

  it('does not emit when balance is unchanged', () => {
    const { wallet, events } = makeCtx();
    const entityA = entityId('entity-a');
    wallet.initializeWallet(entityA, 'acct-a', 100n);

    for (let i = 1; i <= SYNC_INTERVAL_TICKS; i++) {
      wallet.system(CTX(i));
    }

    expect(events).toHaveLength(0);
  });
});
