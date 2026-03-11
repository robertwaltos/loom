import { describe, it, expect } from 'vitest';
import { createNpcDecisionEngine } from '../npc-decision.js';
import type {
  NpcDecisionDeps,
  DecisionBackend,
  DecisionRequest,
  NpcPerception,
} from '../npc-decision.js';
import type { AiBackend, NpcTier } from '../npc-tiers.js';

function makePerception(overrides?: Partial<NpcPerception>): NpcPerception {
  return {
    npcId: 'npc-1',
    worldId: 'world-1',
    tier: 2 as NpcTier,
    context: [],
    timestamp: 1_000_000,
    ...overrides,
  };
}

function makeRequest(overrides?: Partial<DecisionRequest>): DecisionRequest {
  return {
    perception: makePerception(),
    availableActions: ['move', 'trade', 'idle'],
    ...overrides,
  };
}

function makeBackend(backend: AiBackend): DecisionBackend {
  return {
    backend,
    decide: () => ({
      actionType: 'move',
      parameters: { direction: 'north' },
      outcome: 'act' as const,
      confidence: 0.85,
      reasoningTrace: backend + ' decided to move',
    }),
  };
}

function makeDeps(overrides?: Partial<NpcDecisionDeps>): NpcDecisionDeps {
  let time = 1_000_000;
  return {
    backends: [makeBackend('mass_entity'), makeBackend('behavior_tree'), makeBackend('llm_haiku')],
    tierToBackend: {
      resolve: (tier: NpcTier): AiBackend => {
        if (tier === 1) return 'mass_entity';
        if (tier === 2) return 'behavior_tree';
        if (tier === 3) return 'llm_haiku';
        return 'llm_opus';
      },
    },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('NpcDecisionEngine — basic decisions', () => {
  it('routes tier 1 to mass_entity backend', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const request = makeRequest({
      perception: makePerception({ tier: 1 as NpcTier }),
    });

    const decision = engine.decide(request);
    expect(decision.backendUsed).toBe('mass_entity');
    expect(decision.outcome).toBe('act');
  });

  it('routes tier 2 to behavior_tree backend', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const request = makeRequest({
      perception: makePerception({ tier: 2 as NpcTier }),
    });

    const decision = engine.decide(request);
    expect(decision.backendUsed).toBe('behavior_tree');
  });

  it('routes tier 3 to llm_haiku backend', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const request = makeRequest({
      perception: makePerception({ tier: 3 as NpcTier }),
    });

    const decision = engine.decide(request);
    expect(decision.backendUsed).toBe('llm_haiku');
  });

  it('returns idle when backend is missing', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const request = makeRequest({
      perception: makePerception({ tier: 4 as NpcTier }),
    });

    const decision = engine.decide(request);
    expect(decision.outcome).toBe('idle');
    expect(decision.confidence).toBe(0);
    expect(decision.actionType).toBe('idle');
  });

  it('preserves npcId and worldId in decision', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const request = makeRequest({
      perception: makePerception({ npcId: 'npc-42', worldId: 'world-7' }),
    });

    const decision = engine.decide(request);
    expect(decision.npcId).toBe('npc-42');
    expect(decision.worldId).toBe('world-7');
  });

  it('includes timestamp from clock', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const decision = engine.decide(makeRequest());
    expect(decision.decidedAt).toBeGreaterThan(0);
  });
});

