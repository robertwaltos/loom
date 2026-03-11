/**
 * save-game.ts — Player game state persistence with slot management.
 *
 * Players register and own named save slots. Each slot holds ordered saves
 * identified by saveId. loadLatest returns the most recent save by savedAt.
 * Slot capacity is capped at MAX_SLOTS_PER_PLAYER. Deleting a slot removes
 * all saves within it.
 */

// ── Types ─────────────────────────────────────────────────────────

export type SaveId = string;
export type PlayerId = string;
export type SlotId = string;

export type SaveError =
  | 'player-not-found'
  | 'slot-not-found'
  | 'save-not-found'
  | 'slot-occupied'
  | 'invalid-name'
  | 'already-registered'
  | 'max-slots-exceeded';

export interface SaveSlot {
  readonly slotId: SlotId;
  readonly playerId: PlayerId;
  readonly name: string;
  readonly createdAt: bigint;
  readonly lastSavedAt: bigint;
  readonly saveCount: number;
  readonly sizeBytes: bigint;
}

export type SaveData = Record<string, string | number | boolean | bigint>;

export interface SaveState {
  readonly saveId: SaveId;
  readonly slotId: SlotId;
  readonly playerId: PlayerId;
  readonly data: SaveData;
  readonly savedAt: bigint;
  readonly checksum: string;
}

export interface SaveSummary {
  readonly playerId: PlayerId;
  readonly totalSlots: number;
  readonly totalSaves: number;
  readonly totalSizeBytes: bigint;
}

export interface SaveGameSystem {
  registerPlayer(playerId: PlayerId): { success: true } | { success: false; error: SaveError };
  createSlot(playerId: PlayerId, name: string): SaveSlot | SaveError;
  deleteSlot(slotId: SlotId): { success: true } | { success: false; error: SaveError };
  saveState(slotId: SlotId, data: SaveData): SaveState | SaveError;
  loadLatest(slotId: SlotId): SaveState | SaveError;
  getSave(saveId: SaveId): SaveState | undefined;
  listSlots(playerId: PlayerId): ReadonlyArray<SaveSlot>;
  getSummary(playerId: PlayerId): SaveSummary | undefined;
  listSaves(slotId: SlotId): ReadonlyArray<SaveState>;
}

// ── Ports ─────────────────────────────────────────────────────────

interface SaveClock {
  nowUs(): bigint;
}

interface SaveIdGenerator {
  generate(): string;
}

interface SaveLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface SaveGameDeps {
  readonly clock: SaveClock;
  readonly idGen: SaveIdGenerator;
  readonly logger: SaveLogger;
}

// ── Constants ─────────────────────────────────────────────────────

const MAX_SLOTS_PER_PLAYER = 5;
const SIZE_BYTES_PER_KEY = 64n;

// ── Internal State ────────────────────────────────────────────────

interface MutableSaveSlot {
  slotId: SlotId;
  playerId: PlayerId;
  name: string;
  createdAt: bigint;
  lastSavedAt: bigint;
  saveCount: number;
  sizeBytes: bigint;
}

