import { describe, expect, it } from 'vitest';
import { createNpcInventoryService } from '../npc-inventory.js';

describe('npc-inventory simulation', () => {
  it('simulates add-transfer-remove inventory lifecycle', () => {
    let now = 1_000;
    let id = 0;
    const svc = createNpcInventoryService({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `item-${id++}` },
    });

    const sword = svc.addItem({ npcId: 'npc-a', name: 'iron-sword', category: 'weapon', quantity: 1 });
    const transfer = svc.transfer('npc-a', 'npc-b', sword.itemId);
    expect(transfer.success).toBe(true);
    expect(svc.getItems('npc-a').length).toBe(0);
    expect(svc.getItems('npc-b').length).toBe(1);

    expect(svc.removeItem('npc-b', sword.itemId)).toBe(true);
    expect(svc.getStats().totalItems).toBe(0);
  });
});
