/**
 * Sync Protocol — Unit Tests
 *
 * Covers binary frame encoding/decoding byte-level layout, client input
 * serialisation, delta-compression field masks, sequence tracker dedup
 * and window pruning, and the EWMA latency estimator.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FRAME,
  encodeFrame,
  decodeFrame,
  encodeClientInput,
  decodeClientInput,
  computeDelta,
  createSequenceTracker,
  createLatencyEstimator,
} from '../sync-protocol.js';
import type { SyncFrame, EntitySnapshot, ClientInput, SequenceTracker } from '../sync-protocol.js';

// ── Helpers ───────────────────────────────────────────────────────

function frame(overrides: Partial<SyncFrame> = {}): SyncFrame {
  return {
    frameType: FRAME.HEARTBEAT,
    sequence: 0,
    timestampUs: 0n,
    payload: new Uint8Array(0),
    ...overrides,
  };
}

function snap(overrides: Partial<EntitySnapshot> = {}): EntitySnapshot {
  return {
    entityId: 'e1',
    x: 1,
    y: 2,
    z: 3,
    yaw: 0.5,
    health: 100,
    flags: 0,
    ...overrides,
  };
}

function input(overrides: Partial<ClientInput> = {}): ClientInput {
  return {
    sequence: 1,
    moveX: 0,
    moveY: 0,
    moveZ: 0,
    yaw: 0,
    pitch: 0,
    actions: 0,
    ...overrides,
  };
}

// ── FRAME constant values ─────────────────────────────────────────

describe('FRAME constants', () => {
  it('CLIENT_HELLO is 0x01', () => {
    expect(FRAME.CLIENT_HELLO).toBe(0x01);
  });

  it('SERVER_HELLO is 0x02', () => {
    expect(FRAME.SERVER_HELLO).toBe(0x02);
  });

  it('CLIENT_INPUT is 0x10', () => {
    expect(FRAME.CLIENT_INPUT).toBe(0x10);
  });

  it('SERVER_STATE is 0x11', () => {
    expect(FRAME.SERVER_STATE).toBe(0x11);
  });

  it('SERVER_DELTA is 0x12', () => {
    expect(FRAME.SERVER_DELTA).toBe(0x12);
  });

  it('HEARTBEAT is 0x20', () => {
    expect(FRAME.HEARTBEAT).toBe(0x20);
  });

  it('HEARTBEAT_ACK is 0x21', () => {
    expect(FRAME.HEARTBEAT_ACK).toBe(0x21);
  });

  it('DISCONNECT is 0xf0', () => {
    expect(FRAME.DISCONNECT).toBe(0xf0);
  });

  it('ERROR is 0xff', () => {
    expect(FRAME.ERROR).toBe(0xff);
  });
});

// ── encodeFrame byte-level layout ─────────────────────────────────

describe('encodeFrame', () => {
  it('produces a buffer of HEADER_SIZE(15) bytes for empty payload', () => {
    const buf = encodeFrame(frame());
    expect(buf.byteLength).toBe(15);
  });

  it('produces HEADER_SIZE + payloadLen total bytes', () => {
    const payload = new Uint8Array(8);
    const buf = encodeFrame(frame({ payload }));
    expect(buf.byteLength).toBe(23);
  });

  it('stores frame type at byte 0', () => {
    const buf = encodeFrame(frame({ frameType: FRAME.SERVER_STATE }));
    expect(buf[0]).toBe(FRAME.SERVER_STATE);
  });

  it('stores sequence as little-endian uint32 at bytes 1–4', () => {
    const seq = 0x01020304;
    const buf = encodeFrame(frame({ sequence: seq }));
    const view = new DataView(buf.buffer);
    expect(view.getUint32(1, true)).toBe(seq);
  });

  it('stores timestampUs as little-endian uint64 at bytes 5–12', () => {
    const ts = 0xdeadbeef00n;
    const buf = encodeFrame(frame({ timestampUs: ts }));
    const view = new DataView(buf.buffer);
    expect(view.getBigUint64(5, true)).toBe(ts);
  });

  it('stores payloadLen as little-endian uint16 at bytes 13–14', () => {
    const payload = new Uint8Array(7);
    const buf = encodeFrame(frame({ payload }));
    const view = new DataView(buf.buffer);
    expect(view.getUint16(13, true)).toBe(7);
  });

  it('copies payload starting at byte 15', () => {
    const payload = new Uint8Array([0xaa, 0xbb, 0xcc]);
    const buf = encodeFrame(frame({ payload }));
    expect(buf[15]).toBe(0xaa);
    expect(buf[16]).toBe(0xbb);
    expect(buf[17]).toBe(0xcc);
  });

  it('returns a fresh Uint8Array (not the source payload)', () => {
    const payload = new Uint8Array([1, 2, 3]);
    const buf = encodeFrame(frame({ payload }));
    expect(buf).not.toBe(payload);
  });
});

// ── decodeFrame ───────────────────────────────────────────────────

describe('decodeFrame', () => {
  it('returns undefined for data shorter than 15 bytes', () => {
    expect(decodeFrame(new Uint8Array(14))).toBeUndefined();
  });

  it('returns undefined when payload extends beyond buffer', () => {
    const f = frame({ payload: new Uint8Array(10) });
    const encoded = encodeFrame(f);
    // Chop the last 5 bytes so payload is incomplete
    expect(decodeFrame(encoded.slice(0, encoded.length - 5))).toBeUndefined();
  });

  it('round-trips frameType', () => {
    const enc = encodeFrame(frame({ frameType: FRAME.DISCONNECT }));
    expect(decodeFrame(enc)!.frame.frameType).toBe(FRAME.DISCONNECT);
  });

  it('round-trips sequence 0', () => {
    const enc = encodeFrame(frame({ sequence: 0 }));
    expect(decodeFrame(enc)!.frame.sequence).toBe(0);
  });

  it('round-trips max uint32 sequence', () => {
    const enc = encodeFrame(frame({ sequence: 0xffffffff }));
    expect(decodeFrame(enc)!.frame.sequence).toBe(0xffffffff);
  });

  it('round-trips timestampUs = 0n', () => {
    const enc = encodeFrame(frame({ timestampUs: 0n }));
    expect(decodeFrame(enc)!.frame.timestampUs).toBe(0n);
  });

  it('round-trips large timestampUs', () => {
    const ts = 1_000_000_000_000n;
    const enc = encodeFrame(frame({ timestampUs: ts }));
    expect(decodeFrame(enc)!.frame.timestampUs).toBe(ts);
  });

  it('round-trips non-empty payload bytes', () => {
    const payload = new Uint8Array([10, 20, 30, 40]);
    const enc = encodeFrame(frame({ payload }));
    const result = decodeFrame(enc)!;
    expect(Array.from(result.frame.payload)).toEqual([10, 20, 30, 40]);
  });

  it('reports bytesConsumed = 15 for empty payload', () => {
    const enc = encodeFrame(frame());
    expect(decodeFrame(enc)!.bytesConsumed).toBe(15);
  });

  it('reports bytesConsumed = 15 + payloadLen', () => {
    const payload = new Uint8Array(6);
    const enc = encodeFrame(frame({ payload }));
    expect(decodeFrame(enc)!.bytesConsumed).toBe(21);
  });

  it('decodes correctly from a sub-slice of a larger buffer', () => {
    const f = frame({ frameType: FRAME.SERVER_STATE, sequence: 77 });
    const encoded = encodeFrame(f);
    // Prepend 4 dummy bytes and use a sub-array
    const padded = new Uint8Array(4 + encoded.length);
    padded.set(encoded, 4);
    const slice = padded.subarray(4);
    const result = decodeFrame(slice);
    expect(result!.frame.frameType).toBe(FRAME.SERVER_STATE);
    expect(result!.frame.sequence).toBe(77);
  });
});

// ── encodeClientInput / decodeClientInput ─────────────────────────

describe('encodeClientInput / decodeClientInput', () => {
  it('produces a frame with frameType CLIENT_INPUT', () => {
    const enc = encodeClientInput(input(), 0n);
    const dec = decodeFrame(enc);
    expect(dec!.frame.frameType).toBe(FRAME.CLIENT_INPUT);
  });

  it('encodes payload of exactly 24 bytes', () => {
    const enc = encodeClientInput(input(), 0n);
    const dec = decodeFrame(enc)!;
    expect(dec.frame.payload.byteLength).toBe(24);
  });

  it('preserves sequence number via header', () => {
    const enc = encodeClientInput(input({ sequence: 42 }), 0n);
    const dec = decodeFrame(enc)!;
    expect(dec.frame.sequence).toBe(42);
  });

  it('preserves timestampUs via header', () => {
    const ts = 9_876_543n;
    const enc = encodeClientInput(input(), ts);
    const dec = decodeFrame(enc)!;
    expect(dec.frame.timestampUs).toBe(ts);
  });

  it('round-trips all-zero movements', () => {
    const i = input({ moveX: 0, moveY: 0, moveZ: 0, yaw: 0, pitch: 0 });
    const enc = encodeClientInput(i, 0n);
    const dec = decodeClientInput(decodeFrame(enc)!.frame);
    expect(dec.moveX).toBeCloseTo(0, 5);
    expect(dec.moveY).toBeCloseTo(0, 5);
    expect(dec.moveZ).toBeCloseTo(0, 5);
  });

  it('round-trips positive float movements', () => {
    const i = input({ moveX: 1.0, moveY: 0.5, moveZ: 0.25, yaw: 3.14, pitch: 1.57 });
    const enc = encodeClientInput(i, 0n);
    const dec = decodeClientInput(decodeFrame(enc)!.frame);
    expect(dec.moveX).toBeCloseTo(1.0, 4);
    expect(dec.moveY).toBeCloseTo(0.5, 4);
    expect(dec.moveZ).toBeCloseTo(0.25, 4);
    expect(dec.yaw).toBeCloseTo(3.14, 4);
    expect(dec.pitch).toBeCloseTo(1.57, 4);
  });

  it('round-trips negative float movements', () => {
    const i = input({ moveX: -1.0, moveY: -0.5, moveZ: -0.25 });
    const enc = encodeClientInput(i, 0n);
    const dec = decodeClientInput(decodeFrame(enc)!.frame);
    expect(dec.moveX).toBeCloseTo(-1.0, 4);
    expect(dec.moveY).toBeCloseTo(-0.5, 4);
    expect(dec.moveZ).toBeCloseTo(-0.25, 4);
  });

  it('round-trips actions bitfield with all bits set', () => {
    const i = input({ actions: 0xffffffff });
    const enc = encodeClientInput(i, 0n);
    const dec = decodeClientInput(decodeFrame(enc)!.frame);
    expect(dec.actions).toBe(0xffffffff);
  });

  it('round-trips actions bitfield with sparse bits', () => {
    const i = input({ actions: 0b01010101 });
    const enc = encodeClientInput(i, 0n);
    const dec = decodeClientInput(decodeFrame(enc)!.frame);
    expect(dec.actions).toBe(0b01010101);
  });

  it('decodeClientInput reads sequence from frame.sequence, not payload', () => {
    const i = input({ sequence: 99 });
    const enc = encodeClientInput(i, 0n);
    const dec = decodeClientInput(decodeFrame(enc)!.frame);
    expect(dec.sequence).toBe(99);
  });
});

// ── computeDelta ──────────────────────────────────────────────────

describe('computeDelta', () => {
  it('returns undefined when snapshots are identical objects', () => {
    const s = snap();
    expect(computeDelta(s, s)).toBeUndefined();
  });

  it('returns undefined when all fields are equal (different objects)', () => {
    expect(computeDelta(snap(), snap())).toBeUndefined();
  });

  it('detects x change — changedMask bit 0', () => {
    const delta = computeDelta(snap({ x: 0 }), snap({ x: 5 }));
    expect(delta!.changedMask & 1).toBe(1);
    expect(delta!.values[0]).toBe(5);
  });

  it('detects y change — changedMask bit 1', () => {
    const delta = computeDelta(snap({ y: 0 }), snap({ y: 7 }));
    expect(delta!.changedMask & 2).toBe(2);
    expect(delta!.values[0]).toBe(7);
  });

  it('detects z change — changedMask bit 2', () => {
    const delta = computeDelta(snap({ z: 0 }), snap({ z: 9 }));
    expect(delta!.changedMask & 4).toBe(4);
    expect(delta!.values[0]).toBe(9);
  });

  it('detects yaw change — changedMask bit 3', () => {
    const delta = computeDelta(snap({ yaw: 0 }), snap({ yaw: 1.0 }));
    expect(delta!.changedMask & 8).toBe(8);
  });

  it('detects health change — changedMask bit 4', () => {
    const delta = computeDelta(snap({ health: 100 }), snap({ health: 80 }));
    expect(delta!.changedMask & 16).toBe(16);
    expect(delta!.values[0]).toBe(80);
  });

  it('detects flags change — changedMask bit 5', () => {
    const delta = computeDelta(snap({ flags: 0 }), snap({ flags: 3 }));
    expect(delta!.changedMask & 32).toBe(32);
    expect(delta!.values[0]).toBe(3);
  });

  it('accumulates values in field order (x, y, z, yaw, health, flags)', () => {
    const prev = snap({ x: 0, z: 0, health: 0 });
    const curr = snap({ x: 1, z: 2, health: 3 });
    const delta = computeDelta(prev, curr);
    // x at index 0, z at index 1, health at index 2
    expect(delta!.values[0]).toBe(1); // x
    expect(delta!.values[1]).toBe(2); // z
    expect(delta!.values[2]).toBe(3); // health
  });

  it('changedMask is correct for all-6-fields change (0b111111 = 63)', () => {
    const prev = snap({ x: 0, y: 0, z: 0, yaw: 0, health: 0, flags: 0 });
    const curr = snap({ x: 1, y: 2, z: 3, yaw: 4, health: 5, flags: 6 });
    const delta = computeDelta(prev, curr);
    expect(delta!.changedMask).toBe(0b111111);
    expect(delta!.values.length).toBe(6);
  });

  it('preserves entityId from curr snapshot', () => {
    const prev = snap({ entityId: 'hero' });
    const curr = snap({ entityId: 'hero', x: 99 });
    expect(computeDelta(prev, curr)!.entityId).toBe('hero');
  });

  it('does not include unchanged field values in values array', () => {
    // Only y changes
    const delta = computeDelta(snap({ y: 0 }), snap({ y: 5 }));
    expect(delta!.values.length).toBe(1);
    expect(delta!.values[0]).toBe(5);
  });
});

// ── createSequenceTracker ─────────────────────────────────────────

describe('createSequenceTracker', () => {
  let tracker: SequenceTracker;

  beforeEach(() => {
    tracker = createSequenceTracker(8);
  });

  it('lastAcked() starts at -1', () => {
    expect(tracker.lastAcked()).toBe(-1);
  });

  it('accepts the first packet (seq 0)', () => {
    expect(tracker.accept(0)).toBe(true);
  });

  it('advances lastAcked to the highest accepted sequence', () => {
    tracker.accept(3);
    tracker.accept(7);
    expect(tracker.lastAcked()).toBe(7);
  });

  it('rejects a duplicate sequence', () => {
    tracker.accept(5);
    expect(tracker.accept(5)).toBe(false);
  });

  it('lastAcked does not decrease for out-of-order older seq', () => {
    tracker.accept(10);
    tracker.accept(8);
    expect(tracker.lastAcked()).toBe(10);
  });

  it('accepts out-of-order packet still within window', () => {
    tracker.accept(0);
    tracker.accept(7);
    expect(tracker.accept(4)).toBe(true);
  });

  it('rejects packet older than windowSize behind highWater', () => {
    for (let i = 0; i < 9; i++) tracker.accept(i);
    // highWater=8, windowSize=8 → cutoff=0; seq 0 is at the boundary
    expect(tracker.accept(0)).toBe(false);
  });

  it('does not reject packet exactly at the window edge', () => {
    // windowSize=8; accept 0..7 → highWater=7, cutoff = 7-8 = -1
    for (let i = 0; i < 7; i++) tracker.accept(i);
    // seq 0 cutoff = 7-8 = -1, so 0 > -1 → still in window but already seen
    tracker.accept(7);
    // Accept a new seq 8 → highWater=8, cutoff=0 — seq 0 is now == cutoff
    tracker.accept(8);
    expect(tracker.accept(0)).toBe(false); // duplicate
  });

  it('accepts a brand-new higher sequence after gap', () => {
    tracker.accept(0);
    expect(tracker.accept(100)).toBe(true);
    expect(tracker.lastAcked()).toBe(100);
  });

  it('default windowSize of 64 still works', () => {
    const t = createSequenceTracker(); // default 64
    expect(t.accept(0)).toBe(true);
    expect(t.accept(63)).toBe(true);
    expect(t.lastAcked()).toBe(63);
  });

  it('prunes old entries so they are not counted as duplicates after window advance', () => {
    // windowSize=4; advance highWater far enough to prune seq 0
    const t = createSequenceTracker(4);
    t.accept(0);
    t.accept(1);
    t.accept(2);
    t.accept(3);
    t.accept(4); // highWater=4, cutoff=0; seq 0 pruned
    // seq 0 is now out of window — should be rejected as too old
    expect(t.accept(0)).toBe(false);
  });
});

// ── createLatencyEstimator ────────────────────────────────────────

describe('createLatencyEstimator', () => {
  it('estimateUs() returns 0n before any samples', () => {
    const est = createLatencyEstimator();
    expect(est.estimateUs()).toBe(0n);
  });

  it('jitterUs() returns 0n before any samples', () => {
    const est = createLatencyEstimator();
    expect(est.jitterUs()).toBe(0n);
  });

  it('after first sample, estimateUs equals that sample', () => {
    const est = createLatencyEstimator();
    est.record(20_000n);
    expect(est.estimateUs()).toBe(20_000n);
  });

  it('after first sample, jitterUs is sample / 2', () => {
    const est = createLatencyEstimator();
    est.record(20_000n);
    expect(est.jitterUs()).toBe(10_000n);
  });

  it('smoothedRtt is between old and new value after second sample', () => {
    const est = createLatencyEstimator(0.125);
    est.record(10_000n);
    est.record(20_000n);
    const s = est.estimateUs();
    expect(s).toBeGreaterThan(10_000n);
    expect(s).toBeLessThan(20_000n);
  });

  it('jitter increases after high-variance sample', () => {
    const est = createLatencyEstimator(0.125);
    est.record(10_000n);
    const j1 = est.jitterUs();
    est.record(100_000n);
    expect(est.jitterUs()).toBeGreaterThan(j1);
  });

  it('converges to stable value after many identical samples', () => {
    const est = createLatencyEstimator(0.5);
    est.record(10_000n);
    for (let i = 0; i < 30; i++) est.record(10_000n);
    const diff = est.estimateUs() - 10_000n;
    expect(diff < 0n ? -diff : diff).toBeLessThan(10n);
  });

  it('custom alpha=0.5 converges faster than alpha=0.125', () => {
    const slow = createLatencyEstimator(0.125);
    const fast = createLatencyEstimator(0.5);
    slow.record(0n);
    fast.record(0n);
    slow.record(10_000n);
    fast.record(10_000n);
    // With alpha=0.5, new estimate is 5000; with alpha=0.125, it's 1250
    expect(fast.estimateUs()).toBeGreaterThan(slow.estimateUs());
  });

  it('handles very large RTT samples without overflow error', () => {
    const est = createLatencyEstimator();
    expect(() => est.record(1_000_000_000_000n)).not.toThrow();
    expect(est.estimateUs()).toBe(1_000_000_000_000n);
  });

  it('handles zero RTT sample', () => {
    const est = createLatencyEstimator();
    est.record(0n);
    expect(est.estimateUs()).toBe(0n);
    expect(est.jitterUs()).toBe(0n);
  });
});
