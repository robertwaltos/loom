/**
 * udp-protocol-simulation.test.ts — Simulation tests for UdpProtocol.
 *
 * Thread: silk/selvage/udp-protocol
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createUdpProtocol,
  UDP_PROTOCOL_PRIORITY,
} from '../udp-protocol.js';
import type {
  UdpPacket,
  UdpSocketPort,
  UdpProtocolService,
  ChannelType,
  OnPacketCallback,
} from '../udp-protocol.js';

// ── Fake Socket ──────────────────────────────────────────────────

class FakeSocket implements UdpSocketPort {
  readonly sent: Array<{ connectionId: string; packet: UdpPacket }> = [];
  private receiveCallback: ((connectionId: string, packet: UdpPacket) => void) | null = null;

  send(connectionId: string, packet: UdpPacket): void {
    this.sent.push({ connectionId, packet });
  }

  onReceive(cb: (connectionId: string, packet: UdpPacket) => void): void {
    this.receiveCallback = cb;
  }

  /** Simulate a packet arriving from the remote. */
  deliver(connectionId: string, packet: UdpPacket): void {
    this.receiveCallback?.(connectionId, packet);
  }

  clearSent(): void {
    this.sent.length = 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function makeProtocol(startMs = 0): {
  protocol: UdpProtocolService;
  socket: FakeSocket;
  received: Array<{ connectionId: string; channelType: ChannelType; payload: Uint8Array }>;
  advance: (ms: number) => void;
  nowMs: () => number;
} {
  const socket = new FakeSocket();
  let time = startMs;
  const clock = { nowMs: () => time };
  const protocol = createUdpProtocol({ socket, clock });
  const received: Array<{ connectionId: string; channelType: ChannelType; payload: Uint8Array }> = [];

  const cb: OnPacketCallback = (connectionId, channelType, payload) => {
    received.push({ connectionId, channelType, payload });
  };
  protocol.onPacket(cb);

  return {
    protocol,
    socket,
    received,
    advance: (ms: number) => { time += ms; },
    nowMs: () => time,
  };
}

function makePacket(
  seq: number,
  channelType: ChannelType,
  opts: Partial<UdpPacket> = {},
): UdpPacket {
  return {
    sequenceNumber: seq,
    ackNumber: opts.ackNumber ?? 0,
    ackBitmask: opts.ackBitmask ?? 0,
    channelType,
    payload: opts.payload ?? new Uint8Array([seq]),
    timestampMs: opts.timestampMs ?? 0,
  };
}

// ── Module constants ─────────────────────────────────────────────

describe('module constants', () => {
  it('UDP_PROTOCOL_PRIORITY is 25', () => {
    expect(UDP_PROTOCOL_PRIORITY).toBe(25);
  });
});

// ── connect / disconnect ─────────────────────────────────────────

describe('connect / disconnect', () => {
  it('registers a connection', () => {
    const { protocol } = makeProtocol();
    protocol.connect('peer-1');
    expect(protocol.connectionCount()).toBe(1);
  });

  it('does not double-register the same connection', () => {
    const { protocol } = makeProtocol();
    protocol.connect('peer-1');
    protocol.connect('peer-1');
    expect(protocol.connectionCount()).toBe(1);
  });

  it('removes connection on disconnect', () => {
    const { protocol } = makeProtocol();
    protocol.connect('peer-1');
    protocol.disconnect('peer-1');
    expect(protocol.connectionCount()).toBe(0);
  });

  it('getStats returns undefined for unknown connection', () => {
    const { protocol } = makeProtocol();
    expect(protocol.getStats('ghost')).toBeUndefined();
  });
});

// ── unreliable send ──────────────────────────────────────────────

describe('send — unreliable', () => {
  it('sends packet immediately via socket', () => {
    const { protocol, socket } = makeProtocol();
    protocol.connect('peer-1');
    const seq = protocol.send('peer-1', 'unreliable', new Uint8Array([10, 20]));
    expect(seq).toBe(0);
    expect(socket.sent).toHaveLength(1);
    expect(socket.sent[0]?.packet.channelType).toBe('unreliable');
  });

  it('does not queue for retransmit (unreliable)', () => {
    const { protocol, socket, advance } = makeProtocol();
    protocol.connect('peer-1');
    protocol.send('peer-1', 'unreliable', new Uint8Array([1]));
    socket.clearSent();

    // Advance time far past retransmit threshold
    advance(2_000);
    protocol.tick();

    expect(socket.sent).toHaveLength(0); // no retransmit
    expect(protocol.getStats('peer-1')?.pendingAcks).toBe(0);
  });

  it('sequence number increments per send', () => {
    const { protocol, socket } = makeProtocol();
    protocol.connect('peer-1');
    for (let i = 0; i < 3; i++) {
      protocol.send('peer-1', 'unreliable', new Uint8Array([i]));
    }
    expect(socket.sent[0]?.packet.sequenceNumber).toBe(0);
    expect(socket.sent[1]?.packet.sequenceNumber).toBe(1);
    expect(socket.sent[2]?.packet.sequenceNumber).toBe(2);
  });

  it('delivers received unreliable packets immediately', () => {
    const { protocol, socket, received } = makeProtocol();
    protocol.connect('peer-1');
    socket.deliver('peer-1', makePacket(0, 'unreliable', { payload: new Uint8Array([99]) }));
    expect(received).toHaveLength(1);
    expect(received[0]?.channelType).toBe('unreliable');
    expect(received[0]?.payload[0]).toBe(99);
  });

  it('throws when sending to unknown connection', () => {
    const { protocol } = makeProtocol();
    expect(() => protocol.send('ghost', 'unreliable', new Uint8Array([1]))).toThrow();
  });
});

// ── reliable-unordered send ──────────────────────────────────────

describe('send — reliable-unordered', () => {
  it('queues packet for retransmit until acked', () => {
    const { protocol } = makeProtocol();
    protocol.connect('peer-1');
    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([5]));
    expect(protocol.getStats('peer-1')?.pendingAcks).toBe(1);
  });

  it('removes from pending when ack received', () => {
    const { protocol, socket } = makeProtocol();
    protocol.connect('peer-1');
    const seq = protocol.send('peer-1', 'reliable-unordered', new Uint8Array([5]));

    // Remote sends back a packet acking our seq
    socket.deliver('peer-1', makePacket(0, 'unreliable', { ackNumber: seq, ackBitmask: 0 }));

    expect(protocol.getStats('peer-1')?.pendingAcks).toBe(0);
  });

  it('retransmits after RTT×2 timeout', () => {
    const { protocol, socket, advance } = makeProtocol();
    protocol.connect('peer-1');
    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([7]));
    socket.clearSent();

    // Before threshold — no retransmit
    advance(50);
    protocol.tick();
    expect(socket.sent).toHaveLength(0);

    // After threshold (initial RTT = 100ms → threshold = 200ms)
    advance(200);
    protocol.tick();
    expect(socket.sent).toHaveLength(1);
    expect(protocol.getStats('peer-1')?.retransmits).toBe(1);
  });

  it('marks packet lost after MAX_RETRANSMIT attempts', () => {
    const { protocol, socket, advance } = makeProtocol();
    protocol.connect('peer-1');
    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([3]));
    socket.clearSent();

    // Trigger enough retransmit cycles (8 attempts × 200ms each)
    for (let i = 0; i < 10; i++) {
      advance(300);
      protocol.tick();
    }

    expect(protocol.getStats('peer-1')?.packetsLost).toBe(1);
    expect(protocol.getStats('peer-1')?.pendingAcks).toBe(0);
  });

  it('delivers received reliable-unordered packets in any order', () => {
    const { protocol, socket, received } = makeProtocol();
    protocol.connect('peer-1');

    // Deliver out of order: seq 2, then seq 0, then seq 1
    socket.deliver('peer-1', makePacket(2, 'reliable-unordered', { payload: new Uint8Array([2]) }));
    socket.deliver('peer-1', makePacket(0, 'reliable-unordered', { payload: new Uint8Array([0]) }));
    socket.deliver('peer-1', makePacket(1, 'reliable-unordered', { payload: new Uint8Array([1]) }));

    // All three delivered (not reordered)
    expect(received).toHaveLength(3);
    expect(received[0]?.payload[0]).toBe(2);
    expect(received[1]?.payload[0]).toBe(0);
    expect(received[2]?.payload[0]).toBe(1);
  });
});

