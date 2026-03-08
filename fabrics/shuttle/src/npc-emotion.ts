/**
 * NPC Emotion Model — Emotional state tracking for AI agents.
 *
 * Tracks per-entity emotional states with intensity and natural decay.
 * External stimuli raise or lower emotion intensities. The dominant
 * emotion feeds into the NPC Decision Engine to shape behavior.
 *
 * Plutchik's eight primary emotions:
 *   joy, trust, fear, surprise, sadness, disgust, anger, anticipation
 *
 * Intensity range: [0, 100]
 *   100 — overwhelming (panic, euphoria, rage)
 *    50 — moderate (concern, happiness, irritation)
 *     0 — absent
 *
 * Decay: Each emotion decays linearly per tick at its own rate.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type EmotionType =
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation';

export interface EmotionEntry {
  readonly type: EmotionType;
  readonly intensity: number;
  readonly decayRatePerSecond: number;
  readonly lastModifiedAt: number;
}

export interface EmotionSnapshot {
  readonly entityId: string;
  readonly emotions: ReadonlyArray<EmotionEntry>;
  readonly dominantEmotion: EmotionEntry | undefined;
  readonly takenAt: number;
}

export interface StimulusParams {
  readonly entityId: string;
  readonly emotion: EmotionType;
  readonly intensityDelta: number;
  readonly decayRatePerSecond?: number;
}

export interface StimulusResult {
  readonly emotion: EmotionType;
  readonly previousIntensity: number;
  readonly newIntensity: number;
  readonly delta: number;
}

export interface EmotionStats {
  readonly totalEntities: number;
  readonly totalActiveEmotions: number;
  readonly totalStimuliApplied: number;
  readonly totalDecayTicks: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface EmotionModelDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface NpcEmotionModel {
  registerEntity(entityId: string): boolean;
  removeEntity(entityId: string): boolean;
  applyStimulus(params: StimulusParams): StimulusResult;
  tick(deltaUs: number): number;
  getSnapshot(entityId: string): EmotionSnapshot | undefined;
  getDominantEmotion(entityId: string): EmotionEntry | undefined;
  getStats(): EmotionStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface MutableEmotion {
  type: EmotionType;
  intensity: number;
  decayRatePerSecond: number;
  lastModifiedAt: number;
}

interface EntityEmotions {
  readonly entityId: string;
  readonly emotions: Map<EmotionType, MutableEmotion>;
}

interface ModelState {
  readonly entities: Map<string, EntityEmotions>;
  readonly deps: EmotionModelDeps;
  totalStimuliApplied: number;
  totalDecayTicks: number;
}

const DEFAULT_DECAY_RATE = 5;
const MAX_INTENSITY = 100;
const MIN_INTENSITY = 0;
const MICROSECONDS_PER_SECOND = 1_000_000;

// ─── Factory ────────────────────────────────────────────────────────

export function createNpcEmotionModel(
  deps: EmotionModelDeps,
): NpcEmotionModel {
  const state: ModelState = {
    entities: new Map(),
    deps,
    totalStimuliApplied: 0,
    totalDecayTicks: 0,
  };

  return {
    registerEntity: (eid) => registerImpl(state, eid),
    removeEntity: (eid) => state.entities.delete(eid),
    applyStimulus: (p) => stimulusImpl(state, p),
    tick: (delta) => tickImpl(state, delta),
    getSnapshot: (eid) => snapshotImpl(state, eid),
    getDominantEmotion: (eid) => dominantImpl(state, eid),
    getStats: () => computeStats(state),
  };
}

// ─── Registration ───────────────────────────────────────────────────

function registerImpl(state: ModelState, entityId: string): boolean {
  if (state.entities.has(entityId)) return false;
  state.entities.set(entityId, {
    entityId,
    emotions: new Map(),
  });
  return true;
}

// ─── Stimulus ───────────────────────────────────────────────────────

function stimulusImpl(
  state: ModelState,
  params: StimulusParams,
): StimulusResult {
  const entity = state.entities.get(params.entityId);
  if (entity === undefined) {
    throw new Error('Entity not found: ' + params.entityId);
  }
  const existing = entity.emotions.get(params.emotion);
  const previous = existing?.intensity ?? 0;
  const raw = previous + params.intensityDelta;
  const clamped = clampIntensity(raw);
  updateOrCreateEmotion(state, entity, params, clamped);
  state.totalStimuliApplied += 1;
  return {
    emotion: params.emotion,
    previousIntensity: previous,
    newIntensity: clamped,
    delta: clamped - previous,
  };
}

function updateOrCreateEmotion(
  state: ModelState,
  entity: EntityEmotions,
  params: StimulusParams,
  intensity: number,
): void {
  const now = state.deps.clock.nowMicroseconds();
  const decay = params.decayRatePerSecond ?? DEFAULT_DECAY_RATE;
  if (intensity <= MIN_INTENSITY) {
    entity.emotions.delete(params.emotion);
    return;
  }
  const existing = entity.emotions.get(params.emotion);
  if (existing !== undefined) {
    existing.intensity = intensity;
    existing.decayRatePerSecond = decay;
    existing.lastModifiedAt = now;
  } else {
    entity.emotions.set(params.emotion, {
      type: params.emotion,
      intensity,
      decayRatePerSecond: decay,
      lastModifiedAt: now,
    });
  }
}

// ─── Tick / Decay ───────────────────────────────────────────────────

function tickImpl(state: ModelState, deltaUs: number): number {
  const seconds = deltaUs / MICROSECONDS_PER_SECOND;
  let totalDecayed = 0;
  for (const entity of state.entities.values()) {
    totalDecayed += decayEntity(entity, seconds);
  }
  state.totalDecayTicks += 1;
  return totalDecayed;
}

function decayEntity(entity: EntityEmotions, seconds: number): number {
  let decayed = 0;
  const toRemove: EmotionType[] = [];
  for (const emotion of entity.emotions.values()) {
    emotion.intensity -= emotion.decayRatePerSecond * seconds;
    if (emotion.intensity <= MIN_INTENSITY) {
      toRemove.push(emotion.type);
    }
    decayed += 1;
  }
  for (const key of toRemove) {
    entity.emotions.delete(key);
  }
  return decayed;
}

// ─── Queries ────────────────────────────────────────────────────────

function snapshotImpl(
  state: ModelState,
  entityId: string,
): EmotionSnapshot | undefined {
  const entity = state.entities.get(entityId);
  if (entity === undefined) return undefined;
  const entries = buildEntries(entity);
  return {
    entityId,
    emotions: entries,
    dominantEmotion: findDominant(entries),
    takenAt: state.deps.clock.nowMicroseconds(),
  };
}

function dominantImpl(
  state: ModelState,
  entityId: string,
): EmotionEntry | undefined {
  const entity = state.entities.get(entityId);
  if (entity === undefined) return undefined;
  return findDominant(buildEntries(entity));
}

function buildEntries(entity: EntityEmotions): ReadonlyArray<EmotionEntry> {
  const entries: EmotionEntry[] = [];
  for (const e of entity.emotions.values()) {
    entries.push({
      type: e.type,
      intensity: e.intensity,
      decayRatePerSecond: e.decayRatePerSecond,
      lastModifiedAt: e.lastModifiedAt,
    });
  }
  return entries;
}

function findDominant(
  entries: ReadonlyArray<EmotionEntry>,
): EmotionEntry | undefined {
  if (entries.length === 0) return undefined;
  let best = entries[0];
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    if (entry !== undefined && (best === undefined || entry.intensity > best.intensity)) {
      best = entry;
    }
  }
  return best;
}

// ─── Helpers ────────────────────────────────────────────────────────

function clampIntensity(value: number): number {
  if (value > MAX_INTENSITY) return MAX_INTENSITY;
  if (value < MIN_INTENSITY) return MIN_INTENSITY;
  return value;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ModelState): EmotionStats {
  let totalActive = 0;
  for (const entity of state.entities.values()) {
    totalActive += entity.emotions.size;
  }
  return {
    totalEntities: state.entities.size,
    totalActiveEmotions: totalActive,
    totalStimuliApplied: state.totalStimuliApplied,
    totalDecayTicks: state.totalDecayTicks,
  };
}
