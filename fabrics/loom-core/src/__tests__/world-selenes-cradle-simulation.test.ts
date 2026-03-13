/**
 * Simulation tests — Selene's Cradle (world seed)
 *
 * Validates the exported constants and data structures of the
 * world-selenes-cradle seed file without requiring any runtime services.
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_SELENES_CRADLE_ID,
  WORLD_SELENES_CRADLE_DISPLAY_NAME,
  WORLD_SELENES_CRADLE_DISTANCE_LY,
  WORLD_SELENES_CRADLE_NODE_DENSITY,
  WORLD_SELENES_CRADLE_LATTICE_INTEGRITY,
  WORLD_SELENES_CRADLE_DEGRADATION_EVENTS,
  WORLD_SELENES_CRADLE_SEED,
  WORLD_SELENES_CRADLE_LORE_SUMMARY,
} from '../world-seeds/world-selenes-cradle.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe("world-selenes-cradle constants", () => {
  it('has the correct world id', () => {
    expect(WORLD_SELENES_CRADLE_ID).toBe('selenes-cradle');
  });

  it('has the correct display name', () => {
    expect(WORLD_SELENES_CRADLE_DISPLAY_NAME).toBe("Selene's Cradle");
  });

  it('is in the inner-to-mid arc', () => {
    expect(WORLD_SELENES_CRADLE_DISTANCE_LY).toBe(57);
    expect(WORLD_SELENES_CRADLE_DISTANCE_LY).toBeLessThan(100);
  });

  it('has a node density of 6', () => {
    expect(WORLD_SELENES_CRADLE_NODE_DENSITY).toBe(6);
  });

  it('has a lattice integrity of exactly 100%', () => {
    expect(WORLD_SELENES_CRADLE_LATTICE_INTEGRITY).toBe(100);
  });

  it('has zero logged degradation events', () => {
    expect(WORLD_SELENES_CRADLE_DEGRADATION_EVENTS).toBe(0);
  });
});

// ── Seed Shape ────────────────────────────────────────────────────────────────

describe("WORLD_SELENES_CRADLE_SEED shape", () => {
  it('carries the correct worldId', () => {
    expect(WORLD_SELENES_CRADLE_SEED.worldId).toBe(WORLD_SELENES_CRADLE_ID);
  });

  it('has spawn points covering player and npc types', () => {
    const types = WORLD_SELENES_CRADLE_SEED.spawnPoints.map((sp) => sp.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least two player spawn points', () => {
    const playerPoints = WORLD_SELENES_CRADLE_SEED.spawnPoints.filter(
      (sp) => sp.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('has 3 NPCs', () => {
    expect(WORLD_SELENES_CRADLE_SEED.npcs.length).toBe(3);
  });

  it('includes Ekundayo Manu as a Tier 2 neutral NPC', () => {
    const steward = WORLD_SELENES_CRADLE_SEED.npcs.find(
      (n) => n.displayName === 'Ekundayo Manu',
    );
    expect(steward).toBeDefined();
    expect(steward!.tier).toBe(2);
    expect(steward!.hostility).toBe('neutral');
    expect(steward!.interactions).toContain('talk');
    expect(steward!.interactions).toContain('inspect');
  });

  it('includes Node Verification Warden as a non-combatant Tier 0 NPC', () => {
    const warden = WORLD_SELENES_CRADLE_SEED.npcs.find(
      (n) => n.displayName === 'Node Verification Warden Osei-Voss',
    );
    expect(warden).toBeDefined();
    expect(warden!.tier).toBe(0);
    expect(warden!.health).toBe(1);
    expect(warden!.hostility).toBe('friendly');
  });

  it('has at least 4 world objects', () => {
    expect(WORLD_SELENES_CRADLE_SEED.objects.length).toBeGreaterThanOrEqual(4);
  });

  it('includes Node Cluster — Selene Primary with a use interaction', () => {
    const cluster = WORLD_SELENES_CRADLE_SEED.objects.find(
      (o) => o.displayName === 'Node Cluster — Selene Primary',
    );
    expect(cluster).toBeDefined();
    expect(cluster!.interactions).toContain('use');
    expect(cluster!.interactions).toContain('inspect');
  });

  it('includes The Selene Voss Memorial Marker as inspectable', () => {
    const marker = WORLD_SELENES_CRADLE_SEED.objects.find(
      (o) => o.displayName === 'The Selene Voss Memorial Marker',
    );
    expect(marker).toBeDefined();
    expect(marker!.interactions).toContain('inspect');
  });

  it('includes The Covenant Sanctum with a health value', () => {
    const sanctum = WORLD_SELENES_CRADLE_SEED.objects.find(
      (o) => o.displayName === 'The Covenant Sanctum',
    );
    expect(sanctum).toBeDefined();
    expect(sanctum!.health).toBeGreaterThanOrEqual(600);
  });
});

// ── Lore Summary ──────────────────────────────────────────────────────────────

describe('WORLD_SELENES_CRADLE_LORE_SUMMARY', () => {
  it('is a non-empty string', () => {
    expect(typeof WORLD_SELENES_CRADLE_LORE_SUMMARY).toBe('string');
    expect(WORLD_SELENES_CRADLE_LORE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('references the node density value', () => {
    expect(WORLD_SELENES_CRADLE_LORE_SUMMARY).toContain(
      `${WORLD_SELENES_CRADLE_NODE_DENSITY}`,
    );
  });

  it('references the lattice integrity value', () => {
    expect(WORLD_SELENES_CRADLE_LORE_SUMMARY).toContain(
      `${WORLD_SELENES_CRADLE_LATTICE_INTEGRITY}`,
    );
  });

  it('references the distance from Origin', () => {
    expect(WORLD_SELENES_CRADLE_LORE_SUMMARY).toContain(
      `${WORLD_SELENES_CRADLE_DISTANCE_LY}`,
    );
  });

  it('references degradation events', () => {
    expect(WORLD_SELENES_CRADLE_LORE_SUMMARY).toContain(
      `${WORLD_SELENES_CRADLE_DEGRADATION_EVENTS}`,
    );
  });
});
