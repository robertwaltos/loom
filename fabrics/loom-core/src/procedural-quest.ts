// procedural-quest.ts — Dynamic quest generation from world state

interface QuestClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface QuestIdPort {
  readonly generate: () => string;
}

interface QuestLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

export interface QuestDeps {
  readonly clock: QuestClockPort;
  readonly idGen: QuestIdPort;
  readonly logger: QuestLoggerPort;
}

export type QuestDifficulty = 'TRIVIAL' | 'EASY' | 'MODERATE' | 'HARD' | 'LEGENDARY';

export type QuestTriggerType =
  | 'LOW_INTEGRITY'
  | 'NPC_NEED'
  | 'FACTION_CONFLICT'
  | 'RESOURCE_SHORTAGE'
  | 'PLAYER_LEVEL'
  | 'WORLD_EVENT';

export interface QuestTrigger {
  readonly type: QuestTriggerType;
  readonly worldId: string;
  readonly severity: number;
  readonly metadata: Record<string, unknown>;
}

export interface QuestReward {
  readonly kalonAmount: bigint;
  readonly experiencePoints: number;
  readonly items: ReadonlyArray<string>;
  readonly reputationGain: number;
}

export interface QuestTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly description: string;
  readonly triggerType: QuestTriggerType;
  readonly difficulty: QuestDifficulty;
  readonly prerequisites: ReadonlyArray<string>;
  readonly baseReward: QuestReward;
  readonly estimatedDurationMinutes: number;
  readonly maxActiveInstances: number;
}

export interface GeneratedQuest {
  readonly questId: string;
  readonly templateId: string;
  readonly name: string;
  readonly description: string;
  readonly difficulty: QuestDifficulty;
  readonly reward: QuestReward;
  readonly createdAtMicros: bigint;
  readonly expiresAtMicros: bigint;
  readonly worldId: string;
  readonly status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  readonly completedAtMicros: bigint | null;
  readonly assignedDynastyId: string | null;
}

export interface QuestChain {
  readonly chainId: string;
  readonly name: string;
  readonly questIds: ReadonlyArray<string>;
  readonly currentIndex: number;
  readonly completed: boolean;
}

export interface ProceduralQuestModule {
  readonly registerTemplate: (template: QuestTemplate) => string | { error: string };
  readonly generateQuest: (trigger: QuestTrigger) => GeneratedQuest | { error: string };
  readonly activateQuest: (questId: string, dynastyId: string) => string | { error: string };
  readonly completeQuest: (questId: string) => QuestReward | { error: string };
  readonly failQuest: (questId: string, reason: string) => string | { error: string };
  readonly getActiveQuests: (dynastyId: string) => ReadonlyArray<GeneratedQuest>;
  readonly getQuestChain: (chainId: string) => QuestChain | { error: string };
  readonly createChain: (
    name: string,
    templateIds: ReadonlyArray<string>,
  ) => string | { error: string };
  readonly advanceChain: (chainId: string) => GeneratedQuest | { error: string };
  readonly getTemplateStats: () => Record<string, number>;
  readonly expireOldQuests: () => number;
}

interface ModuleState {
  readonly templates: Map<string, QuestTemplate>;
  readonly quests: Map<string, GeneratedQuest>;
  readonly chains: Map<string, QuestChain>;
  readonly activeQuestsByDynasty: Map<string, Set<string>>;
  readonly templateInstanceCounts: Map<string, number>;
}

export function createProceduralQuestModule(deps: QuestDeps): ProceduralQuestModule {
  const state: ModuleState = {
    templates: new Map(),
    quests: new Map(),
    chains: new Map(),
    activeQuestsByDynasty: new Map(),
    templateInstanceCounts: new Map(),
  };

  return {
    registerTemplate: (template) => registerTemplate(state, deps, template),
    generateQuest: (trigger) => generateQuest(state, deps, trigger),
    activateQuest: (questId, dynastyId) => activateQuest(state, deps, questId, dynastyId),
    completeQuest: (questId) => completeQuest(state, deps, questId),
    failQuest: (questId, reason) => failQuest(state, deps, questId, reason),
    getActiveQuests: (dynastyId) => getActiveQuests(state, dynastyId),
    getQuestChain: (chainId) => getQuestChain(state, chainId),
    createChain: (name, templateIds) => createChain(state, deps, name, templateIds),
    advanceChain: (chainId) => advanceChain(state, deps, chainId),
    getTemplateStats: () => getTemplateStats(state),
    expireOldQuests: () => expireOldQuests(state, deps),
  };
}