// ── reliable-ordered send ────────────────────────────────────────

describe('send — reliable-ordered', () => {
  it('delivers in-order packets immediately', () => {
    const { protocol, socket, received } = makeProtocol();
    protocol.connect('peer-1');

    socket.deliver('peer-1', makePacket(0, 'reliable-ordered', { payload: new Uint8Array([10]) }));
    socket.deliver('peer-1', makePacket(1, 'reliable-ordered', { payload: new Uint8Array([20]) }));

    expect(received).toHaveLength(2);
    expect(received[0]?.payload[0]).toBe(10);
    expect(received[1]?.payload[0]).toBe(20);
  });

  it('buffers out-of-order packets and delivers when gap is filled', () => {
    const { protocol, socket, received } = makeProtocol();
    protocol.connect('peer-1');

    // seq 1 arrives before seq 0 — must buffer
    socket.deliver('peer-1', makePacket(1, 'reliable-ordered', { payload: new Uint8Array([20]) }));
    expect(received).toHaveLength(0);

    // seq 0 arrives — both delivered in order
    socket.deliver('peer-1', makePacket(0, 'reliable-ordered', { payload: new Uint8Array([10]) }));
    expect(received).toHaveLength(2);
    expect(received[0]?.payload[0]).toBe(10);
    expect(received[1]?.payload[0]).toBe(20);
  });

  it('delivers a run of buffered packets once head arrives', () => {
    const { protocol, socket, received } = makeProtocol();
    protocol.connect('peer-1');

    socket.deliver('peer-1', makePacket(3, 'reliable-ordered', { payload: new Uint8Array([3]) }));
    socket.deliver('peer-1', makePacket(2, 'reliable-ordered', { payload: new Uint8Array([2]) }));
    socket.deliver('peer-1', makePacket(1, 'reliable-ordered', { payload: new Uint8Array([1]) }));
    expect(received).toHaveLength(0);

    socket.deliver('peer-1', makePacket(0, 'reliable-ordered', { payload: new Uint8Array([0]) }));
    expect(received).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(received[i]?.payload[0]).toBe(i);
    }
  });
});

