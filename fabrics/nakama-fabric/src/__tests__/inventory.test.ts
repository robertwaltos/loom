import { describe, it, expect } from 'vitest';
import { createInventoryService } from '../inventory.js';
import type { InventoryDeps } from '../inventory.js';

function makeDeps(): InventoryDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'item-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('InventoryService — adding items', () => {
  it('adds an item to a dynasty inventory', () => {
    const svc = createInventoryService(makeDeps());
    const item = svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 10 });
    expect(item.itemType).toBe('ore');
    expect(item.quantity).toBe(10);
  });

  it('stacks items of the same type', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 10 });
    const item = svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 5 });
    expect(item.quantity).toBe(15);
  });

  it('respects max stack limit', () => {
    const svc = createInventoryService(makeDeps());
    const item = svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 200, maxStack: 100 });
    expect(item.quantity).toBe(100);
  });

  it('stores metadata', () => {
    const svc = createInventoryService(makeDeps());
    const item = svc.addItem({
      dynastyId: 'd1',
      itemType: 'sword',
      quantity: 1,
      metadata: { rarity: 'legendary' },
    });
    expect(item.metadata).toEqual({ rarity: 'legendary' });
  });
});

describe('InventoryService — removing items', () => {
  it('removes partial quantity', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 20 });
    const result = svc.removeItem('d1', 'ore', 5);
    expect(result.removed).toBe(5);
    expect(result.remaining).toBe(15);
  });

  it('removes entire item when quantity reaches zero', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 10 });
    svc.removeItem('d1', 'ore', 10);
    expect(svc.getItem('d1', 'ore')).toBeUndefined();
  });

  it('limits removal to available quantity', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 5 });
    const result = svc.removeItem('d1', 'ore', 20);
    expect(result.removed).toBe(5);
  });

  it('returns zero for unknown dynasty', () => {
    const svc = createInventoryService(makeDeps());
    const result = svc.removeItem('unknown', 'ore', 5);
    expect(result.removed).toBe(0);
  });
});

describe('InventoryService — transfers', () => {
  it('transfers items between dynasties', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'gold', quantity: 50 });
    const result = svc.transfer('d1', 'd2', 'gold', 20);
    expect(result.transferred).toBe(20);
    expect(result.fromRemaining).toBe(30);
    expect(result.toQuantity).toBe(20);
  });

  it('limits transfer to available quantity', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'gold', quantity: 10 });
    const result = svc.transfer('d1', 'd2', 'gold', 30);
    expect(result.transferred).toBe(10);
  });

  it('returns zero for missing source item', () => {
    const svc = createInventoryService(makeDeps());
    const result = svc.transfer('d1', 'd2', 'gold', 10);
    expect(result.transferred).toBe(0);
  });
});

describe('InventoryService — queries', () => {
  it('gets a specific item', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 5 });
    expect(svc.getItem('d1', 'ore')?.quantity).toBe(5);
  });

  it('returns undefined for unknown item', () => {
    const svc = createInventoryService(makeDeps());
    expect(svc.getItem('d1', 'void')).toBeUndefined();
  });

  it('lists all items for a dynasty', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 10 });
    svc.addItem({ dynastyId: 'd1', itemType: 'wood', quantity: 20 });
    expect(svc.getInventory('d1')).toHaveLength(2);
  });

  it('returns empty for unknown dynasty', () => {
    const svc = createInventoryService(makeDeps());
    expect(svc.getInventory('unknown')).toHaveLength(0);
  });

  it('checks if dynasty has enough of an item', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 15 });
    expect(svc.hasItem('d1', 'ore', 10)).toBe(true);
    expect(svc.hasItem('d1', 'ore', 20)).toBe(false);
  });
});

describe('InventoryService — clear and stats', () => {
  it('clears all items for a dynasty', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 10 });
    svc.addItem({ dynastyId: 'd1', itemType: 'wood', quantity: 20 });
    expect(svc.clearInventory('d1')).toBe(2);
    expect(svc.getInventory('d1')).toHaveLength(0);
  });

  it('tracks aggregate stats', () => {
    const svc = createInventoryService(makeDeps());
    svc.addItem({ dynastyId: 'd1', itemType: 'ore', quantity: 10 });
    svc.addItem({ dynastyId: 'd2', itemType: 'wood', quantity: 20 });
    const stats = svc.getStats();
    expect(stats.totalDynasties).toBe(2);
    expect(stats.totalItems).toBe(2);
    expect(stats.totalQuantity).toBe(30);
  });

  it('starts with zero stats', () => {
    const svc = createInventoryService(makeDeps());
    expect(svc.getStats().totalDynasties).toBe(0);
  });
});
