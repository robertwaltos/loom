import { describe, it, expect, vi } from 'vitest';
import { createEmergentIntelligence } from '../npc-emergent-intelligence.js';

function makeDeps() {
  return {
    clock: { now: vi.fn(() => BigInt(1_000_000)) },
    id: { next: vi.fn(() => 'mock-id') },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    events: { emit: vi.fn() },
    llm: {
      complete: vi.fn().mockResolvedValue({ content: '{"plan": "patrol"}', tokensUsed: 100, cost: 0.01 }),
    },
    worldState: {
      getEntityState: vi.fn().mockResolvedValue(null),
      getNearbyEntities: vi.fn().mockResolvedValue([]),
    },
    memory: {
      store: vi.fn().mockResolvedValue(undefined),
      recall: vi.fn().mockResolvedValue([]),
    },
    reputation: {
      getReputation: vi.fn().mockResolvedValue(0),
      updateReputation: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('npc-emergent-intelligence simulation', () => {
  // ── engine creation ──────────────────────────────────────────────

  it('creates engine without throwing', () => {
    expect(() => createEmergentIntelligence(makeDeps())).not.toThrow();
  });

  it('accepts optional config overrides', () => {
    const engine = createEmergentIntelligence(makeDeps(), { emotionDecayRate: 0.1 });
    expect(engine).toBeDefined();
  });

  // ── updateEmotion ────────────────────────────────────────────────

  describe('updateEmotion', () => {
    it('stores the primary emotion for an npc', () => {
      const engine = createEmergentIntelligence(makeDeps());
      engine.updateEmotion('npc-1', 'saw-player', 'joy', 0.8);
      const state = engine.getEmotionalState('npc-1');
      expect(state).toBeDefined();
      expect(state!.primary).toBe('joy');
    });

    it('clamps intensity to 1.0 max', () => {
      const engine = createEmergentIntelligence(makeDeps());
      engine.updateEmotion('npc-1', 'trigger', 'fear', 2.0);
      const state = engine.getEmotionalState('npc-1');
      expect(state!.intensity).toBeLessThanOrEqual(1.0);
    });

    it('clamps intensity to 0.0 min', () => {
      const engine = createEmergentIntelligence(makeDeps());
      engine.updateEmotion('npc-1', 'trigger', 'anger', -1.0);
      const state = engine.getEmotionalState('npc-1');
      expect(state!.intensity).toBeGreaterThanOrEqual(0.0);
    });

    it('sets secondary to previous primary when type differs', () => {
      const engine = createEmergentIntelligence(makeDeps());
      engine.updateEmotion('npc-1', 'trigger-a', 'joy', 0.7);
      engine.updateEmotion('npc-1', 'trigger-b', 'fear', 0.5);
      const state = engine.getEmotionalState('npc-1');
      expect(state!.secondary).toBe('joy');
    });
  });

  // ── getEmotionalState ────────────────────────────────────────────

  it('getEmotionalState returns undefined for unknown npc', () => {
    const engine = createEmergentIntelligence(makeDeps());
    expect(engine.getEmotionalState('__nobody__')).toBeUndefined();
  });

  // ── decayEmotions ────────────────────────────────────────────────

  describe('decayEmotions', () => {
    it('reduces emotion intensity by emotionDecayRate', () => {
      const engine = createEmergentIntelligence(makeDeps(), { emotionDecayRate: 0.05 });
      engine.updateEmotion('npc-1', 'trigger', 'joy', 0.8);
      engine.decayEmotions();
      const state = engine.getEmotionalState('npc-1');
      expect(state!.intensity).toBeCloseTo(0.76); // 0.8 * (1 - 0.05)
    });

    it('resets to neutral when intensity drops below 0.05', () => {
      const engine = createEmergentIntelligence(makeDeps(), { emotionDecayRate: 0.99 });
      engine.updateEmotion('npc-1', 'trigger', 'joy', 0.04);
      engine.decayEmotions();
      const state = engine.getEmotionalState('npc-1');
      // Should be reset to neutral or absent
      if (state) {
        expect(state.primary).toBe('neutral');
      }
    });
  });

  // ── getNpcPlans ──────────────────────────────────────────────────

  it('getNpcPlans returns empty array for an npc with no plans', () => {
    const engine = createEmergentIntelligence(makeDeps());
    const plans = engine.getNpcPlans('npc-no-plans');
    expect(Array.isArray(plans)).toBe(true);
    expect(plans).toHaveLength(0);
  });

  // ── getStats / getBudgetRemaining / resetBudget ──────────────────

  describe('budget management', () => {
    it('getStats returns token and cost budget info', () => {
      const engine = createEmergentIntelligence(makeDeps());
      const stats = engine.getStats();
      expect(stats).toHaveProperty('totalInferenceTokens');
      expect(stats).toHaveProperty('totalInferenceCost');
    });

    it('getBudgetRemaining returns a positive value initially', () => {
      const engine = createEmergentIntelligence(makeDeps());
      const budget = engine.getBudgetRemaining();
      expect(budget.maxTokensPerCycle).toBeGreaterThan(0);
      expect(budget.maxCostPerCycle).toBeGreaterThan(0);
    });

    it('resetBudget restores full budget', () => {
      const engine = createEmergentIntelligence(makeDeps());
      const before = engine.getBudgetRemaining();
      engine.resetBudget();
      const after = engine.getBudgetRemaining();
      expect(after.maxTokensPerCycle).toBeGreaterThanOrEqual(before.maxTokensPerCycle);
    });
  });

  // ── getTheoryOfMind ──────────────────────────────────────────────

  it('getTheoryOfMind returns undefined for unknown npc pair', () => {
    const engine = createEmergentIntelligence(makeDeps());
    const tom = engine.getTheoryOfMind('npc-1', 'target-1');
    expect(tom).toBeUndefined();
  });

  // ── abandonPlan ──────────────────────────────────────────────────

  it('abandonPlan throws for unknown planId', () => {
    const engine = createEmergentIntelligence(makeDeps());
    expect(() => engine.abandonPlan('__no-plan__', 'reason')).toThrow();
  });
});
