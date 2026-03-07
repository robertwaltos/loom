import { describe, it, expect } from 'vitest';
import { createComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';

const ENTITY_A = 'entity-a' as EntityId;
const ENTITY_B = 'entity-b' as EntityId;

describe('ComponentStore', () => {
  it('stores and retrieves components', () => {
    const store = createComponentStore();
    store.set(ENTITY_A, 'transform', { x: 1, y: 2, z: 3 });

    const result = store.get(ENTITY_A, 'transform') as { x: number };
    expect(result).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('throws on missing component with get()', () => {
    const store = createComponentStore();
    expect(() => {
      store.get(ENTITY_A, 'missing');
    }).toThrow('Component missing not found');
  });

  it('returns undefined with tryGet() for missing', () => {
    const store = createComponentStore();
    expect(store.tryGet(ENTITY_A, 'missing')).toBeUndefined();
  });

  it('checks component existence', () => {
    const store = createComponentStore();
    store.set(ENTITY_A, 'health', { current: 100 });

    expect(store.has(ENTITY_A, 'health')).toBe(true);
    expect(store.has(ENTITY_A, 'missing')).toBe(false);
    expect(store.has(ENTITY_B, 'health')).toBe(false);
  });

  it('removes a single component', () => {
    const store = createComponentStore();
    store.set(ENTITY_A, 'health', { current: 100 });

    expect(store.remove(ENTITY_A, 'health')).toBe(true);
    expect(store.has(ENTITY_A, 'health')).toBe(false);
  });

  it('removes all components for an entity', () => {
    const store = createComponentStore();
    store.set(ENTITY_A, 'health', { current: 100 });
    store.set(ENTITY_A, 'transform', { x: 0 });

    store.removeAll(ENTITY_A);
    expect(store.listComponents(ENTITY_A)).toHaveLength(0);
  });

  it('lists component types for an entity', () => {
    const store = createComponentStore();
    store.set(ENTITY_A, 'health', {});
    store.set(ENTITY_A, 'transform', {});

    const types = store.listComponents(ENTITY_A);
    expect(types).toContain('health');
    expect(types).toContain('transform');
    expect(types).toHaveLength(2);
  });

  it('finds entities with a specific component', () => {
    const store = createComponentStore();
    store.set(ENTITY_A, 'health', {});
    store.set(ENTITY_B, 'health', {});
    store.set(ENTITY_A, 'transform', {});

    const withHealth = store.findEntitiesWith('health');
    expect(withHealth).toContain(ENTITY_A);
    expect(withHealth).toContain(ENTITY_B);
    expect(withHealth).toHaveLength(2);
  });
});
