/**
 * player-progression.ts — Level, XP, and skill tree management for players.
 *
 * XP is granted to players who level up automatically when thresholds are met.
 * XP to next level = currentLevel^2 * 100. Max level is 100. Skills require
 * sufficient currentXp and optionally a learned prerequisite. Upgrading a skill
 * increments rank up to maxRank and costs the same xpCost again.
 */

// ── Types ─────────────────────────────────────────────────────────

export type PlayerId = string;
export type SkillId = string;

export type ProgressionError =
  | 'player-not-found'
  | 'skill-not-found'
  | 'already-registered'
  | 'insufficient-xp'
  | 'max-level'
  | 'prerequisite-not-met'
  | 'already-defined';

export interface PlayerLevel {
  readonly playerId: PlayerId;
  readonly currentLevel: number;
  readonly currentXp: bigint;
  readonly xpToNextLevel: bigint;
  readonly totalXpEarned: bigint;
}

export interface Skill {
  readonly skillId: SkillId;
  readonly name: string;
  readonly description: string;
  readonly maxRank: number;
  readonly xpCost: bigint;
  readonly prerequisiteSkillId: SkillId | null;
}

export interface PlayerSkill {
  readonly skillId: SkillId;
  readonly playerId: PlayerId;
  readonly currentRank: number;
  readonly learnedAt: bigint;
  readonly lastUpgradedAt: bigint;
}

export interface ProgressionStats {
  readonly playerId: PlayerId;
  readonly level: number;
  readonly skillsLearned: number;
  readonly totalSkillRanks: number;
}

export interface PlayerProgressionSystem {
  registerPlayer(playerId: PlayerId, startingXp?: bigint): PlayerLevel | ProgressionError;
  defineSkill(
    skillId: SkillId,
    name: string,
    description: string,
    maxRank: number,
    xpCost: bigint,
    prerequisiteSkillId: SkillId | null,
  ): Skill | ProgressionError;
  grantXp(
    playerId: PlayerId,
    amount: bigint,
  ):
    | { success: true; levelsGained: number; newLevel: number }
    | { success: false; error: ProgressionError };
  learnSkill(
    playerId: PlayerId,
    skillId: SkillId,
  ): { success: true } | { success: false; error: ProgressionError };
  upgradeSkill(
    playerId: PlayerId,
    skillId: SkillId,
  ): { success: true; newRank: number } | { success: false; error: ProgressionError };
  getLevel(playerId: PlayerId): PlayerLevel | undefined;
  getSkill(playerId: PlayerId, skillId: SkillId): PlayerSkill | undefined;
  listSkills(playerId: PlayerId): ReadonlyArray<PlayerSkill>;
  getStats(playerId: PlayerId): ProgressionStats | undefined;
}

// ── Ports ─────────────────────────────────────────────────────────

interface ProgressionClock {
  nowUs(): bigint;
}

interface ProgressionIdGenerator {
  generate(): string;
}

interface ProgressionLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface PlayerProgressionDeps {
  readonly clock: ProgressionClock;
  readonly idGen: ProgressionIdGenerator;
  readonly logger: ProgressionLogger;
}

// ── Constants ─────────────────────────────────────────────────────

const MAX_LEVEL = 100;

// ── Internal State ────────────────────────────────────────────────

interface MutablePlayerLevel {
  playerId: PlayerId;
  currentLevel: number;
  currentXp: bigint;
  xpToNextLevel: bigint;
  totalXpEarned: bigint;
}

interface MutablePlayerSkill {
  skillId: SkillId;
  playerId: PlayerId;
  currentRank: number;
  learnedAt: bigint;
  lastUpgradedAt: bigint;
}

