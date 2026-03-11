import { describe, it, expect } from 'vitest';
import { createDynastyHeritageEngine } from '../dynasty-heritage.js';
import type {
  HeritageDeps,
  DynastyHeritageEngine,
  HeritageRecord,
  InheritanceRule,
  InheritanceApplication,
} from '../dynasty-heritage.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeDeps(): HeritageDeps & { advance: (us: number) => void } {
  let now = 1_000_000;
  let counter = 0;
  return {
    advance: (us: number) => {
      now += us;
    },
    clock: { nowMicroseconds: () => now },
    idGenerator: {
      next: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
  };
}

function makeEngine(): { engine: DynastyHeritageEngine; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { engine: createDynastyHeritageEngine(deps), deps };
}

function isRecord(r: HeritageRecord | string): r is HeritageRecord {
  return typeof r !== 'string';
}

function isRule(r: InheritanceRule | string): r is InheritanceRule {
  return typeof r !== 'string';
}

function isApplication(r: InheritanceApplication | string): r is InheritanceApplication {
  return typeof r !== 'string';
}

// ─── recordHeritage ───────────────────────────────────────────────────

describe('recordHeritage', () => {
  it('records a heritage entry successfully', () => {
    const { engine } = makeEngine();
    const result = engine.recordHeritage({
      dynastyId: 'dynasty-A',
      ancestorId: 'ancestor-X',
      generation: 1,
      achievementIds: ['founding-world'],
    });
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    expect(result.dynastyId).toBe('dynasty-A');
    expect(result.ancestorId).toBe('ancestor-X');
    expect(result.generation).toBe(1);
    expect(result.achievementIds).toEqual(['founding-world']);
  });

  it('assigns a unique heritageId', () => {
    const { engine } = makeEngine();
    const r1 = engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 1,
      achievementIds: [],
    });
    const r2 = engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a2',
      generation: 2,
      achievementIds: [],
    });
    expect(isRecord(r1) && isRecord(r2)).toBe(true);
    if (!isRecord(r1) || !isRecord(r2)) return;
    expect(r1.heritageId).not.toBe(r2.heritageId);
  });

  it('rejects generation < 1', () => {
    const { engine } = makeEngine();
    const result = engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 0,
      achievementIds: [],
    });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('generation must be >= 1');
  });

  it('rejects dynastyId === ancestorId', () => {
    const { engine } = makeEngine();
    const result = engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'd1',
      generation: 1,
      achievementIds: [],
    });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('dynastyId and ancestorId must differ');
  });

  it('allows multiple ancestors for same dynasty', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a1', generation: 1, achievementIds: [] });
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a2', generation: 2, achievementIds: [] });
    const records = engine.getHeritageRecords('d1');
    expect(records.length).toBe(2);
  });

  it('timestamps the record with clock time', () => {
    const { engine, deps } = makeEngine();
    deps.advance(500);
    const result = engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 1,
      achievementIds: [],
    });
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    expect(result.recordedAt).toBe(1_000_500);
  });
});

// ─── computeBonus ─────────────────────────────────────────────────────

describe('computeBonus', () => {
  it('returns empty array when no heritage recorded', () => {
    const { engine } = makeEngine();
    const bonuses = engine.computeBonus('unknown', 'economic');
    expect(bonuses).toHaveLength(0);
  });

  it('returns full bonus for generation 1', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 1,
      achievementIds: ['trade-magnate'],
    });
    const bonuses = engine.computeBonus('d1', 'economic');
    expect(bonuses).toHaveLength(1);
    const bonus = bonuses[0];
    expect(bonus).toBeDefined();
    if (!bonus) return;
    expect(bonus.rawValue).toBe(12);
    expect(bonus.effectiveValue).toBeCloseTo(12);
  });

  it('halves effective bonus for generation 2', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 2,
      achievementIds: ['trade-magnate'],
    });
    const bonuses = engine.computeBonus('d1', 'economic');
    const bonus = bonuses[0];
    expect(bonus).toBeDefined();
    if (!bonus) return;
    expect(bonus.effectiveValue).toBeCloseTo(6);
  });

  it('quarters effective bonus for generation 3', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 3,
      achievementIds: ['civic-champion'],
    });
    const bonuses = engine.computeBonus('d1', 'civic');
    const bonus = bonuses[0];
    expect(bonus).toBeDefined();
    if (!bonus) return;
    expect(bonus.effectiveValue).toBeCloseTo(3);
  });

  it('filters by category — exploration achievement not returned for economic', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 1,
      achievementIds: ['founding-world'],
    });
    const bonuses = engine.computeBonus('d1', 'economic');
    expect(bonuses).toHaveLength(0);
  });

  it('returns multiple bonuses from multiple ancestors', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 1,
      achievementIds: ['trade-magnate'],
    });
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a2',
      generation: 2,
      achievementIds: ['commons-benefactor'],
    });
    const bonuses = engine.computeBonus('d1', 'economic');
    expect(bonuses).toHaveLength(2);
  });

  it('records sourceAncestorId correctly', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({
      dynastyId: 'd1',
      ancestorId: 'a1',
      generation: 1,
      achievementIds: ['cultural-patron'],
    });
    const bonuses = engine.computeBonus('d1', 'cultural');
    const bonus = bonuses[0];
    expect(bonus).toBeDefined();
    if (!bonus) return;
    expect(bonus.sourceAncestorId).toBe('a1');
  });
});

// ─── getLineage ───────────────────────────────────────────────────────

