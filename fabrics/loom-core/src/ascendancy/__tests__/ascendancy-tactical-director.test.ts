import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeDynastyStressScore,
  decidePacingState,
} from '../ascendancy-tactical-director.js';
import type {
  DynastyStressMetrics,
  PacingDecision,
} from '../ascendancy-tactical-director.js';

function makeMetrics(overrides: Partial<DynastyStressMetrics> = {}): DynastyStressMetrics {
  return {
    dynastyId: 'dynasty-1',
    proximityToAscendancyActivity: 50,
    recentLossCount: 1,
    resourceDepletionRate: 30,
    chronicleEntryRate: 2,
    consecutiveBuildUpCycles: 0,
    isNewPlayer: false,
    isReturningPlayer: false,
    ...overrides,
  };
}

describe('computeDynastyStressScore', () => {
  it('should return 0 for all-zero inputs', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 0,
      recentLossCount: 0,
      resourceDepletionRate: 0,
      chronicleEntryRate: 0,
    }));
    expect(score).toBe(0);
  });

  it('should weight proximity at 0.3', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 100,
      recentLossCount: 0,
      resourceDepletionRate: 0,
      chronicleEntryRate: 0,
    }));
    expect(score).toBe(30);
  });

  it('should cap loss contribution at 30', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 0,
      recentLossCount: 10,
      resourceDepletionRate: 0,
      chronicleEntryRate: 0,
    }));
    expect(score).toBe(30);
  });

  it('should weight resource depletion at 0.2', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 0,
      recentLossCount: 0,
      resourceDepletionRate: 100,
      chronicleEntryRate: 0,
    }));
    expect(score).toBe(20);
  });

  it('should cap chronicle entry rate contribution at 20', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 0,
      recentLossCount: 0,
      resourceDepletionRate: 0,
      chronicleEntryRate: 10,
    }));
    expect(score).toBe(20);
  });

  it('should cap total at 100', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 100,
      recentLossCount: 10,
      resourceDepletionRate: 100,
      chronicleEntryRate: 10,
    }));
    expect(score).toBe(100);
  });

  it('should combine all components correctly', () => {
    const score = computeDynastyStressScore(makeMetrics({
      proximityToAscendancyActivity: 50,
      recentLossCount: 2,
      resourceDepletionRate: 50,
      chronicleEntryRate: 2,
    }));
    // 50*0.3=15, 2*10=20, 50*0.2=10, 2*5=10 => 55
    expect(score).toBe(55);
  });
});

describe('decidePacingState', () => {
  it('should return RELAX for new players', () => {
    const decision = decidePacingState(makeMetrics({ isNewPlayer: true }));
    expect(decision.currentState).toBe('RELAX');
    expect(decision.intensity).toBe(0.0);
    expect(decision.recommendedDurationHours).toBe(48);
  });

  it('should force RELAX after 3 consecutive build-up cycles', () => {
    const decision = decidePacingState(makeMetrics({
      consecutiveBuildUpCycles: 3,
    }));
    expect(decision.currentState).toBe('RELAX');
    expect(decision.forceRelax).toBe(true);
    expect(decision.recommendedDurationHours).toBe(24);
  });

  it('should force RELAX after more than 3 consecutive build-up cycles', () => {
    const decision = decidePacingState(makeMetrics({
      consecutiveBuildUpCycles: 5,
    }));
    expect(decision.currentState).toBe('RELAX');
    expect(decision.forceRelax).toBe(true);
  });

  it('should return BUILD_UP for returning players', () => {
    const decision = decidePacingState(makeMetrics({
      isReturningPlayer: true,
    }));
    expect(decision.currentState).toBe('BUILD_UP');
    expect(decision.intensity).toBe(0.3);
  });

  it('should prioritize new player over returning player', () => {
    const decision = decidePacingState(makeMetrics({
      isNewPlayer: true,
      isReturningPlayer: true,
    }));
    expect(decision.currentState).toBe('RELAX');
  });

  it('should prioritize forced relax over returning player', () => {
    const decision = decidePacingState(makeMetrics({
      consecutiveBuildUpCycles: 3,
      isReturningPlayer: true,
    }));
    expect(decision.currentState).toBe('RELAX');
    expect(decision.forceRelax).toBe(true);
  });

  it('should return SUSTAIN_PEAK for stress above 70', () => {
    const decision = decidePacingState(makeMetrics({
      proximityToAscendancyActivity: 100,
      recentLossCount: 5,
      resourceDepletionRate: 50,
      chronicleEntryRate: 3,
    }));
    // 100*0.3=30, 5*10=50(cap30), 50*0.2=10, 3*5=15 => 85
    expect(decision.currentState).toBe('SUSTAIN_PEAK');
    expect(decision.recommendedDurationHours).toBe(6);
  });

  it('should return BUILD_UP for stress between 41 and 70', () => {
    const decision = decidePacingState(makeMetrics({
      proximityToAscendancyActivity: 50,
      recentLossCount: 2,
      resourceDepletionRate: 50,
      chronicleEntryRate: 2,
    }));
    // stress = 55
    expect(decision.currentState).toBe('BUILD_UP');
    expect(decision.recommendedDurationHours).toBe(12);
  });

  it('should return RELAX for stress at or below 40', () => {
    const decision = decidePacingState(makeMetrics({
      proximityToAscendancyActivity: 30,
      recentLossCount: 0,
      resourceDepletionRate: 20,
      chronicleEntryRate: 1,
    }));
    // 30*0.3=9, 0, 20*0.2=4, 1*5=5 => 18
    expect(decision.currentState).toBe('RELAX');
    expect(decision.recommendedDurationHours).toBe(24);
  });

  it('should always include the dynastyId in the decision', () => {
    const decision = decidePacingState(makeMetrics({ dynastyId: 'dynasty-xyz' }));
    expect(decision.dynastyId).toBe('dynasty-xyz');
  });

  it('should set intensity as stress/100 for normal stress paths', () => {
    const decision = decidePacingState(makeMetrics({
      proximityToAscendancyActivity: 50,
      recentLossCount: 2,
      resourceDepletionRate: 50,
      chronicleEntryRate: 2,
    }));
    expect(decision.intensity).toBe(0.55);
  });
});
