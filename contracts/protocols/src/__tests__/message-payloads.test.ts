/**
 * MessagePayloads — Type-level validation of payload structures.
 */

import { describe, it, expect } from 'vitest';
import type {
  VisualEntityPayload,
  StateSnapshotPayload,
  EntitySpawnPayload,
  EntityDespawnPayload,
  PlayerInputPayload,
  PhysicsEventPayload,
  WeaveBeginPayload,
  WeaveUpdatePayload,
  WeaveCompletePayload,
  WeaveAbortPayload,
  CapabilityNegotiatePayload,
  HealthCheckPayload,
  HealthResponsePayload,
  MessagePayloadMap,
} from '../message-payloads.js';

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

describe('VisualEntityPayload', () => {
  it('encodes position as 3-tuple', () => {
    const e = visualEntity();
    expect(e.position).toHaveLength(3);
  });

  it('encodes rotation as 4-tuple quaternion', () => {
    const e = visualEntity();
    expect(e.rotation).toHaveLength(4);
  });

  it('supports null mesh for invisible entities', () => {
    const e: VisualEntityPayload = { ...visualEntity(), meshContentHash: null, meshAssetName: null };
    expect(e.meshContentHash).toBeNull();
  });

  it('supports null animation for static entities', () => {
    const e: VisualEntityPayload = { ...visualEntity(), animClipName: null };
    expect(e.animClipName).toBeNull();
  });
});

describe('StateSnapshotPayload', () => {
  it('packs multiple entity states', () => {
    const snap: StateSnapshotPayload = {
      worldId: 'world-1',
      tickNumber: 42,
      entityCount: 2,
      states: [visualEntity(), { ...visualEntity(), entityId: 'ent-2' }],
    };
    expect(snap.states).toHaveLength(2);
    expect(snap.entityCount).toBe(2);
  });
});

describe('EntitySpawnPayload', () => {
  it('includes entity type and initial state', () => {
    const spawn: EntitySpawnPayload = {
      entityId: 'ent-1',
      worldId: 'world-1',
      entityType: 'player',
      initialState: visualEntity(),
    };
    expect(spawn.entityType).toBe('player');
    expect(spawn.initialState.entityId).toBe('ent-1');
  });
});

describe('EntityDespawnPayload', () => {
  it('includes reason for despawn', () => {
    const despawn: EntityDespawnPayload = {
      entityId: 'ent-1',
      worldId: 'world-1',
      reason: 'disconnected',
    };
    expect(despawn.reason).toBe('disconnected');
  });
});

describe('PlayerInputPayload', () => {
  it('encodes directions as 3-tuples', () => {
    const input: PlayerInputPayload = {
      entityId: 'player-1',
      sequenceNumber: 7,
      moveDirection: [0, 0, 1],
      lookDirection: [0, 0, -1],
      actions: ['sprint', 'interact'],
    };
    expect(input.moveDirection).toHaveLength(3);
    expect(input.actions).toHaveLength(2);
  });
});

describe('PhysicsEventPayload', () => {
  it('supports null other entity for world collisions', () => {
    const evt: PhysicsEventPayload = {
      entityId: 'ent-1',
      eventType: 'collision',
      position: [10, 0, 5],
      normal: [0, 1, 0],
      impulse: 42.5,
      otherEntityId: null,
    };
    expect(evt.otherEntityId).toBeNull();
  });
});

describe('WeaveTransitionPayloads', () => {
  it('encodes begin with blend curve', () => {
    const begin: WeaveBeginPayload = {
      sourceWorldId: 'earth',
      destinationWorldId: 'mars',
      durationSeconds: 5,
      blendCurve: 'ease-in-out',
      fallbackStrategy: 'volumetric-fog',
    };
    expect(begin.durationSeconds).toBe(5);
  });

  it('encodes update with blend factor', () => {
    const update: WeaveUpdatePayload = {
      blendFactor: 0.5,
      sourceWorldId: 'earth',
      destinationWorldId: 'mars',
    };
    expect(update.blendFactor).toBe(0.5);
  });

  it('encodes complete with actual duration', () => {
    const complete: WeaveCompletePayload = {
      sourceWorldId: 'earth',
      destinationWorldId: 'mars',
      actualDurationSeconds: 5.2,
    };
    expect(complete.actualDurationSeconds).toBe(5.2);
  });

  it('encodes abort with reason', () => {
    const abort: WeaveAbortPayload = {
      sourceWorldId: 'earth',
      destinationWorldId: 'mars',
      reason: 'fps-floor-breach',
    };
    expect(abort.reason).toBe('fps-floor-breach');
  });
});

describe('CapabilityNegotiatePayload', () => {
  it('describes fabric capabilities', () => {
    const cap: CapabilityNegotiatePayload = {
      fabricId: 'ue5-dev-01',
      fabricName: 'UE5.5',
      currentTier: 'high',
      maxVisibleEntities: 5000,
      preferredStateUpdateRate: 30,
      supportsWeaveZoneOverlap: true,
      supportsPixelStreaming: false,
    };
    expect(cap.maxVisibleEntities).toBe(5000);
  });
});

describe('HealthPayloads', () => {
  it('encodes health check probe', () => {
    const check: HealthCheckPayload = { probeId: 'probe-1', sentAt: 1000 };
    expect(check.probeId).toBe('probe-1');
  });

  it('encodes health response metrics', () => {
    const resp: HealthResponsePayload = {
      probeId: 'probe-1',
      healthy: true,
      currentFps: 60,
      frameTimeMs: 16.6,
      visibleEntities: 200,
      memoryUsageMb: 4096,
      gpuUsagePercent: 72,
    };
    expect(resp.healthy).toBe(true);
    expect(resp.currentFps).toBe(60);
  });
});

describe('MessagePayloadMap', () => {
  it('maps all 12 message types', () => {
    const keys: ReadonlyArray<keyof MessagePayloadMap> = [
      'state-snapshot', 'entity-spawn', 'entity-despawn',
      'player-input', 'physics-event',
      'weave-begin', 'weave-update', 'weave-complete', 'weave-abort',
      'capability-negotiate', 'health-check', 'health-response',
    ];
    expect(keys).toHaveLength(12);
  });
});
