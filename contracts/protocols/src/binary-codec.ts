/**
 * Binary Payload Codec ΓÇö Production binary serialization for hot paths.
 *
 * Uses a compact binary envelope format: 4-byte length prefix + MessagePack-
 * style flat packing. Targets < 0.5ms encode/decode per tick.
 *
 * Architecture:
 *   PayloadCodec port ΓåÉ contracts/protocols
 *   This module implements the port with a zero-copy-friendly binary format.
 *   Falls back to JSON codec for dev mode.
 *
 * Thread: bridge/protocols/binary-codec
 * Tier: 1
 */

import type { PayloadCodec } from './message-codec.js';

// ΓöÇΓöÇΓöÇ Binary Payload Codec ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Uses a length-prefixed binary envelope wrapping JSON bytes.
// This gives us framing + fast Uint8Array ops while supporting
// arbitrary payload shapes without .fbs schema compilation.
//
// Production upgrade path: replace the inner JSON with FlatBuffers-
// generated code once .fbs schemas are finalized and compiled.

export function createBinaryPayloadCodec(): PayloadCodec {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  return {
    name: 'binary-envelope',

    encode: (payload: unknown): Uint8Array => {
      const json = JSON.stringify(payload);
      const jsonBytes = textEncoder.encode(json);
      const envelope = new Uint8Array(4 + jsonBytes.length);
      writeUint32BE(envelope, 0, jsonBytes.length);
      envelope.set(jsonBytes, 4);
      return envelope;
    },

    decode: (bytes: Uint8Array): unknown => {
      if (bytes.length < 4) {
        throw new Error('Binary envelope too short: missing length prefix');
      }
      const payloadLength = readUint32BE(bytes, 0);
      if (bytes.length < 4 + payloadLength) {
        throw new Error(
          `Binary envelope truncated: expected ${payloadLength} payload bytes, got ${bytes.length - 4}`,
        );
      }
      const jsonBytes = bytes.subarray(4, 4 + payloadLength);
      const json = textDecoder.decode(jsonBytes);
      return JSON.parse(json) as unknown;
    },
  };
}

// ΓöÇΓöÇΓöÇ FlatBuffers Schema Codec (stub for future .fbs integration) ΓöÇ

export function createFlatBuffersPayloadCodec(): PayloadCodec {
  // Once .fbs schema files are compiled, this codec uses the
  // generated FlatBuffers builder/reader for zero-copy access.
  // For now it delegates to the binary envelope codec.
  const base = createBinaryPayloadCodec();
  return {
    name: 'flatbuffers',
    encode: base.encode,
    decode: base.decode,
  };
}

// ΓöÇΓöÇΓöÇ MessagePack-style Codec ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Tighter binary encoding using a minimal MessagePack-compatible format.
// No external dependency ΓÇö pure TypeScript.

export function createMessagePackPayloadCodec(): PayloadCodec {
  return {
    name: 'msgpack',
    encode: (payload: unknown): Uint8Array => {
      return msgpackEncode(payload);
    },
    decode: (bytes: Uint8Array): unknown => {
      return msgpackDecode(bytes, { offset: 0 });
    },
  };
}

// ΓöÇΓöÇΓöÇ Minimal MessagePack Encoder ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function msgpackEncode(value: unknown): Uint8Array {
  const parts: Uint8Array[] = [];
  encodeValue(parts, value);
  return concatBuffers(parts);
}

function encodeValue(parts: Uint8Array[], value: unknown): void {
  if (value === null || value === undefined) {
    parts.push(new Uint8Array([0xc0]));
    return;
  }
  if (typeof value === 'boolean') {
    parts.push(new Uint8Array([value ? 0xc3 : 0xc2]));
    return;
  }
  if (typeof value === 'number') {
    encodeNumber(parts, value);
    return;
  }
  if (typeof value === 'string') {
    encodeString(parts, value);
    return;
  }
  if (Array.isArray(value)) {
    encodeArray(parts, value);
    return;
  }
  if (typeof value === 'object') {
    encodeObject(parts, value as Record<string, unknown>);
    return;
  }
  // fallback: encode as string representation
  encodeString(parts, String(value));
}

function encodeNumber(parts: Uint8Array[], n: number): void {
  if (Number.isInteger(n) && n >= 0 && n <= 127) {
    parts.push(new Uint8Array([n]));
  } else if (Number.isInteger(n) && n >= -32 && n < 0) {
    parts.push(new Uint8Array([0xe0 | (n + 32)]));
  } else {
    // float64
    const buf = new Uint8Array(9);
    buf[0] = 0xcb;
    new DataView(buf.buffer).setFloat64(1, n, false);
    parts.push(buf);
  }
}

