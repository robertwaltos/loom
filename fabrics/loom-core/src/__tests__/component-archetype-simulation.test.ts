import { describe, expect, it } from 'vitest';
import { createArchetypeStore } from '../component-archetype.js';

describe('component-archetype simulation', () => {
  it('simulates archetype migration as components are added and removed', () => {
    let now = 1_000_000;
    const store = createArchetypeStore({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    store.addEntity('e-1');
    store.setComponent('e-1', 'position', { x: 1, y: 2 });
    store.setComponent('e-1', 'health', 100);
    store.removeComponent('e-1', 'position');

    const arch = store.getEntityArchetype('e-1');
    expect(arch?.componentTypes).toEqual(['health']);
    expect(store.getStats().totalMigrations).toBeGreaterThan(0);
  });
});
