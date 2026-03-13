import { describe, it, expect } from 'vitest';

import {
  WORLD_VEIL_OF_KASS_ID,
  WORLD_VEIL_OF_KASS_DISPLAY_NAME,
  WORLD_VEIL_OF_KASS_DISTANCE_LY,
  WORLD_VEIL_OF_KASS_NODE_DENSITY,
  WORLD_VEIL_OF_KASS_SOVEREIGNTY_TRANSITIONS,
  WORLD_VEIL_OF_KASS_KALON_ISSUANCE_MILLIONS,
  WORLD_VEIL_OF_KASS_SEED,
  WORLD_VEIL_OF_KASS_LORE_SUMMARY,
} from '../world-seeds/world-veil-of-kass.js';

describe('World Veil of Kass — constants', () => {
  it('worldId is veil-of-kass', () => {
    expect(WORLD_VEIL_OF_KASS_ID).toBe('veil-of-kass');
  });

  it('display name references The Veil of Kass', () => {
    expect(WORLD_VEIL_OF_KASS_DISPLAY_NAME).toContain('Veil of Kass');
  });

  it('distance is 78 LY', () => {
    expect(WORLD_VEIL_OF_KASS_DISTANCE_LY).toBe(78);
  });

  it('node density is 8', () => {
    expect(WORLD_VEIL_OF_KASS_NODE_DENSITY).toBe(8);
  });

  it('sovereignty transitions is 7', () => {
    expect(WORLD_VEIL_OF_KASS_SOVEREIGNTY_TRANSITIONS).toBe(7);
  });

  it('KALON issuance is 58 million', () => {
    expect(WORLD_VEIL_OF_KASS_KALON_ISSUANCE_MILLIONS).toBe(58);
  });
});

describe('World Veil of Kass — seed shape', () => {
  it('seed worldId matches constant', () => {
    expect(WORLD_VEIL_OF_KASS_SEED.worldId).toBe(WORLD_VEIL_OF_KASS_ID);
  });

  it('spawn points contain player and npc types', () => {
    const types = WORLD_VEIL_OF_KASS_SEED.spawnPoints.map((s) => s.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least 3 player spawn points', () => {
    const playerPoints = WORLD_VEIL_OF_KASS_SEED.spawnPoints.filter(
      (s) => s.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('seed has exactly 5 NPCs', () => {
    expect(WORLD_VEIL_OF_KASS_SEED.npcs.length).toBe(5);
  });

  it('Rael Kass-Voss is tier 2 and has trade interaction', () => {
    const rael = WORLD_VEIL_OF_KASS_SEED.npcs.find((n) =>
      n.displayName.includes('Rael Kass-Voss'),
    );
    expect(rael).toBeDefined();
    expect(rael!.tier).toBe(2);
    expect(rael!.interactions).toContain('trade');
  });

  it('Rael Kass-Voss is neutral', () => {
    const rael = WORLD_VEIL_OF_KASS_SEED.npcs.find((n) =>
      n.displayName.includes('Rael Kass-Voss'),
    );
    expect(rael!.hostility).toBe('neutral');
  });

  it('Commerce Registrar Djemba-Nwosu has inspect interaction', () => {
    const registrar = WORLD_VEIL_OF_KASS_SEED.npcs.find((n) =>
      n.displayName.includes('Djemba-Nwosu'),
    );
    expect(registrar).toBeDefined();
    expect(registrar!.interactions).toContain('inspect');
  });

  it('Sovereignty Transit Officer Adisa-Voss has inspect interaction', () => {
    const officer = WORLD_VEIL_OF_KASS_SEED.npcs.find((n) =>
      n.displayName.includes('Adisa-Voss'),
    );
    expect(officer).toBeDefined();
    expect(officer!.interactions).toContain('inspect');
  });

  it('Soren Meridian is friendly', () => {
    const soren = WORLD_VEIL_OF_KASS_SEED.npcs.find((n) =>
      n.displayName.includes('Soren Meridian'),
    );
    expect(soren).toBeDefined();
    expect(soren!.hostility).toBe('friendly');
  });

  it('Free Port Transit Broker Amara-Kass has trade interaction', () => {
    const broker = WORLD_VEIL_OF_KASS_SEED.npcs.find((n) =>
      n.displayName.includes('Amara-Kass'),
    );
    expect(broker).toBeDefined();
    expect(broker!.interactions).toContain('trade');
  });

  it('has at least 5 objects', () => {
    expect(WORLD_VEIL_OF_KASS_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('The Veil Exchange has use interaction', () => {
    const exchange = WORLD_VEIL_OF_KASS_SEED.objects.find((o) =>
      o.displayName.includes('Veil Exchange'),
    );
    expect(exchange).toBeDefined();
    expect(exchange!.interactions).toContain('use');
  });

  it('Node Amplification Array has use interaction and health >= 750', () => {
    const array = WORLD_VEIL_OF_KASS_SEED.objects.find((o) =>
      o.displayName.includes('Node Amplification Array'),
    );
    expect(array).toBeDefined();
    expect(array!.interactions).toContain('use');
    expect(array!.health).toBeGreaterThanOrEqual(750);
  });

  it('The Sovereignty Record Board is inspectable', () => {
    const board = WORLD_VEIL_OF_KASS_SEED.objects.find((o) =>
      o.displayName.includes('Sovereignty Record Board'),
    );
    expect(board).toBeDefined();
    expect(board!.interactions).toContain('inspect');
  });

  it('The Binary Observation Platform is inspectable', () => {
    const platform = WORLD_VEIL_OF_KASS_SEED.objects.find((o) =>
      o.displayName.includes('Binary Observation Platform'),
    );
    expect(platform).toBeDefined();
    expect(platform!.interactions).toContain('inspect');
  });
});

describe('World Veil of Kass — lore summary', () => {
  it('lore summary is a string', () => {
    expect(typeof WORLD_VEIL_OF_KASS_LORE_SUMMARY).toBe('string');
  });

  it('lore summary references node density', () => {
    expect(WORLD_VEIL_OF_KASS_LORE_SUMMARY).toContain(
      String(WORLD_VEIL_OF_KASS_NODE_DENSITY),
    );
  });

  it('lore summary references KALON issuance', () => {
    expect(WORLD_VEIL_OF_KASS_LORE_SUMMARY).toContain(
      String(WORLD_VEIL_OF_KASS_KALON_ISSUANCE_MILLIONS),
    );
  });

  it('lore summary references sovereignty transitions', () => {
    expect(WORLD_VEIL_OF_KASS_LORE_SUMMARY).toContain(
      String(WORLD_VEIL_OF_KASS_SOVEREIGNTY_TRANSITIONS),
    );
  });

  it('lore summary references distance', () => {
    expect(WORLD_VEIL_OF_KASS_LORE_SUMMARY).toContain(
      String(WORLD_VEIL_OF_KASS_DISTANCE_LY),
    );
  });

  it('lore summary mentions binary star type', () => {
    const lower = WORLD_VEIL_OF_KASS_LORE_SUMMARY.toLowerCase();
    expect(lower).toMatch(/binary|k2|m4/);
  });
});
