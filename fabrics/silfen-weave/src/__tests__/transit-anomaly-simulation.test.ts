import { describe, expect, it } from 'vitest';
import { createTransitAnomalyDetector } from '../transit-anomaly.js';

describe('transit-anomaly simulation', () => {
  it('detects suspicious coherence behavior for a tracked lock', () => {
    let now = 1_000_000;
    const anomalies: string[] = [];
    const detector = createTransitAnomalyDetector(
      {
        idGenerator: {
          next: (() => {
            let i = 0;
            return () => `a-${++i}`;
          })(),
        },
        clock: { nowMicroseconds: () => (now += 1_000) },
        onAnomaly: (a) => {
          anomalies.push(a.type);
        },
      },
      {
        maxCoherenceStep: 0.1,
        maxVelocityPerUs: 0.000001,
        oscillationWindowSize: 5,
        oscillationThreshold: 3,
        stallTimeoutUs: 30_000_000,
      },
    );

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);
    detector.recordCoherence('lock-1', 'entity-1', 0.2);
    detector.recordCoherence('lock-1', 'entity-1', 0.8);
    detector.recordCoherence('lock-1', 'entity-1', 0.3);

    expect(anomalies.length).toBeGreaterThan(0);
    expect(detector.getAnomalies('lock-1').length).toBeGreaterThan(0);
  });
});
