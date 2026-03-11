/**
 * NPC Language System — Language acquisition and dialect tracking.
 *
 * Tracks which languages NPCs speak, their fluency levels, and inter-NPC
 * communication ability. Languages form dialect trees via dialectOf. Fluency
 * is 0–100; native speakers register at 100.
 *
 * "Words shape worlds — every dialect is a history encoded in breath."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcLanguageClock = {
  now(): bigint;
};

export type NpcLanguageIdGen = {
  generate(): string;
};

export type NpcLanguageLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcLanguageDeps = {
  readonly clock: NpcLanguageClock;
  readonly idGen: NpcLanguageIdGen;
  readonly logger: NpcLanguageLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type LanguageId = string;

export type LanguageError =
  | 'npc-not-found'
  | 'language-not-found'
  | 'already-registered'
  | 'already-known'
  | 'invalid-fluency';

export type LanguageFamily = 'TERRAN' | 'SILFEN' | 'NAKAMA' | 'ANCIENT' | 'CONSTRUCTED' | 'SIGNAL';

export type Language = {
  readonly languageId: LanguageId;
  readonly name: string;
  readonly family: LanguageFamily;
  readonly dialectOf: LanguageId | null;
  readonly complexity: number;
};

export type NpcLanguageProficiency = {
  readonly npcId: NpcId;
  readonly languageId: LanguageId;
  fluency: number;
  readonly learnedAt: bigint;
  readonly native: boolean;
};

export type LanguageStats = {
  readonly languageId: LanguageId;
  readonly totalSpeakers: number;
  readonly averageFluency: number;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcLanguageState = {
  readonly deps: NpcLanguageDeps;
  readonly languages: Map<LanguageId, Language>;
  readonly proficiencies: Map<NpcId, Map<LanguageId, NpcLanguageProficiency>>;
  readonly speakers: Map<LanguageId, Set<NpcId>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcLanguageState(deps: NpcLanguageDeps): NpcLanguageState {
  return {
    deps,
    languages: new Map(),
    proficiencies: new Map(),
    speakers: new Map(),
  };
}

// ============================================================================
// DEFINE LANGUAGE
// ============================================================================

export function defineLanguage(
  state: NpcLanguageState,
  languageId: LanguageId,
  name: string,
  family: LanguageFamily,
  complexity: number,
  dialectOf: LanguageId | null,
): Language | LanguageError {
  if (complexity < 1 || complexity > 10) return 'invalid-fluency';
  if (state.languages.has(languageId)) return 'already-registered';
  const language: Language = { languageId, name, family, dialectOf, complexity };
  state.languages.set(languageId, language);
  state.speakers.set(languageId, new Set());
  state.deps.logger.info('npc-language: defined language ' + languageId);
  return language;
}

// ============================================================================
// REGISTER NPC
// ============================================================================

export function registerNpc(
  state: NpcLanguageState,
  npcId: NpcId,
  nativeLanguageId: LanguageId,
): { success: true } | { success: false; error: LanguageError } {
  if (state.proficiencies.has(npcId)) return { success: false, error: 'already-registered' };
  if (!state.languages.has(nativeLanguageId)) {
    return { success: false, error: 'language-not-found' };
  }
  const npcMap = new Map<LanguageId, NpcLanguageProficiency>();
  const proficiency: NpcLanguageProficiency = {
    npcId,
    languageId: nativeLanguageId,
    fluency: 100,
    learnedAt: state.deps.clock.now(),
    native: true,
  };
  npcMap.set(nativeLanguageId, proficiency);
  state.proficiencies.set(npcId, npcMap);
  state.speakers.get(nativeLanguageId)?.add(npcId);
  state.deps.logger.info('npc-language: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// LEARN LANGUAGE
// ============================================================================

export function learnLanguage(
  state: NpcLanguageState,
  npcId: NpcId,
  languageId: LanguageId,
  initialFluency: number,
): NpcLanguageProficiency | LanguageError {
  const npcMap = state.proficiencies.get(npcId);
  if (npcMap === undefined) return 'npc-not-found';
  if (!state.languages.has(languageId)) return 'language-not-found';
  if (npcMap.has(languageId)) return 'already-known';
  if (initialFluency < 0 || initialFluency > 100) return 'invalid-fluency';
  const proficiency: NpcLanguageProficiency = {
    npcId,
    languageId,
    fluency: initialFluency,
    learnedAt: state.deps.clock.now(),
    native: false,
  };
  npcMap.set(languageId, proficiency);
  state.speakers.get(languageId)?.add(npcId);
  state.deps.logger.info('npc-language: npc ' + npcId + ' learned ' + languageId);
  return proficiency;
}

// ============================================================================
// IMPROVE FLUENCY
// ============================================================================

export function improveFluency(
  state: NpcLanguageState,
  npcId: NpcId,
  languageId: LanguageId,
  gain: number,
): { success: true; newFluency: number } | { success: false; error: LanguageError } {
  const npcMap = state.proficiencies.get(npcId);
  if (npcMap === undefined) return { success: false, error: 'npc-not-found' };
  const proficiency = npcMap.get(languageId);
  if (proficiency === undefined) return { success: false, error: 'language-not-found' };
  if (gain < 0) return { success: false, error: 'invalid-fluency' };
  proficiency.fluency = Math.min(100, proficiency.fluency + gain);
  return { success: true, newFluency: proficiency.fluency };
}

// ============================================================================
// CAN COMMUNICATE
// ============================================================================

export function canCommunicate(
  state: NpcLanguageState,
  npcAId: NpcId,
  npcBId: NpcId,
  minFluency: number,
): boolean {
  const mapA = state.proficiencies.get(npcAId);
  const mapB = state.proficiencies.get(npcBId);
  if (mapA === undefined || mapB === undefined) return false;
  for (const [languageId, profA] of mapA) {
    const profB = mapB.get(languageId);
    if (profB !== undefined && profA.fluency >= minFluency && profB.fluency >= minFluency) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// QUERIES
// ============================================================================

export function getLanguageStats(
  state: NpcLanguageState,
  languageId: LanguageId,
): LanguageStats | undefined {
  const speakerSet = state.speakers.get(languageId);
  if (speakerSet === undefined) return undefined;
  const npcMap = state.proficiencies;
  let totalFluency = 0;
  for (const npcId of speakerSet) {
    totalFluency += npcMap.get(npcId)?.get(languageId)?.fluency ?? 0;
  }
  const totalSpeakers = speakerSet.size;
  const averageFluency = totalSpeakers === 0 ? 0 : totalFluency / totalSpeakers;
  return { languageId, totalSpeakers, averageFluency };
}

export function listKnownLanguages(
  state: NpcLanguageState,
  npcId: NpcId,
): ReadonlyArray<NpcLanguageProficiency> {
  const npcMap = state.proficiencies.get(npcId);
  if (npcMap === undefined) return [];
  return Array.from(npcMap.values());
}

export function listSpeakers(
  state: NpcLanguageState,
  languageId: LanguageId,
  minFluency?: number,
): ReadonlyArray<NpcId> {
  const speakerSet = state.speakers.get(languageId);
  if (speakerSet === undefined) return [];
  if (minFluency === undefined) return Array.from(speakerSet);
  const result: NpcId[] = [];
  for (const npcId of speakerSet) {
    const fluency = state.proficiencies.get(npcId)?.get(languageId)?.fluency ?? 0;
    if (fluency >= minFluency) result.push(npcId);
  }
  return result;
}

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type NpcLanguageSystem = {
  defineLanguage(
    languageId: LanguageId,
    name: string,
    family: LanguageFamily,
    complexity: number,
    dialectOf: LanguageId | null,
  ): Language | LanguageError;
  registerNpc(
    npcId: NpcId,
    nativeLanguageId: LanguageId,
  ): { success: true } | { success: false; error: LanguageError };
  learnLanguage(
    npcId: NpcId,
    languageId: LanguageId,
    initialFluency: number,
  ): NpcLanguageProficiency | LanguageError;
  improveFluency(
    npcId: NpcId,
    languageId: LanguageId,
    gain: number,
  ): { success: true; newFluency: number } | { success: false; error: LanguageError };
  canCommunicate(npcAId: NpcId, npcBId: NpcId, minFluency: number): boolean;
  getLanguageStats(languageId: LanguageId): LanguageStats | undefined;
  listKnownLanguages(npcId: NpcId): ReadonlyArray<NpcLanguageProficiency>;
  listSpeakers(languageId: LanguageId, minFluency?: number): ReadonlyArray<NpcId>;
};

export function createNpcLanguageSystem(deps: NpcLanguageDeps): NpcLanguageSystem {
  const state = createNpcLanguageState(deps);
  return {
    defineLanguage: (id, name, family, complexity, dialectOf) =>
      defineLanguage(state, id, name, family, complexity, dialectOf),
    registerNpc: (npcId, nativeLang) => registerNpc(state, npcId, nativeLang),
    learnLanguage: (npcId, langId, fluency) => learnLanguage(state, npcId, langId, fluency),
    improveFluency: (npcId, langId, gain) => improveFluency(state, npcId, langId, gain),
    canCommunicate: (a, b, min) => canCommunicate(state, a, b, min),
    getLanguageStats: (langId) => getLanguageStats(state, langId),
    listKnownLanguages: (npcId) => listKnownLanguages(state, npcId),
    listSpeakers: (langId, min) => listSpeakers(state, langId, min),
  };
}
