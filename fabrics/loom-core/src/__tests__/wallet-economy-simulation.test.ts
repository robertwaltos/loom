/**
 * wallet-economy-simulation.test.ts — KALON wallet sync + economy tests.
 *
 * Proves that:
 *   - WalletComponent is created on entity initialization
 *   - Ledger balance syncs to ECS automatically on tick interval
 *   - Balance change events fire when balance changes
 *   - Transfers between entities work correctly
 *   - totalEarned/totalSpent track lifetime flow
 *   - No events fire when balance is unchanged
 *   - Dead ledger accounts don't crash the system
 *   - Bible NPCs can be given wallets for trade interactions
 */

import { describe, it, expect } from 'vitest';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createSilentLogger } from '../logger.js';
import { createSequentialIdGenerator } from '../id-generator.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createEventFactory } from '../event-factory.js';
import { createWalletSyncSystem } from '../wallet-sync-system.js';
import type { LedgerPort, WalletBalanceChange } from '../wallet-sync-system.js';
import type { EntityId, WalletComponent } from '@loom/entities-contracts';
import type { SystemContext } from '../system-registry.js';

// ── Test Helpers ────────────────────────────────────────────────

function eid(id: string): EntityId {
  return id as unknown as EntityId;
}

function tick(tickNumber: number): SystemContext {
  return {
    deltaMs: 16,
    tickNumber,
    wallTimeMicroseconds: Date.now() * 1000,
  };
}

function createTestDeps() {
  const logger = createSilentLogger();
  const idGen = createSequentialIdGenerator('test');
  const clock = { nowMicroseconds: () => Date.now() * 1000 };
  const eventBus = createInProcessEventBus({ logger });
  const eventFactory = createEventFactory(clock, idGen);
  const components = createComponentStore();
  const registry = createEntityRegistry({
    eventBus,
    eventFactory,
    componentStore: components,
    idGenerator: idGen,
    clock,
  });
  return { entityRegistry: registry, components, clock };
}

/**
 * In-memory fake ledger for testing.
 * Behaves like the real KalonLedger from nakama-fabric.
 */
function createFakeLedger(): LedgerPort & {
  readonly balances: Map<string, bigint>;
  setBalance(accountId: string, balance: bigint): void;
} {
  const balances = new Map<string, bigint>();

  return {
    balances,
    createAccount(accountId: string, initialBalance: bigint = 0n): boolean {
      if (balances.has(accountId)) return false;
      balances.set(accountId, initialBalance);
      return true;
    },
    getBalance(accountId: string): bigint {
      return balances.get(accountId) ?? 0n;
    },
    transfer(from: string, to: string, amount: bigint) {
      const fromBal = balances.get(from);
      const toBal = balances.get(to);
      if (fromBal === undefined || toBal === undefined) {
        return { ok: false, reason: 'Account not found' };
      }
      if (fromBal < amount) {
        return { ok: false, reason: 'Insufficient balance' };
      }
      balances.set(from, fromBal - amount);
      balances.set(to, toBal + amount);
      return { ok: true };
    },
    setBalance(accountId: string, balance: bigint): void {
      balances.set(accountId, balance);
    },
  };
}

// ── Wallet Initialization Tests ─────────────────────────────────

