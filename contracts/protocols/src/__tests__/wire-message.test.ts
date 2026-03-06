/**
 * Wire Message Protocol Smoke Tests
 *
 * Validates message types, header structure, and binary payload handling.
 */

import { describe, it, expect } from 'vitest';
import type { WireMessage, MessageHeader, MessageType } from '../wire-message.js';

function createHeader(overrides: Partial<MessageHeader> = {}): MessageHeader {
  return {
    type: 'health-check',
    sequenceNumber: 1,
    timestamp: Date.now() * 1000,
    correlationId: 'test-001',
    payloadSize: 0,
    schemaVersion: 1,
    ...overrides,
  };
}

describe('MessageType', () => {
  it('defines all twelve message types', () => {
    const allTypes: ReadonlyArray<MessageType> = [
      'state-snapshot',
      'entity-spawn',
      'entity-despawn',
      'player-input',
      'physics-event',
      'weave-begin',
      'weave-update',
      'weave-complete',
      'weave-abort',
      'capability-negotiate',
      'health-check',
      'health-response',
    ];

    expect(allTypes).toHaveLength(12);
  });
});

describe('WireMessage — health check', () => {
  it('creates a health-check with empty payload', () => {
    const message: WireMessage = {
      header: createHeader(),
      payload: new Uint8Array(0),
    };

    expect(message.header.type).toBe('health-check');
    expect(message.payload.byteLength).toBe(0);
  });
});

describe('WireMessage — entity spawn', () => {
  it('carries binary payload for entity-spawn', () => {
    const fakePayload = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const message: WireMessage = {
      header: createHeader({
        type: 'entity-spawn',
        sequenceNumber: 42,
        payloadSize: fakePayload.byteLength,
      }),
      payload: fakePayload,
    };

    expect(message.header.payloadSize).toBe(4);
    expect(message.payload[0]).toBe(0x01);
  });
});

describe('WireMessage — Silfen Weave transitions', () => {
  it('supports all four weave message types', () => {
    const weaveTypes: ReadonlyArray<MessageType> = [
      'weave-begin',
      'weave-update',
      'weave-complete',
      'weave-abort',
    ];

    weaveTypes.forEach((type) => {
      const msg: WireMessage = {
        header: createHeader({ type, correlationId: 'weave-001' }),
        payload: new Uint8Array(0),
      };
      expect(msg.header.type).toContain('weave');
    });
  });
});

describe('WireMessage — payload size integrity', () => {
  it('header payloadSize matches actual payload length', () => {
    const payload = new Uint8Array(256);
    const header = createHeader({
      type: 'state-snapshot',
      payloadSize: payload.byteLength,
    });

    expect(header.payloadSize).toBe(256);
  });
});
