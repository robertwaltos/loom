import { describe, it, expect } from 'vitest';
import {
  createNpcRelationshipRegistry,
  CHARACTER_RELATIONSHIPS,
} from '../npc-relationship-registry.js';

// ── createNpcRelationshipRegistry ─────────────────────────────

describe('createNpcRelationshipRegistry', () => {
  it('instantiates without throwing', () => {
    expect(() => createNpcRelationshipRegistry()).not.toThrow();
  });

  it('totalRelationships matches the static array length', () => {
    const registry = createNpcRelationshipRegistry();
    expect(registry.totalRelationships).toBe(CHARACTER_RELATIONSHIPS.length);
  });

  it('all() returns the full collection', () => {
    const registry = createNpcRelationshipRegistry();
    expect(registry.all()).toHaveLength(CHARACTER_RELATIONSHIPS.length);
  });

  it('there are 17 canonical relationships', () => {
    expect(CHARACTER_RELATIONSHIPS).toHaveLength(17);
  });
});

// ── getRelationship ────────────────────────────────────────────

describe('getRelationship', () => {
  it('returns a relationship for a known id', () => {
    const registry = createNpcRelationshipRegistry();
    const first = CHARACTER_RELATIONSHIPS[0];
    const result = registry.getRelationship(first.relationshipId);
    expect(result).toBeDefined();
    expect(result?.relationshipId).toBe(first.relationshipId);
  });

  it('returns undefined for an unknown id', () => {
    const registry = createNpcRelationshipRegistry();
    expect(registry.getRelationship('rel-does-not-exist-xyz')).toBeUndefined();
  });
});

// ── getRelationshipsForCharacter ───────────────────────────────

describe('getRelationshipsForCharacter', () => {
  it('returns relationships for a character who appears in the data', () => {
    const registry = createNpcRelationshipRegistry();
    const rel = CHARACTER_RELATIONSHIPS[0];
    const results = registry.getRelationshipsForCharacter(rel.characterA);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown character', () => {
    const registry = createNpcRelationshipRegistry();
    expect(registry.getRelationshipsForCharacter('character-nobody-xyz')).toHaveLength(0);
  });

  it('returns relationships where character is on either side', () => {
    const registry = createNpcRelationshipRegistry();
    const compassRels = registry.getRelationshipsForCharacter('Compass');
    expect(compassRels.length).toBeGreaterThan(0);
  });
});

// ── getRelationshipsForWorld ───────────────────────────────────

describe('getRelationshipsForWorld', () => {
  it('returns relationships for a world that has some', () => {
    const registry = createNpcRelationshipRegistry();
    const worldId = CHARACTER_RELATIONSHIPS[0].characterAWorldId;
    const results = registry.getRelationshipsForWorld(worldId);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown world', () => {
    const registry = createNpcRelationshipRegistry();
    expect(registry.getRelationshipsForWorld('world-definitely-does-not-exist')).toHaveLength(0);
  });

  it('returns the cleaned alias-backed relationship worlds', () => {
    const registry = createNpcRelationshipRegistry();
    const baxterHugo = registry.getRelationship('baxter-hugo');
    const diegoBabatunde = registry.getRelationship('diego-babatunde');
    const theoSam = registry.getRelationship('theo-sam');

    expect(baxterHugo?.characterAWorldId).toBe('meadow-lab');
    expect(diegoBabatunde?.characterAWorldId).toBe('entrepreneur-workshop');
    expect(theoSam?.characterBWorldId).toBe('tax-office');
  });
});

// ── getCrossWorldPairs ─────────────────────────────────────────

describe('getCrossWorldPairs', () => {
  it('returns pairs where the two world IDs differ', () => {
    const registry = createNpcRelationshipRegistry();
    const pairs = registry.getCrossWorldPairs();
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.every(([a, b]) => a !== b)).toBe(true);
  });
});

// ── data integrity ─────────────────────────────────────────────

describe('CHARACTER_RELATIONSHIPS data integrity', () => {
  it('every relationship has a non-empty relationshipId', () => {
    expect(CHARACTER_RELATIONSHIPS.every((r) => r.relationshipId.length > 0)).toBe(true);
  });

  it('every relationship has a non-empty characterA and characterB', () => {
    expect(
      CHARACTER_RELATIONSHIPS.every((r) => r.characterA.length > 0 && r.characterB.length > 0),
    ).toBe(true);
  });

  it('relationship IDs are unique', () => {
    const ids = new Set(CHARACTER_RELATIONSHIPS.map((r) => r.relationshipId));
    expect(ids.size).toBe(CHARACTER_RELATIONSHIPS.length);
  });

  it('every relationship has a non-empty coreTension', () => {
    expect(CHARACTER_RELATIONSHIPS.every((r) => r.coreTension.length > 0)).toBe(true);
  });

  it('every relationship specifies world IDs for both characters', () => {
    expect(
      CHARACTER_RELATIONSHIPS.every(
        (r) => r.characterAWorldId.length > 0 && r.characterBWorldId.length > 0,
      ),
    ).toBe(true);
  });

  it('cross-world relationships exist (A world ≠ B world)', () => {
    const crossWorld = CHARACTER_RELATIONSHIPS.filter(
      (r) => r.characterAWorldId !== r.characterBWorldId,
    );
    expect(crossWorld.length).toBeGreaterThan(0);
  });
});