describe('getLineage', () => {
  it('returns empty lineage for unknown dynasty', () => {
    const { engine } = makeEngine();
    const lineage = engine.getLineage('unknown');
    expect(lineage.dynastyId).toBe('unknown');
    expect(lineage.ancestors).toHaveLength(0);
    expect(lineage.depth).toBe(0);
  });

  it('returns correct depth for deepest generation', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a1', generation: 1, achievementIds: [] });
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a2', generation: 3, achievementIds: [] });
    const lineage = engine.getLineage('d1');
    expect(lineage.depth).toBe(3);
  });

  it('lists all ancestors with their generation', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a1', generation: 1, achievementIds: [] });
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a2', generation: 2, achievementIds: [] });
    const lineage = engine.getLineage('d1');
    expect(lineage.ancestors).toHaveLength(2);
    const ancestorIds = lineage.ancestors.map((a) => a.dynastyId);
    expect(ancestorIds).toContain('a1');
    expect(ancestorIds).toContain('a2');
  });
});

// ─── setInheritanceRule ───────────────────────────────────────────────

describe('setInheritanceRule', () => {
  it('creates an eldest_heir rule', () => {
    const { engine } = makeEngine();
    const result = engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'eldest_heir',
      targetHeirs: ['heir-1'],
    });
    expect(isRule(result)).toBe(true);
    if (!isRule(result)) return;
    expect(result.ruleType).toBe('eldest_heir');
    expect(result.targetHeirs).toEqual(['heir-1']);
  });

  it('creates an assembly_appointed rule', () => {
    const { engine } = makeEngine();
    const result = engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'assembly_appointed',
      targetHeirs: [],
    });
    expect(isRule(result)).toBe(true);
    if (!isRule(result)) return;
    expect(result.ruleType).toBe('assembly_appointed');
  });

  it('creates a valid treasury_split rule', () => {
    const { engine } = makeEngine();
    const result = engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'treasury_split',
      targetHeirs: ['h1', 'h2'],
      treasurySplitBps: [6000, 4000],
    });
    expect(isRule(result)).toBe(true);
  });

  it('rejects treasury_split when bps do not sum to 10000', () => {
    const { engine } = makeEngine();
    const result = engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'treasury_split',
      targetHeirs: ['h1', 'h2'],
      treasurySplitBps: [5000, 4000],
    });
    expect(typeof result).toBe('string');
    expect(result as string).toContain('10000');
  });

  it('rejects treasury_split when bps length mismatches heirs', () => {
    const { engine } = makeEngine();
    const result = engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'treasury_split',
      targetHeirs: ['h1'],
      treasurySplitBps: [6000, 4000],
    });
    expect(typeof result).toBe('string');
  });

  it('overwrites an existing rule for the same dynasty', () => {
    const { engine } = makeEngine();
    engine.setInheritanceRule({ dynastyId: 'd1', ruleType: 'eldest_heir', targetHeirs: ['h1'] });
    engine.setInheritanceRule({ dynastyId: 'd1', ruleType: 'auction', targetHeirs: [] });
    const rule = engine.getInheritanceRule('d1');
    expect(rule?.ruleType).toBe('auction');
  });
});

// ─── applyInheritanceRules ────────────────────────────────────────────

describe('applyInheritanceRules', () => {
  it('returns error when no rule exists', () => {
    const { engine } = makeEngine();
    const result = engine.applyInheritanceRules('d1');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('d1');
  });

  it('applies eldest_heir rule to first heir only', () => {
    const { engine } = makeEngine();
    engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'eldest_heir',
      targetHeirs: ['h1', 'h2', 'h3'],
    });
    const result = engine.applyInheritanceRules('d1');
    expect(isApplication(result)).toBe(true);
    if (!isApplication(result)) return;
    expect(result.appliedHeirs).toEqual(['h1']);
  });

  it('applies treasury_split rule to all heirs', () => {
    const { engine } = makeEngine();
    engine.setInheritanceRule({
      dynastyId: 'd1',
      ruleType: 'treasury_split',
      targetHeirs: ['h1', 'h2'],
      treasurySplitBps: [5000, 5000],
    });
    const result = engine.applyInheritanceRules('d1');
    expect(isApplication(result)).toBe(true);
    if (!isApplication(result)) return;
    expect(result.appliedHeirs).toEqual(['h1', 'h2']);
  });

  it('returns application with correct ruleType', () => {
    const { engine } = makeEngine();
    engine.setInheritanceRule({ dynastyId: 'd1', ruleType: 'auction', targetHeirs: [] });
    const result = engine.applyInheritanceRules('d1');
    expect(isApplication(result)).toBe(true);
    if (!isApplication(result)) return;
    expect(result.ruleType).toBe('auction');
  });
});

// ─── getStats ─────────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.totalRecords).toBe(0);
    expect(stats.totalRules).toBe(0);
    expect(stats.deepestLineage).toBe(0);
    expect(stats.dynastiesWithHeritage).toBe(0);
  });

  it('tracks total records across multiple dynasties', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a1', generation: 1, achievementIds: [] });
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a2', generation: 2, achievementIds: [] });
    engine.recordHeritage({ dynastyId: 'd2', ancestorId: 'a3', generation: 1, achievementIds: [] });
    const stats = engine.getStats();
    expect(stats.totalRecords).toBe(3);
    expect(stats.dynastiesWithHeritage).toBe(2);
  });

  it('tracks deepest lineage', () => {
    const { engine } = makeEngine();
    engine.recordHeritage({ dynastyId: 'd1', ancestorId: 'a1', generation: 5, achievementIds: [] });
    const stats = engine.getStats();
    expect(stats.deepestLineage).toBe(5);
  });

  it('counts inheritance rules', () => {
    const { engine } = makeEngine();
    engine.setInheritanceRule({ dynastyId: 'd1', ruleType: 'auction', targetHeirs: [] });
    engine.setInheritanceRule({ dynastyId: 'd2', ruleType: 'auction', targetHeirs: [] });
    const stats = engine.getStats();
    expect(stats.totalRules).toBe(2);
  });
});
