/**
 * Simulation tests — Meridian's Rest (world seed)
 *
 * Validates the exported constants and data structures of the
 * world-meridians-rest seed file without requiring any runtime services.
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_MERIDIANS_REST_ID,
  WORLD_MERIDIANS_REST_DISPLAY_NAME,
  WORLD_MERIDIANS_REST_DISTANCE_LY,
  WORLD_MERIDIANS_REST_NODE_DENSITY,
  WORLD_MERIDIANS_REST_FOUNDING_REGISTRATION_YEAR,
  WORLD_MERIDIANS_REST_SEED,
  WORLD_MERIDIANS_REST_LORE_SUMMARY,
} from '../world-seeds/world-meridians-rest.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe("world-meridians-rest constants", () => {
  it('has the correct world id', () => {
    expect(WORLD_MERIDIANS_REST_ID).toBe('meridians-rest');
  });

  it('has the correct display name', () => {
    expect(WORLD_MERIDIANS_REST_DISPLAY_NAME).toBe("Meridian's Rest");
  });

  it('is located near the inner arc (< 20 LY)', () => {
    expect(WORLD_MERIDIANS_REST_DISTANCE_LY).toBe(8);
    expect(WORLD_MERIDIANS_REST_DISTANCE_LY).toBeLessThan(20);
  });

  it('has the highest node density of launch worlds (9)', () => {
    expect(WORLD_MERIDIANS_REST_NODE_DENSITY).toBe(9);
  });

  it('has a founding registration year in single digits', () => {
    expect(WORLD_MERIDIANS_REST_FOUNDING_REGISTRATION_YEAR).toBe(7);
  });
});

// ── Seed Shape ────────────────────────────────────────────────────────────────

describe('WORLD_MERIDIANS_REST_SEED shape', () => {
  it('carries the correct worldId', () => {
    expect(WORLD_MERIDIANS_REST_SEED.worldId).toBe(WORLD_MERIDIANS_REST_ID);
  });

  it('has spawn points covering player and npc types', () => {
    const types = WORLD_MERIDIANS_REST_SEED.spawnPoints.map((sp) => sp.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least two player spawn points', () => {
    const playerPoints = WORLD_MERIDIANS_REST_SEED.spawnPoints.filter(
      (sp) => sp.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('has 3 NPCs', () => {
    expect(WORLD_MERIDIANS_REST_SEED.npcs.length).toBe(3);
  });

  it('includes Caelindra Meridian-Voss as a Tier 2 friendly NPC', () => {
    const steward = WORLD_MERIDIANS_REST_SEED.npcs.find(
      (n) => n.displayName === 'Caelindra Meridian-Voss',
    );
    expect(steward).toBeDefined();
    expect(steward!.tier).toBe(2);
    expect(steward!.hostility).toBe('friendly');
    expect(steward!.interactions).toContain('talk');
    expect(steward!.interactions).toContain('inspect');
  });

  it('includes Lattice Keeper Meridian-IX as a non-combatant Tier 0 NPC', () => {
    const keeper = WORLD_MERIDIANS_REST_SEED.npcs.find(
      (n) => n.displayName === 'Lattice Keeper Meridian-IX',
    );
    expect(keeper).toBeDefined();
    expect(keeper!.tier).toBe(0);
    expect(keeper!.health).toBe(1);
    expect(keeper!.hostility).toBe('friendly');
  });

  it('has at least 4 world objects', () => {
    expect(WORLD_MERIDIANS_REST_SEED.objects.length).toBeGreaterThanOrEqual(4);
  });

  it('includes Resonance Pool — Node Nine with a use interaction', () => {
    const pool = WORLD_MERIDIANS_REST_SEED.objects.find(
      (o) => o.displayName === 'Resonance Pool — Node Nine',
    );
    expect(pool).toBeDefined();
    expect(pool!.interactions).toContain('use');
    expect(pool!.interactions).toContain('inspect');
  });

  it('includes The Meridian Spire as an inspectable landmark', () => {
    const spire = WORLD_MERIDIANS_REST_SEED.objects.find(
      (o) => o.displayName === 'The Meridian Spire',
    );
    expect(spire).toBeDefined();
    expect(spire!.interactions).toContain('inspect');
  });

  it('includes House Meridian Archive with a large health value', () => {
    const archive = WORLD_MERIDIANS_REST_SEED.objects.find(
      (o) => o.displayName === 'House Meridian Archive',
    );
    expect(archive).toBeDefined();
    expect(archive!.health).toBeGreaterThanOrEqual(600);
  });
});

// ── Lore Summary ──────────────────────────────────────────────────────────────

describe('WORLD_MERIDIANS_REST_LORE_SUMMARY', () => {
  it('is a non-empty string', () => {
    expect(typeof WORLD_MERIDIANS_REST_LORE_SUMMARY).toBe('string');
    expect(WORLD_MERIDIANS_REST_LORE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('references the node density value', () => {
    expect(WORLD_MERIDIANS_REST_LORE_SUMMARY).toContain(
      `${WORLD_MERIDIANS_REST_NODE_DENSITY}`,
    );
  });

  it('references the founding registration year', () => {
    expect(WORLD_MERIDIANS_REST_LORE_SUMMARY).toContain(
      `${WORLD_MERIDIANS_REST_FOUNDING_REGISTRATION_YEAR}`,
    );
  });

  it('references the distance from Origin', () => {
    expect(WORLD_MERIDIANS_REST_LORE_SUMMARY).toContain(
      `${WORLD_MERIDIANS_REST_DISTANCE_LY}`,
    );
  });
});
