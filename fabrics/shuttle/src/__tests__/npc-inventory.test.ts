import { describe, it, expect } from 'vitest';
import { createNpcInventoryService, DEFAULT_INVENTORY_CONFIG } from '../npc-inventory.js';
import type { NpcInventoryDeps, NpcInventoryConfig } from '../npc-inventory.js';

function createDeps(): NpcInventoryDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'item-' + String(id++) },
  };
}

describe('NpcInventoryService — addItem / getItems', () => {
  it('adds an item to an npc inventory', () => {
    const svc = createNpcInventoryService(createDeps());
    const item = svc.addItem({
      npcId: 'npc-1',
      name: 'iron-sword',
      category: 'weapon',
      quantity: 1,
    });
    expect(item.itemId).toBe('item-0');
    expect(item.npcId).toBe('npc-1');
    expect(item.category).toBe('weapon');
    expect(item.quantity).toBe(1);
  });

  it('lists all items for an npc', () => {
    const svc = createNpcInventoryService(createDeps());
    svc.addItem({ npcId: 'npc-1', name: 'sword', category: 'weapon', quantity: 1 });
    svc.addItem({ npcId: 'npc-1', name: 'shield', category: 'armour', quantity: 1 });
    expect(svc.getItems('npc-1')).toHaveLength(2);
  });

  it('returns empty for unknown npc', () => {
    const svc = createNpcInventoryService(createDeps());
    expect(svc.getItems('ghost')).toHaveLength(0);
  });
});

describe('NpcInventoryService — removeItem', () => {
  it('removes an item from inventory', () => {
    const svc = createNpcInventoryService(createDeps());
    const item = svc.addItem({
      npcId: 'npc-1',
      name: 'potion',
      category: 'consumable',
      quantity: 3,
    });
    expect(svc.removeItem('npc-1', item.itemId)).toBe(true);
    expect(svc.getItems('npc-1')).toHaveLength(0);
  });

  it('returns false for unknown item', () => {
    const svc = createNpcInventoryService(createDeps());
    expect(svc.removeItem('npc-1', 'nope')).toBe(false);
  });
});

describe('NpcInventoryService — getByCategory', () => {
  it('filters items by category', () => {
    const svc = createNpcInventoryService(createDeps());
    svc.addItem({ npcId: 'npc-1', name: 'sword', category: 'weapon', quantity: 1 });
    svc.addItem({ npcId: 'npc-1', name: 'axe', category: 'weapon', quantity: 1 });
    svc.addItem({ npcId: 'npc-1', name: 'plate', category: 'armour', quantity: 1 });
    const weapons = svc.getByCategory('npc-1', 'weapon');
    expect(weapons).toHaveLength(2);
  });
});

describe('NpcInventoryService — transfer', () => {
  it('transfers an item between npcs', () => {
    const svc = createNpcInventoryService(createDeps());
    const item = svc.addItem({ npcId: 'npc-1', name: 'gem', category: 'material', quantity: 5 });
    const result = svc.transfer('npc-1', 'npc-2', item.itemId);
    expect(result.success).toBe(true);
    expect(svc.getItems('npc-1')).toHaveLength(0);
    expect(svc.getItems('npc-2')).toHaveLength(1);
  });

  it('fails when source has no inventory', () => {
    const svc = createNpcInventoryService(createDeps());
    const result = svc.transfer('ghost', 'npc-2', 'item-x');
    expect(result.success).toBe(false);
  });

  it('fails when target inventory is full', () => {
    const config: NpcInventoryConfig = { maxItemsPerNpc: 1 };
    const svc = createNpcInventoryService(createDeps(), config);
    svc.addItem({ npcId: 'npc-2', name: 'rock', category: 'material', quantity: 1 });
    const item = svc.addItem({ npcId: 'npc-1', name: 'gem', category: 'material', quantity: 1 });
    const result = svc.transfer('npc-1', 'npc-2', item.itemId);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('target inventory full');
  });
});

describe('NpcInventoryService — getItemCount / getStats', () => {
  it('counts items for an npc', () => {
    const svc = createNpcInventoryService(createDeps());
    svc.addItem({ npcId: 'npc-1', name: 'a', category: 'tool', quantity: 1 });
    svc.addItem({ npcId: 'npc-1', name: 'b', category: 'tool', quantity: 1 });
    expect(svc.getItemCount('npc-1')).toBe(2);
    expect(svc.getItemCount('ghost')).toBe(0);
  });

  it('reports overall statistics', () => {
    const svc = createNpcInventoryService(createDeps());
    svc.addItem({ npcId: 'npc-1', name: 'a', category: 'tool', quantity: 3 });
    svc.addItem({ npcId: 'npc-2', name: 'b', category: 'weapon', quantity: 2 });
    const stats = svc.getStats();
    expect(stats.totalNpcs).toBe(2);
    expect(stats.totalItems).toBe(2);
    expect(stats.totalQuantity).toBe(5);
  });

  it('exports default config', () => {
    expect(DEFAULT_INVENTORY_CONFIG.maxItemsPerNpc).toBe(50);
  });
});
