/**
 * Connection — Single client connection state.
 *
 * Tracks handshake state, associated player entity,
 * input acknowledgement, and connection health.
 * Pure data — no WebSocket reference here (that's in the server).
 */

export type ConnectionState = 'pending' | 'handshaking' | 'active' | 'disconnecting';

export interface ConnectionInfo {
  readonly connectionId: string;
  readonly clientId: string;
  readonly state: ConnectionState;
  readonly playerEntityId: string | null;
  readonly worldId: string | null;
  readonly platform: string;
  readonly renderingTier: string;
  readonly connectedAt: number;
  readonly lastInputSequence: number;
  readonly lastInputAt: number;
  readonly messagesReceived: number;
  readonly messagesSent: number;
}

export interface MutableConnection {
  readonly connectionId: string;
  clientId: string;
  state: ConnectionState;
  playerEntityId: string | null;
  worldId: string | null;
  platform: string;
  renderingTier: string;
  readonly connectedAt: number;
  lastInputSequence: number;
  lastInputAt: number;
  messagesReceived: number;
  messagesSent: number;
}

export function createConnection(connectionId: string, connectedAt: number): MutableConnection {
  return {
    connectionId,
    clientId: '',
    state: 'pending',
    playerEntityId: null,
    worldId: null,
    platform: 'unknown',
    renderingTier: 'unknown',
    connectedAt,
    lastInputSequence: 0,
    lastInputAt: 0,
    messagesReceived: 0,
    messagesSent: 0,
  };
}

export function connectionToInfo(conn: MutableConnection): ConnectionInfo {
  return { ...conn };
}
