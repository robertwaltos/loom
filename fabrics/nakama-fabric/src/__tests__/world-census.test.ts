import { describe, it, expect } from 'vitest';
import { createWorldCensusService } from '../world-census.js';
import type { WorldCensusDeps } from '../world-census.js';

function makeDeps(): WorldCensusDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('WorldCensusService — world registration', () => {
  it('registers a world', () => {
    const census = createWorldCensusService(makeDeps());
    expect(census.registerWorld('earth', 1000)).toBe(true);
    expect(census.getPopulation('earth')?.populationCap).toBe(1000);
  });

  it('rejects duplicate world', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 1000);
    expect(census.registerWorld('earth', 500)).toBe(false);
  });

  it('removes a world', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 1000);
    expect(census.removeWorld('earth')).toBe(true);
    expect(census.getPopulation('earth')).toBeUndefined();
  });
});

describe('WorldCensusService — residency', () => {
  it('adds a resident', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 100);
    expect(census.addResident({ dynastyId: 'd1', worldId: 'earth' })).toBe(true);
    expect(census.getResidentWorld('d1')).toBe('earth');
    expect(census.getPopulation('earth')?.dynastyCount).toBe(1);
  });

  it('rejects duplicate residency', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 100);
    census.addResident({ dynastyId: 'd1', worldId: 'earth' });
    expect(census.addResident({ dynastyId: 'd1', worldId: 'earth' })).toBe(false);
  });

  it('rejects resident to unknown world', () => {
    const census = createWorldCensusService(makeDeps());
    expect(census.addResident({ dynastyId: 'd1', worldId: 'mars' })).toBe(false);
  });

  it('enforces population cap', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('small', 1);
    census.addResident({ dynastyId: 'd1', worldId: 'small' });
    expect(census.addResident({ dynastyId: 'd2', worldId: 'small' })).toBe(false);
    expect(census.isWorldFull('small')).toBe(true);
  });

  it('removes a resident', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 100);
    census.addResident({ dynastyId: 'd1', worldId: 'earth' });
    expect(census.removeResident('d1')).toBe(true);
    expect(census.getResidentWorld('d1')).toBeUndefined();
    expect(census.getPopulation('earth')?.dynastyCount).toBe(0);
  });
});

describe('WorldCensusService — migration', () => {
  it('migrates a dynasty between worlds', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 100);
    census.registerWorld('mars', 100);
    census.addResident({ dynastyId: 'd1', worldId: 'earth' });
    const record = census.migrate('d1', 'mars');
    expect(record?.fromWorldId).toBe('earth');
    expect(record?.toWorldId).toBe('mars');
    expect(census.getResidentWorld('d1')).toBe('mars');
    expect(census.getPopulation('earth')?.dynastyCount).toBe(0);
    expect(census.getPopulation('mars')?.dynastyCount).toBe(1);
  });

  it('rejects migration to full world', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 100);
    census.registerWorld('full', 0);
    census.addResident({ dynastyId: 'd1', worldId: 'earth' });
    expect(census.migrate('d1', 'full')).toBeUndefined();
  });

  it('rejects migration for non-resident', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('mars', 100);
    expect(census.migrate('d1', 'mars')).toBeUndefined();
  });
});

describe('WorldCensusService — queries', () => {
  it('checks world full status', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 2);
    expect(census.isWorldFull('earth')).toBe(false);
    census.addResident({ dynastyId: 'd1', worldId: 'earth' });
    census.addResident({ dynastyId: 'd2', worldId: 'earth' });
    expect(census.isWorldFull('earth')).toBe(true);
  });

  it('returns undefined for unknown resident', () => {
    const census = createWorldCensusService(makeDeps());
    expect(census.getResidentWorld('unknown')).toBeUndefined();
  });
});

describe('WorldCensusService — stats', () => {
  it('tracks aggregate statistics', () => {
    const census = createWorldCensusService(makeDeps());
    census.registerWorld('earth', 100);
    census.registerWorld('mars', 100);
    census.addResident({ dynastyId: 'd1', worldId: 'earth' });
    census.migrate('d1', 'mars');

    const stats = census.getStats();
    expect(stats.totalWorlds).toBe(2);
    expect(stats.totalResidents).toBe(1);
    expect(stats.totalMigrations).toBe(1);
  });

  it('starts with zero stats', () => {
    const census = createWorldCensusService(makeDeps());
    const stats = census.getStats();
    expect(stats.totalWorlds).toBe(0);
    expect(stats.totalResidents).toBe(0);
  });
});
