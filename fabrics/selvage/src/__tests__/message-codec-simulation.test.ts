import { describe, it, expect } from 'vitest';
import { createJsonCodec } from '../message-codec.js';
import type { ServerMessage } from '../server-protocol.js';
import { SelvageError } from '../selvage-errors.js';

function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe('Message Codec Simulation', () => {
  it('encodes server message as UTF-8 JSON bytes', () => {
    const codec = createJsonCodec();

    const message: ServerMessage = {
      type: 'system-message',
      category: 'announcement',
      content: 'Server maintenance in 5 min',
      timestamp: 12345,
    };

    const encoded = codec.encode(message);
    const json = new TextDecoder().decode(encoded);

    expect(json).toContain('system-message');
    expect(json).toContain('Server maintenance in 5 min');
  });

  it('decodes valid client-hello payload', () => {
    const codec = createJsonCodec();

    const decoded = codec.decode(
      toBytes(
        JSON.stringify({
          type: 'client-hello',
          protocolVersion: 1,
          clientId: 'client-1',
          platform: 'pc',
          renderingTier: 'high',
        }),
      ),
    );

    expect(decoded.type).toBe('client-hello');
    if (decoded.type === 'client-hello') {
      expect(decoded.clientId).toBe('client-1');
      expect(decoded.protocolVersion).toBe(1);
    }
  });

  it('decodes valid client-input payload with actions array', () => {
    const codec = createJsonCodec();

    const decoded = codec.decode(
      toBytes(
        JSON.stringify({
          type: 'client-input',
          sequence: 9,
          timestamp: 900,
          actions: [{ actionType: 'jump', payload: { height: 2 } }],
        }),
      ),
    );

    expect(decoded.type).toBe('client-input');
    if (decoded.type === 'client-input') {
      expect(decoded.sequence).toBe(9);
      expect(decoded.actions).toHaveLength(1);
      expect(decoded.actions[0]?.actionType).toBe('jump');
    }
  });

  it('throws INVALID_MESSAGE for malformed JSON', () => {
    const codec = createJsonCodec();

    expect(() => codec.decode(toBytes('{not-json'))).toThrow(SelvageError);
    expect(() => codec.decode(toBytes('{not-json'))).toThrow('Invalid message: Invalid JSON');
  });

  it('throws INVALID_MESSAGE when decoded value is not an object', () => {
    const codec = createJsonCodec();

    expect(() => codec.decode(toBytes('123'))).toThrow(SelvageError);
    expect(() => codec.decode(toBytes('123'))).toThrow('Message must be an object');
  });

  it('throws INVALID_MESSAGE when type is missing or non-string', () => {
    const codec = createJsonCodec();

    expect(() => codec.decode(toBytes(JSON.stringify({})))).toThrow(
      'Message must have a string "type" field',
    );

    expect(() => codec.decode(toBytes(JSON.stringify({ type: 1 })))).toThrow(
      'Message must have a string "type" field',
    );
  });
});
