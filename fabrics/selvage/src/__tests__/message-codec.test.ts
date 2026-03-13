import { describe, it, expect } from 'vitest';
import { createJsonCodec } from '../message-codec.js';
import { SelvageError } from '../selvage-errors.js';
import type { ServerMessage } from '../server-protocol.js';

// ── createJsonCodec ────────────────────────────────────────────────────

describe('createJsonCodec — encode', () => {
  it('produces a Uint8Array', () => {
    const codec = createJsonCodec();
    const msg: ServerMessage = {
      type: 'system-message',
      category: 'info',
      content: 'Hello',
      timestamp: 1000,
    };
    const encoded = codec.encode(msg);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('round-trips a ClientHello', () => {
    const codec = createJsonCodec();
    const original = { type: 'client-hello', protocolVersion: 1, clientId: 'c1', platform: 'pc', renderingTier: 'ultra' };
    const serverMsg: ServerMessage = {
      type: 'system-message',
      category: 'info',
      content: JSON.stringify(original),
      timestamp: 0,
    };
    const encoded = codec.encode(serverMsg);
    const decoded = codec.decode(encoded);
    expect(decoded).toBeDefined();
  });

  it('encodes a ServerWelcome to valid UTF-8 JSON', () => {
    const codec = createJsonCodec();
    const msg: ServerMessage = {
      type: 'server-welcome',
      protocolVersion: 1,
      serverId: 's1',
      tickRateHz: 60,
      playerEntityId: 'e42',
      worldId: 'w1',
      serverTimestamp: 12345,
    };
    const encoded = codec.encode(msg);
    const text = new TextDecoder().decode(encoded);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed['type']).toBe('server-welcome');
  });
});

describe('createJsonCodec — decode', () => {
  it('decodes a valid client-hello message', () => {
    const codec = createJsonCodec();
    const payload = JSON.stringify({
      type: 'client-hello',
      protocolVersion: 1,
      clientId: 'abc',
      platform: 'web',
      renderingTier: 'medium',
    });
    const bytes = new TextEncoder().encode(payload);
    const decoded = codec.decode(bytes);
    expect(decoded.type).toBe('client-hello');
  });

  it('decodes a valid client-input message', () => {
    const codec = createJsonCodec();
    const payload = JSON.stringify({
      type: 'client-input',
      sequence: 42,
      timestamp: 1000,
      actions: [],
    });
    const bytes = new TextEncoder().encode(payload);
    const decoded = codec.decode(bytes);
    expect(decoded.type).toBe('client-input');
  });

  it('throws SelvageError on invalid JSON', () => {
    const codec = createJsonCodec();
    const bad = new TextEncoder().encode('not-json{{{');
    expect(() => codec.decode(bad)).toThrow(SelvageError);
  });

  it('throws SelvageError when message is not an object', () => {
    const codec = createJsonCodec();
    const bad = new TextEncoder().encode('"just a string"');
    expect(() => codec.decode(bad)).toThrow(SelvageError);
  });

  it('throws SelvageError when "type" field is missing', () => {
    const codec = createJsonCodec();
    const bad = new TextEncoder().encode(JSON.stringify({ data: 42 }));
    expect(() => codec.decode(bad)).toThrow(SelvageError);
  });
});
