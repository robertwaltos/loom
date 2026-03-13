import { describe, it, expect } from 'vitest';
import { createVoiceChatRoomManager, INACTIVE_TIMEOUT_MS } from '../voice-chat-rooms.js';

let idSeq = 0;
function makeManager() {
  idSeq = 0;
  const offers: unknown[] = [];
  return {
    manager: createVoiceChatRoomManager({
      clock: { nowMicroseconds: () => 1_000_000 },
      id: { generate: () => `room-${++idSeq}` },
      log: { info: () => {}, warn: () => {} },
      signaling: {
        sendOffer: (a: unknown) => { offers.push(a); },
        sendAnswer: () => {},
        sendIceCandidate: () => {},
      },
    }),
    offers,
  };
}

describe('Voice Chat Rooms Simulation', () => {
  it('creates a room and allows players to join', () => {
    const { manager } = makeManager();

    const room = manager.createRoom('party', 'Squad Voice', 'world-A', 'owner-1');
    expect(room).toBeDefined();
    expect(room.name).toBe('Squad Voice');
    expect(room.roomType).toBe('party');

    const result = manager.joinRoom(room.roomId, 'player-1', 'Alice');
    expect(result).not.toHaveProperty('code');
    expect((result as { playerId: string }).playerId).toBe('player-1');
  });

  it('lets players leave rooms', () => {
    const { manager } = makeManager();

    const room = manager.createRoom('proximity', 'World Chat', 'world-B', 'owner-2');
    manager.joinRoom(room.roomId, 'player-2', 'Bob');
    manager.leaveRoom('player-2');

    const updated = manager.getRoom(room.roomId);
    expect(updated).toBeUndefined();
  });

  it('returns error when joining a non-existent room', () => {
    const { manager } = makeManager();
    const result = manager.joinRoom('no-such-room', 'player-3', 'Charlie');
    expect((result as { code: string }).code).toBeDefined();
  });

  it('creates rooms of different types', () => {
    const { manager } = makeManager();

    const eventRoom = manager.createRoom('event', 'Championship Broadcast', 'world-C', 'host-1');
    const dynastyRoom = manager.createRoom('dynasty', 'Guild Council', 'world-D', 'leader-1');
    expect(eventRoom.roomType).toBe('event');
    expect(dynastyRoom.roomType).toBe('dynasty');
  });

  it('tracks stats', () => {
    const { manager } = makeManager();
    manager.createRoom('party', 'Test Room', 'world-E', 'host-2');
    const stats = manager.getStats();
    expect(stats.totalRooms).toBeGreaterThanOrEqual(1);
  });

  it('exposes INACTIVE_TIMEOUT_MS', () => {
    expect(typeof INACTIVE_TIMEOUT_MS).toBe('number');
    expect(INACTIVE_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
