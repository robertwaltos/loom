/**
 * wallet-sync-system.ts — Bridges KalonLedger → WalletComponent.
 *
 * Hexagonal design: this system uses a LedgerPort interface,
 * not the nakama-fabric KalonLedger directly. At runtime,
 * the nakama adapter fulfills the port; in tests, a fake does.
 *
 * Each tick (at sync interval):
 *   1. Finds all entities with WalletComponent
 *   2. Reads current balance from ledger port
 *   3. If balance changed → updates WalletComponent + emits event
 *
 * Also provides:
 *   - initializeWallet: creates ledger account + WalletComponent
 *   - transfer: executes ledger transfer + syncs both wallets
 *   - getBalance: fast ECS read (no ledger call)
 *
 * Runs at priority 50 — before movement (100) so gameplay
 * systems always see fresh balances.
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';
import type { EntityId, WalletComponent } from '@loom/entities-contracts';

// ── Constants ───────────────────────────────────────────────────

/** Priority: before movement (100) — economy state is fresh for gameplay. */
export const WALLET_SYNC_PRIORITY = 50;

/** Ticks between ledger sync (balance doesn't change every tick). */
export const SYNC_INTERVAL_TICKS = 10;

// ── Ports ───────────────────────────────────────────────────────

/**
 * Port to the KALON ledger. Adapts nakama-fabric's KalonLedger
 * into a minimal interface for the sync system.
 *
 * All amounts in micro-KALON (bigint).
 */
export interface LedgerPort {
  /** Create an account. Returns true if created, false if exists. */
  createAccount(accountId: string, initialBalance?: bigint): boolean;
  /** Get current balance. Returns 0n for unknown accounts. */
  getBalance(accountId: string): bigint;
  /** Transfer between accounts. Returns success/failure. */
  transfer(from: string, to: string, amount: bigint): TransferPortResult;
}

export interface TransferPortResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/** Port for external systems to observe balance changes. */
export interface WalletEventSink {
  onBalanceChanged(event: WalletBalanceChange): void;
}

export interface WalletBalanceChange {
  readonly entityId: EntityId;
  readonly accountId: string;
  readonly previousBalance: bigint;
  readonly newBalance: bigint;
  readonly delta: bigint;
  readonly reason: string;
  readonly timestamp: number;
}

// ── Deps ────────────────────────────────────────────────────────

export interface WalletSyncDeps {
  readonly componentStore: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly ledger: LedgerPort;
  readonly eventSink?: WalletEventSink;
}

// ── Service Interface ───────────────────────────────────────────

export interface WalletSyncService {
  /** The tick system function — register in SystemRegistry. */
  readonly system: SystemFn;

  /** Initialize a wallet for an entity (creates ledger account + component). */
  initializeWallet(entityId: EntityId, accountId: string, initialBalance?: bigint): boolean;

  /** Transfer KALON between two entities. Syncs both wallets immediately. */
  transfer(fromEntityId: EntityId, toEntityId: EntityId, amount: bigint): TransferPortResult;

  /** Fast balance read from ECS (no ledger call). Returns 0n if no wallet. */
  getBalance(entityId: EntityId): bigint;

  /** Get number of wallets being tracked. */
  walletCount(): number;
}

// ── Factory ─────────────────────────────────────────────────────

export function createWalletSyncSystem(deps: WalletSyncDeps): WalletSyncService {
  const { componentStore: store, clock, ledger, eventSink } = deps;
  let ticksSinceLastSync = 0;

  function syncAllWallets(tickNumber: number): void {
    const walletEntities = store.findEntitiesWith('wallet');

    for (const entityId of walletEntities) {
      const wallet = store.tryGet<WalletComponent>(entityId, 'wallet');
      if (!wallet) continue;

      const ledgerBalance = ledger.getBalance(wallet.accountId);

      if (ledgerBalance !== wallet.balance) {
        const delta = ledgerBalance - wallet.balance;
        const previousBalance = wallet.balance;

        store.set(entityId, 'wallet', {
          accountId: wallet.accountId,
          balance: ledgerBalance,
          totalEarned: delta > 0n ? wallet.totalEarned + delta : wallet.totalEarned,
          totalSpent: delta < 0n ? wallet.totalSpent + (-delta) : wallet.totalSpent,
          lastSyncTick: tickNumber,
        } satisfies WalletComponent);

        eventSink?.onBalanceChanged({
          entityId,
          accountId: wallet.accountId,
          previousBalance,
          newBalance: ledgerBalance,
          delta,
          reason: 'sync',
          timestamp: clock.nowMicroseconds(),
        });
      }
    }
  }

  function system(context: SystemContext): void {
    ticksSinceLastSync++;
    if (ticksSinceLastSync >= SYNC_INTERVAL_TICKS) {
      ticksSinceLastSync = 0;
      syncAllWallets(context.tickNumber);
    }
  }

  function initializeWallet(
    entityId: EntityId,
    accountId: string,
    initialBalance: bigint = 0n,
  ): boolean {
    const created = ledger.createAccount(accountId, initialBalance);
    if (!created) return false;

    const balance = ledger.getBalance(accountId);

    store.set(entityId, 'wallet', {
      accountId,
      balance,
      totalEarned: balance,
      totalSpent: 0n,
      lastSyncTick: 0,
    } satisfies WalletComponent);

    return true;
  }

  function transfer(
    fromEntityId: EntityId,
    toEntityId: EntityId,
    amount: bigint,
  ): TransferPortResult {
    const fromWallet = store.tryGet<WalletComponent>(fromEntityId, 'wallet');
    const toWallet = store.tryGet<WalletComponent>(toEntityId, 'wallet');

    if (!fromWallet || !toWallet) {
      return { ok: false, reason: 'One or both entities have no wallet' };
    }

    const result = ledger.transfer(fromWallet.accountId, toWallet.accountId, amount);
    if (!result.ok) return result;

    // Immediate sync for both parties
    const now = clock.nowMicroseconds();
    const fromBalance = ledger.getBalance(fromWallet.accountId);
    const toBalance = ledger.getBalance(toWallet.accountId);

    store.set(fromEntityId, 'wallet', {
      accountId: fromWallet.accountId,
      balance: fromBalance,
      totalEarned: fromWallet.totalEarned,
      totalSpent: fromWallet.totalSpent + amount,
      lastSyncTick: 0,
    } satisfies WalletComponent);

    store.set(toEntityId, 'wallet', {
      accountId: toWallet.accountId,
      balance: toBalance,
      totalEarned: toWallet.totalEarned + amount,
      totalSpent: toWallet.totalSpent,
      lastSyncTick: 0,
    } satisfies WalletComponent);

    eventSink?.onBalanceChanged({
      entityId: fromEntityId,
      accountId: fromWallet.accountId,
      previousBalance: fromWallet.balance,
      newBalance: fromBalance,
      delta: -amount,
      reason: 'transfer',
      timestamp: now,
    });

    eventSink?.onBalanceChanged({
      entityId: toEntityId,
      accountId: toWallet.accountId,
      previousBalance: toWallet.balance,
      newBalance: toBalance,
      delta: amount,
      reason: 'transfer',
      timestamp: now,
    });

    return { ok: true };
  }

  function getBalance(entityId: EntityId): bigint {
    const wallet = store.tryGet<WalletComponent>(entityId, 'wallet');
    return wallet?.balance ?? 0n;
  }

  function walletCount(): number {
    return store.findEntitiesWith('wallet').length;
  }

  return {
    system,
    initializeWallet,
    transfer,
    getBalance,
    walletCount,
  };
}
