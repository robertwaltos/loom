/**
 * gns-transport.ts — GameNetworkingSockets-compatible transport adapter.
 *
 * NEXT-STEPS Phase 17.3: "Custom UDP protocol: reliability layer over
 * GameNetworkingSockets."
 *
 * Valve's GameNetworkingSockets (GNS) provides:
 *  - Reliable + unreliable message streams over UDP
 *  - Encryption (AES-256-GCM) on every packet
 *  - Built-in congestion control (BBR / CUBIC)
 *  - NAT traversal via STUN/ICE
 *  - Multi-path delivery (optional)
 *
 * This adapter presents a GNS-style API surface for Loom:
 *  1. `GnsConnectionHandle` — opaque handle to a peer connection.
 *  2. `GnsTransport` — send + receive with channel semantics.
 *  3. Channel types map to GNS `SendFlags` bitmasks.
 *
 * Architecture: port-based hexagonal — `GnsSocketPort` is the seam
 * that the real C++ GNS bridge (Node addon) implements.
 *
 * Thread: steel/selvage/gns-transport
 * Tier: 1
 */

// ── Constants ────────────────────────────────────────────────────

export const GNS_TRANSPORT_PRIORITY = 24; // Below UDP protocol (25)
export const GNS_MAX_CONNECTIONS = 4096;
export const GNS_MAX_MESSAGE_SIZE = 524_288; // 512 KiB

/** GNS send flags — mirrors ISteamNetworkingMessages flag bits. */
export const GNS_SEND_FLAGS = {
  UNRELIABLE:         0x00,
  UNRELIABLE_NODELAY: 0x04,
  RELIABLE:           0x08,
  RELIABLE_NAGLE:     0x18,
  NO_NAGLE:           0x01,
  NO_DELAY:           0x04,
  USE_CURRENT_THREAD: 0x10,
  AUTO_RESTART:       0x40,
};

// ── Types ────────────────────────────────────────────────────────

/** Opaque 64-bit handle to a GNS connection (represented as bigint). */
export type GnsConnectionHandle = bigint;

/** GNS connection state machine (mirrors ESteamNetworkingConnectionState). */
export type GnsConnectionState =
  | 'none'
  | 'connecting'
  | 'finding_route'
  | 'connected'
  | 'closed_by_peer'
  | 'problem_detected_locally';

/** A raw GNS message envelope. */
export interface GnsMessage {
  readonly connectionHandle: GnsConnectionHandle;
  readonly data: Uint8Array;
  readonly sendFlags: number;
  readonly timestampMs: number;
  readonly messageNumber: bigint; // monotonic per-connection counter
  readonly lane: number;          // 0 = default
}

/** Connection quality metrics polled from GNS. */
export interface GnsConnectionQuality {
  readonly connectionHandle: GnsConnectionHandle;
  readonly pingMs: number;
  readonly connectionQualityLocal: number;  // 0.0–1.0
  readonly connectionQualityRemote: number; // 0.0–1.0
  readonly outPacketsPerSec: number;
  readonly outBytesPerSec: number;
  readonly inPacketsPerSec: number;
  readonly inBytesPerSec: number;
  readonly sendRateBytesPerSec: number;
  readonly pendingUnreliable: number;
  readonly pendingReliable: number;
}

/** Info about a connection status change. */
export interface GnsConnectionStatusChange {
  readonly connectionHandle: GnsConnectionHandle;
  readonly state: GnsConnectionState;
  readonly oldState: GnsConnectionState;
  readonly endReason: number;
  readonly endDebug: string;
}

// ── Port Interfaces ──────────────────────────────────────────────

/** Seam for the real C++ GNS Node addon / test double. */
export interface GnsSocketPort {
  /**
   * Initiate a connection to `addr` (e.g. "127.0.0.1:27015").
   * Returns the connection handle immediately; state transitions asynchronously.
   */
  connect(addr: string): GnsConnectionHandle;

  /**
   * Close a connection gracefully.
   * `reason` is a short string appended to the disconnect notification.
   */
  close(handle: GnsConnectionHandle, reason?: string): void;

