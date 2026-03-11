/**
 * npc-quest-giver.ts — NPC quest generation and distribution.
 *
 * Dynamic quest generation based on world state, quest difficulty
 * scaling, quest chain creation, reward balancing, NPC reputation
 * affecting available quests, and quest pool management.
 */

// ── Ports ────────────────────────────────────────────────────────

interface QuestClock {
  readonly nowMicroseconds: () => number;
}

interface QuestIdGenerator {
  readonly generate: () => string;
}

interface QuestGiverDeps {
  readonly clock: QuestClock;
  readonly idGenerator: QuestIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type QuestDifficulty = 'trivial' | 'easy' | 'normal' | 'hard' | 'legendary';

type QuestStatus = 'available' | 'active' | 'completed' | 'failed' | 'expired';

type QuestCategory = 'combat' | 'gather' | 'deliver' | 'explore' | 'escort' | 'craft';

interface QuestReward {
  readonly rewardType: string;
  readonly amount: number;
}

interface QuestObjective {
  readonly objectiveId: string;
  readonly description: string;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly completed: boolean;
}

interface Quest {
  readonly questId: string;
  readonly title: string;
  readonly description: string;
  readonly giverId: string;
  readonly category: QuestCategory;
  readonly difficulty: QuestDifficulty;
  readonly status: QuestStatus;
  readonly rewards: readonly QuestReward[];
  readonly objectives: readonly QuestObjective[];
  readonly chainId: string | null;
  readonly chainOrder: number;
  readonly requiredReputation: number;
  readonly createdAt: number;
  readonly expiresAt: number | null;
}

interface CreateQuestParams {
  readonly title: string;
  readonly description: string;
  readonly giverId: string;
  readonly category: QuestCategory;
  readonly difficulty: QuestDifficulty;
  readonly rewards: readonly QuestReward[];
  readonly objectives: readonly QuestObjective[];
  readonly requiredReputation: number;
  readonly expiresAt: number | null;
}

interface QuestChain {
  readonly chainId: string;
  readonly name: string;
  readonly questIds: readonly string[];
  readonly createdAt: number;
}

interface WorldStateHint {
  readonly hintType: string;
  readonly location: string;
  readonly severity: number;
  readonly resourceType: string | null;
}

interface QuestPoolConfig {
  readonly maxQuestsPerGiver: number;
  readonly maxActiveQuestsPerPlayer: number;
  readonly baseRewardMultiplier: number;
}

interface QuestAcceptResult {
  readonly success: boolean;
  readonly reason: string;
  readonly quest: Quest | undefined;
}

interface QuestProgressResult {
  readonly questId: string;
  readonly objectiveId: string;
  readonly completed: boolean;
  readonly questCompleted: boolean;
}

interface GeneratedQuestBatch {
  readonly quests: readonly Quest[];
  readonly generatedFrom: string;
}

interface QuestGiverStats {
  readonly totalQuests: number;
  readonly totalChains: number;
  readonly questsByStatus: Readonly<Record<QuestStatus, number>>;
  readonly questsByDifficulty: Readonly<Record<QuestDifficulty, number>>;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_POOL_CONFIG: QuestPoolConfig = {
  maxQuestsPerGiver: 10,
  maxActiveQuestsPerPlayer: 5,
  baseRewardMultiplier: 1.0,
};

const DIFFICULTY_MULTIPLIERS: Readonly<Record<QuestDifficulty, number>> = {
  trivial: 0.5,
  easy: 0.75,
  normal: 1.0,
  hard: 1.5,
  legendary: 3.0,
};

const CATEGORY_FROM_HINT: Readonly<Record<string, QuestCategory>> = {
  threat: 'combat',
  shortage: 'gather',
  delivery: 'deliver',
  discovery: 'explore',
  protection: 'escort',
  production: 'craft',
};

// ── State ────────────────────────────────────────────────────────

interface MutableQuest {
  readonly questId: string;
  readonly title: string;
  readonly description: string;
  readonly giverId: string;
  readonly category: QuestCategory;
  readonly difficulty: QuestDifficulty;
  status: QuestStatus;
  readonly rewards: readonly QuestReward[];
  readonly objectives: MutableObjective[];
  readonly chainId: string | null;
  readonly chainOrder: number;
  readonly requiredReputation: number;
  readonly createdAt: number;
  readonly expiresAt: number | null;
  assignedTo: string | null;
}

interface MutableObjective {
  readonly objectiveId: string;
  readonly description: string;
  readonly targetCount: number;
  currentCount: number;
  completed: boolean;
}

interface QuestGiverState {
  readonly deps: QuestGiverDeps;
  readonly config: QuestPoolConfig;
  readonly quests: Map<string, MutableQuest>;
  readonly chains: Map<string, QuestChain>;
  readonly giverQuests: Map<string, string[]>;
  readonly playerActiveQuests: Map<string, string[]>;
}

// ── Public API ───────────────────────────────────────────────────

interface QuestGiverEngine {
  readonly createQuest: (params: CreateQuestParams) => Quest;
  readonly getQuest: (questId: string) => Quest | undefined;
  readonly removeQuest: (questId: string) => boolean;
  readonly getQuestsByGiver: (giverId: string) => readonly Quest[];
  readonly getAvailableQuests: (giverId: string, playerReputation: number) => readonly Quest[];
  readonly acceptQuest: (questId: string, playerId: string) => QuestAcceptResult;
  readonly progressObjective: (
    questId: string,
    objectiveId: string,
    amount: number,
  ) => QuestProgressResult | undefined;
  readonly completeQuest: (questId: string) => boolean;
  readonly failQuest: (questId: string) => boolean;
  readonly expireQuests: () => number;
  readonly getActiveQuests: (playerId: string) => readonly Quest[];
  readonly createChain: (name: string, questIds: readonly string[]) => QuestChain | undefined;
  readonly getChain: (chainId: string) => QuestChain | undefined;
  readonly getNextInChain: (chainId: string, currentOrder: number) => Quest | undefined;
  readonly generateFromWorldState: (
    giverId: string,
    hints: readonly WorldStateHint[],
  ) => GeneratedQuestBatch;
  readonly calculateScaledReward: (base: number, difficulty: QuestDifficulty) => number;
  readonly getStats: () => QuestGiverStats;
}

// ── Helpers ──────────────────────────────────────────────────────

function toQuest(q: MutableQuest): Quest {
  return {
    questId: q.questId,
    title: q.title,
    description: q.description,
    giverId: q.giverId,
    category: q.category,
    difficulty: q.difficulty,
    status: q.status,
    rewards: q.rewards,
    objectives: q.objectives.map(toObjective),
    chainId: q.chainId,
    chainOrder: q.chainOrder,
    requiredReputation: q.requiredReputation,
    createdAt: q.createdAt,
    expiresAt: q.expiresAt,
  };
}

function toObjective(o: MutableObjective): QuestObjective {
  return {
    objectiveId: o.objectiveId,
    description: o.description,
    targetCount: o.targetCount,
    currentCount: o.currentCount,
    completed: o.completed,
  };
}

function categoryFromHint(hintType: string): QuestCategory {
  return CATEGORY_FROM_HINT[hintType] ?? 'explore';
}

function difficultyFromSeverity(severity: number): QuestDifficulty {
  if (severity <= 2) return 'trivial';
  if (severity <= 4) return 'easy';
  if (severity <= 6) return 'normal';
  if (severity <= 8) return 'hard';
  return 'legendary';
}

function getOrCreateList(map: Map<string, string[]>, key: string): string[] {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  return list;
}

function allObjectivesComplete(objectives: readonly MutableObjective[]): boolean {
  for (const obj of objectives) {
    if (!obj.completed) return false;
  }
  return true;
}

// ── Operations ───────────────────────────────────────────────────

function createQuestImpl(state: QuestGiverState, params: CreateQuestParams): Quest {
  const quest: MutableQuest = {
    questId: state.deps.idGenerator.generate(),
    title: params.title,
    description: params.description,
    giverId: params.giverId,
    category: params.category,
    difficulty: params.difficulty,
    status: 'available',
    rewards: params.rewards,
    objectives: params.objectives.map((o) => ({ ...o })),
    chainId: null,
    chainOrder: 0,
    requiredReputation: params.requiredReputation,
    createdAt: state.deps.clock.nowMicroseconds(),
    expiresAt: params.expiresAt,
    assignedTo: null,
  };
  state.quests.set(quest.questId, quest);
  getOrCreateList(state.giverQuests, params.giverId).push(quest.questId);
  return toQuest(quest);
}

function getQuestsByGiverImpl(state: QuestGiverState, giverId: string): readonly Quest[] {
  const ids = state.giverQuests.get(giverId);
  if (!ids) return [];
  const results: Quest[] = [];
  for (const id of ids) {
    const q = state.quests.get(id);
    if (q) results.push(toQuest(q));
  }
  return results;
}

function getAvailableQuestsImpl(
  state: QuestGiverState,
  giverId: string,
  playerReputation: number,
): readonly Quest[] {
  const ids = state.giverQuests.get(giverId);
  if (!ids) return [];
  const results: Quest[] = [];
  for (const id of ids) {
    const q = state.quests.get(id);
    if (!q || q.status !== 'available') continue;
    if (q.requiredReputation > playerReputation) continue;
    results.push(toQuest(q));
  }
  return results;
}

function acceptQuestImpl(
  state: QuestGiverState,
  questId: string,
  playerId: string,
): QuestAcceptResult {
  const quest = state.quests.get(questId);
  if (!quest) return { success: false, reason: 'quest not found', quest: undefined };
  if (quest.status !== 'available') {
    return { success: false, reason: 'quest not available', quest: undefined };
  }
  const active = state.playerActiveQuests.get(playerId);
  if (active && active.length >= state.config.maxActiveQuestsPerPlayer) {
    return { success: false, reason: 'too many active quests', quest: undefined };
  }
  quest.status = 'active';
  quest.assignedTo = playerId;
  getOrCreateList(state.playerActiveQuests, playerId).push(questId);
  return { success: true, reason: 'accepted', quest: toQuest(quest) };
}

function progressObjectiveImpl(
  state: QuestGiverState,
  questId: string,
  objectiveId: string,
  amount: number,
): QuestProgressResult | undefined {
  const quest = state.quests.get(questId);
  if (!quest || quest.status !== 'active') return undefined;
  const obj = quest.objectives.find((o) => o.objectiveId === objectiveId);
  if (!obj) return undefined;
  obj.currentCount = Math.min(obj.currentCount + amount, obj.targetCount);
  obj.completed = obj.currentCount >= obj.targetCount;
  const questDone = allObjectivesComplete(quest.objectives);
  return {
    questId,
    objectiveId,
    completed: obj.completed,
    questCompleted: questDone,
  };
}

function completeQuestImpl(state: QuestGiverState, questId: string): boolean {
  const quest = state.quests.get(questId);
  if (!quest || quest.status !== 'active') return false;
  quest.status = 'completed';
  removeFromPlayerActive(state, quest.assignedTo, questId);
  return true;
}

function failQuestImpl(state: QuestGiverState, questId: string): boolean {
  const quest = state.quests.get(questId);
  if (!quest || quest.status !== 'active') return false;
  quest.status = 'failed';
  removeFromPlayerActive(state, quest.assignedTo, questId);
  return true;
}

function removeFromPlayerActive(
  state: QuestGiverState,
  playerId: string | null,
  questId: string,
): void {
  if (playerId === null) return;
  const list = state.playerActiveQuests.get(playerId);
  if (!list) return;
  const idx = list.indexOf(questId);
  if (idx !== -1) list.splice(idx, 1);
}

function expireQuestsImpl(state: QuestGiverState): number {
  const now = state.deps.clock.nowMicroseconds();
  let expired = 0;
  for (const quest of state.quests.values()) {
    if (quest.status !== 'available') continue;
    if (quest.expiresAt === null) continue;
    if (now < quest.expiresAt) continue;
    quest.status = 'expired';
    expired++;
  }
  return expired;
}

function createChainImpl(
  state: QuestGiverState,
  name: string,
  questIds: readonly string[],
): QuestChain | undefined {
  for (const id of questIds) {
    if (!state.quests.has(id)) return undefined;
  }
  const chain: QuestChain = {
    chainId: state.deps.idGenerator.generate(),
    name,
    questIds,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.chains.set(chain.chainId, chain);
  for (let i = 0; i < questIds.length; i++) {
    const qId = questIds[i];
    if (qId === undefined) continue;
    const quest = state.quests.get(qId);
    if (!quest) continue;
    assignToChain(quest, chain.chainId, i);
  }
  return chain;
}

function assignToChain(quest: MutableQuest, chainId: string, order: number): void {
  const mutable = quest as { chainId: string | null; chainOrder: number };
  mutable.chainId = chainId;
  mutable.chainOrder = order;
}

function getNextInChainImpl(
  state: QuestGiverState,
  chainId: string,
  currentOrder: number,
): Quest | undefined {
  const chain = state.chains.get(chainId);
  if (!chain) return undefined;
  const nextIdx = currentOrder + 1;
  if (nextIdx >= chain.questIds.length) return undefined;
  const nextId = chain.questIds[nextIdx];
  if (nextId === undefined) return undefined;
  const quest = state.quests.get(nextId);
  return quest ? toQuest(quest) : undefined;
}

function generateFromWorldStateImpl(
  state: QuestGiverState,
  giverId: string,
  hints: readonly WorldStateHint[],
): GeneratedQuestBatch {
  const quests: Quest[] = [];
  for (const hint of hints) {
    const quest = buildQuestFromHint(state, giverId, hint);
    quests.push(quest);
  }
  return { quests, generatedFrom: 'world_state' };
}

function buildQuestFromHint(state: QuestGiverState, giverId: string, hint: WorldStateHint): Quest {
  const category = categoryFromHint(hint.hintType);
  const difficulty = difficultyFromSeverity(hint.severity);
  const baseReward = Math.round(100 * DIFFICULTY_MULTIPLIERS[difficulty]);
  const params: CreateQuestParams = {
    title: hint.hintType + ' at ' + hint.location,
    description: 'Respond to ' + hint.hintType + ' in ' + hint.location,
    giverId,
    category,
    difficulty,
    rewards: [{ rewardType: 'kalon', amount: baseReward }],
    objectives: [
      {
        objectiveId: state.deps.idGenerator.generate(),
        description: 'Complete ' + hint.hintType + ' task',
        targetCount: Math.max(1, hint.severity),
        currentCount: 0,
        completed: false,
      },
    ],
    requiredReputation: 0,
    expiresAt: null,
  };
  return createQuestImpl(state, params);
}

function getStatsImpl(state: QuestGiverState): QuestGiverStats {
  const byStatus: Record<QuestStatus, number> = {
    available: 0,
    active: 0,
    completed: 0,
    failed: 0,
    expired: 0,
  };
  const byDifficulty: Record<QuestDifficulty, number> = {
    trivial: 0,
    easy: 0,
    normal: 0,
    hard: 0,
    legendary: 0,
  };
  for (const q of state.quests.values()) {
    byStatus[q.status]++;
    byDifficulty[q.difficulty]++;
  }
  return {
    totalQuests: state.quests.size,
    totalChains: state.chains.size,
    questsByStatus: byStatus,
    questsByDifficulty: byDifficulty,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function initQuestState(deps: QuestGiverDeps, config: QuestPoolConfig): QuestGiverState {
  return {
    deps,
    config,
    quests: new Map(),
    chains: new Map(),
    giverQuests: new Map(),
    playerActiveQuests: new Map(),
  };
}

function getQuestImpl(state: QuestGiverState, id: string): Quest | undefined {
  const q = state.quests.get(id);
  return q ? toQuest(q) : undefined;
}

function getActiveQuestsImpl(state: QuestGiverState, pid: string): readonly Quest[] {
  const ids = state.playerActiveQuests.get(pid) ?? [];
  const results: Quest[] = [];
  for (const id of ids) {
    const q = state.quests.get(id);
    if (q) results.push(toQuest(q));
  }
  return results;
}

function buildQuestCoreMethods(
  state: QuestGiverState,
): Pick<
  QuestGiverEngine,
  'createQuest' | 'getQuest' | 'removeQuest' | 'getQuestsByGiver' | 'getAvailableQuests'
> {
  return {
    createQuest: (p) => createQuestImpl(state, p),
    getQuest: (id) => getQuestImpl(state, id),
    removeQuest: (id) => state.quests.delete(id),
    getQuestsByGiver: (gid) => getQuestsByGiverImpl(state, gid),
    getAvailableQuests: (gid, rep) => getAvailableQuestsImpl(state, gid, rep),
  };
}

function buildQuestLifecycleMethods(
  state: QuestGiverState,
): Pick<
  QuestGiverEngine,
  | 'acceptQuest'
  | 'progressObjective'
  | 'completeQuest'
  | 'failQuest'
  | 'expireQuests'
  | 'getActiveQuests'
> {
  return {
    acceptQuest: (qid, pid) => acceptQuestImpl(state, qid, pid),
    progressObjective: (qid, oid, a) => progressObjectiveImpl(state, qid, oid, a),
    completeQuest: (qid) => completeQuestImpl(state, qid),
    failQuest: (qid) => failQuestImpl(state, qid),
    expireQuests: () => expireQuestsImpl(state),
    getActiveQuests: (pid) => getActiveQuestsImpl(state, pid),
  };
}

function createQuestGiverEngine(
  deps: QuestGiverDeps,
  config: QuestPoolConfig = DEFAULT_POOL_CONFIG,
): QuestGiverEngine {
  const state = initQuestState(deps, config);
  return {
    ...buildQuestCoreMethods(state),
    ...buildQuestLifecycleMethods(state),
    createChain: (name, ids) => createChainImpl(state, name, ids),
    getChain: (id) => state.chains.get(id),
    getNextInChain: (cid, order) => getNextInChainImpl(state, cid, order),
    generateFromWorldState: (gid, hints) => generateFromWorldStateImpl(state, gid, hints),
    calculateScaledReward: (base, diff) =>
      Math.round(base * DIFFICULTY_MULTIPLIERS[diff] * config.baseRewardMultiplier),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createQuestGiverEngine, DEFAULT_POOL_CONFIG, DIFFICULTY_MULTIPLIERS };
export type {
  QuestGiverEngine,
  QuestGiverDeps,
  QuestPoolConfig,
  Quest,
  QuestDifficulty,
  QuestStatus,
  QuestCategory,
  QuestReward,
  QuestObjective,
  QuestChain,
  WorldStateHint,
  QuestAcceptResult,
  QuestProgressResult,
  GeneratedQuestBatch,
  CreateQuestParams,
  QuestGiverStats,
};
