import { describe, expect, it } from 'vitest';
import { createComponentStore } from '../component-store.js';

describe('component-store simulation', () => {
  it('simulates entity component lifecycle across set/get/remove operations', () => {
    const store = createComponentStore();
    const entity = 'entity-sim' as never;

    store.set(entity, 'transform', { x: 4, y: 5, z: 6 });
    store.set(entity, 'health', { current: 90, maximum: 100 });
    const hp = store.get(entity, 'health') as { current: number };
    store.remove(entity, 'transform');

    expect(hp.current).toBe(90);
    expect(store.has(entity, 'transform')).toBe(false);
    expect(store.listComponents(entity)).toContain('health');
  });
});