describe('NpcDecisionEngine — backend results', () => {
  it('passes backend result to decision', () => {
    const customBackend: DecisionBackend = {
      backend: 'behavior_tree',
      decide: () => ({
        actionType: 'trade',
        parameters: { item: 'crystal', amount: '5' },
        outcome: 'act' as const,
        confidence: 0.92,
        reasoningTrace: 'Market favorable for crystal trade',
      }),
    };

    const engine = createNpcDecisionEngine(
      makeDeps({
        backends: [customBackend],
      }),
    );
    const request = makeRequest();
    const decision = engine.decide(request);

    expect(decision.actionType).toBe('trade');
    expect(decision.parameters).toEqual({ item: 'crystal', amount: '5' });
    expect(decision.confidence).toBe(0.92);
    expect(decision.reasoningTrace).toBe('Market favorable for crystal trade');
  });

  it('clamps confidence to [0, 1]', () => {
    const overConfident: DecisionBackend = {
      backend: 'behavior_tree',
      decide: () => ({
        actionType: 'move',
        parameters: {},
        outcome: 'act' as const,
        confidence: 1.5,
        reasoningTrace: '',
      }),
    };

    const engine = createNpcDecisionEngine(
      makeDeps({
        backends: [overConfident],
      }),
    );
    const decision = engine.decide(makeRequest());
    expect(decision.confidence).toBe(1);
  });

  it('clamps negative confidence to 0', () => {
    const underConfident: DecisionBackend = {
      backend: 'behavior_tree',
      decide: () => ({
        actionType: 'idle',
        parameters: {},
        outcome: 'defer' as const,
        confidence: -0.5,
        reasoningTrace: '',
      }),
    };

    const engine = createNpcDecisionEngine(
      makeDeps({
        backends: [underConfident],
      }),
    );
    const decision = engine.decide(makeRequest());
    expect(decision.confidence).toBe(0);
  });
});

describe('NpcDecisionEngine — batch decisions', () => {
  it('processes multiple requests', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const requests = [
      makeRequest({ perception: makePerception({ npcId: 'npc-1', tier: 1 as NpcTier }) }),
      makeRequest({ perception: makePerception({ npcId: 'npc-2', tier: 2 as NpcTier }) }),
      makeRequest({ perception: makePerception({ npcId: 'npc-3', tier: 3 as NpcTier }) }),
    ];

    const decisions = engine.decideBatch(requests);
    expect(decisions).toHaveLength(3);
    expect(decisions[0]?.npcId).toBe('npc-1');
    expect(decisions[1]?.npcId).toBe('npc-2');
    expect(decisions[2]?.npcId).toBe('npc-3');
  });

  it('returns empty array for empty batch', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    expect(engine.decideBatch([])).toHaveLength(0);
  });
});

describe('NpcDecisionEngine — stats tracking', () => {
  it('starts with zero stats', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.totalDecisions).toBe(0);
    expect(stats.actCount).toBe(0);
    expect(stats.idleCount).toBe(0);
    expect(stats.deferCount).toBe(0);
  });

  it('tracks act decisions', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    engine.decide(makeRequest());
    expect(engine.getStats().actCount).toBe(1);
    expect(engine.getStats().totalDecisions).toBe(1);
  });

  it('tracks idle decisions for missing backends', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    engine.decide(
      makeRequest({
        perception: makePerception({ tier: 4 as NpcTier }),
      }),
    );
    expect(engine.getStats().idleCount).toBe(1);
  });

  it('tracks decisions by backend', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    engine.decide(
      makeRequest({
        perception: makePerception({ tier: 1 as NpcTier }),
      }),
    );
    engine.decide(
      makeRequest({
        perception: makePerception({ tier: 2 as NpcTier }),
      }),
    );

    const stats = engine.getStats();
    expect(stats.byBackend.mass_entity).toBe(1);
    expect(stats.byBackend.behavior_tree).toBe(1);
  });

  it('tracks defer outcomes', () => {
    const deferBackend: DecisionBackend = {
      backend: 'behavior_tree',
      decide: () => ({
        actionType: 'wait',
        parameters: {},
        outcome: 'defer' as const,
        confidence: 0.3,
        reasoningTrace: 'Need more information',
      }),
    };

    const engine = createNpcDecisionEngine(
      makeDeps({
        backends: [deferBackend],
      }),
    );
    engine.decide(makeRequest());
    expect(engine.getStats().deferCount).toBe(1);
  });
});

describe('NpcDecisionEngine — backend queries', () => {
  it('reports available backends', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    expect(engine.hasBackend('mass_entity')).toBe(true);
    expect(engine.hasBackend('behavior_tree')).toBe(true);
    expect(engine.hasBackend('llm_haiku')).toBe(true);
    expect(engine.hasBackend('llm_opus')).toBe(false);
  });

  it('lists registered backends', () => {
    const engine = createNpcDecisionEngine(makeDeps());
    const backends = engine.listBackends();
    expect(backends).toContain('mass_entity');
    expect(backends).toContain('behavior_tree');
    expect(backends).toHaveLength(3);
  });
});
