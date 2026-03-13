import { describe, it, expect } from 'vitest';
import { createConnection, connectionToInfo } from '../connection.js';

describe('Connection Simulation', () => {
  it('creates a pending connection with deterministic defaults', () => {
    const conn = createConnection('conn-1', 123_000);

    expect(conn.connectionId).toBe('conn-1');
    expect(conn.connectedAt).toBe(123_000);
    expect(conn.state).toBe('pending');
    expect(conn.clientId).toBe('');
    expect(conn.playerEntityId).toBeNull();
    expect(conn.worldId).toBeNull();
    expect(conn.platform).toBe('unknown');
    expect(conn.renderingTier).toBe('unknown');
    expect(conn.lastInputSequence).toBe(0);
    expect(conn.messagesReceived).toBe(0);
    expect(conn.messagesSent).toBe(0);
  });

  it('supports runtime mutation for lifecycle state tracking', () => {
    const conn = createConnection('conn-2', 222_000);

    conn.clientId = 'client-a';
    conn.state = 'active';
    conn.playerEntityId = 'player-1';
    conn.worldId = 'terra';
    conn.platform = 'pc';
    conn.renderingTier = 'high';
    conn.lastInputSequence = 77;
    conn.lastInputAt = 500_000;
    conn.messagesReceived = 12;
    conn.messagesSent = 20;

    expect(conn.state).toBe('active');
    expect(conn.lastInputSequence).toBe(77);
    expect(conn.messagesReceived).toBe(12);
    expect(conn.messagesSent).toBe(20);
  });

  it('converts mutable connection to read-only info snapshot', () => {
    const conn = createConnection('conn-3', 333_000);
    conn.clientId = 'client-z';
    conn.state = 'disconnecting';
    conn.playerEntityId = 'entity-z';
    conn.worldId = 'world-z';
    conn.messagesReceived = 3;
    conn.messagesSent = 4;

    const info = connectionToInfo(conn);

    expect(info.connectionId).toBe('conn-3');
    expect(info.clientId).toBe('client-z');
    expect(info.state).toBe('disconnecting');
    expect(info.playerEntityId).toBe('entity-z');
    expect(info.worldId).toBe('world-z');
    expect(info.messagesReceived).toBe(3);
    expect(info.messagesSent).toBe(4);
  });

  it('returns a detached object copy from connectionToInfo', () => {
    const conn = createConnection('conn-4', 444_000);
    const info = connectionToInfo(conn);

    conn.clientId = 'later-change';
    conn.messagesReceived = 99;

    expect(info.clientId).toBe('');
    expect(info.messagesReceived).toBe(0);
  });
});