function encodeString(parts: Uint8Array[], s: string): void {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(s);
  if (bytes.length <= 31) {
    parts.push(new Uint8Array([0xa0 | bytes.length]));
  } else if (bytes.length <= 0xff) {
    parts.push(new Uint8Array([0xd9, bytes.length]));
  } else {
    const hdr = new Uint8Array(3);
    hdr[0] = 0xda;
    new DataView(hdr.buffer).setUint16(1, bytes.length, false);
    parts.push(hdr);
  }
  parts.push(bytes);
}

function encodeArray(parts: Uint8Array[], arr: unknown[]): void {
  if (arr.length <= 15) {
    parts.push(new Uint8Array([0x90 | arr.length]));
  } else {
    const hdr = new Uint8Array(3);
    hdr[0] = 0xdc;
    new DataView(hdr.buffer).setUint16(1, arr.length, false);
    parts.push(hdr);
  }
  for (const item of arr) {
    encodeValue(parts, item);
  }
}

function encodeObject(parts: Uint8Array[], obj: Record<string, unknown>): void {
  const keys = Object.keys(obj);
  if (keys.length <= 15) {
    parts.push(new Uint8Array([0x80 | keys.length]));
  } else {
    const hdr = new Uint8Array(3);
    hdr[0] = 0xde;
    new DataView(hdr.buffer).setUint16(1, keys.length, false);
    parts.push(hdr);
  }
  for (const key of keys) {
    encodeString(parts, key);
    encodeValue(parts, obj[key]);
  }
}

// ΓöÇΓöÇΓöÇ Minimal MessagePack Decoder ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface DecodeState {
  offset: number;
}

function msgpackDecode(bytes: Uint8Array, state: DecodeState): unknown {
  const byte = bytes[state.offset++]!;

  // positive fixint
  if (byte <= 0x7f) return byte;
  // negative fixint
  if (byte >= 0xe0) return byte - 256;
  // fixstr
  if ((byte & 0xe0) === 0xa0) return decodeStr(bytes, state, byte & 0x1f);
  // fixarray
  if ((byte & 0xf0) === 0x90) return decodeArr(bytes, state, byte & 0x0f);
  // fixmap
  if ((byte & 0xf0) === 0x80) return decodeMap(bytes, state, byte & 0x0f);

  switch (byte) {
    case 0xc0:
      return null;
    case 0xc2:
      return false;
    case 0xc3:
      return true;
    case 0xcb: {
      // float64
      const v = new DataView(bytes.buffer, bytes.byteOffset + state.offset, 8).getFloat64(0, false);
      state.offset += 8;
      return v;
    }
    case 0xd9: {
      // str 8
      const len = bytes[state.offset++]!;
      return decodeStr(bytes, state, len);
    }
    case 0xda: {
      // str 16
      const len = new DataView(bytes.buffer, bytes.byteOffset + state.offset, 2).getUint16(
        0,
        false,
      );
      state.offset += 2;
      return decodeStr(bytes, state, len);
    }
    case 0xdc: {
      // array 16
      const len = new DataView(bytes.buffer, bytes.byteOffset + state.offset, 2).getUint16(
        0,
        false,
      );
      state.offset += 2;
      return decodeArr(bytes, state, len);
    }
    case 0xde: {
      // map 16
      const len = new DataView(bytes.buffer, bytes.byteOffset + state.offset, 2).getUint16(
        0,
        false,
      );
      state.offset += 2;
      return decodeMap(bytes, state, len);
    }
    default:
      throw new Error(`Unknown msgpack type: 0x${byte.toString(16)}`);
  }
}

function decodeStr(bytes: Uint8Array, state: DecodeState, len: number): string {
  const decoder = new TextDecoder();
  const s = decoder.decode(bytes.subarray(state.offset, state.offset + len));
  state.offset += len;
  return s;
}

function decodeArr(bytes: Uint8Array, state: DecodeState, len: number): unknown[] {
  const arr: unknown[] = [];
  for (let i = 0; i < len; i++) {
    arr.push(msgpackDecode(bytes, state));
  }
  return arr;
}

function decodeMap(bytes: Uint8Array, state: DecodeState, len: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < len; i++) {
    const key = msgpackDecode(bytes, state) as string;
    obj[key] = msgpackDecode(bytes, state);
  }
  return obj;
}

// ΓöÇΓöÇΓöÇ Utility ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const buf of buffers) totalLength += buf.length;
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number): void {
  new DataView(buf.buffer, buf.byteOffset + offset, 4).setUint32(0, value, false);
}

function readUint32BE(buf: Uint8Array, offset: number): number {
  return new DataView(buf.buffer, buf.byteOffset + offset, 4).getUint32(0, false);
}
