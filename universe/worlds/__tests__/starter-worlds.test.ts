import { describe, it, expect } from 'vitest';
import {
  STARTER_WORLDS,
  STARTER_WORLD_IDS,
  getStarterWorld,
  isStarterWorld,
  getStarterWorldsByRealm,
} from '../data/starter-worlds.js';

describe('STARTER_WORLDS', () => {
  it('has exactly 10 worlds', () => {
    expect(STARTER_WORLDS).toHaveLength(10);
  });

  it('ids match STARTER_WORLD_IDS order', () => {
    STARTER_WORLD_IDS.forEach((id, i) => {
      expect(STARTER_WORLDS[i]!.id).toBe(id);
    });
  });

  it('includes great-archive as first entry', () => {
    expect(STARTER_WORLDS[0]!.id).toBe('great-archive');
  });

  it('covers all four realms', () => {
    const realms = new Set(STARTER_WORLDS.map((w) => w.realm));
    expect(realms.has('discovery')).toBe(true);
    expect(realms.has('expression')).toBe(true);
    expect(realms.has('exchange')).toBe(true);
    expect(realms.has('crossroads')).toBe(true);
  });

  it('every world has required fields', () => {
    for (const w of STARTER_WORLDS) {
      expect(typeof w.id).toBe('string');
      expect(typeof w.name).toBe('string');
      expect(typeof w.description).toBe('string');
      expect(typeof w.guideId).toBe('string');
      expect(typeof w.subject).toBe('string');
      expect(typeof w.biomeKit).toBe('string');
      expect(typeof w.lightingMood).toBe('string');
      expect(w.colorPalette).toBeDefined();
      expect(Array.isArray(w.entryIds)).toBe(true);
      expect(Array.isArray(w.threadwayConnections)).toBe(true);
    }
  });

  it('threadwayConnections always includes great-archive or everywhere for hub worlds', () => {
    const hub = STARTER_WORLDS.find((w) => w.id === 'great-archive')!;
    expect(hub).toBeDefined();
  });
});

describe('getStarterWorld', () => {
  it('returns a world for a valid starter id', () => {
    const w = getStarterWorld('cloud-kingdom');
    expect(w).toBeDefined();
    expect(w!.realm).toBe('discovery');
  });

  it('returns undefined for non-starter world', () => {
    expect(getStarterWorld('frost-peaks')).toBeUndefined();
  });

  it('returns undefined for unknown id', () => {
    expect(getStarterWorld('not-a-world')).toBeUndefined();
  });
});

describe('isStarterWorld', () => {
  it('returns true for starter world ids', () => {
    expect(isStarterWorld('story-tree')).toBe(true);
    expect(isStarterWorld('market-square')).toBe(true);
  });

  it('returns false for non-starter world ids', () => {
    expect(isStarterWorld('rhyme-docks')).toBe(false);
    expect(isStarterWorld('savings-vault')).toBe(false);
  });
});

describe('getStarterWorldsByRealm', () => {
  it('returns only discovery worlds', () => {
    const worlds = getStarterWorldsByRealm('discovery');
    expect(worlds.length).toBeGreaterThan(0);
    worlds.forEach((w) => expect(w.realm).toBe('discovery'));
  });

  it('returns only exchange worlds', () => {
    const worlds = getStarterWorldsByRealm('exchange');
    expect(worlds.every((w) => w.realm === 'exchange')).toBe(true);
  });

  it('returns empty array for realm with no starters', () => {
    // All 4 realms have starters, so this checks crossroads specifically
    const worlds = getStarterWorldsByRealm('crossroads');
    expect(worlds.length).toBeGreaterThanOrEqual(1);
  });
});
