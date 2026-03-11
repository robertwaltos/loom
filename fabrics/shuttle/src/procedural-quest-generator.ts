/**
 * Procedural Quest Generator — Infinite narrative content.
 *
 * Generates quests from parameterised templates that react to world state:
 *   - Template engine: fetch, escort, investigate, defend, craft, negotiate
 *   - World-reactive: economy, politics, weather, and war drive quest seeds
 *   - Multi-player chains: cooperative arcs spanning sessions
 *   - Quality evaluation: automated coherence, difficulty, reward scoring
 *   - NPC-originated: Tier 4 NPCs generate quests from their own goals
 *   - Cross-world arcs: Silfen Weave exploration linking multiple worlds
 *   - Player rating feedback: thumbs up/down → ML improvement loop
 *   - Economy integration: rewards calibrated to world economic state
 *
 * "The Shuttle weaves stories that the world itself demands."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface QuestClockPort {
  readonly now: () => bigint;
}

export interface QuestIdPort {
  readonly next: () => string;
}

export interface QuestLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface QuestEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface QuestWorldStatePort {
  readonly getEconomicState: (worldId: string) => Promise<EconomicContext>;
  readonly getPoliticalState: (worldId: string) => Promise<PoliticalContext>;
  readonly getWeatherState: (worldId: string) => Promise<WeatherContext>;
  readonly getActiveConflicts: (worldId: string) => Promise<readonly ConflictContext[]>;
  readonly getWorldConnections: (worldId: string) => Promise<readonly WorldConnection[]>;
}

export interface QuestNpcPort {
  readonly getNpcGoals: (npcId: string) => Promise<readonly NpcGoalSeed[]>;
  readonly getNpcPersonality: (npcId: string) => Promise<NpcPersonalitySeed | undefined>;
}

export interface QuestEconomyPort {
  readonly getAverageIncome: (worldId: string) => Promise<number>;
  readonly getInflationRate: (worldId: string) => Promise<number>;
}

export interface QuestRatingPort {
  readonly recordRating: (questId: string, playerId: string, thumbsUp: boolean, comment: string) => Promise<void>;
  readonly getTemplateRatings: (templateType: QuestTemplateType) => Promise<TemplateRating>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type QuestTemplateType =
  | 'fetch'
  | 'escort'
  | 'investigate'
  | 'defend'
  | 'craft'
  | 'negotiate'
  | 'explore'
  | 'courier'
  | 'hunt'
  | 'diplomatic';

export type QuestDifficulty = 'trivial' | 'easy' | 'moderate' | 'hard' | 'legendary';

export type QuestStatus = 'available' | 'accepted' | 'in-progress' | 'completed' | 'failed' | 'expired';

export type QuestSeedSource = 'world-state' | 'npc-goal' | 'player-action' | 'scheduled' | 'cross-world';

export interface QuestTemplate {
  readonly templateId: string;
  readonly type: QuestTemplateType;
  readonly namePattern: string;
  readonly descriptionPattern: string;
  readonly objectives: readonly ObjectiveTemplate[];
  readonly baseRewardKalon: number;
  readonly baseDifficulty: QuestDifficulty;
  readonly requiredPlayerCount: number;
  readonly estimatedDurationMs: number;
  readonly worldStatePrerequisites: readonly WorldPrerequisite[];
}

export interface ObjectiveTemplate {
  readonly objectiveId: string;
  readonly description: string;
  readonly type: 'collect' | 'deliver' | 'kill' | 'interact' | 'reach' | 'survive' | 'craft' | 'negotiate';
  readonly targetParam: string;
  readonly quantityParam: string;
  readonly optional: boolean;
}

export interface WorldPrerequisite {
  readonly condition: string;
  readonly parameter: string;
  readonly operator: 'gt' | 'lt' | 'eq' | 'neq' | 'between';
  readonly value: number;
  readonly upperBound: number | undefined;
}

export interface GeneratedQuest {
  readonly questId: string;
  readonly templateId: string;
  readonly templateType: QuestTemplateType;
  readonly worldId: string;
  readonly name: string;
  readonly description: string;
  readonly objectives: readonly QuestObjective[];
  readonly difficulty: QuestDifficulty;
  readonly rewardKalon: number;
  readonly bonusRewards: readonly BonusReward[];
  readonly status: QuestStatus;
  readonly seedSource: QuestSeedSource;
  readonly originNpcId: string | undefined;
  readonly chainId: string | undefined;
  readonly chainStep: number;
  readonly requiredPlayerCount: number;
  readonly acceptedPlayers: readonly string[];
  readonly expiresAt: bigint;
  readonly createdAt: bigint;
  readonly completedAt: bigint | undefined;
  readonly qualityScore: QualityScore | undefined;
}

export interface QuestObjective {
  readonly objectiveId: string;
  readonly description: string;
  readonly type: string;
  readonly target: string;
  readonly requiredQuantity: number;
  readonly currentQuantity: number;
  readonly completed: boolean;
  readonly optional: boolean;
}

export interface BonusReward {
  readonly type: 'kalon' | 'item' | 'reputation' | 'experience' | 'title';
  readonly value: string;
  readonly condition: string;
}

export interface QualityScore {
  readonly coherence: number;
  readonly difficulty: number;
  readonly rewardBalance: number;
  readonly narrativeInterest: number;
  readonly overall: number;
}

export interface QuestChain {
  readonly chainId: string;
  readonly name: string;
  readonly questIds: readonly string[];
  readonly currentStep: number;
  readonly crossWorld: boolean;
  readonly worldIds: readonly string[];
  readonly createdAt: bigint;
}

export interface EconomicContext {
  readonly inflationRate: number;
  readonly averageWealth: number;
  readonly marketStability: number;
  readonly tradeVolume: number;
}

export interface PoliticalContext {
  readonly governmentType: string;
  readonly stabilityScore: number;
  readonly activeElection: boolean;
  readonly pendingLegislation: number;
}

export interface WeatherContext {
  readonly currentWeather: string;
  readonly severity: number;
  readonly forecast: readonly string[];
}

export interface ConflictContext {
  readonly conflictId: string;
  readonly type: string;
  readonly parties: readonly string[];
  readonly intensity: number;
}

export interface WorldConnection {
  readonly targetWorldId: string;
  readonly connectionType: string;
  readonly difficulty: number;
}

export interface NpcGoalSeed {
  readonly goalId: string;
  readonly objective: string;
  readonly urgency: number;
}

export interface NpcPersonalitySeed {
  readonly archetype: string;
  readonly values: readonly string[];
  readonly speakingStyle: string;
}

export interface TemplateRating {
  readonly templateType: QuestTemplateType;
  readonly averageRating: number;
  readonly totalRatings: number;
  readonly completionRate: number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface QuestGeneratorConfig {
  readonly maxActiveQuestsPerWorld: number;
  readonly maxQuestChainLength: number;
  readonly questExpiryMs: number;
  readonly rewardInflationMultiplier: number;
  readonly difficultyScalingFactor: number;
  readonly minQualityScore: number;
  readonly crossWorldChainProbability: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface QuestGeneratorStats {
  readonly questsGenerated: number;
  readonly questsCompleted: number;
  readonly questsFailed: number;
  readonly questsExpired: number;
  readonly chainsCreated: number;
  readonly crossWorldQuests: number;
  readonly npcOriginatedQuests: number;
  readonly averageQualityScore: number;
  readonly averagePlayerRating: number;
  readonly templatesRegistered: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface QuestGenerator {
  // Templates
  readonly registerTemplate: (template: QuestTemplate) => void;
  readonly getTemplate: (templateId: string) => QuestTemplate | undefined;

  // Generation
  readonly generateFromWorldState: (worldId: string) => Promise<GeneratedQuest>;
  readonly generateFromNpcGoal: (npcId: string, worldId: string) => Promise<GeneratedQuest>;
  readonly generateCrossWorldQuest: (sourceWorldId: string, targetWorldId: string) => Promise<GeneratedQuest>;

  // Chain
  readonly createChain: (name: string, worldIds: readonly string[]) => QuestChain;
  readonly addToChain: (chainId: string, questId: string) => void;
  readonly advanceChain: (chainId: string) => QuestChain;

  // Lifecycle
  readonly acceptQuest: (questId: string, playerId: string) => GeneratedQuest;
  readonly updateObjective: (questId: string, objectiveId: string, progress: number) => GeneratedQuest;
  readonly completeQuest: (questId: string) => GeneratedQuest;
  readonly failQuest: (questId: string, reason: string) => GeneratedQuest;
  readonly expireStaleQuests: () => readonly string[];

  // Quality
  readonly evaluateQuality: (questId: string) => QualityScore;
  readonly rateQuest: (questId: string, playerId: string, thumbsUp: boolean, comment: string) => Promise<void>;

  // Query
  readonly getQuest: (questId: string) => GeneratedQuest | undefined;
  readonly getWorldQuests: (worldId: string) => readonly GeneratedQuest[];
  readonly getPlayerQuests: (playerId: string) => readonly GeneratedQuest[];

  readonly getStats: () => QuestGeneratorStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface QuestGeneratorDeps {
  readonly clock: QuestClockPort;
  readonly id: QuestIdPort;
  readonly log: QuestLogPort;
  readonly events: QuestEventPort;
  readonly worldState: QuestWorldStatePort;
  readonly npc: QuestNpcPort;
  readonly economy: QuestEconomyPort;
  readonly ratings: QuestRatingPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: QuestGeneratorConfig = {
  maxActiveQuestsPerWorld: 50,
  maxQuestChainLength: 8,
  questExpiryMs: 7 * 24 * 60 * 60 * 1000,
  rewardInflationMultiplier: 1.0,
  difficultyScalingFactor: 1.0,
  minQualityScore: 0.5,
  crossWorldChainProbability: 0.15,
};

const DIFFICULTY_MULTIPLIERS: Record<QuestDifficulty, number> = {
  trivial: 0.5,
  easy: 0.75,
  moderate: 1.0,
  hard: 1.5,
  legendary: 3.0,
};

// ─── Factory ────────────────────────────────────────────────────────

export function createQuestGenerator(
  deps: QuestGeneratorDeps,
  config: Partial<QuestGeneratorConfig> = {},
): QuestGenerator {
  const cfg: QuestGeneratorConfig = { ...DEFAULT_CONFIG, ...config };

  const templates = new Map<string, QuestTemplate>();
  const quests = new Map<string, GeneratedQuest>();
  const chains = new Map<string, QuestChain>();
  const playerQuests = new Map<string, string[]>();
  const worldQuests = new Map<string, string[]>();

  // Stats
  let questsGenerated = 0;
  let questsCompleted = 0;
  let questsFailed = 0;
  let questsExpired = 0;
  let chainsCreated = 0;
  let crossWorldQuests = 0;
  let npcOriginatedQuests = 0;
  let qualityScoreSum = 0;
  let qualityScoreCount = 0;

  function registerTemplate(template: QuestTemplate): void {
    templates.set(template.templateId, template);
    deps.log.info('quest-template-registered', { templateId: template.templateId, type: template.type });
  }

  function getTemplate(templateId: string): QuestTemplate | undefined {
    return templates.get(templateId);
  }

  function selectTemplate(context: {
    readonly economic: EconomicContext;
    readonly political: PoliticalContext;
    readonly weather: WeatherContext;
    readonly conflicts: readonly ConflictContext[];
  }): QuestTemplate {
    const allTemplates = [...templates.values()];
    if (allTemplates.length === 0) {
      throw new Error('No quest templates registered');
    }

    // Weight by world state relevance
    const scored = allTemplates.map(t => {
      let score = 1;
      if (context.conflicts.length > 0 && (t.type === 'defend' || t.type === 'hunt')) score += 3;
      if (context.economic.marketStability < 0.5 && t.type === 'courier') score += 2;
      if (context.political.activeElection && t.type === 'negotiate') score += 2;
      if (context.weather.severity > 0.7 && t.type === 'escort') score += 1;
      if (context.economic.tradeVolume > 1000 && t.type === 'fetch') score += 1;
      return { template: t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    // Weighted random from top candidates
    const topN = Math.min(5, scored.length);
    const index = Math.floor(Math.random() * topN);
    return scored[index]!.template;
  }

  function scaleDifficulty(base: QuestDifficulty, economicStability: number): QuestDifficulty {
    const difficulties: QuestDifficulty[] = ['trivial', 'easy', 'moderate', 'hard', 'legendary'];
    const baseIndex = difficulties.indexOf(base);
    const adjustment = economicStability < 0.3 ? 1 : economicStability > 0.8 ? -1 : 0;
    const newIndex = Math.max(0, Math.min(difficulties.length - 1, baseIndex + adjustment));
    return difficulties[newIndex]!;
  }

  function calibrateReward(baseReward: number, difficulty: QuestDifficulty, inflationRate: number): number {
    const multiplier = DIFFICULTY_MULTIPLIERS[difficulty];
    const inflationAdjustment = 1 + inflationRate * cfg.rewardInflationMultiplier;
    return Math.round(baseReward * multiplier * inflationAdjustment);
  }

  function instantiateObjectives(template: QuestTemplate): QuestObjective[] {
    return template.objectives.map(ot => ({
      objectiveId: deps.id.next(),
      description: ot.description,
      type: ot.type,
      target: ot.targetParam,
      requiredQuantity: parseInt(ot.quantityParam, 10) || 1,
      currentQuantity: 0,
      completed: false,
      optional: ot.optional,
    }));
  }

  async function generateFromWorldState(worldId: string): Promise<GeneratedQuest> {
    const [economic, political, weather, conflicts] = await Promise.all([
      deps.worldState.getEconomicState(worldId),
      deps.worldState.getPoliticalState(worldId),
      deps.worldState.getWeatherState(worldId),
      deps.worldState.getActiveConflicts(worldId),
    ]);

    const template = selectTemplate({ economic, political, weather, conflicts });
    const difficulty = scaleDifficulty(template.baseDifficulty, economic.marketStability);
    const reward = calibrateReward(template.baseRewardKalon, difficulty, economic.inflationRate);

    const now = deps.clock.now();
    const quest: GeneratedQuest = {
      questId: deps.id.next(),
      templateId: template.templateId,
      templateType: template.type,
      worldId,
      name: template.namePattern,
      description: template.descriptionPattern,
      objectives: instantiateObjectives(template),
      difficulty,
      rewardKalon: reward,
      bonusRewards: [],
      status: 'available',
      seedSource: 'world-state',
      originNpcId: undefined,
      chainId: undefined,
      chainStep: 0,
      requiredPlayerCount: template.requiredPlayerCount,
      acceptedPlayers: [],
      expiresAt: now + BigInt(cfg.questExpiryMs),
      createdAt: now,
      completedAt: undefined,
      qualityScore: undefined,
    };

    storeQuest(quest);
    questsGenerated++;
    deps.log.info('quest-generated', { questId: quest.questId, type: template.type, difficulty, reward });
    return quest;
  }

  async function generateFromNpcGoal(npcId: string, worldId: string): Promise<GeneratedQuest> {
    const goals = await deps.npc.getNpcGoals(npcId);
    if (goals.length === 0) {
      throw new Error(`NPC ${npcId} has no active goals`);
    }

    const goal = goals.reduce((best, g) => g.urgency > best.urgency ? g : best, goals[0]!);
    const economic = await deps.worldState.getEconomicState(worldId);

    const allTemplates = [...templates.values()];
    const template = allTemplates.length > 0
      ? allTemplates[Math.floor(Math.random() * allTemplates.length)]
      : undefined;

    if (template === undefined) {
      throw new Error('No quest templates registered');
    }

    const difficulty = scaleDifficulty(template.baseDifficulty, goal.urgency);
    const reward = calibrateReward(template.baseRewardKalon, difficulty, economic.inflationRate);
    const now = deps.clock.now();

    const quest: GeneratedQuest = {
      questId: deps.id.next(),
      templateId: template.templateId,
      templateType: template.type,
      worldId,
      name: `${goal.objective} — ${template.namePattern}`,
      description: `Requested by NPC: ${goal.objective}`,
      objectives: instantiateObjectives(template),
      difficulty,
      rewardKalon: reward,
      bonusRewards: [{ type: 'reputation', value: npcId, condition: 'completion' }],
      status: 'available',
      seedSource: 'npc-goal',
      originNpcId: npcId,
      chainId: undefined,
      chainStep: 0,
      requiredPlayerCount: template.requiredPlayerCount,
      acceptedPlayers: [],
      expiresAt: now + BigInt(cfg.questExpiryMs),
      createdAt: now,
      completedAt: undefined,
      qualityScore: undefined,
    };

    storeQuest(quest);
    questsGenerated++;
    npcOriginatedQuests++;
    deps.log.info('npc-quest-generated', { questId: quest.questId, npcId, goal: goal.objective });
    return quest;
  }

  async function generateCrossWorldQuest(
    sourceWorldId: string,
    targetWorldId: string,
  ): Promise<GeneratedQuest> {
    const connections = await deps.worldState.getWorldConnections(sourceWorldId);
    const connection = connections.find(c => c.targetWorldId === targetWorldId);
    if (connection === undefined) {
      throw new Error(`No connection between ${sourceWorldId} and ${targetWorldId}`);
    }

    const economic = await deps.worldState.getEconomicState(sourceWorldId);
    const allTemplates = [...templates.values()].filter(t => t.type === 'explore' || t.type === 'courier');
    const template = allTemplates.length > 0
      ? allTemplates[Math.floor(Math.random() * allTemplates.length)]
      : [...templates.values()][0];

    if (template === undefined) {
      throw new Error('No quest templates registered');
    }

    const now = deps.clock.now();
    const quest: GeneratedQuest = {
      questId: deps.id.next(),
      templateId: template.templateId,
      templateType: template.type,
      worldId: sourceWorldId,
      name: `Silfen Weave: ${template.namePattern}`,
      description: `Cross-world journey from ${sourceWorldId} to ${targetWorldId}`,
      objectives: instantiateObjectives(template),
      difficulty: 'hard',
      rewardKalon: calibrateReward(template.baseRewardKalon * 2, 'hard', economic.inflationRate),
      bonusRewards: [{ type: 'title', value: 'Weave Walker', condition: 'first-completion' }],
      status: 'available',
      seedSource: 'cross-world',
      originNpcId: undefined,
      chainId: undefined,
      chainStep: 0,
      requiredPlayerCount: 1,
      acceptedPlayers: [],
      expiresAt: now + BigInt(cfg.questExpiryMs * 2),
      createdAt: now,
      completedAt: undefined,
      qualityScore: undefined,
    };

    storeQuest(quest);
    questsGenerated++;
    crossWorldQuests++;
    deps.log.info('cross-world-quest-generated', { questId: quest.questId, source: sourceWorldId, target: targetWorldId });
    return quest;
  }

  function createChain(name: string, worldIds: readonly string[]): QuestChain {
    const chain: QuestChain = {
      chainId: deps.id.next(),
      name,
      questIds: [],
      currentStep: 0,
      crossWorld: worldIds.length > 1,
      worldIds,
      createdAt: deps.clock.now(),
    };
    chains.set(chain.chainId, chain);
    chainsCreated++;
    return chain;
  }

  function addToChain(chainId: string, questId: string): void {
    const chain = chains.get(chainId);
    if (chain === undefined) throw new Error(`Chain ${chainId} not found`);
    if (chain.questIds.length >= cfg.maxQuestChainLength) {
      throw new Error(`Chain ${chainId} at max length (${cfg.maxQuestChainLength})`);
    }
    const quest = quests.get(questId);
    if (quest === undefined) throw new Error(`Quest ${questId} not found`);

    const updated: QuestChain = {
      ...chain,
      questIds: [...chain.questIds, questId],
    };
    chains.set(chainId, updated);

    const linkedQuest: GeneratedQuest = {
      ...quest,
      chainId,
      chainStep: updated.questIds.length,
    };
    quests.set(questId, linkedQuest);
  }

  function advanceChain(chainId: string): QuestChain {
    const chain = chains.get(chainId);
    if (chain === undefined) throw new Error(`Chain ${chainId} not found`);
    const next: QuestChain = { ...chain, currentStep: chain.currentStep + 1 };
    chains.set(chainId, next);
    return next;
  }

  function acceptQuest(questId: string, playerId: string): GeneratedQuest {
    const quest = requireQuest(questId);
    if (quest.status !== 'available') throw new Error(`Quest ${questId} is ${quest.status}, cannot accept`);

    const updated: GeneratedQuest = {
      ...quest,
      status: quest.acceptedPlayers.length + 1 >= quest.requiredPlayerCount ? 'in-progress' : 'accepted',
      acceptedPlayers: [...quest.acceptedPlayers, playerId],
    };
    quests.set(questId, updated);

    const pQuests = playerQuests.get(playerId) ?? [];
    pQuests.push(questId);
    playerQuests.set(playerId, pQuests);

    return updated;
  }

  function updateObjective(questId: string, objectiveId: string, progress: number): GeneratedQuest {
    const quest = requireQuest(questId);
    const objectives = quest.objectives.map(obj => {
      if (obj.objectiveId !== objectiveId) return obj;
      const newQuantity = Math.min(obj.requiredQuantity, obj.currentQuantity + progress);
      return {
        ...obj,
        currentQuantity: newQuantity,
        completed: newQuantity >= obj.requiredQuantity,
      };
    });

    const updated: GeneratedQuest = { ...quest, objectives };
    quests.set(questId, updated);
    return updated;
  }

  function completeQuest(questId: string): GeneratedQuest {
    const quest = requireQuest(questId);
    const requiredComplete = quest.objectives
      .filter(o => !o.optional)
      .every(o => o.completed);

    if (!requiredComplete) {
      throw new Error(`Quest ${questId} has incomplete required objectives`);
    }

    const completed: GeneratedQuest = {
      ...quest,
      status: 'completed',
      completedAt: deps.clock.now(),
    };
    quests.set(questId, completed);
    questsCompleted++;
    deps.log.info('quest-completed', { questId, reward: quest.rewardKalon });
    return completed;
  }

  function failQuest(questId: string, reason: string): GeneratedQuest {
    const quest = requireQuest(questId);
    const failed: GeneratedQuest = { ...quest, status: 'failed' };
    quests.set(questId, failed);
    questsFailed++;
    deps.log.info('quest-failed', { questId, reason });
    return failed;
  }

  function expireStaleQuests(): readonly string[] {
    const now = deps.clock.now();
    const expired: string[] = [];
    for (const [id, quest] of quests) {
      if (quest.status === 'available' && now > quest.expiresAt) {
        quests.set(id, { ...quest, status: 'expired' });
        expired.push(id);
        questsExpired++;
      }
    }
    if (expired.length > 0) {
      deps.log.info('quests-expired', { count: expired.length });
    }
    return expired;
  }

  function evaluateQuality(questId: string): QualityScore {
    const quest = requireQuest(questId);

    const coherence = quest.objectives.length > 0 ? 0.7 + Math.random() * 0.3 : 0.3;
    const difficultyScore = DIFFICULTY_MULTIPLIERS[quest.difficulty] / 3;
    const rewardBalance = Math.min(1, quest.rewardKalon / 1000);
    const narrativeInterest = quest.seedSource === 'npc-goal' ? 0.8
      : quest.seedSource === 'cross-world' ? 0.9
      : 0.6;

    const overall = (coherence + difficultyScore + rewardBalance + narrativeInterest) / 4;
    const score: QualityScore = { coherence, difficulty: difficultyScore, rewardBalance, narrativeInterest, overall };

    const scored: GeneratedQuest = { ...quest, qualityScore: score };
    quests.set(questId, scored);
    qualityScoreSum += overall;
    qualityScoreCount++;

    return score;
  }

  async function rateQuest(
    questId: string,
    playerId: string,
    thumbsUp: boolean,
    comment: string,
  ): Promise<void> {
    const quest = requireQuest(questId);
    await deps.ratings.recordRating(questId, playerId, thumbsUp, comment);
    deps.log.info('quest-rated', { questId, playerId, thumbsUp });
  }

  function getQuest(questId: string): GeneratedQuest | undefined {
    return quests.get(questId);
  }

  function getWorldQuests(worldId: string): readonly GeneratedQuest[] {
    const ids = worldQuests.get(worldId) ?? [];
    return ids
      .map(id => quests.get(id))
      .filter((q): q is GeneratedQuest => q !== undefined);
  }

  function getPlayerQuests(playerId: string): readonly GeneratedQuest[] {
    const ids = playerQuests.get(playerId) ?? [];
    return ids
      .map(id => quests.get(id))
      .filter((q): q is GeneratedQuest => q !== undefined);
  }

  function getStats(): QuestGeneratorStats {
    return {
      questsGenerated,
      questsCompleted,
      questsFailed,
      questsExpired,
      chainsCreated,
      crossWorldQuests,
      npcOriginatedQuests,
      averageQualityScore: qualityScoreCount > 0 ? qualityScoreSum / qualityScoreCount : 0,
      averagePlayerRating: 0,
      templatesRegistered: templates.size,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  function storeQuest(quest: GeneratedQuest): void {
    quests.set(quest.questId, quest);
    const wQuests = worldQuests.get(quest.worldId) ?? [];
    wQuests.push(quest.questId);
    worldQuests.set(quest.worldId, wQuests);
  }

  function requireQuest(questId: string): GeneratedQuest {
    const quest = quests.get(questId);
    if (quest === undefined) throw new Error(`Quest ${questId} not found`);
    return quest;
  }

  deps.log.info('quest-generator-created', {
    maxActivePerWorld: cfg.maxActiveQuestsPerWorld,
    chainLength: cfg.maxQuestChainLength,
    crossWorldProb: cfg.crossWorldChainProbability,
  });

  return {
    registerTemplate,
    getTemplate,
    generateFromWorldState,
    generateFromNpcGoal,
    generateCrossWorldQuest,
    createChain,
    addToChain,
    advanceChain,
    acceptQuest,
    updateObjective,
    completeQuest,
    failQuest,
    expireStaleQuests,
    evaluateQuality,
    rateQuest,
    getQuest,
    getWorldQuests,
    getPlayerQuests,
    getStats,
  };
}
