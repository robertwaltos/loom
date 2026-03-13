import { describe, expect, it } from 'vitest';
import { createFrequencySignatureMatcher } from '../frequency-matcher.js';

describe('frequency-matcher simulation', () => {
  it('ranks candidate links and surfaces drift severity', () => {
    const matcher = createFrequencySignatureMatcher();
    const target = { primary: 1000n, harmonics: [100, 200, 300], fieldStrength: 0.8 };
    const candidates = [
      { id: 'best', signature: { primary: 1005n, harmonics: [100, 200, 300], fieldStrength: 0.79 } },
      { id: 'mid', signature: { primary: 900n, harmonics: [100, 210, 400], fieldStrength: 0.6 } },
      { id: 'bad', signature: { primary: 5000n, harmonics: [1, 2, 3], fieldStrength: 0.1 } },
    ];

    const ranked = matcher.findBestMatches(target, candidates, 3);
    expect(ranked[0]?.id).toBe('best');
    expect(ranked[0]?.match.compatibility).toBeGreaterThan(ranked[2]?.match.compatibility ?? 0);

    const drift = matcher.detectDrift(target, { ...target, primary: 1400n });
    expect(drift.drifted).toBe(true);
    expect(drift.severity === 'significant' || drift.severity === 'critical').toBe(true);
  });
});
