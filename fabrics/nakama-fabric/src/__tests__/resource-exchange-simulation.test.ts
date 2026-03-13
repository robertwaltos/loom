/**
 * Resource Exchange - Simulation Tests
 *
 * Covers order validation, cancellation/refunds, matching,
 * depth/history queries, and aggregate stats behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  createResourceExchange,
  MAX_ORDERS_PER_DYNASTY,
  MIN_ORDER_SIZE,
  MAKER_FEE_BPS,
  TAKER_FEE_BPS,
  ALL_RESOURCES,
  type ExchangeDeps,
  type ResourceType,
} from '../resource-exchange.js';

function makeHarness() {
  let now = 1_000_000;
  let idCounter = 0;
  const balances = new Map<string, bigint>();
  const debits: Array<{ dynastyId: string; amount: bigint }> = [];
  const credits: Array<{ dynastyId: string; amount: bigint }> = [];

  const deps: ExchangeDeps = {
    clock: {
      nowMicroseconds: () => now,
    },
    idGenerator: {
      next: () => `ex-${++idCounter}`,
    },
    kalon: {
      debit: (dynastyId, amount) => {
        const bal = balances.get(dynastyId) ?? 0n;
        if (bal < amount) return false;
        balances.set(dynastyId, bal - amount);
        debits.push({ dynastyId, amount });
        return true;
      },
      credit: (dynastyId, amount) => {
        const bal = balances.get(dynastyId) ?? 0n;
        balances.set(dynastyId, bal + amount);
        credits.push({ dynastyId, amount });
      },
    },
  };

  const service = createResourceExchange(deps);

  return {
    service,
    balances,
    debits,
    credits,
    step: (delta: number) => {
      now += delta;
    },
  };
}

function seedBalance(map: Map<string, bigint>, dynastyId: string, amount: bigint) {
  map.set(dynastyId, amount);
}

describe('ResourceExchangeService', () => {
  it('exports expected constants and resources', () => {
    expect(MAX_ORDERS_PER_DYNASTY).toBe(50);
    expect(MIN_ORDER_SIZE).toBe(1);
    expect(MAKER_FEE_BPS).toBe(10n);
    expect(TAKER_FEE_BPS).toBe(25n);
    expect(ALL_RESOURCES.length).toBe(8);
  });

  it('rejects invalid quantity and invalid price orders', () => {
    const { service } = makeHarness();

    const badQty = service.placeOrder({
      dynastyId: 'd1',
      resource: 'energy',
      side: 'sell',
      pricePerUnit: 10n,
      quantity: 0,
    });
    const badPrice = service.placeOrder({
      dynastyId: 'd1',
      resource: 'energy',
      side: 'sell',
      pricePerUnit: 0n,
      quantity: 2,
    });

    expect(badQty).toBe('INVALID_QUANTITY');
    expect(badPrice).toBe('INVALID_PRICE');
  });

  it('rejects buy order when dynasty has insufficient funds', () => {
    const { service } = makeHarness();

    const result = service.placeOrder({
      dynastyId: 'buyer',
      resource: 'food',
      side: 'buy',
      pricePerUnit: 100n,
      quantity: 2,
    });

    expect(result).toBe('INSUFFICIENT_FUNDS');
  });

  it('places buy order and debits locked funds', () => {
    const { service, balances, debits } = makeHarness();
    seedBalance(balances, 'buyer', 10_000n);

    const order = service.placeOrder({
      dynastyId: 'buyer',
      resource: 'minerals',
      side: 'buy',
      pricePerUnit: 50n,
      quantity: 10,
    });

    expect(typeof order).toBe('object');
    if (typeof order === 'object') {
      expect(order.status).toBe('open');
      expect(order.filledQuantity).toBe(0);
    }
    expect(debits).toEqual([{ dynastyId: 'buyer', amount: 500n }]);
  });

  it('enforces max open orders per dynasty', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'heavy', 1_000_000n);

    for (let i = 0; i < MAX_ORDERS_PER_DYNASTY; i += 1) {
      const placed = service.placeOrder({
        dynastyId: 'heavy',
        resource: 'technology',
        side: 'buy',
        pricePerUnit: 1n,
        quantity: 1,
      });
      expect(typeof placed).toBe('object');
    }

    const overflow = service.placeOrder({
      dynastyId: 'heavy',
      resource: 'technology',
      side: 'buy',
      pricePerUnit: 1n,
      quantity: 1,
    });

    expect(overflow).toBe('MAX_ORDERS_REACHED');
  });

  it('cancels order only for owner and refunds remaining locked buy funds', () => {
    const { service, balances, credits } = makeHarness();
    seedBalance(balances, 'buyer', 1_000n);

    const created = service.placeOrder({
      dynastyId: 'buyer',
      resource: 'alloys',
      side: 'buy',
      pricePerUnit: 20n,
      quantity: 5,
    });
    expect(typeof created).toBe('object');
    if (typeof created !== 'object') return;

    expect(service.cancelOrder(created.orderId, 'other')).toBe('NOT_ORDER_OWNER');

    const cancelled = service.cancelOrder(created.orderId, 'buyer');
    expect(typeof cancelled).toBe('object');
    if (typeof cancelled === 'object') {
      expect(cancelled.status).toBe('cancelled');
    }
    expect(credits).toContainEqual({ dynastyId: 'buyer', amount: 100n });
  });

  it('returns terminal/cannot-find cancellation errors correctly', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'buyer', 1_000n);

    expect(service.cancelOrder('missing', 'buyer')).toBe('ORDER_NOT_FOUND');

    const created = service.placeOrder({
      dynastyId: 'buyer',
      resource: 'energy',
      side: 'buy',
      pricePerUnit: 10n,
      quantity: 2,
    });
    if (typeof created !== 'object') return;

    service.cancelOrder(created.orderId, 'buyer');
    expect(service.cancelOrder(created.orderId, 'buyer')).toBe('ALREADY_TERMINAL');
  });

  it('matches orders by price-time priority and records transaction fields', () => {
    const { service, balances, credits } = makeHarness();
    seedBalance(balances, 'buy-a', 10_000n);
    seedBalance(balances, 'buy-b', 10_000n);

    const firstBuy = service.placeOrder({ dynastyId: 'buy-a', resource: 'food', side: 'buy', pricePerUnit: 12n, quantity: 2 });
    const secondBuy = service.placeOrder({ dynastyId: 'buy-b', resource: 'food', side: 'buy', pricePerUnit: 12n, quantity: 2 });
    const sell = service.placeOrder({ dynastyId: 'sell-1', resource: 'food', side: 'sell', pricePerUnit: 10n, quantity: 3 });

    expect(typeof firstBuy).toBe('object');
    expect(typeof secondBuy).toBe('object');
    expect(typeof sell).toBe('object');

    const txns = service.matchOrders('food');
    expect(txns.length).toBe(2);
    expect(txns[0]?.buyerId).toBe('buy-a');
    expect(txns[0]?.sellerId).toBe('sell-1');
    expect(txns[0]?.pricePerUnit).toBe(10n);
    expect(txns[0]?.makerFee).toBeGreaterThanOrEqual(0n);
    expect(txns[0]?.takerFee).toBeGreaterThanOrEqual(0n);
    expect(credits.some((c) => c.dynastyId === 'sell-1')).toBe(true);
  });

  it('does not self-match orders from the same dynasty', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'self', 10_000n);

    service.placeOrder({ dynastyId: 'self', resource: 'medicine', side: 'buy', pricePerUnit: 100n, quantity: 1 });
    service.placeOrder({ dynastyId: 'self', resource: 'medicine', side: 'sell', pricePerUnit: 1n, quantity: 1 });

    const txns = service.matchOrders('medicine');
    expect(txns).toHaveLength(0);
  });

  it('supports partial fills and leaves partial orders active', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'buyer', 10_000n);

    const buy = service.placeOrder({ dynastyId: 'buyer', resource: 'textiles', side: 'buy', pricePerUnit: 5n, quantity: 10 });
    const sell = service.placeOrder({ dynastyId: 'seller', resource: 'textiles', side: 'sell', pricePerUnit: 5n, quantity: 4 });
    if (typeof buy !== 'object' || typeof sell !== 'object') return;

    const txns = service.matchOrders('textiles');
    expect(txns).toHaveLength(1);

    const updatedBuy = service.getOrder(buy.orderId);
    expect(updatedBuy?.status).toBe('partial');
    expect(updatedBuy?.filledQuantity).toBe(4);
  });

  it('returns order book and dynasty-specific order queries', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'buyer', 1000n);

    const created = service.placeOrder({ dynastyId: 'buyer', resource: 'luxuries', side: 'buy', pricePerUnit: 9n, quantity: 2 });
    if (typeof created !== 'object') return;

    const book = service.getOrderBook('luxuries');
    const byDynasty = service.getOrdersByDynasty('buyer');

    expect(book.some((order) => order.orderId === created.orderId)).toBe(true);
    expect(byDynasty.map((order) => order.orderId)).toContain(created.orderId);
    expect(service.getOrder(created.orderId)?.orderId).toBe(created.orderId);
  });

  it('records and limits price history results', () => {
    const { service, balances, step } = makeHarness();
    seedBalance(balances, 'buyer', 10000n);

    service.placeOrder({ dynastyId: 'buyer', resource: 'minerals', side: 'buy', pricePerUnit: 20n, quantity: 2 });
    step(10);
    service.placeOrder({ dynastyId: 'seller', resource: 'minerals', side: 'sell', pricePerUnit: 18n, quantity: 1 });
    service.matchOrders('minerals');
    step(10);
    service.placeOrder({ dynastyId: 'seller2', resource: 'minerals', side: 'sell', pricePerUnit: 19n, quantity: 1 });
    service.matchOrders('minerals');

    const all = service.getPriceHistory('minerals', 100);
    const lastOne = service.getPriceHistory('minerals', 1);

    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(lastOne).toHaveLength(1);
    expect(lastOne[0]?.timestamp).toBe(all[all.length - 1]?.timestamp);
  });

  it('aggregates market depth by price level for bids and asks', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'b1', 10000n);
    seedBalance(balances, 'b2', 10000n);

    service.placeOrder({ dynastyId: 'b1', resource: 'energy', side: 'buy', pricePerUnit: 7n, quantity: 3 });
    service.placeOrder({ dynastyId: 'b2', resource: 'energy', side: 'buy', pricePerUnit: 7n, quantity: 4 });
    service.placeOrder({ dynastyId: 's1', resource: 'energy', side: 'sell', pricePerUnit: 9n, quantity: 5 });

    const depth = service.getMarketDepth('energy');

    expect(depth.resource).toBe('energy');
    expect(depth.bids).toHaveLength(1);
    expect(depth.bids[0]?.totalQuantity).toBe(7);
    expect(depth.bids[0]?.orderCount).toBe(2);
    expect(depth.asks).toHaveLength(1);
  });

  it('returns empty collections for untouched resources', () => {
    const { service } = makeHarness();
    const resource = ALL_RESOURCES.find((r) => r !== 'energy') as ResourceType;

    expect(service.getOrderBook(resource)).toEqual([]);
    expect(service.getPriceHistory(resource, 5)).toEqual([]);
    expect(service.getMarketDepth(resource).bids).toEqual([]);
    expect(service.getMarketDepth(resource).asks).toEqual([]);
  });

  it('reports exchange stats after mixed lifecycle operations', () => {
    const { service, balances } = makeHarness();
    seedBalance(balances, 'buyer', 10000n);

    const buy = service.placeOrder({ dynastyId: 'buyer', resource: 'food', side: 'buy', pricePerUnit: 10n, quantity: 2 });
    const sell = service.placeOrder({ dynastyId: 'seller', resource: 'food', side: 'sell', pricePerUnit: 10n, quantity: 1 });
    if (typeof buy !== 'object' || typeof sell !== 'object') return;

    service.matchOrders('food');
    service.cancelOrder(buy.orderId, 'buyer');

    const stats = service.getStats();

    expect(stats.totalOrdersPlaced).toBe(2);
    expect(stats.totalTransactions).toBe(1);
    expect(stats.totalOrdersCancelled).toBe(1);
    expect(stats.totalOrdersFilled).toBeGreaterThanOrEqual(1);
    expect(stats.activeOrders).toBe(0);
  });
});
