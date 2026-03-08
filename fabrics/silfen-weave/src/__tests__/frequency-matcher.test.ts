import { describe, it, expect } from 'vitest';
import { createFrequencySignatureMatcher, DEFAULT_DRIFT_THRESHOLD } from '../frequency-matcher.js';
import type { MatchableSignature, CandidateSignature } from '../frequency-matcher.js';

function makeSig(overrides?: Partial<MatchableSignature>): MatchableSignature {
  return {
    primary: 1000n,
    harmonics: [100, 200, 300],
    fieldStrength: 0.8,
    ...overrides,
  };
}

describe('FrequencySignatureMatcher — compare basics', () => {
  it('returns perfect match for identical signatures', () => {
    const matcher = createFrequencySignatureMatcher();
    const sig = makeSig();
    const result = matcher.compare(sig, sig);
    expect(result.quality).toBe('perfect');
    expect(result.compatibility).toBeGreaterThanOrEqual(0.95);
  });

  it('returns incompatible for completely different signatures', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ primary: 100n, harmonics: [1, 2, 3], fieldStrength: 0.1 });
    const b = makeSig({ primary: 100000n, harmonics: [900, 800, 700], fieldStrength: 0.9 });
    const result = matcher.compare(a, b);
    expect(result.quality).toBe('incompatible');
  });

  it('compatibility is between 0 and 1', () => {
    const matcher = createFrequencySignatureMatcher();
    const result = matcher.compare(makeSig(), makeSig({ primary: 500n }));
    expect(result.compatibility).toBeGreaterThanOrEqual(0);
    expect(result.compatibility).toBeLessThanOrEqual(1);
  });
});

describe('FrequencySignatureMatcher — compare components', () => {
  it('reports harmonic overlap ratio', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ harmonics: [100, 200, 300] });
    const b = makeSig({ harmonics: [200, 300, 400] });
    const result = matcher.compare(a, b);
    expect(result.harmonicOverlap).toBeCloseTo(0.5, 1);
  });

  it('reports primary alignment', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ primary: 1000n });
    const b = makeSig({ primary: 1000n });
    const result = matcher.compare(a, b);
    expect(result.primaryAlignment).toBe(1);
  });

  it('reports field strength delta', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ fieldStrength: 0.8 });
    const b = makeSig({ fieldStrength: 0.3 });
    const result = matcher.compare(a, b);
    expect(result.fieldStrengthDelta).toBeCloseTo(0.5, 2);
  });

  it('handles empty harmonics as zero overlap', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ harmonics: [] });
    const b = makeSig({ harmonics: [100, 200] });
    const result = matcher.compare(a, b);
    expect(result.harmonicOverlap).toBe(0);
  });
});

describe('FrequencySignatureMatcher — quality tiers', () => {
  it('classifies strong match', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ primary: 1000n, harmonics: [100, 200, 300], fieldStrength: 0.9 });
    const b = makeSig({ primary: 800n, harmonics: [100, 200, 400], fieldStrength: 0.85 });
    const result = matcher.compare(a, b);
    expect(result.compatibility).toBeGreaterThanOrEqual(0.5);
  });

  it('classifies weak match with low overlap', () => {
    const matcher = createFrequencySignatureMatcher();
    const a = makeSig({ primary: 1000n, harmonics: [1, 2], fieldStrength: 0.9 });
    const b = makeSig({ primary: 500n, harmonics: [8, 9], fieldStrength: 0.2 });
    const result = matcher.compare(a, b);
    expect(result.compatibility).toBeLessThan(0.75);
  });
});

describe('FrequencySignatureMatcher — findBestMatches', () => {
  it('returns ranked candidates sorted by compatibility', () => {
    const matcher = createFrequencySignatureMatcher();
    const target = makeSig({ primary: 1000n, harmonics: [100, 200, 300] });
    const candidates: CandidateSignature[] = [
      { id: 'worst', signature: makeSig({ primary: 9999n, harmonics: [900], fieldStrength: 0.1 }) },
      { id: 'best', signature: makeSig({ primary: 1000n, harmonics: [100, 200, 300] }) },
      { id: 'mid', signature: makeSig({ primary: 800n, harmonics: [100, 200] }) },
    ];
    const results = matcher.findBestMatches(target, candidates, 3);
    expect(results[0]?.id).toBe('best');
    expect(results[0]?.rank).toBe(1);
    expect(results[2]?.id).toBe('worst');
  });

  it('respects limit', () => {
    const matcher = createFrequencySignatureMatcher();
    const target = makeSig();
    const candidates: CandidateSignature[] = [
      { id: 'a', signature: makeSig() },
      { id: 'b', signature: makeSig() },
      { id: 'c', signature: makeSig() },
    ];
    const results = matcher.findBestMatches(target, candidates, 2);
    expect(results).toHaveLength(2);
  });

  it('returns empty for no candidates', () => {
    const matcher = createFrequencySignatureMatcher();
    const results = matcher.findBestMatches(makeSig(), [], 5);
    expect(results).toHaveLength(0);
  });
});

