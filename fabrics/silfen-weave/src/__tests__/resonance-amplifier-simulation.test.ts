import { describe, expect, it } from 'vitest';
import { createResonanceAmplifier } from '../resonance-amplifier.js';

function makeSystem() {
  let now = 1_000_000;
  let i = 0;
  return {
    clock: {
      nowMicroseconds: () => now,
      advance: (delta: number) => {
        now += delta;
      },
    },
    service: createResonanceAmplifier({
      clock: { nowMicroseconds: () => now },
      idGenerator: { generate: () => `amp-${++i}` },
    }),
  };
}

describe('resonance-amplifier simulation', () => {
  it('builds corridor field, detects interference, then decays over time', () => {
    const { service, clock } = makeSystem();
    const a1 = service.placeAmplifier({ corridorId: 'c1', nodeId: 'n1', maxAmplification: 100, powerCapacity: 2000 });
    const a2 = service.placeAmplifier({ corridorId: 'c1', nodeId: 'n2', maxAmplification: 100, powerCapacity: 2000 });

    service.activate(a1.amplifierId, 80);
    service.activate(a2.amplifierId, 70);

    const interferences = service.detectInterference('c1');
    expect(interferences.length).toBeGreaterThan(0);

    clock.advance(3_600_000_000 * 4);
    service.applyDecay();
    const field = service.getFieldStrength('c1');
    expect(field.totalAmplification).toBeLessThan(150);
  });
});
