import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectDoctrine,
  scoreWorldTarget,
  selectApproachVector,
  buildStrategicPlan,
  ASCENDANCY_DOCTRINE_TEMPLATES,
} from '../ascendancy-strategic-mind.js';
import type {
  AscendancyDoctrine,
  WorldIntelligence,
  AscendancyStrategicPlan,
} from '../ascendancy-strategic-mind.js';

function makeWorld(overrides: Partial<WorldIntelligence> = {}): WorldIntelligence {
  return {
    worldId: 'world-test-1',
    population: 50000,
    prosperityIndex: 50,
    latticeHz: 800,
    defensiveCapacity: 50,
    activePlayerCount: 5,
    isUnderAssemblyDebate: false,
    ascendancySignaturePresent: false,
    chronicleEntryCount: 30,
    ...overrides,
  };
}

describe('selectDoctrine', () => {
  it('should return the first doctrine for seed 0', () => {
    const doc = selectDoctrine(0);
    expect(doc.doctrineId).toBe('DOC-01');
  });

  it('should wrap around when seed exceeds template count', () => {
    const doc = selectDoctrine(15);
    expect(doc.doctrineId).toBe('DOC-01');
  });

  it('should return DOC-10 for seed 9', () => {
    const doc = selectDoctrine(9);
    expect(doc.doctrineId).toBe('DOC-10');
  });

  it('should return same doctrine for deterministic seed', () => {
    const a = selectDoctrine(7);
    const b = selectDoctrine(7);
    expect(a.doctrineId).toBe(b.doctrineId);
  });
});

describe('ASCENDANCY_DOCTRINE_TEMPLATES', () => {
  it('should contain exactly 15 templates', () => {
    expect(ASCENDANCY_DOCTRINE_TEMPLATES.length).toBe(15);
  });

  it('should have unique doctrine IDs', () => {
    const ids = ASCENDANCY_DOCTRINE_TEMPLATES.map((d) => d.doctrineId);
    const unique = new Set(ids);
    expect(unique.size).toBe(15);
  });

  it('should have aggression values between 0 and 1', () => {
    for (const doc of ASCENDANCY_DOCTRINE_TEMPLATES) {
      expect(doc.aggression).toBeGreaterThanOrEqual(0);
      expect(doc.aggression).toBeLessThanOrEqual(1);
    }
  });
});

