import { describe, it, expect } from 'vitest';
import { createTradingPostSystem, type TradingPostSystem } from '../trading-post.js';

function makeDeps() {
  let time = 1_000_000n;
  let idSeq = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000n) },
    idGen: { generate: () => `id-${String(++idSeq)}` },
    logger: { info: () => {} },
  };
}

function makeSystem(): TradingPostSystem {
  return createTradingPostSystem(makeDeps());
}

function makePopulatedSystem() {
  const system = makeSystem();
  const post = system.registerPost('Iron Gate', 'world-1', 'North District', 500) as {
    postId: string;
  };
  system.registerTrader('dynasty-alice');
  system.registerTrader('dynasty-bob');
  system.listItem(post.postId, 'iron-ore', 'Iron Ore', 100n, 50n);
  return { system, postId: post.postId };
}

// ── registerPost ──────────────────────────────────────────────────────────────

describe('registerPost', () => {
  it('creates a trading post', () => {
    const system = makeSystem();
    const result = system.registerPost('Market Square', 'world-1', 'Center', 200);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.name).toBe('Market Square');
      expect(result.active).toBe(true);
      expect(result.taxRateBps).toBe(200);
    }
  });

  it('rejects taxRateBps above 10000', () => {
    const system = makeSystem();
    expect(system.registerPost('X', 'w1', 'loc', 10001)).toBe('invalid-price');
  });

  it('accepts taxRateBps at boundary 10000', () => {
    const system = makeSystem();
    const result = system.registerPost('X', 'w1', 'loc', 10000);
    expect(typeof result).toBe('object');
  });

  it('accepts taxRateBps at 0', () => {
    const system = makeSystem();
    const result = system.registerPost('Free Market', 'w1', 'loc', 0);
    expect(typeof result).toBe('object');
  });

  it('rejects negative taxRateBps', () => {
    const system = makeSystem();
    expect(system.registerPost('X', 'w1', 'loc', -1)).toBe('invalid-price');
  });
});

// ── registerTrader ────────────────────────────────────────────────────────────

describe('registerTrader', () => {
  it('registers a trader', () => {
    const system = makeSystem();
    expect(system.registerTrader('dynasty-1').success).toBe(true);
  });

  it('returns already-registered for duplicate', () => {
    const system = makeSystem();
    system.registerTrader('dynasty-1');
    expect(system.registerTrader('dynasty-1')).toEqual({
      success: false,
      error: 'already-registered',
    });
  });
});

// ── listItem ──────────────────────────────────────────────────────────────────

describe('listItem', () => {
  it('lists an item in the post inventory', () => {
    const { system, postId } = makePopulatedSystem();
    const inv = system.getInventory(postId, 'iron-ore');
    expect(inv?.quantityAvailable).toBe(100n);
    expect(inv?.listPriceKalon).toBe(50n);
  });

  it('returns post-not-found for unknown post', () => {
    const system = makeSystem();
    expect(system.listItem('ghost', 'item', 'Item', 10n, 5n)).toBe('post-not-found');
  });

  it('returns invalid-price for priceKalon < 1', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.listItem(postId, 'item', 'Item', 10n, 0n)).toBe('invalid-price');
  });

  it('returns invalid-quantity for quantity < 1', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.listItem(postId, 'item', 'Item', 0n, 10n)).toBe('invalid-quantity');
  });

  it('accumulates quantity when re-listing same item', () => {
    const { system, postId } = makePopulatedSystem();
    system.listItem(postId, 'iron-ore', 'Iron Ore', 50n, 50n);
    const inv = system.getInventory(postId, 'iron-ore');
    expect(inv?.quantityAvailable).toBe(150n);
  });
});

// ── restock ───────────────────────────────────────────────────────────────────

describe('restock', () => {
  it('adds quantity to existing inventory', () => {
    const { system, postId } = makePopulatedSystem();
    system.restock(postId, 'iron-ore', 25n);
    expect(system.getInventory(postId, 'iron-ore')?.quantityAvailable).toBe(125n);
  });

  it('returns item-not-found for unlisted item', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.restock(postId, 'gold', 10n)).toEqual({
      success: false,
      error: 'item-not-found',
    });
  });

  it('returns post-not-found for unknown post', () => {
    const system = makeSystem();
    expect(system.restock('ghost', 'item', 10n)).toEqual({
      success: false,
      error: 'post-not-found',
    });
  });
});

// ── buy ───────────────────────────────────────────────────────────────────────

