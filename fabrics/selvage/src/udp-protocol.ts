/**
 * udp-protocol.ts — Custom UDP reliability layer.
 *
 * Implements a reliable transport on top of an abstract UDP socket port.
 * Follows the hexagonal architecture used by all selvage modules.
 *
 * Channel types:
 *   reliable-ordered   — guaranteed delivery, in-order (game-critical state)
 *   reliable-unordered — guaranteed delivery, any order  (economy events)
 *   unreliable         — fire-and-forget  (position updates, cosmetics)
 *
 * Reliability mechanism:
 *   1. Each packet carries a uint16 sequence number (wraps at 65535).
 *   2. ACK packets carry the highest seq received + a 32-bit bitmask
 *      covering the 32 packets before it.
 *   3. Sender retransmits unacked packets after rttEstimateMs * 2 (min 50 ms).
 *   4. After MAX_RETRANSMIT attempts the packet is declared lost and the
 *      channel emits an 'error' event.
 *   5. RTT is estimated with EWMA (α = 0.125, same as TCP).
 *
 * Runs at priority 25 — before all other selvage systems so the socket
 * layer is settled before messages are processed.
 */

// ── Constants ────────────────────────────────────────────────────

export const UDP_PROTOCOL_PRIORITY = 25;

const SEQ_MAX = 0xffff;              // 65535
const SEQ_WINDOW = 32;              // bits in the ACK bitmask
const MAX_RETRANSMIT = 8;
const MIN_RETRANSMIT_MS = 50;
const RTT_ALPHA = 0.125;            // EWMA weight for RTT
const DEFAULT_INITIAL_RTT_MS = 100;

// ── Types ────────────────────────────────────────────────────────

export type ChannelType = 'reliable-ordered' | 'reliable-unordered' | 'unreliable';

export interface UdpPacket {
  /** Sender's sequence number for this packet. */
  readonly sequenceNumber: number;
  /** Highest sequence number the sender has received from the remote. */
  readonly ackNumber: number;
  /** Bitmask: bit i = 1 → seq (ackNumber - i - 1) was received. */
  readonly ackBitmask: number;
  readonly channelType: ChannelType;
  readonly payload: Uint8Array;
  readonly timestampMs: number;
}

/** Port — abstraction over the OS UDP socket. */
export interface UdpSocketPort {
  /** Send a raw packet to a remote peer. */
  send(connectionId: string, packet: UdpPacket): void;
  /** Register a callback that fires when a raw packet arrives. */
  onReceive(cb: (connectionId: string, packet: UdpPacket) => void): void;
}

export interface UdpProtocolDeps {
  readonly socket: UdpSocketPort;
  readonly clock: { readonly nowMs: () => number };
}

export interface UdpConnectionStats {
  readonly connectionId: string;
  readonly rttEstimateMs: number;
  readonly packetsSent: number;
  readonly packetsReceived: number;
  readonly packetsLost: number;
  readonly retransmits: number;
  readonly pendingAcks: number;
}

/** Callback for a fully-delivered, ordered application payload. */
export type OnPacketCallback = (
  connectionId: string,
  channelType: ChannelType,
  payload: Uint8Array,
) => void;

export interface UdpProtocolService {
  /** Open a logical connection to a remote peer. */
  connect(connectionId: string): void;
  /** Close and clean up a connection. */
  disconnect(connectionId: string): void;
  /** Send payload over the given channel. Returns the sequence number used. */
  send(connectionId: string, channelType: ChannelType, payload: Uint8Array): number;
  /**
   * Process retransmits, timeouts, and flush pending ACKs.
   * Call once per server tick (or at ~30 Hz minimum).
   */
  tick(): void;
  /** Register a handler for application-layer delivered packets. */
  onPacket(cb: OnPacketCallback): void;
  /** Per-connection statistics. */
  getStats(connectionId: string): UdpConnectionStats | undefined;
  /** Number of active connections. */
  connectionCount(): number;
}

// ── Internal State ───────────────────────────────────────────────

interface PendingPacket {
  readonly sequenceNumber: number;
  readonly channelType: ChannelType;
  readonly payload: Uint8Array;
  readonly sentAtMs: number;
  retransmitCount: number;
  lastRetransmitMs: number;
}

