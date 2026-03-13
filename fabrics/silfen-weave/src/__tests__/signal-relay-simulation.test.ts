import { describe, expect, it } from 'vitest';
import { createSignalRelaySystem } from '../signal-relay.js';

function makeSystem() {
  let i = 0;
  return createSignalRelaySystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => `sig-${++i}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('signal-relay simulation', () => {
  it('broadcasts, acknowledges, boosts, and reports aggregate relay stats', () => {
    const relay = makeSystem();
    relay.registerWorld('w1');
    relay.registerWorld('w2');
    relay.registerWorld('w3');

    const signal = relay.sendSignal('pilot-1', 'w1', null, 'BROADCAST', 'all stations', 60);
    expect(typeof signal).toBe('object');
    if (typeof signal === 'string') return;

    relay.acknowledgeSignal(signal.signalId, 'r1');
    relay.acknowledgeSignal(signal.signalId, 'r2');
    const boosted = relay.boostSignal(signal.signalId, 50);
    expect(boosted.success).toBe(true);
    if (!boosted.success) return;
    expect(boosted.newStrength).toBe(100);

    const stats = relay.getStats();
    expect(stats.totalSignals).toBe(1);
    expect(stats.acknowledgedCount).toBe(1);
    expect(relay.listSignals('w3')).toHaveLength(1);
  });
});
