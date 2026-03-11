/**
 * quest-engine.ts — Quest/objective system for dynasties.
 *
 * Manages quest definitions with prerequisite chains, multi-step
 * objectives, time-limited quests, and reward distribution. Quests
 * progress through a lifecycle from AVAILABLE through ACTIVE to
 * COMPLETED or FAILED. Rewards include KALON (bigint), items, and
 * reputation points.
 *
 * Quest Lifecycle:
 *   AVAILABLE  -> Dynasty meets prerequisites, can accept
 *   ACTIVE     -> Dynasty is working on objectives
 *   COMPLETED  -> All objectives met, rewards claimable
 *   FAILED     -> Time expired or dynasty abandoned
 *   EXPIRED    -> Quest no longer available
 */

// ── Ports ────────────────────────────────────────────────────────

export interface QuestClock {
  readonly nowMicroseconds: () => number;
}

export interface QuestIdGenerator {
  readonly generate: () => string;
}

export interface QuestNotificationPort {
  readonly notify: (dynastyId: string, event: QuestEvent) => void;
}

export interface QuestEngineDeps {
  readonly clock: QuestClock;
  readonly idGenerator: QuestIdGenerator;
  readonly notifications: QuestNotificationPort;
}

// ── Types ────────────────────────────────────────────────────────

export type QuestStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export type QuestEventKind =
  | 'QUEST_ACCEPTED'
  | 'OBJECTIVE_COMPLETED'
  | 'QUEST_COMPLETED'
  | 'QUEST_FAILED'
  | 'REWARD_CLAIMED';

export interface QuestEvent {
  readonly kind: QuestEventKind;
  readonly questId: string;
  readonly dynastyId: string;
  readonly timestamp: number;
}

export interface QuestObjective {
  readonly id: string;
  readonly description: string;
  readonly requiredCount: number;
}

export interface QuestReward {
  readonly microKalon: bigint;
  readonly items: readonly QuestRewardItem[];
  readonly reputationPoints: number;
}

export interface QuestRewardItem {
  readonly itemId: string;
  readonly quantity: number;
}

export interface QuestDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly objectives: readonly QuestObjective[];
  readonly reward: QuestReward;
  readonly prerequisiteQuestIds: readonly string[];
  readonly timeLimitMicroseconds: number | null;
  readonly repeatable: boolean;
  readonly maxLevel: number;
}

export interface ObjectiveProgress {
  readonly objectiveId: string;
  readonly currentCount: number;
  readonly requiredCount: number;
  readonly completed: boolean;
}

export interface QuestInstance {
  readonly instanceId: string;
  readonly questId: string;
  readonly dynastyId: string;
  readonly status: QuestStatus;
  readonly objectives: readonly ObjectiveProgress[];
  readonly acceptedAt: number;
  readonly expiresAt: number | null;
  readonly completedAt: number | null;
  readonly rewardClaimed: boolean;
}

export interface QuestJournal {
  readonly dynastyId: string;
  readonly activeQuests: readonly QuestInstance[];
  readonly completedQuests: readonly QuestInstance[];
  readonly failedQuests: readonly QuestInstance[];
  readonly totalCompleted: number;
  readonly totalRewardsClaimed: bigint;
}

export interface QuestEngineStats {
  readonly totalDefinitions: number;
  readonly totalActiveInstances: number;
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly totalRewardsDistributed: bigint;
}