describe('buy', () => {
  it('executes a buy and deducts inventory', () => {
    const { system, postId } = makePopulatedSystem();
    const result = system.buy(postId, 'dynasty-alice', 'iron-ore', 10n);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.type).toBe('BUY');
      expect(result.transaction.quantity).toBe(10n);
    }
    expect(system.getInventory(postId, 'iron-ore')?.quantityAvailable).toBe(90n);
  });

  it('calculates tax correctly', () => {
    const { system, postId } = makePopulatedSystem();
    const result = system.buy(postId, 'dynasty-alice', 'iron-ore', 10n);
    if (result.success) {
      // 10 qty * 50 price * 500 bps / 10000 = 25
      expect(result.transaction.taxKalon).toBe(25n);
    }
  });

  it('returns insufficient-stock if quantity exceeds available', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.buy(postId, 'dynasty-alice', 'iron-ore', 101n)).toEqual({
      success: false,
      error: 'insufficient-stock',
    });
  });

  it('returns trader-not-found for unregistered trader', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.buy(postId, 'ghost-dynasty', 'iron-ore', 1n)).toEqual({
      success: false,
      error: 'trader-not-found',
    });
  });

  it('returns post-not-found for unknown post', () => {
    const system = makeSystem();
    system.registerTrader('dynasty-1');
    expect(system.buy('ghost', 'dynasty-1', 'iron-ore', 1n)).toEqual({
      success: false,
      error: 'post-not-found',
    });
  });
});

// ── sell ──────────────────────────────────────────────────────────────────────

describe('sell', () => {
  it('executes a sell and adds to inventory', () => {
    const { system, postId } = makePopulatedSystem();
    const result = system.sell(postId, 'dynasty-bob', 'coal', 'Coal', 20n, 30n);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.type).toBe('SELL');
      expect(result.transaction.quantity).toBe(20n);
    }
    expect(system.getInventory(postId, 'coal')?.quantityAvailable).toBe(20n);
  });

  it('returns invalid-price for offerPriceKalon < 1', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.sell(postId, 'dynasty-bob', 'coal', 'Coal', 5n, 0n)).toEqual({
      success: false,
      error: 'invalid-price',
    });
  });

  it('returns trader-not-found for unregistered trader', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.sell(postId, 'ghost', 'coal', 'Coal', 5n, 10n)).toEqual({
      success: false,
      error: 'trader-not-found',
    });
  });
});

// ── getPostSummary ────────────────────────────────────────────────────────────

describe('getPostSummary', () => {
  it('returns summary with totalVolumeKalon including tax', () => {
    const { system, postId } = makePopulatedSystem();
    system.buy(postId, 'dynasty-alice', 'iron-ore', 10n);
    const summary = system.getPostSummary(postId);
    expect(summary).toBeDefined();
    expect(summary?.totalTransactions).toBe(1);
    // volume = qty * price + tax = 500 + 25 = 525
    expect(summary?.totalVolumeKalon).toBe(525n);
  });

  it('returns undefined for unknown post', () => {
    const system = makeSystem();
    expect(system.getPostSummary('ghost')).toBeUndefined();
  });

  it('counts unique items in inventory', () => {
    const { system, postId } = makePopulatedSystem();
    system.listItem(postId, 'gold', 'Gold', 5n, 200n);
    const summary = system.getPostSummary(postId);
    expect(summary?.totalItems).toBe(2);
  });
});

// ── getTransactionHistory ─────────────────────────────────────────────────────

describe('getTransactionHistory', () => {
  it('returns all transactions when limit is 0', () => {
    const { system, postId } = makePopulatedSystem();
    system.buy(postId, 'dynasty-alice', 'iron-ore', 1n);
    system.buy(postId, 'dynasty-alice', 'iron-ore', 2n);
    expect(system.getTransactionHistory(postId, 0).length).toBe(2);
  });

  it('returns last N transactions when limit > 0', () => {
    const { system, postId } = makePopulatedSystem();
    system.buy(postId, 'dynasty-alice', 'iron-ore', 1n);
    system.buy(postId, 'dynasty-alice', 'iron-ore', 2n);
    system.buy(postId, 'dynasty-alice', 'iron-ore', 3n);
    const history = system.getTransactionHistory(postId, 2);
    expect(history.length).toBe(2);
    expect(history[1]?.quantity).toBe(3n);
  });

  it('returns empty array for post with no transactions', () => {
    const { system, postId } = makePopulatedSystem();
    expect(system.getTransactionHistory(postId, 10).length).toBe(0);
  });
});
