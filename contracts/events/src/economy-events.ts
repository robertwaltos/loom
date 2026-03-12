/**
 * Economy Events — KALON balance changes and trade notifications.
 *
 * These events bridge the nakama-fabric KalonLedger to the
 * event bus. Any system can subscribe to balance changes
 * for UI updates, achievement tracking, or audit logging.
 */

import type { LoomEvent } from './event.js';

/**
 * An entity's KALON balance changed (after wallet sync).
 */
export type BalanceChangedEvent = LoomEvent<
  'economy.balance.changed',
  {
    readonly entityId: string;
    readonly accountId: string;
    readonly previousBalance: bigint;
    readonly newBalance: bigint;
    readonly delta: bigint;
    readonly reason: BalanceChangeReason;
    readonly worldId: string;
  }
>;

export type BalanceChangeReason =
  | 'trade'
  | 'issuance'
  | 'levy'
  | 'grant'
  | 'reward'
  | 'penalty'
  | 'transfer'
  | 'sync';

/**
 * A trade between two entities was completed.
 */
export type TradeCompletedEvent = LoomEvent<
  'economy.trade.completed',
  {
    readonly buyerEntityId: string;
    readonly sellerEntityId: string;
    readonly amount: bigint;
    readonly itemDescription: string;
    readonly worldId: string;
  }
>;

/**
 * World issuance was distributed (periodic mint event).
 */
export type IssuanceDistributedEvent = LoomEvent<
  'economy.issuance.distributed',
  {
    readonly worldId: string;
    readonly totalMinted: bigint;
    readonly treasuryShare: bigint;
    readonly commonsShare: bigint;
    readonly genesisVaultShare: bigint;
  }
>;
