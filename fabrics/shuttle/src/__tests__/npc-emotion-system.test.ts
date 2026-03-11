import { describe, it, expect, beforeEach } from 'vitest';
import type {
  NpcEmotionSystemState,
  NpcEmotionSystemDeps,
  EmotionTrigger,
} from '../npc-emotion-system.js';
import {
  createNpcEmotionState,
  registerNpcEmotion,
  applyEmotionTrigger,
  setEmotionIntensity,
  decayEmotionIntensity,
  getEmotionState,
  getEmotionReport,
  listEmotionNpcs,
} from '../npc-emotion-system.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcEmotionSystemDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'evt-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcEmotionSystem - Registration', () => {
  let state: NpcEmotionSystemState;

  beforeEach(() => {
    state = createNpcEmotionState(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = registerNpcEmotion(state, 'npc-1');
    expect(result.success).toBe(true);
  });

  it('should start registered NPC in NEUTRAL state', () => {
    registerNpcEmotion(state, 'npc-1');
    const s = getEmotionState(state, 'npc-1');
    expect(s?.currentEmotion).toBe('NEUTRAL');
    expect(s?.intensity).toBe(0.0);
    expect(s?.previousEmotion).toBeNull();
  });

  it('should return already-registered for duplicate NPC', () => {
    registerNpcEmotion(state, 'npc-1');
    const result = registerNpcEmotion(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should allow multiple distinct NPCs', () => {
    const r1 = registerNpcEmotion(state, 'npc-1');
    const r2 = registerNpcEmotion(state, 'npc-2');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});

// ============================================================================
// TESTS: APPLY TRIGGER — TRANSITIONS
// ============================================================================

describe('NpcEmotionSystem - Apply Trigger transitions', () => {
  let state: NpcEmotionSystemState;

  beforeEach(() => {
    state = createNpcEmotionState(createMockDeps());
    registerNpcEmotion(state, 'npc-1');
  });

  it('should transition to HAPPY on TRADE_SUCCESS', () => {
    const result = applyEmotionTrigger(state, 'npc-1', 'TRADE_SUCCESS');
    expect(result.success).toBe(true);
    if (result.success) expect(result.state.currentEmotion).toBe('HAPPY');
  });

  it('should transition to ANGRY on BETRAYED with delta 0.6', () => {
    const result = applyEmotionTrigger(state, 'npc-1', 'BETRAYED');
    if (result.success) {
      expect(result.state.currentEmotion).toBe('ANGRY');
      expect(result.event.intensityDelta).toBe(0.6);
    }
  });

  it('should transition to GRIEVING on ALLY_DIED with delta 0.8', () => {
    const result = applyEmotionTrigger(state, 'npc-1', 'ALLY_DIED');
    if (result.success) {
      expect(result.state.currentEmotion).toBe('GRIEVING');
      expect(result.event.intensityDelta).toBe(0.8);
    }
  });

  it('should transition to FEARFUL on COMBAT_LOSS', () => {
    const result = applyEmotionTrigger(state, 'npc-1', 'COMBAT_LOSS');
    if (result.success) expect(result.state.currentEmotion).toBe('FEARFUL');
  });

  it('should transition to TRUSTING on GREETING', () => {
    const result = applyEmotionTrigger(state, 'npc-1', 'GREETING');
    if (result.success) expect(result.state.currentEmotion).toBe('TRUSTING');
  });
});

// ============================================================================
// TESTS: APPLY TRIGGER — STATE EFFECTS
// ============================================================================

describe('NpcEmotionSystem - Apply Trigger effects', () => {
  let state: NpcEmotionSystemState;

  beforeEach(() => {
    state = createNpcEmotionState(createMockDeps());
    registerNpcEmotion(state, 'npc-1');
  });

  it('should clamp intensity to 1.0 maximum', () => {
    applyEmotionTrigger(state, 'npc-1', 'ALLY_DIED'); // +0.8
    applyEmotionTrigger(state, 'npc-1', 'ALLY_DIED'); // would be 1.6
    const s = getEmotionState(state, 'npc-1');
    expect(s?.intensity).toBe(1.0);
  });

  it('should set previousEmotion on trigger', () => {
    applyEmotionTrigger(state, 'npc-1', 'TRADE_SUCCESS'); // HAPPY
    applyEmotionTrigger(state, 'npc-1', 'COMBAT_LOSS'); // FEARFUL
    const s = getEmotionState(state, 'npc-1');
    expect(s?.previousEmotion).toBe('HAPPY');
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = applyEmotionTrigger(state, 'ghost', 'GREETING');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should append event to history', () => {
    applyEmotionTrigger(state, 'npc-1', 'DISCOVERY');
    const report = getEmotionReport(state, 'npc-1');
    expect(report?.stateHistory.length).toBe(1);
  });

  it('should generate unique event IDs', () => {
    const r1 = applyEmotionTrigger(state, 'npc-1', 'TRADE_SUCCESS');
    const r2 = applyEmotionTrigger(state, 'npc-1', 'GIFT_RECEIVED');
    if (r1.success && r2.success) {
      expect(r1.event.eventId).not.toBe(r2.event.eventId);
    }
  });
});

// ============================================================================
// TESTS: SET INTENSITY & DECAY
// ============================================================================

describe('NpcEmotionSystem - Intensity Management', () => {
  let state: NpcEmotionSystemState;

  beforeEach(() => {
    state = createNpcEmotionState(createMockDeps());
    registerNpcEmotion(state, 'npc-1');
    applyEmotionTrigger(state, 'npc-1', 'ALLY_DIED'); // GRIEVING at 0.8
  });

  it('should set intensity to exact value', () => {
    const result = setEmotionIntensity(state, 'npc-1', 0.5);
    expect(result.success).toBe(true);
    const s = getEmotionState(state, 'npc-1');
    expect(s?.intensity).toBe(0.5);
  });

  it('should return invalid-intensity for value < 0', () => {
    const result = setEmotionIntensity(state, 'npc-1', -0.1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-intensity');
  });

  it('should return invalid-intensity for value > 1', () => {
    const result = setEmotionIntensity(state, 'npc-1', 1.1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-intensity');
  });

  it('should decay intensity by the given amount', () => {
    const result = decayEmotionIntensity(state, 'npc-1', 0.3);
    if (result.success) expect(result.newIntensity).toBeCloseTo(0.5);
  });

  it('should return NEUTRAL when intensity reaches 0 via decay', () => {
    decayEmotionIntensity(state, 'npc-1', 1.0);
    const s = getEmotionState(state, 'npc-1');
    expect(s?.currentEmotion).toBe('NEUTRAL');
    expect(s?.intensity).toBe(0.0);
  });

  it('should return npc-not-found for setIntensity on unknown NPC', () => {
    const result = setEmotionIntensity(state, 'ghost', 0.5);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return npc-not-found for decayIntensity on unknown NPC', () => {
    const result = decayEmotionIntensity(state, 'ghost', 0.3);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });
});

// ============================================================================
// TESTS: REPORT AND LIST
// ============================================================================

describe('NpcEmotionSystem - Report and List', () => {
  let state: NpcEmotionSystemState;

  beforeEach(() => {
    state = createNpcEmotionState(createMockDeps());
    registerNpcEmotion(state, 'npc-1');
    registerNpcEmotion(state, 'npc-2');
  });

  it('should compute dominantEmotion as most frequent in history', () => {
    applyEmotionTrigger(state, 'npc-1', 'TRADE_SUCCESS'); // HAPPY
    applyEmotionTrigger(state, 'npc-1', 'TRADE_SUCCESS'); // HAPPY
    applyEmotionTrigger(state, 'npc-1', 'COMBAT_LOSS'); // FEARFUL
    const report = getEmotionReport(state, 'npc-1');
    expect(report?.dominantEmotion).toBe('HAPPY');
  });

  it('should return null dominantEmotion when no history', () => {
    const report = getEmotionReport(state, 'npc-1');
    expect(report?.dominantEmotion).toBeNull();
  });

  it('should return undefined report for unregistered NPC', () => {
    expect(getEmotionReport(state, 'ghost')).toBeUndefined();
  });

  it('should list all registered NPCs', () => {
    const npcs = listEmotionNpcs(state);
    expect(npcs.length).toBe(2);
  });

  it('should return full stateHistory in report', () => {
    const triggers: EmotionTrigger[] = ['TRADE_SUCCESS', 'GIFT_RECEIVED', 'INSULT'];
    for (const t of triggers) applyEmotionTrigger(state, 'npc-1', t);
    const report = getEmotionReport(state, 'npc-1');
    expect(report?.stateHistory.length).toBe(3);
  });
});
