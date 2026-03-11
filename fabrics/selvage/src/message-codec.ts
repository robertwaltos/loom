/**
 * Message Codec — Serialize/deserialize protocol messages.
 *
 * Pluggable: JSON for development, MessagePack for production.
 * Both codec implementations conform to the same interface.
 */

import type { ClientMessage, ServerMessage } from './server-protocol.js';
import { invalidMessage } from './selvage-errors.js';

export interface MessageCodec {
  encode(message: ServerMessage): Uint8Array;
  decode(data: Uint8Array): ClientMessage;
}

/**
 * JSON codec — human-readable, easy to debug.
 * Used during development and testing.
 */
export function createJsonCodec(): MessageCodec {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    encode: (message) => encoder.encode(JSON.stringify(message)),
    decode: (data) => {
      const text = decoder.decode(data);
      return parseClientMessage(text);
    },
  };
}

function parseClientMessage(text: string): ClientMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalidMessage('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw invalidMessage('Message must be an object');
  }

  const msg = parsed as Record<string, unknown>;
  if (typeof msg['type'] !== 'string') {
    throw invalidMessage('Message must have a string "type" field');
  }

  return parsed as ClientMessage;
}
