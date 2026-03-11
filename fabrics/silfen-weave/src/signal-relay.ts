/**
 * signal-relay.ts — Inter-world signal broadcasting and reception.
 *
 * Signals carry typed messages between worlds with a strength in dB (0–100).
 * Broadcast signals (null targetWorldId) appear in every world's list.
 * Up to 1000 signals may be held in the relay at once.
 * Each unique receiver may acknowledge a signal once.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface SignalClock {
  now(): bigint;
}

export interface SignalIdGenerator {
  generate(): string;
}

export interface SignalLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type SignalId = string;
export type SenderId = string;
export type WorldId = string;

export type SignalType = 'BROADCAST' | 'TARGETED' | 'EMERGENCY' | 'BEACON' | 'HANDSHAKE';

export type SignalError =
  | 'signal-not-found'
  | 'world-not-found'
  | 'relay-full'
  | 'invalid-strength'
  | 'already-acknowledged';

export interface Signal {
  readonly signalId: SignalId;
  readonly senderId: SenderId;
  readonly originWorldId: WorldId;
  readonly targetWorldId: WorldId | null;
  readonly type: SignalType;
  readonly message: string;
  readonly strengthDb: number;
  readonly sentAt: bigint;
  acknowledgedAt: bigint | null;
  receiverIds: ReadonlyArray<string>;
}

export interface RelayStats {
  readonly totalSignals: number;
  readonly acknowledgedCount: number;
  readonly averageStrengthDb: number;
  readonly byType: Record<SignalType, number>;
}

export interface SignalRelaySystem {
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: SignalError };
  readonly sendSignal: (
    senderId: SenderId,
    originWorldId: WorldId,
    targetWorldId: WorldId | null,
    type: SignalType,
    message: string,
    strengthDb: number,
  ) => Signal | SignalError;
  readonly acknowledgeSignal: (
    signalId: SignalId,
    receiverId: string,
  ) => { success: true } | { success: false; error: SignalError };
  readonly boostSignal: (
    signalId: SignalId,
    boostDb: number,
  ) => { success: true; newStrength: number } | { success: false; error: SignalError };
  readonly getSignal: (signalId: SignalId) => Signal | undefined;
  readonly listSignals: (worldId: WorldId, type?: SignalType) => ReadonlyArray<Signal>;
  readonly getStats: () => RelayStats;
}

// ── State ────────────────────────────────────────────────────────

interface SignalRelayState {
  readonly worlds: Set<WorldId>;
  readonly signals: Map<SignalId, Signal>;
  readonly clock: SignalClock;
  readonly idGen: SignalIdGenerator;
  readonly logger: SignalLogger;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_RELAY_SIGNALS = 1000;
const MIN_STRENGTH_DB = 0;
const MAX_STRENGTH_DB = 100;

// ── Helpers ──────────────────────────────────────────────────────

function isValidStrength(strength: number): boolean {
  return strength >= MIN_STRENGTH_DB && strength <= MAX_STRENGTH_DB;
}

function emptyByType(): Record<SignalType, number> {
  return { BROADCAST: 0, TARGETED: 0, EMERGENCY: 0, BEACON: 0, HANDSHAKE: 0 };
}

function signalMatchesWorld(signal: Signal, worldId: WorldId): boolean {
  return (
    signal.originWorldId === worldId ||
    signal.targetWorldId === worldId ||
    signal.targetWorldId === null
  );
}

// ── Operations ───────────────────────────────────────────────────

function registerWorld(
  state: SignalRelayState,
  worldId: WorldId,
): { success: true } | { success: false; error: SignalError } {
  state.worlds.add(worldId);
  state.logger.info('World registered in relay: ' + worldId);
  return { success: true };
}

function sendSignal(
  state: SignalRelayState,
  senderId: SenderId,
  originWorldId: WorldId,
  targetWorldId: WorldId | null,
  type: SignalType,
  message: string,
  strengthDb: number,
): Signal | SignalError {
  if (!isValidStrength(strengthDb)) {
    state.logger.error('Invalid signal strength: ' + String(strengthDb));
    return 'invalid-strength';
  }

  if (!state.worlds.has(originWorldId)) {
    state.logger.error('Origin world not registered: ' + originWorldId);
    return 'world-not-found';
  }

  if (state.signals.size >= MAX_RELAY_SIGNALS) {
    state.logger.warn('Signal relay full, cannot send signal from: ' + senderId);
    return 'relay-full';
  }

  const signal: Signal = {
    signalId: state.idGen.generate(),
    senderId,
    originWorldId,
    targetWorldId,
    type,
    message,
    strengthDb,
    sentAt: state.clock.now(),
    acknowledgedAt: null,
    receiverIds: [],
  };
  state.signals.set(signal.signalId, signal);
  state.logger.info('Signal sent: ' + signal.signalId);
  return signal;
}

function acknowledgeSignal(
  state: SignalRelayState,
  signalId: SignalId,
  receiverId: string,
): { success: true } | { success: false; error: SignalError } {
  const signal = state.signals.get(signalId);
  if (signal === undefined) return { success: false, error: 'signal-not-found' };

  if (signal.receiverIds.includes(receiverId)) {
    return { success: false, error: 'already-acknowledged' };
  }

  signal.receiverIds = [...signal.receiverIds, receiverId];
  signal.acknowledgedAt = state.clock.now();
  state.logger.info('Signal acknowledged: ' + signalId + ' by ' + receiverId);
  return { success: true };
}

function boostSignal(
  state: SignalRelayState,
  signalId: SignalId,
  boostDb: number,
): { success: true; newStrength: number } | { success: false; error: SignalError } {
  const signal = state.signals.get(signalId);
  if (signal === undefined) return { success: false, error: 'signal-not-found' };

  const newStrength = Math.min(MAX_STRENGTH_DB, signal.strengthDb + boostDb);
  const updated: Signal = { ...signal, strengthDb: newStrength };
  state.signals.set(signalId, updated);
  state.logger.info('Signal boosted: ' + signalId + ' to ' + String(newStrength) + 'dB');
  return { success: true, newStrength };
}

function listSignals(
  state: SignalRelayState,
  worldId: WorldId,
  type?: SignalType,
): ReadonlyArray<Signal> {
  const result: Signal[] = [];
  for (const signal of state.signals.values()) {
    if (!signalMatchesWorld(signal, worldId)) continue;
    if (type !== undefined && signal.type !== type) continue;
    result.push(signal);
  }
  return result;
}

function getStats(state: SignalRelayState): RelayStats {
  const byType = emptyByType();
  let acknowledgedCount = 0;
  let totalStrength = 0;

  for (const signal of state.signals.values()) {
    byType[signal.type]++;
    totalStrength += signal.strengthDb;
    if (signal.acknowledgedAt !== null) acknowledgedCount++;
  }

  const totalSignals = state.signals.size;
  const averageStrengthDb = totalSignals > 0 ? totalStrength / totalSignals : 0;

  return { totalSignals, acknowledgedCount, averageStrengthDb, byType };
}

// ── Factory ──────────────────────────────────────────────────────

export function createSignalRelaySystem(deps: {
  clock: SignalClock;
  idGen: SignalIdGenerator;
  logger: SignalLogger;
}): SignalRelaySystem {
  const state: SignalRelayState = {
    worlds: new Set(),
    signals: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerWorld: (worldId) => registerWorld(state, worldId),
    sendSignal: (sender, origin, target, type, message, strength) =>
      sendSignal(state, sender, origin, target, type, message, strength),
    acknowledgeSignal: (signalId, receiverId) => acknowledgeSignal(state, signalId, receiverId),
    boostSignal: (signalId, boostDb) => boostSignal(state, signalId, boostDb),
    getSignal: (signalId) => state.signals.get(signalId),
    listSignals: (worldId, type) => listSignals(state, worldId, type),
    getStats: () => getStats(state),
  };
}
