import { describe, it, expect } from 'vitest';
import { createTradeCommerceEngine, DEFAULT_COMMERCE_CONFIG } from '../trade-commerce.js';
import type {
  TradeCommerceEscrowPort,
  TradeFeePort,
  TradeCommerceDeps,
  CreateOfferParams,
} from '../trade-commerce.js';

// ── Test Helpers ───────────────────────────────────────────────────

interface TestEscrow extends TradeCommerceEscrowPort {
  readonly setBalance: (id: string, amount: bigint) => void;
  readonly getBalance: (id: string) => bigint;
}

function makeEscrow(): TestEscrow {
  const balances = new Map<string, bigint>();
  const held = new Map<string, bigint>();
  return {
    hold: (from, amount) => {
      const bal = balances.get(from) ?? 0n;
      if (bal < amount) return false;
      balances.set(from, bal - amount);
      held.set(from, (held.get(from) ?? 0n) + amount);
      return true;
    },
    release: (to, amount) => {
      balances.set(to, (balances.get(to) ?? 0n) + amount);
    },
    refund: (to, amount) => {
      balances.set(to, (balances.get(to) ?? 0n) + amount);
    },
    setBalance: (id, amount) => {
      balances.set(id, amount);
    },
    getBalance: (id) => balances.get(id) ?? 0n,
  };
}

function makeFeeCollector(): TradeFeePort & { readonly collected: bigint[] } {
  const collected: bigint[] = [];
  return {
    collectFee: (amount) => {
      collected.push(amount);
    },
    collected,
  };
}

function makeDeps(): TradeCommerceDeps & {
  readonly escrow: TestEscrow;
  readonly feeCollector: TradeFeePort & { readonly collected: bigint[] };
} {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { generate: () => 'offer-' + String(++idCounter) },
    escrow: makeEscrow(),
    feeCollector: makeFeeCollector(),
  };
}

function makeOfferParams(overrides?: Partial<CreateOfferParams>): CreateOfferParams {
  return {
    sellerId: 'seller-1',
    worldId: 'world-alpha',
    category: 'RESOURCES',
    itemDescription: 'Rare minerals from deep mines',
    priceKalon: 10000n,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('TradeCommerceEngine -- offer basics', () => {
  it('creates a listed offer', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    expect(offer.phase).toBe('LISTED');
    expect(offer.sellerId).toBe('seller-1');
    expect(offer.priceKalon).toBe(10000n);
    expect(offer.buyerId).toBeNull();
    expect(offer.category).toBe('RESOURCES');
  });

  it('generates unique offer IDs', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer1 = engine.createOffer(makeOfferParams());
    const offer2 = engine.createOffer(makeOfferParams());
    expect(offer1.offerId).not.toBe(offer2.offerId);
  });

  it('rejects empty item description', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    expect(() => engine.createOffer(makeOfferParams({ itemDescription: '' }))).toThrow(
      'Item description cannot be empty',
    );
  });

  it('supports all trade categories', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const categories = [
      'RESOURCES',
      'ARTIFACTS',
      'TERRITORY_RIGHTS',
      'SERVICES',
      'INFORMATION',
    ] as const;
    for (const category of categories) {
      const offer = engine.createOffer(makeOfferParams({ category }));
      expect(offer.category).toBe(category);
    }
  });
});

describe('TradeCommerceEngine -- price validation', () => {
  it('rejects price below minimum', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine({
      ...deps,
      config: { minPriceKalon: 100n },
    });
    expect(() => engine.createOffer(makeOfferParams({ priceKalon: 50n }))).toThrow(
      'Price below minimum',
    );
  });

  it('rejects price above maximum', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine({
      ...deps,
      config: { maxPriceKalon: 5000n },
    });
    expect(() => engine.createOffer(makeOfferParams({ priceKalon: 10000n }))).toThrow(
      'Price exceeds maximum',
    );
  });
});

