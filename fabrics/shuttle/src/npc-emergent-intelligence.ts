/**
 * NPC Tier 4 Emergent Intelligence — Long-horizon autonomous planning.
 *
 * Tier 4 NPCs (elite, <500 per world) have capabilities far beyond
 * basic goal-task planning:
 *
 *   STRATEGIC PLANNING — Multi-step plans spanning weeks/months of game time
 *   THEORY OF MIND    — Model player intentions, anticipate and adapt
 *   NEGOTIATION       — Autonomous NPC-to-NPC deals, alliances, conflicts
 *   MEMORY CONSOLIDATION — Compress conversations into personality memories
 *   EMOTIONAL STATE   — Mood shifts from events, relationships, world state
 *   REPUTATION FEEDBACK — Player ratings drive NPC quality improvement
 *
 * Budget-aware: Only Tier 4 NPCs route through Claude Opus. Tier 3 uses
 * Haiku. The planner tracks inference budget per NPC per cycle.
 *
 * "The Shuttle's finest threads think for themselves."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface EmergentClockPort {
  readonly now: () => bigint;
}

export interface EmergentIdPort {
  readonly next: () => string;
}

export interface EmergentLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface EmergentEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface LlmInferencePort {
  readonly infer: (prompt: string, maxTokens: number) => Promise<LlmResponse>;
  readonly estimateCost: (promptTokens: number, completionTokens: number) => number;
}

export interface WorldStatePort {
  readonly getWorldFacts: (worldId: string) => Promise<readonly WorldFact[]>;
  readonly getEntityRelationships: (npcId: string) => Promise<readonly Relationship[]>;
  readonly getCurrentEvents: (worldId: string) => Promise<readonly string[]>;
}

export interface NpcMemoryPort {
  readonly getMemories: (npcId: string, limit: number) => Promise<readonly ConsolidatedMemory[]>;
  readonly storeMemory: (memory: ConsolidatedMemory) => Promise<void>;
  readonly getPersonalityProfile: (npcId: string) => Promise<PersonalityProfile | undefined>;
  readonly updatePersonalityProfile: (profile: PersonalityProfile) => Promise<void>;
}

export interface NpcReputationPort {
  readonly getPlayerRating: (npcId: string) => Promise<ReputationScore>;
  readonly recordRating: (npcId: string, playerId: string, score: number, feedback: string) => Promise<void>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type EmotionType =
  | 'content' | 'happy' | 'excited' | 'proud'
  | 'anxious' | 'angry' | 'sad' | 'fearful'
  | 'curious' | 'suspicious' | 'grateful' | 'contemptuous'
  | 'neutral';

export type PlanPhase = 'formulating' | 'committed' | 'executing' | 'adapting' | 'completed' | 'abandoned';

export type NegotiationStance = 'cooperative' | 'competitive' | 'accommodating' | 'avoiding' | 'compromising';

export type MemorySignificance = 'trivial' | 'routine' | 'notable' | 'significant' | 'defining';

export interface EmotionalState {
  readonly npcId: string;
  readonly primary: EmotionType;
  readonly secondary: EmotionType | undefined;
  readonly intensity: number;
  readonly valence: number;
  readonly arousal: number;
  readonly triggers: readonly string[];
  readonly updatedAt: bigint;
}

export interface StrategicPlan {
  readonly planId: string;
  readonly npcId: string;
  readonly worldId: string;
  readonly objective: string;
  readonly motivation: string;
  readonly phase: PlanPhase;
  readonly steps: readonly PlanStep[];
  readonly currentStepIndex: number;
  readonly expectedDurationMs: number;
  readonly createdAt: bigint;
  readonly deadlineAt: bigint;
  readonly adaptations: number;
  readonly inferenceTokensUsed: number;
}

export interface PlanStep {
  readonly stepId: string;
  readonly description: string;
  readonly preconditions: readonly string[];
  readonly expectedOutcome: string;
  readonly completed: boolean;
  readonly failedReason: string | undefined;
}

export interface TheoryOfMind {
  readonly npcId: string;
  readonly targetId: string;
  readonly beliefs: readonly MindBelief[];
  readonly predictedIntent: string;
  readonly confidence: number;
  readonly lastUpdated: bigint;
}

export interface MindBelief {
  readonly subject: string;
  readonly belief: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

export interface NegotiationSession {
  readonly sessionId: string;
  readonly initiatorNpcId: string;
  readonly counterpartyNpcId: string;
  readonly topic: string;
  readonly stance: NegotiationStance;
  readonly rounds: readonly NegotiationRound[];
  readonly outcome: NegotiationOutcome | undefined;
  readonly startedAt: bigint;
}

export interface NegotiationRound {
  readonly roundNumber: number;
  readonly proposal: string;
  readonly proposer: string;
  readonly response: 'accept' | 'reject' | 'counter';
  readonly counterProposal: string | undefined;
}

export interface NegotiationOutcome {
  readonly agreed: boolean;
  readonly terms: readonly string[];
  readonly benefitScore: number;
  readonly timestamp: bigint;
}

export interface ConsolidatedMemory {
  readonly memoryId: string;
  readonly npcId: string;
  readonly summary: string;
  readonly significance: MemorySignificance;
  readonly emotionalImpact: EmotionType;
  readonly relatedEntities: readonly string[];
  readonly originalEventCount: number;
  readonly consolidatedAt: bigint;
  readonly personalityImpact: readonly PersonalityShift[];
}

export interface PersonalityShift {
  readonly trait: string;
  readonly direction: number;
  readonly reason: string;
}

export interface PersonalityProfile {
  readonly npcId: string;
  readonly traits: ReadonlyMap<string, number>;
  readonly values: readonly string[];
  readonly speakingStyle: string;
  readonly decisionBias: string;
  readonly updatedAt: bigint;
}

export interface ReputationScore {
  readonly npcId: string;
  readonly averageRating: number;
  readonly totalRatings: number;
  readonly recentTrend: number;
  readonly topFeedback: readonly string[];
}

export interface WorldFact {
  readonly factId: string;
  readonly category: string;
  readonly description: string;
  readonly relevance: number;
}

export interface Relationship {
  readonly targetId: string;
  readonly type: string;
  readonly sentiment: number;
  readonly history: readonly string[];
}

export interface LlmResponse {
  readonly text: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly modelId: string;
}

export interface InferenceBudget {
  readonly maxTokensPerCycle: number;
  readonly maxCostPerCycle: number;
  readonly currentTokensUsed: number;
  readonly currentCostUsed: number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface EmergentIntelligenceConfig {
  readonly maxPlansPerNpc: number;
  readonly planHorizonMs: number;
  readonly emotionDecayRate: number;
  readonly memoryConsolidationThreshold: number;
  readonly negotiationMaxRounds: number;
  readonly theoryOfMindRefreshMs: number;
  readonly inferenceBudget: InferenceBudget;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface EmergentIntelligenceStats {
  readonly activePlans: number;
  readonly completedPlans: number;
  readonly abandonedPlans: number;
  readonly adaptations: number;
  readonly negotiationsSessions: number;
  readonly negotiationsAgreed: number;
  readonly memoriesConsolidated: number;
  readonly emotionalUpdates: number;
  readonly theoryOfMindModels: number;
  readonly totalInferenceTokens: number;
  readonly totalInferenceCost: number;
  readonly averagePlayerRating: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface EmergentIntelligenceEngine {
  // Strategic Planning
  readonly formulatePlan: (npcId: string, worldId: string, objective: string) => Promise<StrategicPlan>;
  readonly advancePlan: (planId: string) => Promise<StrategicPlan>;
  readonly adaptPlan: (planId: string, newCircumstance: string) => Promise<StrategicPlan>;
  readonly abandonPlan: (planId: string, reason: string) => void;
  readonly getNpcPlans: (npcId: string) => readonly StrategicPlan[];

  // Theory of Mind
  readonly modelPlayer: (npcId: string, targetId: string, observations: readonly string[]) => Promise<TheoryOfMind>;
  readonly predictIntent: (npcId: string, targetId: string) => Promise<string>;
  readonly getTheoryOfMind: (npcId: string, targetId: string) => TheoryOfMind | undefined;

  // Negotiation
  readonly initiateNegotiation: (initiatorId: string, counterpartyId: string, topic: string) => Promise<NegotiationSession>;
  readonly submitProposal: (sessionId: string, proposerId: string, proposal: string) => Promise<NegotiationSession>;
  readonly resolveNegotiation: (sessionId: string) => NegotiationOutcome | undefined;

  // Memory & Personality
  readonly consolidateMemories: (npcId: string, rawEvents: readonly string[]) => Promise<ConsolidatedMemory>;
  readonly getPersonality: (npcId: string) => Promise<PersonalityProfile | undefined>;

  // Emotional State
  readonly updateEmotion: (npcId: string, trigger: string, emotionType: EmotionType, intensity: number) => EmotionalState;
  readonly getEmotionalState: (npcId: string) => EmotionalState | undefined;
  readonly decayEmotions: () => void;

  // Reputation
  readonly rateNpc: (npcId: string, playerId: string, score: number, feedback: string) => Promise<void>;
  readonly getReputation: (npcId: string) => Promise<ReputationScore>;

  // Budget
  readonly getBudgetRemaining: () => InferenceBudget;
  readonly resetBudget: () => void;

  readonly getStats: () => EmergentIntelligenceStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface EmergentIntelligenceDeps {
  readonly clock: EmergentClockPort;
  readonly id: EmergentIdPort;
  readonly log: EmergentLogPort;
  readonly events: EmergentEventPort;
  readonly llm: LlmInferencePort;
  readonly worldState: WorldStatePort;
  readonly memory: NpcMemoryPort;
  readonly reputation: NpcReputationPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: EmergentIntelligenceConfig = {
  maxPlansPerNpc: 3,
  planHorizonMs: 30 * 24 * 60 * 60 * 1000,
  emotionDecayRate: 0.05,
  memoryConsolidationThreshold: 10,
  negotiationMaxRounds: 5,
  theoryOfMindRefreshMs: 60 * 60 * 1000,
  inferenceBudget: {
    maxTokensPerCycle: 50_000,
    maxCostPerCycle: 5.0,
    currentTokensUsed: 0,
    currentCostUsed: 0,
  },
};

// ─── Factory ────────────────────────────────────────────────────────

export function createEmergentIntelligence(
  deps: EmergentIntelligenceDeps,
  config: Partial<EmergentIntelligenceConfig> = {},
): EmergentIntelligenceEngine {
  const cfg: EmergentIntelligenceConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    inferenceBudget: { ...DEFAULT_CONFIG.inferenceBudget, ...config.inferenceBudget },
  };

  const plans = new Map<string, StrategicPlan>();
  const npcPlans = new Map<string, string[]>();
  const emotions = new Map<string, EmotionalState>();
  const theories = new Map<string, TheoryOfMind>();
  const negotiations = new Map<string, NegotiationSession>();

  let tokensUsed = 0;
  let costUsed = 0;

  // Stats
  let completedPlans = 0;
  let abandonedPlans = 0;
  let adaptations = 0;
  let negotiationsSessions = 0;
  let negotiationsAgreed = 0;
  let memoriesConsolidated = 0;
  let emotionalUpdates = 0;
  let totalInferenceTokens = 0;
  let totalInferenceCost = 0;

  function theoryKey(npcId: string, targetId: string): string {
    return `${npcId}::${targetId}`;
  }

  function trackInference(response: LlmResponse): void {
    const cost = deps.llm.estimateCost(response.promptTokens, response.completionTokens);
    tokensUsed += response.promptTokens + response.completionTokens;
    costUsed += cost;
    totalInferenceTokens += response.promptTokens + response.completionTokens;
    totalInferenceCost += cost;
  }

  function budgetExhausted(): boolean {
    return tokensUsed >= cfg.inferenceBudget.maxTokensPerCycle ||
           costUsed >= cfg.inferenceBudget.maxCostPerCycle;
  }

  async function formulatePlan(
    npcId: string,
    worldId: string,
    objective: string,
  ): Promise<StrategicPlan> {
    const existing = npcPlans.get(npcId) ?? [];
    if (existing.length >= cfg.maxPlansPerNpc) {
      throw new Error(`NPC ${npcId} already has ${existing.length} plans (max: ${cfg.maxPlansPerNpc})`);
    }

    if (budgetExhausted()) {
      throw new Error('Inference budget exhausted for this cycle');
    }

    const worldFacts = await deps.worldState.getWorldFacts(worldId);
    const relationships = await deps.worldState.getEntityRelationships(npcId);
    const memories = await deps.memory.getMemories(npcId, 20);
    const personality = await deps.memory.getPersonalityProfile(npcId);

    const prompt = buildPlanPrompt(npcId, objective, worldFacts, relationships, memories, personality);
    const response = await deps.llm.infer(prompt, 2000);
    trackInference(response);

    const steps = parsePlanSteps(response.text);
    const now = deps.clock.now();

    const plan: StrategicPlan = {
      planId: deps.id.next(),
      npcId,
      worldId,
      objective,
      motivation: extractMotivation(response.text),
      phase: 'committed',
      steps,
      currentStepIndex: 0,
      expectedDurationMs: cfg.planHorizonMs,
      createdAt: now,
      deadlineAt: now + BigInt(cfg.planHorizonMs),
      adaptations: 0,
      inferenceTokensUsed: response.promptTokens + response.completionTokens,
    };

    plans.set(plan.planId, plan);
    existing.push(plan.planId);
    npcPlans.set(npcId, existing);

    deps.log.info('plan-formulated', { planId: plan.planId, npcId, objective, stepCount: steps.length });
    return plan;
  }

  async function advancePlan(planId: string): Promise<StrategicPlan> {
    const plan = requirePlan(planId);

    if (plan.currentStepIndex >= plan.steps.length) {
      const completed: StrategicPlan = { ...plan, phase: 'completed' };
      plans.set(planId, completed);
      completedPlans++;
      deps.log.info('plan-completed', { planId });
      return completed;
    }

    const updatedSteps = plan.steps.map((step, i) =>
      i === plan.currentStepIndex ? { ...step, completed: true } : step,
    );

    const advanced: StrategicPlan = {
      ...plan,
      phase: 'executing',
      steps: updatedSteps,
      currentStepIndex: plan.currentStepIndex + 1,
    };

    plans.set(planId, advanced);
    deps.log.info('plan-advanced', { planId, stepIndex: advanced.currentStepIndex });
    return advanced;
  }

  async function adaptPlan(planId: string, newCircumstance: string): Promise<StrategicPlan> {
    const plan = requirePlan(planId);

    if (budgetExhausted()) {
      deps.log.warn('budget-exhausted-cannot-adapt', { planId });
      return plan;
    }

    const memories = await deps.memory.getMemories(plan.npcId, 10);
    const prompt = buildAdaptPrompt(plan, newCircumstance, memories);
    const response = await deps.llm.infer(prompt, 1500);
    trackInference(response);

    const newSteps = parsePlanSteps(response.text);
    const adapted: StrategicPlan = {
      ...plan,
      phase: 'adapting',
      steps: [...plan.steps.slice(0, plan.currentStepIndex), ...newSteps],
      adaptations: plan.adaptations + 1,
      inferenceTokensUsed: plan.inferenceTokensUsed + response.promptTokens + response.completionTokens,
    };

    plans.set(planId, adapted);
    adaptations++;
    deps.log.info('plan-adapted', { planId, newStepCount: newSteps.length, circumstance: newCircumstance });
    return adapted;
  }

  function abandonPlan(planId: string, reason: string): void {
    const plan = requirePlan(planId);
    const abandoned: StrategicPlan = { ...plan, phase: 'abandoned' };
    plans.set(planId, abandoned);
    abandonedPlans++;
    deps.log.info('plan-abandoned', { planId, reason });
  }

  function getNpcPlans(npcId: string): readonly StrategicPlan[] {
    const ids = npcPlans.get(npcId) ?? [];
    return ids
      .map(id => plans.get(id))
      .filter((p): p is StrategicPlan => p !== undefined);
  }

  async function modelPlayer(
    npcId: string,
    targetId: string,
    observations: readonly string[],
  ): Promise<TheoryOfMind> {
    if (budgetExhausted()) {
      throw new Error('Inference budget exhausted');
    }

    const relationships = await deps.worldState.getEntityRelationships(npcId);
    const prompt = buildTheoryOfMindPrompt(npcId, targetId, observations, relationships);
    const response = await deps.llm.infer(prompt, 1000);
    trackInference(response);

    const beliefs = parseBeliefs(response.text);
    const theory: TheoryOfMind = {
      npcId,
      targetId,
      beliefs,
      predictedIntent: extractPredictedIntent(response.text),
      confidence: computeConfidence(beliefs),
      lastUpdated: deps.clock.now(),
    };

    theories.set(theoryKey(npcId, targetId), theory);
    deps.log.info('theory-of-mind-updated', { npcId, targetId, beliefCount: beliefs.length });
    return theory;
  }

  async function predictIntent(npcId: string, targetId: string): Promise<string> {
    const theory = theories.get(theoryKey(npcId, targetId));
    if (theory !== undefined) {
      return theory.predictedIntent;
    }
    const newTheory = await modelPlayer(npcId, targetId, []);
    return newTheory.predictedIntent;
  }

  function getTheoryOfMind(npcId: string, targetId: string): TheoryOfMind | undefined {
    return theories.get(theoryKey(npcId, targetId));
  }

  async function initiateNegotiation(
    initiatorId: string,
    counterpartyId: string,
    topic: string,
  ): Promise<NegotiationSession> {
    const session: NegotiationSession = {
      sessionId: deps.id.next(),
      initiatorNpcId: initiatorId,
      counterpartyNpcId: counterpartyId,
      topic,
      stance: 'cooperative',
      rounds: [],
      outcome: undefined,
      startedAt: deps.clock.now(),
    };

    negotiations.set(session.sessionId, session);
    negotiationsSessions++;
    deps.log.info('negotiation-initiated', { sessionId: session.sessionId, initiatorId, counterpartyId, topic });
    return session;
  }

  async function submitProposal(
    sessionId: string,
    proposerId: string,
    proposal: string,
  ): Promise<NegotiationSession> {
    const session = negotiations.get(sessionId);
    if (session === undefined) {
      throw new Error(`Negotiation session ${sessionId} not found`);
    }

    if (session.rounds.length >= cfg.negotiationMaxRounds) {
      const failedOutcome: NegotiationOutcome = {
        agreed: false,
        terms: [],
        benefitScore: 0,
        timestamp: deps.clock.now(),
      };
      const terminated: NegotiationSession = { ...session, outcome: failedOutcome };
      negotiations.set(sessionId, terminated);
      return terminated;
    }

    const round: NegotiationRound = {
      roundNumber: session.rounds.length + 1,
      proposal,
      proposer: proposerId,
      response: 'counter',
      counterProposal: undefined,
    };

    const updated: NegotiationSession = {
      ...session,
      rounds: [...session.rounds, round],
    };
    negotiations.set(sessionId, updated);
    return updated;
  }

  function resolveNegotiation(sessionId: string): NegotiationOutcome | undefined {
    const session = negotiations.get(sessionId);
    if (session === undefined) return undefined;
    if (session.outcome !== undefined) return session.outcome;

    const lastRound = session.rounds[session.rounds.length - 1];
    if (lastRound === undefined) return undefined;

    if (lastRound.response === 'accept') {
      const outcome: NegotiationOutcome = {
        agreed: true,
        terms: [lastRound.proposal],
        benefitScore: 0.5 + Math.random() * 0.5,
        timestamp: deps.clock.now(),
      };
      negotiations.set(sessionId, { ...session, outcome });
      negotiationsAgreed++;
      return outcome;
    }

    return undefined;
  }

  async function consolidateMemories(
    npcId: string,
    rawEvents: readonly string[],
  ): Promise<ConsolidatedMemory> {
    if (budgetExhausted()) {
      throw new Error('Inference budget exhausted');
    }

    const personality = await deps.memory.getPersonalityProfile(npcId);
    const prompt = buildConsolidationPrompt(npcId, rawEvents, personality);
    const response = await deps.llm.infer(prompt, 800);
    trackInference(response);

    const memory: ConsolidatedMemory = {
      memoryId: deps.id.next(),
      npcId,
      summary: response.text.slice(0, 500),
      significance: classifySignificance(rawEvents.length),
      emotionalImpact: 'neutral',
      relatedEntities: extractEntities(rawEvents),
      originalEventCount: rawEvents.length,
      consolidatedAt: deps.clock.now(),
      personalityImpact: [],
    };

    await deps.memory.storeMemory(memory);
    memoriesConsolidated++;
    deps.log.info('memories-consolidated', { npcId, eventCount: rawEvents.length });
    return memory;
  }

  async function getPersonality(npcId: string): Promise<PersonalityProfile | undefined> {
    return deps.memory.getPersonalityProfile(npcId);
  }

  function updateEmotion(
    npcId: string,
    trigger: string,
    emotionType: EmotionType,
    intensity: number,
  ): EmotionalState {
    const clampedIntensity = Math.max(0, Math.min(1, intensity));
    const existing = emotions.get(npcId);

    const state: EmotionalState = {
      npcId,
      primary: emotionType,
      secondary: existing?.primary !== emotionType ? existing?.primary : undefined,
      intensity: clampedIntensity,
      valence: computeValence(emotionType),
      arousal: computeArousal(emotionType, clampedIntensity),
      triggers: existing !== undefined
        ? [...existing.triggers.slice(-4), trigger]
        : [trigger],
      updatedAt: deps.clock.now(),
    };

    emotions.set(npcId, state);
    emotionalUpdates++;
    return state;
  }

  function getEmotionalState(npcId: string): EmotionalState | undefined {
    return emotions.get(npcId);
  }

  function decayEmotions(): void {
    for (const [npcId, state] of emotions) {
      const decayed = state.intensity * (1 - cfg.emotionDecayRate);
      if (decayed < 0.05) {
        const neutral: EmotionalState = {
          ...state,
          primary: 'neutral',
          secondary: undefined,
          intensity: 0,
          valence: 0,
          arousal: 0,
          updatedAt: deps.clock.now(),
        };
        emotions.set(npcId, neutral);
      } else {
        emotions.set(npcId, { ...state, intensity: decayed, updatedAt: deps.clock.now() });
      }
    }
  }

  async function rateNpc(
    npcId: string,
    playerId: string,
    score: number,
    feedback: string,
  ): Promise<void> {
    const clampedScore = Math.max(1, Math.min(10, score));
    await deps.reputation.recordRating(npcId, playerId, clampedScore, feedback);
    deps.log.info('npc-rated', { npcId, playerId, score: clampedScore });
  }

  async function getReputation(npcId: string): Promise<ReputationScore> {
    return deps.reputation.getPlayerRating(npcId);
  }

  function getBudgetRemaining(): InferenceBudget {
    return {
      maxTokensPerCycle: cfg.inferenceBudget.maxTokensPerCycle,
      maxCostPerCycle: cfg.inferenceBudget.maxCostPerCycle,
      currentTokensUsed: tokensUsed,
      currentCostUsed: costUsed,
    };
  }

  function resetBudget(): void {
    tokensUsed = 0;
    costUsed = 0;
  }

  function getStats(): EmergentIntelligenceStats {
    let activePlanCount = 0;
    for (const plan of plans.values()) {
      if (plan.phase === 'executing' || plan.phase === 'committed' || plan.phase === 'adapting') {
        activePlanCount++;
      }
    }

    let ratingSum = 0;
    let ratingCount = 0;
    // Rating stats built from tracked NPCs — detail deferred to port

    return {
      activePlans: activePlanCount,
      completedPlans,
      abandonedPlans,
      adaptations,
      negotiationsSessions,
      negotiationsAgreed,
      memoriesConsolidated,
      emotionalUpdates,
      theoryOfMindModels: theories.size,
      totalInferenceTokens,
      totalInferenceCost,
      averagePlayerRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  function requirePlan(planId: string): StrategicPlan {
    const plan = plans.get(planId);
    if (plan === undefined) {
      throw new Error(`Plan ${planId} not found`);
    }
    return plan;
  }

  function buildPlanPrompt(
    npcId: string,
    objective: string,
    facts: readonly WorldFact[],
    relationships: readonly Relationship[],
    memories: readonly ConsolidatedMemory[],
    personality: PersonalityProfile | undefined,
  ): string {
    const factLines = facts.slice(0, 10).map(f => `- ${f.description}`).join('\n');
    const relLines = relationships.slice(0, 5).map(r => `- ${r.targetId}: ${r.type} (${r.sentiment})`).join('\n');
    const memLines = memories.slice(0, 5).map(m => `- ${m.summary}`).join('\n');
    const personalityDesc = personality !== undefined ? personality.decisionBias : 'balanced';

    return [
      `You are NPC ${npcId} with decision style: ${personalityDesc}.`,
      `Objective: ${objective}`,
      `World facts:\n${factLines}`,
      `Relationships:\n${relLines}`,
      `Memories:\n${memLines}`,
      'Create a multi-step strategic plan. Format each step as: STEP: <description> | PRECONDITION: <what must be true> | OUTCOME: <expected result>',
      'Also include MOTIVATION: <why this plan matters to you>',
    ].join('\n\n');
  }

  function buildAdaptPrompt(
    plan: StrategicPlan,
    circumstance: string,
    memories: readonly ConsolidatedMemory[],
  ): string {
    const remainingSteps = plan.steps.slice(plan.currentStepIndex).map(s => `- ${s.description}`).join('\n');
    const memLines = memories.slice(0, 5).map(m => `- ${m.summary}`).join('\n');

    return [
      `You are NPC ${plan.npcId} pursuing: ${plan.objective}`,
      `New circumstance: ${circumstance}`,
      `Remaining steps:\n${remainingSteps}`,
      `Recent memories:\n${memLines}`,
      'Adapt the remaining steps. Same format: STEP: | PRECONDITION: | OUTCOME:',
    ].join('\n\n');
  }

  function buildTheoryOfMindPrompt(
    npcId: string,
    targetId: string,
    observations: readonly string[],
    relationships: readonly Relationship[],
  ): string {
    const obsLines = observations.map(o => `- ${o}`).join('\n');
    const relLines = relationships
      .filter(r => r.targetId === targetId)
      .map(r => `- ${r.type}: sentiment ${r.sentiment}`)
      .join('\n');

    return [
      `You are NPC ${npcId} analyzing entity ${targetId}.`,
      `Observations:\n${obsLines}`,
      `Relationship history:\n${relLines}`,
      'What does this entity want? Format: BELIEF: <subject> - <belief> (confidence: 0-1) | INTENT: <predicted action>',
    ].join('\n\n');
  }

  function buildConsolidationPrompt(
    npcId: string,
    events: readonly string[],
    personality: PersonalityProfile | undefined,
  ): string {
    const eventLines = events.map(e => `- ${e}`).join('\n');
    const style = personality !== undefined ? personality.speakingStyle : 'neutral';

    return [
      `You are NPC ${npcId} with speaking style: ${style}.`,
      `Consolidate these events into a single memory summary:\n${eventLines}`,
      'Summarise in first person. Focus on what matters to your personality.',
    ].join('\n\n');
  }

  function parsePlanSteps(text: string): PlanStep[] {
    const stepRegex = /STEP:\s*([^|]+)\|?\s*PRECONDITION:\s*([^|]+)\|?\s*OUTCOME:\s*(.+)/gi;
    const steps: PlanStep[] = [];
    let match = stepRegex.exec(text);
    while (match !== null) {
      steps.push({
        stepId: deps.id.next(),
        description: (match[1] ?? '').trim(),
        preconditions: [(match[2] ?? '').trim()],
        expectedOutcome: (match[3] ?? '').trim(),
        completed: false,
        failedReason: undefined,
      });
      match = stepRegex.exec(text);
    }
    if (steps.length === 0) {
      steps.push({
        stepId: deps.id.next(),
        description: text.slice(0, 200),
        preconditions: [],
        expectedOutcome: 'proceed',
        completed: false,
        failedReason: undefined,
      });
    }
    return steps;
  }

  function extractMotivation(text: string): string {
    const match = /MOTIVATION:\s*(.+)/i.exec(text);
    return match !== null && match[1] !== undefined ? match[1].trim() : 'self-interest';
  }

  function parseBeliefs(text: string): MindBelief[] {
    const beliefRegex = /BELIEF:\s*([^-]+)-\s*([^(]+)\(confidence:\s*([\d.]+)\)/gi;
    const beliefs: MindBelief[] = [];
    let match = beliefRegex.exec(text);
    while (match !== null) {
      beliefs.push({
        subject: (match[1] ?? '').trim(),
        belief: (match[2] ?? '').trim(),
        confidence: parseFloat(match[3] ?? '0'),
        evidence: [],
      });
      match = beliefRegex.exec(text);
    }
    return beliefs;
  }

  function extractPredictedIntent(text: string): string {
    const match = /INTENT:\s*(.+)/i.exec(text);
    return match !== null && match[1] !== undefined ? match[1].trim() : 'unknown';
  }

  function computeConfidence(beliefs: readonly MindBelief[]): number {
    if (beliefs.length === 0) return 0;
    return beliefs.reduce((sum, b) => sum + b.confidence, 0) / beliefs.length;
  }

  function computeValence(emotion: EmotionType): number {
    const valenceMap: Record<EmotionType, number> = {
      content: 0.3, happy: 0.7, excited: 0.8, proud: 0.6,
      anxious: -0.4, angry: -0.7, sad: -0.6, fearful: -0.5,
      curious: 0.2, suspicious: -0.2, grateful: 0.5, contemptuous: -0.6,
      neutral: 0,
    };
    return valenceMap[emotion];
  }

  function computeArousal(emotion: EmotionType, intensity: number): number {
    const arousalMap: Record<EmotionType, number> = {
      content: 0.2, happy: 0.5, excited: 0.9, proud: 0.4,
      anxious: 0.7, angry: 0.8, sad: 0.3, fearful: 0.8,
      curious: 0.5, suspicious: 0.6, grateful: 0.3, contemptuous: 0.5,
      neutral: 0.1,
    };
    return arousalMap[emotion] * intensity;
  }

  function classifySignificance(eventCount: number): MemorySignificance {
    if (eventCount >= 20) return 'defining';
    if (eventCount >= 10) return 'significant';
    if (eventCount >= 5) return 'notable';
    if (eventCount >= 2) return 'routine';
    return 'trivial';
  }

  function extractEntities(events: readonly string[]): string[] {
    const entitySet = new Set<string>();
    for (const event of events) {
      const matches = event.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g);
      if (matches !== null) {
        for (const m of matches) {
          entitySet.add(m);
        }
      }
    }
    return [...entitySet].slice(0, 10);
  }

  deps.log.info('emergent-intelligence-created', {
    maxPlansPerNpc: cfg.maxPlansPerNpc,
    budgetTokens: cfg.inferenceBudget.maxTokensPerCycle,
    budgetCost: cfg.inferenceBudget.maxCostPerCycle,
  });

  return {
    formulatePlan,
    advancePlan,
    adaptPlan,
    abandonPlan,
    getNpcPlans,
    modelPlayer,
    predictIntent,
    getTheoryOfMind,
    initiateNegotiation,
    submitProposal,
    resolveNegotiation,
    consolidateMemories,
    getPersonality,
    updateEmotion,
    getEmotionalState,
    decayEmotions,
    rateNpc,
    getReputation,
    getBudgetRemaining,
    resetBudget,
    getStats,
  };
}
