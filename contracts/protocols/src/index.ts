/**
 * Wire Protocol Contracts
 *
 * Defines how data moves between The Loom and Rendering Fabrics.
 * All hot-path communication uses binary protocols.
 * JSON is only for debugging and low-frequency admin APIs.
 */

export type { WireMessage, MessageHeader, MessageType } from './wire-message.js';

export type {
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
} from './message-payloads.js';

export type {
  PayloadCodec,
  MessageFactory,
  MessageFactoryDeps,
  MessageFactoryClock,
  MessageFactoryIdGenerator,
  ParsedMessage,
} from './message-codec.js';

export { WIRE_SCHEMA_VERSION } from './message-codec.js';

// ── Binary Codecs ───────────────────────────────────────────────

export {
  createBinaryPayloadCodec,
  createFlatBuffersPayloadCodec,
  createMessagePackPayloadCodec,
} from './binary-codec.js';

// ── FlatBuffers Generated Bindings ──────────────────────────────

export type {
  Vec3Data,
  QuatData,
  TransformData,
  EntitySnapshotData,
  EntitySpawnData,
  EntityDespawnData,
  PlayerInputData,
  FacialPoseData,
  BlendShapeData,
  TimeOfDayData,
  WeatherData,
  MaterialParamData,
  EnvelopeData,
  MessageTypeValue,
  DespawnReasonValue,
} from './generated/loom-bridge-generated.js';

export {
  MessageType as FBMessageType,
  DespawnReason,
  buildEnvelope,
  readEnvelope,
  buildEntitySnapshot,
  buildEntitySpawn,
  buildEntityDespawn,
  buildPlayerInput,
  buildFacialPose,
  buildTimeOfDay,
  buildWeather,
} from './generated/loom-bridge-generated.js';

/** Protocol versioning and schema evolution */
export {
  createSchemaRegistry,
  schemaVersion,
} from './protocol-evolution.js';
export type {
  SchemaVersion,
  SchemaDescriptor,
  MigrationStep,
  MigrationPath,
  CompatibilityClass,
  EvolutionError,
  SchemaRegistry,
} from './protocol-evolution.js';
