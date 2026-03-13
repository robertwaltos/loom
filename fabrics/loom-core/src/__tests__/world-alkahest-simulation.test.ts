/**
 * Simulation tests — Alkahest (world seed)
 *
 * Validates the exported constants and data structures of the
 * world-alkahest seed file without requiring any runtime services.
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_ALKAHEST_ID,
  WORLD_ALKAHEST_DISPLAY_NAME,
  WORLD_ALKAHEST_DISTANCE_LY,
  WORLD_ALKAHEST_NODE_DENSITY,
  WORLD_ALKAHEST_ASSEMBLY_SEAT_COUNT,
  WORLD_ALKAHEST_SEED,
  WORLD_ALKAHEST_LORE_SUMMARY,
} from '../world-seeds/world-alkahest.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('world-alkahest constants', () => {
  it('has the correct world id', () => {
    expect(WORLD_ALKAHEST_ID).toBe('alkahest');
  });

  it('has the correct display name', () => {
    expect(WORLD_ALKAHEST_DISPLAY_NAME).toBe('Alkahest');
  });

  it('is the Origin — 0 LY from Origin', () => {
    expect(WORLD_ALKAHEST_DISTANCE_LY).toBe(0);
  });

  it('has the canonical node density of 8', () => {
    expect(WORLD_ALKAHEST_NODE_DENSITY).toBe(8);
  });

  it('has 47 Assembly seats', () => {
    expect(WORLD_ALKAHEST_ASSEMBLY_SEAT_COUNT).toBe(47);
  });
});

// ── Seed Shape ────────────────────────────────────────────────────────────────

describe('WORLD_ALKAHEST_SEED shape', () => {
  it('carries the correct worldId', () => {
    expect(WORLD_ALKAHEST_SEED.worldId).toBe(WORLD_ALKAHEST_ID);
  });

  it('has spawn points covering player and npc types', () => {
    const types = WORLD_ALKAHEST_SEED.spawnPoints.map((sp) => sp.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least three player spawn points', () => {
    const playerPoints = WORLD_ALKAHEST_SEED.spawnPoints.filter(
      (sp) => sp.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('has 8 named NPCs', () => {
    expect(WORLD_ALKAHEST_SEED.npcs.length).toBe(8);
  });

  it('includes Itoro Adeyemi-Okafor as a Tier 3 friendly NPC', () => {
    const itoro = WORLD_ALKAHEST_SEED.npcs.find(
      (n) => n.displayName === 'Itoro Adeyemi-Okafor',
    );
    expect(itoro).toBeDefined();
    expect(itoro!.tier).toBe(3);
    expect(itoro!.hostility).toBe('friendly');
    expect(itoro!.interactions).toContain('talk');
    expect(itoro!.interactions).toContain('inspect');
  });

  it('includes Seren Vael as a Tier 3 friendly NPC', () => {
    const seren = WORLD_ALKAHEST_SEED.npcs.find(
      (n) => n.displayName === 'Seren Vael',
    );
    expect(seren).toBeDefined();
    expect(seren!.tier).toBe(3);
    expect(seren!.hostility).toBe('friendly');
  });

  it('includes Nnamdi Achebe as a Tier 3 friendly NPC', () => {
    const nnamdi = WORLD_ALKAHEST_SEED.npcs.find(
      (n) => n.displayName === 'Nnamdi Achebe',
    );
    expect(nnamdi).toBeDefined();
    expect(nnamdi!.tier).toBe(3);
    expect(nnamdi!.hostility).toBe('friendly');
  });

  it('has three Tier 3 characters (TIER_4 bible characters)', () => {
    const tier3 = WORLD_ALKAHEST_SEED.npcs.filter((n) => n.tier === 3);
    expect(tier3.length).toBe(3);
  });

  it('has five Tier 2 characters (TIER_3 bible characters)', () => {
    const tier2 = WORLD_ALKAHEST_SEED.npcs.filter((n) => n.tier === 2);
    expect(tier2.length).toBe(5);
  });

  it('includes Marshal Ikenna Oduya-Voss as the highest-health NPC', () => {
    const marshal = WORLD_ALKAHEST_SEED.npcs.find(
      (n) => n.displayName === 'Ikenna Oduya-Voss',
    );
    expect(marshal).toBeDefined();
    expect(marshal!.health).toBe(800);
    expect(marshal!.hostility).toBe('neutral');
    expect(marshal!.interactions).toContain('inspect');
  });

  it('has at least 5 world objects', () => {
    expect(WORLD_ALKAHEST_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('includes The Assembly Chamber with inspect and use interactions', () => {
    const chamber = WORLD_ALKAHEST_SEED.objects.find(
      (o) => o.displayName === 'The Assembly Chamber',
    );
    expect(chamber).toBeDefined();
    expect(chamber!.interactions).toContain('inspect');
    expect(chamber!.interactions).toContain('use');
  });

  it('includes Lattice Monument — Node One with a use interaction', () => {
    const monument = WORLD_ALKAHEST_SEED.objects.find(
      (o) => o.displayName === 'Lattice Monument — Node One',
    );
    expect(monument).toBeDefined();
    expect(monument!.interactions).toContain('use');
  });

  it('includes the Archive Vault with a large health value', () => {
    const vault = WORLD_ALKAHEST_SEED.objects.find(
      (o) => o.displayName === 'Archive Vault — Survey Year Zero',
    );
    expect(vault).toBeDefined();
    expect(vault!.health).toBeGreaterThanOrEqual(800);
  });
});

// ── Lore Summary ──────────────────────────────────────────────────────────────

describe('WORLD_ALKAHEST_LORE_SUMMARY', () => {
  it('is a non-empty string', () => {
    expect(typeof WORLD_ALKAHEST_LORE_SUMMARY).toBe('string');
    expect(WORLD_ALKAHEST_LORE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('references the node density value', () => {
    expect(WORLD_ALKAHEST_LORE_SUMMARY).toContain(
      `${WORLD_ALKAHEST_NODE_DENSITY}`,
    );
  });

  it('references the Assembly seat count', () => {
    expect(WORLD_ALKAHEST_LORE_SUMMARY).toContain(
      `${WORLD_ALKAHEST_ASSEMBLY_SEAT_COUNT}`,
    );
  });

  it('references the distance from Origin', () => {
    expect(WORLD_ALKAHEST_LORE_SUMMARY).toContain(
      `${WORLD_ALKAHEST_DISTANCE_LY}`,
    );
  });

  it('mentions Itoro Adeyemi-Okafor by name', () => {
    expect(WORLD_ALKAHEST_LORE_SUMMARY).toContain('Itoro Adeyemi-Okafor');
  });
});