describe('TradeCommerceEngine -- acceptance and escrow', () => {
  it('accepts an offer and puts buyer funds in escrow', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    const accepted = engine.acceptOffer(offer.offerId, 'buyer-1');
    expect(accepted.phase).toBe('ESCROW');
    expect(accepted.buyerId).toBe('buyer-1');
  });

  it('rejects acceptance when buyer has insufficient balance', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 100n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    expect(() => engine.acceptOffer(offer.offerId, 'buyer-1')).toThrow(
      'Buyer has insufficient balance',
    );
  });

  it('rejects seller buying own offer', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('seller-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    expect(() => engine.acceptOffer(offer.offerId, 'seller-1')).toThrow(
      'Seller cannot buy own offer',
    );
  });

  it('rejects acceptance of non-LISTED offer', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    expect(() => engine.acceptOffer(offer.offerId, 'buyer-2')).toThrow('is not LISTED');
  });

  it('throws for unknown offer', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    expect(() => engine.acceptOffer('unknown', 'buyer-1')).toThrow('not found');
  });
});

describe('TradeCommerceEngine -- delivery confirmation and fees', () => {
  it('completes trade on delivery with fee deducted', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams({ priceKalon: 10000n }));
    engine.acceptOffer(offer.offerId, 'buyer-1');
    const completed = engine.confirmDelivery(offer.offerId);
    expect(completed.phase).toBe('COMPLETED');
    expect(completed.completedAt).not.toBeNull();
    // 0.5% fee on 10000 = 50
    expect(deps.feeCollector.collected[0]).toBe(50n);
    // Seller receives 10000 - 50 = 9950
    expect(deps.escrow.getBalance('seller-1')).toBe(9950n);
  });

  it('rejects delivery on non-ESCROW offer', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    expect(() => engine.confirmDelivery(offer.offerId)).toThrow('is not in ESCROW');
  });

  it('records price history on completion', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(
      makeOfferParams({
        priceKalon: 5000n,
        category: 'ARTIFACTS',
        worldId: 'world-beta',
      }),
    );
    engine.acceptOffer(offer.offerId, 'buyer-1');
    engine.confirmDelivery(offer.offerId);
    const history = engine.getPriceHistory('ARTIFACTS', 'world-beta');
    expect(history).toHaveLength(1);
    expect(history[0]?.priceKalon).toBe(5000n);
  });
});

describe('TradeCommerceEngine -- cancellation', () => {
  it('cancels a listed offer', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    const cancelled = engine.cancelOffer(offer.offerId, 'seller-1');
    expect(cancelled.phase).toBe('CANCELLED');
  });

  it('refunds buyer on escrow cancellation', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams({ priceKalon: 10000n }));
    engine.acceptOffer(offer.offerId, 'buyer-1');
    engine.cancelOffer(offer.offerId, 'buyer-1');
    // Buyer should get refund
    expect(deps.escrow.getBalance('buyer-1')).toBe(50000n);
  });

  it('rejects cancel from non-party', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    expect(() => engine.cancelOffer(offer.offerId, 'stranger')).toThrow(
      'Only trade parties can cancel',
    );
  });

  it('rejects cancel on terminal offer', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.cancelOffer(offer.offerId, 'seller-1');
    expect(() => engine.cancelOffer(offer.offerId, 'seller-1')).toThrow('already terminal');
  });
});

describe('TradeCommerceEngine -- dispute filing', () => {
  it('disputes an escrowed offer', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    const disputed = engine.disputeOffer(offer.offerId, 'buyer-1');
    expect(disputed.phase).toBe('DISPUTED');
  });

  it('rejects dispute on non-ESCROW offer', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    expect(() => engine.disputeOffer(offer.offerId, 'seller-1')).toThrow(
      'Only ESCROW offers can be disputed',
    );
  });

  it('rejects dispute from non-party', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    expect(() => engine.disputeOffer(offer.offerId, 'stranger')).toThrow(
      'Only trade parties can file disputes',
    );
  });

  it('cannot cancel a disputed offer', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    engine.disputeOffer(offer.offerId, 'buyer-1');
    expect(() => engine.cancelOffer(offer.offerId, 'buyer-1')).toThrow(
      'Cannot cancel a disputed offer',
    );
  });
});

