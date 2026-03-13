import { describe, expect, it } from 'vitest';
import { createDynastyHeritageEngine } from '../dynasty-heritage.js';

describe('dynasty heritage simulation', () => {
  it('simulates multi-generation bonus stacking with diminishing returns', () => {
    let time = 1_000_000;
    let id = 0;
    const engine = createDynastyHeritageEngine({
      clock: { nowMicroseconds: () => time++ },
      idGenerator: { next: () => 'h-' + String(id++) },
    });

    engine.recordHeritage({
      dynastyId: 'line-1',
      ancestorId: 'ancestor-a',
      generation: 1,
      achievementIds: ['trade-magnate'],
    });
    engine.recordHeritage({
      dynastyId: 'line-1',
      ancestorId: 'ancestor-b',
      generation: 2,
      achievementIds: ['trade-magnate'],
    });

    const bonuses = engine.computeBonus('line-1', 'economic');
    const effectiveTotal = bonuses.reduce((sum, b) => sum + b.effectiveValue, 0);

    expect(bonuses).toHaveLength(2);
    expect(effectiveTotal).toBeCloseTo(18, 3);
    expect(engine.getLineage('line-1').depth).toBe(2);
  });

  it('simulates treasury split inheritance policy application', () => {
    const engine = createDynastyHeritageEngine({
      clock: { nowMicroseconds: () => 5_000_000 },
      idGenerator: { next: () => 'rule-id' },
    });

    const rule = engine.setInheritanceRule({
      dynastyId: 'line-2',
      ruleType: 'treasury_split',
      targetHeirs: ['h1', 'h2', 'h3'],
      treasurySplitBps: [5000, 3000, 2000],
    });

    expect(typeof rule).toBe('object');
    const applied = engine.applyInheritanceRules('line-2');
    expect(typeof applied).toBe('object');
    if (typeof applied === 'object') {
      expect(applied.appliedHeirs).toEqual(['h1', 'h2', 'h3']);
    }
  });
});
