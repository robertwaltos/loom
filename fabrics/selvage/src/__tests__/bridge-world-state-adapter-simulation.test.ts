import { describe, it, expect, vi } from 'vitest';
import {
  createBridgeWorldStateAdapter,
  createWorldStateProvider,
} from '../bridge-world-state-adapter.js';
import type { BridgeWorldStateAdapter } from '../bridge-world-state-adapter.js';
import type { ServerStreamMessage } from '../bridge-grpc-server.js';

// ── Helpers ───────────────────────────────────────────────────────

function makeClock(startUs = 1_000_000) {
  let t = startUs;
  return { nowMicroseconds: vi.fn(() => t++) };
}

/** Minimal BridgeVisualUpdate for testing */
function makeVisualUpdate(entityId: string, seq = 0) {
  return {
    entityId,
    timestamp: 1_000,
    sequenceNumber: seq,
    delta: {
      entityId,
      transform: {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      visibility: true,
      renderPriority: 0,
    },
  };
}

function makeStreamMessage(type: ServerStreamMessage['type'], seq: number): ServerStreamMessage {
  return {
    type,
    sequenceNumber: seq,
    timestamp: 999_000,
    payload: new Uint8Array([1, 2, 3]),
  };
}

function makeAdapter(): BridgeWorldStateAdapter {
  return createBridgeWorldStateAdapter({ clock: makeClock() });
}

// ── Tests ─────────────────────────────────────────────────────────

describe('bridge-world-state-adapter simulation', () => {
  // ── createWorldStateProvider() ────────────────────────────────

  describe('createWorldStateProvider()', () => {
    it('returns a provider with all required methods', () => {
      const provider = createWorldStateProvider();
      expect(typeof provider.getEntitySnapshots).toBe('function');
      expect(typeof provider.getSpawnQueue).toBe('function');
      expect(typeof provider.getDespawnQueue).toBe('function');
      expect(typeof provider.getTimeWeather).toBe('function');
      expect(typeof provider.getFacialPoseUpdates).toBe('function');
      expect(typeof provider.clearQueues).toBe('function');
    });

    it('all queues start empty', () => {
      const provider = createWorldStateProvider();
      expect(provider.getEntitySnapshots()).toHaveLength(0);
      expect(provider.getSpawnQueue()).toHaveLength(0);
      expect(provider.getDespawnQueue()).toHaveLength(0);
      expect(provider.getFacialPoseUpdates()).toHaveLength(0);
      expect(provider.getTimeWeather()).toBeUndefined();
    });
  });

  // ── createBridgeWorldStateAdapter() ──────────────────────────

  describe('createBridgeWorldStateAdapter()', () => {
    it('returns an adapter with provider and all event methods', () => {
      const adapter = makeAdapter();
      expect(adapter.provider).toBeDefined();
      expect(typeof adapter.onStatePush).toBe('function');
      expect(typeof adapter.onEntitySpawn).toBe('function');
      expect(typeof adapter.onEntityDespawn).toBe('function');
      expect(typeof adapter.onTimeWeatherUpdate).toBe('function');
      expect(typeof adapter.onFacialPoseUpdate).toBe('function');
    });

    it('provider queues start empty', () => {
      const adapter = makeAdapter();
      expect(adapter.provider.getEntitySnapshots()).toHaveLength(0);
      expect(adapter.provider.getSpawnQueue()).toHaveLength(0);
      expect(adapter.provider.getDespawnQueue()).toHaveLength(0);
    });
  });

  // ── onEntitySpawn() ───────────────────────────────────────────

  describe('onEntitySpawn()', () => {
    it('adds one message to the spawn queue', () => {
      const adapter = makeAdapter();
      adapter.onEntitySpawn('e-001', makeVisualUpdate('e-001'));
      expect(adapter.provider.getSpawnQueue()).toHaveLength(1);
    });

    it('the message has type entity-spawn', () => {
      const adapter = makeAdapter();
      adapter.onEntitySpawn('e-001', makeVisualUpdate('e-001'));
      expect(adapter.provider.getSpawnQueue()[0]!.type).toBe('entity-spawn');
    });

    it('payload is a non-empty Uint8Array', () => {
      const adapter = makeAdapter();
      adapter.onEntitySpawn('e-001', makeVisualUpdate('e-001'));
      const msg = adapter.provider.getSpawnQueue()[0]!;
      expect(msg.payload).toBeInstanceOf(Uint8Array);
      expect(msg.payload.length).toBeGreaterThan(0);
    });

    it('multiple spawns accumulate in the queue', () => {
      const adapter = makeAdapter();
      adapter.onEntitySpawn('e-001', makeVisualUpdate('e-001'));
      adapter.onEntitySpawn('e-002', makeVisualUpdate('e-002'));
      adapter.onEntitySpawn('e-003', makeVisualUpdate('e-003'));
      expect(adapter.provider.getSpawnQueue()).toHaveLength(3);
    });
  });

  // ── onEntityDespawn() ─────────────────────────────────────────

  describe('onEntityDespawn()', () => {
    it('adds one message to the despawn queue', () => {
      const adapter = makeAdapter();
      adapter.onEntityDespawn('e-001');
      expect(adapter.provider.getDespawnQueue()).toHaveLength(1);
    });

    it('the message has type entity-despawn', () => {
      const adapter = makeAdapter();
      adapter.onEntityDespawn('e-001');
      expect(adapter.provider.getDespawnQueue()[0]!.type).toBe('entity-despawn');
    });

    it('multiple despawns accumulate in the queue', () => {
      const adapter = makeAdapter();
      adapter.onEntityDespawn('e-001');
      adapter.onEntityDespawn('e-002');
      expect(adapter.provider.getDespawnQueue()).toHaveLength(2);
    });
  });

  // ── onStatePush() ─────────────────────────────────────────────

  describe('onStatePush()', () => {
    it('adds one snapshot per visual update to the snapshot buffer', () => {
      const adapter = makeAdapter();
      adapter.onStatePush([
        makeVisualUpdate('e-001', 0),
        makeVisualUpdate('e-002', 1),
        makeVisualUpdate('e-003', 2),
      ]);
      expect(adapter.provider.getEntitySnapshots()).toHaveLength(3);
    });

    it('each snapshot has type entity-snapshot', () => {
      const adapter = makeAdapter();
      adapter.onStatePush([makeVisualUpdate('e-001')]);
      expect(adapter.provider.getEntitySnapshots()[0]!.type).toBe('entity-snapshot');
    });

    it('empty push leaves snapshot buffer unchanged', () => {
      const adapter = makeAdapter();
      adapter.onStatePush([]);
      expect(adapter.provider.getEntitySnapshots()).toHaveLength(0);
    });
  });

  // ── onTimeWeatherUpdate() ─────────────────────────────────────

  describe('onTimeWeatherUpdate()', () => {
    it('stores the message as the current time/weather state', () => {
      const adapter = makeAdapter();
      const msg = makeStreamMessage('time-weather', 10);
      adapter.onTimeWeatherUpdate(msg);
      expect(adapter.provider.getTimeWeather()).toBe(msg);
    });

    it('overrides a previous time/weather message', () => {
      const adapter = makeAdapter();
      const first = makeStreamMessage('time-weather', 1);
      const second = makeStreamMessage('time-weather', 2);
      adapter.onTimeWeatherUpdate(first);
      adapter.onTimeWeatherUpdate(second);
      expect(adapter.provider.getTimeWeather()).toBe(second);
    });
  });

  // ── onFacialPoseUpdate() ──────────────────────────────────────

  describe('onFacialPoseUpdate()', () => {
    it('appends to the facial pose list', () => {
      const adapter = makeAdapter();
      adapter.onFacialPoseUpdate(makeStreamMessage('facial-pose', 5));
      adapter.onFacialPoseUpdate(makeStreamMessage('facial-pose', 6));
      expect(adapter.provider.getFacialPoseUpdates()).toHaveLength(2);
    });

    it('stored message matches what was pushed', () => {
      const adapter = makeAdapter();
      const msg = makeStreamMessage('facial-pose', 99);
      adapter.onFacialPoseUpdate(msg);
      expect(adapter.provider.getFacialPoseUpdates()[0]).toBe(msg);
    });
  });

  // ── clearQueues() ─────────────────────────────────────────────

  describe('clearQueues()', () => {
    it('empties spawn, despawn, snapshot, facial-pose queues and time/weather', () => {
      const adapter = makeAdapter();
      adapter.onEntitySpawn('e-001', makeVisualUpdate('e-001'));
      adapter.onEntityDespawn('e-002');
      adapter.onStatePush([makeVisualUpdate('e-003')]);
      adapter.onFacialPoseUpdate(makeStreamMessage('facial-pose', 1));
      adapter.onTimeWeatherUpdate(makeStreamMessage('time-weather', 2));

      adapter.provider.clearQueues();

      expect(adapter.provider.getSpawnQueue()).toHaveLength(0);
      expect(adapter.provider.getDespawnQueue()).toHaveLength(0);
      expect(adapter.provider.getEntitySnapshots()).toHaveLength(0);
      expect(adapter.provider.getFacialPoseUpdates()).toHaveLength(0);
      expect(adapter.provider.getTimeWeather()).toBeUndefined();
    });

    it('allows accumulation again after clear', () => {
      const adapter = makeAdapter();
      adapter.onEntitySpawn('e-001', makeVisualUpdate('e-001'));
      adapter.provider.clearQueues();
      adapter.onEntitySpawn('e-002', makeVisualUpdate('e-002'));
      expect(adapter.provider.getSpawnQueue()).toHaveLength(1);
    });
  });

  // ── Sequence numbers ──────────────────────────────────────────

  describe('sequence numbers', () => {
    it('messages get monotonically increasing sequence numbers', () => {
      const adapter = makeAdapter();
      adapter.onStatePush([makeVisualUpdate('e-001')]);
      adapter.onEntitySpawn('e-002', makeVisualUpdate('e-002'));
      adapter.onEntityDespawn('e-003');

      const snap = adapter.provider.getEntitySnapshots()[0]!;
      const spawn = adapter.provider.getSpawnQueue()[0]!;
      const despawn = adapter.provider.getDespawnQueue()[0]!;

      expect(snap.sequenceNumber).toBeLessThan(spawn.sequenceNumber);
      expect(spawn.sequenceNumber).toBeLessThan(despawn.sequenceNumber);
    });

    it('timestamps come from the injected clock', () => {
      const clockMock = { nowMicroseconds: vi.fn().mockReturnValue(42_000_000) };
      const adapter = createBridgeWorldStateAdapter({ clock: clockMock });
      adapter.onStatePush([makeVisualUpdate('e-001')]);
      expect(adapter.provider.getEntitySnapshots()[0]!.timestamp).toBe(42_000_000);
    });
  });
});