function registerTemplate(
  state: ModuleState,
  deps: QuestDeps,
  template: QuestTemplate,
): string | { error: string } {
  if (state.templates.has(template.templateId)) {
    return { error: 'TEMPLATE_ALREADY_EXISTS' };
  }

  if (template.name.length === 0) {
    return { error: 'TEMPLATE_NAME_EMPTY' };
  }

  state.templates.set(template.templateId, template);
  state.templateInstanceCounts.set(template.templateId, 0);

  deps.logger.info('quest_template_registered', {
    templateId: template.templateId,
    difficulty: template.difficulty,
  });

  return template.templateId;
}

function generateQuest(
  state: ModuleState,
  deps: QuestDeps,
  trigger: QuestTrigger,
): GeneratedQuest | { error: string } {
  const matchingTemplates = findMatchingTemplates(state, trigger);

  if (matchingTemplates.length === 0) {
    return { error: 'NO_MATCHING_TEMPLATE' };
  }

  const template = selectTemplateByDifficulty(matchingTemplates, trigger.severity);
  const instanceCount = state.templateInstanceCounts.get(template.templateId) ?? 0;

  if (instanceCount >= template.maxActiveInstances) {
    return { error: 'MAX_INSTANCES_REACHED' };
  }

  const questId = deps.idGen.generate();
  const now = deps.clock.nowMicroseconds();
  const durationMicros = BigInt(template.estimatedDurationMinutes) * 60n * 1000000n;
  const scaledReward = scaleRewardByDifficulty(template.baseReward, template.difficulty);

  const quest: GeneratedQuest = {
    questId,
    templateId: template.templateId,
    name: template.name,
    description: template.description,
    difficulty: template.difficulty,
    reward: scaledReward,
    createdAtMicros: now,
    expiresAtMicros: now + durationMicros,
    worldId: trigger.worldId,
    status: 'ACTIVE',
    completedAtMicros: null,
    assignedDynastyId: null,
  };

  state.quests.set(questId, quest);
  state.templateInstanceCounts.set(template.templateId, instanceCount + 1);

  deps.logger.info('quest_generated', {
    questId,
    templateId: template.templateId,
    worldId: trigger.worldId,
  });

  return quest;
}

function findMatchingTemplates(
  state: ModuleState,
  trigger: QuestTrigger,
): ReadonlyArray<QuestTemplate> {
  const matching: QuestTemplate[] = [];

  for (const template of state.templates.values()) {
    if (template.triggerType === trigger.type) {
      matching.push(template);
    }
  }

  return matching;
}

function selectTemplateByDifficulty(
  templates: ReadonlyArray<QuestTemplate>,
  severity: number,
): QuestTemplate {
  if (severity < 0.2) {
    const trivial = templates.find((t) => t.difficulty === 'TRIVIAL');
    if (trivial !== undefined) {
      return trivial;
    }
  }

  if (severity < 0.4) {
    const easy = templates.find((t) => t.difficulty === 'EASY');
    if (easy !== undefined) {
      return easy;
    }
  }

  if (severity < 0.6) {
    const moderate = templates.find((t) => t.difficulty === 'MODERATE');
    if (moderate !== undefined) {
      return moderate;
    }
  }

  if (severity < 0.8) {
    const hard = templates.find((t) => t.difficulty === 'HARD');
    if (hard !== undefined) {
      return hard;
    }
  }

  const legendary = templates.find((t) => t.difficulty === 'LEGENDARY');
  if (legendary !== undefined) {
    return legendary;
  }

  const first = templates[0];
  if (first === undefined) {
    throw new Error('No templates available');
  }

  return first;
}

