import { describe, it, expect } from 'vitest';
import { createThreatScorer } from '../threat-scorer.js';
import type { ThreatScorerDeps } from '../threat-scorer.js';

function makeDeps(): ThreatScorerDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'sig-' + String(++idCounter) },
  };
}

describe('ThreatScorer — record signals', () => {
  it('records a threat signal', () => {
    const scorer = createThreatScorer(makeDeps());
    const signal = scorer.recordSignal({
      connectionId: 'conn-1',
      category: 'auth_failure',
      weight: 5,
    });
    expect(signal.signalId).toBe('sig-1');
    expect(signal.category).toBe('auth_failure');
  });

  it('retrieves signals by connection', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 5 });
    scorer.recordSignal({ connectionId: 'conn-1', category: 'rate_violation', weight: 3 });
    expect(scorer.getSignals('conn-1')).toHaveLength(2);
  });

  it('returns empty array for unknown connection', () => {
    const scorer = createThreatScorer(makeDeps());
    expect(scorer.getSignals('missing')).toHaveLength(0);
  });
});

describe('ThreatScorer — assess threat level', () => {
  it('assesses safe by default', () => {
    const scorer = createThreatScorer(makeDeps());
    const assessment = scorer.assess('conn-1');
    expect(assessment.level).toBe('safe');
    expect(assessment.score).toBe(0);
  });

  it('elevates threat with sufficient weight', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 12 });
    const assessment = scorer.assess('conn-1');
    expect(assessment.level).toBe('elevated');
  });

  it('reaches high threat', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'brute_force', weight: 30 });
    const assessment = scorer.assess('conn-1');
    expect(assessment.level).toBe('high');
  });

  it('reaches critical threat', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'protocol_abuse', weight: 55 });
    const assessment = scorer.assess('conn-1');
    expect(assessment.level).toBe('critical');
  });

  it('identifies dominant category', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 5 });
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 5 });
    scorer.recordSignal({ connectionId: 'conn-1', category: 'invalid_input', weight: 3 });
    const assessment = scorer.assess('conn-1');
    expect(assessment.dominantCategory).toBe('auth_failure');
  });
});

describe('ThreatScorer — decay', () => {
  it('decays score over time', () => {
    let time = 1_000_000;
    const deps: ThreatScorerDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'sig-1' },
    };
    const scorer = createThreatScorer(deps, {
      decayRateMicroPerPoint: 10_000_000,
    });
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 20 });
    time += 100_000_000;
    const assessment = scorer.assess('conn-1');
    expect(assessment.score).toBeLessThan(20);
  });

  it('fully decays to zero', () => {
    let time = 1_000_000;
    const deps: ThreatScorerDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'sig-1' },
    };
    const scorer = createThreatScorer(deps, {
      decayRateMicroPerPoint: 1_000_000,
    });
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 5 });
    time += 100_000_000;
    const assessment = scorer.assess('conn-1');
    expect(assessment.score).toBe(0);
    expect(assessment.level).toBe('safe');
  });
});

describe('ThreatScorer — clear and stats', () => {
  it('clears connection signals', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 5 });
    expect(scorer.clearConnection('conn-1')).toBe(true);
    expect(scorer.getSignals('conn-1')).toHaveLength(0);
  });

  it('returns false for clearing unknown connection', () => {
    const scorer = createThreatScorer(makeDeps());
    expect(scorer.clearConnection('missing')).toBe(false);
  });

  it('tracks aggregate stats', () => {
    const scorer = createThreatScorer(makeDeps());
    scorer.recordSignal({ connectionId: 'conn-1', category: 'auth_failure', weight: 5 });
    scorer.recordSignal({ connectionId: 'conn-2', category: 'brute_force', weight: 60 });
    const stats = scorer.getStats();
    expect(stats.trackedConnections).toBe(2);
    expect(stats.totalSignals).toBe(2);
    expect(stats.criticalConnections).toBe(1);
  });

  it('starts with zero stats', () => {
    const scorer = createThreatScorer(makeDeps());
    const stats = scorer.getStats();
    expect(stats.trackedConnections).toBe(0);
    expect(stats.totalSignals).toBe(0);
  });
});
