import { describe, expect, it } from 'vitest';
import { createInventoryService } from '../inventory.js';

describe('inventory simulation', () => {
  const make = () => {
    let id = 0;
    let now = 1_000_000;
    return createInventoryService({
      idGenerator: { next: () => `item-${++id}` },
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });
  };

  it('simulates gathering, crafting consumption, and inter-dynasty transfers', () => {
    const inv = make();

    inv.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 80, maxStack: 100 });
    inv.addItem({ dynastyId: 'd1', itemType: 'wood', quantity: 45 });
    inv.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 50, maxStack: 100 });

    expect(inv.getItem('d1', 'ore')?.quantity).toBe(100);

    const consumed = inv.removeItem('d1', 'ore', 35);
    expect(consumed.removed).toBe(35);
    expect(consumed.remaining).toBe(65);

    const moved = inv.transfer('d1', 'd2', 'wood', 20);
    expect(moved.transferred).toBe(20);
    expect(moved.fromRemaining).toBe(25);
    expect(inv.getItem('d2', 'wood')?.quantity).toBe(20);

    expect(inv.hasItem('d1', 'ore', 60)).toBe(true);
    expect(inv.hasItem('d1', 'ore', 90)).toBe(false);
  });

  it('simulates cleanup and aggregate inventory stats over world tick', () => {
    const inv = make();

    inv.addItem({ dynastyId: 'd1', itemType: 'grain', quantity: 120 });
    inv.addItem({ dynastyId: 'd1', itemType: 'stone', quantity: 40 });
    inv.addItem({ dynastyId: 'd2', itemType: 'grain', quantity: 80 });

    const pre = inv.getStats();
    expect(pre.totalDynasties).toBe(2);
    expect(pre.totalItems).toBe(3);
    expect(pre.totalQuantity).toBe(240);

    const removedTypes = inv.clearInventory('d1');
    expect(removedTypes).toBe(2);
    expect(inv.getInventory('d1')).toEqual([]);

    const post = inv.getStats();
    expect(post.totalDynasties).toBe(1);
    expect(post.totalItems).toBe(1);
    expect(post.totalQuantity).toBe(80);
  });
});
