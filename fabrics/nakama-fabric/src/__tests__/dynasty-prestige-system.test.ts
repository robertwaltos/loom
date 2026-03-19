import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_PRESTIGE_SCORE,
  MIN_PRESTIGE_SCORE,
  PRESTIGE_DOMAINS,
  PRESTIGE_RANK_THRESHOLDS,
  computePrestigeRank,
  getDomainWeight,
  createPrestigeState,
  createPrestigeService,
} from '../dynasty-prestige-system.js';
import type {
  PrestigeDeps,
  PrestigeService,
  PrestigeDomain,
} from '../dynasty-prestige-system.js';

function makeDeps(): PrestigeDeps {
  let counter = 0;
  return {
    clock: { nowIso: () => new Date(counter++ * 1000).toISOString() },
    idGenerator: { generate: () => `evt-${++counter}` },
  };
}

let service: PrestigeService;

beforeEach(() => {
  service = createPrestigeService(makeDeps());
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('MAX_PRESTIGE_SCORE is 10000', () => {
    expect(MAX_PRESTIGE_SCORE).toBe(10_000);
  });

  it('MIN_PRESTIGE_SCORE is 0', () => {
    expect(MIN_PRESTIGE_SCORE).toBe(0);
  });

  it('PRESTIGE_DOMAINS has 7 entries', () => {
    expect(PRESTIGE_DOMAINS).toHaveLength(7);
  });

  it('PRESTIGE_DOMAINS contains all expected domains', () => {
    const expected: PrestigeDomain[] = [
      'CHRONICLE', 'EXPLORATION', 'GOVERNANCE',
      'ECONOMY', 'CULTURE', 'MILITARY', 'DIPLOMACY',
    ];
    for (const d of expected) {
      expect(PRESTIGE_DOMAINS).toContain(d);
    }
  });

  it('PRESTIGE_RANK_THRESHOLDS has correct boundary values', () => {
    expect(PRESTIGE_RANK_THRESHOLDS.OBSCURE).toBe(0);
    expect(PRESTIGE_RANK_THRESHOLDS.KNOWN).toBe(1_000);
    expect(PRESTIGE_RANK_THRESHOLDS.NOTABLE).toBe(3_000);
    expect(PRESTIGE_RANK_THRESHOLDS.RESPECTED).toBe(5_500);
    expect(PRESTIGE_RANK_THRESHOLDS.RENOWNED).toBe(7_500);
    expect(PRESTIGE_RANK_THRESHOLDS.LEGENDARY).toBe(9_000);
  });
});

// ─── computePrestigeRank ──────────────────────────────────────────────────────

describe('computePrestigeRank', () => {
  it('score 0 is OBSCURE', () => {
    expect(computePrestigeRank(0)).toBe('OBSCURE');
  });

  it('score 999 is OBSCURE', () => {
    expect(computePrestigeRank(999)).toBe('OBSCURE');
  });

  it('score 1000 is KNOWN', () => {
    expect(computePrestigeRank(1_000)).toBe('KNOWN');
  });

  it('score 2999 is KNOWN', () => {
    expect(computePrestigeRank(2_999)).toBe('KNOWN');
  });

  it('score 3000 is NOTABLE', () => {
    expect(computePrestigeRank(3_000)).toBe('NOTABLE');
  });

  it('score 5500 is RESPECTED', () => {
    expect(computePrestigeRank(5_500)).toBe('RESPECTED');
  });

  it('score 7500 is RENOWNED', () => {
    expect(computePrestigeRank(7_500)).toBe('RENOWNED');
  });

  it('score 9000 is LEGENDARY', () => {
    expect(computePrestigeRank(9_000)).toBe('LEGENDARY');
  });

  it('score 10000 is LEGENDARY', () => {
    expect(computePrestigeRank(10_000)).toBe('LEGENDARY');
  });
});

// ─── getDomainWeight ──────────────────────────────────────────────────────────

