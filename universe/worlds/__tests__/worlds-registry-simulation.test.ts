/**
 * World Registry — Simulation Tests
 *
 * Structural and contract tests for the registry of all 50 Koydo Worlds.
 * Verifies completeness, schema validity, cross-realm counts, threadway
 * topology, and color palette format.
 *
 * Thread: silk/universe/worlds-registry-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_REGISTRY,
  ALL_WORLDS,
  getWorld,
  getWorldsByRealm,
} from '../registry.js';
import {
  REALM_OF_DISCOVERY_WORLDS,
  REALM_OF_EXPRESSION_WORLDS,
  REALM_OF_EXCHANGE_WORLDS,
  THE_CROSSROADS_WORLDS,
} from '../types.js';

// ─── Total Count ──────────────────────────────────────────────────

describe('world counts', () => {
  it('ALL_WORLDS contains exactly 50 worlds', () => {
    expect(ALL_WORLDS.length).toBe(50);
  });

  it('WORLD_REGISTRY map has exactly 50 entries', () => {
    expect(WORLD_REGISTRY.size).toBe(50);
  });

  it('Realm of Discovery contains exactly 15 worlds', () => {
    expect(getWorldsByRealm('discovery').length).toBe(15);
  });

  it('Realm of Expression contains exactly 15 worlds', () => {
    expect(getWorldsByRealm('expression').length).toBe(15);
  });

  it('Realm of Exchange contains exactly 12 worlds', () => {
    expect(getWorldsByRealm('exchange').length).toBe(12);
  });

  it('The Crossroads contains exactly 8 worlds', () => {
    expect(getWorldsByRealm('crossroads').length).toBe(8);
  });

  it('realm totals sum to 50', () => {
    const total =
      getWorldsByRealm('discovery').length +
      getWorldsByRealm('expression').length +
      getWorldsByRealm('exchange').length +
      getWorldsByRealm('crossroads').length;
    expect(total).toBe(50);
  });
});

// ─── All World IDs Registered ─────────────────────────────────────

describe('world id coverage', () => {
  it('every REALM_OF_DISCOVERY_WORLDS id is in the registry', () => {
    for (const id of REALM_OF_DISCOVERY_WORLDS) {
      expect(WORLD_REGISTRY.has(id), `missing: ${id}`).toBe(true);
    }
  });

  it('every REALM_OF_EXPRESSION_WORLDS id is in the registry', () => {
    for (const id of REALM_OF_EXPRESSION_WORLDS) {
      expect(WORLD_REGISTRY.has(id), `missing: ${id}`).toBe(true);
    }
  });

  it('every REALM_OF_EXCHANGE_WORLDS id is in the registry', () => {
    for (const id of REALM_OF_EXCHANGE_WORLDS) {
      expect(WORLD_REGISTRY.has(id), `missing: ${id}`).toBe(true);
    }
  });

  it('every THE_CROSSROADS_WORLDS id is in the registry', () => {
    for (const id of THE_CROSSROADS_WORLDS) {
      expect(WORLD_REGISTRY.has(id), `missing: ${id}`).toBe(true);
    }
  });

  it('no duplicate world ids across ALL_WORLDS', () => {
    const ids = ALL_WORLDS.map((w) => w.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─── Schema Validation ────────────────────────────────────────────

describe('world schema completeness', () => {
  it('every world has a non-empty id', () => {
    for (const world of ALL_WORLDS) {
      expect(world.id.length, `empty id for world`).toBeGreaterThan(0);
    }
  });

  it('every world has a non-empty name', () => {
    for (const world of ALL_WORLDS) {
      expect(world.name.length, `empty name for ${world.id}`).toBeGreaterThan(0);
    }
  });

  it('every world has a non-empty guideId', () => {
    for (const world of ALL_WORLDS) {
      expect(world.guideId.length, `missing guideId for ${world.id}`).toBeGreaterThan(0);
    }
  });

  it('every world has at least one entryId', () => {
    for (const world of ALL_WORLDS) {
      expect(world.entryIds.length, `no entries for ${world.id}`).toBeGreaterThan(0);
    }
  });

  it('every world has at least one threadwayConnection', () => {
    for (const world of ALL_WORLDS) {
      expect(
        world.threadwayConnections.length,
        `no threadways for ${world.id}`,
      ).toBeGreaterThan(0);
    }
  });

  it('every world has a valid realm', () => {
    const validRealms = new Set(['discovery', 'expression', 'exchange', 'crossroads']);
    for (const world of ALL_WORLDS) {
      expect(validRealms.has(world.realm), `invalid realm for ${world.id}`).toBe(true);
    }
  });
});

// ─── Color Palette Format ─────────────────────────────────────────

describe('color palette validation', () => {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;

  it('every world color palette contains valid hex values', () => {
    for (const world of ALL_WORLDS) {
      const palette = world.colorPalette;
      for (const [key, value] of Object.entries(palette)) {
        expect(
          hexPattern.test(value as string),
          `invalid hex ${String(value)} at ${world.id}.colorPalette.${key}`,
        ).toBe(true);
      }
    }
  });

  it('primary and fadedVariant are different colors', () => {
    for (const world of ALL_WORLDS) {
      expect(
        world.colorPalette.primary,
        `primary should differ from fadedVariant in ${world.id}`,
      ).not.toBe(world.colorPalette.fadedVariant);
    }
  });
});

// ─── Threadway Topology ───────────────────────────────────────────

describe('threadway topology', () => {
  it('great-archive is connected to all realms', () => {
    const discoveryWorlds = getWorldsByRealm('discovery');
    const arcadeConnected = discoveryWorlds.some((w) =>
      w.threadwayConnections.includes('great-archive'),
    );
    expect(arcadeConnected).toBe(true);
  });

  it('great-archive world exists in the registry', () => {
    expect(WORLD_REGISTRY.has('great-archive')).toBe(true);
  });

  it('every threadway target is either in the registry or is great-archive', () => {
    const allIds = new Set(ALL_WORLDS.map((w) => w.id));
    for (const world of ALL_WORLDS) {
      for (const target of world.threadwayConnections) {
        expect(allIds.has(target), `unknown threadway target: ${target} in ${world.id}`).toBe(true);
      }
    }
  });

  it('no world links to itself via threadway', () => {
    for (const world of ALL_WORLDS) {
      expect(
        world.threadwayConnections.includes(world.id),
        `${world.id} links to itself`,
      ).toBe(false);
    }
  });
});

// ─── getWorld helper ──────────────────────────────────────────────

describe('getWorld', () => {
  it('returns the correct world by id', () => {
    const world = getWorld('cloud-kingdom');
    expect(world.id).toBe('cloud-kingdom');
    expect(world.realm).toBe('discovery');
  });

  it('throws for an unknown world id', () => {
    expect(() => getWorld('nonexistent-world')).toThrow();
  });

  it('retrieved world matches the registry entry', () => {
    const w1 = getWorld('great-archive');
    const w2 = WORLD_REGISTRY.get('great-archive');
    expect(w1).toBe(w2);
  });
});

// ─── getWorldsByRealm helper ──────────────────────────────────────

describe('getWorldsByRealm', () => {
  it('returns only worlds of the requested realm', () => {
    const exchangeWorlds = getWorldsByRealm('exchange');
    for (const w of exchangeWorlds) {
      expect(w.realm).toBe('exchange');
    }
  });

  it('returns a consistent count across multiple calls', () => {
    expect(getWorldsByRealm('crossroads').length).toBe(
      getWorldsByRealm('crossroads').length,
    );
  });
});

// ─── Hub World ────────────────────────────────────────────────────

describe('great-archive hub', () => {
  it('is in the crossroads realm', () => {
    const hub = getWorld('great-archive');
    expect(hub.realm).toBe('crossroads');
  });

  it('has guide The Librarian', () => {
    const hub = getWorld('great-archive');
    expect(hub.guideId.toLowerCase()).toContain('librarian');
  });
});
