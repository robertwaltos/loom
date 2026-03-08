import { describe, it, expect } from 'vitest';
import { createTradeEngine, DEFAULT_TRADE_CONFIG } from '../trade-engine.js';
import type { TradeEscrowPort, ProposalParams } from '../trade-engine.js';

interface TestEscrow extends TradeEscrowPort {
  setBalance(id: string, amount: bigint): void;
}

function makeEscrow(): TestEscrow {
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
      const h = held.get(accountId) ?? 0n;
      held.set(accountId, h - amount);
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

interface TestDeps {
  readonly escrow: TestEscrow;
  readonly clock: { nowMicroseconds(): number };
}

function makeDeps(): TestDeps {
  let time = 1_000_000;
  return {
    escrow: makeEscrow(),
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

function makeProposal(overrides?: Partial<ProposalParams>): ProposalParams {
  return {
    tradeId: 'trade-1',
    initiatorId: 'alice',
    counterpartyId: 'bob',
    offerAmount: 100n,
    requestAmount: 50n,
    ...overrides,
  };
}

describe('TradeEngine — proposal', () => {
  it('creates a trade proposal', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine(deps);
    const trade = engine.propose(makeProposal());
    expect(trade.phase).toBe('proposed');
    expect(trade.initiatorId).toBe('alice');
    expect(trade.offerAmount).toBe(100n);
  });

  it('rejects duplicate trade id', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());
    expect(() => engine.propose(makeProposal())).toThrow('already exists');
  });

  it('rejects self-trade', () => {
    const engine = createTradeEngine(makeDeps());
    expect(() => engine.propose(makeProposal({ counterpartyId: 'alice' })))
      .toThrow('Cannot trade with self');
  });

  it('rejects zero offer amount', () => {
    const engine = createTradeEngine(makeDeps());
    expect(() => engine.propose(makeProposal({ offerAmount: 0n })))
      .toThrow('Offer amount must be positive');
  });

  it('rejects when insufficient escrow balance', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 10n);
    const engine = createTradeEngine(deps);
    expect(() => engine.propose(makeProposal({ offerAmount: 100n })))
      .toThrow('Insufficient balance');
  });
});

describe('TradeEngine — acceptance and settlement', () => {
  it('accepts and settles a trade', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    deps.escrow.setBalance('bob', 500n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());

    const settled = engine.accept('trade-1');
    expect(settled.phase).toBe('settled');
    expect(settled.settledAt).not.toBeNull();
  });

  it('settles one-way trade (gift)', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal({ requestAmount: 0n }));

    const settled = engine.accept('trade-1');
    expect(settled.phase).toBe('settled');
  });

  it('rejects accept on non-proposed trade', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    deps.escrow.setBalance('bob', 500n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());
    engine.accept('trade-1');

    expect(() => engine.accept('trade-1')).toThrow('not in proposed phase');
  });

  it('throws for unknown trade', () => {
    const engine = createTradeEngine(makeDeps());
    expect(() => engine.accept('unknown')).toThrow('not found');
  });
});

describe('TradeEngine — cancellation', () => {
  it('cancels a proposed trade', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());

    const cancelled = engine.cancel('trade-1', 'alice');
    expect(cancelled.phase).toBe('cancelled');
  });

  it('rejects cancel from non-party', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());

    expect(() => engine.cancel('trade-1', 'charlie'))
      .toThrow('Only trade parties can cancel');
  });

  it('rejects cancel on terminal trade', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    deps.escrow.setBalance('bob', 500n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());
    engine.accept('trade-1');

    expect(() => engine.cancel('trade-1', 'alice'))
      .toThrow('already terminal');
  });
});

describe('TradeEngine — expiration', () => {
  it('expires trade after timeout', () => {
    let time = 0;
    const escrow = makeEscrow();
    escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine({
      escrow,
      clock: { nowMicroseconds: () => { time += 1_000_000; return time; } },
      config: { defaultExpirationUs: 5_000_000 },
    });
    engine.propose(makeProposal());

    time += 10_000_000;
    const trade = engine.getTrade('trade-1');
    expect(trade?.phase).toBe('expired');
  });
});

describe('TradeEngine — queries', () => {
  it('lists trades by account', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    deps.escrow.setBalance('charlie', 1000n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal({ tradeId: 't-1' }));
    engine.propose(makeProposal({
      tradeId: 't-2', initiatorId: 'charlie', counterpartyId: 'alice',
    }));

    const aliceTrades = engine.listByAccount('alice');
    expect(aliceTrades).toHaveLength(2);
  });

  it('lists active trades only', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    deps.escrow.setBalance('bob', 500n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal({ tradeId: 't-1' }));
    engine.propose(makeProposal({ tradeId: 't-2' }));
    engine.accept('t-1');

    const active = engine.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.tradeId).toBe('t-2');
  });
});

describe('TradeEngine — sweep and stats', () => {
  it('sweeps terminal trades', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal());
    engine.cancel('trade-1', 'alice');

    const removed = engine.sweep();
    expect(removed).toBe(1);
    expect(engine.getTrade('trade-1')).toBeUndefined();
  });

  it('reports stats', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('alice', 1000n);
    deps.escrow.setBalance('bob', 500n);
    const engine = createTradeEngine(deps);
    engine.propose(makeProposal({ tradeId: 't-1' }));
    engine.propose(makeProposal({ tradeId: 't-2' }));
    engine.accept('t-1');
    engine.cancel('t-2', 'bob');

    const stats = engine.getStats();
    expect(stats.totalProposed).toBe(2);
    expect(stats.totalSettled).toBe(1);
    expect(stats.totalCancelled).toBe(1);
    expect(stats.activeTrades).toBe(0);
  });
});

describe('TradeEngine — config export', () => {
  it('exports default trade config', () => {
    expect(DEFAULT_TRADE_CONFIG.defaultExpirationUs).toBe(3_600_000_000);
  });
});
