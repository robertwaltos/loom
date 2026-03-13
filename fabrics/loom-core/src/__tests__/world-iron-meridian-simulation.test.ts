/**
 * Simulation tests — Iron Meridian (world seed)
 *
 * Validates the exported constants and data structures of the
 * world-iron-meridian seed file without requiring any runtime services.
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_IRON_MERIDIAN_ID,
  WORLD_IRON_MERIDIAN_DISPLAY_NAME,
  WORLD_IRON_MERIDIAN_DISTANCE_LY,
  WORLD_IRON_MERIDIAN_NODE_DENSITY,
  WORLD_IRON_MERIDIAN_UCHENNA_CERTIFICATIONS,
  WORLD_IRON_MERIDIAN_SEED,
  WORLD_IRON_MERIDIAN_LORE_SUMMARY,
} from '../world-seeds/world-iron-meridian.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('world-iron-meridian constants', () => {
  it('has the correct world id', () => {
    expect(WORLD_IRON_MERIDIAN_ID).toBe('iron-meridian');
  });

  it('has the correct display name', () => {
    expect(WORLD_IRON_MERIDIAN_DISPLAY_NAME).toBe('Iron Meridian');
  });

  it('is located in the mid inner arc', () => {
    expect(WORLD_IRON_MERIDIAN_DISTANCE_LY).toBe(41);
    expect(WORLD_IRON_MERIDIAN_DISTANCE_LY).toBeLessThan(100);
  });

  it('has a node density of 5', () => {
    expect(WORLD_IRON_MERIDIAN_NODE_DENSITY).toBe(5);
  });

  it('has the canonical Uchenna certification count', () => {
    expect(WORLD_IRON_MERIDIAN_UCHENNA_CERTIFICATIONS).toBe(3944);
  });
});

// ── Seed Shape ────────────────────────────────────────────────────────────────

describe('WORLD_IRON_MERIDIAN_SEED shape', () => {
  it('carries the correct worldId', () => {
    expect(WORLD_IRON_MERIDIAN_SEED.worldId).toBe(WORLD_IRON_MERIDIAN_ID);
  });

  it('has spawn points covering player and npc types', () => {
    const types = WORLD_IRON_MERIDIAN_SEED.spawnPoints.map((sp) => sp.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least three player spawn points', () => {
    const playerPoints = WORLD_IRON_MERIDIAN_SEED.spawnPoints.filter(
      (sp) => sp.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('has 5 NPCs', () => {
    expect(WORLD_IRON_MERIDIAN_SEED.npcs.length).toBe(5);
  });

  it('includes Yield Director Osei-Rathmore as a Tier 2 neutral NPC', () => {
    const director = WORLD_IRON_MERIDIAN_SEED.npcs.find(
      (n) => n.displayName === 'Yield Director Osei-Rathmore',
    );
    expect(director).toBeDefined();
    expect(director!.tier).toBe(2);
    expect(director!.hostility).toBe('neutral');
  });

  it('includes Adaora Uchenna as a trade-enabled Tier 2 friendly NPC', () => {
    const uchenna = WORLD_IRON_MERIDIAN_SEED.npcs.find(
      (n) => n.displayName === 'Adaora Uchenna',
    );
    expect(uchenna).toBeDefined();
    expect(uchenna!.tier).toBe(2);
    expect(uchenna!.hostility).toBe('friendly');
    expect(uchenna!.interactions).toContain('trade');
    expect(uchenna!.interactions).toContain('inspect');
  });

  it('includes the Ore Transit Broker as a trade-enabled neutral NPC', () => {
    const broker = WORLD_IRON_MERIDIAN_SEED.npcs.find(
      (n) => n.displayName === 'Ore Transit Broker Voss-Rathmore',
    );
    expect(broker).toBeDefined();
    expect(broker!.interactions).toContain('trade');
    expect(broker!.hostility).toBe('neutral');
  });

  it('has at least 5 world objects', () => {
    expect(WORLD_IRON_MERIDIAN_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('includes The Forge Yards with inspect and use interactions', () => {
    const yards = WORLD_IRON_MERIDIAN_SEED.objects.find(
      (o) => o.displayName === 'The Forge Yards',
    );
    expect(yards).toBeDefined();
    expect(yards!.interactions).toContain('inspect');
    expect(yards!.interactions).toContain('use');
  });

  it('includes Ore Transit Dock — Platform A with the largest health value', () => {
    const dock = WORLD_IRON_MERIDIAN_SEED.objects.find(
      (o) => o.displayName === 'Ore Transit Dock — Platform A',
    );
    expect(dock).toBeDefined();
    expect(dock!.health).toBeGreaterThanOrEqual(1000);
  });

  it('includes the Quality Inspection Board as an inspectable object', () => {
    const board = WORLD_IRON_MERIDIAN_SEED.objects.find(
      (o) => o.displayName === 'Quality Inspection Board',
    );
    expect(board).toBeDefined();
    expect(board!.interactions).toContain('inspect');
  });
});

// ── Lore Summary ──────────────────────────────────────────────────────────────

describe('WORLD_IRON_MERIDIAN_LORE_SUMMARY', () => {
  it('is a non-empty string', () => {
    expect(typeof WORLD_IRON_MERIDIAN_LORE_SUMMARY).toBe('string');
    expect(WORLD_IRON_MERIDIAN_LORE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('references the node density value', () => {
    expect(WORLD_IRON_MERIDIAN_LORE_SUMMARY).toContain(
      `${WORLD_IRON_MERIDIAN_NODE_DENSITY}`,
    );
  });

  it('references the Uchenna certification count', () => {
    expect(WORLD_IRON_MERIDIAN_LORE_SUMMARY).toContain(
      `${WORLD_IRON_MERIDIAN_UCHENNA_CERTIFICATIONS}`,
    );
  });

  it('references the distance from Origin', () => {
    expect(WORLD_IRON_MERIDIAN_LORE_SUMMARY).toContain(
      `${WORLD_IRON_MERIDIAN_DISTANCE_LY}`,
    );
  });
});
