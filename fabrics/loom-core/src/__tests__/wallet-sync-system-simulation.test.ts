/**
 * wallet-sync-system-simulation.test.ts
 *
 * Tests for the wallet-sync-system: ledger-backed KALON wallet management.
 * Verifies initialization, balance sync, transfers, event emission,
 * and the 10-tick sync interval.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentStore } from '../component-store.js';
import type { ComponentStore } from '../component-store.js';
import {
  createWalletSyncSystem,
  WALLET_SYNC_PRIORITY,
} from '../wallet-sync-system.js';
import type {
  LedgerPort,
  TransferPortResult,
  WalletEventSink,
  WalletBalanceChange,
  WalletSyncService,
  WalletSyncDeps,
} from '../wallet-sync-system.js';
import type { SystemContext } from '../system-registry.js';
import type { EntityId, WalletComponent } from '@loom/entities-contracts';

// ── Fakes ─────────────────────────────────────────────────────────

function createFakeLedger(): LedgerPort & { accounts: Map<string, bigint> } {
  const accounts = new Map<string, bigint>();

  return {
    accounts,
    createAccount(accountId: string, initialBalance: bigint = 0n): boolean {
      if (accounts.has(accountId)) return false;
      accounts.set(accountId, initialBalance);
      return true;
    },
    getBalance(accountId: string): bigint {
      return accounts.get(accountId) ?? 0n;
    },
    transfer(from: string, to: string, amount: bigint): TransferPortResult {
      const fromBal = accounts.get(from) ?? 0n;
      if (fromBal < amount) return { ok: false, reason: 'Insufficient balance' };
      accounts.set(from, fromBal - amount);
      accounts.set(to, (accounts.get(to) ?? 0n) + amount);
      return { ok: true };
    },
  };
}

function createFakeEventSink(): WalletEventSink & { events: WalletBalanceChange[] } {
  const events: WalletBalanceChange[] = [];
  return {
    events,
    onBalanceChanged(event: WalletBalanceChange): void {
      events.push(event);
    },
  };
}

function makeClock(startUs: number = 1_000_000): { nowMicroseconds: () => number; advance: (us: number) => void } {
  let now = startUs;
  return {
    nowMicroseconds: () => now,
    advance: (us: number) => { now += us; },
  };
}

function makeContext(tickNumber: number): SystemContext {
  return { deltaMs: 16.67, tickNumber, wallTimeMicroseconds: BigInt(tickNumber * 16667) };
}

function makeService(overrides: Partial<WalletSyncDeps> = {}): {
  service: WalletSyncService;
  store: ComponentStore;
  ledger: ReturnType<typeof createFakeLedger>;
  sink: ReturnType<typeof createFakeEventSink>;
  clock: ReturnType<typeof makeClock>;
} {
  const store = overrides.componentStore as ComponentStore ?? createComponentStore();
  const clock = (overrides.clock as ReturnType<typeof makeClock>) ?? makeClock();
  const ledger = (overrides.ledger as ReturnType<typeof createFakeLedger>) ?? createFakeLedger();
  const sink = createFakeEventSink();

  const service = createWalletSyncSystem({
    componentStore: store,
    clock,
    ledger,
    eventSink: overrides.eventSink ?? sink,
  });

  return { service, store, ledger, sink, clock };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Wallet Sync System', () => {
  // ── Constants ─────────────────────────────────────────────────

  describe('constants', () => {
    it('runs at priority 50', () => {
      expect(WALLET_SYNC_PRIORITY).toBe(50);
    });
  });

  // ── initializeWallet ──────────────────────────────────────────

  describe('initializeWallet', () => {
    it('creates a ledger account and wallet component', () => {
      const { service, store, ledger } = makeService();
      const entityId = 'e1' as EntityId;

      const result = service.initializeWallet(entityId, 'account-1', 5_000_000n);
      expect(result).toBe(true);

      const wallet = store.tryGet<WalletComponent>(entityId, 'wallet');
      expect(wallet).toBeDefined();
      expect(wallet!.accountId).toBe('account-1');
      expect(wallet!.balance).toBe(5_000_000n);
      expect(wallet!.totalEarned).toBe(5_000_000n);
      expect(wallet!.totalSpent).toBe(0n);
      expect(wallet!.lastSyncTick).toBe(0);
    });

    it('returns false if ledger account already exists', () => {
      const { service } = makeService();
      const entityId = 'e1' as EntityId;

      service.initializeWallet(entityId, 'account-1', 1_000_000n);
      const second = service.initializeWallet('e2' as EntityId, 'account-1', 2_000_000n);
      expect(second).toBe(false);
    });

    it('defaults initial balance to 0 if unspecified', () => {
      const { service, store } = makeService();
      const entityId = 'e1' as EntityId;

      service.initializeWallet(entityId, 'account-zero');

      const wallet = store.tryGet<WalletComponent>(entityId, 'wallet');
      expect(wallet!.balance).toBe(0n);
      expect(wallet!.totalEarned).toBe(0n);
    });

    it('increments walletCount', () => {
      const { service } = makeService();
      expect(service.walletCount()).toBe(0);

      service.initializeWallet('e1' as EntityId, 'a1', 100n);
      expect(service.walletCount()).toBe(1);

      service.initializeWallet('e2' as EntityId, 'a2', 200n);
      expect(service.walletCount()).toBe(2);
    });
  });

  // ── getBalance ────────────────────────────────────────────────

  describe('getBalance', () => {
    it('returns 0n for entity with no wallet', () => {
      const { service } = makeService();
      expect(service.getBalance('no-wallet' as EntityId)).toBe(0n);
    });

    it('returns balance from ECS (fast path)', () => {
      const { service } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 3_000_000n);
      expect(service.getBalance('e1' as EntityId)).toBe(3_000_000n);
    });
  });

  // ── transfer ──────────────────────────────────────────────────

  describe('transfer', () => {
    let service: WalletSyncService;
    let store: ComponentStore;
    let ledger: ReturnType<typeof createFakeLedger>;
    let sink: ReturnType<typeof createFakeEventSink>;
    let clock: ReturnType<typeof makeClock>;

    beforeEach(() => {
      const s = makeService();
      service = s.service;
      store = s.store;
      ledger = s.ledger;
      sink = s.sink;
      clock = s.clock;

      service.initializeWallet('sender' as EntityId, 'sender-acc', 10_000_000n);
      service.initializeWallet('receiver' as EntityId, 'receiver-acc', 0n);
    });

    it('transfers KALON between two entities', () => {
      const result = service.transfer('sender' as EntityId, 'receiver' as EntityId, 2_000_000n);
      expect(result.ok).toBe(true);

      expect(service.getBalance('sender' as EntityId)).toBe(8_000_000n);
      expect(service.getBalance('receiver' as EntityId)).toBe(2_000_000n);
    });

    it('updates totalSpent and totalEarned', () => {
      service.transfer('sender' as EntityId, 'receiver' as EntityId, 3_000_000n);

      const senderWallet = store.tryGet<WalletComponent>('sender' as EntityId, 'wallet');
      const receiverWallet = store.tryGet<WalletComponent>('receiver' as EntityId, 'wallet');

      expect(senderWallet!.totalSpent).toBe(3_000_000n);
      expect(receiverWallet!.totalEarned).toBe(3_000_000n);
    });

    it('emits balance-change events for both parties', () => {
      service.transfer('sender' as EntityId, 'receiver' as EntityId, 1_000_000n);

      expect(sink.events).toHaveLength(2);

      const senderEvent = sink.events.find(e => e.entityId === 'sender');
      expect(senderEvent).toBeDefined();
      expect(senderEvent!.delta).toBe(-1_000_000n);
      expect(senderEvent!.reason).toBe('transfer');

      const receiverEvent = sink.events.find(e => e.entityId === 'receiver');
      expect(receiverEvent).toBeDefined();
      expect(receiverEvent!.delta).toBe(1_000_000n);
    });

    it('fails if sender has insufficient funds', () => {
      const result = service.transfer('sender' as EntityId, 'receiver' as EntityId, 99_000_000n);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    it('fails if one entity has no wallet', () => {
      const result = service.transfer('sender' as EntityId, 'ghost' as EntityId, 100n);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('no wallet');
    });

    it('preserves sender totalEarned across transfers', () => {
      service.transfer('sender' as EntityId, 'receiver' as EntityId, 1_000_000n);
      const wallet = store.tryGet<WalletComponent>('sender' as EntityId, 'wallet');
      expect(wallet!.totalEarned).toBe(10_000_000n); // initial
    });

    it('handles multiple sequential transfers', () => {
      service.transfer('sender' as EntityId, 'receiver' as EntityId, 1_000_000n);
      service.transfer('sender' as EntityId, 'receiver' as EntityId, 2_000_000n);
      service.transfer('receiver' as EntityId, 'sender' as EntityId, 500_000n);

      expect(service.getBalance('sender' as EntityId)).toBe(7_500_000n);
      expect(service.getBalance('receiver' as EntityId)).toBe(2_500_000n);
    });
  });

  // ── Tick System (Sync Interval) ───────────────────────────────

  describe('tick system', () => {
    it('does not sync before 10 ticks', () => {
      const { service, ledger, store, sink } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000_000n);

      // Externally change ledger balance
      ledger.accounts.set('a1', 5_000_000n);

      // Run 9 ticks — should NOT sync
      for (let i = 1; i <= 9; i++) {
        service.system(makeContext(i));
      }

      const wallet = store.tryGet<WalletComponent>('e1' as EntityId, 'wallet');
      expect(wallet!.balance).toBe(1_000_000n); // unchanged
      expect(sink.events).toHaveLength(0);
    });

    it('syncs on the 10th tick', () => {
      const { service, ledger, store, sink, clock } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000_000n);

      ledger.accounts.set('a1', 5_000_000n);

      for (let i = 1; i <= 10; i++) {
        service.system(makeContext(i));
      }

      const wallet = store.tryGet<WalletComponent>('e1' as EntityId, 'wallet');
      expect(wallet!.balance).toBe(5_000_000n);
      expect(wallet!.lastSyncTick).toBe(10);
    });

    it('emits event when ledger balance increased during sync', () => {
      const { service, ledger, sink } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000_000n);

      ledger.accounts.set('a1', 3_000_000n);

      for (let i = 1; i <= 10; i++) {
        service.system(makeContext(i));
      }

      expect(sink.events).toHaveLength(1);
      expect(sink.events[0].delta).toBe(2_000_000n);
      expect(sink.events[0].reason).toBe('sync');
      expect(sink.events[0].previousBalance).toBe(1_000_000n);
      expect(sink.events[0].newBalance).toBe(3_000_000n);
    });

    it('tracks totalEarned on positive sync delta', () => {
      const { service, store, ledger } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000_000n);

      ledger.accounts.set('a1', 4_000_000n);

      for (let i = 1; i <= 10; i++) {
        service.system(makeContext(i));
      }

      const wallet = store.tryGet<WalletComponent>('e1' as EntityId, 'wallet');
      expect(wallet!.totalEarned).toBe(1_000_000n + 3_000_000n); // initial + delta
    });

    it('tracks totalSpent on negative sync delta', () => {
      const { service, store, ledger } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 5_000_000n);

      ledger.accounts.set('a1', 2_000_000n);

      for (let i = 1; i <= 10; i++) {
        service.system(makeContext(i));
      }

      const wallet = store.tryGet<WalletComponent>('e1' as EntityId, 'wallet');
      expect(wallet!.totalSpent).toBe(3_000_000n);
    });

    it('no event when ledger balance unchanged', () => {
      const { service, sink } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000_000n);

      for (let i = 1; i <= 10; i++) {
        service.system(makeContext(i));
      }

      expect(sink.events).toHaveLength(0);
    });

    it('syncs every 10 ticks repeatedly', () => {
      const { service, ledger, store } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 0n);

      ledger.accounts.set('a1', 100n);
      for (let i = 1; i <= 10; i++) service.system(makeContext(i));
      expect(store.tryGet<WalletComponent>('e1' as EntityId, 'wallet')!.balance).toBe(100n);

      ledger.accounts.set('a1', 500n);
      for (let i = 11; i <= 20; i++) service.system(makeContext(i));
      expect(store.tryGet<WalletComponent>('e1' as EntityId, 'wallet')!.balance).toBe(500n);
    });

    it('syncs multiple wallets in one pass', () => {
      const { service, ledger, store } = makeService();

      service.initializeWallet('e1' as EntityId, 'a1', 1_000n);
      service.initializeWallet('e2' as EntityId, 'a2', 2_000n);

      ledger.accounts.set('a1', 5_000n);
      ledger.accounts.set('a2', 8_000n);

      for (let i = 1; i <= 10; i++) service.system(makeContext(i));

      expect(store.tryGet<WalletComponent>('e1' as EntityId, 'wallet')!.balance).toBe(5_000n);
      expect(store.tryGet<WalletComponent>('e2' as EntityId, 'wallet')!.balance).toBe(8_000n);
    });
  });

  // ── No Event Sink ─────────────────────────────────────────────

  describe('without event sink', () => {
    it('works without an event sink', () => {
      const store = createComponentStore();
      const ledger = createFakeLedger();
      const clock = makeClock();

      const service = createWalletSyncSystem({
        componentStore: store,
        clock,
        ledger,
        // no eventSink
      });

      service.initializeWallet('e1' as EntityId, 'a1', 1_000_000n);
      service.transfer(
        'e1' as EntityId,
        'e2' as EntityId, // e2 has no wallet — will fail gracefully
        100n,
      );

      expect(service.getBalance('e1' as EntityId)).toBe(1_000_000n);
    });

    it('sync without sink does not throw', () => {
      const store = createComponentStore();
      const ledger = createFakeLedger();
      const clock = makeClock();

      const service = createWalletSyncSystem({
        componentStore: store,
        clock,
        ledger,
      });

      service.initializeWallet('e1' as EntityId, 'a1', 100n);
      ledger.accounts.set('a1', 999n);

      for (let i = 1; i <= 10; i++) {
        service.system(makeContext(i));
      }

      expect(service.getBalance('e1' as EntityId)).toBe(999n);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles zero-amount transfer', () => {
      const { service } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000n);
      service.initializeWallet('e2' as EntityId, 'a2', 500n);

      const result = service.transfer('e1' as EntityId, 'e2' as EntityId, 0n);
      expect(result.ok).toBe(true);
      expect(service.getBalance('e1' as EntityId)).toBe(1_000n);
      expect(service.getBalance('e2' as EntityId)).toBe(500n);
    });

    it('handles exact-balance transfer (drain to zero)', () => {
      const { service } = makeService();
      service.initializeWallet('e1' as EntityId, 'a1', 1_000n);
      service.initializeWallet('e2' as EntityId, 'a2', 0n);

      const result = service.transfer('e1' as EntityId, 'e2' as EntityId, 1_000n);
      expect(result.ok).toBe(true);
      expect(service.getBalance('e1' as EntityId)).toBe(0n);
      expect(service.getBalance('e2' as EntityId)).toBe(1_000n);
    });

    it('system is a valid SystemFn', () => {
      const { service } = makeService();
      expect(typeof service.system).toBe('function');
      // Should not throw with no wallets
      service.system(makeContext(1));
    });
  });
});
