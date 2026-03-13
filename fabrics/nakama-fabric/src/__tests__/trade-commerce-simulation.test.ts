import { describe, expect, it } from 'vitest';
import { createTradeCommerceEngine } from '../trade-commerce.js';

describe('trade-commerce simulation', () => {
  it('simulates listing, escrow acceptance, and successful delivery settlement', () => {
    let now = 1_000_000;
    let id = 0;
    const balances = new Map<string, bigint>([
      ['buyer-1', 50_000n],
      ['seller-1', 0n],
    ]);
    const engine = createTradeCommerceEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `tc-${++id}` },
      escrow: {
        hold: (from, amount) => {
          const b = balances.get(from) ?? 0n;
          if (b < amount) return false;
          balances.set(from, b - amount);
          return true;
        },
        release: (to, amount) => {
          balances.set(to, (balances.get(to) ?? 0n) + amount);
        },
        refund: (to, amount) => {
          balances.set(to, (balances.get(to) ?? 0n) + amount);
        },
      },
      feeCollector: { collectFee: () => undefined },
    });

    const offer = engine.createOffer({
      sellerId: 'seller-1',
      worldId: 'world-1',
      category: 'RESOURCES',
      itemDescription: 'Rare ore',
      priceKalon: 10_000n,
    });
    engine.acceptOffer(offer.offerId, 'buyer-1');
    const done = engine.confirmDelivery(offer.offerId);

    expect(done.phase).toBe('COMPLETED');
    expect(balances.get('seller-1')).toBeGreaterThan(0n);
  });
});
