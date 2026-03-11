/**
 * npc-skill.ts — NPC skill acquisition and leveling.
 *
 * Tracks named skills per NPC with experience points and level
 * progression. Supports skill training, level-up thresholds,
 * and skill queries.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SkillClock {
  readonly nowMicroseconds: () => number;
}

interface SkillIdGenerator {
  readonly next: () => string;
}

interface NpcSkillDeps {
  readonly clock: SkillClock;
  readonly idGenerator: SkillIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface NpcSkill {
  readonly skillId: string;
  readonly npcId: string;
  readonly name: string;
  readonly level: number;
  readonly experience: number;
  readonly acquiredAt: number;
}

interface AcquireSkillParams {
  readonly npcId: string;
  readonly name: string;
}

interface TrainResult {
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly leveledUp: boolean;
  readonly totalExperience: number;
}

interface NpcSkillStats {
  readonly totalNpcs: number;
  readonly totalSkills: number;
  readonly averageLevel: number;
}

interface NpcSkillSystem {
  readonly acquire: (params: AcquireSkillParams) => NpcSkill;
  readonly train: (npcId: string, skillName: string, xp: number) => TrainResult | undefined;
  readonly getSkills: (npcId: string) => readonly NpcSkill[];
  readonly getSkill: (npcId: string, skillName: string) => NpcSkill | undefined;
  readonly getStats: () => NpcSkillStats;
}

// ── Constants ────────────────────────────────────────────────────

const XP_PER_LEVEL = 100;

// ── State ────────────────────────────────────────────────────────

interface MutableSkill {
  readonly skillId: string;
  readonly npcId: string;
  readonly name: string;
  level: number;
  experience: number;
  readonly acquiredAt: number;
}

interface SkillState {
  readonly deps: NpcSkillDeps;
  readonly skills: Map<string, MutableSkill[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(s: MutableSkill): NpcSkill {
  return {
    skillId: s.skillId,
    npcId: s.npcId,
    name: s.name,
    level: s.level,
    experience: s.experience,
    acquiredAt: s.acquiredAt,
  };
}

function findSkill(state: SkillState, npcId: string, name: string): MutableSkill | undefined {
  const list = state.skills.get(npcId);
  if (!list) return undefined;
  return list.find((s) => s.name === name);
}

function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// ── Operations ───────────────────────────────────────────────────

function acquireImpl(state: SkillState, params: AcquireSkillParams): NpcSkill {
  const skill: MutableSkill = {
    skillId: state.deps.idGenerator.next(),
    npcId: params.npcId,
    name: params.name,
    level: 1,
    experience: 0,
    acquiredAt: state.deps.clock.nowMicroseconds(),
  };
  let list = state.skills.get(params.npcId);
  if (!list) {
    list = [];
    state.skills.set(params.npcId, list);
  }
  list.push(skill);
  return toReadonly(skill);
}

function trainImpl(
  state: SkillState,
  npcId: string,
  skillName: string,
  xp: number,
): TrainResult | undefined {
  const skill = findSkill(state, npcId, skillName);
  if (!skill) return undefined;
  const prevLevel = skill.level;
  skill.experience += xp;
  skill.level = calculateLevel(skill.experience);
  return {
    previousLevel: prevLevel,
    newLevel: skill.level,
    leveledUp: skill.level > prevLevel,
    totalExperience: skill.experience,
  };
}

function getStatsImpl(state: SkillState): NpcSkillStats {
  let totalSkills = 0;
  let totalLevel = 0;
  for (const list of state.skills.values()) {
    totalSkills += list.length;
    for (const s of list) {
      totalLevel += s.level;
    }
  }
  return {
    totalNpcs: state.skills.size,
    totalSkills,
    averageLevel: totalSkills > 0 ? totalLevel / totalSkills : 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcSkillSystem(deps: NpcSkillDeps): NpcSkillSystem {
  const state: SkillState = { deps, skills: new Map() };
  return {
    acquire: (p) => acquireImpl(state, p),
    train: (npc, name, xp) => trainImpl(state, npc, name, xp),
    getSkills: (npc) => (state.skills.get(npc) ?? []).map(toReadonly),
    getSkill: (npc, name) => {
      const s = findSkill(state, npc, name);
      return s ? toReadonly(s) : undefined;
    },
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcSkillSystem, XP_PER_LEVEL };
export type {
  NpcSkillSystem,
  NpcSkillDeps,
  NpcSkill,
  AcquireSkillParams,
  TrainResult,
  NpcSkillStats,
};
