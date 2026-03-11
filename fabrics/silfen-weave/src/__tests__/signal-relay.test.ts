import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSignalRelaySystem,
  type SignalRelaySystem,
  type SignalClock,
  type SignalIdGenerator,
  type SignalLogger,
} from '../signal-relay.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements SignalClock {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements SignalIdGenerator {
  private counter = 0;
  generate(): string {
    return 'sig-' + String(++this.counter);
  }
}

class TestLogger implements SignalLogger {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  info(m: string): void {
    this.infos.push(m);
  }
  warn(m: string): void {
    this.warns.push(m);
  }
  error(m: string): void {
    this.errors.push(m);
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function makeSystem(): { sys: SignalRelaySystem; clock: TestClock; logger: TestLogger } {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createSignalRelaySystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

// ── Tests ────────────────────────────────────────────────────────

describe('SignalRelay — registerWorld / sendSignal', () => {
  let sys: SignalRelaySystem;
  let logger: TestLogger;

  beforeEach(() => {
    ({ sys, logger } = makeSystem());
  });

  it('registerWorld always succeeds', () => {
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(true);
  });

  it('sends a valid targeted signal', () => {
    sys.registerWorld('world-A');
    sys.registerWorld('world-B');
    const result = sys.sendSignal('sender-1', 'world-A', 'world-B', 'TARGETED', 'Hello', 80);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.senderId).toBe('sender-1');
    expect(result.originWorldId).toBe('world-A');
    expect(result.targetWorldId).toBe('world-B');
    expect(result.strengthDb).toBe(80);
    expect(result.acknowledgedAt).toBeNull();
    expect(result.receiverIds.length).toBe(0);
  });

  it('sends a broadcast signal with null target', () => {
    sys.registerWorld('world-A');
    const result = sys.sendSignal('sender-1', 'world-A', null, 'BROADCAST', 'All worlds', 50);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.targetWorldId).toBeNull();
  });

  it('rejects signal with strength below 0', () => {
    sys.registerWorld('world-A');
    const result = sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'msg', -1);
    expect(result).toBe('invalid-strength');
    expect(logger.errors.length).toBeGreaterThan(0);
  });

  it('rejects signal with strength above 100', () => {
    sys.registerWorld('world-A');
    const result = sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'msg', 101);
    expect(result).toBe('invalid-strength');
  });

  it('accepts strength exactly 0 and 100', () => {
    sys.registerWorld('world-A');
    const r1 = sys.sendSignal('s1', 'world-A', null, 'EMERGENCY', 'low', 0);
    const r2 = sys.sendSignal('s2', 'world-A', null, 'EMERGENCY', 'high', 100);
    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
  });

  it('rejects signal from unregistered origin world', () => {
    const result = sys.sendSignal('s1', 'unknown-world', null, 'BROADCAST', 'msg', 50);
    expect(result).toBe('world-not-found');
  });

  it('logs signal creation', () => {
    sys.registerWorld('world-A');
    sys.sendSignal('s1', 'world-A', null, 'BEACON', 'ping', 60);
    expect(logger.infos.some((m) => m.includes('Signal sent'))).toBe(true);
  });
});

