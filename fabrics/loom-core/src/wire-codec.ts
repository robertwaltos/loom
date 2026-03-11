/**
 * wire-codec.ts — JSON wire message codec.
 *
 * Development-tier codec: JSON → TextEncoder → Uint8Array.
 * Hot paths will swap to MessagePack or FlatBuffers in
 * production via the PayloadCodec port interface.
 *
 * Also provides the MessageFactory implementation that
 * builds complete WireMessages with auto-populated headers.
 */

import type {
  PayloadCodec,
  MessageFactory,
  MessageFactoryDeps,
  ParsedMessage,
  MessagePayloadMap,
} from '@loom/protocols-contracts';

import type { WireMessage, MessageHeader, MessageType } from '@loom/protocols-contracts';

import { WIRE_SCHEMA_VERSION } from '@loom/protocols-contracts';

// ── JSON Payload Codec ──────────────────────────────────────────

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function jsonEncode(payload: unknown): Uint8Array {
  const json = JSON.stringify(payload);
  return encoder.encode(json);
}

function jsonDecode(bytes: Uint8Array): unknown {
  const json = decoder.decode(bytes);
  return JSON.parse(json) as unknown;
}

function createJsonPayloadCodec(): PayloadCodec {
  return { name: 'json', encode: jsonEncode, decode: jsonDecode };
}

// ── Message Factory State ───────────────────────────────────────

interface FactoryState {
  readonly deps: MessageFactoryDeps;
  sequenceNumber: number;
}

// ── Header Construction ─────────────────────────────────────────

function buildHeader(
  state: FactoryState,
  type: MessageType,
  payloadSize: number,
  correlationId: string,
): MessageHeader {
  const seq = state.sequenceNumber;
  state.sequenceNumber = seq + 1;
  return {
    type,
    sequenceNumber: seq,
    timestamp: state.deps.clock.nowMicroseconds(),
    correlationId,
    payloadSize,
    schemaVersion: WIRE_SCHEMA_VERSION,
  };
}

// ── Create / Parse ──────────────────────────────────────────────

function createMessage<T extends MessageType>(
  state: FactoryState,
  type: T,
  payload: MessagePayloadMap[T],
  correlationId: string,
): WireMessage {
  const encoded = state.deps.codec.encode(payload);
  const header = buildHeader(state, type, encoded.byteLength, correlationId);
  return { header, payload: encoded };
}

function parseMessage<T extends MessageType>(
  state: FactoryState,
  message: WireMessage,
): ParsedMessage<T> {
  const decoded = state.deps.codec.decode(message.payload) as MessagePayloadMap[T];
  return {
    header: message.header,
    type: message.header.type as T,
    payload: decoded,
  };
}

// ── Factory ─────────────────────────────────────────────────────

function createMessageFactory(deps: MessageFactoryDeps): MessageFactory {
  const state: FactoryState = { deps, sequenceNumber: 0 };

  return {
    create: (type, payload) => createMessage(state, type, payload, deps.idGenerator.next()),

    createWithCorrelation: (type, payload, correlationId) =>
      createMessage(state, type, payload, correlationId),

    parse: (message) => parseMessage(state, message),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createJsonPayloadCodec, createMessageFactory };