interface ProgressionState {
  readonly skills: Map<SkillId, Skill>;
  readonly levels: Map<PlayerId, MutablePlayerLevel>;
  readonly playerSkills: Map<string, MutablePlayerSkill>;
  readonly clock: ProgressionClock;
  readonly idGen: ProgressionIdGenerator;
  readonly logger: ProgressionLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function xpForNextLevel(level: number): bigint {
  return BigInt(level) * BigInt(level) * 100n;
}

function playerSkillKey(playerId: PlayerId, skillId: SkillId): string {
  return playerId + ':' + skillId;
}

function toReadonlyLevel(ml: MutablePlayerLevel): PlayerLevel {
  return {
    playerId: ml.playerId,
    currentLevel: ml.currentLevel,
    currentXp: ml.currentXp,
    xpToNextLevel: ml.xpToNextLevel,
    totalXpEarned: ml.totalXpEarned,
  };
}

function toReadonlySkill(ms: MutablePlayerSkill): PlayerSkill {
  return {
    skillId: ms.skillId,
    playerId: ms.playerId,
    currentRank: ms.currentRank,
    learnedAt: ms.learnedAt,
    lastUpgradedAt: ms.lastUpgradedAt,
  };
}

function buildInitialLevel(playerId: PlayerId, startingXp: bigint): MutablePlayerLevel {
  const startLevel = 1;
  return {
    playerId,
    currentLevel: startLevel,
    currentXp: startingXp,
    xpToNextLevel: xpForNextLevel(startLevel),
    totalXpEarned: startingXp,
  };
}

function applyLevelUps(playerLevel: MutablePlayerLevel): number {
  let levelsGained = 0;
  while (
    playerLevel.currentLevel < MAX_LEVEL &&
    playerLevel.currentXp >= playerLevel.xpToNextLevel
  ) {
    playerLevel.currentXp -= playerLevel.xpToNextLevel;
    playerLevel.currentLevel += 1;
    playerLevel.xpToNextLevel = xpForNextLevel(playerLevel.currentLevel);
    levelsGained += 1;
  }
  return levelsGained;
}

function hasLearnedPrerequisite(
  state: ProgressionState,
  playerId: PlayerId,
  prerequisiteSkillId: SkillId,
): boolean {
  const key = playerSkillKey(playerId, prerequisiteSkillId);
  const ps = state.playerSkills.get(key);
  return ps !== undefined && ps.currentRank >= 1;
}

// ── Operations ────────────────────────────────────────────────────

function registerPlayerImpl(
  state: ProgressionState,
  playerId: PlayerId,
  startingXp: bigint,
): PlayerLevel | ProgressionError {
  if (state.levels.has(playerId)) return 'already-registered';
  const ml = buildInitialLevel(playerId, startingXp);
  state.levels.set(playerId, ml);
  state.logger.info('progression-player-registered playerId=' + playerId);
  return toReadonlyLevel(ml);
}

function defineSkillImpl(
  state: ProgressionState,
  skillId: SkillId,
  name: string,
  description: string,
  maxRank: number,
  xpCost: bigint,
  prerequisiteSkillId: SkillId | null,
): Skill | ProgressionError {
  if (state.skills.has(skillId)) return 'already-defined';
  const skill: Skill = { skillId, name, description, maxRank, xpCost, prerequisiteSkillId };
  state.skills.set(skillId, skill);
  state.logger.info('skill-defined skillId=' + skillId);
  return skill;
}

function grantXpImpl(
  state: ProgressionState,
  playerId: PlayerId,
  amount: bigint,
):
  | { success: true; levelsGained: number; newLevel: number }
  | { success: false; error: ProgressionError } {
  const ml = state.levels.get(playerId);
  if (ml === undefined) return { success: false, error: 'player-not-found' };

  ml.totalXpEarned += amount;

  if (ml.currentLevel >= MAX_LEVEL) {
    return { success: true, levelsGained: 0, newLevel: ml.currentLevel };
  }

  ml.currentXp += amount;
  const levelsGained = applyLevelUps(ml);
  state.logger.info('xp-granted playerId=' + playerId + ' amount=' + String(amount));
  return { success: true, levelsGained, newLevel: ml.currentLevel };
}

function learnSkillImpl(
  state: ProgressionState,
  playerId: PlayerId,
  skillId: SkillId,
): { success: true } | { success: false; error: ProgressionError } {
  const ml = state.levels.get(playerId);
  if (ml === undefined) return { success: false, error: 'player-not-found' };

  const skill = state.skills.get(skillId);
  if (skill === undefined) return { success: false, error: 'skill-not-found' };

  if (skill.prerequisiteSkillId !== null) {
    if (!hasLearnedPrerequisite(state, playerId, skill.prerequisiteSkillId)) {
      return { success: false, error: 'prerequisite-not-met' };
    }
  }

  if (ml.currentXp < skill.xpCost) return { success: false, error: 'insufficient-xp' };

  const key = playerSkillKey(playerId, skillId);
  if (state.playerSkills.has(key)) return { success: false, error: 'prerequisite-not-met' };

  ml.currentXp -= skill.xpCost;
  const now = state.clock.nowUs();
  const ps: MutablePlayerSkill = {
    skillId,
    playerId,
    currentRank: 1,
    learnedAt: now,
    lastUpgradedAt: now,
  };
  state.playerSkills.set(key, ps);
  state.logger.info('skill-learned playerId=' + playerId + ' skillId=' + skillId);
  return { success: true };
}

function upgradeSkillImpl(
  state: ProgressionState,
  playerId: PlayerId,
  skillId: SkillId,
): { success: true; newRank: number } | { success: false; error: ProgressionError } {
  const ml = state.levels.get(playerId);
  if (ml === undefined) return { success: false, error: 'player-not-found' };

  const skill = state.skills.get(skillId);
  if (skill === undefined) return { success: false, error: 'skill-not-found' };

  const key = playerSkillKey(playerId, skillId);
  const ps = state.playerSkills.get(key);
  if (ps === undefined) return { success: false, error: 'skill-not-found' };

  if (ps.currentRank >= skill.maxRank) return { success: false, error: 'max-level' };
  if (ml.currentXp < skill.xpCost) return { success: false, error: 'insufficient-xp' };

  ml.currentXp -= skill.xpCost;
  ps.currentRank += 1;
  ps.lastUpgradedAt = state.clock.nowUs();
  state.logger.info(
    'skill-upgraded playerId=' +
      playerId +
      ' skillId=' +
      skillId +
      ' rank=' +
      String(ps.currentRank),
  );
  return { success: true, newRank: ps.currentRank };
}

function listSkillsImpl(state: ProgressionState, playerId: PlayerId): ReadonlyArray<PlayerSkill> {
  const result: PlayerSkill[] = [];
  for (const ps of state.playerSkills.values()) {
    if (ps.playerId === playerId) result.push(toReadonlySkill(ps));
  }
  return result;
}

function getStatsImpl(state: ProgressionState, playerId: PlayerId): ProgressionStats | undefined {
  const ml = state.levels.get(playerId);
  if (ml === undefined) return undefined;

  let skillsLearned = 0;
  let totalSkillRanks = 0;
  for (const ps of state.playerSkills.values()) {
    if (ps.playerId !== playerId) continue;
    skillsLearned += 1;
    totalSkillRanks += ps.currentRank;
  }

  return { playerId, level: ml.currentLevel, skillsLearned, totalSkillRanks };
}

// ── Factory ───────────────────────────────────────────────────────

export function createPlayerProgressionSystem(
  deps: PlayerProgressionDeps,
): PlayerProgressionSystem {
  const state: ProgressionState = {
    skills: new Map(),
    levels: new Map(),
    playerSkills: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerPlayer: (playerId, startingXp = 0n) => registerPlayerImpl(state, playerId, startingXp),
    defineSkill: (skillId, name, description, maxRank, xpCost, prerequisiteSkillId) =>
      defineSkillImpl(state, skillId, name, description, maxRank, xpCost, prerequisiteSkillId),
    grantXp: (playerId, amount) => grantXpImpl(state, playerId, amount),
    learnSkill: (playerId, skillId) => learnSkillImpl(state, playerId, skillId),
    upgradeSkill: (playerId, skillId) => upgradeSkillImpl(state, playerId, skillId),
    getLevel: (playerId) => {
      const ml = state.levels.get(playerId);
      return ml !== undefined ? toReadonlyLevel(ml) : undefined;
    },
    getSkill: (playerId, skillId) => {
      const ps = state.playerSkills.get(playerSkillKey(playerId, skillId));
      return ps !== undefined ? toReadonlySkill(ps) : undefined;
    },
    listSkills: (playerId) => listSkillsImpl(state, playerId),
    getStats: (playerId) => getStatsImpl(state, playerId),
  };
}
