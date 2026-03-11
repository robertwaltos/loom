/**
 * Event Factory — Creates properly structured LoomEvents.
 *
 * Handles all the metadata boilerplate: IDs, timestamps,
 * sequence numbers, correlation tracking.
 */

import type { LoomEvent, EventMetadata } from '@loom/events-contracts';
import type { Clock } from './clock.js';
import type { IdGenerator } from './id-generator.js';

export interface EventFactory {
  create<TType extends string, TPayload>(
    type: TType,
    payload: TPayload,
    source: EventSource,
    causation?: CausationInfo,
  ): LoomEvent<TType, TPayload>;
}

export interface EventSource {
  readonly worldId: string;
  readonly fabricId: string;
}

export interface CausationInfo {
  readonly correlationId: string;
  readonly causationId: string;
}

export function createEventFactory(clock: Clock, idGenerator: IdGenerator): EventFactory {
  const sequenceCounters = new Map<string, number>();

  function nextSequence(sourceKey: string): number {
    const current = sequenceCounters.get(sourceKey) ?? 0;
    const next = current + 1;
    sequenceCounters.set(sourceKey, next);
    return next;
  }

  function create<TType extends string, TPayload>(
    type: TType,
    payload: TPayload,
    source: EventSource,
    causation?: CausationInfo,
  ): LoomEvent<TType, TPayload> {
    const eventId = idGenerator.generate();
    const sourceKey = `${source.fabricId}:${source.worldId}`;

    const metadata: EventMetadata = {
      eventId,
      correlationId: causation?.correlationId ?? eventId,
      causationId: causation?.causationId ?? null,
      timestamp: clock.nowMicroseconds(),
      sequenceNumber: nextSequence(sourceKey),
      sourceWorldId: source.worldId,
      sourceFabricId: source.fabricId,
      schemaVersion: 1,
    };

    return { type, payload, metadata };
  }

  return { create };
}