// ── RTT estimation ───────────────────────────────────────────────

describe('RTT estimation', () => {
  it('updates rttEstimateMs when ack received', () => {
    const { protocol, socket, advance } = makeProtocol();
    protocol.connect('peer-1');

    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([1]));
    advance(20); // 20ms RTT

    // Ack seq 0
    socket.deliver('peer-1', makePacket(0, 'unreliable', { ackNumber: 0, ackBitmask: 0 }));

    const stats = protocol.getStats('peer-1')!;
    // RTT should have moved toward 20ms from the initial 100ms
    expect(stats.rttEstimateMs).toBeLessThan(100);
    expect(stats.rttEstimateMs).toBeGreaterThan(1);
  });
});

// ── ACK bitmask ──────────────────────────────────────────────────

describe('ACK bitmask — multi-packet ack', () => {
  it('acks multiple packets via bitmask and reduces pending', () => {
    const { protocol, socket } = makeProtocol();
    protocol.connect('peer-1');

    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([1])); // seq 0
    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([2])); // seq 1
    protocol.send('peer-1', 'reliable-unordered', new Uint8Array([3])); // seq 2

    expect(protocol.getStats('peer-1')?.pendingAcks).toBe(3);

    // Ack seq 2, bitmask bit0=1 (seq 1), bit1=1 (seq 0)
    socket.deliver('peer-1', makePacket(0, 'unreliable', {
      ackNumber: 2,
      ackBitmask: 0b11, // seq 1 and seq 0
    }));

    expect(protocol.getStats('peer-1')?.pendingAcks).toBe(0);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks packetsSent and packetsReceived', () => {
    const { protocol, socket } = makeProtocol();
    protocol.connect('peer-1');

    protocol.send('peer-1', 'unreliable', new Uint8Array([1]));
    protocol.send('peer-1', 'unreliable', new Uint8Array([2]));
    socket.deliver('peer-1', makePacket(0, 'unreliable'));

    const stats = protocol.getStats('peer-1')!;
    expect(stats.packetsSent).toBe(2);
    expect(stats.packetsReceived).toBe(1);
  });
});
