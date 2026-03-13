import { describe, expect, it } from 'vitest';
import {
  createWorldSpecialReferenceRegistry,
  TOTAL_WORLD_SPECIAL_REFERENCES,
  WORLD_SPECIAL_REFERENCE_REGISTRY,
  WORLD_SPECIAL_REFERENCES,
} from '../world-special-reference-registry.js';

describe('createWorldSpecialReferenceRegistry', () => {
  const registry = createWorldSpecialReferenceRegistry();

  it('exports the supported special reference total', () => {
    expect(TOTAL_WORLD_SPECIAL_REFERENCES).toBe(4);
    expect(registry.totalReferences).toBe(4);
  });

  it('reuses the shared singleton reference dataset', () => {
    expect(registry.getAllReferences()).toBe(WORLD_SPECIAL_REFERENCES);
    expect(WORLD_SPECIAL_REFERENCE_REGISTRY.getAllReferences()).toBe(
      WORLD_SPECIAL_REFERENCES,
    );
  });

  it('recognizes the forgetting well as a special-space reference', () => {
    const reference = registry.getReference('forgetting-well');
    expect(reference).toBeDefined();
    expect(reference!.referenceName).toBe('The Forgetting Well');
    expect(reference!.kind).toBe('special-space');
    expect(registry.isSpecialReference('forgetting-well')).toBe(true);
  });

  it('recognizes threadway and scope selectors as intentional non-world references', () => {
    expect(registry.getReference('threadway-network')!.kind).toBe('network-space');
    expect(registry.getReference('all-worlds')!.kind).toBe('scope-selector');
    expect(registry.getReference('any-threadway')!.kind).toBe('scope-selector');
  });

  it('does not treat unresolved legacy ids as special references', () => {
    expect(registry.getReference('science-lab')).toBeUndefined();
    expect(registry.getReference('garden-of-growth')).toBeUndefined();
    expect(registry.isSpecialReference('science-lab')).toBe(false);
  });
});