function scaleRewardByDifficulty(base: QuestReward, difficulty: QuestDifficulty): QuestReward {
  const multipliers: Record<QuestDifficulty, number> = {
    TRIVIAL: 1,
    EASY: 2,
    MODERATE: 4,
    HARD: 8,
    LEGENDARY: 16,
  };

  const mult = BigInt(multipliers[difficulty]);

  return {
    kalonAmount: base.kalonAmount * mult,
    experiencePoints: base.experiencePoints * Number(mult),
    items: base.items,
    reputationGain: base.reputationGain * Number(mult),
  };
}

function activateQuest(
  state: ModuleState,
  deps: QuestDeps,
  questId: string,
  dynastyId: string,
): string | { error: string } {
  const quest = state.quests.get(questId);

  if (quest === undefined) {
    return { error: 'QUEST_NOT_FOUND' };
  }

  if (quest.assignedDynastyId !== null) {
    return { error: 'QUEST_ALREADY_ASSIGNED' };
  }

  if (quest.status !== 'ACTIVE') {
    return { error: 'QUEST_NOT_ACTIVE' };
  }

  const now = deps.clock.nowMicroseconds();
  if (now > quest.expiresAtMicros) {
    return { error: 'QUEST_EXPIRED' };
  }

  const updated: GeneratedQuest = {
    ...quest,
    assignedDynastyId: dynastyId,
  };

  state.quests.set(questId, updated);

  let dynastyQuests = state.activeQuestsByDynasty.get(dynastyId);
  if (dynastyQuests === undefined) {
    dynastyQuests = new Set();
    state.activeQuestsByDynasty.set(dynastyId, dynastyQuests);
  }
  dynastyQuests.add(questId);

  deps.logger.info('quest_activated', { questId, dynastyId });

  return questId;
}

function completeQuest(
  state: ModuleState,
  deps: QuestDeps,
  questId: string,
): QuestReward | { error: string } {
  const quest = state.quests.get(questId);

  if (quest === undefined) {
    return { error: 'QUEST_NOT_FOUND' };
  }

  if (quest.status !== 'ACTIVE') {
    return { error: 'QUEST_NOT_ACTIVE' };
  }

  const now = deps.clock.nowMicroseconds();

  if (now > quest.expiresAtMicros) {
    return { error: 'QUEST_EXPIRED' };
  }

  const updated: GeneratedQuest = {
    ...quest,
    status: 'COMPLETED',
    completedAtMicros: now,
  };

  state.quests.set(questId, updated);

  const templateCount = state.templateInstanceCounts.get(quest.templateId) ?? 0;
  if (templateCount > 0) {
    state.templateInstanceCounts.set(quest.templateId, templateCount - 1);
  }

  if (quest.assignedDynastyId !== null) {
    const dynastyQuests = state.activeQuestsByDynasty.get(quest.assignedDynastyId);
    if (dynastyQuests !== undefined) {
      dynastyQuests.delete(questId);
    }
  }

  deps.logger.info('quest_completed', { questId, reward: String(quest.reward.kalonAmount) });

  return quest.reward;
}

function failQuest(
  state: ModuleState,
  deps: QuestDeps,
  questId: string,
  reason: string,
): string | { error: string } {
  const quest = state.quests.get(questId);

  if (quest === undefined) {
    return { error: 'QUEST_NOT_FOUND' };
  }

  if (quest.status !== 'ACTIVE') {
    return { error: 'QUEST_NOT_ACTIVE' };
  }

  const updated: GeneratedQuest = {
    ...quest,
    status: 'FAILED',
    completedAtMicros: deps.clock.nowMicroseconds(),
  };

  state.quests.set(questId, updated);

  const templateCount = state.templateInstanceCounts.get(quest.templateId) ?? 0;
  if (templateCount > 0) {
    state.templateInstanceCounts.set(quest.templateId, templateCount - 1);
  }

  if (quest.assignedDynastyId !== null) {
    const dynastyQuests = state.activeQuestsByDynasty.get(quest.assignedDynastyId);
    if (dynastyQuests !== undefined) {
      dynastyQuests.delete(questId);
    }
  }

  deps.logger.warn('quest_failed', { questId, reason });

  return questId;
}

