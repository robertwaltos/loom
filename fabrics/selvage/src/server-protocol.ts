/**
 * Server Protocol — Message types for Loom ↔ Client communication.
 *
 * MVP Target Path T0.1: These define the logical messages that flow
 * over WebSocket between The Loom Server and rendering clients
 * (UE5 via Bridge Loom, or test clients).
 *
 * Serialization is pluggable — MessagePack for development,
 * FlatBuffers for production. The protocol types are format-agnostic.
 */

// ─── Handshake ──────────────────────────────────────────────────

export interface ClientHello {
  readonly type: 'client-hello';
  readonly protocolVersion: number;
  readonly clientId: string;
  readonly platform: string;
  readonly renderingTier: string;
}

export interface ServerWelcome {
  readonly type: 'server-welcome';
  readonly protocolVersion: number;
  readonly serverId: string;
  readonly tickRateHz: number;
  readonly playerEntityId: string;
  readonly worldId: string;
  readonly serverTimestamp: number;
}

// ─── Client → Server ────────────────────────────────────────────

export interface ClientInput {
  readonly type: 'client-input';
  readonly sequence: number;
  readonly timestamp: number;
  readonly actions: ReadonlyArray<InputAction>;
}

export interface InputAction {
  readonly actionType: string;
  readonly payload: Record<string, unknown>;
}

// ─── Server → Client ────────────────────────────────────────────

export interface ServerSnapshot {
  readonly type: 'server-snapshot';
  readonly tick: number;
  readonly timestamp: number;
  readonly lastAckedInput: number;
  readonly entities: ReadonlyArray<EntityUpdate>;
}

export interface EntityUpdate {
  readonly entityId: string;
  readonly entityType: string;
  readonly components: Record<string, unknown>;
}

export interface EntitySpawnMessage {
  readonly type: 'entity-spawn';
  readonly entityId: string;
  readonly entityType: string;
  readonly worldId: string;
  readonly components: Record<string, unknown>;
}

export interface EntityDespawnMessage {
  readonly type: 'entity-despawn';
  readonly entityId: string;
  readonly reason: string;
}

export interface SystemMessage {
  readonly type: 'system-message';
  readonly category: 'info' | 'warning' | 'error' | 'announcement';
  readonly content: string;
  readonly timestamp: number;
}

export interface ServerDisconnect {
  readonly type: 'server-disconnect';
  readonly reason: string;
  readonly canReconnect: boolean;
}

// ─── Union Types ─────────────────────────────────────────────────

export type ClientMessage = ClientHello | ClientInput;

export type ServerMessage =
  | ServerWelcome
  | ServerSnapshot
  | EntitySpawnMessage
  | EntityDespawnMessage
  | SystemMessage
  | ServerDisconnect;

// ─── Protocol Constants ──────────────────────────────────────────

export const PROTOCOL_VERSION = 1;

export const MAX_INPUT_ACTIONS_PER_MESSAGE = 16;
export const MAX_MESSAGE_SIZE_BYTES = 65536;

// ─── Type Guards ─────────────────────────────────────────────────

export function isClientHello(msg: unknown): msg is ClientHello {
  return isObjectWithType(msg, 'client-hello');
}

export function isClientInput(msg: unknown): msg is ClientInput {
  return isObjectWithType(msg, 'client-input');
}

function isObjectWithType(value: unknown, expectedType: string): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return (value as Record<string, unknown>)['type'] === expectedType;
}
