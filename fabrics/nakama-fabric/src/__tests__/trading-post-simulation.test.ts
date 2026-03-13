import { describe, expect, it } from 'vitest';
import { createTradingPostSystem } from '../trading-post.js';

describe('trading-post simulation', () => {
  it('simulates market flow with listing, buy, sell, and summary growth', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createTradingPostSystem({
      clock: { nowMicroseconds: () => (now += 1_000n) },
      idGen: { generate: () => `tp-${++id}` },
      logger: { info: () => undefined },
    });

    const post = system.registerPost('Iron Gate', 'world-1', 'north', 500);
    if (typeof post === 'string') throw new Error('registerPost failed');
    system.registerTrader('dyn-a');
    system.registerTrader('dyn-b');
    system.listItem(post.postId, 'iron', 'Iron Ore', 100n, 50n);

    const buy = system.buy(post.postId, 'dyn-a', 'iron', 10n);
    expect(buy.success).toBe(true);
    const sell = system.sell(post.postId, 'dyn-b', 'coal', 'Coal', 20n, 30n);
    expect(sell.success).toBe(true);

    const summary = system.getPostSummary(post.postId);
    expect(summary?.totalTransactions).toBe(2);
    expect(summary?.totalItems).toBe(2);
  });
});
