/**
 * ascendancy-engine.test.ts — Tests for Ascendancy threat detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAscendancyEngine,
  DETECTION_CONFIDENCE_THRESHOLD,
  OUTER_ARC_THRESHOLD_LY,
  FERREIRA_ASANTE_CORRELATION,
  type AscendancyEngine,
  type AscendancyChronicleEntry,
} from '../ascendancy-engine.js';

// ── Helpers ───────────────────────────────────────────────────────────────

class TestClock {
  ms = 1_000_000;
  nowMs(): number { return this.ms; }
  advance(n: number): void { this.ms += n; }
}

class TestIdGen {
  n = 0;
  next(): string { return `asc-${++this.n}`; }
}

function makeDeps(options?: {
  distanceLY?: Record<string, number>;
  chronicle?: { emit: (e: AscendancyChronicleEntry) => void };
}) {
  return {
    clock: new TestClock(),
    idGenerator: new TestIdGen(),
    chronicle: options?.chronicle,
    nodeDistance: options?.distanceLY
      ? { getDistanceLY: (id: string) => options.distanceLY![id] }
      : undefined,
  };
}

// ── observeAnomaly ────────────────────────────────────────────────────────

describe('AscendancyEngine — observeAnomaly', () => {
  let engine: AscendancyEngine;

  beforeEach(() => {
    engine = createAscendancyEngine(makeDeps());
  });

  it('records an anomaly', () => {
    const { anomaly } = engine.observeAnomaly({
      nodeId: 'node-1',
      worldId: 'world-1',
      suspectedVector: 'SIGNAL_DEGRADATION',
      detectionConfidence: 0.4,
      affectedHarmonicIndex: 2,
      harmonicDeviation: 0.15,
    });
    expect(anomaly.nodeId).toBe('node-1');
    expect(anomaly.suspectedVector).toBe('SIGNAL_DEGRADATION');
    expect(engine.getNodeAnomalies('node-1').length).toBe(1);
  });

  it('does not escalate when confidence is below threshold', () => {
    const result = engine.observeAnomaly({
      nodeId: 'node-2',
      worldId: 'world-2',
      suspectedVector: 'HARMONIC_INJECTION',
      detectionConfidence: DETECTION_CONFIDENCE_THRESHOLD - 0.01,
      affectedHarmonicIndex: 3,
      harmonicDeviation: 0.1,
    });
    expect(result.threat).toBeUndefined();
    expect(result.chronicleEntry).toBeUndefined();
  });

  it('escalates to ThreatEvent when confidence meets threshold', () => {
    const result = engine.observeAnomaly({
      nodeId: 'node-3',
      worldId: 'world-3',
      suspectedVector: 'FREQUENCY_SPOOFING',
      detectionConfidence: DETECTION_CONFIDENCE_THRESHOLD + 0.1,
      affectedHarmonicIndex: 0,
      harmonicDeviation: -0.8,
    });
    expect(result.threat).toBeDefined();
    expect(result.threat?.vector).toBe('FREQUENCY_SPOOFING');
    expect(result.chronicleEntry).toBeDefined();
  });

  it('emits chronicle entry on escalation', () => {
    const entries: AscendancyChronicleEntry[] = [];
    engine = createAscendancyEngine(makeDeps({ chronicle: { emit: (e) => entries.push(e) } }));

    engine.observeAnomaly({
      nodeId: 'node-4',
      worldId: 'world-4',
      suspectedVector: 'POWER_SABOTAGE',
      detectionConfidence: 0.9,
      affectedHarmonicIndex: 1,
      harmonicDeviation: -0.6,
    });

    expect(entries.length).toBe(1);
    expect(entries[0].entryType).toBe('LATTICE_BEACON_COMPROMISE');
  });
});

// ── outer arc detection ───────────────────────────────────────────────────

describe('AscendancyEngine — outer arc classification', () => {
  it('flags threats in the outer arc interference band', () => {
    const engine = createAscendancyEngine(makeDeps({
      distanceLY: { 'outer-node': OUTER_ARC_THRESHOLD_LY + 10 },
    }));

    const { threat } = engine.observeAnomaly({
      nodeId: 'outer-node',
      worldId: 'world-499',
      suspectedVector: 'HARMONIC_INJECTION',
      detectionConfidence: 0.88,
      affectedHarmonicIndex: 1,
      harmonicDeviation: 0.7,
    });

    expect(threat?.isOuterArcNode).toBe(true);
    expect(threat?.outerArcCorrelation).toBeDefined();
  });

  it('does not flag inner-arc nodes as outer-arc', () => {
    const engine = createAscendancyEngine(makeDeps({
      distanceLY: { 'inner-node': 50 },
    }));

    const { threat } = engine.observeAnomaly({
      nodeId: 'inner-node',
      worldId: 'world-5',
      suspectedVector: 'SIGNAL_DEGRADATION',
      detectionConfidence: 0.85,
      affectedHarmonicIndex: 4,
      harmonicDeviation: 0.3,
    });

    expect(threat?.isOuterArcNode).toBe(false);
    expect(threat?.outerArcCorrelation).toBeUndefined();
  });

  it('computeOuterArcCorrelation returns undefined for inner-arc nodes', () => {
    const engine = createAscendancyEngine(makeDeps({
      distanceLY: { 'inner': 100 },
    }));
    expect(engine.computeOuterArcCorrelation('inner')).toBeUndefined();
  });

  it('computeOuterArcCorrelation returns non-zero for outer-arc nodes with anomalies', () => {
    const engine = createAscendancyEngine(makeDeps({
      distanceLY: { 'star-499': OUTER_ARC_THRESHOLD_LY + 50 },
    }));

    engine.observeAnomaly({
      nodeId: 'star-499',
      worldId: 'world-499',
      suspectedVector: 'HARMONIC_INJECTION',
      detectionConfidence: 0.9,
      affectedHarmonicIndex: 0,
      harmonicDeviation: 0.88,
    });

    const corr = engine.computeOuterArcCorrelation('star-499');
    expect(corr).toBeDefined();
    expect(corr!).toBeGreaterThan(0);
    // Should not exceed Ferreira-Asante upper bound.
    expect(corr!).toBeLessThanOrEqual(FERREIRA_ASANTE_CORRELATION);
  });
});

// ── computeIntegrityScore ─────────────────────────────────────────────────

describe('AscendancyEngine — computeIntegrityScore', () => {
  it('returns 1.0 for a node with no anomalies', () => {
    const engine = createAscendancyEngine(makeDeps());
    const score = engine.computeIntegrityScore('clean-node');
    expect(score.score).toBe(1.0);
    expect(score.anomalyCount).toBe(0);
  });

  it('reduces score after a high-confidence power-sabotage event', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly({
      nodeId: 'node-x',
      worldId: 'world-x',
      suspectedVector: 'POWER_SABOTAGE',
      detectionConfidence: 1.0,
      affectedHarmonicIndex: 0,
      harmonicDeviation: -1.0,
    });
    const score = engine.computeIntegrityScore('node-x');
    expect(score.score).toBeLessThan(1.0);
    expect(score.dominantVector).toBe('POWER_SABOTAGE');
  });

  it('score does not go below 0', () => {
    const engine = createAscendancyEngine(makeDeps());
    for (let i = 0; i < 20; i++) {
      engine.observeAnomaly({
        nodeId: 'battered-node',
        worldId: 'world-y',
        suspectedVector: 'POWER_SABOTAGE',
        detectionConfidence: 1.0,
        affectedHarmonicIndex: 0,
        harmonicDeviation: -1.0,
      });
    }
    const score = engine.computeIntegrityScore('battered-node');
    expect(score.score).toBeGreaterThanOrEqual(0);
  });
});

// ── getIncidentCount ──────────────────────────────────────────────────────

describe('AscendancyEngine — getIncidentCount', () => {
  it('counts total anomalies and threats', () => {
    const engine = createAscendancyEngine(makeDeps());
    
    engine.observeAnomaly({ nodeId: 'n1', worldId: 'w1', suspectedVector: 'SIGNAL_DEGRADATION', detectionConfidence: 0.3, affectedHarmonicIndex: 0, harmonicDeviation: 0.1 });
    engine.observeAnomaly({ nodeId: 'n2', worldId: 'w2', suspectedVector: 'FREQUENCY_SPOOFING', detectionConfidence: 0.9, affectedHarmonicIndex: 1, harmonicDeviation: -0.5 });

    const counts = engine.getIncidentCount();
    expect(counts.totalAnomalies).toBe(2);
    expect(counts.totalThreats).toBe(1);  // Only the high-confidence one escalated.
    expect(counts.byVector.FREQUENCY_SPOOFING).toBe(1);
    expect(counts.byVector.SIGNAL_DEGRADATION).toBe(0);  // Below threshold — not a threat.
  });
});
