/**
 * quest-tracker.ts — Player quest management with objectives and rewards.
 *
 * Quests are defined from templates with objectives and a KALON reward.
 * Players accept, progress, fail, or abandon quests. Required objectives
 * gate completion; rewards are issued once per completed quest.
 */

// ── Types ─────────────────────────────────────────────────────────

export type QuestId = string;
export type PlayerId = string;
export type ObjectiveId = string;

export type QuestStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';

export type ObjectiveStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type QuestError =
  | 'quest-not-found'
  | 'player-not-found'
  | 'objective-not-found'
  | 'wrong-status'
  | 'already-registered'
  | 'already-accepted';

export interface QuestObjectiveTemplate {
  readonly objectiveId: string;
  readonly description: string;
  readonly required: boolean;
}

export interface QuestTemplate {
  readonly questId: QuestId;
  readonly title: string;
  readonly description: string;
  readonly objectives: ReadonlyArray<QuestObjectiveTemplate>;
  readonly rewardKalon: bigint;
  readonly timeLimit: bigint | null;
}

export interface PlayerQuest {
  readonly playerQuestId: string;
  readonly questId: QuestId;
  readonly playerId: PlayerId;
  readonly status: QuestStatus;
  readonly acceptedAt: bigint;
  readonly completedAt: bigint | null;
  readonly objectiveProgress: Map<ObjectiveId, ObjectiveStatus>;
}

export interface QuestReward {
  readonly rewardId: string;
  readonly playerQuestId: string;
  readonly playerId: PlayerId;
  readonly kalonAmount: bigint;
  readonly awardedAt: bigint;
}

export interface PlayerQuestStats {
  readonly playerId: PlayerId;
  readonly accepted: number;
  readonly completed: number;
  readonly failed: number;
  readonly abandoned: number;
  readonly totalKalonEarned: bigint;
}

export interface QuestTrackerSystem {
  defineQuest(
    questId: QuestId,
    title: string,
    description: string,
    objectives: ReadonlyArray<QuestObjectiveTemplate>,
    rewardKalon: bigint,
    timeLimit: bigint | null,
  ): QuestTemplate | QuestError;
  registerPlayer(playerId: PlayerId): { success: true } | { success: false; error: QuestError };
  acceptQuest(playerId: PlayerId, questId: QuestId): PlayerQuest | QuestError;
  progressObjective(
    playerQuestId: string,
    objectiveId: ObjectiveId,
  ): { success: true; questCompleted: boolean } | { success: false; error: QuestError };
  failObjective(
    playerQuestId: string,
    objectiveId: ObjectiveId,
  ): { success: true; questFailed: boolean } | { success: false; error: QuestError };
  abandonQuest(playerQuestId: string): { success: true } | { success: false; error: QuestError };
  awardReward(
    playerQuestId: string,
  ): { success: true; reward: QuestReward } | { success: false; error: QuestError };
  getPlayerQuest(playerQuestId: string): PlayerQuest | undefined;
  listPlayerQuests(playerId: PlayerId, status?: QuestStatus): ReadonlyArray<PlayerQuest>;
  getPlayerStats(playerId: PlayerId): PlayerQuestStats | undefined;
}

// ── Ports ─────────────────────────────────────────────────────────

interface QuestClock {
  nowUs(): bigint;
}

interface QuestIdGenerator {
  generate(): string;
}

