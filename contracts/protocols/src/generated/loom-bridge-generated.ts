/**
 * FlatBuffers Bindings for loom-bridge.fbs
 *
 * Hand-written TypeScript bindings matching the FlatBuffers schema,
 * using the `flatbuffers` npm runtime package. These produce identical
 * wire bytes to what flatc --ts would generate, but without requiring
 * the flatc binary.
 *
 * All builders create standalone FlatBuffer blobs (finish with root).
 * All readers accept a ByteBuffer or Uint8Array.
 *
 * Thread: bridge/protocols/flatbuffers-bindings
 * Tier: 1
 */

import { Builder, ByteBuffer } from 'flatbuffers';

// ── MessageType enum (matches .fbs) ─────────────────────────────

export const MessageType = {
  EntitySnapshot: 0,
  EntitySpawn: 1,
  EntityDespawn: 2,
  PlayerInput: 3,
  WorldPreload: 4,
  WorldUnload: 5,
  TimeOfDay: 6,
  Weather: 7,
  ChunkLoad: 8,
  ChunkUnload: 9,
  FacialPose: 10,
  HealthCheck: 11,
  HealthResponse: 12,
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

// ── DespawnReason enum ──────────────────────────────────────────

export const DespawnReason = {
  Normal: 0,
  OutOfRange: 1,
  WorldUnload: 2,
  Death: 3,
} as const;

export type DespawnReasonValue = (typeof DespawnReason)[keyof typeof DespawnReason];

// ── Struct types (plain objects for TS consumption) ──────────────

export interface Vec3Data {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface QuatData {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface TransformData {
  readonly position: Vec3Data;
  readonly rotation: QuatData;
  readonly scale: Vec3Data;
}

// ── Table data interfaces ───────────────────────────────────────

export interface MaterialParamData {
  readonly slotIndex: number;
  readonly paramName: string;
  readonly floatValue: number;
  readonly vectorValue: Vec3Data;
  readonly textureHash: string;
}

export interface EntitySnapshotData {
  readonly entityId: string;
  readonly transform: TransformData;
  readonly meshHash: string;
  readonly animationClip: string;
  readonly animationTime: number;
  readonly animationBlend: number;
  readonly animationRate: number;
  readonly materialOverrides: ReadonlyArray<MaterialParamData>;
  readonly visibility: boolean;
  readonly renderPriority: number;
  readonly lodBias: number;
}

export interface EntitySpawnData {
  readonly entityId: string;
  readonly initialState: EntitySnapshotData;
  readonly archetype: string;
  readonly metahumanPreset: string;
}

export interface EntityDespawnData {
  readonly entityId: string;
  readonly reason: DespawnReasonValue;
}

export interface PlayerInputData {
  readonly entityId: string;
  readonly moveX: number;
  readonly moveY: number;
  readonly moveZ: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly actionFlags: number;
  readonly sequence: number;
}

export interface BlendShapeData {
  readonly name: string;
  readonly weight: number;
}

export interface FacialPoseData {
  readonly entityId: string;
  readonly blendShapes: ReadonlyArray<BlendShapeData>;
  readonly jawOpen: number;
  readonly eyeLookUpLeft: number;
  readonly eyeLookUpRight: number;
  readonly eyeLookDownLeft: number;
  readonly eyeLookDownRight: number;
  readonly eyeLookInLeft: number;
  readonly eyeLookInRight: number;
  readonly eyeLookOutLeft: number;
  readonly eyeLookOutRight: number;
  readonly emotionTag: string;
  readonly speechViseme: string;
  readonly speechAmplitude: number;
}

export interface TimeOfDayData {
  readonly sunAltitude: number;
  readonly sunAzimuth: number;
  readonly sunColorR: number;
  readonly sunColorG: number;
  readonly sunColorB: number;
  readonly sunIntensity: number;
  readonly fogDensity: number;
  readonly fogColorR: number;
  readonly fogColorG: number;
  readonly fogColorB: number;
  readonly cloudCoverage: number;
  readonly starBrightness: number;
  readonly moonPhase: number;
}

export interface WeatherData {
  readonly rainIntensity: number;
  readonly snowIntensity: number;
  readonly windSpeed: number;
  readonly windDirection: number;
  readonly temperature: number;
  readonly humidity: number;
  readonly lightningProbability: number;
  readonly fogHeight: number;
}

export interface EnvelopeData {
  readonly messageType: MessageTypeValue;
  readonly sequence: number;
  readonly timestampUs: bigint;
  readonly correlationId: string;
  readonly payload: Uint8Array;
}

// ── Struct writers (inline in tables — 12 bytes Vec3, 16 bytes Quat) ──

function writeVec3(builder: Builder, v: Vec3Data): number {
  // Structs are written inline: prepStruct then fields in reverse order
  builder.prep(4, 12);
  builder.writeFloat32(v.z);
  builder.writeFloat32(v.y);
  builder.writeFloat32(v.x);
  return builder.offset();
}

function writeQuat(builder: Builder, q: QuatData): number {
  builder.prep(4, 16);
  builder.writeFloat32(q.w);
  builder.writeFloat32(q.z);
  builder.writeFloat32(q.y);
  builder.writeFloat32(q.x);
  return builder.offset();
}

function writeTransform(builder: Builder, t: TransformData): number {
  // TransformFB struct: Vec3 position, Quat rotation, Vec3 scale = 40 bytes
  builder.prep(4, 40);
  // Written in reverse field order
  builder.writeFloat32(t.scale.z);
  builder.writeFloat32(t.scale.y);
  builder.writeFloat32(t.scale.x);
  builder.writeFloat32(t.rotation.w);
  builder.writeFloat32(t.rotation.z);
  builder.writeFloat32(t.rotation.y);
  builder.writeFloat32(t.rotation.x);
  builder.writeFloat32(t.position.z);
  builder.writeFloat32(t.position.y);
  builder.writeFloat32(t.position.x);
  return builder.offset();
}

// ── Struct readers ──────────────────────────────────────────────

function readVec3(bb: ByteBuffer, offset: number): Vec3Data {
  return {
    x: bb.readFloat32(offset),
    y: bb.readFloat32(offset + 4),
    z: bb.readFloat32(offset + 8),
  };
}

function readQuat(bb: ByteBuffer, offset: number): QuatData {
  return {
    x: bb.readFloat32(offset),
    y: bb.readFloat32(offset + 4),
    z: bb.readFloat32(offset + 8),
    w: bb.readFloat32(offset + 12),
  };
}

function readTransform(bb: ByteBuffer, offset: number): TransformData {
  return {
    position: readVec3(bb, offset),
    rotation: readQuat(bb, offset + 12),
    scale: readVec3(bb, offset + 28),
  };
}

// ── Envelope Builder/Reader ─────────────────────────────────────

export function buildEnvelope(data: EnvelopeData): Uint8Array {
  const builder = new Builder(256);
  const correlationIdOff = builder.createString(data.correlationId);
  const payloadOff = LoomBridgeEnvelope.createPayloadVector(builder, data.payload);

  LoomBridgeEnvelope.startEnvelope(builder);
  LoomBridgeEnvelope.addMessageType(builder, data.messageType);
  LoomBridgeEnvelope.addSequence(builder, data.sequence);
  LoomBridgeEnvelope.addTimestampUs(builder, data.timestampUs);
  LoomBridgeEnvelope.addCorrelationId(builder, correlationIdOff);
  LoomBridgeEnvelope.addPayload(builder, payloadOff);
  const envelopeOff = LoomBridgeEnvelope.endEnvelope(builder);

  builder.finish(envelopeOff);
  return builder.asUint8Array();
}

/** Low-level Envelope table helpers (flatc-style static methods) */
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace LoomBridgeEnvelope {
  export function startEnvelope(builder: Builder): void {
    builder.startObject(5);
  }
  export function addMessageType(builder: Builder, type: number): void {
    builder.addFieldInt8(0, type, 0);
  }
  export function addSequence(builder: Builder, seq: number): void {
    builder.addFieldInt32(1, seq, 0);
  }
  export function addTimestampUs(builder: Builder, ts: bigint): void {
    builder.addFieldInt64(2, ts, BigInt(0));
  }
  export function addCorrelationId(builder: Builder, off: number): void {
    builder.addFieldOffset(3, off, 0);
  }
  export function addPayload(builder: Builder, off: number): void {
    builder.addFieldOffset(4, off, 0);
  }
  export function endEnvelope(builder: Builder): number {
    return builder.endObject();
  }
  export function createPayloadVector(builder: Builder, data: Uint8Array): number {
    builder.startVector(1, data.length, 1);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addInt8(data[i]!);
    }
    return builder.endVector();
  }
}

export function readEnvelope(bytes: Uint8Array): EnvelopeData {
  const bb = new ByteBuffer(bytes);
  const rootOff = bb.readInt32(bb.position()) + bb.position();
  const vtableOff = rootOff - bb.readInt32(rootOff);
  const vtableSize = bb.readInt16(vtableOff);

  const getField = (fieldIndex: number): number => {
    const fieldOff = 4 + fieldIndex * 2;
    if (fieldOff >= vtableSize) return 0;
    return bb.readInt16(vtableOff + fieldOff);
  };

  // Field 0: message_type (byte)
  const mtOff = getField(0);
  const messageType = mtOff ? bb.readInt8(rootOff + mtOff) as MessageTypeValue : 0 as MessageTypeValue;

  // Field 1: sequence (uint)
  const seqOff = getField(1);
  const sequence = seqOff ? bb.readUint32(rootOff + seqOff) : 0;

  // Field 2: timestamp_us (long)
  const tsOff = getField(2);
  const timestampUs = tsOff ? bb.readInt64(rootOff + tsOff) : BigInt(0);

  // Field 3: correlation_id (string)
  const cidOff = getField(3);
  let correlationId = '';
  if (cidOff) {
    const strOffset = rootOff + cidOff;
    const indirectOff = strOffset + bb.readInt32(strOffset);
    correlationId = bb.__string(indirectOff) ?? '';
  }

  // Field 4: payload ([ubyte])
  const plOff = getField(4);
  let payload = new Uint8Array(0);
  if (plOff) {
    const vecStart = rootOff + plOff;
    const vecOffset = vecStart + bb.readInt32(vecStart);
    const vecLen = bb.readInt32(vecOffset);
    payload = new Uint8Array(bb.bytes().buffer, bb.bytes().byteOffset + vecOffset + 4, vecLen);
  }

  return { messageType, sequence, timestampUs, correlationId, payload };
}

// ── EntitySnapshot Builder/Reader ───────────────────────────────

export function buildEntitySnapshot(data: EntitySnapshotData): Uint8Array {
  const builder = new Builder(512);

  const entityIdOff = builder.createString(data.entityId);
  const meshHashOff = data.meshHash ? builder.createString(data.meshHash) : 0;
  const animClipOff = data.animationClip ? builder.createString(data.animationClip) : 0;

  // Material overrides vector
  const materialOffs: number[] = [];
  for (const mat of data.materialOverrides) {
    const pnOff = builder.createString(mat.paramName);
    const thOff = mat.textureHash ? builder.createString(mat.textureHash) : 0;
    builder.startObject(5);
    builder.addFieldInt32(0, mat.slotIndex, 0);
    builder.addFieldOffset(1, pnOff, 0);
    builder.addFieldFloat32(2, mat.floatValue, 0);
    // vector_value as struct inline
    builder.addFieldStruct(3, writeVec3(builder, mat.vectorValue), 0);
    if (thOff) builder.addFieldOffset(4, thOff, 0);
    materialOffs.push(builder.endObject());
  }
  let materialsVecOff = 0;
  if (materialOffs.length > 0) {
    builder.startVector(4, materialOffs.length, 4);
    for (let i = materialOffs.length - 1; i >= 0; i--) {
      builder.addOffset(materialOffs[i]!);
    }
    materialsVecOff = builder.endVector();
  }

  // EntitySnapshot table
  builder.startObject(11);
  builder.addFieldOffset(0, entityIdOff, 0);
  builder.addFieldStruct(1, writeTransform(builder, data.transform), 0);
  if (meshHashOff) builder.addFieldOffset(2, meshHashOff, 0);
  if (animClipOff) builder.addFieldOffset(3, animClipOff, 0);
  builder.addFieldFloat32(4, data.animationTime, 0);
  builder.addFieldFloat32(5, data.animationBlend, 0);
  builder.addFieldFloat32(6, data.animationRate, 0);
  if (materialsVecOff) builder.addFieldOffset(7, materialsVecOff, 0);
  builder.addFieldInt8(8, data.visibility ? 1 : 0, 1);
  builder.addFieldInt32(9, data.renderPriority, 0);
  builder.addFieldFloat32(10, data.lodBias, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}

// ── PlayerInput Builder ─────────────────────────────────────────

export function buildPlayerInput(data: PlayerInputData): Uint8Array {
  const builder = new Builder(128);
  const entityIdOff = builder.createString(data.entityId);

  builder.startObject(8);
  builder.addFieldOffset(0, entityIdOff, 0);
  builder.addFieldFloat32(1, data.moveX, 0);
  builder.addFieldFloat32(2, data.moveY, 0);
  builder.addFieldFloat32(3, data.moveZ, 0);
  builder.addFieldFloat32(4, data.yaw, 0);
  builder.addFieldFloat32(5, data.pitch, 0);
  builder.addFieldInt32(6, data.actionFlags, 0);
  builder.addFieldInt32(7, data.sequence, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}

// ── EntityDespawn Builder ───────────────────────────────────────

export function buildEntityDespawn(data: EntityDespawnData): Uint8Array {
  const builder = new Builder(64);
  const entityIdOff = builder.createString(data.entityId);

  builder.startObject(2);
  builder.addFieldOffset(0, entityIdOff, 0);
  builder.addFieldInt8(1, data.reason, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}

// ── FacialPose Builder ──────────────────────────────────────────

export function buildFacialPose(data: FacialPoseData): Uint8Array {
  const builder = new Builder(1024);
  const entityIdOff = builder.createString(data.entityId);
  const emotionOff = data.emotionTag ? builder.createString(data.emotionTag) : 0;
  const visemeOff = data.speechViseme ? builder.createString(data.speechViseme) : 0;

  // blend_shapes vector
  const bsOffs: number[] = [];
  for (const bs of data.blendShapes) {
    const nameOff = builder.createString(bs.name);
    builder.startObject(2);
    builder.addFieldOffset(0, nameOff, 0);
    builder.addFieldFloat32(1, bs.weight, 0);
    bsOffs.push(builder.endObject());
  }
  let bsVecOff = 0;
  if (bsOffs.length > 0) {
    builder.startVector(4, bsOffs.length, 4);
    for (let i = bsOffs.length - 1; i >= 0; i--) {
      builder.addOffset(bsOffs[i]!);
    }
    bsVecOff = builder.endVector();
  }

  builder.startObject(14);
  builder.addFieldOffset(0, entityIdOff, 0);
  if (bsVecOff) builder.addFieldOffset(1, bsVecOff, 0);
  builder.addFieldFloat32(2, data.jawOpen, 0);
  builder.addFieldFloat32(3, data.eyeLookUpLeft, 0);
  builder.addFieldFloat32(4, data.eyeLookUpRight, 0);
  builder.addFieldFloat32(5, data.eyeLookDownLeft, 0);
  builder.addFieldFloat32(6, data.eyeLookDownRight, 0);
  builder.addFieldFloat32(7, data.eyeLookInLeft, 0);
  builder.addFieldFloat32(8, data.eyeLookInRight, 0);
  builder.addFieldFloat32(9, data.eyeLookOutLeft, 0);
  builder.addFieldFloat32(10, data.eyeLookOutRight, 0);
  if (emotionOff) builder.addFieldOffset(11, emotionOff, 0);
  if (visemeOff) builder.addFieldOffset(12, visemeOff, 0);
  builder.addFieldFloat32(13, data.speechAmplitude, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}

// ── TimeOfDay Builder ───────────────────────────────────────────

export function buildTimeOfDay(data: TimeOfDayData): Uint8Array {
  const builder = new Builder(128);

  builder.startObject(13);
  builder.addFieldFloat32(0, data.sunAltitude, 0);
  builder.addFieldFloat32(1, data.sunAzimuth, 0);
  builder.addFieldFloat32(2, data.sunColorR, 0);
  builder.addFieldFloat32(3, data.sunColorG, 0);
  builder.addFieldFloat32(4, data.sunColorB, 0);
  builder.addFieldFloat32(5, data.sunIntensity, 0);
  builder.addFieldFloat32(6, data.fogDensity, 0);
  builder.addFieldFloat32(7, data.fogColorR, 0);
  builder.addFieldFloat32(8, data.fogColorG, 0);
  builder.addFieldFloat32(9, data.fogColorB, 0);
  builder.addFieldFloat32(10, data.cloudCoverage, 0);
  builder.addFieldFloat32(11, data.starBrightness, 0);
  builder.addFieldFloat32(12, data.moonPhase, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}

// ── Weather Builder ─────────────────────────────────────────────

export function buildWeather(data: WeatherData): Uint8Array {
  const builder = new Builder(128);

  builder.startObject(8);
  builder.addFieldFloat32(0, data.rainIntensity, 0);
  builder.addFieldFloat32(1, data.snowIntensity, 0);
  builder.addFieldFloat32(2, data.windSpeed, 0);
  builder.addFieldFloat32(3, data.windDirection, 0);
  builder.addFieldFloat32(4, data.temperature, 0);
  builder.addFieldFloat32(5, data.humidity, 0);
  builder.addFieldFloat32(6, data.lightningProbability, 0);
  builder.addFieldFloat32(7, data.fogHeight, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}

// ── EntitySpawn Builder ─────────────────────────────────────────

export function buildEntitySpawn(data: EntitySpawnData): Uint8Array {
  const builder = new Builder(512);

  // Build the inner EntitySnapshot first (as nested flatbuffer payload)
  const innerSnapshot = buildEntitySnapshot(data.initialState);

  const entityIdOff = builder.createString(data.entityId);
  const archetypeOff = data.archetype ? builder.createString(data.archetype) : 0;
  const mhPresetOff = data.metahumanPreset ? builder.createString(data.metahumanPreset) : 0;

  // Embed the snapshot bytes as a nested vector
  builder.startVector(1, innerSnapshot.length, 1);
  for (let i = innerSnapshot.length - 1; i >= 0; i--) {
    builder.addInt8(innerSnapshot[i]!);
  }
  const snapshotVecOff = builder.endVector();

  builder.startObject(4);
  builder.addFieldOffset(0, entityIdOff, 0);
  builder.addFieldOffset(1, snapshotVecOff, 0);
  if (archetypeOff) builder.addFieldOffset(2, archetypeOff, 0);
  if (mhPresetOff) builder.addFieldOffset(3, mhPresetOff, 0);
  const off = builder.endObject();

  builder.finish(off);
  return builder.asUint8Array();
}
