/**
 * Message Codec Port
 *
 * Abstracts binary encoding/decoding of wire message payloads.
 * Implementations can be swapped: JSON (dev), MessagePack (staging),
 * FlatBuffers (production hot paths).
 *
 * The PayloadCodec handles raw bytes ↔ typed data.
 * The MessageFactory builds complete WireMessages with proper headers.
 */

import type { WireMessage, MessageHeader, MessageType } from './wire-message.js';
import type { MessagePayloadMap } from './message-payloads.js';

// ── Payload Codec Port ──────────────────────────────────────────

/** Encodes/decodes typed payloads to/from binary. */
export interface PayloadCodec {
  readonly name: string;
  readonly encode: (payload: unknown) => Uint8Array;
  readonly decode: (bytes: Uint8Array) => unknown;
}

// ── Message Factory ─────────────────────────────────────────────

/** Dependencies for creating wire messages. */
export interface MessageFactoryDeps {
  readonly codec: PayloadCodec;
  readonly clock: MessageFactoryClock;
  readonly idGenerator: MessageFactoryIdGenerator;
}

export interface MessageFactoryClock {
  readonly nowMicroseconds: () => number;
}

export interface MessageFactoryIdGenerator {
  readonly next: () => string;
}

/** Builds typed WireMessages with auto-populated headers. */
export interface MessageFactory {
  readonly create: <T extends MessageType>(type: T, payload: MessagePayloadMap[T]) => WireMessage;

  readonly createWithCorrelation: <T extends MessageType>(
    type: T,
    payload: MessagePayloadMap[T],
    correlationId: string,
  ) => WireMessage;

  readonly parse: <T extends MessageType>(message: WireMessage) => ParsedMessage<T>;
}

export interface ParsedMessage<T extends MessageType> {
  readonly header: MessageHeader;
  readonly type: T;
  readonly payload: MessagePayloadMap[T];
}

// ── Schema Version ──────────────────────────────────────────────

/** Current wire protocol schema version. */
const WIRE_SCHEMA_VERSION = 1;

export { WIRE_SCHEMA_VERSION };
