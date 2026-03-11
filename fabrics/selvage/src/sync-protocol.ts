/**
 * Client-Server Sync Protocol — Binary WebSocket frame protocol
 * for real-time state synchronization between Loom and game clients.
 *
 * Features:
 *   - Sequence-numbered frames for ordering / dedup
 *   - Delta compression (only changed fields sent)
 *   - Server-authoritative: client sends inputs, server sends state
 *   - Latency compensation via client-side prediction acknowledgment
 *
 * Wire format (all little-endian):
 *   [1B frameType] [4B sequence] [8B timestampUs] [2B payloadLen] [NB payload]
 *
 * Thread: steel/selvage/sync-protocol
 * Tier: 1
 */

// ─── Frame Types ────────────────────────────────────────────────

export const FRAME = {
  CLIENT_HELLO: 0x01,
  SERVER_HELLO: 0x02,
  CLIENT_INPUT: 0x10,
  SERVER_STATE: 0x11,
  SERVER_DELTA: 0x12,
  HEARTBEAT: 0x20,
  HEARTBEAT_ACK: 0x21,
  DISCONNECT: 0xf0,
  ERROR: 0xff,
} as const;

export type FrameType = (typeof FRAME)[keyof typeof FRAME];

// ─── Typed Frame ────────────────────────────────────────────────

export interface SyncFrame {
  readonly frameType: FrameType;
  readonly sequence: number;
  readonly timestampUs: bigint;
  readonly payload: Uint8Array;
}

// ─── Header constants ───────────────────────────────────────────

const HEADER_SIZE = 15; // 1 + 4 + 8 + 2

// ─── Encoder ────────────────────────────────────────────────────

export function encodeFrame(frame: SyncFrame): Uint8Array {
  const buf = new ArrayBuffer(HEADER_SIZE + frame.payload.length);
  const view = new DataView(buf);

  view.setUint8(0, frame.frameType);
  view.setUint32(1, frame.sequence, true);
  view.setBigUint64(5, frame.timestampUs, true);
  view.setUint16(13, frame.payload.length, true);

  const out = new Uint8Array(buf);
  out.set(frame.payload, HEADER_SIZE);
  return out;
}

// ─── Decoder ────────────────────────────────────────────────────

export interface DecodeResult {
  readonly frame: SyncFrame;
  readonly bytesConsumed: number;
}

export function decodeFrame(data: Uint8Array): DecodeResult | undefined {
  if (data.length < HEADER_SIZE) return undefined;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const frameType = view.getUint8(0) as FrameType;
  const sequence = view.getUint32(1, true);
  const timestampUs = view.getBigUint64(5, true);
  const payloadLen = view.getUint16(13, true);

  if (data.length < HEADER_SIZE + payloadLen) return undefined;

  const payload = data.slice(HEADER_SIZE, HEADER_SIZE + payloadLen);
  return {
    frame: { frameType, sequence, timestampUs, payload },
    bytesConsumed: HEADER_SIZE + payloadLen,
  };
}

// ─── Client Input Frame ─────────────────────────────────────────

export interface ClientInput {
  readonly sequence: number;
  readonly moveX: number;
  readonly moveY: number;
  readonly moveZ: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly actions: number; // bitfield for jump/interact/attack etc.
}

export function encodeClientInput(input: ClientInput, timestampUs: bigint): Uint8Array {
  const payload = new ArrayBuffer(24); // 6 floats × 4 bytes
  const view = new DataView(payload);
  view.setFloat32(0, input.moveX, true);
  view.setFloat32(4, input.moveY, true);
  view.setFloat32(8, input.moveZ, true);
  view.setFloat32(12, input.yaw, true);
  view.setFloat32(16, input.pitch, true);
  view.setUint32(20, input.actions, true);

  return encodeFrame({
    frameType: FRAME.CLIENT_INPUT,
    sequence: input.sequence,
    timestampUs,
    payload: new Uint8Array(payload),
  });
}

export function decodeClientInput(frame: SyncFrame): ClientInput {
  const view = new DataView(
    frame.payload.buffer,
    frame.payload.byteOffset,
    frame.payload.byteLength,
  );
  return {
    sequence: frame.sequence,
    moveX: view.getFloat32(0, true),
    moveY: view.getFloat32(4, true),
    moveZ: view.getFloat32(8, true),
    yaw: view.getFloat32(12, true),
    pitch: view.getFloat32(16, true),
    actions: view.getUint32(20, true),
  };
}

// ─── Server State Snapshot ──────────────────────────────────────

export interface EntitySnapshot {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly health: number;
  readonly flags: number;
}

// ─── Delta Compression ──────────────────────────────────────────

export interface EntityDelta {
  readonly entityId: string;
  readonly changedMask: number; // bit 0=x, 1=y, 2=z, 3=yaw, 4=health, 5=flags
  readonly values: ReadonlyArray<number>;
}

export function computeDelta(prev: EntitySnapshot, curr: EntitySnapshot): EntityDelta | undefined {
  let mask = 0;
  const values: number[] = [];

  if (prev.x !== curr.x) { mask |= 1; values.push(curr.x); }
  if (prev.y !== curr.y) { mask |= 2; values.push(curr.y); }
  if (prev.z !== curr.z) { mask |= 4; values.push(curr.z); }
  if (prev.yaw !== curr.yaw) { mask |= 8; values.push(curr.yaw); }
  if (prev.health !== curr.health) { mask |= 16; values.push(curr.health); }
  if (prev.flags !== curr.flags) { mask |= 32; values.push(curr.flags); }

  if (mask === 0) return undefined;

  return { entityId: curr.entityId, changedMask: mask, values };
}

// ─── Sequence Tracker (dedup + ordering) ────────────────────────

export interface SequenceTracker {
  readonly accept: (seq: number) => boolean;
  readonly lastAcked: () => number;
}

export function createSequenceTracker(windowSize: number = 64): SequenceTracker {
  let highWater = -1;
  const seen = new Set<number>();

  return {
    accept(seq) {
      if (seq <= highWater - windowSize) return false; // too old
      if (seen.has(seq)) return false; // duplicate
      seen.add(seq);
      if (seq > highWater) highWater = seq;

      // Prune the window
      for (const s of seen) {
        if (s <= highWater - windowSize) seen.delete(s);
      }

      return true;
    },
    lastAcked: () => highWater,
  };
}

// ─── Latency Estimator (EWMA) ──────────────────────────────────

export interface LatencyEstimator {
  readonly record: (rttUs: bigint) => void;
  readonly estimateUs: () => bigint;
  readonly jitterUs: () => bigint;
}

export function createLatencyEstimator(alpha: number = 0.125): LatencyEstimator {
  let smoothedRtt = 0n;
  let rttVariance = 0n;
  let initialized = false;

  return {
    record(rttUs) {
      if (!initialized) {
        smoothedRtt = rttUs;
        rttVariance = rttUs / 2n;
        initialized = true;
        return;
      }
      const diff = rttUs > smoothedRtt ? rttUs - smoothedRtt : smoothedRtt - rttUs;
      const alphaBig = BigInt(Math.round(alpha * 1000));
      rttVariance = ((1000n - alphaBig) * rttVariance + alphaBig * diff) / 1000n;
      smoothedRtt = ((1000n - alphaBig) * smoothedRtt + alphaBig * rttUs) / 1000n;
    },
    estimateUs: () => smoothedRtt,
    jitterUs: () => rttVariance,
  };
}
