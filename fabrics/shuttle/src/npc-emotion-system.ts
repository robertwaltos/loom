/**
 * NPC Emotion System - Event-driven emotional state machine for AI agents.
 *
 * NPCs start NEUTRAL and transition through eight primary emotions in response
 * to typed triggers (TRADE_SUCCESS, COMBAT_LOSS, ALLY_DIED, etc.).
 * Intensity is clamped to [0.0, 1.0]. When intensity reaches 0 via decay,
 * the emotion returns to NEUTRAL.
 *
 * A full event history is kept per NPC so the dominant emotion (most frequent)
 * can be derived for downstream decision-making.
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcEmotionSystemClock = {
  now(): bigint;
};

export type NpcEmotionSystemIdGen = {
  generate(): string;
};

export type NpcEmotionSystemLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcEmotionSystemDeps = {
  readonly clock: NpcEmotionSystemClock;
  readonly idGen: NpcEmotionSystemIdGen;
  readonly logger: NpcEmotionSystemLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type EmotionType =
  | 'NEUTRAL'
  | 'HAPPY'
  | 'ANGRY'
  | 'FEARFUL'
  | 'GRIEVING'
  | 'EXCITED'
  | 'DISGUSTED'
  | 'TRUSTING';

export type EmotionTrigger =
  | 'TRADE_SUCCESS'
  | 'TRADE_FAILURE'
  | 'COMBAT_WIN'
  | 'COMBAT_LOSS'
  | 'GIFT_RECEIVED'
  | 'BETRAYED'
  | 'ALLY_DIED'
  | 'DISCOVERY'
  | 'INSULT'
  | 'GREETING';

export type EmotionError = 'npc-not-found' | 'already-registered' | 'invalid-intensity';

export type EmotionState = {
  readonly npcId: string;
  currentEmotion: EmotionType;
  intensity: number; // [0.0, 1.0]
  previousEmotion: EmotionType | null;
  lastUpdated: bigint;
};

export type EmotionEvent = {
  readonly eventId: string;
  readonly npcId: string;
  readonly trigger: EmotionTrigger;
  readonly resultingEmotion: EmotionType;
  readonly intensityDelta: number;
  readonly occurredAt: bigint;
};

export type EmotionReport = {
  readonly npcId: string;
  readonly stateHistory: ReadonlyArray<EmotionEvent>;
  readonly dominantEmotion: EmotionType | null;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcEmotionSystemState = {
  readonly deps: NpcEmotionSystemDeps;
  readonly states: Map<string, EmotionState>;
  readonly history: Map<string, EmotionEvent[]>;
};

// ============================================================================
// CONSTANTS
// ============================================================================

type TriggerMapping = {
  readonly emotion: EmotionType;
  readonly delta: number;
};

const TRIGGER_MAP: Record<EmotionTrigger, TriggerMapping> = {
  TRADE_SUCCESS: { emotion: 'HAPPY', delta: 0.3 },
  TRADE_FAILURE: { emotion: 'ANGRY', delta: 0.2 },
  COMBAT_WIN: { emotion: 'EXCITED', delta: 0.4 },
  COMBAT_LOSS: { emotion: 'FEARFUL', delta: 0.5 },
  GIFT_RECEIVED: { emotion: 'HAPPY', delta: 0.4 },
  BETRAYED: { emotion: 'ANGRY', delta: 0.6 },
  ALLY_DIED: { emotion: 'GRIEVING', delta: 0.8 },
  DISCOVERY: { emotion: 'EXCITED', delta: 0.3 },
  INSULT: { emotion: 'ANGRY', delta: 0.3 },
  GREETING: { emotion: 'TRUSTING', delta: 0.1 },
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcEmotionState(deps: NpcEmotionSystemDeps): NpcEmotionSystemState {
  return {
    deps,
    states: new Map(),
    history: new Map(),
  };
}

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerNpcEmotion(
  state: NpcEmotionSystemState,
  npcId: string,
): { success: true } | { success: false; error: EmotionError } {
  if (state.states.has(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  const emotionState: EmotionState = {
    npcId,
    currentEmotion: 'NEUTRAL',
    intensity: 0.0,
    previousEmotion: null,
    lastUpdated: state.deps.clock.now(),
  };
  state.states.set(npcId, emotionState);
  state.history.set(npcId, []);
  state.deps.logger.info('npc-emotion-system: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// APPLY TRIGGER
// ============================================================================

export function applyEmotionTrigger(
  state: NpcEmotionSystemState,
  npcId: string,
  trigger: EmotionTrigger,
):
  | { success: true; state: EmotionState; event: EmotionEvent }
  | { success: false; error: EmotionError } {
  const emotionState = state.states.get(npcId);
  if (emotionState === undefined) return { success: false, error: 'npc-not-found' };
  const mapping = TRIGGER_MAP[trigger];
  const now = state.deps.clock.now();
  emotionState.previousEmotion = emotionState.currentEmotion;
  emotionState.currentEmotion = mapping.emotion;
  emotionState.intensity = clampIntensity(emotionState.intensity + mapping.delta);
  emotionState.lastUpdated = now;
  const event: EmotionEvent = {
    eventId: state.deps.idGen.generate(),
    npcId,
    trigger,
    resultingEmotion: mapping.emotion,
    intensityDelta: mapping.delta,
    occurredAt: now,
  };
  state.history.get(npcId)?.push(event);
  state.deps.logger.info('npc-emotion-system: ' + npcId + ' triggered ' + trigger);
  return { success: true, state: emotionState, event };
}

// ============================================================================
// SET INTENSITY
// ============================================================================

export function setEmotionIntensity(
  state: NpcEmotionSystemState,
  npcId: string,
  intensity: number,
): { success: true } | { success: false; error: EmotionError } {
  if (intensity < 0 || intensity > 1) return { success: false, error: 'invalid-intensity' };
  const emotionState = state.states.get(npcId);
  if (emotionState === undefined) return { success: false, error: 'npc-not-found' };
  emotionState.intensity = intensity;
  emotionState.lastUpdated = state.deps.clock.now();
  return { success: true };
}

// ============================================================================
// DECAY INTENSITY
// ============================================================================

export function decayEmotionIntensity(
  state: NpcEmotionSystemState,
  npcId: string,
  amount: number,
): { success: true; newIntensity: number } | { success: false; error: EmotionError } {
  const emotionState = state.states.get(npcId);
  if (emotionState === undefined) return { success: false, error: 'npc-not-found' };
  emotionState.intensity = clampIntensity(emotionState.intensity - amount);
  if (emotionState.intensity === 0) {
    emotionState.previousEmotion = emotionState.currentEmotion;
    emotionState.currentEmotion = 'NEUTRAL';
  }
  emotionState.lastUpdated = state.deps.clock.now();
  return { success: true, newIntensity: emotionState.intensity };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getEmotionState(
  state: NpcEmotionSystemState,
  npcId: string,
): EmotionState | undefined {
  return state.states.get(npcId);
}

export function getEmotionReport(
  state: NpcEmotionSystemState,
  npcId: string,
): EmotionReport | undefined {
  if (!state.states.has(npcId)) return undefined;
  const history = state.history.get(npcId) ?? [];
  return {
    npcId,
    stateHistory: history,
    dominantEmotion: computeDominantEmotion(history),
  };
}

export function listEmotionNpcs(state: NpcEmotionSystemState): ReadonlyArray<EmotionState> {
  return Array.from(state.states.values());
}

// ============================================================================
// HELPERS
// ============================================================================

function clampIntensity(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function computeDominantEmotion(history: ReadonlyArray<EmotionEvent>): EmotionType | null {
  if (history.length === 0) return null;
  const counts = new Map<EmotionType, number>();
  for (const event of history) {
    counts.set(event.resultingEmotion, (counts.get(event.resultingEmotion) ?? 0) + 1);
  }
  let dominant: EmotionType | null = null;
  let max = 0;
  for (const [emotion, count] of counts) {
    if (count > max) {
      max = count;
      dominant = emotion;
    }
  }
  return dominant;
}