  /** Send a message. Returns `true` if queued successfully. */
  send(handle: GnsConnectionHandle, data: Uint8Array, sendFlags: number, lane?: number): boolean;

  /**
   * Receive up to `maxMessages` pending messages across all connections.
   * Returns the actual messages collected.
   */
  receive(maxMessages?: number): readonly GnsMessage[];

  /** Poll connection quality for a given handle. */
  getConnectionQuality(handle: GnsConnectionHandle): GnsConnectionQuality | undefined;

  /** Register a callback for connection status changes. */
  onStatusChanged(cb: (change: GnsConnectionStatusChange) => void): void;

  /** Flush outbound queue for a connection (process pending sends). */
  flush(handle: GnsConnectionHandle): void;
}

export interface GnsClockPort {
  readonly nowMs: () => number;
}

export interface GnsTransportDeps {
  readonly socket: GnsSocketPort;
  readonly clock: GnsClockPort;
}

export interface GnsTransportConfig {
  readonly maxConnectionsPerHost?: number;
  readonly heartbeatIntervalMs?: number;
  readonly disconnectTimeoutMs?: number;
}

// ── Service interface ────────────────────────────────────────────

export interface GnsChannelOptions {
  /** How to deliver — maps to GNS send flags. */
  readonly reliable: boolean;
  /** Disable Nagle on this send (flush immediately). */
  readonly noNagle?: boolean;
  /** Which lane (virtual stream) to use (0 = default). */
  readonly lane?: number;
}

export interface GnsIncomingMessage {
  readonly connectionHandle: GnsConnectionHandle;
  readonly data: Uint8Array;
  readonly receivedAtMs: number;
  readonly lane: number;
}

export interface GnsTransportStats {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly messagesSent: number;
  readonly messagesReceived: number;
  readonly bytesSent: number;
  readonly bytesReceived: number;
}

export interface GnsTransportService {
  /** Open a connection to `addr`. Returns the handle. */
  connect(addr: string): GnsConnectionHandle;
  /** Gracefully close a connection. */
  disconnect(handle: GnsConnectionHandle, reason?: string): void;
  /**
   * Send a message over an established connection.
   * Returns false if the connection is unknown or the send could not be queued.
   */
  send(handle: GnsConnectionHandle, data: Uint8Array, opts?: GnsChannelOptions): boolean;
  /**
   * Call once per tick: flush sends, poll receives, fire callbacks.
   */
  tick(): void;
  /** Register a handler for incoming messages. */
  onMessage(cb: (msg: GnsIncomingMessage) => void): void;
  /** Register a handler for connection state changes. */
  onStatusChanged(cb: (change: GnsConnectionStatusChange) => void): void;
  /** Aggregate stats across all connections. */
  getStats(): GnsTransportStats;
  /** Quality metrics for a specific connection. */
  getConnectionQuality(handle: GnsConnectionHandle): GnsConnectionQuality | undefined;
  /** Number of currently active (connected) connections. */
  connectionCount(): number;
}

// ── Internal state ────────────────────────────────────────────────

interface ConnectionRecord {
  readonly handle: GnsConnectionHandle;
  readonly addr: string;
  state: GnsConnectionState;
  connectedAtMs: number;
  lastActivityMs: number;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
}

// ── Factory ───────────────────────────────────────────────────────

