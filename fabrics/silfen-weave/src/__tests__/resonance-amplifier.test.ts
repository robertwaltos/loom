/**
 * resonance-amplifier.test.ts — Unit tests for resonance amplifier.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createResonanceAmplifier, DEFAULT_AMPLIFIER_CONFIG } from '../resonance-amplifier.js';
import type { ResonanceAmplifier, ResonanceAmplifierDeps } from '../resonance-amplifier.js';

// ── Test Helpers ─────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;

function mockClock(start = 1_000_000): {
  nowMicroseconds: () => number;
  advance: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
  };
}

function mockIdGen(): { generate: () => string } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'amp-' + String(counter);
    },
  };
}

function makeDeps(clock?: ReturnType<typeof mockClock>): ResonanceAmplifierDeps {
  return {
    clock: clock ?? mockClock(),
    idGenerator: mockIdGen(),
  };
}

// ── Tests: Placement ─────────────────────────────────────────────

describe('ResonanceAmplifier — placement', () => {
  let service: ResonanceAmplifier;

  beforeEach(() => {
    service = createResonanceAmplifier(makeDeps());
  });

  it('places an amplifier in warming status', () => {
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    expect(amp.status).toBe('warming');
    expect(amp.amplificationLevel).toBe(0);
    expect(amp.corridorId).toBe('c1');
    expect(amp.nodeId).toBe('n1');
  });

  it('retrieves a placed amplifier', () => {
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const found = service.getAmplifier(amp.amplifierId);
    expect(found).toBeDefined();
    expect(found?.amplifierId).toBe(amp.amplifierId);
  });

  it('returns undefined for unknown amplifier', () => {
    expect(service.getAmplifier('unknown')).toBeUndefined();
  });

  it('removes an amplifier', () => {
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    expect(service.removeAmplifier(amp.amplifierId)).toBe(true);
    expect(service.getAmplifier(amp.amplifierId)).toBeUndefined();
  });

  it('returns false removing unknown amplifier', () => {
    expect(service.removeAmplifier('unknown')).toBe(false);
  });
});

// ── Tests: Activation ────────────────────────────────────────────

describe('ResonanceAmplifier — activation', () => {
  let service: ResonanceAmplifier;
  let ampId: string;

  beforeEach(() => {
    service = createResonanceAmplifier(makeDeps());
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    ampId = amp.amplifierId;
  });

  it('activates an amplifier at a specified level', () => {
    const result = service.activate(ampId, 30);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.status).toBe('active');
    expect(result.amplificationLevel).toBe(30);
  });

  it('clamps amplification to max', () => {
    const result = service.activate(ampId, 100);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.amplificationLevel).toBe(50);
  });

  it('calculates power consumption', () => {
    const result = service.activate(ampId, 20);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.powerConsumed).toBe(20 * DEFAULT_AMPLIFIER_CONFIG.powerPerAmplificationUnit);
  });

  it('returns error for unknown amplifier', () => {
    expect(service.activate('unknown', 10)).toBe('amplifier_not_found');
  });

  it('returns error for failed amplifier', () => {
    service.markFailed(ampId);
    expect(service.activate(ampId, 10)).toBe('amplifier_failed');
  });
});

describe('ResonanceAmplifier — activation edge cases', () => {
  it('returns error for insufficient power', () => {
    const service = createResonanceAmplifier(makeDeps());
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 200,
      powerCapacity: 100,
    });
    expect(service.activate(amp.amplifierId, 200)).toBe('insufficient_power');
  });

  it('marks amplifier as overloaded at high utilization', () => {
    const service = createResonanceAmplifier(makeDeps());
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 100,
      powerCapacity: 1000,
    });
    const result = service.activate(amp.amplifierId, 95);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.status).toBe('overloaded');
  });
});

// ── Tests: Deactivation ──────────────────────────────────────────

describe('ResonanceAmplifier — deactivation', () => {
  it('deactivates an active amplifier', () => {
    const service = createResonanceAmplifier(makeDeps());
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(amp.amplifierId, 30);
    expect(service.deactivate(amp.amplifierId)).toBe(true);
    const found = service.getAmplifier(amp.amplifierId);
    expect(found?.status).toBe('offline');
    expect(found?.amplificationLevel).toBe(0);
  });

  it('returns false for unknown amplifier', () => {
    const service = createResonanceAmplifier(makeDeps());
    expect(service.deactivate('unknown')).toBe(false);
  });
});

// ── Tests: Decay ─────────────────────────────────────────────────

describe('ResonanceAmplifier — resonance decay', () => {
  it('applies decay to active amplifiers over time', () => {
    const clock = mockClock();
    const service = createResonanceAmplifier(makeDeps(clock));
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(amp.amplifierId, 40);
    clock.advance(US_PER_HOUR * 5);
    const events = service.applyDecay();
    expect(events.length).toBeGreaterThan(0);
    const found = service.getAmplifier(amp.amplifierId);
    expect(found).toBeDefined();
    if (found === undefined) return;
    expect(found.amplificationLevel).toBeLessThan(40);
  });

  it('does not decay offline amplifiers', () => {
    const clock = mockClock();
    const service = createResonanceAmplifier(makeDeps(clock));
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    clock.advance(US_PER_HOUR * 10);
    const events = service.applyDecay();
    expect(events).toHaveLength(0);
  });

  it('sets amplifier offline when decayed to zero', () => {
    const clock = mockClock();
    const service = createResonanceAmplifier(makeDeps(clock));
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(amp.amplifierId, 5);
    clock.advance(US_PER_HOUR * 10);
    service.applyDecay();
    const found = service.getAmplifier(amp.amplifierId);
    expect(found?.status).toBe('offline');
  });
});

// ── Tests: Interference Detection ────────────────────────────────

describe('ResonanceAmplifier — harmonic interference', () => {
  it('detects interference between nearby active amplifiers', () => {
    const service = createResonanceAmplifier(makeDeps());
    const a1 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const a2 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n2',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(a1.amplifierId, 50);
    service.activate(a2.amplifierId, 50);
    const interferences = service.detectInterference('c1');
    expect(interferences.length).toBeGreaterThan(0);
    expect(interferences[0]?.severity).toBeDefined();
  });

  it('reports no interference when amplifiers are low power', () => {
    const service = createResonanceAmplifier(makeDeps());
    const a1 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 100,
      powerCapacity: 2000,
    });
    const a2 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n2',
      maxAmplification: 100,
      powerCapacity: 2000,
    });
    service.activate(a1.amplifierId, 10);
    service.activate(a2.amplifierId, 10);
    const interferences = service.detectInterference('c1');
    expect(interferences).toHaveLength(0);
  });

  it('does not detect interference for offline amplifiers', () => {
    const service = createResonanceAmplifier(makeDeps());
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n2',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const interferences = service.detectInterference('c1');
    expect(interferences).toHaveLength(0);
  });
});

// ── Tests: Field Strength ────────────────────────────────────────

describe('ResonanceAmplifier — field strength', () => {
  it('calculates field strength for a corridor', () => {
    const service = createResonanceAmplifier(makeDeps());
    const a1 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const a2 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n2',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(a1.amplifierId, 30);
    service.activate(a2.amplifierId, 20);
    const field = service.getFieldStrength('c1');
    expect(field.totalAmplification).toBe(50);
    expect(field.amplifierCount).toBe(2);
    expect(field.corridorId).toBe('c1');
  });

  it('returns zero field for corridor with no amplifiers', () => {
    const service = createResonanceAmplifier(makeDeps());
    const field = service.getFieldStrength('empty');
    expect(field.totalAmplification).toBe(0);
    expect(field.amplifierCount).toBe(0);
  });
});

// ── Tests: Placement Recommendations ─────────────────────────────

describe('ResonanceAmplifier — placement recommendations', () => {
  it('recommends coverage gaps', () => {
    const service = createResonanceAmplifier(makeDeps());
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const recs = service.getPlacementRecommendations('c1', ['n1', 'n2', 'n3']);
    expect(recs).toHaveLength(2);
    const nodeIds = recs.map((r) => r.suggestedNodeId);
    expect(nodeIds).toContain('n2');
    expect(nodeIds).toContain('n3');
    expect(recs[0]?.reason).toBe('coverage_gap');
  });

  it('recommends replacing failed amplifiers', () => {
    const service = createResonanceAmplifier(makeDeps());
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.markFailed(amp.amplifierId);
    const recs = service.getPlacementRecommendations('c1', []);
    expect(recs).toHaveLength(1);
    expect(recs[0]?.reason).toBe('replace_failed');
    expect(recs[0]?.suggestedNodeId).toBe('n1');
  });

  it('returns empty recommendations when fully covered', () => {
    const service = createResonanceAmplifier(makeDeps());
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const recs = service.getPlacementRecommendations('c1', ['n1']);
    expect(recs).toHaveLength(0);
  });
});

// ── Tests: Corridor Listing ──────────────────────────────────────

describe('ResonanceAmplifier — corridor listing', () => {
  it('lists amplifiers for a corridor', () => {
    const service = createResonanceAmplifier(makeDeps());
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n2',
      maxAmplification: 30,
      powerCapacity: 500,
    });
    service.placeAmplifier({
      corridorId: 'c2',
      nodeId: 'n3',
      maxAmplification: 40,
      powerCapacity: 800,
    });
    expect(service.listByCorridor('c1')).toHaveLength(2);
    expect(service.listByCorridor('c2')).toHaveLength(1);
    expect(service.listByCorridor('c3')).toHaveLength(0);
  });
});

// ── Tests: Mark Failed ───────────────────────────────────────────

describe('ResonanceAmplifier — mark failed', () => {
  it('marks amplifier as failed', () => {
    const service = createResonanceAmplifier(makeDeps());
    const amp = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(amp.amplifierId, 30);
    expect(service.markFailed(amp.amplifierId)).toBe(true);
    const found = service.getAmplifier(amp.amplifierId);
    expect(found?.status).toBe('failed');
    expect(found?.amplificationLevel).toBe(0);
  });

  it('returns false for unknown amplifier', () => {
    const service = createResonanceAmplifier(makeDeps());
    expect(service.markFailed('unknown')).toBe(false);
  });
});

// ── Tests: Stats ─────────────────────────────────────────────────

describe('ResonanceAmplifier — stats', () => {
  it('reports zero stats initially', () => {
    const service = createResonanceAmplifier(makeDeps());
    const stats = service.getStats();
    expect(stats.totalAmplifiers).toBe(0);
    expect(stats.activeCount).toBe(0);
    expect(stats.totalPowerConsumed).toBe(0);
  });

  it('reports aggregate stats', () => {
    const service = createResonanceAmplifier(makeDeps());
    const a1 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n1',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    const a2 = service.placeAmplifier({
      corridorId: 'c1',
      nodeId: 'n2',
      maxAmplification: 50,
      powerCapacity: 1000,
    });
    service.activate(a1.amplifierId, 20);
    service.activate(a2.amplifierId, 30);
    service.markFailed(a2.amplifierId);
    const stats = service.getStats();
    expect(stats.totalAmplifiers).toBe(2);
    expect(stats.activeCount).toBe(1);
    expect(stats.failedCount).toBe(1);
  });
});
