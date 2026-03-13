/**
 * Simulation tests — World 499: The Threshold (world seed)
 *
 * Validates the exported constants and data structures of the world-499 seed
 * file without requiring any runtime services.
 */

import { describe, it, expect } from 'vitest';
import {
  WORLD_499_ID,
  WORLD_499_DISPLAY_NAME,
  WORLD_499_DISTANCE_LY,
  FERREIRA_ASANTE_ECHO_MS,
  WORLD_499_LATTICE_PRECISION,
  WORLD_499_SEED,
  WORLD_499_LORE_SUMMARY,
} from '../world-seeds/world-499-threshold.js';

// ── Constants ────────────────────────────────────────────────────────────────

describe('world-499 constants', () => {
  it('has the correct world id', () => {
    expect(WORLD_499_ID).toBe('world-499');
  });

  it('has the correct display name', () => {
    expect(WORLD_499_DISPLAY_NAME).toBe('The Threshold');
  });

  it('is located at the outer arc fringe (≥ 280 LY)', () => {
    expect(WORLD_499_DISTANCE_LY).toBeGreaterThanOrEqual(280);
    expect(WORLD_499_DISTANCE_LY).toBe(284);
  });

  it('has the canonical Ferreira-Asante echo delay of 94ms', () => {
    expect(FERREIRA_ASANTE_ECHO_MS).toBe(94);
  });

  it('has an anomalously high lattice precision for outer arc', () => {
    // Outer arc normally has lower precision; 0.97 is the anomalous value
    expect(WORLD_499_LATTICE_PRECISION).toBeGreaterThan(0.9);
    expect(WORLD_499_LATTICE_PRECISION).toBe(0.97);
  });
});

// ── Seed Shape ───────────────────────────────────────────────────────────────

describe('WORLD_499_SEED shape', () => {
  it('carries the correct worldId', () => {
    expect(WORLD_499_SEED.worldId).toBe(WORLD_499_ID);
  });

  it('has spawn points covering player and npc types', () => {
    const types = WORLD_499_SEED.spawnPoints.map((sp) => sp.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least two player spawn points', () => {
    const playerPoints = WORLD_499_SEED.spawnPoints.filter(
      (sp) => sp.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(2);
  });

  it('has 5 named NPCs', () => {
    expect(WORLD_499_SEED.npcs.length).toBe(5);
  });

  it('includes Dr. Cassia Ferreira-Asante as a Tier 1 friendly NPC', () => {
    const fa = WORLD_499_SEED.npcs.find(
      (n) => n.displayName === 'Dr. Cassia Ferreira-Asante',
    );
    expect(fa).toBeDefined();
    expect(fa!.tier).toBe(1);
    expect(fa!.hostility).toBe('friendly');
    expect(fa!.interactions).toContain('talk');
    expect(fa!.interactions).toContain('trade');
  });

  it('includes Orin Vael as a Tier 2 neutral NPC', () => {
    const vael = WORLD_499_SEED.npcs.find((n) => n.displayName === 'Orin Vael');
    expect(vael).toBeDefined();
    expect(vael!.tier).toBe(2);
    expect(vael!.hostility).toBe('neutral');
  });

  it('includes Archivist-Node as a non-humanoid Tier 0 NPC with minimal health', () => {
    const node = WORLD_499_SEED.npcs.find((n) => n.displayName === 'Archivist-Node');
    expect(node).toBeDefined();
    expect(node!.tier).toBe(0);
    expect(node!.health).toBe(1);
    expect(node!.hostility).toBe('friendly');
  });

  it('includes Echo Prospectors as the highest-health Tier 3 entity', () => {
    const prospectors = WORLD_499_SEED.npcs.find(
      (n) => n.displayName === 'Echo Prospectors Consortium',
    );
    expect(prospectors).toBeDefined();
    expect(prospectors!.tier).toBe(3);
    expect(prospectors!.health).toBe(200);
  });

  it('has at least 5 world objects', () => {
    expect(WORLD_499_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('includes The Resonance Column with a use interaction', () => {
    const col = WORLD_499_SEED.objects.find(
      (o) => o.displayName === 'The Resonance Column',
    );
    expect(col).toBeDefined();
    expect(col!.interactions).toContain('use');
    expect(col!.interactions).toContain('inspect');
  });

  it('includes the sealed Survey Container with a large health value', () => {
    const container = WORLD_499_SEED.objects.find(
      (o) => o.displayName === 'Survey Container — SURVEY-499-A',
    );
    expect(container).toBeDefined();
    expect(container!.health).toBeGreaterThanOrEqual(500);
  });
});

// ── Lore Summary ─────────────────────────────────────────────────────────────

describe('WORLD_499_LORE_SUMMARY', () => {
  it('is a non-empty string', () => {
    expect(typeof WORLD_499_LORE_SUMMARY).toBe('string');
    expect(WORLD_499_LORE_SUMMARY.length).toBeGreaterThan(0);
  });

  it('references the Ferreira-Asante echo delay', () => {
    expect(WORLD_499_LORE_SUMMARY).toContain(`${FERREIRA_ASANTE_ECHO_MS}ms`);
  });

  it('references the lattice precision value', () => {
    expect(WORLD_499_LORE_SUMMARY).toContain(`${WORLD_499_LATTICE_PRECISION}`);
  });

  it('references the distance from Origin', () => {
    expect(WORLD_499_LORE_SUMMARY).toContain(`${WORLD_499_DISTANCE_LY}`);
  });

  it('mentions quarantine rescinded status', () => {
    expect(WORLD_499_LORE_SUMMARY.toLowerCase()).toContain('quarantine');
  });
});