interface QuestLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface QuestTrackerDeps {
  readonly clock: QuestClock;
  readonly idGen: QuestIdGenerator;
  readonly logger: QuestLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutablePlayerQuest {
  playerQuestId: string;
  questId: QuestId;
  playerId: PlayerId;
  status: QuestStatus;
  acceptedAt: bigint;
  completedAt: bigint | null;
  objectiveProgress: Map<ObjectiveId, ObjectiveStatus>;
}

interface MutablePlayerStats {
  playerId: PlayerId;
  accepted: number;
  completed: number;
  failed: number;
  abandoned: number;
  totalKalonEarned: bigint;
}

interface QuestTrackerState {
  readonly templates: Map<QuestId, QuestTemplate>;
  readonly players: Set<PlayerId>;
  readonly playerQuests: Map<string, MutablePlayerQuest>;
  readonly rewards: Map<string, QuestReward>;
  readonly playerStats: Map<PlayerId, MutablePlayerStats>;
  readonly clock: QuestClock;
  readonly idGen: QuestIdGenerator;
  readonly logger: QuestLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function toReadonlyPlayerQuest(pq: MutablePlayerQuest): PlayerQuest {
  return {
    playerQuestId: pq.playerQuestId,
    questId: pq.questId,
    playerId: pq.playerId,
    status: pq.status,
    acceptedAt: pq.acceptedAt,
    completedAt: pq.completedAt,
    objectiveProgress: new Map(pq.objectiveProgress),
  };
}

function allRequiredComplete(
  template: QuestTemplate,
  progress: Map<ObjectiveId, ObjectiveStatus>,
): boolean {
  for (const obj of template.objectives) {
    if (obj.required && progress.get(obj.objectiveId) !== 'COMPLETED') return false;
  }
  return true;
}

function getOrCreateStats(state: QuestTrackerState, playerId: PlayerId): MutablePlayerStats {
  const existing = state.playerStats.get(playerId);
  if (existing !== undefined) return existing;
  const stats: MutablePlayerStats = {
    playerId,
    accepted: 0,
    completed: 0,
    failed: 0,
    abandoned: 0,
    totalKalonEarned: 0n,
  };
  state.playerStats.set(playerId, stats);
  return stats;
}

// ── Operations ────────────────────────────────────────────────────

function defineQuestImpl(
  state: QuestTrackerState,
  questId: QuestId,
  title: string,
  description: string,
  objectives: ReadonlyArray<QuestObjectiveTemplate>,
  rewardKalon: bigint,
  timeLimit: bigint | null,
): QuestTemplate | QuestError {
  if (state.templates.has(questId)) return 'wrong-status';
  const template: QuestTemplate = {
    questId,
    title,
    description,
    objectives,
    rewardKalon,
    timeLimit,
  };
  state.templates.set(questId, template);
  state.logger.info('quest-defined questId=' + questId);
  return template;
}

function registerPlayerImpl(
  state: QuestTrackerState,
  playerId: PlayerId,
): { success: true } | { success: false; error: QuestError } {
  if (state.players.has(playerId)) return { success: false, error: 'already-registered' };
  state.players.add(playerId);
  getOrCreateStats(state, playerId);
  state.logger.info('quest-player-registered playerId=' + playerId);
  return { success: true };
}

function hasActiveQuest(state: QuestTrackerState, playerId: PlayerId, questId: QuestId): boolean {
  for (const [, pq] of state.playerQuests) {
    if (pq.playerId === playerId && pq.questId === questId && pq.status === 'ACTIVE') return true;
  }
  return false;
}

function buildPlayerQuest(
  state: QuestTrackerState,
  playerId: PlayerId,
  template: QuestTemplate,
): MutablePlayerQuest {
  const playerQuestId = state.idGen.generate();
  const progress = new Map<ObjectiveId, ObjectiveStatus>();
  for (const obj of template.objectives) {
    progress.set(obj.objectiveId, 'PENDING');
  }
  return {
    playerQuestId,
    questId: template.questId,
    playerId,
    status: 'ACTIVE',
    acceptedAt: state.clock.nowUs(),
    completedAt: null,
    objectiveProgress: progress,
  };
}

function acceptQuestImpl(
  state: QuestTrackerState,
  playerId: PlayerId,
  questId: QuestId,
): PlayerQuest | QuestError {
  if (!state.players.has(playerId)) return 'player-not-found';
  const template = state.templates.get(questId);
  if (template === undefined) return 'quest-not-found';
  if (hasActiveQuest(state, playerId, questId)) return 'already-accepted';
  const pq = buildPlayerQuest(state, playerId, template);
  state.playerQuests.set(pq.playerQuestId, pq);
  getOrCreateStats(state, playerId).accepted += 1;
  state.logger.info('quest-accepted playerQuestId=' + pq.playerQuestId);
  return toReadonlyPlayerQuest(pq);
}

function progressObjectiveImpl(
  state: QuestTrackerState,
  playerQuestId: string,
  objectiveId: ObjectiveId,
): { success: true; questCompleted: boolean } | { success: false; error: QuestError } {
  const pq = state.playerQuests.get(playerQuestId);
  if (pq === undefined) return { success: false, error: 'quest-not-found' };
  if (pq.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };
  if (!pq.objectiveProgress.has(objectiveId))
    return { success: false, error: 'objective-not-found' };

  pq.objectiveProgress.set(objectiveId, 'COMPLETED');
  const template = state.templates.get(pq.questId);
  if (template === undefined) return { success: true, questCompleted: false };

  if (allRequiredComplete(template, pq.objectiveProgress)) {
    pq.status = 'COMPLETED';
    pq.completedAt = state.clock.nowUs();
    const stats = getOrCreateStats(state, pq.playerId);
    stats.completed += 1;
    state.logger.info('quest-completed playerQuestId=' + playerQuestId);
    return { success: true, questCompleted: true };
  }
  return { success: true, questCompleted: false };
}

function failObjectiveImpl(
  state: QuestTrackerState,
  playerQuestId: string,
  objectiveId: ObjectiveId,
): { success: true; questFailed: boolean } | { success: false; error: QuestError } {
  const pq = state.playerQuests.get(playerQuestId);
  if (pq === undefined) return { success: false, error: 'quest-not-found' };
  if (pq.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };
  if (!pq.objectiveProgress.has(objectiveId))
    return { success: false, error: 'objective-not-found' };

  pq.objectiveProgress.set(objectiveId, 'FAILED');
  const template = state.templates.get(pq.questId);
  const isRequired =
    template?.objectives.find((o) => o.objectiveId === objectiveId)?.required ?? false;

  if (isRequired) {
    pq.status = 'FAILED';
    const stats = getOrCreateStats(state, pq.playerId);
    stats.failed += 1;
    state.logger.info('quest-failed playerQuestId=' + playerQuestId);
    return { success: true, questFailed: true };
  }
  return { success: true, questFailed: false };
}

function abandonQuestImpl(
  state: QuestTrackerState,
  playerQuestId: string,
): { success: true } | { success: false; error: QuestError } {
  const pq = state.playerQuests.get(playerQuestId);
  if (pq === undefined) return { success: false, error: 'quest-not-found' };
  if (pq.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };
  pq.status = 'ABANDONED';
  const stats = getOrCreateStats(state, pq.playerId);
  stats.abandoned += 1;
  state.logger.info('quest-abandoned playerQuestId=' + playerQuestId);
  return { success: true };
}

function awardRewardImpl(
  state: QuestTrackerState,
  playerQuestId: string,
): { success: true; reward: QuestReward } | { success: false; error: QuestError } {
  const pq = state.playerQuests.get(playerQuestId);
  if (pq === undefined) return { success: false, error: 'quest-not-found' };
  if (pq.status !== 'COMPLETED') return { success: false, error: 'wrong-status' };
  if (state.rewards.has(playerQuestId)) return { success: false, error: 'wrong-status' };

  const template = state.templates.get(pq.questId);
  const kalonAmount = template?.rewardKalon ?? 0n;
  const rewardId = state.idGen.generate();
  const reward: QuestReward = {
    rewardId,
    playerQuestId,
    playerId: pq.playerId,
    kalonAmount,
    awardedAt: state.clock.nowUs(),
  };
  state.rewards.set(playerQuestId, reward);
  const stats = getOrCreateStats(state, pq.playerId);
  stats.totalKalonEarned = stats.totalKalonEarned + kalonAmount;
  state.logger.info('quest-reward-awarded rewardId=' + rewardId);
  return { success: true, reward };
}

function listPlayerQuestsImpl(
  state: QuestTrackerState,
  playerId: PlayerId,
  status?: QuestStatus,
): ReadonlyArray<PlayerQuest> {
  const result: PlayerQuest[] = [];
  for (const [, pq] of state.playerQuests) {
    if (pq.playerId !== playerId) continue;
    if (status !== undefined && pq.status !== status) continue;
    result.push(toReadonlyPlayerQuest(pq));
  }
  return result;
}

function getPlayerQuestImpl(
  state: QuestTrackerState,
  playerQuestId: string,
): PlayerQuest | undefined {
  const pq = state.playerQuests.get(playerQuestId);
  return pq !== undefined ? toReadonlyPlayerQuest(pq) : undefined;
}

function getPlayerStatsImpl(
  state: QuestTrackerState,
  playerId: PlayerId,
): PlayerQuestStats | undefined {
  const stats = state.playerStats.get(playerId);
  if (stats === undefined) return undefined;
  return {
    playerId: stats.playerId,
    accepted: stats.accepted,
    completed: stats.completed,
    failed: stats.failed,
    abandoned: stats.abandoned,
    totalKalonEarned: stats.totalKalonEarned,
  };
}

// ── Factory ───────────────────────────────────────────────────────

export function createQuestTrackerSystem(deps: QuestTrackerDeps): QuestTrackerSystem {
  const state: QuestTrackerState = {
    templates: new Map(),
    players: new Set(),
    playerQuests: new Map(),
    rewards: new Map(),
    playerStats: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    defineQuest: (questId, title, description, objectives, rewardKalon, timeLimit) =>
      defineQuestImpl(state, questId, title, description, objectives, rewardKalon, timeLimit),
    registerPlayer: (playerId) => registerPlayerImpl(state, playerId),
    acceptQuest: (playerId, questId) => acceptQuestImpl(state, playerId, questId),
    progressObjective: (playerQuestId, objectiveId) =>
      progressObjectiveImpl(state, playerQuestId, objectiveId),
    failObjective: (playerQuestId, objectiveId) =>
      failObjectiveImpl(state, playerQuestId, objectiveId),
    abandonQuest: (playerQuestId) => abandonQuestImpl(state, playerQuestId),
    awardReward: (playerQuestId) => awardRewardImpl(state, playerQuestId),
    getPlayerQuest: (playerQuestId) => getPlayerQuestImpl(state, playerQuestId),
    listPlayerQuests: (playerId, status) => listPlayerQuestsImpl(state, playerId, status),
    getPlayerStats: (playerId) => getPlayerStatsImpl(state, playerId),
  };
}
