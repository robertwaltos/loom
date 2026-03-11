import { describe, it, expect } from 'vitest';
import {
  createWorldAtlas,
  type AtlasDeps,
  type AtlasClockPort,
  type AtlasIdPort,
  type AtlasLoggerPort,
  type Coordinates,
} from '../world-atlas.js';

function createTestDeps(): AtlasDeps {
  let idCounter = 0;
  let now = 1000000;
  const clock: AtlasClockPort = {
    nowMicroseconds: () => now,
  };
  const idGenerator: AtlasIdPort = {
    generate: () => {
      idCounter++;
      return 'atlas-' + String(idCounter);
    },
  };
  const logger: AtlasLoggerPort = {
    info: () => {},
  };
  return { clock, idGenerator, logger };
}

const testCoords: Coordinates = { latitude: 45.0, longitude: -120.0 };

describe('WorldAtlas', () => {
  describe('registerWorld', () => {
    it('should register a new world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const world = atlas.registerWorld({
        worldId: 'world-001',
        worldName: 'Terra Nova',
      });
      expect(world.worldId).toBe('world-001');
      expect(world.worldName).toBe('Terra Nova');
      expect(world.biomes.length).toBe(0);
      expect(world.territories.length).toBe(0);
      expect(world.resources.length).toBe(0);
      expect(world.hazards.length).toBe(0);
    });

    it('should allow retrieving registered world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({
        worldId: 'world-001',
        worldName: 'Terra Nova',
      });
      const retrieved = atlas.getWorldMap('world-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.worldName).toBe('Terra Nova');
    });
  });

  describe('addBiome', () => {
    it('should add a biome region', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biome = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Dense forest',
      });
      expect(typeof biome).toBe('object');
      if (typeof biome === 'string') return;
      expect(biome.regionId).toBe('atlas-1');
      expect(biome.biomeType).toBe('FOREST');
      expect(biome.radiusKm).toBe(50);
    });

    it('should return error for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const result = atlas.addBiome({
        worldId: 'missing-world',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Test',
      });
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('should add biome to world map', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'DESERT',
        centerCoords: testCoords,
        radiusKm: 100,
        description: 'Vast desert',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.biomes.length).toBe(1);
      expect(world?.biomes[0]?.biomeType).toBe('DESERT');
    });

    it('should add multiple biomes', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Forest',
      });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'OCEAN',
        centerCoords: { latitude: 0, longitude: 0 },
        radiusKm: 200,
        description: 'Ocean',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.biomes.length).toBe(2);
    });
  });

  describe('setTerritoryOwner', () => {
    it('should claim territory', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'PLAINS',
        centerCoords: testCoords,
        radiusKm: 75,
        description: 'Plains',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      const territory = atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-001',
        description: 'Claimed by Dynasty 001',
      });
      expect(typeof territory).toBe('object');
      if (typeof territory === 'string') return;
      expect(territory.territoryId).toBe('atlas-2');
      expect(territory.dynastyId).toBe('dynasty-001');
    });

    it('should return error for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const result = atlas.setTerritoryOwner({
        worldId: 'missing-world',
        regionId: 'region-001',
        dynastyId: 'dynasty-001',
        description: 'Test',
      });
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('should return error for unknown region', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const result = atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: 'missing-region',
        dynastyId: 'dynasty-001',
        description: 'Test',
      });
      expect(result).toBe('REGION_NOT_FOUND');
    });

    it('should add territory to world map', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'MOUNTAIN',
        centerCoords: testCoords,
        radiusKm: 30,
        description: 'Mountains',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-002',
        description: 'Mountain stronghold',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.territories.length).toBe(1);
      expect(world?.territories[0]?.dynastyId).toBe('dynasty-002');
    });

    it('should allow multiple claims on same region', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'PLAINS',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Contested plains',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-001',
        description: 'First claim',
      });
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-002',
        description: 'Second claim',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.territories.length).toBe(2);
    });
  });

  describe('addResourceDeposit', () => {
    it('should add resource deposit', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const deposit = atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'iron',
        coords: testCoords,
        quantity: 10000,
      });
      expect(typeof deposit).toBe('object');
      if (typeof deposit === 'string') return;
      expect(deposit.depositId).toBe('atlas-1');
      expect(deposit.resourceType).toBe('iron');
      expect(deposit.quantity).toBe(10000);
      expect(deposit.discovered).toBe(false);
    });

    it('should return error for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const result = atlas.addResourceDeposit({
        worldId: 'missing-world',
        resourceType: 'gold',
        coords: testCoords,
        quantity: 5000,
      });
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('should add deposit to world map', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'copper',
        coords: testCoords,
        quantity: 8000,
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.resources.length).toBe(1);
      expect(world?.resources[0]?.resourceType).toBe('copper');
    });

    it('should add multiple deposits', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'iron',
        coords: testCoords,
        quantity: 10000,
      });
      atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'gold',
        coords: { latitude: 10, longitude: 20 },
        quantity: 2000,
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.resources.length).toBe(2);
    });
  });

  describe('discoverResource', () => {
    it('should discover resource', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const depositResult = atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'silver',
        coords: testCoords,
        quantity: 5000,
      });
      if (typeof depositResult === 'string') throw new Error('Failed to add deposit');
      const discovered = atlas.discoverResource({
        worldId: 'world-001',
        depositId: depositResult.depositId,
        dynastyId: 'dynasty-003',
      });
      expect(typeof discovered).toBe('object');
      if (typeof discovered === 'string') return;
      expect(discovered.discovered).toBe(true);
      expect(discovered.discoveredBy).toBe('dynasty-003');
    });

    it('should return error for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const result = atlas.discoverResource({
        worldId: 'missing-world',
        depositId: 'deposit-001',
        dynastyId: 'dynasty-001',
      });
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('should return error for unknown deposit', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const result = atlas.discoverResource({
        worldId: 'world-001',
        depositId: 'missing-deposit',
        dynastyId: 'dynasty-001',
      });
      expect(result).toBe('DEPOSIT_NOT_FOUND');
    });

    it('should return error if already discovered', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const depositResult = atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'platinum',
        coords: testCoords,
        quantity: 1000,
      });
      if (typeof depositResult === 'string') throw new Error('Failed to add deposit');
      atlas.discoverResource({
        worldId: 'world-001',
        depositId: depositResult.depositId,
        dynastyId: 'dynasty-001',
      });
      const result = atlas.discoverResource({
        worldId: 'world-001',
        depositId: depositResult.depositId,
        dynastyId: 'dynasty-002',
      });
      expect(result).toBe('ALREADY_DISCOVERED');
    });
  });

  describe('markHazardZone', () => {
    it('should mark hazard zone', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const hazard = atlas.markHazardZone({
        worldId: 'world-001',
        hazardType: 'radiation',
        coords: testCoords,
        radiusKm: 20,
        severity: 8,
        description: 'High radiation zone',
      });
      expect(typeof hazard).toBe('object');
      if (typeof hazard === 'string') return;
      expect(hazard.hazardId).toBe('atlas-1');
      expect(hazard.hazardType).toBe('radiation');
      expect(hazard.severity).toBe(8);
    });

    it('should return error for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const result = atlas.markHazardZone({
        worldId: 'missing-world',
        hazardType: 'toxic',
        coords: testCoords,
        radiusKm: 10,
        severity: 5,
        description: 'Toxic area',
      });
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('should add hazard to world map', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.markHazardZone({
        worldId: 'world-001',
        hazardType: 'volcanic',
        coords: testCoords,
        radiusKm: 15,
        severity: 9,
        description: 'Active volcano',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.hazards.length).toBe(1);
      expect(world?.hazards[0]?.hazardType).toBe('volcanic');
    });

    it('should add multiple hazards', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.markHazardZone({
        worldId: 'world-001',
        hazardType: 'radiation',
        coords: testCoords,
        radiusKm: 20,
        severity: 7,
        description: 'Radiation',
      });
      atlas.markHazardZone({
        worldId: 'world-001',
        hazardType: 'storm',
        coords: { latitude: 30, longitude: -50 },
        radiusKm: 50,
        severity: 6,
        description: 'Permanent storm',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.hazards.length).toBe(2);
    });
  });

  describe('getWorldMap', () => {
    it('should return complete world data', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 40,
        description: 'Forest',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-001',
        description: 'Claimed',
      });
      atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'iron',
        coords: testCoords,
        quantity: 5000,
      });
      atlas.markHazardZone({
        worldId: 'world-001',
        hazardType: 'toxic',
        coords: testCoords,
        radiusKm: 10,
        severity: 5,
        description: 'Toxic',
      });
      const world = atlas.getWorldMap('world-001');
      expect(world?.biomes.length).toBe(1);
      expect(world?.territories.length).toBe(1);
      expect(world?.resources.length).toBe(1);
      expect(world?.hazards.length).toBe(1);
    });

    it('should return undefined for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const result = atlas.getWorldMap('missing-world');
      expect(result).toBeUndefined();
    });
  });

  describe('getOwnershipHistory', () => {
    it('should return empty array for unknown world', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const history = atlas.getOwnershipHistory('missing-world', 'region-001');
      expect(history.length).toBe(0);
    });

    it('should return ownership history for region', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'PLAINS',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Contested plains',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-001',
        description: 'First claim',
      });
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-002',
        description: 'Second claim',
      });
      const history = atlas.getOwnershipHistory('world-001', biomeResult.regionId);
      expect(history.length).toBe(2);
      expect(history[0]?.dynastyId).toBe('dynasty-001');
      expect(history[1]?.dynastyId).toBe('dynasty-002');
    });

    it('should sort history by claim time', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'MOUNTAIN',
        centerCoords: testCoords,
        radiusKm: 30,
        description: 'Mountains',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      const claim1 = atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-001',
        description: 'First',
      });
      if (typeof claim1 === 'string') throw new Error('Failed to claim');
      const claim2 = atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-002',
        description: 'Second',
      });
      if (typeof claim2 === 'string') throw new Error('Failed to claim');
      const history = atlas.getOwnershipHistory('world-001', biomeResult.regionId);
      expect(history[0]?.claimedAt).toBeLessThanOrEqual(history[1]?.claimedAt ?? 0);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty atlas', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      const stats = atlas.getStats();
      expect(stats.totalWorlds).toBe(0);
      expect(stats.totalBiomes).toBe(0);
      expect(stats.totalTerritories).toBe(0);
      expect(stats.totalResources).toBe(0);
      expect(stats.totalHazards).toBe(0);
    });

    it('should count total worlds', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.registerWorld({ worldId: 'world-002', worldName: 'Nova' });
      const stats = atlas.getStats();
      expect(stats.totalWorlds).toBe(2);
    });

    it('should count biomes across worlds', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Forest',
      });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'DESERT',
        centerCoords: testCoords,
        radiusKm: 100,
        description: 'Desert',
      });
      const stats = atlas.getStats();
      expect(stats.totalBiomes).toBe(2);
    });

    it('should track biome distribution', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Forest',
      });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'FOREST',
        centerCoords: testCoords,
        radiusKm: 40,
        description: 'Another forest',
      });
      atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'OCEAN',
        centerCoords: testCoords,
        radiusKm: 200,
        description: 'Ocean',
      });
      const stats = atlas.getStats();
      expect(stats.biomeDistribution.FOREST).toBe(2);
      expect(stats.biomeDistribution.OCEAN).toBe(1);
      expect(stats.biomeDistribution.DESERT).toBe(0);
    });

    it('should count territories', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      const biomeResult = atlas.addBiome({
        worldId: 'world-001',
        biomeType: 'PLAINS',
        centerCoords: testCoords,
        radiusKm: 50,
        description: 'Plains',
      });
      if (typeof biomeResult === 'string') throw new Error('Failed to add biome');
      atlas.setTerritoryOwner({
        worldId: 'world-001',
        regionId: biomeResult.regionId,
        dynastyId: 'dynasty-001',
        description: 'Claimed',
      });
      const stats = atlas.getStats();
      expect(stats.totalTerritories).toBe(1);
    });

    it('should count resources', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'iron',
        coords: testCoords,
        quantity: 5000,
      });
      atlas.addResourceDeposit({
        worldId: 'world-001',
        resourceType: 'gold',
        coords: testCoords,
        quantity: 1000,
      });
      const stats = atlas.getStats();
      expect(stats.totalResources).toBe(2);
    });

    it('should count hazards', () => {
      const deps = createTestDeps();
      const atlas = createWorldAtlas(deps);
      atlas.registerWorld({ worldId: 'world-001', worldName: 'Terra' });
      atlas.markHazardZone({
        worldId: 'world-001',
        hazardType: 'radiation',
        coords: testCoords,
        radiusKm: 20,
        severity: 7,
        description: 'Radiation',
      });
      const stats = atlas.getStats();
      expect(stats.totalHazards).toBe(1);
    });
  });
});
