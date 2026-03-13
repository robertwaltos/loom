import { describe, it, expect } from 'vitest';
import {
  createCharacterDossierRegistry,
  CHARACTER_DOSSIERS,
} from '../character-dossiers.js';

// ── createCharacterDossierRegistry ────────────────────────────

describe('createCharacterDossierRegistry', () => {
  it('instantiates without throwing', () => {
    expect(() => createCharacterDossierRegistry()).not.toThrow();
  });

  it('totalDossiers is 20', () => {
    const registry = createCharacterDossierRegistry();
    expect(registry.totalDossiers).toBe(20);
  });

  it('allDossiers returns all 20 guides', () => {
    const registry = createCharacterDossierRegistry();
    expect(registry.allDossiers()).toHaveLength(20);
  });
});

// ── getById ────────────────────────────────────────────────────

describe('getById', () => {
  it('returns Dottie by id', () => {
    const registry = createCharacterDossierRegistry();
    const dottie = registry.getById('dottie');
    expect(dottie).toBeDefined();
    expect(dottie?.fullName).toBe('Dottie');
  });

  it('returns Nimbus by id', () => {
    const registry = createCharacterDossierRegistry();
    const nimbus = registry.getById('nimbus');
    expect(nimbus).toBeDefined();
    expect(nimbus?.primaryWorld).toBe('starfall-observatory');
  });

  it('returns Felix by id', () => {
    const registry = createCharacterDossierRegistry();
    const felix = registry.getById('felix');
    expect(felix).toBeDefined();
    expect(felix?.role).toBe('language_arts');
  });

  it('returns undefined for an unknown id', () => {
    const registry = createCharacterDossierRegistry();
    expect(registry.getById('guide-does-not-exist-xyz')).toBeUndefined();
  });
});

// ── getByWorld ─────────────────────────────────────────────────

describe('getByWorld', () => {
  it('returns guides assigned to circuit-marsh', () => {
    const registry = createCharacterDossierRegistry();
    const results = registry.getByWorld('circuit-marsh');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((d) => d.characterId === 'zara')).toBe(true);
  });

  it('returns empty array for unknown world', () => {
    const registry = createCharacterDossierRegistry();
    expect(registry.getByWorld('world-xyz-unknown')).toHaveLength(0);
  });
});

// ── getByRole ──────────────────────────────────────────────────

describe('getByRole', () => {
  it('returns at least one STEM science guide', () => {
    const registry = createCharacterDossierRegistry();
    const results = registry.getByRole('stem_science');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns at least one language arts guide', () => {
    const registry = createCharacterDossierRegistry();
    const results = registry.getByRole('language_arts');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns at least one financial guide', () => {
    const registry = createCharacterDossierRegistry();
    const results = registry.getByRole('financial');
    expect(results.length).toBeGreaterThan(0);
  });

  it('every result has the requested role', () => {
    const registry = createCharacterDossierRegistry();
    const results = registry.getByRole('stem_math');
    expect(results.every((d) => d.role === 'stem_math')).toBe(true);
  });
});

// ── shadow and growthMoment fields ─────────────────────────────

describe('shadow and growthMoment characterisation', () => {
  it('every dossier has a non-empty shadow', () => {
    const registry = createCharacterDossierRegistry();
    expect(registry.allDossiers().every((d) => d.shadow.length > 0)).toBe(true);
  });

  it('every dossier has a non-empty growthMoment', () => {
    const registry = createCharacterDossierRegistry();
    expect(registry.allDossiers().every((d) => d.growthMoment.length > 0)).toBe(true);
  });

  it("Dottie's shadow references correcting an adult", () => {
    const registry = createCharacterDossierRegistry();
    const dottie = registry.getById('dottie');
    expect(dottie?.shadow.toLowerCase()).toContain('adult');
  });

  it("Pixel's shadow references ethical cost", () => {
    const registry = createCharacterDossierRegistry();
    const pixel = registry.getById('pixel');
    expect(pixel?.shadow.toLowerCase()).toContain('ethical');
  });

  it("Dr. Obi's shadow references Galen", () => {
    const registry = createCharacterDossierRegistry();
    const obi = registry.getById('dr-obi');
    expect(obi?.shadow).toContain('Galen');
  });
});

// ── signaturePhrase ────────────────────────────────────────────

describe('signaturePhrase', () => {
  it('every dossier has a non-empty signaturePhrase', () => {
    expect(CHARACTER_DOSSIERS.every((d) => d.signaturePhrase.length > 0)).toBe(true);
  });
});

// ── data integrity ─────────────────────────────────────────────

describe('CHARACTER_DOSSIERS data integrity', () => {
  it('every dossier has a non-empty characterId', () => {
    expect(CHARACTER_DOSSIERS.every((d) => d.characterId.length > 0)).toBe(true);
  });

  it('every dossier has a non-empty fullName', () => {
    expect(CHARACTER_DOSSIERS.every((d) => d.fullName.length > 0)).toBe(true);
  });

  it('character IDs are unique', () => {
    const ids = new Set(CHARACTER_DOSSIERS.map((d) => d.characterId));
    expect(ids.size).toBe(CHARACTER_DOSSIERS.length);
  });

  it('all 20 expected guides are present', () => {
    const expectedIds = [
      'nimbus', 'zara', 'suki', 'dottie', 'riku', 'pixel',
      'anaya', 'oliver', 'jin-ho', 'priya', 'baxter', 'cal',
      'lena', 'kofi', 'dr-obi', 'mira', 'hugo', 'yuki', 'atlas', 'felix',
    ];
    const registry = createCharacterDossierRegistry();
    for (const id of expectedIds) {
      expect(registry.getById(id)).toBeDefined();
    }
  });
});