export interface QuestEngine {
  readonly defineQuest: (def: QuestDefinition) => void;
  readonly getDefinition: (id: string) => QuestDefinition | undefined;
  readonly listAvailable: (dynastyId: string) => readonly QuestDefinition[];
  readonly acceptQuest: (dynastyId: string, questId: string) => QuestInstance;
  readonly advanceObjective: (
    instanceId: string,
    objectiveId: string,
    amount: number,
  ) => QuestInstance;
  readonly abandonQuest: (instanceId: string) => QuestInstance;
  readonly checkExpiration: (instanceId: string) => QuestInstance;
  readonly claimReward: (instanceId: string) => QuestReward;
  readonly getInstance: (instanceId: string) => QuestInstance | undefined;
  readonly getJournal: (dynastyId: string) => QuestJournal;
  readonly listActiveByDynasty: (dynastyId: string) => readonly QuestInstance[];
  readonly getStats: () => QuestEngineStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableObjectiveProgress {
  readonly objectiveId: string;
  currentCount: number;
  readonly requiredCount: number;
  completed: boolean;
}

interface MutableQuestInstance {
  readonly instanceId: string;
  readonly questId: string;
  readonly dynastyId: string;
  status: QuestStatus;
  readonly objectives: MutableObjectiveProgress[];
  readonly acceptedAt: number;
  readonly expiresAt: number | null;
  completedAt: number | null;
  rewardClaimed: boolean;
}

interface DynastyQuestState {
  readonly activeInstances: Set<string>;
  readonly completedQuestIds: Set<string>;
  readonly completionCounts: Map<string, number>;
  totalRewardsClaimed: bigint;
}

interface EngineState {
  readonly deps: QuestEngineDeps;
  readonly definitions: Map<string, QuestDefinition>;
  readonly instances: Map<string, MutableQuestInstance>;
  readonly dynastyState: Map<string, DynastyQuestState>;
  totalCompleted: number;
  totalFailed: number;
  totalRewardsDistributed: bigint;
}

// ── Helpers ──────────────────────────────────────────────────────

function objectiveToReadonly(o: MutableObjectiveProgress): ObjectiveProgress {
  return {
    objectiveId: o.objectiveId,
    currentCount: o.currentCount,
    requiredCount: o.requiredCount,
    completed: o.completed,
  };
}

function instanceToReadonly(inst: MutableQuestInstance): QuestInstance {
  return {
    instanceId: inst.instanceId,
    questId: inst.questId,
    dynastyId: inst.dynastyId,
    status: inst.status,
    objectives: inst.objectives.map(objectiveToReadonly),
    acceptedAt: inst.acceptedAt,
    expiresAt: inst.expiresAt,
    completedAt: inst.completedAt,
    rewardClaimed: inst.rewardClaimed,
  };
}

function ensureDynastyState(state: EngineState, dynastyId: string): DynastyQuestState {
  let ds = state.dynastyState.get(dynastyId);
  if (ds !== undefined) return ds;
  ds = {
    activeInstances: new Set(),
    completedQuestIds: new Set(),
    completionCounts: new Map(),
    totalRewardsClaimed: 0n,
  };
  state.dynastyState.set(dynastyId, ds);
  return ds;
}

function requireInstance(state: EngineState, instanceId: string): MutableQuestInstance {
  const inst = state.instances.get(instanceId);
  if (!inst) throw new Error('Quest instance ' + instanceId + ' not found');
  return inst;
}

function requireDefinition(state: EngineState, questId: string): QuestDefinition {
  const def = state.definitions.get(questId);
  if (!def) throw new Error('Quest ' + questId + ' not found');
  return def;
}

function emitEvent(
  state: EngineState,
  kind: QuestEventKind,
  questId: string,
  dynastyId: string,
): void {
  state.deps.notifications.notify(dynastyId, {
    kind,
    questId,
    dynastyId,
    timestamp: state.deps.clock.nowMicroseconds(),
  });
}

// ── Operations ───────────────────────────────────────────────────

function defineQuestImpl(state: EngineState, def: QuestDefinition): void {
  if (def.objectives.length === 0) {
    throw new Error('Quest must have at least one objective');
  }
  for (const obj of def.objectives) {
    if (obj.requiredCount <= 0) {
      throw new Error('Objective ' + obj.id + ' requires positive count');
    }
  }
  state.definitions.set(def.id, def);
}

function listAvailableImpl(state: EngineState, dynastyId: string): readonly QuestDefinition[] {
  const ds = state.dynastyState.get(dynastyId);
  const result: QuestDefinition[] = [];
  for (const def of state.definitions.values()) {
    if (isQuestAvailable(ds, def)) result.push(def);
  }
  return result;
}

function isQuestAvailable(ds: DynastyQuestState | undefined, def: QuestDefinition): boolean {
  if (!ds) return def.prerequisiteQuestIds.length === 0;
  if (!def.repeatable && ds.completedQuestIds.has(def.id)) return false;
  if (def.repeatable) {
    const count = ds.completionCounts.get(def.id) ?? 0;
    if (count >= def.maxLevel) return false;
  }
  return meetsPrerequisites(ds, def.prerequisiteQuestIds);
}

function meetsPrerequisites(ds: DynastyQuestState, prereqs: readonly string[]): boolean {
  for (const prereqId of prereqs) {
    if (!ds.completedQuestIds.has(prereqId)) return false;
  }
  return true;
}

function acceptQuestImpl(state: EngineState, dynastyId: string, questId: string): QuestInstance {
  const def = requireDefinition(state, questId);
  const ds = ensureDynastyState(state, dynastyId);
  validateAcceptance(ds, def);
  const instance = buildInstance(state, def, dynastyId);
  state.instances.set(instance.instanceId, instance);
  ds.activeInstances.add(instance.instanceId);
  emitEvent(state, 'QUEST_ACCEPTED', questId, dynastyId);
  return instanceToReadonly(instance);
}

function validateAcceptance(ds: DynastyQuestState, def: QuestDefinition): void {
  if (!def.repeatable && ds.completedQuestIds.has(def.id)) {
    throw new Error('Quest ' + def.id + ' already completed');
  }
  if (!meetsPrerequisites(ds, def.prerequisiteQuestIds)) {
    throw new Error('Prerequisites not met for quest ' + def.id);
  }
}

function buildInstance(
  state: EngineState,
  def: QuestDefinition,
  dynastyId: string,
): MutableQuestInstance {
  const now = state.deps.clock.nowMicroseconds();
  const objectives: MutableObjectiveProgress[] = def.objectives.map((o) => ({
    objectiveId: o.id,
    currentCount: 0,
    requiredCount: o.requiredCount,
    completed: false,
  }));
  const expiresAt = def.timeLimitMicroseconds !== null ? now + def.timeLimitMicroseconds : null;
  return {
    instanceId: state.deps.idGenerator.generate(),
    questId: def.id,
    dynastyId,
    status: 'ACTIVE',
    objectives,
    acceptedAt: now,
    expiresAt,
    completedAt: null,
    rewardClaimed: false,
  };
}

function advanceObjectiveImpl(
  state: EngineState,
  instanceId: string,
  objectiveId: string,
  amount: number,
): QuestInstance {
  if (amount <= 0) throw new Error('Advance amount must be positive');
  const inst = requireInstance(state, instanceId);
  if (inst.status !== 'ACTIVE') {
    throw new Error('Quest is not active');
  }
  const objective = findObjective(inst, objectiveId);
  if (objective.completed) return instanceToReadonly(inst);
  objective.currentCount = Math.min(objective.requiredCount, objective.currentCount + amount);
  if (objective.currentCount >= objective.requiredCount) {
    objective.completed = true;
    emitEvent(state, 'OBJECTIVE_COMPLETED', inst.questId, inst.dynastyId);
  }
  checkQuestCompletion(state, inst);
  return instanceToReadonly(inst);
}

function findObjective(inst: MutableQuestInstance, objectiveId: string): MutableObjectiveProgress {
  const obj = inst.objectives.find((o) => o.objectiveId === objectiveId);
  if (!obj) throw new Error('Objective ' + objectiveId + ' not found');
  return obj;
}

function checkQuestCompletion(state: EngineState, inst: MutableQuestInstance): void {
  const allDone = inst.objectives.every((o) => o.completed);
  if (!allDone) return;
  inst.status = 'COMPLETED';
  inst.completedAt = state.deps.clock.nowMicroseconds();
  state.totalCompleted += 1;
  recordCompletion(state, inst);
  emitEvent(state, 'QUEST_COMPLETED', inst.questId, inst.dynastyId);
}

function recordCompletion(state: EngineState, inst: MutableQuestInstance): void {
  const ds = ensureDynastyState(state, inst.dynastyId);
  ds.activeInstances.delete(inst.instanceId);
  ds.completedQuestIds.add(inst.questId);
  const prev = ds.completionCounts.get(inst.questId) ?? 0;
  ds.completionCounts.set(inst.questId, prev + 1);
}

function abandonQuestImpl(state: EngineState, instanceId: string): QuestInstance {
  const inst = requireInstance(state, instanceId);
  if (inst.status !== 'ACTIVE') {
    throw new Error('Can only abandon active quests');
  }
  inst.status = 'FAILED';
  state.totalFailed += 1;
  const ds = state.dynastyState.get(inst.dynastyId);
  if (ds) ds.activeInstances.delete(instanceId);
  emitEvent(state, 'QUEST_FAILED', inst.questId, inst.dynastyId);
  return instanceToReadonly(inst);
}

function checkExpirationImpl(state: EngineState, instanceId: string): QuestInstance {
  const inst = requireInstance(state, instanceId);
  if (inst.status !== 'ACTIVE') return instanceToReadonly(inst);
  if (inst.expiresAt === null) return instanceToReadonly(inst);
  const now = state.deps.clock.nowMicroseconds();
  if (now < inst.expiresAt) return instanceToReadonly(inst);
  inst.status = 'FAILED';
  state.totalFailed += 1;
  const ds = state.dynastyState.get(inst.dynastyId);
  if (ds) ds.activeInstances.delete(instanceId);
  emitEvent(state, 'QUEST_FAILED', inst.questId, inst.dynastyId);
  return instanceToReadonly(inst);
}

function claimRewardImpl(state: EngineState, instanceId: string): QuestReward {
  const inst = requireInstance(state, instanceId);
  if (inst.status !== 'COMPLETED') {
    throw new Error('Quest is not completed');
  }
  if (inst.rewardClaimed) {
    throw new Error('Reward already claimed for instance ' + instanceId);
  }
  const def = requireDefinition(state, inst.questId);
  inst.rewardClaimed = true;
  state.totalRewardsDistributed += def.reward.microKalon;
  const ds = state.dynastyState.get(inst.dynastyId);
  if (ds) ds.totalRewardsClaimed += def.reward.microKalon;
  emitEvent(state, 'REWARD_CLAIMED', inst.questId, inst.dynastyId);
  return def.reward;
}

// ── Queries ──────────────────────────────────────────────────────

function getInstanceImpl(state: EngineState, instanceId: string): QuestInstance | undefined {
  const inst = state.instances.get(instanceId);
  return inst ? instanceToReadonly(inst) : undefined;
}

function listActiveByDynastyImpl(state: EngineState, dynastyId: string): readonly QuestInstance[] {
  const ds = state.dynastyState.get(dynastyId);
  if (!ds) return [];
  const result: QuestInstance[] = [];
  for (const id of ds.activeInstances) {
    const inst = state.instances.get(id);
    if (inst && inst.status === 'ACTIVE') result.push(instanceToReadonly(inst));
  }
  return result;
}

function getJournalImpl(state: EngineState, dynastyId: string): QuestJournal {
  const active: QuestInstance[] = [];
  const completed: QuestInstance[] = [];
  const failed: QuestInstance[] = [];
  let totalCompleted = 0;
  const ds = state.dynastyState.get(dynastyId);
  const totalRewardsClaimed = ds ? ds.totalRewardsClaimed : 0n;
  for (const inst of state.instances.values()) {
    if (inst.dynastyId !== dynastyId) continue;
    categorizeInstance(inst, active, completed, failed);
    if (inst.status === 'COMPLETED') totalCompleted += 1;
  }
  return {
    dynastyId,
    activeQuests: active,
    completedQuests: completed,
    failedQuests: failed,
    totalCompleted,
    totalRewardsClaimed,
  };
}

function categorizeInstance(
  inst: MutableQuestInstance,
  active: QuestInstance[],
  completed: QuestInstance[],
  failed: QuestInstance[],
): void {
  const readonly = instanceToReadonly(inst);
  if (inst.status === 'ACTIVE') active.push(readonly);
  else if (inst.status === 'COMPLETED') completed.push(readonly);
  else if (inst.status === 'FAILED') failed.push(readonly);
}

function getStatsImpl(state: EngineState): QuestEngineStats {
  let activeCount = 0;
  for (const inst of state.instances.values()) {
    if (inst.status === 'ACTIVE') activeCount += 1;
  }
  return {
    totalDefinitions: state.definitions.size,
    totalActiveInstances: activeCount,
    totalCompleted: state.totalCompleted,
    totalFailed: state.totalFailed,
    totalRewardsDistributed: state.totalRewardsDistributed,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createQuestEngine(deps: QuestEngineDeps): QuestEngine {
  const state: EngineState = {
    deps,
    definitions: new Map(),
    instances: new Map(),
    dynastyState: new Map(),
    totalCompleted: 0,
    totalFailed: 0,
    totalRewardsDistributed: 0n,
  };

  return {
    defineQuest: (def) => {
      defineQuestImpl(state, def);
    },
    getDefinition: (id) => state.definitions.get(id),
    listAvailable: (did) => listAvailableImpl(state, did),
    acceptQuest: (did, qid) => acceptQuestImpl(state, did, qid),
    advanceObjective: (iid, oid, amt) => advanceObjectiveImpl(state, iid, oid, amt),
    abandonQuest: (iid) => abandonQuestImpl(state, iid),
    checkExpiration: (iid) => checkExpirationImpl(state, iid),
    claimReward: (iid) => claimRewardImpl(state, iid),
    getInstance: (iid) => getInstanceImpl(state, iid),
    getJournal: (did) => getJournalImpl(state, did),
    listActiveByDynasty: (did) => listActiveByDynastyImpl(state, did),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createQuestEngine };
