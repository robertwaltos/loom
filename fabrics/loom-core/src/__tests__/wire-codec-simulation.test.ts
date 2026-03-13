import { describe, expect, it } from 'vitest';
import { createJsonPayloadCodec, createMessageFactory } from '../wire-codec.js';
import type { StateSnapshotPayload, VisualEntityPayload } from '@loom/protocols-contracts';

describe('wire-codec simulation', () => {
  it('simulates state snapshot serialization and deterministic header sequencing', () => {
    let now = 1_000;
    let corr = 0;
    const factory = createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => 'corr-' + String(corr++) },
    });

    const state: VisualEntityPayload = {
      entityId: 'ent-1',
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
      meshContentHash: 'abc',
      meshAssetName: 'SM_Test',
      animClipName: 'Idle',
      animNormalizedTime: 0,
      animBlendWeight: 1,
      animPlaybackRate: 1,
      visibility: true,
      renderPriority: 50,
    };

    const payload: StateSnapshotPayload = {
      worldId: 'earth',
      tickNumber: 7,
      entityCount: 1,
      states: [state],
    };

    const m1 = factory.create('state-snapshot', payload);
    const m2 = factory.createWithCorrelation('state-snapshot', payload, 'manual-corr');
    const parsed = factory.parse(m1);

    expect(m1.header.sequenceNumber).toBe(0);
    expect(m2.header.sequenceNumber).toBe(1);
    expect(m2.header.correlationId).toBe('manual-corr');
    expect(parsed.type).toBe('state-snapshot');
    expect((parsed.payload as StateSnapshotPayload).entityCount).toBe(1);
  });
});