describe('getDomainWeight', () => {
  it('domain weights sum to 1.0', () => {
    const total = PRESTIGE_DOMAINS.reduce((sum, d) => sum + getDomainWeight(d), 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('CHRONICLE weight is 0.20', () => {
    expect(getDomainWeight('CHRONICLE')).toBeCloseTo(0.20);
  });

  it('EXPLORATION weight is 0.20', () => {
    expect(getDomainWeight('EXPLORATION')).toBeCloseTo(0.20);
  });

  it('MILITARY weight is less than CHRONICLE weight', () => {
    expect(getDomainWeight('MILITARY')).toBeLessThan(getDomainWeight('CHRONICLE'));
  });
});

// ─── createPrestigeState ─────────────────────────────────────────────────────

describe('createPrestigeState', () => {
  it('creates state with empty scores and events', () => {
    const state = createPrestigeState();
    expect(state.scores.size).toBe(0);
    expect(state.events).toHaveLength(0);
  });
});

// ─── PrestigeService: getScore ────────────────────────────────────────────────

describe('PrestigeService.getScore', () => {
  it('returns 0 score and OBSCURE rank for unknown dynasty', () => {
    const score = service.getScore('dynasty-new', 'CHRONICLE');
    expect(score.score).toBe(0);
    expect(score.rank).toBe('OBSCURE');
    expect(score.dynastyId).toBe('dynasty-new');
    expect(score.domain).toBe('CHRONICLE');
  });
});

// ─── PrestigeService: applyEvent ─────────────────────────────────────────────

describe('PrestigeService.applyEvent', () => {
  it('increases score on positive delta', () => {
    service.applyEvent('dynasty-a', 'CHRONICLE', 'CHRONICLE_MILESTONE', 500, 'reason', 1);
    expect(service.getScore('dynasty-a', 'CHRONICLE').score).toBe(500);
  });

  it('decreases score on negative delta', () => {
    service.applyEvent('dynasty-a', 'CHRONICLE', 'CHRONICLE_MILESTONE', 1000, 'up', 1);
    service.applyEvent('dynasty-a', 'CHRONICLE', 'COVENANT_BREACHED', -400, 'down', 2);
    expect(service.getScore('dynasty-a', 'CHRONICLE').score).toBe(600);
  });

  it('clamps score at MAX_PRESTIGE_SCORE', () => {
    service.applyEvent('dynasty-a', 'MILITARY', 'HONOR_AWARDED', 20_000, 'overflow', 1);
    expect(service.getScore('dynasty-a', 'MILITARY').score).toBe(MAX_PRESTIGE_SCORE);
  });

  it('clamps score at MIN_PRESTIGE_SCORE (cannot go below 0)', () => {
    service.applyEvent('dynasty-a', 'ECONOMY', 'ASSEMBLY_SANCTION', -5_000, 'sanction', 1);
    expect(service.getScore('dynasty-a', 'ECONOMY').score).toBe(MIN_PRESTIGE_SCORE);
  });

  it('returns the PrestigeEvent with correct fields', () => {
    const evt = service.applyEvent('dynasty-b', 'GOVERNANCE', 'ASSEMBLY_MOTION_PASSED', 300, 'motion passed', 5);
    expect(evt.dynastyId).toBe('dynasty-b');
    expect(evt.domain).toBe('GOVERNANCE');
    expect(evt.delta).toBe(300);
    expect(evt.year).toBe(5);
    expect(evt.reason).toBe('motion passed');
  });

  it('updates rank after score change', () => {
    service.applyEvent('dynasty-c', 'CULTURE', 'HONOR_AWARDED', 3_000, 'award', 1);
    expect(service.getScore('dynasty-c', 'CULTURE').rank).toBe('NOTABLE');
  });
});

// ─── PrestigeService: getTotalPrestige ────────────────────────────────────────

describe('PrestigeService.getTotalPrestige', () => {
  it('returns 0 for unknown dynasty', () => {
    expect(service.getTotalPrestige('nobody')).toBe(0);
  });

  it('computes weighted sum across domains', () => {
    // CHRONICLE weight = 0.20, EXPLORATION weight = 0.20
    service.applyEvent('dyn', 'CHRONICLE', 'CHRONICLE_MILESTONE', 1000, 'r', 1);
    service.applyEvent('dyn', 'EXPLORATION', 'SURVEY_MISSION_COMPLETED', 1000, 'r', 1);
    const total = service.getTotalPrestige('dyn');
    // 1000*0.20 + 1000*0.20 = 400
    expect(total).toBe(400);
  });
});

// ─── PrestigeService: getRank ─────────────────────────────────────────────────

describe('PrestigeService.getRank', () => {
  it('returns OBSCURE for brand new dynasty', () => {
    expect(service.getRank('nobody')).toBe('OBSCURE');
  });

  it('returns correct rank after significant prestige gain', () => {
    // Make total prestige >= 1000 by scoring in weighted domains
    // To get to 1000 total, need e.g. CHRONICLE at 5000: 5000*0.20 = 1000
    service.applyEvent('d', 'CHRONICLE', 'CHRONICLE_MILESTONE', 5_000, 'r', 1);
    expect(service.getRank('d')).toBe('KNOWN');
  });
});

// ─── PrestigeService: getHistory ─────────────────────────────────────────────

describe('PrestigeService.getHistory', () => {
  it('returns empty array for dynasty with no events', () => {
    expect(service.getHistory('nobody')).toHaveLength(0);
  });

  it('returns only events for the requested dynasty', () => {
    service.applyEvent('d1', 'CHRONICLE', 'CHRONICLE_MILESTONE', 100, 'r', 1);
    service.applyEvent('d2', 'CHRONICLE', 'CHRONICLE_MILESTONE', 100, 'r', 1);
    service.applyEvent('d1', 'EXPLORATION', 'WORLD_CLAIMED', 200, 'r', 2);
    const history = service.getHistory('d1');
    expect(history).toHaveLength(2);
    for (const evt of history) {
      expect(evt.dynastyId).toBe('d1');
    }
  });
});

// ─── PrestigeService: getTopDynasties ────────────────────────────────────────

describe('PrestigeService.getTopDynasties', () => {
  it('returns empty array when no dynasties exist', () => {
    expect(service.getTopDynasties('CHRONICLE', 5)).toHaveLength(0);
  });

  it('returns at most limit entries', () => {
    service.applyEvent('d1', 'CHRONICLE', 'CHRONICLE_MILESTONE', 100, 'r', 1);
    service.applyEvent('d2', 'CHRONICLE', 'CHRONICLE_MILESTONE', 200, 'r', 1);
    service.applyEvent('d3', 'CHRONICLE', 'CHRONICLE_MILESTONE', 300, 'r', 1);
    const top = service.getTopDynasties('CHRONICLE', 2);
    expect(top).toHaveLength(2);
  });

  it('is sorted descending by score', () => {
    service.applyEvent('d1', 'CHRONICLE', 'CHRONICLE_MILESTONE', 100, 'r', 1);
    service.applyEvent('d2', 'CHRONICLE', 'CHRONICLE_MILESTONE', 500, 'r', 1);
    service.applyEvent('d3', 'CHRONICLE', 'CHRONICLE_MILESTONE', 200, 'r', 1);
    const top = service.getTopDynasties('CHRONICLE', 3);
    expect(top[0]!.score).toBeGreaterThanOrEqual(top[1]!.score);
    expect(top[1]!.score).toBeGreaterThanOrEqual(top[2]!.score);
  });
});

// ─── PrestigeService: getDomainSummary ────────────────────────────────────────

describe('PrestigeService.getDomainSummary', () => {
  it('dynastyCount is 0 when no dynasties tracked', () => {
    const summary = service.getDomainSummary('CULTURE');
    expect(summary.dynastyCount).toBe(0);
    expect(summary.averageScore).toBe(0);
    expect(summary.topScore).toBe(0);
  });

  it('dynastyCount matches number of distinct dynasties', () => {
    service.applyEvent('d1', 'CULTURE', 'HONOR_AWARDED', 500, 'r', 1);
    service.applyEvent('d2', 'CULTURE', 'HONOR_AWARDED', 300, 'r', 1);
    const summary = service.getDomainSummary('CULTURE');
    expect(summary.dynastyCount).toBe(2);
  });

  it('topScore reflects the highest dynasty score', () => {
    service.applyEvent('d1', 'DIPLOMACY', 'NPC_TRUST_GAINED', 1_000, 'r', 1);
    service.applyEvent('d2', 'DIPLOMACY', 'NPC_TRUST_GAINED', 3_000, 'r', 1);
    const summary = service.getDomainSummary('DIPLOMACY');
    expect(summary.topScore).toBe(3_000);
  });

  it('rankDistribution sums match dynastyCount', () => {
    service.applyEvent('d1', 'MILITARY', 'HONOR_AWARDED', 500, 'r', 1);
    service.applyEvent('d2', 'MILITARY', 'HONOR_AWARDED', 1000, 'r', 1);
    const summary = service.getDomainSummary('MILITARY');
    const distTotal = Object.values(summary.rankDistribution).reduce((a, b) => a + b, 0);
    expect(distTotal).toBe(summary.dynastyCount);
  });
});