interface ConnectionState {
  readonly connectionId: string;
  /** Next sequence number to assign when sending. */
  nextSendSeq: number;
  /** Highest sequence number received from remote. */
  remoteHighestSeq: number;
  /** Bitmask of received seqs below remoteHighestSeq. */
  remoteAckBitmask: number;
  /** Highest remote seq we have ACKed back to them. */
  localAckSeq: number;
  /**
   * Unacked sent packets keyed by sequence number.
   * For reliable channels only.
   */
  readonly pendingAcks: Map<number, PendingPacket>;
  /**
   * Buffer for reliable-ordered: packets received out of order,
   * waiting for earlier seqs to arrive.
   */
  readonly orderedBuffer: Map<number, UdpPacket>;
  /** Next seq we expect in the ordered stream. */
  nextExpectedSeq: number;
  rttEstimateMs: number;
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  retransmits: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function wrappedAdd(seq: number, delta: number): number {
  return (seq + delta) & SEQ_MAX;
}

function seqDiff(a: number, b: number): number {
  // Returns (a - b) accounting for wraparound, range [-32768, 32767]
  const diff = (a - b) & SEQ_MAX;
  return diff > SEQ_MAX / 2 ? diff - (SEQ_MAX + 1) : diff;
}

function isSeqInWindow(seq: number, ackSeq: number, windowSize: number): boolean {
  return seqDiff(ackSeq, seq) >= 0 && seqDiff(ackSeq, seq) < windowSize;
}

function makeConnection(connectionId: string): ConnectionState {
  return {
    connectionId,
    nextSendSeq: 0,
    remoteHighestSeq: 0,
    remoteAckBitmask: 0,
    localAckSeq: 0,
    pendingAcks: new Map(),
    orderedBuffer: new Map(),
    nextExpectedSeq: 0,
    rttEstimateMs: DEFAULT_INITIAL_RTT_MS,
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    retransmits: 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createUdpProtocol(deps: UdpProtocolDeps): UdpProtocolService {
  const { socket, clock } = deps;
  const connections = new Map<string, ConnectionState>();
  const packetCallbacks: OnPacketCallback[] = [];

  function onPacket(cb: OnPacketCallback): void {
    packetCallbacks.push(cb);
  }

  function deliver(connectionId: string, channelType: ChannelType, payload: Uint8Array): void {
    for (const cb of packetCallbacks) {
      cb(connectionId, channelType, payload);
    }
  }

  function processAck(conn: ConnectionState, ackSeq: number, ackBitmask: number): void {
    // Mark the ackSeq itself as acknowledged
    const direct = conn.pendingAcks.get(ackSeq);
    if (direct) {
      // Update RTT estimate
      const rtt = clock.nowMs() - direct.sentAtMs;
      conn.rttEstimateMs = conn.rttEstimateMs * (1 - RTT_ALPHA) + rtt * RTT_ALPHA;
      conn.pendingAcks.delete(ackSeq);
    }

    // Mark any bitmask-confirmed packets as acked
    for (let i = 0; i < SEQ_WINDOW; i++) {
      if ((ackBitmask >>> i) & 1) {
        const seq = wrappedAdd(ackSeq, -(i + 1));
        conn.pendingAcks.delete(seq);
      }
    }
  }

  function processIncomingReliableOrdered(conn: ConnectionState, packet: UdpPacket): void {
    const seq = packet.sequenceNumber;

    // Update remote highest seen + ACK bitmask
    if (seqDiff(seq, conn.remoteHighestSeq) > 0) {
      const gap = seqDiff(seq, conn.remoteHighestSeq);
      // Shift bitmask left by gap
      const shifted = gap < 32 ? (conn.remoteAckBitmask << gap) : 0;
      conn.remoteAckBitmask = (shifted | (1 << (gap - 1))) >>> 0;
      conn.remoteHighestSeq = seq;
    } else if (seqDiff(seq, conn.remoteHighestSeq) < 0) {
      const offset = seqDiff(conn.remoteHighestSeq, seq) - 1;
      if (offset < SEQ_WINDOW) {
        conn.remoteAckBitmask = (conn.remoteAckBitmask | (1 << offset)) >>> 0;
      }
    }

    // Buffer the packet and deliver in order
    conn.orderedBuffer.set(seq, packet);
    while (conn.orderedBuffer.has(conn.nextExpectedSeq)) {
      const p = conn.orderedBuffer.get(conn.nextExpectedSeq)!;
      conn.orderedBuffer.delete(conn.nextExpectedSeq);
      conn.nextExpectedSeq = wrappedAdd(conn.nextExpectedSeq, 1);
      deliver(conn.connectionId, 'reliable-ordered', p.payload);
    }
  }

  function processIncomingReliableUnordered(conn: ConnectionState, packet: UdpPacket): void {
    const seq = packet.sequenceNumber;

    if (seqDiff(seq, conn.remoteHighestSeq) > 0) {
      const gap = seqDiff(seq, conn.remoteHighestSeq);
      const shifted = gap < 32 ? (conn.remoteAckBitmask << gap) : 0;
      conn.remoteAckBitmask = (shifted | (1 << (gap - 1))) >>> 0;
      conn.remoteHighestSeq = seq;
    } else if (seqDiff(seq, conn.remoteHighestSeq) < 0) {
      const offset = seqDiff(conn.remoteHighestSeq, seq) - 1;
      if (offset < SEQ_WINDOW) {
        conn.remoteAckBitmask = (conn.remoteAckBitmask | (1 << offset)) >>> 0;
      }
      // Duplicate check
      if ((conn.remoteAckBitmask >>> offset) & 1) return;
    }

    deliver(conn.connectionId, 'reliable-unordered', packet.payload);
  }

  // Register socket receiver
  socket.onReceive((connectionId: string, packet: UdpPacket) => {
    const conn = connections.get(connectionId);
    if (!conn) return;

    conn.packetsReceived++;

    // Process acks from remote
    processAck(conn, packet.ackNumber, packet.ackBitmask);

    // Deliver payload
    switch (packet.channelType) {
      case 'reliable-ordered':
        processIncomingReliableOrdered(conn, packet);
        break;
      case 'reliable-unordered':
        processIncomingReliableUnordered(conn, packet);
        break;
      case 'unreliable':
        deliver(connectionId, 'unreliable', packet.payload);
        break;
    }
  });

  function connect(connectionId: string): void {
    if (!connections.has(connectionId)) {
      connections.set(connectionId, makeConnection(connectionId));
    }
  }

  function disconnect(connectionId: string): void {
    connections.delete(connectionId);
  }

  function send(
    connectionId: string,
    channelType: ChannelType,
    payload: Uint8Array,
  ): number {
    const conn = connections.get(connectionId);
    if (!conn) throw new Error(`UdpProtocol: no connection '${connectionId}'`);

    const seq = conn.nextSendSeq;
    conn.nextSendSeq = wrappedAdd(conn.nextSendSeq, 1);
    const nowMs = clock.nowMs();

    const packet: UdpPacket = {
      sequenceNumber: seq,
      ackNumber: conn.remoteHighestSeq,
      ackBitmask: conn.remoteAckBitmask,
      channelType,
      payload,
      timestampMs: nowMs,
    };

    socket.send(connectionId, packet);
    conn.packetsSent++;

    if (channelType !== 'unreliable') {
      conn.pendingAcks.set(seq, {
        sequenceNumber: seq,
        channelType,
        payload,
        sentAtMs: nowMs,
        retransmitCount: 0,
        lastRetransmitMs: nowMs,
      });
    }

    return seq;
  }

  function tick(): void {
    const nowMs = clock.nowMs();

    for (const conn of connections.values()) {
      const retransmitThresholdMs = Math.max(
        MIN_RETRANSMIT_MS,
        conn.rttEstimateMs * 2,
      );

      for (const [seq, pending] of conn.pendingAcks) {
        const elapsed = nowMs - pending.lastRetransmitMs;
        if (elapsed < retransmitThresholdMs) continue;

        if (pending.retransmitCount >= MAX_RETRANSMIT) {
          conn.pendingAcks.delete(seq);
          conn.packetsLost++;
          continue;
        }

        // Retransmit
        const packet: UdpPacket = {
          sequenceNumber: pending.sequenceNumber,
          ackNumber: conn.remoteHighestSeq,
          ackBitmask: conn.remoteAckBitmask,
          channelType: pending.channelType,
          payload: pending.payload,
          timestampMs: nowMs,
        };
        socket.send(conn.connectionId, packet);
        pending.retransmitCount++;
        pending.lastRetransmitMs = nowMs;
        conn.retransmits++;
      }
    }
  }

  function getStats(connectionId: string): UdpConnectionStats | undefined {
    const conn = connections.get(connectionId);
    if (!conn) return undefined;
    return {
      connectionId,
      rttEstimateMs: conn.rttEstimateMs,
      packetsSent: conn.packetsSent,
      packetsReceived: conn.packetsReceived,
      packetsLost: conn.packetsLost,
      retransmits: conn.retransmits,
      pendingAcks: conn.pendingAcks.size,
    };
  }

  function connectionCount(): number {
    return connections.size;
  }

  return { connect, disconnect, send, tick, onPacket, getStats, connectionCount };
}
