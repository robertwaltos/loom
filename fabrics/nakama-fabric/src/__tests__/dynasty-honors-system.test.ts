import { describe, it, expect, beforeEach } from 'vitest';
import {
  CANONICAL_HONORS,
  ETERNAL_MARK_COUNT,
  HISTORIC_HONOR_COUNT,
  HIGHEST_ASSEMBLY_BONUS_HONOR_ID,
  createHonorsService,
} from '../dynasty-honors-system.js';
import type {
  DynastyHonorsService,
  HonorsDeps,
} from '../dynasty-honors-system.js';

function makeDeps(): HonorsDeps {
  let counter = 0;
  return {
    clock: { nowMicroseconds: () => ++counter * 1_000_000 },
    idGenerator: { next: () => `id-${++counter}` },
  };
}

let service: DynastyHonorsService;

beforeEach(() => {
  service = createHonorsService(makeDeps());
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('ETERNAL_MARK_COUNT is 4', () => {
    expect(ETERNAL_MARK_COUNT).toBe(4);
  });

  it('HISTORIC_HONOR_COUNT is 5', () => {
    expect(HISTORIC_HONOR_COUNT).toBe(5);
  });

  it('HIGHEST_ASSEMBLY_BONUS_HONOR_ID is correct', () => {
    expect(HIGHEST_ASSEMBLY_BONUS_HONOR_ID).toBe('honor-founding-covenant-first');
  });

  it('CANONICAL_HONORS is non-empty', () => {
    expect(CANONICAL_HONORS.length).toBeGreaterThan(0);
  });

  it('all canonical honor ids are unique', () => {
    const ids = CANONICAL_HONORS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('eternal marks in canonical honors match ETERNAL_MARK_COUNT', () => {
    const count = CANONICAL_HONORS.filter((h) => h.tier === 'ETERNAL_MARK').length;
    expect(count).toBe(ETERNAL_MARK_COUNT);
  });

  it('historic honors in canonical honors match HISTORIC_HONOR_COUNT', () => {
    const count = CANONICAL_HONORS.filter((h) => h.isHistoric).length;
    expect(count).toBe(HISTORIC_HONOR_COUNT);
  });
});

// ─── getHonor ────────────────────────────────────────────────────────────────

describe('getHonor', () => {
  it('returns the honor for a known id', () => {
    const honor = service.getHonor('honor-survey-first');
    expect(honor).toBeDefined();
    expect(honor?.tier).toBe('FOUNDING_HONOR');
  });

  it('returns undefined for unknown id', () => {
    expect(service.getHonor('nonexistent-honor')).toBeUndefined();
  });

  it('honor-founding-covenant-first has highest assembly bonus', () => {
    const honor = service.getHonor(HIGHEST_ASSEMBLY_BONUS_HONOR_ID);
    expect(honor).toBeDefined();
    expect(honor?.benefit.assemblyWeightBonus).toBe(2000);
  });

  it('honor-world-394-vigil is an ETERNAL_MARK', () => {
    const honor = service.getHonor('honor-world-394-vigil');
    expect(honor?.tier).toBe('ETERNAL_MARK');
  });
});

// ─── getHonorsByTier ──────────────────────────────────────────────────────────

describe('getHonorsByTier', () => {
  it('returns correct number of ETERNAL_MARK honors', () => {
    const honors = service.getHonorsByTier('ETERNAL_MARK');
    expect(honors).toHaveLength(ETERNAL_MARK_COUNT);
  });

  it('all returned honors have the correct tier', () => {
    const honors = service.getHonorsByTier('DISTINCTION');
    for (const honor of honors) {
      expect(honor.tier).toBe('DISTINCTION');
    }
  });

  it('returns empty array for a tier with no honors (RECOGNITION)', () => {
    const honors = service.getHonorsByTier('RECOGNITION');
    expect(honors).toHaveLength(0);
  });

  it('returns FOUNDING_HONOR tier honors', () => {
    const honors = service.getHonorsByTier('FOUNDING_HONOR');
    expect(honors.length).toBeGreaterThan(0);
  });
});

// ─── getHonorsByCategory ──────────────────────────────────────────────────────

describe('getHonorsByCategory', () => {
  it('returns WOUND_RECOGNITION honors', () => {
    const honors = service.getHonorsByCategory('WOUND_RECOGNITION');
    expect(honors.length).toBeGreaterThan(0);
    for (const honor of honors) {
      expect(honor.category).toBe('WOUND_RECOGNITION');
    }
  });

  it('returns SURVEY_CORPS_SERVICE honors', () => {
    const honors = service.getHonorsByCategory('SURVEY_CORPS_SERVICE');
    expect(honors.length).toBeGreaterThan(0);
  });

  it('returns GOVERNANCE_REFORM honors', () => {
    const honors = service.getHonorsByCategory('GOVERNANCE_REFORM');
    expect(honors.length).toBeGreaterThan(0);
  });
});

// ─── getHonorsByDynasty ───────────────────────────────────────────────────────

describe('getHonorsByDynasty', () => {
  it('returns empty array for unknown dynasty', () => {
    expect(service.getHonorsByDynasty('dynasty-nobody')).toHaveLength(0);
  });

  it('returns honor for world-394-survivors-coalition', () => {
    const honors = service.getHonorsByDynasty('world-394-survivors-coalition');
    expect(honors.length).toBeGreaterThan(0);
    expect(honors[0]?.id).toBe('honor-world-394-vigil');
  });
});

// ─── getHistoricHonors & getEternalMarks ─────────────────────────────────────

describe('getHistoricHonors', () => {
  it('returns only honors with isHistoric = true', () => {
    const honors = service.getHistoricHonors();
    expect(honors).toHaveLength(HISTORIC_HONOR_COUNT);
    for (const honor of honors) {
      expect(honor.isHistoric).toBe(true);
    }
  });
});

describe('getEternalMarks', () => {
  it('returns only ETERNAL_MARK tier honors', () => {
    const marks = service.getEternalMarks();
    expect(marks).toHaveLength(ETERNAL_MARK_COUNT);
    for (const mark of marks) {
      expect(mark.tier).toBe('ETERNAL_MARK');
    }
  });
});

// ─── computeTotalAssemblyWeightBonus ─────────────────────────────────────────

describe('computeTotalAssemblyWeightBonus', () => {
  it('returns 0 for unknown dynasty', () => {
    expect(service.computeTotalAssemblyWeightBonus('nobody')).toBe(0);
  });

  it('returns the correct sum for concord-founding-council', () => {
    // honor-founding-covenant-first: assemblyWeightBonus = 2000
    const bonus = service.computeTotalAssemblyWeightBonus('concord-founding-council');
    expect(bonus).toBe(2000);
  });

  it('returns 1000 for world-394-survivors-coalition', () => {
    const bonus = service.computeTotalAssemblyWeightBonus('world-394-survivors-coalition');
    expect(bonus).toBe(1000);
  });
});

// ─── computeTotalKalonGranted ─────────────────────────────────────────────────

describe('computeTotalKalonGranted', () => {
  it('returns 0n for unknown dynasty', () => {
    expect(service.computeTotalKalonGranted('nobody')).toBe(0n);
  });

  it('returns positive bigint for known dynasty', () => {
    const kalon = service.computeTotalKalonGranted('concord-founding-council');
    expect(kalon).toBeGreaterThan(0n);
    expect(kalon).toBe(100_000_000_000n);
  });
});

// ─── getHonorTimeline ─────────────────────────────────────────────────────────

describe('getHonorTimeline', () => {
  it('returns all honors', () => {
    const timeline = service.getHonorTimeline();
    expect(timeline).toHaveLength(CANONICAL_HONORS.length);
  });

  it('is sorted ascending by grantedYear', () => {
    const timeline = service.getHonorTimeline();
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i]!.grantedYear).toBeGreaterThanOrEqual(timeline[i - 1]!.grantedYear);
    }
  });
});

// ─── getHonorSummary ──────────────────────────────────────────────────────────

describe('getHonorSummary', () => {
  it('total equals CANONICAL_HONORS.length', () => {
    const summary = service.getHonorSummary();
    expect(summary.total).toBe(CANONICAL_HONORS.length);
  });

  it('ETERNAL_MARK count matches ETERNAL_MARK_COUNT', () => {
    const summary = service.getHonorSummary();
    expect(summary.byTier.ETERNAL_MARK).toBe(ETERNAL_MARK_COUNT);
  });

  it('totalKalonGrantedMicro is positive', () => {
    const summary = service.getHonorSummary();
    expect(summary.totalKalonGrantedMicro).toBeGreaterThan(0n);
  });

  it('byCategory sums match total honors', () => {
    const summary = service.getHonorSummary();
    const categoryTotal = Object.values(summary.byCategory).reduce((a, b) => a + b, 0);
    expect(categoryTotal).toBe(summary.total);
  });

  it('byTier sums match total honors', () => {
    const summary = service.getHonorSummary();
    const tierTotal = Object.values(summary.byTier).reduce((a, b) => a + b, 0);
    expect(tierTotal).toBe(summary.total);
  });
});
