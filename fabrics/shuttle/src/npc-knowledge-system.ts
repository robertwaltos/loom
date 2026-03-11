/**
 * NPC Knowledge System — Tracks facts, skills, and world knowledge per NPC.
 *
 * NPCs learn knowledge entries keyed by (domain + topic). Knowledge has
 * a proficiency score (0–100). NPCs can teach each other, and proficiency
 * is capped at 100. Expertise level is derived from average proficiency.
 *
 * "What an agent knows shapes every decision it makes."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcKnowledgeSystemClock = {
  now(): bigint;
};

export type NpcKnowledgeSystemIdGen = {
  generate(): string;
};

export type NpcKnowledgeSystemLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcKnowledgeSystemDeps = {
  readonly clock: NpcKnowledgeSystemClock;
  readonly idGen: NpcKnowledgeSystemIdGen;
  readonly logger: NpcKnowledgeSystemLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type KnowledgeId = string;

export type KnowledgeDomain =
  | 'HISTORY'
  | 'SCIENCE'
  | 'TRADE'
  | 'COMBAT'
  | 'LORE'
  | 'GEOGRAPHY'
  | 'POLITICS'
  | 'MEDICINE';

export type KnowledgeError =
  | 'npc-not-found'
  | 'knowledge-not-found'
  | 'already-known'
  | 'already-registered'
  | 'invalid-proficiency';

export type ExpertiseLevel = 'NOVICE' | 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER';

export type KnowledgeEntry = {
  readonly knowledgeId: KnowledgeId;
  readonly npcId: NpcId;
  readonly domain: KnowledgeDomain;
  readonly topic: string;
  proficiency: number;
  readonly learnedAt: bigint;
  readonly sourceNpcId: string | null;
};

export type KnowledgeTransfer = {
  readonly transferId: string;
  readonly teacherNpcId: NpcId;
  readonly studentNpcId: NpcId;
  readonly knowledgeId: KnowledgeId;
  readonly proficiencyGained: number;
  readonly occurredAt: bigint;
};

export type KnowledgeProfile = {
  readonly npcId: NpcId;
  readonly totalEntries: number;
  readonly byDomain: Record<KnowledgeDomain, number>;
  readonly expertiseLevel: ExpertiseLevel;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcKnowledgeSystemState = {
  readonly deps: NpcKnowledgeSystemDeps;
  readonly npcs: Set<NpcId>;
  readonly entries: Map<KnowledgeId, KnowledgeEntry>;
  readonly npcEntryIndex: Map<NpcId, Set<KnowledgeId>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcKnowledgeSystemState(
  deps: NpcKnowledgeSystemDeps,
): NpcKnowledgeSystemState {
  return {
    deps,
    npcs: new Set(),
    entries: new Map(),
    npcEntryIndex: new Map(),
  };
}

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerNpcKnowledge(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
): { success: true } | { success: false; error: KnowledgeError } {
  if (state.npcs.has(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  state.npcs.add(npcId);
  state.npcEntryIndex.set(npcId, new Set());
  state.deps.logger.info('npc-knowledge-system: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// LEARN KNOWLEDGE
// ============================================================================

export function learnKnowledge(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
  domain: KnowledgeDomain,
  topic: string,
  proficiency: number,
  sourceNpcId: string | null,
): KnowledgeEntry | KnowledgeError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';
  if (proficiency < 0 || proficiency > 100) return 'invalid-proficiency';
  const duplicate = findEntryByDomainTopic(state, npcId, domain, topic);
  if (duplicate !== undefined) return 'already-known';
  const knowledgeId = state.deps.idGen.generate();
  const entry: KnowledgeEntry = {
    knowledgeId,
    npcId,
    domain,
    topic,
    proficiency,
    learnedAt: state.deps.clock.now(),
    sourceNpcId,
  };
  state.entries.set(knowledgeId, entry);
  state.npcEntryIndex.get(npcId)?.add(knowledgeId);
  state.deps.logger.info('npc-knowledge-system: npc ' + npcId + ' learned ' + domain + ':' + topic);
  return entry;
}

// ============================================================================
// TEACH KNOWLEDGE
// ============================================================================

export function teachKnowledge(
  state: NpcKnowledgeSystemState,
  teacherNpcId: NpcId,
  studentNpcId: NpcId,
  knowledgeId: KnowledgeId,
  proficiencyGain: number,
): { success: true; transfer: KnowledgeTransfer } | { success: false; error: KnowledgeError } {
  if (!state.npcs.has(teacherNpcId)) return { success: false, error: 'npc-not-found' };
  if (!state.npcs.has(studentNpcId)) return { success: false, error: 'npc-not-found' };
  const teacherEntry = getTeacherEntry(state, teacherNpcId, knowledgeId);
  if (teacherEntry === undefined) return { success: false, error: 'knowledge-not-found' };
  const gained = applyKnowledgeToStudent(
    state,
    studentNpcId,
    teacherEntry,
    proficiencyGain,
    teacherNpcId,
  );
  const transfer: KnowledgeTransfer = {
    transferId: state.deps.idGen.generate(),
    teacherNpcId,
    studentNpcId,
    knowledgeId,
    proficiencyGained: gained,
    occurredAt: state.deps.clock.now(),
  };
  return { success: true, transfer };
}

function getTeacherEntry(
  state: NpcKnowledgeSystemState,
  teacherNpcId: NpcId,
  knowledgeId: KnowledgeId,
): KnowledgeEntry | undefined {
  const entry = state.entries.get(knowledgeId);
  if (entry === undefined || entry.npcId !== teacherNpcId) return undefined;
  return entry;
}

function applyKnowledgeToStudent(
  state: NpcKnowledgeSystemState,
  studentNpcId: NpcId,
  teacherEntry: KnowledgeEntry,
  proficiencyGain: number,
  teacherNpcId: NpcId,
): number {
  const existing = findEntryByDomainTopic(
    state,
    studentNpcId,
    teacherEntry.domain,
    teacherEntry.topic,
  );
  if (existing !== undefined) {
    const before = existing.proficiency;
    existing.proficiency = Math.min(100, existing.proficiency + proficiencyGain);
    return existing.proficiency - before;
  }
  const newEntry = learnKnowledge(
    state,
    studentNpcId,
    teacherEntry.domain,
    teacherEntry.topic,
    Math.min(100, proficiencyGain),
    teacherNpcId,
  );
  if (typeof newEntry === 'string') return 0;
  return newEntry.proficiency;
}

// ============================================================================
// IMPROVE KNOWLEDGE
// ============================================================================

export function improveKnowledge(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
  knowledgeId: KnowledgeId,
  proficiencyGain: number,
): { success: true; newProficiency: number } | { success: false; error: KnowledgeError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const entry = state.entries.get(knowledgeId);
  if (entry === undefined || entry.npcId !== npcId) {
    return { success: false, error: 'knowledge-not-found' };
  }
  entry.proficiency = Math.min(100, entry.proficiency + proficiencyGain);
  return { success: true, newProficiency: entry.proficiency };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getKnowledgeEntry(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
  knowledgeId: KnowledgeId,
): KnowledgeEntry | undefined {
  const entry = state.entries.get(knowledgeId);
  if (entry === undefined || entry.npcId !== npcId) return undefined;
  return entry;
}

export function listKnowledge(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
  domain?: KnowledgeDomain,
): ReadonlyArray<KnowledgeEntry> {
  const index = state.npcEntryIndex.get(npcId) ?? new Set<KnowledgeId>();
  const results: KnowledgeEntry[] = [];
  for (const id of index) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    if (domain === undefined || entry.domain === domain) results.push(entry);
  }
  return results;
}

export function getKnowledgeProfile(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
): KnowledgeProfile | undefined {
  if (!state.npcs.has(npcId)) return undefined;
  const index = state.npcEntryIndex.get(npcId) ?? new Set<KnowledgeId>();
  const byDomain = emptyByDomain();
  let totalProficiency = 0;
  let count = 0;
  for (const id of index) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    byDomain[entry.domain]++;
    totalProficiency += entry.proficiency;
    count++;
  }
  const avgProficiency = count === 0 ? 0 : totalProficiency / count;
  return {
    npcId,
    totalEntries: count,
    byDomain,
    expertiseLevel: computeExpertiseLevel(avgProficiency),
  };
}

export function findExperts(
  state: NpcKnowledgeSystemState,
  domain: KnowledgeDomain,
  minProficiency: number,
): ReadonlyArray<NpcId> {
  const experts = new Set<NpcId>();
  for (const entry of state.entries.values()) {
    if (entry.domain === domain && entry.proficiency >= minProficiency) {
      experts.add(entry.npcId);
    }
  }
  return Array.from(experts);
}

// ============================================================================
// HELPERS
// ============================================================================

function findEntryByDomainTopic(
  state: NpcKnowledgeSystemState,
  npcId: NpcId,
  domain: KnowledgeDomain,
  topic: string,
): KnowledgeEntry | undefined {
  const index = state.npcEntryIndex.get(npcId) ?? new Set<KnowledgeId>();
  for (const id of index) {
    const entry = state.entries.get(id);
    if (entry !== undefined && entry.domain === domain && entry.topic === topic) return entry;
  }
  return undefined;
}

function computeExpertiseLevel(avgProficiency: number): ExpertiseLevel {
  if (avgProficiency >= 80) return 'MASTER';
  if (avgProficiency >= 60) return 'EXPERT';
  if (avgProficiency >= 40) return 'JOURNEYMAN';
  if (avgProficiency >= 20) return 'APPRENTICE';
  return 'NOVICE';
}

function emptyByDomain(): Record<KnowledgeDomain, number> {
  return {
    HISTORY: 0,
    SCIENCE: 0,
    TRADE: 0,
    COMBAT: 0,
    LORE: 0,
    GEOGRAPHY: 0,
    POLITICS: 0,
    MEDICINE: 0,
  };
}
