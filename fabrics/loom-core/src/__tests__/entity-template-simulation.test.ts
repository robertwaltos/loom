import { describe, expect, it } from 'vitest';
import { createEntityTemplateRegistry } from '../entity-template.js';

describe('entity-template simulation', () => {
  it('simulates template registration, lookup, filtering, and unregister flow', () => {
    let now = 1_000_000;
    let id = 0;
    const registry = createEntityTemplateRegistry({
      idGenerator: { next: () => `tpl-${++id}` },
      clock: { nowMicroseconds: () => (now += 10_000) },
    });

    const villager = registry.register({
      name: 'Villager',
      category: 'npc',
      tags: ['friendly'],
      components: [{ componentType: 'health', defaultData: '{"hp": 100}' }],
    });
    registry.register({ name: 'OakTree', category: 'prop', components: [] });

    expect(registry.findByName('Villager')?.templateId).toBe(villager.templateId);
    const npcTemplates = registry.list({ category: 'npc' });
    const removed = registry.unregister(villager.templateId);

    expect(npcTemplates).toHaveLength(1);
    expect(removed).toBe(true);
    expect(registry.getStats().totalTemplates).toBe(1);
  });
});
