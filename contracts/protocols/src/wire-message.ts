/**
 * Wire Message Format
 *
 * Binary message envelope for Loom ↔ Fabric communication.
 * Implementation will use FlatBuffers for serialization.
 * This TypeScript type describes the logical structure.
 */

export type MessageType =
  | "state-snapshot"
  | "entity-spawn"
  | "entity-despawn"
  | "player-input"
  | "physics-event"
  | "weave-begin"
  | "weave-update"
  | "weave-complete"
  | "weave-abort"
  | "capability-negotiate"
  | "health-check"
  | "health-response";

export interface MessageHeader {
  /** Message type for routing */
  readonly type: MessageType;

  /** Monotonic sequence number */
  readonly sequenceNumber: number;

  /** Timestamp in microseconds */
  readonly timestamp: number;

  /** Correlation ID for tracing */
  readonly correlationId: string;

  /** Payload size in bytes (for framing) */
  readonly payloadSize: number;

  /** Schema version for forward compatibility */
  readonly schemaVersion: number;
}

export interface WireMessage {
  readonly header: MessageHeader;

  /**
   * Binary payload — FlatBuffers encoded.
   * The specific schema depends on header.type.
   */
  readonly payload: Uint8Array;
}
