/**
 * Simulation tests — The Amber Reach (world seed)
 *
 * Validates the exported constants and data structures of the
 * world-amber-reach seed file without requiring any runtime services.
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_AMBER_REACH_ID,
  WORLD_AMBER_REACH_DISPLAY_NAME,
  WORLD_AMBER_REACH_DISTANCE_LY,
  WORLD_AMBER_REACH_NODE_DENSITY,
  WORLD_AMBER_REACH_PENDING_REFERENDUMS,
  WORLD_AMBER_REACH_SEED,
  WORLD_AMBER_REACH_LORE_SUMMARY,
} from '../world-seeds/world-amber-reach.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('world-amber-reach constants', () => {
  it('has the correct world id', () => {
    expect(WORLD_AMBER_REACH_ID).toBe('amber-reach');
  });

  it('has the correct display name', () => {
    expect(WORLD_AMBER_REACH_DISPLAY_NAME).toBe('The Amber Reach');
  });

  it('is located in the inner arc', () => {
    expect(WORLD_AMBER_REACH_DISTANCE_LY).toBe(23);
    expect(WORLD_AMBER_REACH_DISTANCE_LY).toBeLessThan(50);
  });

  it('has a node density of 7', () => {
    expect(WORLD_AMBER_REACH_NODE_DENSITY).toBe(7);
  });

  it('has the canonical pending referendum count', () => {
    expect(WORLD_AMBER_REACH_PENDING_REFERENDUMS).toBe(847);
  });
});

// ── Seed Shape ────────────────────────────────────────────────────────────────

describe('WORLD_AMBER_REACH_SEED shape', () => {
  it('carries the correct worldId', () => {
    expect(WORLD_AMBER_REACH_SEED.worldId).toBe(WORLD_AMBER_REACH_ID);
  });

  it('has spawn points covering player and npc types', () => {
    const types = WORLD_AMBER_REACH_SEED.spawnPoints.map((sp) => sp.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least four player spawn points', () => {
    const playerPoints = WORLD_AMBER_REACH_SEED.spawnPoints.filter(
      (sp) => sp.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(4);
  });

  it('has 5 NPCs', () => {
    expect(WORLD_AMBER_REACH_SEED.npcs.length).toBe(5);
  });

  it("includes People's Tribune Osei-Amara as a Tier 2 neutral NPC", () => {
    const tribune = WORLD_AMBER_REACH_SEED.npcs.find(
      (n) => n.displayName === "People's Tribune Osei-Amara",
    );
    expect(tribune).toBeDefined();
    expect(tribune!.tier).toBe(2);
    expect(tribune!.hostility).toBe('neutral');
    expect(tribune!.interactions).toContain('talk');
  });

  it('includes the Market Exchange Coordinator as a trade-enabled NPC', () => {
    const coordinator = WORLD_AMBER_REACH_SEED.npcs.find(
      (n) => n.displayName === 'Reach Market Exchange Coordinator',
    );
    expect(coordinator).toBeDefined();
    expect(coordinator!.interactions).toContain('trade');
    expect(coordinator!.hostility).toBe('neutral');
  });

  it('includes Survey Registrar Yemi Okafor-Nwosu as a friendly NPC', () => {
    const registrar = WORLD_AMBER_REACH_SEED.npcs.find(
      (n) => n.displayName === 'Survey Registrar Yemi Okafor-Nwosu',
    );
    expect(registrar).toBeDefined();
    expect(registrar!.hostility).toBe('friendly');
    expect(registrar!.interactions).toContain('inspect');
  });

  it('has at least 5 world objects', () => {
    expect(WORLD_AMBER_REACH_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('includes The Amber Forum with inspect and use interactions', () => {
    const forum = WORLD_AMBER_REACH_SEED.objects.find(
      (o) => o.displayName === 'The Amber Forum',
    );
    expect(forum).toBeDefined();
    expect(forum!.interactions).toContain('inspect');
    expect(forum!.interactions).toContain('use');
  });

  it('includes Reach Market Exchange with a use interaction', () => {
    const exchange = WORLD_AMBER_REACH_SEED.objects.find(
      (o) => o.displayName === 'Reach Market Exchange',
    );
    expect(exchange).toBeDefined();
    expect(exchange!.interactions).toContain('use');
  });

  it('includes the Labor Mandate Archive with a large health value', () => {
    const archive = WORLD_AMBER_REACH_SEED.objects.find(
      (o) => o.displayName === 'Labor Mandate Archive',
    );
    expect(archive).toBeDefined();
    expect(archive!.health).toBeGreaterThanOrEqual(500);
  });
});

// ── Lore Summary ──────────────────────────────────────────────────────────────

describe('WORLD_AMBER_REACH_LORE_SUMMARY', () => {
  it('is a non-empty string', () => {
    expect(typeof WORLD_AMBER_REACH_LORE_SUMMARY).toBe('string');
    expect(WORLD_AMBER_REACH_LORE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('references the node density value', () => {
    expect(WORLD_AMBER_REACH_LORE_SUMMARY).toContain(
      `${WORLD_AMBER_REACH_NODE_DENSITY}`,
    );
  });

  it('references the pending referendum count', () => {
    expect(WORLD_AMBER_REACH_LORE_SUMMARY).toContain(
      `${WORLD_AMBER_REACH_PENDING_REFERENDUMS}`,
    );
  });

  it('references the distance from Origin', () => {
    expect(WORLD_AMBER_REACH_LORE_SUMMARY).toContain(
      `${WORLD_AMBER_REACH_DISTANCE_LY}`,
    );
  });

  it('mentions democratic governance', () => {
    expect(WORLD_AMBER_REACH_LORE_SUMMARY.toLowerCase()).toContain('referendum');
  });
});