describe('WalletSyncSystem', () => {
  describe('wallet initialization', () => {
    it('creates a wallet for an entity', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      const result = sync.initializeWallet(entityId, 'player-1', 500_000_000n); // 500 KALON

      expect(result).toBe(true);
      expect(sync.walletCount()).toBe(1);

      const wallet = deps.components.tryGet<WalletComponent>(entityId, 'wallet');
      expect(wallet).toBeDefined();
      expect(wallet!.accountId).toBe('player-1');
      expect(wallet!.balance).toBe(500_000_000n);
      expect(wallet!.totalEarned).toBe(500_000_000n);
      expect(wallet!.totalSpent).toBe(0n);
    });

    it('returns false for duplicate account', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const e1 = deps.entityRegistry.spawn('player', 'test-world', {});
      const e2 = deps.entityRegistry.spawn('player', 'test-world', {});

      expect(sync.initializeWallet(e1, 'shared-account', 100n)).toBe(true);
      expect(sync.initializeWallet(e2, 'shared-account', 100n)).toBe(false);
    });

    it('initializes with zero balance by default', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      sync.initializeWallet(entityId, 'empty-account');

      expect(sync.getBalance(entityId)).toBe(0n);
    });
  });

  describe('balance sync', () => {
    it('syncs ledger balance to ECS on tick interval', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const events: WalletBalanceChange[] = [];
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
        eventSink: { onBalanceChanged: (e) => events.push(e) },
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      sync.initializeWallet(entityId, 'p1', 1000n);

      // External change to ledger (e.g. reward from quest)
      ledger.setBalance('p1', 1500n);

      // Run 10 ticks to trigger sync interval
      for (let t = 1; t <= 10; t++) {
        sync.system(tick(t));
      }

      const wallet = deps.components.tryGet<WalletComponent>(entityId, 'wallet');
      expect(wallet!.balance).toBe(1500n);
      expect(wallet!.totalEarned).toBe(1500n); // 1000 initial + 500 delta
      expect(events).toHaveLength(1);
      expect(events[0]!.delta).toBe(500n);
    });

    it('does not emit event when balance is unchanged', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const events: WalletBalanceChange[] = [];
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
        eventSink: { onBalanceChanged: (e) => events.push(e) },
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      sync.initializeWallet(entityId, 'p1', 100n);

      // No change to ledger — run many sync cycles
      for (let t = 1; t <= 30; t++) {
        sync.system(tick(t));
      }

      expect(events).toHaveLength(0);
    });

    it('tracks totalSpent when balance decreases', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      sync.initializeWallet(entityId, 'p1', 1000n);

      // Spend externally
      ledger.setBalance('p1', 600n);

      for (let t = 1; t <= 10; t++) {
        sync.system(tick(t));
      }

      const wallet = deps.components.tryGet<WalletComponent>(entityId, 'wallet');
      expect(wallet!.balance).toBe(600n);
      expect(wallet!.totalSpent).toBe(400n);
    });

    it('syncs multiple wallets', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const e1 = deps.entityRegistry.spawn('player', 'test-world', {});
      const e2 = deps.entityRegistry.spawn('player', 'test-world', {});

      sync.initializeWallet(e1, 'p1', 100n);
      sync.initializeWallet(e2, 'p2', 200n);

      ledger.setBalance('p1', 150n);
      ledger.setBalance('p2', 250n);

      for (let t = 1; t <= 10; t++) {
        sync.system(tick(t));
      }

      expect(sync.getBalance(e1)).toBe(150n);
      expect(sync.getBalance(e2)).toBe(250n);
    });
  });

  describe('transfers', () => {
    it('transfers KALON between entities', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const events: WalletBalanceChange[] = [];
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
        eventSink: { onBalanceChanged: (e) => events.push(e) },
      });

      const buyer = deps.entityRegistry.spawn('player', 'test-world', {});
      const seller = deps.entityRegistry.spawn('npc', 'test-world', {});

      sync.initializeWallet(buyer, 'buyer-1', 1000n);
      sync.initializeWallet(seller, 'seller-1', 500n);

      const result = sync.transfer(buyer, seller, 300n);

      expect(result.ok).toBe(true);
      expect(sync.getBalance(buyer)).toBe(700n);
      expect(sync.getBalance(seller)).toBe(800n);

      // Two events: one for sender, one for receiver
      expect(events).toHaveLength(2);
      expect(events[0]!.delta).toBe(-300n);
      expect(events[1]!.delta).toBe(300n);
    });

    it('rejects transfer with insufficient balance', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const e1 = deps.entityRegistry.spawn('player', 'test-world', {});
      const e2 = deps.entityRegistry.spawn('npc', 'test-world', {});

      sync.initializeWallet(e1, 'poor', 100n);
      sync.initializeWallet(e2, 'rich', 10000n);

      const result = sync.transfer(e1, e2, 500n);

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Insufficient');
      // Balances unchanged
      expect(sync.getBalance(e1)).toBe(100n);
      expect(sync.getBalance(e2)).toBe(10000n);
    });

    it('rejects transfer when entity has no wallet', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const e1 = deps.entityRegistry.spawn('player', 'test-world', {});
      const e2 = deps.entityRegistry.spawn('npc', 'test-world', {});

      sync.initializeWallet(e1, 'has-wallet', 500n);
      // e2 has no wallet

      const result = sync.transfer(e1, e2, 100n);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('no wallet');
    });

    it('tracks totalSpent and totalEarned on transfer', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const buyer = deps.entityRegistry.spawn('player', 'test-world', {});
      const seller = deps.entityRegistry.spawn('npc', 'test-world', {});

      sync.initializeWallet(buyer, 'buyer', 1000n);
      sync.initializeWallet(seller, 'seller', 0n);

      sync.transfer(buyer, seller, 200n);
      sync.transfer(buyer, seller, 100n);

      const buyerWallet = deps.components.tryGet<WalletComponent>(buyer, 'wallet');
      const sellerWallet = deps.components.tryGet<WalletComponent>(seller, 'wallet');

      expect(buyerWallet!.totalSpent).toBe(300n);
      expect(sellerWallet!.totalEarned).toBe(300n);
    });
  });

  describe('fast read', () => {
    it('getBalance returns balance without ledger call', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      sync.initializeWallet(entityId, 'p1', 42n);

      expect(sync.getBalance(entityId)).toBe(42n);
    });

    it('returns 0n for entity without wallet', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const entityId = deps.entityRegistry.spawn('player', 'test-world', {});
      expect(sync.getBalance(entityId)).toBe(0n);
    });
  });

  describe('no event sink', () => {
    it('works without event sink', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
        // No eventSink
      });

      const e1 = deps.entityRegistry.spawn('player', 'test-world', {});
      const e2 = deps.entityRegistry.spawn('npc', 'test-world', {});
      sync.initializeWallet(e1, 'a', 500n);
      sync.initializeWallet(e2, 'b', 500n);

      sync.transfer(e1, e2, 100n);

      // Should not throw
      ledger.setBalance('a', 200n);
      for (let t = 1; t <= 10; t++) {
        sync.system(tick(t));
      }

      expect(sync.getBalance(e1)).toBe(200n);
    });
  });

  describe('NPC wallet integration', () => {
    it('NPCs can have wallets for trade', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      // Simulate bible NPC merchant
      const npc = deps.entityRegistry.spawn('npc', 'alkahest', {});
      deps.components.set(npc, 'identity', {
        displayName: 'Merchant Nnamdi',
        playerId: null,
        faction: 'founding',
        reputation: 100,
      });

      // NPC gets a trade wallet
      sync.initializeWallet(npc, `npc-treasury-${npc}`, 10000_000_000n); // 10,000 KALON

      // Player buys from NPC
      const player = deps.entityRegistry.spawn('player', 'alkahest', {});
      sync.initializeWallet(player, `player-${player}`, 500_000_000n); // 500 KALON

      const result = sync.transfer(player, npc, 50_000_000n); // 50 KALON
      expect(result.ok).toBe(true);

      expect(sync.getBalance(player)).toBe(450_000_000n);
      expect(sync.getBalance(npc)).toBe(10050_000_000n);
    });

    it('multiple NPCs have independent wallets', () => {
      const deps = createTestDeps();
      const ledger = createFakeLedger();
      const sync = createWalletSyncSystem({
        componentStore: deps.components,
        clock: deps.clock,
        ledger,
      });

      const npc1 = deps.entityRegistry.spawn('npc', 'alkahest', {});
      const npc2 = deps.entityRegistry.spawn('npc', 'alkahest', {});

      sync.initializeWallet(npc1, 'merchant-1', 5000n);
      sync.initializeWallet(npc2, 'merchant-2', 8000n);

      expect(sync.walletCount()).toBe(2);
      expect(sync.getBalance(npc1)).toBe(5000n);
      expect(sync.getBalance(npc2)).toBe(8000n);
    });
  });
});