interface SaveGameState {
  readonly players: Set<PlayerId>;
  readonly slots: Map<SlotId, MutableSaveSlot>;
  readonly saves: Map<SaveId, SaveState>;
  readonly slotSaves: Map<SlotId, SaveId[]>;
  readonly clock: SaveClock;
  readonly idGen: SaveIdGenerator;
  readonly logger: SaveLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function toReadonlySlot(slot: MutableSaveSlot): SaveSlot {
  return {
    slotId: slot.slotId,
    playerId: slot.playerId,
    name: slot.name,
    createdAt: slot.createdAt,
    lastSavedAt: slot.lastSavedAt,
    saveCount: slot.saveCount,
    sizeBytes: slot.sizeBytes,
  };
}

function countPlayerSlots(state: SaveGameState, playerId: PlayerId): number {
  let count = 0;
  for (const slot of state.slots.values()) {
    if (slot.playerId === playerId) count += 1;
  }
  return count;
}

function buildChecksum(saveId: SaveId, slotId: SlotId, savedAt: bigint): string {
  return saveId + ':' + slotId + ':' + String(savedAt);
}

function computeSizeBytes(data: SaveData): bigint {
  return BigInt(Object.keys(data).length) * SIZE_BYTES_PER_KEY;
}

// ── Operations ────────────────────────────────────────────────────

function registerPlayerImpl(
  state: SaveGameState,
  playerId: PlayerId,
): { success: true } | { success: false; error: SaveError } {
  if (state.players.has(playerId)) return { success: false, error: 'already-registered' };
  state.players.add(playerId);
  state.logger.info('save-player-registered playerId=' + playerId);
  return { success: true };
}

function createSlotImpl(
  state: SaveGameState,
  playerId: PlayerId,
  name: string,
): SaveSlot | SaveError {
  if (!state.players.has(playerId)) return 'player-not-found';
  if (name.trim().length === 0) return 'invalid-name';
  if (countPlayerSlots(state, playerId) >= MAX_SLOTS_PER_PLAYER) return 'max-slots-exceeded';

  const slotId = state.idGen.generate();
  const now = state.clock.nowUs();
  const slot: MutableSaveSlot = {
    slotId,
    playerId,
    name,
    createdAt: now,
    lastSavedAt: now,
    saveCount: 0,
    sizeBytes: 0n,
  };
  state.slots.set(slotId, slot);
  state.slotSaves.set(slotId, []);
  state.logger.info('save-slot-created slotId=' + slotId + ' playerId=' + playerId);
  return toReadonlySlot(slot);
}

function deleteSlotImpl(
  state: SaveGameState,
  slotId: SlotId,
): { success: true } | { success: false; error: SaveError } {
  if (!state.slots.has(slotId)) return { success: false, error: 'slot-not-found' };

  const saveIds = state.slotSaves.get(slotId) ?? [];
  for (const saveId of saveIds) {
    state.saves.delete(saveId);
  }
  state.slots.delete(slotId);
  state.slotSaves.delete(slotId);
  state.logger.info('save-slot-deleted slotId=' + slotId);
  return { success: true };
}

function saveStateImpl(
  state: SaveGameState,
  slotId: SlotId,
  data: SaveData,
): SaveState | SaveError {
  const slot = state.slots.get(slotId);
  if (slot === undefined) return 'slot-not-found';

  const saveId = state.idGen.generate();
  const savedAt = state.clock.nowUs();
  const checksum = buildChecksum(saveId, slotId, savedAt);
  const sizeBytes = computeSizeBytes(data);

  const saveEntry: SaveState = {
    saveId,
    slotId,
    playerId: slot.playerId,
    data,
    savedAt,
    checksum,
  };

  state.saves.set(saveId, saveEntry);
  const ids = state.slotSaves.get(slotId) ?? [];
  ids.push(saveId);
  state.slotSaves.set(slotId, ids);

  slot.saveCount += 1;
  slot.lastSavedAt = savedAt;
  slot.sizeBytes = slot.sizeBytes + sizeBytes;

  state.logger.info('save-state-saved saveId=' + saveId + ' slotId=' + slotId);
  return saveEntry;
}

function loadLatestImpl(state: SaveGameState, slotId: SlotId): SaveState | SaveError {
  if (!state.slots.has(slotId)) return 'slot-not-found';

  const saveIds = state.slotSaves.get(slotId) ?? [];
  let latest: SaveState | undefined;
  for (const saveId of saveIds) {
    const entry = state.saves.get(saveId);
    if (entry === undefined) continue;
    if (latest === undefined || entry.savedAt >= latest.savedAt) latest = entry;
  }

  if (latest === undefined) return 'save-not-found';
  return latest;
}

function listSlotsImpl(state: SaveGameState, playerId: PlayerId): ReadonlyArray<SaveSlot> {
  const result: SaveSlot[] = [];
  for (const slot of state.slots.values()) {
    if (slot.playerId === playerId) result.push(toReadonlySlot(slot));
  }
  return result;
}

function getSummaryImpl(state: SaveGameState, playerId: PlayerId): SaveSummary | undefined {
  if (!state.players.has(playerId)) return undefined;

  let totalSlots = 0;
  let totalSaves = 0;
  let totalSizeBytes = 0n;

  for (const slot of state.slots.values()) {
    if (slot.playerId !== playerId) continue;
    totalSlots += 1;
    totalSaves += slot.saveCount;
    totalSizeBytes = totalSizeBytes + slot.sizeBytes;
  }

  return { playerId, totalSlots, totalSaves, totalSizeBytes };
}

function listSavesImpl(state: SaveGameState, slotId: SlotId): ReadonlyArray<SaveState> {
  const saveIds = state.slotSaves.get(slotId) ?? [];
  const result: SaveState[] = [];
  for (const saveId of saveIds) {
    const entry = state.saves.get(saveId);
    if (entry !== undefined) result.push(entry);
  }
  return result;
}

// ── Factory ───────────────────────────────────────────────────────

export function createSaveGameSystem(deps: SaveGameDeps): SaveGameSystem {
  const state: SaveGameState = {
    players: new Set(),
    slots: new Map(),
    saves: new Map(),
    slotSaves: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerPlayer: (playerId) => registerPlayerImpl(state, playerId),
    createSlot: (playerId, name) => createSlotImpl(state, playerId, name),
    deleteSlot: (slotId) => deleteSlotImpl(state, slotId),
    saveState: (slotId, data) => saveStateImpl(state, slotId, data),
    loadLatest: (slotId) => loadLatestImpl(state, slotId),
    getSave: (saveId) => state.saves.get(saveId),
    listSlots: (playerId) => listSlotsImpl(state, playerId),
    getSummary: (playerId) => getSummaryImpl(state, playerId),
    listSaves: (slotId) => listSavesImpl(state, slotId),
  };
}