function getActiveQuests(state: ModuleState, dynastyId: string): ReadonlyArray<GeneratedQuest> {
  const questIds = state.activeQuestsByDynasty.get(dynastyId);

  if (questIds === undefined) {
    return [];
  }

  const quests: GeneratedQuest[] = [];

  for (const questId of questIds) {
    const quest = state.quests.get(questId);
    if (quest !== undefined && quest.status === 'ACTIVE') {
      quests.push(quest);
    }
  }

  return quests;
}

function getQuestChain(state: ModuleState, chainId: string): QuestChain | { error: string } {
  const chain = state.chains.get(chainId);

  if (chain === undefined) {
    return { error: 'CHAIN_NOT_FOUND' };
  }

  return chain;
}

function createChain(
  state: ModuleState,
  deps: QuestDeps,
  name: string,
  templateIds: ReadonlyArray<string>,
): string | { error: string } {
  if (templateIds.length === 0) {
    return { error: 'EMPTY_CHAIN' };
  }

  for (const tid of templateIds) {
    if (!state.templates.has(tid)) {
      return { error: 'TEMPLATE_NOT_FOUND' };
    }
  }

  const chainId = deps.idGen.generate();

  const chain: QuestChain = {
    chainId,
    name,
    questIds: [],
    currentIndex: 0,
    completed: false,
  };

  state.chains.set(chainId, chain);

  deps.logger.info('quest_chain_created', { chainId, name, length: templateIds.length });

  return chainId;
}

function advanceChain(
  state: ModuleState,
  deps: QuestDeps,
  chainId: string,
): GeneratedQuest | { error: string } {
  const chain = state.chains.get(chainId);

  if (chain === undefined) {
    return { error: 'CHAIN_NOT_FOUND' };
  }

  if (chain.completed) {
    return { error: 'CHAIN_ALREADY_COMPLETED' };
  }

  if (chain.currentIndex >= chain.questIds.length) {
    return { error: 'CHAIN_END_REACHED' };
  }

  const questId = chain.questIds[chain.currentIndex];

  if (questId === undefined) {
    return { error: 'INVALID_CHAIN_STATE' };
  }

  const quest = state.quests.get(questId);

  if (quest === undefined) {
    return { error: 'QUEST_NOT_FOUND' };
  }

  const updated: QuestChain = {
    ...chain,
    currentIndex: chain.currentIndex + 1,
    completed: chain.currentIndex + 1 >= chain.questIds.length,
  };

  state.chains.set(chainId, updated);

  deps.logger.info('quest_chain_advanced', { chainId, index: updated.currentIndex });

  return quest;
}

function getTemplateStats(state: ModuleState): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const [templateId, count] of state.templateInstanceCounts.entries()) {
    stats[templateId] = count;
  }

  return stats;
}

function expireOldQuests(state: ModuleState, deps: QuestDeps): number {
  const now = deps.clock.nowMicroseconds();
  let expiredCount = 0;

  for (const [questId, quest] of state.quests.entries()) {
    if (quest.status === 'ACTIVE' && now > quest.expiresAtMicros) {
      const updated: GeneratedQuest = {
        ...quest,
        status: 'EXPIRED',
      };

      state.quests.set(questId, updated);

      const templateCount = state.templateInstanceCounts.get(quest.templateId) ?? 0;
      if (templateCount > 0) {
        state.templateInstanceCounts.set(quest.templateId, templateCount - 1);
      }

      if (quest.assignedDynastyId !== null) {
        const dynastyQuests = state.activeQuestsByDynasty.get(quest.assignedDynastyId);
        if (dynastyQuests !== undefined) {
          dynastyQuests.delete(questId);
        }
      }

      expiredCount = expiredCount + 1;
    }
  }

  if (expiredCount > 0) {
    deps.logger.info('quests_expired', { count: expiredCount });
  }

  return expiredCount;
}
