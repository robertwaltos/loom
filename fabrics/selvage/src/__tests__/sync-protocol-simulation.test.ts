/**
 * Sync Protocol — Simulation Tests
 *
 * Exercises the binary WebSocket frame protocol: encode/decode round-trips,
 * client input serialization, entity delta compression, sequence tracking
 * with dedup, and EWMA latency estimation.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeFrame,
  decodeFrame,
  encodeClientInput,
  decodeClientInput,
  computeDelta,
  createSequenceTracker,
  createLatencyEstimator,
  FRAME,
} from '../sync-protocol.js';
import type { SyncFrame, EntitySnapshot, ClientInput } from '../sync-protocol.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeFrame(overrides: Partial<SyncFrame> = {}): SyncFrame {
  return {
    frameType: overrides.frameType ?? FRAME.HEARTBEAT,
    sequence: overrides.sequence ?? 1,
    timestampUs: overrides.timestampUs ?? 1000000n,
    payload: overrides.payload ?? new Uint8Array(0),
  };
}

function makeSnapshot(overrides: Partial<EntitySnapshot> = {}): EntitySnapshot {
  return {
    entityId: overrides.entityId ?? 'ent-1',
    x: overrides.x ?? 10,
    y: overrides.y ?? 20,
    z: overrides.z ?? 30,
    yaw: overrides.yaw ?? 1.5,
    health: overrides.health ?? 100,
    flags: overrides.flags ?? 0,
  };
}

function makeInput(overrides: Partial<ClientInput> = {}): ClientInput {
  return {
    sequence: overrides.sequence ?? 1,
    moveX: overrides.moveX ?? 0.5,
    moveY: overrides.moveY ?? 0,
    moveZ: overrides.moveZ ?? -0.5,
    yaw: overrides.yaw ?? 1.57,
    pitch: overrides.pitch ?? 0,
    actions: overrides.actions ?? 0,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('Sync Protocol', () => {

  // ── Frame Encode/Decode ─────────────────────────────────────

  describe('frame encode/decode', () => {
    it('round-trips an empty-payload frame', () => {
      const frame = makeFrame();
      const encoded = encodeFrame(frame);
      const result = decodeFrame(encoded);
      expect(result).toBeDefined();
      expect(result!.frame.frameType).toBe(FRAME.HEARTBEAT);
      expect(result!.frame.sequence).toBe(1);
      expect(result!.frame.timestampUs).toBe(1000000n);
      expect(result!.frame.payload.length).toBe(0);
    });

    it('round-trips a frame with payload', () => {
      const payload = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
      const frame = makeFrame({ frameType: FRAME.SERVER_STATE, sequence: 42, payload });
      const encoded = encodeFrame(frame);
      const result = decodeFrame(encoded);
      expect(result).toBeDefined();
      expect(result!.frame.frameType).toBe(FRAME.SERVER_STATE);
      expect(result!.frame.sequence).toBe(42);
      expect(result!.frame.payload).toEqual(payload);
    });

    it('reports correct bytesConsumed', () => {
      const payload = new Uint8Array([1, 2, 3]);
      const frame = makeFrame({ payload });
      const encoded = encodeFrame(frame);
      const result = decodeFrame(encoded);
      expect(result!.bytesConsumed).toBe(15 + 3); // HEADER_SIZE + payload
    });

    it('returns undefined for insufficient data', () => {
      const tooShort = new Uint8Array(10);
      expect(decodeFrame(tooShort)).toBeUndefined();
    });

    it('returns undefined when payload length exceeds available data', () => {
      const frame = makeFrame({ payload: new Uint8Array(20) });
      const encoded = encodeFrame(frame);
      // Truncate the buffer
      const truncated = encoded.slice(0, 20);
      expect(decodeFrame(truncated)).toBeUndefined();
    });

    it('preserves all frame types', () => {
      for (const [_name, type] of Object.entries(FRAME)) {
        const frame = makeFrame({ frameType: type });
        const encoded = encodeFrame(frame);
        const decoded = decodeFrame(encoded);
        expect(decoded!.frame.frameType).toBe(type);
      }
    });

    it('preserves large sequence numbers', () => {
      const frame = makeFrame({ sequence: 0xFFFFFFFF });
      const encoded = encodeFrame(frame);
      const result = decodeFrame(encoded);
      expect(result!.frame.sequence).toBe(0xFFFFFFFF);
    });

    it('preserves large timestamps', () => {
      const bigTs = 9_999_999_999_999n;
      const frame = makeFrame({ timestampUs: bigTs });
      const encoded = encodeFrame(frame);
      const result = decodeFrame(encoded);
      expect(result!.frame.timestampUs).toBe(bigTs);
    });
  });

  // ── Client Input ────────────────────────────────────────────

  describe('client input', () => {
    it('round-trips client input through encode/decode', () => {
      const input = makeInput();
      const encoded = encodeClientInput(input, 5000000n);
      const decoded = decodeFrame(encoded);
      expect(decoded).toBeDefined();
      expect(decoded!.frame.frameType).toBe(FRAME.CLIENT_INPUT);

      const restored = decodeClientInput(decoded!.frame);
      expect(restored.sequence).toBe(input.sequence);
      expect(restored.moveX).toBeCloseTo(input.moveX, 4);
      expect(restored.moveY).toBeCloseTo(input.moveY, 4);
      expect(restored.moveZ).toBeCloseTo(input.moveZ, 4);
      expect(restored.yaw).toBeCloseTo(input.yaw, 4);
      expect(restored.pitch).toBeCloseTo(input.pitch, 4);
      expect(restored.actions).toBe(input.actions);
    });

    it('preserves action bitfield', () => {
      const input = makeInput({ actions: 0b10110101 });
      const encoded = encodeClientInput(input, 0n);
      const decoded = decodeFrame(encoded)!;
      const restored = decodeClientInput(decoded.frame);
      expect(restored.actions).toBe(0b10110101);
    });

    it('preserves negative movement values', () => {
      const input = makeInput({ moveX: -1, moveY: -0.5, moveZ: -0.75 });
      const encoded = encodeClientInput(input, 0n);
      const decoded = decodeFrame(encoded)!;
      const restored = decodeClientInput(decoded.frame);
      expect(restored.moveX).toBeCloseTo(-1, 4);
      expect(restored.moveY).toBeCloseTo(-0.5, 4);
      expect(restored.moveZ).toBeCloseTo(-0.75, 4);
    });
  });

  // ── Delta Compression ───────────────────────────────────────

  describe('delta compression', () => {
    it('returns undefined when snapshots are identical', () => {
      const snap = makeSnapshot();
      expect(computeDelta(snap, snap)).toBeUndefined();
    });

    it('detects single field change (x)', () => {
      const prev = makeSnapshot();
      const curr = makeSnapshot({ x: 15 });
      const delta = computeDelta(prev, curr);
      expect(delta).toBeDefined();
      expect(delta!.changedMask).toBe(1); // bit 0 = x
      expect(delta!.values).toEqual([15]);
    });

    it('detects multiple field changes', () => {
      const prev = makeSnapshot();
      const curr = makeSnapshot({ x: 15, z: 35, health: 80 });
      const delta = computeDelta(prev, curr);
      expect(delta).toBeDefined();
      // bit 0 (x) + bit 2 (z) + bit 4 (health) = 1 + 4 + 16 = 21
      expect(delta!.changedMask).toBe(21);
      expect(delta!.values).toEqual([15, 35, 80]);
    });

    it('detects all fields changed', () => {
      const prev = makeSnapshot();
      const curr = makeSnapshot({ x: 1, y: 2, z: 3, yaw: 0, health: 50, flags: 7 });
      const delta = computeDelta(prev, curr);
      expect(delta).toBeDefined();
      expect(delta!.changedMask).toBe(0b111111); // all 6 bits
      expect(delta!.values.length).toBe(6);
    });

    it('preserves entityId in delta', () => {
      const prev = makeSnapshot({ entityId: 'hero-1' });
      const curr = makeSnapshot({ entityId: 'hero-1', x: 99 });
      const delta = computeDelta(prev, curr);
      expect(delta!.entityId).toBe('hero-1');
    });

    it('detects yaw change at bit 3', () => {
      const prev = makeSnapshot();
      const curr = makeSnapshot({ yaw: 3.14 });
      const delta = computeDelta(prev, curr);
      expect(delta!.changedMask).toBe(8); // bit 3
    });

    it('detects flags change at bit 5', () => {
      const prev = makeSnapshot();
      const curr = makeSnapshot({ flags: 255 });
      const delta = computeDelta(prev, curr);
      expect(delta!.changedMask).toBe(32); // bit 5
    });
  });

  // ── Sequence Tracker ────────────────────────────────────────

  describe('sequence tracker', () => {
    it('accepts sequential packets', () => {
      const tracker = createSequenceTracker();
      expect(tracker.accept(0)).toBe(true);
      expect(tracker.accept(1)).toBe(true);
      expect(tracker.accept(2)).toBe(true);
    });

    it('rejects duplicate sequences', () => {
      const tracker = createSequenceTracker();
      tracker.accept(5);
      expect(tracker.accept(5)).toBe(false);
    });

    it('accepts out-of-order within window', () => {
      const tracker = createSequenceTracker(64);
      tracker.accept(10);
      tracker.accept(12);
      expect(tracker.accept(11)).toBe(true);
    });

    it('rejects packets too far behind the window', () => {
      const tracker = createSequenceTracker(4);
      tracker.accept(0);
      tracker.accept(1);
      tracker.accept(2);
      tracker.accept(3);
      tracker.accept(4);
      // seq 0 is now beyond the window (highWater=4, window=4, cutoff=0)
      expect(tracker.accept(0)).toBe(false);
    });

    it('tracks highWater correctly', () => {
      const tracker = createSequenceTracker();
      expect(tracker.lastAcked()).toBe(-1);
      tracker.accept(5);
      expect(tracker.lastAcked()).toBe(5);
      tracker.accept(3);
      expect(tracker.lastAcked()).toBe(5); // still 5
      tracker.accept(10);
      expect(tracker.lastAcked()).toBe(10);
    });

    it('handles large gaps', () => {
      const tracker = createSequenceTracker(64);
      tracker.accept(0);
      tracker.accept(100);
      expect(tracker.lastAcked()).toBe(100);
      // seq 0 is way behind now
      expect(tracker.accept(0)).toBe(false);
    });
  });

  // ── Latency Estimator ───────────────────────────────────────

  describe('latency estimator', () => {
    it('initializes with first sample', () => {
      const est = createLatencyEstimator();
      est.record(10000n);
      expect(est.estimateUs()).toBe(10000n);
    });

    it('initial jitter is half of first sample', () => {
      const est = createLatencyEstimator();
      est.record(10000n);
      expect(est.jitterUs()).toBe(5000n);
    });

    it('smooths RTT toward new values', () => {
      const est = createLatencyEstimator(0.125);
      est.record(10000n);
      est.record(20000n);
      // EWMA: new = (1-alpha)*10000 + alpha*20000 = 8750 + 2500 = 11250
      const smoothed = est.estimateUs();
      expect(smoothed).toBeGreaterThan(10000n);
      expect(smoothed).toBeLessThan(20000n);
    });

    it('jitter increases with variance', () => {
      const est = createLatencyEstimator(0.125);
      est.record(10000n);
      const jitter1 = est.jitterUs();
      est.record(50000n); // big spike
      const jitter2 = est.jitterUs();
      expect(jitter2).toBeGreaterThan(jitter1);
    });

    it('converges over many stable samples', () => {
      const est = createLatencyEstimator(0.125);
      est.record(10000n);
      for (let i = 0; i < 50; i++) {
        est.record(10000n);
      }
      // After many identical samples, estimate should be very close to 10000
      const diff = est.estimateUs() - 10000n;
      const absDiff = diff < 0n ? -diff : diff;
      expect(absDiff).toBeLessThan(100n);
    });

    it('returns 0n before any samples', () => {
      const est = createLatencyEstimator();
      expect(est.estimateUs()).toBe(0n);
      expect(est.jitterUs()).toBe(0n);
    });
  });
});
