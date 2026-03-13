import { beforeEach, describe, expect, it } from 'vitest';
import { createTradeEngine, type ProposalParams, type TradeEscrowPort } from '../trade-engine.js';

interface SimEscrow extends TradeEscrowPort {
  setBalance(accountId: string, amount: bigint): void;
}

function createEscrow(): SimEscrow {
  const balances = new Map<string, bigint>();
  const held = new Map<string, bigint>();

  return {
    hold: (accountId, amount) => {
      const bal = balances.get(accountId) ?? 0n;
      if (bal < amount) return false;
      balances.set(accountId, bal - amount);
      held.set(accountId, (held.get(accountId) ?? 0n) + amount);
      return true;
    },
    release: (accountId, amount) => {
      const current = held.get(accountId) ?? 0n;
      held.set(accountId, current - amount);
      balances.set(accountId, (balances.get(accountId) ?? 0n) + amount);
    },
    settle: (_fromId, toId, amount) => {
      balances.set(toId, (balances.get(toId) ?? 0n) + amount);
    },
    getBalance: (accountId) => balances.get(accountId) ?? 0n,
    setBalance: (accountId, amount) => {
      balances.set(accountId, amount);
    },
  };
}

describe('trade-engine simulation', () => {
  let nowUs: number;
  let escrow: SimEscrow;

  const advance = (deltaUs: number): void => {
    nowUs += deltaUs;
  };

  const baseProposal = (overrides?: Partial<ProposalParams>): ProposalParams => ({
    tradeId: 'trade-1',
    initiatorId: 'alice',
    counterpartyId: 'bob',
    offerAmount: 100n,
    requestAmount: 40n,
    memo: 'default memo',
    ...overrides,
  });

  beforeEach(() => {
    nowUs = 1_000_000;
    escrow = createEscrow();
  });

  it('runs a full two-way settlement cycle and updates balances predictably', () => {
    escrow.setBalance('alice', 1000n);
    escrow.setBalance('bob', 400n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
      config: { defaultExpirationUs: 500_000 },
    });

    const proposed = engine.propose(baseProposal({ tradeId: 'trade-cycle' }));
    expect(proposed.phase).toBe('proposed');
    expect(escrow.getBalance('alice')).toBe(900n);

    advance(10_000);
    const settled = engine.accept('trade-cycle');
    expect(settled.phase).toBe('settled');
    expect(settled.settledAt).toBe(nowUs);

    expect(escrow.getBalance('alice')).toBe(940n);
    expect(escrow.getBalance('bob')).toBe(460n);
  });

  it('settles gift-style trades where requestAmount is zero', () => {
    escrow.setBalance('alice', 250n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
    });

    engine.propose(baseProposal({ tradeId: 'gift', requestAmount: 0n, offerAmount: 80n }));
    const settled = engine.accept('gift');

    expect(settled.phase).toBe('settled');
    expect(escrow.getBalance('alice')).toBe(170n);
    expect(escrow.getBalance('bob')).toBe(80n);
  });

  it('rejects acceptance when counterparty cannot escrow requested amount', () => {
    escrow.setBalance('alice', 1000n);
    escrow.setBalance('bob', 10n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
    });

    engine.propose(baseProposal({ tradeId: 'insufficient-counterparty', requestAmount: 50n }));

    expect(() => engine.accept('insufficient-counterparty')).toThrow('Counterparty insufficient balance');

    const trade = engine.getTrade('insufficient-counterparty');
    expect(trade?.phase).toBe('proposed');
    expect(escrow.getBalance('alice')).toBe(900n);
    expect(escrow.getBalance('bob')).toBe(10n);
  });

  it('enforces proposal guards for duplicate id, self-trade, and non-positive offer', () => {
    escrow.setBalance('alice', 300n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
    });

    engine.propose(baseProposal({ tradeId: 'guard-1', offerAmount: 20n }));

    expect(() => engine.propose(baseProposal({ tradeId: 'guard-1', offerAmount: 25n }))).toThrow(
      'already exists',
    );
    expect(() =>
      engine.propose(baseProposal({ tradeId: 'guard-self', initiatorId: 'alice', counterpartyId: 'alice' })),
    ).toThrow('Cannot trade with self');
    expect(() => engine.propose(baseProposal({ tradeId: 'guard-zero', offerAmount: 0n }))).toThrow(
      'Offer amount must be positive',
    );
  });

  it('allows only participating accounts to cancel and releases initiator escrow', () => {
    escrow.setBalance('alice', 500n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
    });

    engine.propose(baseProposal({ tradeId: 'cancel-me', offerAmount: 120n }));
    expect(escrow.getBalance('alice')).toBe(380n);

    expect(() => engine.cancel('cancel-me', 'charlie')).toThrow('Only trade parties can cancel');

    const cancelled = engine.cancel('cancel-me', 'bob');
    expect(cancelled.phase).toBe('cancelled');
    expect(escrow.getBalance('alice')).toBe(500n);

    expect(() => engine.cancel('cancel-me', 'alice')).toThrow('already terminal');
  });

  it('expires trades after timeout and returns held offer funds', () => {
    escrow.setBalance('alice', 700n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
      config: { defaultExpirationUs: 100_000 },
    });

    engine.propose(baseProposal({ tradeId: 'expiring', offerAmount: 150n }));
    expect(escrow.getBalance('alice')).toBe(550n);

    advance(150_000);
    const trade = engine.getTrade('expiring');

    expect(trade?.phase).toBe('expired');
    expect(escrow.getBalance('alice')).toBe(700n);
  });

  it('sweeps only terminal trades and preserves active ones', () => {
    escrow.setBalance('alice', 1000n);
    escrow.setBalance('bob', 500n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
      config: { defaultExpirationUs: 100_000 },
    });

    engine.propose(baseProposal({ tradeId: 'settled-1' }));
    engine.accept('settled-1');

    engine.propose(baseProposal({ tradeId: 'cancelled-1', offerAmount: 70n }));
    engine.cancel('cancelled-1', 'alice');

    engine.propose(baseProposal({ tradeId: 'active-1', offerAmount: 30n }));

    const removed = engine.sweep();
    expect(removed).toBe(2);
    expect(engine.getTrade('settled-1')).toBeUndefined();
    expect(engine.getTrade('cancelled-1')).toBeUndefined();
    expect(engine.getTrade('active-1')?.phase).toBe('proposed');
  });

  it('tracks stats consistently across proposed, settled, cancelled, expired, and active counts', () => {
    escrow.setBalance('alice', 1000n);
    escrow.setBalance('bob', 500n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
      config: { defaultExpirationUs: 60_000 },
    });

    engine.propose(baseProposal({ tradeId: 'stats-settled' }));
    engine.accept('stats-settled');

    engine.propose(baseProposal({ tradeId: 'stats-cancelled', offerAmount: 40n }));
    engine.cancel('stats-cancelled', 'alice');

    engine.propose(baseProposal({ tradeId: 'stats-expired', offerAmount: 50n }));
    advance(100_000);
    engine.getTrade('stats-expired');

    engine.propose(baseProposal({ tradeId: 'stats-active', offerAmount: 35n }));

    const stats = engine.getStats();
    expect(stats.totalProposed).toBe(4);
    expect(stats.totalSettled).toBe(1);
    expect(stats.totalCancelled).toBe(1);
    expect(stats.totalExpired).toBe(1);
    expect(stats.activeTrades).toBe(1);
  });

  it('lists account-linked trades and active trades with expired states materialized on read', () => {
    escrow.setBalance('alice', 900n);
    escrow.setBalance('bob', 300n);
    escrow.setBalance('charlie', 400n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
      config: { defaultExpirationUs: 80_000 },
    });

    engine.propose(baseProposal({ tradeId: 'acct-a1', counterpartyId: 'bob', offerAmount: 60n }));
    engine.propose(baseProposal({ tradeId: 'acct-a2', counterpartyId: 'charlie', offerAmount: 70n }));

    advance(120_000);

    const aliceTrades = engine.listByAccount('alice');
    expect(aliceTrades).toHaveLength(2);
    expect(aliceTrades.every((trade) => trade.phase === 'expired')).toBe(true);

    const active = engine.listActive();
    expect(active).toHaveLength(0);
  });

  it('supports memo persistence and stable timestamp ordering for proposals', () => {
    escrow.setBalance('alice', 400n);

    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => nowUs },
    });

    const t1 = engine.propose(baseProposal({ tradeId: 'memo-1', memo: 'first memo', offerAmount: 20n }));
    advance(5_000);
    const t2 = engine.propose(baseProposal({ tradeId: 'memo-2', memo: 'second memo', offerAmount: 30n }));

    expect(t1.memo).toBe('first memo');
    expect(t2.memo).toBe('second memo');
    expect(t1.createdAt < t2.createdAt).toBe(true);
    expect(t1.expiresAt < t2.expiresAt).toBe(true);
  });
});
