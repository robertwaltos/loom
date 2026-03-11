import { describe, it, expect } from 'vitest';
import { createEntityTemplateRegistry } from '../entity-template.js';
import type { EntityTemplateDeps } from '../entity-template.js';

function makeDeps(): EntityTemplateDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'tpl-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('EntityTemplateRegistry — registration', () => {
  it('registers a template', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    const tpl = registry.register({
      name: 'Villager',
      category: 'npc',
      components: [
        { componentType: 'position', defaultData: '{"x":0,"y":0}' },
        { componentType: 'health', defaultData: '{"hp":100}' },
      ],
    });
    expect(tpl.templateId).toBe('tpl-1');
    expect(tpl.name).toBe('Villager');
    expect(tpl.components).toHaveLength(2);
  });

  it('registers with tags', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    const tpl = registry.register({
      name: 'Guard',
      category: 'npc',
      components: [],
      tags: ['hostile', 'armored'],
    });
    expect(tpl.tags).toEqual(['hostile', 'armored']);
  });

  it('retrieves by id', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    const tpl = registry.register({
      name: 'Tree',
      category: 'prop',
      components: [],
    });
    expect(registry.get(tpl.templateId)?.name).toBe('Tree');
  });

  it('returns undefined for unknown id', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    expect(registry.get('unknown')).toBeUndefined();
  });
});

describe('EntityTemplateRegistry — name lookup', () => {
  it('finds template by name', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    registry.register({ name: 'Merchant', category: 'npc', components: [] });
    const found = registry.findByName('Merchant');
    expect(found?.name).toBe('Merchant');
  });

  it('returns undefined for unknown name', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    expect(registry.findByName('unknown')).toBeUndefined();
  });
});

describe('EntityTemplateRegistry — unregister', () => {
  it('unregisters a template', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    const tpl = registry.register({
      name: 'Rock',
      category: 'prop',
      components: [],
    });
    expect(registry.unregister(tpl.templateId)).toBe(true);
    expect(registry.get(tpl.templateId)).toBeUndefined();
    expect(registry.findByName('Rock')).toBeUndefined();
  });

  it('returns false for unknown template', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    expect(registry.unregister('unknown')).toBe(false);
  });
});

describe('EntityTemplateRegistry — list and filter', () => {
  it('lists all templates', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    registry.register({ name: 'A', category: 'npc', components: [] });
    registry.register({ name: 'B', category: 'prop', components: [] });
    expect(registry.list()).toHaveLength(2);
  });

  it('filters by category', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    registry.register({ name: 'A', category: 'npc', components: [] });
    registry.register({ name: 'B', category: 'prop', components: [] });
    registry.register({ name: 'C', category: 'npc', components: [] });
    expect(registry.list({ category: 'npc' })).toHaveLength(2);
  });

  it('filters by tag', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    registry.register({
      name: 'A',
      category: 'npc',
      components: [],
      tags: ['hostile'],
    });
    registry.register({
      name: 'B',
      category: 'npc',
      components: [],
      tags: ['friendly'],
    });
    expect(registry.list({ tag: 'hostile' })).toHaveLength(1);
  });

  it('returns empty for non-matching filter', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    registry.register({ name: 'A', category: 'npc', components: [] });
    expect(registry.list({ category: 'vehicle' })).toHaveLength(0);
  });
});

describe('EntityTemplateRegistry — stats', () => {
  it('tracks aggregate statistics', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    registry.register({ name: 'A', category: 'npc', components: [] });
    registry.register({ name: 'B', category: 'prop', components: [] });
    const stats = registry.getStats();
    expect(stats.totalTemplates).toBe(2);
    expect(stats.categories).toBe(2);
  });

  it('starts with zero stats', () => {
    const registry = createEntityTemplateRegistry(makeDeps());
    const stats = registry.getStats();
    expect(stats.totalTemplates).toBe(0);
    expect(stats.categories).toBe(0);
  });
});
