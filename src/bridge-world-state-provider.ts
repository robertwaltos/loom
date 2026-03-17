import type { GameOrchestrator } from '@loom/loom-core';
import type { EntityId } from '@loom/entities-contracts';
import type { BridgeWorldStateProvider, ServerStreamMessage } from '@loom/selvage';

interface ClockPort {
  readonly nowMicroseconds: () => number;
}

interface SequencePort {
  readonly next: () => number;
}

function normalizeWorldIds(worldIds: ReadonlyArray<string>): ReadonlySet<string> {
  const uniqueWorldIds = new Set<string>();

  for (const worldId of worldIds) {
    const normalized = worldId.trim();
    if (normalized.length > 0) uniqueWorldIds.add(normalized);
  }

  return uniqueWorldIds;
}

function encodePayload(payload: Readonly<Record<string, unknown>>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

function createSequencePort(): SequencePort {
  let value = 0;
  return { next: () => ++value };
}

function createSpawnMessage(
  clock: ClockPort,
  sequence: SequencePort,
  payload: { readonly entityId: string; readonly entityType: string; readonly worldId: string },
): ServerStreamMessage {
  return {
    type: 'entity-spawn',
    sequenceNumber: sequence.next(),
    timestamp: clock.nowMicroseconds(),
    payload: encodePayload(payload),
  };
}

function createDespawnMessage(
  clock: ClockPort,
  sequence: SequencePort,
  payload: { readonly entityId: string; readonly reason: string; readonly worldId: string },
): ServerStreamMessage {
  return {
    type: 'entity-despawn',
    sequenceNumber: sequence.next(),
    timestamp: clock.nowMicroseconds(),
    payload: encodePayload(payload),
  };
}

function createSnapshotMessages(
  orchestrator: GameOrchestrator,
  clock: ClockPort,
  sequence: SequencePort,
  worldIds: ReadonlySet<string>,
): ReadonlyArray<ServerStreamMessage> {
  const nowUs = clock.nowMicroseconds();
  const snapshots: ServerStreamMessage[] = [];

  for (const worldId of worldIds) {
    for (const entity of orchestrator.core.entities.queryByWorld(worldId)) {
      snapshots.push(createSnapshotMessage(orchestrator, sequence, entity, nowUs));
    }
  }

  return snapshots;
}

function createSnapshotMessage(
  orchestrator: GameOrchestrator,
  sequence: SequencePort,
  entity: { readonly id: string; readonly type: string; readonly worldId: string },
  timestamp: number,
): ServerStreamMessage {
  const transform = orchestrator.core.entities.components.tryGet(
    entity.id as EntityId,
    'transform',
  ) as
    | {
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number; w: number };
      }
    | undefined;

  return {
    type: 'entity-snapshot',
    sequenceNumber: sequence.next(),
    timestamp,
    payload: encodePayload({
      entityId: entity.id,
      entityType: entity.type,
      worldId: entity.worldId,
      position: transform?.position ?? { x: 0, y: 0, z: 0 },
      rotation: transform?.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    }),
  };
}

function registerLifecycleQueues(
  orchestrator: GameOrchestrator,
  clock: ClockPort,
  sequence: SequencePort,
  worldIds: ReadonlySet<string>,
  spawnQueue: ServerStreamMessage[],
  despawnQueue: ServerStreamMessage[],
): void {
  orchestrator.core.eventBus.subscribe({ types: ['entity.spawned'] }, (event) => {
    const payload = event.payload as {
      entityId: string;
      entityType: string;
      worldId: string;
    };
    if (worldIds.has(payload.worldId)) {
      spawnQueue.push(createSpawnMessage(clock, sequence, payload));
    }
  });

  orchestrator.core.eventBus.subscribe({ types: ['entity.despawned'] }, (event) => {
    const payload = event.payload as {
      entityId: string;
      reason: string;
      worldId: string;
    };
    if (worldIds.has(payload.worldId)) {
      despawnQueue.push(createDespawnMessage(clock, sequence, payload));
    }
  });
}

function createTimeWeatherMessage(
  clock: ClockPort,
  sequence: SequencePort,
  worldId?: string,
): ServerStreamMessage {
  const nowUs = clock.nowMicroseconds();
  return {
    type: 'time-weather',
    sequenceNumber: sequence.next(),
    timestamp: nowUs,
    payload: encodePayload({
      ...(worldId === undefined ? {} : { worldId }),
      gameTimeHours: (nowUs / 1_000_000 / 3600) % 24,
      weatherType: 'clear',
      weatherIntensity: 0.0,
    }),
  };
}

export function createBridgeWorldStateProvider(
  orchestrator: GameOrchestrator,
  clock: ClockPort,
  configuredWorldIds: ReadonlyArray<string>,
): BridgeWorldStateProvider {
  const worldIds = normalizeWorldIds(configuredWorldIds);
  const spawnQueue: ServerStreamMessage[] = [];
  const despawnQueue: ServerStreamMessage[] = [];
  const sequence = createSequencePort();

  registerLifecycleQueues(orchestrator, clock, sequence, worldIds, spawnQueue, despawnQueue);

  return {
    getEntitySnapshots: () => createSnapshotMessages(orchestrator, clock, sequence, worldIds),
    getSpawnQueue: () => [...spawnQueue],
    getDespawnQueue: () => [...despawnQueue],
    getTimeWeather: () => createTimeWeatherMessage(clock, sequence),
    getTimeWeatherUpdates: () =>
      Array.from(worldIds, (worldId) => createTimeWeatherMessage(clock, sequence, worldId)),
    getFacialPoseUpdates: () => [],
    clearQueues: () => {
      spawnQueue.length = 0;
      despawnQueue.length = 0;
    },
  };
}
