import { describe, it, expect } from 'vitest';
import { isClientHello, isClientInput, PROTOCOL_VERSION } from '../server-protocol.js';
import { createJsonCodec } from '../message-codec.js';

describe('Server Protocol Simulation', () => {
  it('identifies valid client-hello messages', () => {
    const hello = {
      type: 'client-hello',
      protocolVersion: PROTOCOL_VERSION,
      clientId: 'player-999',
      platform: 'pc',
      renderingTier: 2,
    };
    expect(isClientHello(hello)).toBe(true);
  });

  it('rejects non-client-hello messages', () => {
    expect(isClientHello({ type: 'client-input' })).toBe(false);
    expect(isClientHello(null)).toBe(false);
    expect(isClientHello(undefined)).toBe(false);
    expect(isClientHello({ type: 'client-hello' })).toBe(true); // only checks type field
  });

  it('identifies valid client-input messages', () => {
    const input = {
      type: 'client-input',
      seq: 1,
      actions: [{ code: 'move-forward' }],
    };
    expect(isClientInput(input)).toBe(true);
  });

  it('rejects non-client-input messages', () => {
    expect(isClientInput({ type: 'client-hello' })).toBe(false);
    expect(isClientInput(null)).toBe(false);
    expect(isClientInput({ type: 'client-input' })).toBe(true); // only checks type field
  });

  it('codec encodes and decodes a round-trip', () => {
    const codec = createJsonCodec();
    const original = { type: 'client-hello', protocolVersion: 1, clientId: 'abc', platform: 'mobile', renderingTier: 1 };

    const encoded = codec.encode(original);
    expect(encoded).toBeDefined();

    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(original);
  });

  it('PROTOCOL_VERSION is a positive number', () => {
    expect(typeof PROTOCOL_VERSION).toBe('number');
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
  });
});
