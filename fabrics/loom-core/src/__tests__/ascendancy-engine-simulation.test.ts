import { describe, it, expect, vi } from 'vitest';
import {
  createAscendancyEngine,
  DETECTION_CONFIDENCE_THRESHOLD,
  OUTER_ARC_THRESHOLD_LY,
  FERREIRA_ASANTE_CORRELATION,
} from '../ascendancy-engine.js';

// ─── helpers ───────────────────────────────────────────────────────────────

let idCounter = 0;

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    clock: { nowMs: () => 1_700_000_000_000 },
    idGenerator: { next: () => `id-${++idCounter}` },
    ...overrides,
  };
}

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    nodeId: 'node-alpha',
    worldId: 'cloud-kingdom',
    suspectedVector: 'FREQUENCY_SPOOFING' as const,
    detectionConfidence: 0.80,
    affectedHarmonicIndex: 1,
    harmonicDeviation: 0.3,
    ...overrides,
  };
}

// ─── exported constants ────────────────────────────────────────────────────

describe('AscendancyEngine — exported constants', () => {
  it('DETECTION_CONFIDENCE_THRESHOLD is 0.65', () => {
    expect(DETECTION_CONFIDENCE_THRESHOLD).toBe(0.65);
  });

  it('OUTER_ARC_THRESHOLD_LY is 280', () => {
    expect(OUTER_ARC_THRESHOLD_LY).toBe(280);
  });

  it('FERREIRA_ASANTE_CORRELATION is 0.94', () => {
    expect(FERREIRA_ASANTE_CORRELATION).toBe(0.94);
  });
});

// ─── observeAnomaly ────────────────────────────────────────────────────────

describe('AscendancyEngine — observeAnomaly', () => {
  it('returns an anomaly object for every call', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.observeAnomaly(makeParams());
    expect(result.anomaly).toBeDefined();
    expect(result.anomaly.nodeId).toBe('node-alpha');
  });

  it('anomaly records the suspected vector', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.observeAnomaly(makeParams({ suspectedVector: 'POWER_SABOTAGE' }));
    expect(result.anomaly.suspectedVector).toBe('POWER_SABOTAGE');
  });

  it('generates a threat when confidence meets threshold', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.observeAnomaly(makeParams({ detectionConfidence: DETECTION_CONFIDENCE_THRESHOLD }));
    expect(result.threat).toBeDefined();
  });

  it('generates a threat when confidence exceeds threshold', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.observeAnomaly(makeParams({ detectionConfidence: 0.99 }));
    expect(result.threat).toBeDefined();
  });

  it('does NOT generate a threat when confidence is below threshold', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.observeAnomaly(makeParams({ detectionConfidence: 0.50 }));
    expect(result.threat).toBeUndefined();
  });

  it('threat has the correct nodeId and vector', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.observeAnomaly(makeParams({ suspectedVector: 'GEODETIC_CORRUPTION' }));
    expect(result.threat!.nodeId).toBe('node-alpha');
    expect(result.threat!.vector).toBe('GEODETIC_CORRUPTION');
  });
});

// ─── computeIntegrityScore ─────────────────────────────────────────────────

describe('AscendancyEngine — computeIntegrityScore', () => {
  it('returns score 1.0 for a node with no anomalies', () => {
    const engine = createAscendancyEngine(makeDeps());
    const result = engine.computeIntegrityScore('pristine-node');
    expect(result.score).toBe(1.0);
    expect(result.anomalyCount).toBe(0);
  });

  it('returns score < 1.0 after observing an anomaly', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ nodeId: 'beta', detectionConfidence: 0.90 }));
    const result = engine.computeIntegrityScore('beta');
    expect(result.score).toBeLessThan(1.0);
    expect(result.anomalyCount).toBeGreaterThan(0);
  });

  it('includes dominantVector when anomalies exist', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ nodeId: 'gamma', suspectedVector: 'SIGNAL_DEGRADATION' }));
    const result = engine.computeIntegrityScore('gamma');
    expect(result.dominantVector).toBeTruthy();
  });
});

// ─── outer-arc detection ───────────────────────────────────────────────────