describe('FrequencySignatureMatcher — detectDrift', () => {
  it('reports no drift for identical signatures', () => {
    const matcher = createFrequencySignatureMatcher();
    const sig = makeSig();
    const drift = matcher.detectDrift(sig, sig);
    expect(drift.drifted).toBe(false);
    expect(drift.severity).toBe('none');
  });

  it('detects minor primary drift', () => {
    const matcher = createFrequencySignatureMatcher();
    const prev = makeSig({ primary: 1000n });
    const curr = makeSig({ primary: 1060n });
    const drift = matcher.detectDrift(prev, curr);
    expect(drift.drifted).toBe(true);
    expect(drift.severity).toBe('minor');
  });

  it('detects significant primary drift', () => {
    const matcher = createFrequencySignatureMatcher();
    const prev = makeSig({ primary: 1000n });
    const curr = makeSig({ primary: 1300n });
    const drift = matcher.detectDrift(prev, curr);
    expect(drift.drifted).toBe(true);
    expect(drift.severity).toBe('significant');
  });

  it('detects critical primary drift', () => {
    const matcher = createFrequencySignatureMatcher();
    const prev = makeSig({ primary: 1000n });
    const curr = makeSig({ primary: 2000n });
    const drift = matcher.detectDrift(prev, curr);
    expect(drift.drifted).toBe(true);
    expect(drift.severity).toBe('critical');
  });

  it('detects drift from harmonic changes alone', () => {
    const matcher = createFrequencySignatureMatcher();
    const prev = makeSig({ primary: 1000n, harmonics: [100, 200, 300, 400, 500] });
    const curr = makeSig({ primary: 1000n, harmonics: [600, 700, 800, 900, 1000] });
    const drift = matcher.detectDrift(prev, curr);
    expect(drift.drifted).toBe(true);
    expect(drift.harmonicDrift).toBe(1);
  });

  it('accepts custom threshold overrides', () => {
    const matcher = createFrequencySignatureMatcher();
    const prev = makeSig({ primary: 1000n });
    const curr = makeSig({ primary: 1060n });
    const drift = matcher.detectDrift(prev, curr, { minorPrimaryDrift: 0.10 });
    expect(drift.drifted).toBe(false);
    expect(drift.severity).toBe('none');
  });
});

describe('FrequencySignatureMatcher — harmonicOverlap', () => {
  it('returns 1 for identical harmonics', () => {
    const matcher = createFrequencySignatureMatcher();
    expect(matcher.computeHarmonicOverlap([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it('returns 0 for disjoint harmonics', () => {
    const matcher = createFrequencySignatureMatcher();
    expect(matcher.computeHarmonicOverlap([1, 2], [3, 4])).toBe(0);
  });

  it('returns 0 when either is empty', () => {
    const matcher = createFrequencySignatureMatcher();
    expect(matcher.computeHarmonicOverlap([], [1, 2])).toBe(0);
    expect(matcher.computeHarmonicOverlap([1, 2], [])).toBe(0);
  });

  it('computes Jaccard coefficient', () => {
    const matcher = createFrequencySignatureMatcher();
    const overlap = matcher.computeHarmonicOverlap([1, 2, 3], [2, 3, 4]);
    expect(overlap).toBeCloseTo(0.5, 1);
  });
});

describe('FrequencySignatureMatcher — bandwidth', () => {
  it('computes bandwidth for a signature', () => {
    const matcher = createFrequencySignatureMatcher();
    const sig = makeSig({ harmonics: [100, 200, 300] });
    const bw = matcher.computeBandwidth(sig);
    expect(bw.harmonicCount).toBe(3);
    expect(bw.harmonicSpread).toBe(200);
    expect(bw.harmonicMean).toBe(200);
    expect(bw.fieldStrength).toBe(0.8);
  });

  it('returns zero bandwidth for empty harmonics', () => {
    const matcher = createFrequencySignatureMatcher();
    const sig = makeSig({ harmonics: [] });
    const bw = matcher.computeBandwidth(sig);
    expect(bw.harmonicCount).toBe(0);
    expect(bw.harmonicSpread).toBe(0);
    expect(bw.densityScore).toBe(0);
  });

  it('density is clamped to [0, 1]', () => {
    const matcher = createFrequencySignatureMatcher();
    const sig = makeSig({ harmonics: [100, 101, 102, 103, 104] });
    const bw = matcher.computeBandwidth(sig);
    expect(bw.densityScore).toBeGreaterThanOrEqual(0);
    expect(bw.densityScore).toBeLessThanOrEqual(1);
  });
});

describe('FrequencySignatureMatcher — default threshold export', () => {
  it('exports default drift threshold', () => {
    expect(DEFAULT_DRIFT_THRESHOLD.minorPrimaryDrift).toBe(0.05);
    expect(DEFAULT_DRIFT_THRESHOLD.criticalPrimaryDrift).toBe(0.50);
  });
});
