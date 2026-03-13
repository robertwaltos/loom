import { describe, it, expect } from 'vitest';

import {
  WORLD_VARANTHA_STATION_ID,
  WORLD_VARANTHA_STATION_DISPLAY_NAME,
  WORLD_VARANTHA_STATION_DISTANCE_LY,
  WORLD_VARANTHA_STATION_NODE_DENSITY,
  WORLD_VARANTHA_STATION_POPULATION,
  WORLD_VARANTHA_STATION_TRANSIENT_POPULATION,
  WORLD_VARANTHA_STATION_SEED,
  WORLD_VARANTHA_STATION_LORE_SUMMARY,
} from '../world-seeds/world-varantha-station.js';

describe('World Varantha Station — constants', () => {
  it('worldId is varantha-station', () => {
    expect(WORLD_VARANTHA_STATION_ID).toBe('varantha-station');
  });

  it('display name references Varantha Station', () => {
    expect(WORLD_VARANTHA_STATION_DISPLAY_NAME).toContain('Varantha Station');
  });

  it('distance is 134 LY', () => {
    expect(WORLD_VARANTHA_STATION_DISTANCE_LY).toBe(134);
  });

  it('node density is 7', () => {
    expect(WORLD_VARANTHA_STATION_NODE_DENSITY).toBe(7);
  });

  it('permanent population is 340 million', () => {
    expect(WORLD_VARANTHA_STATION_POPULATION).toBe(340_000_000);
  });

  it('transient population is 2.3 million', () => {
    expect(WORLD_VARANTHA_STATION_TRANSIENT_POPULATION).toBe(2_300_000);
  });
});

describe('World Varantha Station — seed shape', () => {
  it('seed worldId matches constant', () => {
    expect(WORLD_VARANTHA_STATION_SEED.worldId).toBe(WORLD_VARANTHA_STATION_ID);
  });

  it('spawn points contain player and npc types', () => {
    const types = WORLD_VARANTHA_STATION_SEED.spawnPoints.map((s) => s.spawnType);
    expect(types).toContain('player');
    expect(types).toContain('npc');
  });

  it('has at least 3 player spawn points', () => {
    const playerPoints = WORLD_VARANTHA_STATION_SEED.spawnPoints.filter(
      (s) => s.spawnType === 'player',
    );
    expect(playerPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('seed has exactly 5 NPCs', () => {
    expect(WORLD_VARANTHA_STATION_SEED.npcs.length).toBe(5);
  });

  it('Dagna Thorvaldsen-Mbeki is tier 2 and neutral with health 300', () => {
    const dagna = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Dagna Thorvaldsen-Mbeki'),
    );
    expect(dagna).toBeDefined();
    expect(dagna!.tier).toBe(2);
    expect(dagna!.hostility).toBe('neutral');
    expect(dagna!.health).toBe(300);
  });

  it('Dagna Thorvaldsen-Mbeki has inspect interaction', () => {
    const dagna = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Dagna Thorvaldsen-Mbeki'),
    );
    expect(dagna!.interactions).toContain('inspect');
  });

  it('Luca Okonkwo-Reinholt is tier 2 and neutral with health 300', () => {
    const luca = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Luca Okonkwo-Reinholt'),
    );
    expect(luca).toBeDefined();
    expect(luca!.tier).toBe(2);
    expect(luca!.hostility).toBe('neutral');
    expect(luca!.health).toBe(300);
  });

  it('Luca Okonkwo-Reinholt has talk interaction', () => {
    const luca = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Luca Okonkwo-Reinholt'),
    );
    expect(luca!.interactions).toContain('talk');
  });

  it('Compact Trade Registrar Voss-Amara has trade interaction', () => {
    const registrar = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Voss-Amara'),
    );
    expect(registrar).toBeDefined();
    expect(registrar!.interactions).toContain('trade');
  });

  it('Free Port Compact Historical Archivist is tier 0 with health 1 (non-combatant)', () => {
    const archivist = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Historical Archivist'),
    );
    expect(archivist).toBeDefined();
    expect(archivist!.tier).toBe(0);
    expect(archivist!.health).toBe(1);
  });

  it('Transit Berth Coordinator Osei-Ferreira is friendly', () => {
    const coordinator = WORLD_VARANTHA_STATION_SEED.npcs.find((n) =>
      n.displayName.includes('Osei-Ferreira'),
    );
    expect(coordinator).toBeDefined();
    expect(coordinator!.hostility).toBe('friendly');
  });

  it('has at least 5 objects', () => {
    expect(WORLD_VARANTHA_STATION_SEED.objects.length).toBeGreaterThanOrEqual(5);
  });

  it('The Varantha Exchange has use interaction', () => {
    const exchange = WORLD_VARANTHA_STATION_SEED.objects.find((o) =>
      o.displayName.includes('Varantha Exchange'),
    );
    expect(exchange).toBeDefined();
    expect(exchange!.interactions).toContain('use');
  });

  it('Node Cluster Varantha Station has use interaction and health >= 700', () => {
    const cluster = WORLD_VARANTHA_STATION_SEED.objects.find((o) =>
      o.displayName.includes('Node Cluster'),
    );
    expect(cluster).toBeDefined();
    expect(cluster!.interactions).toContain('use');
    expect(cluster!.health).toBeGreaterThanOrEqual(700);
  });

  it('The Free Port Compact Charter is inspectable', () => {
    const charter = WORLD_VARANTHA_STATION_SEED.objects.find((o) =>
      o.displayName.includes('Free Port Compact Charter'),
    );
    expect(charter).toBeDefined();
    expect(charter!.interactions).toContain('inspect');
  });

  it('Transit Berth Manifest is inspectable', () => {
    const manifest = WORLD_VARANTHA_STATION_SEED.objects.find((o) =>
      o.displayName.includes('Transit Berth Manifest'),
    );
    expect(manifest).toBeDefined();
    expect(manifest!.interactions).toContain('inspect');
  });
});

describe('World Varantha Station — lore summary', () => {
  it('lore summary is a string', () => {
    expect(typeof WORLD_VARANTHA_STATION_LORE_SUMMARY).toBe('string');
  });

  it('lore summary references node density', () => {
    expect(WORLD_VARANTHA_STATION_LORE_SUMMARY).toContain(
      String(WORLD_VARANTHA_STATION_NODE_DENSITY),
    );
  });

  it('lore summary references distance', () => {
    expect(WORLD_VARANTHA_STATION_LORE_SUMMARY).toContain(
      String(WORLD_VARANTHA_STATION_DISTANCE_LY),
    );
  });

  it('lore summary mentions transient population', () => {
    expect(WORLD_VARANTHA_STATION_LORE_SUMMARY).toContain('transient');
  });

  it('lore summary mentions Free Port Compact', () => {
    expect(WORLD_VARANTHA_STATION_LORE_SUMMARY).toContain('Free Port Compact');
  });

  it('lore summary mentions KALON or commercial hub', () => {
    const lower = WORLD_VARANTHA_STATION_LORE_SUMMARY.toLowerCase();
    expect(lower).toMatch(/kalon|commercial hub/);
  });
});