describe('AscendancyEngine — outer-arc detection', () => {
  it('threat has isOuterArcNode = true when node is at or beyond OUTER_ARC_THRESHOLD_LY', () => {
    const nodeDistance = { getDistanceLY: (id: string) => (id === 'far-node' ? 300 : 100) };
    const engine = createAscendancyEngine(makeDeps({ nodeDistance }));
    const result = engine.observeAnomaly(makeParams({ nodeId: 'far-node', detectionConfidence: 0.90 }));
    expect(result.threat!.isOuterArcNode).toBe(true);
  });

  it('threat has isOuterArcNode = false for an inner node', () => {
    const nodeDistance = { getDistanceLY: (_id: string) => 150 };
    const engine = createAscendancyEngine(makeDeps({ nodeDistance }));
    const result = engine.observeAnomaly(makeParams({ detectionConfidence: 0.90 }));
    expect(result.threat!.isOuterArcNode).toBe(false);
  });

  it('outer-arc threat carries the Ferreira-Asante correlation value', () => {
    const nodeDistance = { getDistanceLY: (_id: string) => 350 };
    const engine = createAscendancyEngine(makeDeps({ nodeDistance }));
    const result = engine.observeAnomaly(makeParams({ detectionConfidence: 0.90 }));
    expect(result.threat!.outerArcCorrelation).toBeCloseTo(FERREIRA_ASANTE_CORRELATION);
  });
});

// ─── computeOuterArcCorrelation ────────────────────────────────────────────

describe('AscendancyEngine — computeOuterArcCorrelation', () => {
  it('returns a number for an outer-arc node', () => {
    const nodeDistance = { getDistanceLY: (_id: string) => 400 };
    const engine = createAscendancyEngine(makeDeps({ nodeDistance }));
    engine.observeAnomaly(makeParams({ nodeId: 'outer', detectionConfidence: 0.90 }));
    const correlation = engine.computeOuterArcCorrelation('outer');
    expect(typeof correlation).toBe('number');
  });

  it('returns undefined for an inner node', () => {
    const nodeDistance = { getDistanceLY: (_id: string) => 100 };
    const engine = createAscendancyEngine(makeDeps({ nodeDistance }));
    engine.observeAnomaly(makeParams({ nodeId: 'inner', detectionConfidence: 0.90 }));
    const correlation = engine.computeOuterArcCorrelation('inner');
    expect(correlation).toBeUndefined();
  });

  it('returns undefined when no nodeDistance dep is provided', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ nodeId: 'nodist', detectionConfidence: 0.90 }));
    expect(engine.computeOuterArcCorrelation('nodist')).toBeUndefined();
  });
});

// ─── getIncidentCount ──────────────────────────────────────────────────────

describe('AscendancyEngine — getIncidentCount', () => {
  it('starts with zero anomalies and zero threats', () => {
    const engine = createAscendancyEngine(makeDeps());
    const counts = engine.getIncidentCount();
    expect(counts.totalAnomalies).toBe(0);
    expect(counts.totalThreats).toBe(0);
  });

  it('increments totalAnomalies for every observed anomaly', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.40 }));
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.40 }));
    expect(engine.getIncidentCount().totalAnomalies).toBe(2);
  });

  it('increments totalThreats only for above-threshold anomalies', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.40 })); // below
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.90 })); // above
    expect(engine.getIncidentCount().totalThreats).toBe(1);
  });
});

// ─── chronicle emission ────────────────────────────────────────────────────

describe('AscendancyEngine — chronicle emission', () => {
  it('calls chronicle.emit when a threat is generated', () => {
    const emit = vi.fn();
    const engine = createAscendancyEngine(makeDeps({ chronicle: { emit } }));
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.90 }));
    expect(emit).toHaveBeenCalledOnce();
  });

  it('does not call chronicle.emit when confidence is too low', () => {
    const emit = vi.fn();
    const engine = createAscendancyEngine(makeDeps({ chronicle: { emit } }));
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.40 }));
    expect(emit).not.toHaveBeenCalled();
  });
});

// ─── getNodeAnomalies / getThreats ─────────────────────────────────────────

describe('AscendancyEngine — query helpers', () => {
  it('getNodeAnomalies returns every anomaly observed for that node', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ nodeId: 'query-node' }));
    engine.observeAnomaly(makeParams({ nodeId: 'query-node' }));
    expect(engine.getNodeAnomalies('query-node')).toHaveLength(2);
  });

  it('getNodeAnomalies returns empty array for unknown node', () => {
    const engine = createAscendancyEngine(makeDeps());
    expect(engine.getNodeAnomalies('ghost-node')).toHaveLength(0);
  });

  it('getThreats returns threats after high-confidence observations', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ detectionConfidence: 0.90 }));
    expect(engine.getThreats().length).toBeGreaterThanOrEqual(1);
  });

  it('getNodeThreats scopes results to the specified node', () => {
    const engine = createAscendancyEngine(makeDeps());
    engine.observeAnomaly(makeParams({ nodeId: 'scope-node', detectionConfidence: 0.90 }));
    engine.observeAnomaly(makeParams({ nodeId: 'other-node', detectionConfidence: 0.90 }));
    const scopedThreats = engine.getNodeThreats('scope-node');
    expect(scopedThreats.length).toBeGreaterThanOrEqual(1);
    for (const t of scopedThreats) {
      expect(t.nodeId).toBe('scope-node');
    }
  });
});