describe('SignalRelay — acknowledgeSignal / boostSignal', () => {
  let sys: SignalRelaySystem;
  let clock: TestClock;

  beforeEach(() => {
    ({ sys, clock } = makeSystem());
    sys.registerWorld('world-A');
  });

  it('acknowledges a signal and records receiverId', () => {
    const signal = sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'hi', 50);
    if (typeof signal === 'string') return;
    clock.advance(1000n);
    const result = sys.acknowledgeSignal(signal.signalId, 'receiver-1');
    expect(result.success).toBe(true);
    const updated = sys.getSignal(signal.signalId);
    expect(updated?.receiverIds).toContain('receiver-1');
    expect(updated?.acknowledgedAt).not.toBeNull();
  });

  it('allows multiple different receivers to acknowledge same signal', () => {
    const signal = sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'hi', 50);
    if (typeof signal === 'string') return;
    sys.acknowledgeSignal(signal.signalId, 'receiver-1');
    sys.acknowledgeSignal(signal.signalId, 'receiver-2');
    expect(sys.getSignal(signal.signalId)?.receiverIds.length).toBe(2);
  });

  it('rejects duplicate acknowledgement from same receiver', () => {
    const signal = sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'hi', 50);
    if (typeof signal === 'string') return;
    sys.acknowledgeSignal(signal.signalId, 'receiver-1');
    const result = sys.acknowledgeSignal(signal.signalId, 'receiver-1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-acknowledged');
  });

  it('acknowledgeSignal returns signal-not-found for unknown id', () => {
    const result = sys.acknowledgeSignal('fake-id', 'r1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('signal-not-found');
  });

  it('boostSignal increases strength', () => {
    const signal = sys.sendSignal('s1', 'world-A', null, 'HANDSHAKE', 'boost me', 50);
    if (typeof signal === 'string') return;
    const result = sys.boostSignal(signal.signalId, 20);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.newStrength).toBe(70);
  });

  it('boostSignal caps at 100', () => {
    const signal = sys.sendSignal('s1', 'world-A', null, 'EMERGENCY', 'cap', 90);
    if (typeof signal === 'string') return;
    const result = sys.boostSignal(signal.signalId, 50);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.newStrength).toBe(100);
  });

  it('boostSignal returns signal-not-found for unknown id', () => {
    const result = sys.boostSignal('fake-id', 10);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('signal-not-found');
  });
});

describe('SignalRelay — listSignals / getStats', () => {
  let sys: SignalRelaySystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerWorld('world-A');
    sys.registerWorld('world-B');
    sys.registerWorld('world-C');
  });

  it('listSignals returns signals where world is origin', () => {
    sys.sendSignal('s1', 'world-A', 'world-B', 'TARGETED', 'msg', 50);
    sys.sendSignal('s2', 'world-B', 'world-C', 'TARGETED', 'msg', 50);
    expect(sys.listSignals('world-A').length).toBe(1);
  });

  it('listSignals returns signals where world is target', () => {
    sys.sendSignal('s1', 'world-A', 'world-B', 'TARGETED', 'msg', 50);
    expect(sys.listSignals('world-B').length).toBe(1);
  });

  it('broadcast signals appear in all worlds', () => {
    sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'global', 50);
    expect(sys.listSignals('world-A').length).toBe(1);
    expect(sys.listSignals('world-B').length).toBe(1);
    expect(sys.listSignals('world-C').length).toBe(1);
  });

  it('listSignals filters by type', () => {
    sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'b1', 50);
    sys.sendSignal('s2', 'world-A', null, 'EMERGENCY', 'e1', 80);
    expect(sys.listSignals('world-A', 'EMERGENCY').length).toBe(1);
  });

  it('getStats returns zero stats initially', () => {
    const stats = sys.getStats();
    expect(stats.totalSignals).toBe(0);
    expect(stats.acknowledgedCount).toBe(0);
    expect(stats.averageStrengthDb).toBe(0);
  });

  it('getStats counts total signals and by type', () => {
    sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'b', 40);
    sys.sendSignal('s2', 'world-A', null, 'EMERGENCY', 'e', 60);
    const stats = sys.getStats();
    expect(stats.totalSignals).toBe(2);
    expect(stats.byType.BROADCAST).toBe(1);
    expect(stats.byType.EMERGENCY).toBe(1);
  });

  it('getStats calculates average strength', () => {
    sys.sendSignal('s1', 'world-A', null, 'BROADCAST', 'a', 40);
    sys.sendSignal('s2', 'world-A', null, 'BROADCAST', 'b', 60);
    const stats = sys.getStats();
    expect(stats.averageStrengthDb).toBe(50);
  });

  it('getStats counts acknowledged signals', () => {
    const sig = sys.sendSignal('s1', 'world-A', null, 'BEACON', 'ping', 70);
    if (typeof sig === 'string') return;
    sys.acknowledgeSignal(sig.signalId, 'r1');
    expect(sys.getStats().acknowledgedCount).toBe(1);
  });

  it('relay-full returned when 1000 signals exist', () => {
    for (let i = 0; i < 1000; i++) {
      sys.sendSignal('s', 'world-A', null, 'BEACON', 'msg', 50);
    }
    const result = sys.sendSignal('s', 'world-A', null, 'BEACON', 'overflow', 50);
    expect(result).toBe('relay-full');
  });
});
