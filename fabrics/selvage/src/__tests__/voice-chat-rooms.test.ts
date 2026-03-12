/**
 * Voice Chat Rooms — Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVoiceChatRoomManager,
  INACTIVE_TIMEOUT_MS,
  type VoiceChatRoomManager,
  type VoiceChatDeps,
  type VoiceError,
  type VoiceParticipant,
} from '../voice-chat-rooms.js';

function createDeps(): VoiceChatDeps {
  let counter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    id: { generate: () => `id-${++counter}` },
    log: { info: () => {}, warn: () => {} },
    signaling: {
      sendOffer: () => {},
      sendAnswer: () => {},
      sendIceCandidate: () => {},
    },
  };
}

function isError(v: unknown): v is VoiceError {
  return typeof v === 'object' && v !== null && 'code' in v;
}

describe('VoiceChatRoomManager', () => {
  let mgr: VoiceChatRoomManager;

  beforeEach(() => {
    mgr = createVoiceChatRoomManager(createDeps());
  });

  describe('createRoom', () => {
    it('creates a proximity room', () => {
      const room = mgr.createRoom('proximity', 'Zone Chat', 'world-1', 'owner-1');
      expect(room.roomId).toBe('id-1');
      expect(room.roomType).toBe('proximity');
      expect(room.maxParticipants).toBe(32);
    });

    it('creates a party room with capacity 8', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      expect(room.maxParticipants).toBe(8);
    });

    it('creates an event room with capacity 256', () => {
      const room = mgr.createRoom('event', 'Arena', 'world-1', 'owner-1');
      expect(room.maxParticipants).toBe(256);
    });

    it('stores metadata', () => {
      const room = mgr.createRoom('dynasty', 'Dynasty Voice', 'world-1', 'owner-1', {
        dynastyId: 'dynasty-42',
      });
      expect(room.metadata['dynastyId']).toBe('dynasty-42');
    });
  });

  describe('joinRoom', () => {
    it('joins a player to a room', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const result = mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      expect(isError(result)).toBe(false);
      const p = result as VoiceParticipant;
      expect(p.playerId).toBe('player-1');
      expect(p.state).toBe('active');
      expect(p.volume).toBe(1.0);
    });

    it('rejects join to nonexistent room', () => {
      const result = mgr.joinRoom('no-room', 'player-1', 'Alice');
      expect(isError(result)).toBe(true);
      expect((result as VoiceError).code).toBe('room-not-found');
    });

    it('rejects join when room is full', () => {
      const deps = createDeps();
      const m = createVoiceChatRoomManager(deps);
      const room = m.createRoom('party', 'Squad', 'world-1', 'owner-1');
      for (let i = 0; i < 8; i++) {
        m.joinRoom(room.roomId, `player-${i}`, `P${i}`);
      }
      const result = m.joinRoom(room.roomId, 'player-9', 'P9');
      expect(isError(result)).toBe(true);
      expect((result as VoiceError).code).toBe('room-full');
    });

    it('rejects join if already in a room', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      const room2 = mgr.createRoom('party', 'Squad 2', 'world-1', 'owner-2');
      const result = mgr.joinRoom(room2.roomId, 'player-1', 'Alice');
      expect(isError(result)).toBe(true);
      expect((result as VoiceError).code).toBe('already-in-room');
    });

    it('stores spatial position', () => {
      const room = mgr.createRoom('proximity', 'Zone', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice', { x: 10, y: 20, z: 30 });
      const updated = mgr.getRoom(room.roomId);
      const participant = [...updated!.participants.values()][0];
      expect(participant.spatialPosition).toEqual({ x: 10, y: 20, z: 30 });
    });
  });

  describe('leaveRoom', () => {
    it('removes player from room', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      const result = mgr.leaveRoom('player-1');
      expect(result).toBe(true);
    });

    it('cleans up empty rooms', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      mgr.leaveRoom('player-1');
      expect(mgr.getRoom(room.roomId)).toBeUndefined();
    });

    it('returns error for player not in any room', () => {
      const result = mgr.leaveRoom('no-player');
      expect(isError(result)).toBe(true);
      expect((result as VoiceError).code).toBe('not-in-room');
    });
  });

  describe('participant controls', () => {
    it('mutes a participant', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const p = mgr.joinRoom(room.roomId, 'player-1', 'Alice') as VoiceParticipant;
      const result = mgr.setParticipantState(p.participantId, 'muted');
      expect(isError(result)).toBe(false);
      expect((result as VoiceParticipant).state).toBe('muted');
    });

    it('deafens a participant', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const p = mgr.joinRoom(room.roomId, 'player-1', 'Alice') as VoiceParticipant;
      const result = mgr.setParticipantState(p.participantId, 'deafened');
      expect((result as VoiceParticipant).state).toBe('deafened');
    });

    it('returns error for unknown participant', () => {
      const result = mgr.setParticipantState('nonexistent', 'muted');
      expect(isError(result)).toBe(true);
    });

    it('sets volume clamped between 0 and 2', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const p = mgr.joinRoom(room.roomId, 'player-1', 'Alice') as VoiceParticipant;
      const r1 = mgr.setVolume(p.participantId, 3.0) as VoiceParticipant;
      expect(r1.volume).toBe(2.0);
      const r2 = mgr.setVolume(p.participantId, -1.0) as VoiceParticipant;
      expect(r2.volume).toBe(0);
    });
  });

  describe('spatial position', () => {
    it('updates spatial position', () => {
      const room = mgr.createRoom('proximity', 'Zone', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      expect(mgr.updatePosition('player-1', { x: 50, y: 60, z: 70 })).toBe(true);
    });

    it('returns false for unknown player', () => {
      expect(mgr.updatePosition('unknown', { x: 0, y: 0, z: 0 })).toBe(false);
    });
  });

  describe('signaling relay', () => {
    it('relays offer to participant', () => {
      let offered = false;
      const deps = createDeps();
      deps.signaling.sendOffer = () => { offered = true; };
      const m = createVoiceChatRoomManager(deps);
      const room = m.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const p = m.joinRoom(room.roomId, 'player-1', 'Alice') as VoiceParticipant;
      expect(m.relayOffer(p.participantId, 'sdp-offer')).toBe(true);
      expect(offered).toBe(true);
    });

    it('relays answer to participant', () => {
      let answered = false;
      const deps = createDeps();
      deps.signaling.sendAnswer = () => { answered = true; };
      const m = createVoiceChatRoomManager(deps);
      const room = m.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const p = m.joinRoom(room.roomId, 'player-1', 'Alice') as VoiceParticipant;
      expect(m.relayAnswer(p.participantId, 'sdp-answer')).toBe(true);
      expect(answered).toBe(true);
    });

    it('relays ICE candidate', () => {
      let iced = false;
      const deps = createDeps();
      deps.signaling.sendIceCandidate = () => { iced = true; };
      const m = createVoiceChatRoomManager(deps);
      const room = m.createRoom('party', 'Squad', 'world-1', 'owner-1');
      const p = m.joinRoom(room.roomId, 'player-1', 'Alice') as VoiceParticipant;
      expect(m.relayIceCandidate(p.participantId, 'candidate-data')).toBe(true);
      expect(iced).toBe(true);
    });

    it('returns false for unknown participant', () => {
      expect(mgr.relayOffer('nope', 'sdp')).toBe(false);
    });
  });

  describe('sweepInactive', () => {
    it('removes inactive participants', () => {
      let time = 1_000_000;
      const deps: VoiceChatDeps = {
        clock: { nowMicroseconds: () => time },
        id: { generate: (() => { let c = 0; return () => `id-${++c}`; })() },
        log: { info: () => {}, warn: () => {} },
        signaling: { sendOffer: () => {}, sendAnswer: () => {}, sendIceCandidate: () => {} },
      };
      const m = createVoiceChatRoomManager(deps);
      const room = m.createRoom('party', 'Squad', 'world-1', 'owner-1');
      m.joinRoom(room.roomId, 'player-1', 'Alice');

      time += (INACTIVE_TIMEOUT_MS + 1) * 1_000;
      const swept = m.sweepInactive();
      expect(swept).toContain('player-1');
    });

    it('cleans up empty rooms after sweep', () => {
      let time = 1_000_000;
      const deps: VoiceChatDeps = {
        clock: { nowMicroseconds: () => time },
        id: { generate: (() => { let c = 0; return () => `id-${++c}`; })() },
        log: { info: () => {}, warn: () => {} },
        signaling: { sendOffer: () => {}, sendAnswer: () => {}, sendIceCandidate: () => {} },
      };
      const m = createVoiceChatRoomManager(deps);
      const room = m.createRoom('party', 'Squad', 'world-1', 'owner-1');
      m.joinRoom(room.roomId, 'player-1', 'Alice');

      time += (INACTIVE_TIMEOUT_MS + 1) * 1_000;
      m.sweepInactive();
      expect(m.getRoom(room.roomId)).toBeUndefined();
    });
  });

  describe('destroyRoom', () => {
    it('destroys a room and removes player mappings', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      expect(mgr.destroyRoom(room.roomId)).toBe(true);
      expect(mgr.getRoom(room.roomId)).toBeUndefined();
      expect(mgr.getRoomByPlayer('player-1')).toBeUndefined();
    });

    it('returns false for nonexistent room', () => {
      expect(mgr.destroyRoom('nope')).toBe(false);
    });
  });

  describe('queries', () => {
    it('lists rooms by world', () => {
      mgr.createRoom('party', 'A', 'world-1', 'owner-1');
      mgr.createRoom('party', 'B', 'world-2', 'owner-1');
      mgr.createRoom('party', 'C', 'world-1', 'owner-1');
      expect(mgr.listRooms('world-1')).toHaveLength(2);
      expect(mgr.listRooms()).toHaveLength(3);
    });

    it('gets room by player', () => {
      const room = mgr.createRoom('party', 'Squad', 'world-1', 'owner-1');
      mgr.joinRoom(room.roomId, 'player-1', 'Alice');
      const found = mgr.getRoomByPlayer('player-1');
      expect(found).toBeDefined();
      expect(found!.roomId).toBe(room.roomId);
    });

    it('returns stats', () => {
      mgr.createRoom('party', 'A', 'world-1', 'owner-1');
      mgr.createRoom('dynasty', 'B', 'world-1', 'owner-1');
      const stats = mgr.getStats();
      expect(stats.totalRooms).toBe(2);
      expect(stats.roomsByType['party']).toBe(1);
      expect(stats.roomsByType['dynasty']).toBe(1);
    });
  });
});
