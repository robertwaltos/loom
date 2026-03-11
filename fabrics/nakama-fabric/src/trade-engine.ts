/**
 * Trade Engine — Player-to-player KALON trades with escrow settlement.
 *
 * Bible v1.2: Dynasties trade KALON directly. Trades follow a strict
 * lifecycle: proposed → accepted → settled (or cancelled/expired).
 * Funds are escrowed during the acceptance window to prevent
 * double-spending.
 *
 * Trade Lifecycle:
 *   proposed  → Initiator commits offer, funds held in escrow
 *   accepted  → Counterparty agrees, settlement begins
 *   settled   → Funds transferred, trade complete (terminal)
 *   cancelled → Either party cancelled before settlement (terminal)
 *   expired   → Acceptance window elapsed (terminal)
 */

// ─── Port Types ─────────────────────────────────────────────────────

export interface TradeEscrowPort {
  hold(accountId: string, amount: bigint): boolean;
  release(accountId: string, amount: bigint): void;
  settle(fromId: string, toId: string, amount: bigint): void;
  getBalance(accountId: string): bigint;
}

// ─── Types ───────────────────────────────────────────────────────────

export type TradePhase = 'proposed' | 'accepted' | 'settled' | 'cancelled' | 'expired';

export interface Trade {
  readonly tradeId: string;
  readonly initiatorId: string;
  readonly counterpartyId: string;
  readonly offerAmount: bigint;
  readonly requestAmount: bigint;
  readonly phase: TradePhase;
  readonly memo: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly settledAt: number | null;
}

export interface ProposalParams {
  readonly tradeId: string;
  readonly initiatorId: string;
  readonly counterpartyId: string;
  readonly offerAmount: bigint;
  readonly requestAmount: bigint;
  readonly memo?: string;
}

export interface TradeEngineConfig {
  readonly defaultExpirationUs: number;
}

export interface TradeEngineDeps {
  readonly escrow: TradeEscrowPort;
  readonly clock: { nowMicroseconds(): number };
  readonly config?: Partial<TradeEngineConfig>;
}

export interface TradeStats {
  readonly totalProposed: number;
  readonly totalSettled: number;
  readonly totalCancelled: number;
  readonly totalExpired: number;
  readonly activeTrades: number;
}

export interface TradeEngine {
  propose(params: ProposalParams): Trade;
  accept(tradeId: string): Trade;
  cancel(tradeId: string, cancelledBy: string): Trade;
  getTrade(tradeId: string): Trade | undefined;
  listByAccount(accountId: string): ReadonlyArray<Trade>;
  listActive(): ReadonlyArray<Trade>;
  sweep(): number;
  getStats(): TradeStats;
}

// ─── Constants ───────────────────────────────────────────────────────

const ONE_HOUR_US = 3_600_000_000;

export const DEFAULT_TRADE_CONFIG: TradeEngineConfig = {
  defaultExpirationUs: ONE_HOUR_US,
};

const TERMINAL_PHASES: ReadonlyArray<TradePhase> = ['settled', 'cancelled', 'expired'];

// ─── State ───────────────────────────────────────────────────────────

interface MutableTrade {
  readonly tradeId: string;
  readonly initiatorId: string;
  readonly counterpartyId: string;
  readonly offerAmount: bigint;
  readonly requestAmount: bigint;
  phase: TradePhase;
  readonly memo: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  settledAt: number | null;
}

