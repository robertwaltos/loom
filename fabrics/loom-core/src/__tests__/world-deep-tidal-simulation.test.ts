import { describe, it, expect } from 'vitest';

import {
  WORLD_DEEP_TIDAL_ID,
  WORLD_DEEP_TIDAL_DISPLAY_NAME,
  WORLD_DEEP_TIDAL_DISTANCE_LY,
  WORLD_DEEP_TIDAL_NODE_DENSITY,
  WORLD_DEEP_TIDAL_TIDAL_ZONE_COUNT,
  WORLD_DEEP_TIDAL_TWILIGHT_BELT_POPULATION,
  WORLD_DEEP_TIDAL_SEED,
  WORLD_DEEP_TIDAL_LORE_SUMMARY,
} from '../world-seeds/world-deep-tidal.js';

describe('World Deep Tidal — constants', () => {
  it('worldId is deep-tidal', () => {
    expect(WORLD_DEEP_TIDAL_ID).toBe('deep-tidal');
  });

  it('display name references Deep Tidal', () => {
    expect(WORLD_DEEP_TIDAL_DISPLAY_NAME).toContain('Deep Tidal');
  });

  it('distance is 112 LY', () => {
    expect(WORLD_DEEP_TIDAL_DISTANCE_LY).toBe(112);
  });

  it('node density is 4 — lowest of launch worlds', () => {
    expect(WORLD_DEEP_TIDAL_NODE_DENSITY).toBe(4);
  });

  it('tidal zone count is 3', () => {
    expect(WORLD_DEEP_TIDAL_TIDAL_ZONE_COUNT).toBe(3);
  });

  it('Twilight Belt population is 47 million', () => {
    expect(WORLD_DEEP_TIDAL_TWILIGHT_BELT_POPULATION).toBe(47_000_000);
  });
});

describe('World Deep Tidal — seed shape', () => {
  it('seed worldId matches constant', () => {
    expect(WORLD_DEEP_TIDAL_SEED.worldId).toBe(WORLD_DEEP_TIDAL_ID);
  });

  it('spawn points contain player and npc types', () => {
    const types = WORLD_DEEP_TIDAL_SEED.spawnPoints.map((s) => s.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least 3 player spawn points', () => {
    const playerPoints = WORLD_DEEP_TIDAL_SEED.spawnPoints.filter(
      (s) => s.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('seed has exactly 5 NPCs', () => {
    expect(WORLD_DEEP_TIDAL_SEED.npcs.length).toBe(5);
  });

  it('Admiral Yara Sundaram-Chen is tier 2 and neutral with health 500', () => {
    const admiral = WORLD_DEEP_TIDAL_SEED.npcs.find((n) =>
      n.displayName.includes('Yara Sundaram-Chen'),
    );
    expect(admiral).toBeDefined();
    expect(admiral!.tier).toBe(2);
    expect(admiral!.hostility).toBe('neutral');
    expect(admiral!.health).toBe(500);
  });

  it('Admiral Yara Sundaram-Chen has inspect interaction', () => {
    const admiral = WORLD_DEEP_TIDAL_SEED.npcs.find((n) =>
      n.displayName.includes('Yara Sundaram-Chen'),
    );
    expect(admiral!.interactions).toContain('inspect');
  });

  it('Captain Odalys Ferreira-Asante is tier 2 and neutral with health 400', () => {
    const captain = WORLD_DEEP_TIDAL_SEED.npcs.find((n) =>
      n.displayName.includes('Odalys Ferreira-Asante'),
    );
    expect(captain).toBeDefined();
    expect(captain!.tier).toBe(2);
    expect(captain!.hostility).toBe('neutral');
    expect(captain!.health).toBe(400);
  });

  it('Captain Odalys Ferreira-Asante has inspect interaction', () => {
    const captain = WORLD_DEEP_TIDAL_SEED.npcs.find((n) =>
      n.displayName.includes('Odalys Ferreira-Asante'),
    );
    expect(captain!.interactions).toContain('inspect');
  });

  it('Field Archivist Achebe is tier 0 with health 1 (non-combatant)', () => {
    const archivist = WORLD_DEEP_TIDAL_SEED.npcs.find((n) =>
      n.displayName.includes('Archivist Achebe'),
    );
    expect(archivist).toBeDefined();
    expect(archivist!.tier).toBe(0);
    expect(archivist!.health).toBe(1);
  });

  it('Twilight Belt Liaison Okonkwo is friendly', () => {
    const liaison = WORLD_DEEP_TIDAL_SEED.npcs.find((n) =>
      n.displayName.includes('Okonkwo'),
    );
    expect(liaison).toBeDefined();
    expect(liaison!.hostility).toBe('friendly');
  });

  it('has at least 5 objects', () => {
    expect(WORLD_DEEP_TIDAL_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('The Admiralty Operations Board has use interaction', () => {
    const board = WORLD_DEEP_TIDAL_SEED.objects.find((o) =>
      o.displayName.includes('Admiralty Operations Board'),
    );
    expect(board).toBeDefined();
    expect(board!.interactions).toContain('use');
  });

  it('Node Cluster Deep Tidal has use interaction and health >= 600', () => {
    const cluster = WORLD_DEEP_TIDAL_SEED.objects.find((o) =>
      o.displayName.includes('Node Cluster'),
    );
    expect(cluster).toBeDefined();
    expect(cluster!.interactions).toContain('use');
    expect(cluster!.health).toBeGreaterThanOrEqual(600);
  });

  it('Twilight Observatory Platform is inspectable', () => {
    const platform = WORLD_DEEP_TIDAL_SEED.objects.find((o) =>
      o.displayName.includes('Twilight Observatory Platform'),
    );
    expect(platform).toBeDefined();
    expect(platform!.interactions).toContain('inspect');
  });

  it('Tidal Lock Assessment is inspectable', () => {
    const assessment = WORLD_DEEP_TIDAL_SEED.objects.find((o) =>
      o.displayName.includes('Tidal Lock Assessment'),
    );
    expect(assessment).toBeDefined();
    expect(assessment!.interactions).toContain('inspect');
  });
});

describe('World Deep Tidal — lore summary', () => {
  it('lore summary is a string', () => {
    expect(typeof WORLD_DEEP_TIDAL_LORE_SUMMARY).toBe('string');
  });

  it('lore summary references node density', () => {
    expect(WORLD_DEEP_TIDAL_LORE_SUMMARY).toContain(
      String(WORLD_DEEP_TIDAL_NODE_DENSITY),
    );
  });

  it('lore summary references tidal zone count', () => {
    expect(WORLD_DEEP_TIDAL_LORE_SUMMARY).toContain(
      String(WORLD_DEEP_TIDAL_TIDAL_ZONE_COUNT),
    );
  });

  it('lore summary references distance', () => {
    expect(WORLD_DEEP_TIDAL_LORE_SUMMARY).toContain(
      String(WORLD_DEEP_TIDAL_DISTANCE_LY),
    );
  });

  it('lore summary mentions tidal locking or tidal zones', () => {
    const lower = WORLD_DEEP_TIDAL_LORE_SUMMARY.toLowerCase();
    expect(lower).toMatch(/tidal|day side|night side|twilight/);
  });

  it('lore summary mentions Survey Corps administration', () => {
    expect(WORLD_DEEP_TIDAL_LORE_SUMMARY).toMatch(/Survey Corps/);
  });
});