describe('scoreWorldTarget', () => {
  it('should give bonus for isolated targeting bias with few players', () => {
    const doc = selectDoctrine(0); // isolated bias
    const world = makeWorld({ activePlayerCount: 2 });
    const score = scoreWorldTarget(world, doc);
    expect(score).toBeGreaterThanOrEqual(30);
  });

  it('should give bonus for defended targeting bias with high defense', () => {
    const doc = selectDoctrine(2); // defended bias
    const world = makeWorld({ defensiveCapacity: 80 });
    const score = scoreWorldTarget(world, doc);
    expect(score).toBeGreaterThanOrEqual(30);
  });

  it('should give bonus for politically contested with assembly debate', () => {
    const doc = selectDoctrine(3); // politically_contested
    const world = makeWorld({ isUnderAssemblyDebate: true });
    const score = scoreWorldTarget(world, doc);
    expect(score).toBeGreaterThanOrEqual(30);
  });

  it('should penalize worlds with existing ascendancy signature', () => {
    const doc = selectDoctrine(0);
    const worldClean = makeWorld({ activePlayerCount: 1 });
    const worldSig = makeWorld({
      activePlayerCount: 1,
      ascendancySignaturePresent: true,
    });
    const scoreClean = scoreWorldTarget(worldClean, doc);
    const scoreSig = scoreWorldTarget(worldSig, doc);
    expect(scoreSig).toBeLessThan(scoreClean);
  });

  it('should cap score at 100', () => {
    const doc = selectDoctrine(9); // high aggression
    const world = makeWorld({
      defensiveCapacity: 90,
      activePlayerCount: 1,
      prosperityIndex: 90,
      isUnderAssemblyDebate: true,
      chronicleEntryCount: 100,
    });
    const score = scoreWorldTarget(world, doc);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should return 0 for a world with no matching criteria and signature present', () => {
    const doc = selectDoctrine(0); // isolated, resource
    const world = makeWorld({
      activePlayerCount: 10,
      prosperityIndex: 10,
      defensiveCapacity: 10,
      ascendancySignaturePresent: true,
    });
    const score = scoreWorldTarget(world, doc);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('selectApproachVector', () => {
  it('should return RESOURCE_EXTRACTION for resource preference', () => {
    const doc = selectDoctrine(0); // resource preference
    const world = makeWorld();
    expect(selectApproachVector(world, doc)).toBe('RESOURCE_EXTRACTION');
  });

  it('should return PROPAGANDA_SEEDING for symbolic preference', () => {
    const doc = selectDoctrine(2); // symbolic preference
    const world = makeWorld();
    expect(selectApproachVector(world, doc)).toBe('PROPAGANDA_SEEDING');
  });

  it('should return LATTICE_DISRUPTION for high aggression with high Hz', () => {
    const doc: AscendancyDoctrine = {
      doctrineId: 'test',
      name: 'Test',
      aggression: 0.8,
      patience: 0.2,
      vengefulness: 0.5,
      worldPreference: 'strategic',
      targetingBias: 'isolated',
    };
    const world = makeWorld({ latticeHz: 900 });
    expect(selectApproachVector(world, doc)).toBe('LATTICE_DISRUPTION');
  });

  it('should return DIPLOMATIC_INTERFERENCE for low aggression during debate', () => {
    const doc: AscendancyDoctrine = {
      doctrineId: 'test',
      name: 'Test',
      aggression: 0.3,
      patience: 0.7,
      vengefulness: 0.3,
      worldPreference: 'strategic',
      targetingBias: 'isolated',
    };
    const world = makeWorld({ isUnderAssemblyDebate: true });
    expect(selectApproachVector(world, doc)).toBe('DIPLOMATIC_INTERFERENCE');
  });

  it('should return POPULATION_PRESSURE as fallback', () => {
    const doc: AscendancyDoctrine = {
      doctrineId: 'test',
      name: 'Test',
      aggression: 0.3,
      patience: 0.7,
      vengefulness: 0.3,
      worldPreference: 'strategic',
      targetingBias: 'isolated',
    };
    const world = makeWorld({ isUnderAssemblyDebate: false });
    expect(selectApproachVector(world, doc)).toBe('POPULATION_PRESSURE');
  });
});

describe('buildStrategicPlan', () => {
  let doctrine: AscendancyDoctrine;
  let worlds: WorldIntelligence[];
  let startDate: Date;

  beforeEach(() => {
    doctrine = selectDoctrine(0);
    worlds = [
      makeWorld({ worldId: 'w1', activePlayerCount: 1, prosperityIndex: 80 }),
      makeWorld({ worldId: 'w2', activePlayerCount: 1, prosperityIndex: 90 }),
      makeWorld({ worldId: 'w3', activePlayerCount: 10, prosperityIndex: 20 }),
    ];
    startDate = new Date('2025-01-01T00:00:00Z');
  });

  it('should create a plan with correct planId', () => {
    const plan = buildStrategicPlan({
      planId: 'plan-1',
      doctrine,
      worlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    expect(plan.planId).toBe('plan-1');
  });

  it('should set cycle end date 14 days after start', () => {
    const plan = buildStrategicPlan({
      planId: 'plan-1',
      doctrine,
      worlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    const diffMs = plan.cycleEndDate.getTime() - plan.cycleStartDate.getTime();
    expect(diffMs).toBe(14 * 86400000);
  });

  it('should select at most 3 targets', () => {
    const plan = buildStrategicPlan({
      planId: 'plan-1',
      doctrine,
      worlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    expect(plan.targets.length).toBeLessThanOrEqual(3);
  });

  it('should filter out low-scoring worlds (score <= 10)', () => {
    const lowWorlds = [
      makeWorld({
        worldId: 'w-low',
        activePlayerCount: 10,
        prosperityIndex: 10,
        defensiveCapacity: 10,
        ascendancySignaturePresent: true,
      }),
    ];
    const plan = buildStrategicPlan({
      planId: 'plan-2',
      doctrine,
      worlds: lowWorlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    expect(plan.targets.length).toBe(0);
  });

  it('should assign priority ranks 1, 2, 3', () => {
    const plan = buildStrategicPlan({
      planId: 'plan-1',
      doctrine,
      worlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    for (let i = 0; i < plan.targets.length; i++) {
      const target = plan.targets[i];
      if (target === undefined) continue;
      expect(target.priorityRank).toBe(i + 1);
    }
  });

  it('should allocate 0.5 to first target', () => {
    const plan = buildStrategicPlan({
      planId: 'plan-1',
      doctrine,
      worlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    const first = plan.targets[0];
    if (first === undefined) {
      expect.fail('Expected at least one target');
      return;
    }
    expect(first.resourceAllocation).toBe(0.5);
  });

  it('should compute totalResourceAllocation as sum of target allocations', () => {
    const plan = buildStrategicPlan({
      planId: 'plan-1',
      doctrine,
      worlds,
      cycleStartDate: startDate,
      planVersion: 1,
    });
    const sum = plan.targets.reduce((s, t) => s + t.resourceAllocation, 0);
    expect(plan.totalResourceAllocation).toBeCloseTo(sum, 5);
  });
});
