/**
 * Voice Chat Rooms — Player-to-player live voice communication.
 *
 * WebRTC-based voice rooms with proximity, group, and dynasty scoping.
 * Supports:
 *   - proximity   → Players within audible range (spatial audio)
 *   - party       → Small group voice (up to 8)
 *   - dynasty     → Dynasty-wide voice channel
 *   - alliance    → Allied dynasties voice
 *   - event       → Event arena spectator/participant channels
 *
 * Each room has a capacity cap, mute/deafen controls, and
 * automatic pruning of inactive participants.
 *
 * Thread: cotton/selvage/voice-chat-rooms
 * Tier: 1
 */

// ── Ports ────────────────────────────────────────────────────────

export interface VoiceClockPort {
  readonly nowMicroseconds: () => number;
}

export interface VoiceIdPort {
  readonly generate: () => string;
}

export interface VoiceLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface VoiceSignalingPort {
  readonly sendOffer: (participantId: string, sdp: string) => void;
  readonly sendAnswer: (participantId: string, sdp: string) => void;
  readonly sendIceCandidate: (participantId: string, candidate: string) => void;
}

// ── Types ────────────────────────────────────────────────────────

export type VoiceRoomType = 'proximity' | 'party' | 'dynasty' | 'alliance' | 'event';

export type ParticipantState = 'connecting' | 'active' | 'muted' | 'deafened' | 'disconnected';

export interface VoiceParticipant {
  readonly participantId: string;
  readonly playerId: string;
  readonly displayName: string;
  readonly state: ParticipantState;
  readonly joinedAtMs: number;
  readonly lastActivityMs: number;
  readonly volume: number;
  readonly spatialPosition: { readonly x: number; readonly y: number; readonly z: number } | null;
}

