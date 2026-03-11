import { describe, it, expect } from 'vitest';
import { isClientHello, isClientInput, PROTOCOL_VERSION } from '../server-protocol.js';
import { createJsonCodec } from '../message-codec.js';

describe('Protocol type guards', () => {
  it('identifies ClientHello messages', () => {
    expect(isClientHello({ type: 'client-hello' })).toBe(true);
    expect(isClientHello({ type: 'client-input' })).toBe(false);
    expect(isClientHello(null)).toBe(false);
    expect(isClientHello(42)).toBe(false);
    expect(isClientHello(undefined)).toBe(false);
  });

  it('identifies ClientInput messages', () => {
    expect(isClientInput({ type: 'client-input' })).toBe(true);
    expect(isClientInput({ type: 'client-hello' })).toBe(false);
  });
});

describe('Protocol constants', () => {
  it('has protocol version 1', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});

describe('JSON codec', () => {
  it('round-trips server messages', () => {
    const codec = createJsonCodec();
    const message = {
      type: 'server-welcome' as const,
      protocolVersion: 1,
      serverId: 'test',
      tickRateHz: 20,
      playerEntityId: 'p1',
      worldId: 'terra',
      serverTimestamp: 12345,
    };

    const encoded = codec.encode(message);
    expect(encoded).toBeInstanceOf(Uint8Array);

    const text = new TextDecoder().decode(encoded);
    const decoded = JSON.parse(text) as Record<string, unknown>;
    expect(decoded['type']).toBe('server-welcome');
    expect(decoded['serverId']).toBe('test');
  });

  it('decodes valid client messages', () => {
    const codec = createJsonCodec();
    const data = new TextEncoder().encode(
      JSON.stringify({
        type: 'client-hello',
        protocolVersion: 1,
        clientId: 'test',
        platform: 'test',
        renderingTier: 'high',
      }),
    );

    const decoded = codec.decode(data);
    expect(decoded.type).toBe('client-hello');
  });

  it('throws on invalid JSON', () => {
    const codec = createJsonCodec();
    expect(() => {
      codec.decode(new TextEncoder().encode('not json'));
    }).toThrow();
  });

  it('throws on non-object messages', () => {
    const codec = createJsonCodec();
    expect(() => {
      codec.decode(new TextEncoder().encode('"string"'));
    }).toThrow();
  });

  it('throws on messages without type field', () => {
    const codec = createJsonCodec();
    expect(() => {
      codec.decode(new TextEncoder().encode('{"foo":"bar"}'));
    }).toThrow();
  });
});
