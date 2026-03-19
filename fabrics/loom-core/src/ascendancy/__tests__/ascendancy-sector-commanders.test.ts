import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBlackboard,
  writeToBlackboard,
  readBlackboardForWorld,
  getCommanderForWorld,
  adaptDoctrineForCommander,
  isOpportunistWindowOpen,
  getMirrorAdaptedVector,
  SECTOR_COMMANDERS,
} from '../ascendancy-sector-commanders.js';
import type {
  BlackboardEntry,
  AscendancyBlackboard,
  SectorCommander,
} from '../ascendancy-sector-commanders.js';
import type {
  AscendancyDoctrine,
  ApproachVector,
  WorldIntelligence,
} from '../ascendancy-strategic-mind.js';

function makeDoctrine(overrides: Partial<AscendancyDoctrine> = {}): AscendancyDoctrine {
  return {
    doctrineId: 'DOC-TEST',
    name: 'Test Doctrine',
    aggression: 0.5,
    patience: 0.5,
    vengefulness: 0.5,
    worldPreference: 'strategic',
    targetingBias: 'isolated',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<BlackboardEntry> = {}): BlackboardEntry {
  return {
    entryId: 'entry-1',
    commanderId: 'CMDR-PATIENT',
    worldId: 'world-1',
    status: 'PLANNED',
    approachVector: 'PROPAGANDA_SEEDING',
    localIntensity: 0.5,
    writtenAt: new Date('2025-01-01T00:00:00Z'),
    expiresAt: new Date('2025-02-01T00:00:00Z'),
    ...overrides,
  };
}

describe('SECTOR_COMMANDERS', () => {
  it('should contain exactly 5 commanders', () => {
    expect(SECTOR_COMMANDERS.length).toBe(5);
  });

  it('should have unique commander IDs', () => {
    const ids = SECTOR_COMMANDERS.map((c) => c.commanderId);
    expect(new Set(ids).size).toBe(5);
  });

  it('should have each commander covering 20 worlds', () => {
    for (const cmdr of SECTOR_COMMANDERS) {
      expect(cmdr.worldIds.length).toBe(20);
    }
  });
});

describe('createBlackboard', () => {
  it('should create an empty blackboard', () => {
    const board = createBlackboard();
    expect(board.entries.size).toBe(0);
  });
});

describe('writeToBlackboard', () => {
  it('should add an entry to the blackboard', () => {
    const board = createBlackboard();
    const entry = makeEntry();
    writeToBlackboard(board, entry);
    expect(board.entries.size).toBe(1);
  });

  it('should overwrite entry with same ID', () => {
    const board = createBlackboard();
    writeToBlackboard(board, makeEntry({ localIntensity: 0.3 }));
    writeToBlackboard(board, makeEntry({ localIntensity: 0.9 }));
    expect(board.entries.size).toBe(1);
    const stored = board.entries.get('entry-1');
    if (stored === undefined) {
      expect.fail('Entry should exist');
      return;
    }
    expect(stored.localIntensity).toBe(0.9);
  });
});

describe('readBlackboardForWorld', () => {
  let board: AscendancyBlackboard;

  beforeEach(() => {
    board = createBlackboard();
    writeToBlackboard(board, makeEntry({ entryId: 'e1', worldId: 'world-1' }));
    writeToBlackboard(board, makeEntry({ entryId: 'e2', worldId: 'world-2' }));
    writeToBlackboard(board, makeEntry({
      entryId: 'e3',
      worldId: 'world-1',
      expiresAt: new Date('2024-01-01T00:00:00Z'),
    }));
  });

  it('should return entries matching worldId', () => {
    const results = readBlackboardForWorld(board, 'world-1', new Date('2025-01-15T00:00:00Z'));
    expect(results.length).toBe(1);
  });

  it('should exclude expired entries', () => {
    const results = readBlackboardForWorld(board, 'world-1', new Date('2025-03-01T00:00:00Z'));
    expect(results.length).toBe(0);
  });

  it('should return empty for unknown world', () => {
    const results = readBlackboardForWorld(board, 'world-999', new Date('2025-01-15T00:00:00Z'));
    expect(results.length).toBe(0);
  });
});

describe('getCommanderForWorld', () => {
  it('should find the patient commander for world-1', () => {
    const cmdr = getCommanderForWorld('world-1');
    if (cmdr === null) {
      expect.fail('Expected a commander');
      return;
    }
    expect(cmdr.commanderId).toBe('CMDR-PATIENT');
  });

  it('should find the opportunist for world-20', () => {
    const cmdr = getCommanderForWorld('world-20');
    if (cmdr === null) {
      expect.fail('Expected a commander');
      return;
    }
    expect(cmdr.commanderId).toBe('CMDR-OPPORTUNIST');
  });

  it('should return null for unknown world', () => {
    const cmdr = getCommanderForWorld('world-unknown');
    expect(cmdr).toBeNull();
  });

  it('should find The Mirror for breach-312', () => {
    const cmdr = getCommanderForWorld('breach-312');
    if (cmdr === null) {
      expect.fail('Expected a commander');
      return;
    }
    expect(cmdr.commanderId).toBe('CMDR-MIRROR');
  });
});

describe('adaptDoctrineForCommander', () => {
  it('should apply aggression modifier', () => {
    const doc = makeDoctrine({ aggression: 0.5 });
    const patientCmdr = SECTOR_COMMANDERS[0];
    if (patientCmdr === undefined) {
      expect.fail('Expected commander');
      return;
    }
    const adapted = adaptDoctrineForCommander(doc, patientCmdr);
    expect(adapted.aggression).toBe(0.25);
  });

  it('should clamp aggression to 0 minimum', () => {
    const doc = makeDoctrine({ aggression: 0.1 });
    const patientCmdr = SECTOR_COMMANDERS[0];
    if (patientCmdr === undefined) {
      expect.fail('Expected commander');
      return;
    }
    const adapted = adaptDoctrineForCommander(doc, patientCmdr);
    expect(adapted.aggression).toBeGreaterThanOrEqual(0);
  });

  it('should clamp patience to 1 maximum', () => {
    const doc = makeDoctrine({ patience: 0.9 });
    const patientCmdr = SECTOR_COMMANDERS[0];
    if (patientCmdr === undefined) {
      expect.fail('Expected commander');
      return;
    }
    const adapted = adaptDoctrineForCommander(doc, patientCmdr);
    expect(adapted.patience).toBeLessThanOrEqual(1);
  });

  it('should update doctrineId with commander suffix', () => {
    const doc = makeDoctrine();
    const cmdr = SECTOR_COMMANDERS[1];
    if (cmdr === undefined) {
      expect.fail('Expected commander');
      return;
    }
    const adapted = adaptDoctrineForCommander(doc, cmdr);
    expect(adapted.doctrineId).toBe('DOC-TEST-CMDR-OPPORTUNIST');
  });

  it('should update name with commander name', () => {
    const doc = makeDoctrine();
    const cmdr = SECTOR_COMMANDERS[1];
    if (cmdr === undefined) {
      expect.fail('Expected commander');
      return;
    }
    const adapted = adaptDoctrineForCommander(doc, cmdr);
    expect(adapted.name).toBe('Test Doctrine (The Opportunist)');
  });
});

describe('isOpportunistWindowOpen', () => {
  it('should return true when assembly debate is active', () => {
    const world: WorldIntelligence = {
      worldId: 'w1',
      population: 1000,
      prosperityIndex: 50,
      latticeHz: 800,
      defensiveCapacity: 50,
      activePlayerCount: 5,
      isUnderAssemblyDebate: true,
      ascendancySignaturePresent: false,
      chronicleEntryCount: 10,
    };
    expect(isOpportunistWindowOpen(world)).toBe(true);
  });

  it('should return false when no debate is active', () => {
    const world: WorldIntelligence = {
      worldId: 'w1',
      population: 1000,
      prosperityIndex: 50,
      latticeHz: 800,
      defensiveCapacity: 50,
      activePlayerCount: 5,
      isUnderAssemblyDebate: false,
      ascendancySignaturePresent: false,
      chronicleEntryCount: 10,
    };
    expect(isOpportunistWindowOpen(world)).toBe(false);
  });
});

describe('getMirrorAdaptedVector', () => {
  it('should counter LATTICE_DISRUPTION with INFRASTRUCTURE_SABOTAGE', () => {
    expect(getMirrorAdaptedVector('LATTICE_DISRUPTION')).toBe('INFRASTRUCTURE_SABOTAGE');
  });

  it('should counter INFRASTRUCTURE_SABOTAGE with RESOURCE_EXTRACTION', () => {
    expect(getMirrorAdaptedVector('INFRASTRUCTURE_SABOTAGE')).toBe('RESOURCE_EXTRACTION');
  });

  it('should counter RESOURCE_EXTRACTION with POPULATION_PRESSURE', () => {
    expect(getMirrorAdaptedVector('RESOURCE_EXTRACTION')).toBe('POPULATION_PRESSURE');
  });

  it('should counter POPULATION_PRESSURE with PROPAGANDA_SEEDING', () => {
    expect(getMirrorAdaptedVector('POPULATION_PRESSURE')).toBe('PROPAGANDA_SEEDING');
  });

  it('should counter PROPAGANDA_SEEDING with DIPLOMATIC_INTERFERENCE', () => {
    expect(getMirrorAdaptedVector('PROPAGANDA_SEEDING')).toBe('DIPLOMATIC_INTERFERENCE');
  });

  it('should counter DIPLOMATIC_INTERFERENCE with LATTICE_DISRUPTION', () => {
    expect(getMirrorAdaptedVector('DIPLOMATIC_INTERFERENCE')).toBe('LATTICE_DISRUPTION');
  });
});
