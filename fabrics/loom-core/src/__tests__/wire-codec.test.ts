/**
 * WireCodec — JSON codec and MessageFactory tests.
 */

import { describe, it, expect } from 'vitest';
import { createJsonPayloadCodec, createMessageFactory } from '../wire-codec.js';
import type {
  StateSnapshotPayload,
  EntitySpawnPayload,
  PlayerInputPayload,
  HealthCheckPayload,
  HealthResponsePayload,
  WeaveBeginPayload,
  VisualEntityPayload,
} from '@loom/protocols-contracts';

function visualEntity(): VisualEntityPayload {
  return {
    entityId: 'ent-1',
    position: [1, 2, 3],
    rotation: [0, 0, 0, 1],
    scale: [1, 1, 1],
    meshContentHash: 'abc123',
    meshAssetName: 'HumanMale',
    animClipName: 'Idle_Breathe',
    animNormalizedTime: 0,
    animBlendWeight: 1,
    animPlaybackRate: 1,
    visibility: true,
    renderPriority: 50,
  };
}

describe('JsonPayloadCodec', () => {
  it('round-trips an object through encode/decode', () => {
    const codec = createJsonPayloadCodec();
    const original = { hello: 'world', n: 42 };
    const bytes = codec.encode(original);
    const result = codec.decode(bytes);
    expect(result).toEqual(original);
  });

  it('produces Uint8Array from encode', () => {
    const codec = createJsonPayloadCodec();
    const bytes = codec.encode({ a: 1 });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('has name "json"', () => {
    const codec = createJsonPayloadCodec();
    expect(codec.name).toBe('json');
  });

  it('handles nested arrays and null values', () => {
    const codec = createJsonPayloadCodec();
    const data = { position: [1, 2, 3], mesh: null };
    expect(codec.decode(codec.encode(data))).toEqual(data);
  });
});

describe('MessageFactory — create', () => {
  function factory() {
    let time = 1000;
    let id = 0;
    return createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock: { nowMicroseconds: () => time++ },
      idGenerator: { next: () => 'corr-' + String(id++) },
    });
  }

  it('creates a state-snapshot message', () => {
    const f = factory();
    const payload: StateSnapshotPayload = {
      worldId: 'world-1',
      tickNumber: 1,
      entityCount: 1,
      states: [visualEntity()],
    };
    const msg = f.create('state-snapshot', payload);
    expect(msg.header.type).toBe('state-snapshot');
    expect(msg.header.sequenceNumber).toBe(0);
    expect(msg.header.schemaVersion).toBe(1);
    expect(msg.payload.byteLength).toBeGreaterThan(0);
  });

  it('increments sequence numbers', () => {
    const f = factory();
    const payload: HealthCheckPayload = { probeId: 'p1', sentAt: 1000 };
    const m1 = f.create('health-check', payload);
    const m2 = f.create('health-check', payload);
    expect(m1.header.sequenceNumber).toBe(0);
    expect(m2.header.sequenceNumber).toBe(1);
  });

  it('sets payload size correctly', () => {
    const f = factory();
    const payload: HealthCheckPayload = { probeId: 'p1', sentAt: 1000 };
    const msg = f.create('health-check', payload);
    expect(msg.header.payloadSize).toBe(msg.payload.byteLength);
  });

  it('generates correlation IDs automatically', () => {
    const f = factory();
    const payload: HealthCheckPayload = { probeId: 'p1', sentAt: 1000 };
    const m1 = f.create('health-check', payload);
    const m2 = f.create('health-check', payload);
    expect(m1.header.correlationId).toBe('corr-0');
    expect(m2.header.correlationId).toBe('corr-1');
  });
});

describe('MessageFactory — createWithCorrelation', () => {
  function factory() {
    return createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock: { nowMicroseconds: () => 5000 },
      idGenerator: { next: () => 'unused' },
    });
  }

  it('uses the provided correlation ID', () => {
    const f = factory();
    const payload: HealthCheckPayload = { probeId: 'p1', sentAt: 5000 };
    const msg = f.createWithCorrelation('health-check', payload, 'trace-abc');
    expect(msg.header.correlationId).toBe('trace-abc');
  });
});

describe('MessageFactory — parse core types', () => {
  function factory() {
    return createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock: { nowMicroseconds: () => 1000 },
      idGenerator: { next: () => 'corr-x' },
    });
  }

  it('round-trips a state snapshot', () => {
    const f = factory();
    const payload: StateSnapshotPayload = {
      worldId: 'w1',
      tickNumber: 10,
      entityCount: 1,
      states: [visualEntity()],
    };
    const msg = f.create('state-snapshot', payload);
    const parsed = f.parse(msg);
    expect(parsed.type).toBe('state-snapshot');
    expect(parsed.payload).toEqual(payload);
  });

  it('round-trips an entity spawn', () => {
    const f = factory();
    const payload: EntitySpawnPayload = {
      entityId: 'ent-1',
      worldId: 'w1',
      entityType: 'npc',
      initialState: visualEntity(),
    };
    const msg = f.create('entity-spawn', payload);
    const parsed = f.parse(msg);
    expect(parsed.payload).toEqual(payload);
  });

  it('round-trips player input', () => {
    const f = factory();
    const payload: PlayerInputPayload = {
      entityId: 'player-1',
      sequenceNumber: 7,
      moveDirection: [0, 0, 1],
      lookDirection: [0, 0, -1],
      actions: ['sprint'],
    };
    const msg = f.create('player-input', payload);
    const parsed = f.parse(msg);
    expect(parsed.payload).toEqual(payload);
  });
});

describe('MessageFactory — parse transitions and health', () => {
  function factory() {
    return createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock: { nowMicroseconds: () => 1000 },
      idGenerator: { next: () => 'corr-x' },
    });
  }

  it('round-trips weave begin', () => {
    const f = factory();
    const payload: WeaveBeginPayload = {
      sourceWorldId: 'earth',
      destinationWorldId: 'mars',
      durationSeconds: 5,
      blendCurve: 'ease-in-out',
      fallbackStrategy: 'volumetric-fog',
    };
    const msg = f.create('weave-begin', payload);
    const parsed = f.parse(msg);
    expect(parsed.payload).toEqual(payload);
  });

  it('round-trips health response', () => {
    const f = factory();
    const payload: HealthResponsePayload = {
      probeId: 'probe-1',
      healthy: true,
      currentFps: 60,
      frameTimeMs: 16.6,
      visibleEntities: 200,
      memoryUsageMb: 4096,
      gpuUsagePercent: 72,
    };
    const msg = f.create('health-response', payload);
    const parsed = f.parse(msg);
    expect(parsed.payload).toEqual(payload);
  });

  it('preserves header fields through parse', () => {
    const f = factory();
    const payload: HealthCheckPayload = { probeId: 'p1', sentAt: 1000 };
    const msg = f.create('health-check', payload);
    const parsed = f.parse(msg);
    expect(parsed.header.type).toBe('health-check');
    expect(parsed.header.sequenceNumber).toBe(0);
    expect(parsed.header.schemaVersion).toBe(1);
  });
});