export interface VoiceRoom {
  readonly roomId: string;
  readonly roomType: VoiceRoomType;
  readonly name: string;
  readonly worldId: string;
  readonly maxParticipants: number;
  readonly participants: ReadonlyMap<string, VoiceParticipant>;
  readonly createdAtMs: number;
  readonly ownerId: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface VoiceRoomStats {
  readonly totalRooms: number;
  readonly totalParticipants: number;
  readonly roomsByType: Readonly<Record<VoiceRoomType, number>>;
}

// ── Room Capacity Defaults ───────────────────────────────────────

const ROOM_CAPACITY: Record<VoiceRoomType, number> = {
  proximity: 32,
  party: 8,
  dynasty: 64,
  alliance: 128,
  event: 256,
};

const INACTIVE_TIMEOUT_MS = 120_000;

// ── Room State ───────────────────────────────────────────────────

interface MutableVoiceRoom {
  readonly roomId: string;
  readonly roomType: VoiceRoomType;
  readonly name: string;
  readonly worldId: string;
  readonly maxParticipants: number;
  readonly participants: Map<string, VoiceParticipant>;
  readonly createdAtMs: number;
  readonly ownerId: string;
  readonly metadata: Record<string, string>;
}

interface VoiceChatState {
  readonly clock: VoiceClockPort;
  readonly id: VoiceIdPort;
  readonly log: VoiceLogPort;
  readonly signaling: VoiceSignalingPort;
  readonly rooms: Map<string, MutableVoiceRoom>;
  readonly playerToRoom: Map<string, string>;
}

// ── Errors ───────────────────────────────────────────────────────

export type VoiceError =
  | { readonly code: 'room-not-found'; readonly roomId: string }
  | { readonly code: 'room-full'; readonly roomId: string }
  | { readonly code: 'already-in-room'; readonly playerId: string; readonly roomId: string }
  | { readonly code: 'not-in-room'; readonly playerId: string }
  | { readonly code: 'participant-not-found'; readonly participantId: string };

// ── Create Room ──────────────────────────────────────────────────

function createRoom(
  state: VoiceChatState,
  roomType: VoiceRoomType,
  name: string,
  worldId: string,
  ownerId: string,
  metadata?: Record<string, string>,
): VoiceRoom {
  const roomId = state.id.generate();
  const nowMs = state.clock.nowMicroseconds() / 1_000;
  const room: MutableVoiceRoom = {
    roomId,
    roomType,
    name,
    worldId,
    maxParticipants: ROOM_CAPACITY[roomType],
    participants: new Map(),
    createdAtMs: nowMs,
    ownerId,
    metadata: metadata ?? {},
  };
  state.rooms.set(roomId, room);
  state.log.info({ roomId, roomType, worldId }, 'Voice room created');
  return toPublicRoom(room);
}

// ── Join Room ────────────────────────────────────────────────────

function joinRoom(
  state: VoiceChatState,
  roomId: string,
  playerId: string,
  displayName: string,
  spatialPosition?: { x: number; y: number; z: number },
): VoiceParticipant | VoiceError {
  const room = state.rooms.get(roomId);
  if (!room) return { code: 'room-not-found', roomId };

  const existingRoomId = state.playerToRoom.get(playerId);
  if (existingRoomId) return { code: 'already-in-room', playerId, roomId: existingRoomId };

  if (room.participants.size >= room.maxParticipants) {
    return { code: 'room-full', roomId };
  }

  const nowMs = state.clock.nowMicroseconds() / 1_000;
  const participantId = state.id.generate();
  const participant: VoiceParticipant = {
    participantId,
    playerId,
    displayName,
    state: 'active',
    joinedAtMs: nowMs,
    lastActivityMs: nowMs,
    volume: 1.0,
    spatialPosition: spatialPosition ?? null,
  };

  room.participants.set(participantId, participant);
  state.playerToRoom.set(playerId, roomId);

  state.log.info({ roomId, playerId, participantId }, 'Player joined voice room');
  return participant;
}

// ── Leave Room ───────────────────────────────────────────────────

function leaveRoom(
  state: VoiceChatState,
  playerId: string,
): boolean | VoiceError {
  const roomId = state.playerToRoom.get(playerId);
  if (!roomId) return { code: 'not-in-room', playerId };

  const room = state.rooms.get(roomId);
  if (!room) return { code: 'room-not-found', roomId };

  for (const [id, p] of room.participants) {
    if (p.playerId === playerId) {
      room.participants.delete(id);
      break;
    }
  }

  state.playerToRoom.delete(playerId);
  state.log.info({ roomId, playerId }, 'Player left voice room');

  if (room.participants.size === 0) {
    state.rooms.delete(roomId);
    state.log.info({ roomId }, 'Empty voice room cleaned up');
  }

  return true;
}

// ── Mute/Deafen ──────────────────────────────────────────────────

function setParticipantState(
  state: VoiceChatState,
  participantId: string,
  newState: ParticipantState,
): VoiceParticipant | VoiceError {
  for (const room of state.rooms.values()) {
    const participant = room.participants.get(participantId);
    if (participant) {
      const updated: VoiceParticipant = {
        ...participant,
        state: newState,
        lastActivityMs: state.clock.nowMicroseconds() / 1_000,
      };
      room.participants.set(participantId, updated);
      return updated;
    }
  }
  return { code: 'participant-not-found', participantId };
}

// ── Volume Control ───────────────────────────────────────────────

function setParticipantVolume(
  state: VoiceChatState,
  participantId: string,
  volume: number,
): VoiceParticipant | VoiceError {
  const clampedVolume = Math.max(0, Math.min(2, volume));
  for (const room of state.rooms.values()) {
    const participant = room.participants.get(participantId);
    if (participant) {
      const updated: VoiceParticipant = { ...participant, volume: clampedVolume };
      room.participants.set(participantId, updated);
      return updated;
    }
  }
  return { code: 'participant-not-found', participantId };
}

// ── Spatial Update ───────────────────────────────────────────────

function updateSpatialPosition(
  state: VoiceChatState,
  playerId: string,
  position: { x: number; y: number; z: number },
): boolean {
  const roomId = state.playerToRoom.get(playerId);
  if (!roomId) return false;
  const room = state.rooms.get(roomId);
  if (!room) return false;

  for (const [id, p] of room.participants) {
    if (p.playerId === playerId) {
      room.participants.set(id, {
        ...p,
        spatialPosition: position,
        lastActivityMs: state.clock.nowMicroseconds() / 1_000,
      });
      return true;
    }
  }
  return false;
}

// ── Sweep Inactive ───────────────────────────────────────────────

function sweepInactive(state: VoiceChatState): ReadonlyArray<string> {
  const nowMs = state.clock.nowMicroseconds() / 1_000;
  const removed: string[] = [];

  for (const room of state.rooms.values()) {
    const toRemove: string[] = [];
    for (const [id, p] of room.participants) {
      if (nowMs - p.lastActivityMs > INACTIVE_TIMEOUT_MS) {
        toRemove.push(id);
        state.playerToRoom.delete(p.playerId);
        removed.push(p.playerId);
      }
    }
    for (const id of toRemove) room.participants.delete(id);
  }

  const emptyRooms: string[] = [];
  for (const [roomId, room] of state.rooms) {
    if (room.participants.size === 0) emptyRooms.push(roomId);
  }
  for (const roomId of emptyRooms) state.rooms.delete(roomId);

  return removed;
}

// ── Signaling ────────────────────────────────────────────────────

function relayOffer(
  state: VoiceChatState,
  targetParticipantId: string,
  sdp: string,
): boolean {
  for (const room of state.rooms.values()) {
    const participant = room.participants.get(targetParticipantId);
    if (participant) {
      state.signaling.sendOffer(targetParticipantId, sdp);
      return true;
    }
  }
  return false;
}

function relayAnswer(
  state: VoiceChatState,
  targetParticipantId: string,
  sdp: string,
): boolean {
  for (const room of state.rooms.values()) {
    const participant = room.participants.get(targetParticipantId);
    if (participant) {
      state.signaling.sendAnswer(targetParticipantId, sdp);
      return true;
    }
  }
  return false;
}

function relayIceCandidate(
  state: VoiceChatState,
  targetParticipantId: string,
  candidate: string,
): boolean {
  for (const room of state.rooms.values()) {
    const participant = room.participants.get(targetParticipantId);
    if (participant) {
      state.signaling.sendIceCandidate(targetParticipantId, candidate);
      return true;
    }
  }
  return false;
}

// ── Query ────────────────────────────────────────────────────────

function getRoom(state: VoiceChatState, roomId: string): VoiceRoom | undefined {
  const room = state.rooms.get(roomId);
  return room ? toPublicRoom(room) : undefined;
}

function getRoomByPlayer(state: VoiceChatState, playerId: string): VoiceRoom | undefined {
  const roomId = state.playerToRoom.get(playerId);
  if (!roomId) return undefined;
  return getRoom(state, roomId);
}

function listRooms(state: VoiceChatState, worldId?: string): ReadonlyArray<VoiceRoom> {
  const result: VoiceRoom[] = [];
  for (const room of state.rooms.values()) {
    if (!worldId || room.worldId === worldId) {
      result.push(toPublicRoom(room));
    }
  }
  return result;
}

function getStats(state: VoiceChatState): VoiceRoomStats {
  const roomsByType: Record<VoiceRoomType, number> = {
    proximity: 0,
    party: 0,
    dynasty: 0,
    alliance: 0,
    event: 0,
  };
  let totalParticipants = 0;
  for (const room of state.rooms.values()) {
    roomsByType[room.roomType] += 1;
    totalParticipants += room.participants.size;
  }
  return {
    totalRooms: state.rooms.size,
    totalParticipants,
    roomsByType,
  };
}

// ── Conversion ───────────────────────────────────────────────────

function toPublicRoom(room: MutableVoiceRoom): VoiceRoom {
  return {
    roomId: room.roomId,
    roomType: room.roomType,
    name: room.name,
    worldId: room.worldId,
    maxParticipants: room.maxParticipants,
    participants: new Map(room.participants),
    createdAtMs: room.createdAtMs,
    ownerId: room.ownerId,
    metadata: { ...room.metadata },
  };
}

// ── Destroy Room ─────────────────────────────────────────────────

function destroyRoom(state: VoiceChatState, roomId: string): boolean {
  const room = state.rooms.get(roomId);
  if (!room) return false;

  for (const p of room.participants.values()) {
    state.playerToRoom.delete(p.playerId);
  }
  state.rooms.delete(roomId);
  state.log.info({ roomId }, 'Voice room destroyed');
  return true;
}

// ── Public Interface ─────────────────────────────────────────────

export interface VoiceChatRoomManager {
  readonly createRoom: (
    roomType: VoiceRoomType,
    name: string,
    worldId: string,
    ownerId: string,
    metadata?: Record<string, string>,
  ) => VoiceRoom;
  readonly joinRoom: (
    roomId: string,
    playerId: string,
    displayName: string,
    spatialPosition?: { x: number; y: number; z: number },
  ) => VoiceParticipant | VoiceError;
  readonly leaveRoom: (playerId: string) => boolean | VoiceError;
  readonly destroyRoom: (roomId: string) => boolean;
  readonly setParticipantState: (
    participantId: string,
    state: ParticipantState,
  ) => VoiceParticipant | VoiceError;
  readonly setVolume: (
    participantId: string,
    volume: number,
  ) => VoiceParticipant | VoiceError;
  readonly updatePosition: (
    playerId: string,
    position: { x: number; y: number; z: number },
  ) => boolean;
  readonly relayOffer: (targetParticipantId: string, sdp: string) => boolean;
  readonly relayAnswer: (targetParticipantId: string, sdp: string) => boolean;
  readonly relayIceCandidate: (targetParticipantId: string, candidate: string) => boolean;
  readonly sweepInactive: () => ReadonlyArray<string>;
  readonly getRoom: (roomId: string) => VoiceRoom | undefined;
  readonly getRoomByPlayer: (playerId: string) => VoiceRoom | undefined;
  readonly listRooms: (worldId?: string) => ReadonlyArray<VoiceRoom>;
  readonly getStats: () => VoiceRoomStats;
}

export interface VoiceChatDeps {
  readonly clock: VoiceClockPort;
  readonly id: VoiceIdPort;
  readonly log: VoiceLogPort;
  readonly signaling: VoiceSignalingPort;
}

// ── Factory ──────────────────────────────────────────────────────

function createVoiceChatRoomManager(deps: VoiceChatDeps): VoiceChatRoomManager {
  const state: VoiceChatState = {
    clock: deps.clock,
    id: deps.id,
    log: deps.log,
    signaling: deps.signaling,
    rooms: new Map(),
    playerToRoom: new Map(),
  };

  return {
    createRoom: (type, name, worldId, ownerId, meta) =>
      createRoom(state, type, name, worldId, ownerId, meta),
    joinRoom: (roomId, playerId, name, pos) =>
      joinRoom(state, roomId, playerId, name, pos),
    leaveRoom: (playerId) => leaveRoom(state, playerId),
    destroyRoom: (roomId) => destroyRoom(state, roomId),
    setParticipantState: (pid, s) => setParticipantState(state, pid, s),
    setVolume: (pid, v) => setParticipantVolume(state, pid, v),
    updatePosition: (playerId, pos) => updateSpatialPosition(state, playerId, pos),
    relayOffer: (pid, sdp) => relayOffer(state, pid, sdp),
    relayAnswer: (pid, sdp) => relayAnswer(state, pid, sdp),
    relayIceCandidate: (pid, c) => relayIceCandidate(state, pid, c),
    sweepInactive: () => sweepInactive(state),
    getRoom: (id) => getRoom(state, id),
    getRoomByPlayer: (pid) => getRoomByPlayer(state, pid),
    listRooms: (worldId) => listRooms(state, worldId),
    getStats: () => getStats(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createVoiceChatRoomManager, ROOM_CAPACITY, INACTIVE_TIMEOUT_MS };