interface EngineState {
  readonly trades: Map<string, MutableTrade>;
  readonly escrow: TradeEscrowPort;
  readonly clock: { nowMicroseconds(): number };
  readonly config: TradeEngineConfig;
  totalProposed: number;
  totalSettled: number;
  totalCancelled: number;
  totalExpired: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createTradeEngine(deps: TradeEngineDeps): TradeEngine {
  const config = mergeConfig(deps.config);
  const state: EngineState = {
    trades: new Map(),
    escrow: deps.escrow,
    clock: deps.clock,
    config,
    totalProposed: 0,
    totalSettled: 0,
    totalCancelled: 0,
    totalExpired: 0,
  };

  return {
    propose: (p) => proposeImpl(state, p),
    accept: (tid) => acceptImpl(state, tid),
    cancel: (tid, by) => cancelImpl(state, tid, by),
    getTrade: (tid) => getTradeImpl(state, tid),
    listByAccount: (aid) => listByAccountImpl(state, aid),
    listActive: () => listActiveImpl(state),
    sweep: () => sweepImpl(state),
    getStats: () => computeStats(state),
  };
}

function mergeConfig(overrides?: Partial<TradeEngineConfig>): TradeEngineConfig {
  if (overrides === undefined) return DEFAULT_TRADE_CONFIG;
  return {
    defaultExpirationUs: overrides.defaultExpirationUs ?? DEFAULT_TRADE_CONFIG.defaultExpirationUs,
  };
}

// ─── Propose ────────────────────────────────────────────────────────

function validateProposal(state: EngineState, params: ProposalParams): void {
  if (state.trades.has(params.tradeId)) {
    throw new Error('Trade ' + params.tradeId + ' already exists');
  }
  if (params.initiatorId === params.counterpartyId) {
    throw new Error('Cannot trade with self');
  }
  if (params.offerAmount <= 0n) {
    throw new Error('Offer amount must be positive');
  }
}

function proposeImpl(state: EngineState, params: ProposalParams): Trade {
  validateProposal(state, params);
  const held = state.escrow.hold(params.initiatorId, params.offerAmount);
  if (!held) {
    throw new Error('Insufficient balance for escrow');
  }
  const now = state.clock.nowMicroseconds();
  const trade: MutableTrade = {
    tradeId: params.tradeId,
    initiatorId: params.initiatorId,
    counterpartyId: params.counterpartyId,
    offerAmount: params.offerAmount,
    requestAmount: params.requestAmount,
    phase: 'proposed',
    memo: params.memo ?? '',
    createdAt: now,
    expiresAt: now + state.config.defaultExpirationUs,
    settledAt: null,
  };
  state.trades.set(params.tradeId, trade);
  state.totalProposed++;
  return toReadonly(trade);
}

// ─── Accept ─────────────────────────────────────────────────────────

function acceptImpl(state: EngineState, tradeId: string): Trade {
  const trade = getActiveTrade(state, tradeId);
  if (trade.phase !== 'proposed') {
    throw new Error('Trade ' + tradeId + ' is not in proposed phase');
  }
  checkExpiry(state, trade);
  if (isTerminal(trade.phase)) {
    return toReadonly(trade);
  }
  if (trade.requestAmount > 0n) {
    const held = state.escrow.hold(trade.counterpartyId, trade.requestAmount);
    if (!held) {
      throw new Error('Counterparty insufficient balance');
    }
    state.escrow.settle(trade.counterpartyId, trade.initiatorId, trade.requestAmount);
  }
  state.escrow.settle(trade.initiatorId, trade.counterpartyId, trade.offerAmount);
  trade.phase = 'settled';
  trade.settledAt = state.clock.nowMicroseconds();
  state.totalSettled++;
  return toReadonly(trade);
}

// ─── Cancel ─────────────────────────────────────────────────────────

function cancelImpl(state: EngineState, tradeId: string, cancelledBy: string): Trade {
  const trade = getActiveTrade(state, tradeId);
  if (isTerminal(trade.phase)) {
    throw new Error('Trade ' + tradeId + ' is already terminal');
  }
  const isParty = cancelledBy === trade.initiatorId || cancelledBy === trade.counterpartyId;
  if (!isParty) {
    throw new Error('Only trade parties can cancel');
  }
  state.escrow.release(trade.initiatorId, trade.offerAmount);
  trade.phase = 'cancelled';
  state.totalCancelled++;
  return toReadonly(trade);
}

// ─── Queries ────────────────────────────────────────────────────────

function getTradeImpl(state: EngineState, tradeId: string): Trade | undefined {
  const trade = state.trades.get(tradeId);
  if (trade === undefined) return undefined;
  checkExpiry(state, trade);
  return toReadonly(trade);
}

function listByAccountImpl(state: EngineState, accountId: string): ReadonlyArray<Trade> {
  const results: Trade[] = [];
  for (const trade of state.trades.values()) {
    checkExpiry(state, trade);
    const involved = trade.initiatorId === accountId || trade.counterpartyId === accountId;
    if (involved) {
      results.push(toReadonly(trade));
    }
  }
  return results;
}

function listActiveImpl(state: EngineState): ReadonlyArray<Trade> {
  const results: Trade[] = [];
  for (const trade of state.trades.values()) {
    checkExpiry(state, trade);
    if (!isTerminal(trade.phase)) {
      results.push(toReadonly(trade));
    }
  }
  return results;
}

// ─── Sweep ──────────────────────────────────────────────────────────

function sweepImpl(state: EngineState): number {
  let removed = 0;
  const toRemove: string[] = [];
  for (const trade of state.trades.values()) {
    checkExpiry(state, trade);
    if (isTerminal(trade.phase)) {
      toRemove.push(trade.tradeId);
    }
  }
  for (const tid of toRemove) {
    state.trades.delete(tid);
    removed++;
  }
  return removed;
}

// ─── Expiry ─────────────────────────────────────────────────────────

function checkExpiry(state: EngineState, trade: MutableTrade): void {
  if (isTerminal(trade.phase)) return;
  const now = state.clock.nowMicroseconds();
  if (now >= trade.expiresAt) {
    state.escrow.release(trade.initiatorId, trade.offerAmount);
    trade.phase = 'expired';
    state.totalExpired++;
  }
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: EngineState): TradeStats {
  let activeTrades = 0;
  for (const trade of state.trades.values()) {
    checkExpiry(state, trade);
    if (!isTerminal(trade.phase)) {
      activeTrades++;
    }
  }
  return {
    totalProposed: state.totalProposed,
    totalSettled: state.totalSettled,
    totalCancelled: state.totalCancelled,
    totalExpired: state.totalExpired,
    activeTrades,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function getActiveTrade(state: EngineState, tradeId: string): MutableTrade {
  const trade = state.trades.get(tradeId);
  if (trade === undefined) {
    throw new Error('Trade ' + tradeId + ' not found');
  }
  return trade;
}

function isTerminal(phase: TradePhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

function toReadonly(trade: MutableTrade): Trade {
  return {
    tradeId: trade.tradeId,
    initiatorId: trade.initiatorId,
    counterpartyId: trade.counterpartyId,
    offerAmount: trade.offerAmount,
    requestAmount: trade.requestAmount,
    phase: trade.phase,
    memo: trade.memo,
    createdAt: trade.createdAt,
    expiresAt: trade.expiresAt,
    settledAt: trade.settledAt,
  };
}