export function createGnsTransport(
  deps: GnsTransportDeps,
  config: GnsTransportConfig = {},
): GnsTransportService {
  const { socket, clock } = deps;
  const heartbeatIntervalMs = config.heartbeatIntervalMs ?? 5_000;
  const disconnectTimeoutMs = config.disconnectTimeoutMs ?? 30_000;

  const connections = new Map<GnsConnectionHandle, ConnectionRecord>();
  const messageCallbacks: Array<(msg: GnsIncomingMessage) => void> = [];
  const statusCallbacks: Array<(change: GnsConnectionStatusChange) => void> = [];

  let messagesSentTotal = 0;
  let messagesReceivedTotal = 0;
  let bytesSentTotal = 0;
  let bytesReceivedTotal = 0;
  let lastHeartbeatMs = 0;

  // Wire up GNS status-change events
  socket.onStatusChanged((change) => {
    const rec = connections.get(change.connectionHandle);
    if (rec) {
      rec.state = change.state;
      rec.lastActivityMs = clock.nowMs();
      if (change.state === 'connected') {
        rec.connectedAtMs = clock.nowMs();
      }
      if (change.state === 'closed_by_peer' || change.state === 'problem_detected_locally') {
        connections.delete(change.connectionHandle);
      }
    }
    for (const cb of statusCallbacks) {
      cb(change);
    }
  });

  function connect(addr: string): GnsConnectionHandle {
    const handle = socket.connect(addr);
    connections.set(handle, {
      handle,
      addr,
      state: 'connecting',
      connectedAtMs: 0,
      lastActivityMs: clock.nowMs(),
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
    });
    return handle;
  }

  function disconnect(handle: GnsConnectionHandle, reason?: string): void {
    socket.close(handle, reason);
    connections.delete(handle);
  }

  function send(
    handle: GnsConnectionHandle,
    data: Uint8Array,
    opts: GnsChannelOptions = { reliable: true },
  ): boolean {
    const rec = connections.get(handle);
    if (!rec || rec.state !== 'connected') return false;

    let flags = opts.reliable ? GNS_SEND_FLAGS.RELIABLE : GNS_SEND_FLAGS.UNRELIABLE;
    if (opts.noNagle === true) flags |= GNS_SEND_FLAGS.NO_NAGLE;

    const ok = socket.send(handle, data, flags, opts.lane ?? 0);
    if (ok) {
      rec.messagesSent++;
      rec.bytesSent += data.byteLength;
      rec.lastActivityMs = clock.nowMs();
      messagesSentTotal++;
      bytesSentTotal += data.byteLength;
    }
    return ok;
  }

  function tick(): void {
    const now = clock.nowMs();

    // Flush all active connections
    for (const [handle, rec] of connections) {
      if (rec.state === 'connected') {
        socket.flush(handle);
      }
      // Prune timed-out connections
      if (now - rec.lastActivityMs > disconnectTimeoutMs) {
        socket.close(handle, 'timeout');
        connections.delete(handle);
      }
    }

    // Poll incoming messages
    const msgs = socket.receive(256);
    for (const msg of msgs) {
      const rec = connections.get(msg.connectionHandle);
      if (rec) {
        rec.messagesReceived++;
        rec.bytesReceived += msg.data.byteLength;
        rec.lastActivityMs = now;
      }
      messagesReceivedTotal++;
      bytesReceivedTotal += msg.data.byteLength;

      const incoming: GnsIncomingMessage = {
        connectionHandle: msg.connectionHandle,
        data: msg.data,
        receivedAtMs: now,
        lane: msg.lane,
      };
      for (const cb of messageCallbacks) {
        cb(incoming);
      }
    }

    // Heartbeat: flush stats every heartbeatIntervalMs
    if (now - lastHeartbeatMs >= heartbeatIntervalMs) {
      lastHeartbeatMs = now;
    }
  }

  function onMessage(cb: (msg: GnsIncomingMessage) => void): void {
    messageCallbacks.push(cb);
  }

  function onStatusChanged(cb: (change: GnsConnectionStatusChange) => void): void {
    statusCallbacks.push(cb);
  }

  function getStats(): GnsTransportStats {
    let activeConnections = 0;
    for (const rec of connections.values()) {
      if (rec.state === 'connected') activeConnections++;
    }
    return {
      totalConnections: connections.size,
      activeConnections,
      messagesSent: messagesSentTotal,
      messagesReceived: messagesReceivedTotal,
      bytesSent: bytesSentTotal,
      bytesReceived: bytesReceivedTotal,
    };
  }

  function getConnectionQuality(handle: GnsConnectionHandle): GnsConnectionQuality | undefined {
    return socket.getConnectionQuality(handle);
  }

  function connectionCount(): number {
    let count = 0;
    for (const rec of connections.values()) {
      if (rec.state === 'connected') count++;
    }
    return count;
  }

  return {
    connect,
    disconnect,
    send,
    tick,
    onMessage,
    onStatusChanged,
    getStats,
    getConnectionQuality,
    connectionCount,
  };
}