describe('TradeCommerceEngine -- dispute resolution', () => {
  it('resolves dispute with refund to buyer', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    engine.disputeOffer(offer.offerId, 'buyer-1');
    const resolved = engine.resolveDispute(offer.offerId, true);
    expect(resolved.phase).toBe('CANCELLED');
  });

  it('resolves dispute in favor of seller', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 50000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams({ priceKalon: 10000n }));
    engine.acceptOffer(offer.offerId, 'buyer-1');
    engine.disputeOffer(offer.offerId, 'seller-1');
    const resolved = engine.resolveDispute(offer.offerId, false);
    expect(resolved.phase).toBe('COMPLETED');
    expect(deps.feeCollector.collected).toHaveLength(1);
  });
});

describe('TradeCommerceEngine -- expiration', () => {
  it('expires listed offer after timeout', () => {
    let time = 0;
    const deps = makeDeps();
    const config = { defaultExpirationUs: 5_000_000 };
    const engine = createTradeCommerceEngine({
      ...deps,
      clock: {
        nowMicroseconds: () => {
          time += 1_000_000;
          return time;
        },
      },
      config,
    });
    const offer = engine.createOffer(makeOfferParams());
    time += 10_000_000;
    const retrieved = engine.getOffer(offer.offerId);
    expect(retrieved?.phase).toBe('EXPIRED');
  });
});

describe('TradeCommerceEngine -- queries', () => {
  it('lists offers by seller', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    engine.createOffer(makeOfferParams({ sellerId: 'alice' }));
    engine.createOffer(makeOfferParams({ sellerId: 'alice' }));
    engine.createOffer(makeOfferParams({ sellerId: 'bob' }));
    expect(engine.listBySeller('alice')).toHaveLength(2);
    expect(engine.listBySeller('bob')).toHaveLength(1);
  });

  it('lists offers by buyer', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 100000n);
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    expect(engine.listByBuyer('buyer-1')).toHaveLength(1);
  });

  it('lists offers by world', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    engine.createOffer(makeOfferParams({ worldId: 'w1' }));
    engine.createOffer(makeOfferParams({ worldId: 'w1' }));
    engine.createOffer(makeOfferParams({ worldId: 'w2' }));
    expect(engine.listByWorld('w1')).toHaveLength(2);
  });

  it('lists only active offers', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    engine.createOffer(makeOfferParams());
    const toCancel = engine.createOffer(makeOfferParams());
    engine.cancelOffer(toCancel.offerId, 'seller-1');
    expect(engine.listActive()).toHaveLength(1);
  });
});

describe('TradeCommerceEngine -- sweep and stats', () => {
  it('sweeps terminal offers', () => {
    const deps = makeDeps();
    const engine = createTradeCommerceEngine(deps);
    const offer = engine.createOffer(makeOfferParams());
    engine.cancelOffer(offer.offerId, 'seller-1');
    const removed = engine.sweep();
    expect(removed).toBe(1);
    expect(engine.getOffer(offer.offerId)).toBeUndefined();
  });

  it('reports comprehensive stats', () => {
    const deps = makeDeps();
    deps.escrow.setBalance('buyer-1', 100000n);
    const engine = createTradeCommerceEngine(deps);
    engine.createOffer(makeOfferParams());
    const offer = engine.createOffer(makeOfferParams());
    engine.acceptOffer(offer.offerId, 'buyer-1');
    engine.confirmDelivery(offer.offerId);
    const stats = engine.getStats();
    expect(stats.totalListed).toBe(2);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.activeTrades).toBe(1);
    expect(stats.totalFeesCollected).toBeGreaterThan(0n);
  });

  it('exports default commerce config', () => {
    expect(DEFAULT_COMMERCE_CONFIG.feeRateBasisPoints).toBe(50);
    expect(DEFAULT_COMMERCE_CONFIG.minPriceKalon).toBe(1n);
  });
});
