/**
 * Content Query Engine — Koydo Worlds
 *
 * Query interface over the static knowledge graph:
 * entries, quizzes, and curriculum mappings.
 * All functions are pure: no side-effects, no mutation.
 */

import type {
  RealWorldEntry,
  EntryQuizQuestion,
  EntryCurriculumMap,
  DifficultyTier,
} from './types.js';

// ─── Public Types ──────────────────────────────────────────────────

export interface ContentEngineDeps {
  readonly entries: readonly RealWorldEntry[];
  readonly quizzes: readonly EntryQuizQuestion[];
  readonly curriculumMaps: readonly EntryCurriculumMap[];
}

export interface ContentEngineStats {
  readonly totalEntries: number;
  readonly publishedEntries: number;
  readonly totalQuizQuestions: number;
  readonly totalCurriculumMaps: number;
  readonly worldIds: readonly string[];
}

export interface ContentEngine {
  getEntriesForWorld(worldId: string): readonly RealWorldEntry[];
  getEntriesForTier(tier: DifficultyTier): readonly RealWorldEntry[];
  getAvailableEntries(completedIds: readonly string[]): readonly RealWorldEntry[];
  getEntryById(entryId: string): RealWorldEntry | undefined;
  getQuizzesForEntry(entryId: string): readonly EntryQuizQuestion[];
  getQuizzesForEntryAndTier(entryId: string, tier: DifficultyTier): readonly EntryQuizQuestion[];
  getMapsForEntry(entryId: string): readonly EntryCurriculumMap[];
  getEntriesForStandardCode(standardCode: string): readonly RealWorldEntry[];
  validatePrerequisites(completedIds: readonly string[], targetId: string): readonly string[];
  getUnlockChain(entryId: string): readonly string[];
  getStats(): ContentEngineStats;
  /** All entries (all statuses) — for DB seeding. */
  getAllEntries(): readonly RealWorldEntry[];
  /** All quiz questions — for DB seeding. */
  getAllQuizzes(): readonly EntryQuizQuestion[];
}

// ─── Internal Context ──────────────────────────────────────────────

interface ContentContext {
  readonly deps: ContentEngineDeps;
}

// ─── Query Implementations ─────────────────────────────────────────

function entriesForWorld(ctx: ContentContext, worldId: string): readonly RealWorldEntry[] {
  return ctx.deps.entries.filter(e => e.worldId === worldId && e.status === 'published');
}

function entriesForTier(ctx: ContentContext, tier: DifficultyTier): readonly RealWorldEntry[] {
  return ctx.deps.entries.filter(e => e.difficultyTier === tier && e.status === 'published');
}

function availableEntries(ctx: ContentContext, completedIds: readonly string[]): readonly RealWorldEntry[] {
  const done = new Set(completedIds);
  return ctx.deps.entries.filter(
    e => e.status === 'published' && e.prerequisites.every(p => done.has(p)),
  );
}

function quizzesForEntry(ctx: ContentContext, entryId: string): readonly EntryQuizQuestion[] {
  return ctx.deps.quizzes.filter(q => q.entryId === entryId);
}

function quizzesForEntryAndTier(
  ctx: ContentContext,
  entryId: string,
  tier: DifficultyTier,
): readonly EntryQuizQuestion[] {
  return ctx.deps.quizzes.filter(q => q.entryId === entryId && q.difficultyTier === tier);
}

function mapsForEntry(ctx: ContentContext, entryId: string): readonly EntryCurriculumMap[] {
  return ctx.deps.curriculumMaps.filter(m => m.entryId === entryId);
}

function entriesForStandard(ctx: ContentContext, standardCode: string): readonly RealWorldEntry[] {
  const ids = new Set(
    ctx.deps.curriculumMaps.filter(m => m.standardCode === standardCode).map(m => m.entryId),
  );
  return ctx.deps.entries.filter(e => ids.has(e.id));
}

function checkPrerequisites(
  ctx: ContentContext,
  completedIds: readonly string[],
  targetId: string,
): readonly string[] {
  const entry = ctx.deps.entries.find(e => e.id === targetId);
  if (entry === undefined) return [];
  const done = new Set(completedIds);
  return entry.prerequisites.filter(p => !done.has(p));
}

function buildUnlockChain(ctx: ContentContext, entryId: string): readonly string[] {
  const visited = new Set<string>();
  const queue: string[] = [entryId];
  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    if (current !== entryId) result.push(current);
    const entry = ctx.deps.entries.find(e => e.id === current);
    if (entry === undefined) continue;
    for (const unlock of entry.unlocks) {
      if (!visited.has(unlock)) queue.push(unlock);
    }
  }
  return result;
}

function contentStats(ctx: ContentContext): ContentEngineStats {
  const worldIds = [...new Set(ctx.deps.entries.map(e => e.worldId))];
  return {
    totalEntries: ctx.deps.entries.length,
    publishedEntries: ctx.deps.entries.filter(e => e.status === 'published').length,
    totalQuizQuestions: ctx.deps.quizzes.length,
    totalCurriculumMaps: ctx.deps.curriculumMaps.length,
    worldIds,
  };
}

// ─── Factory ───────────────────────────────────────────────────────

export function createContentEngine(deps: ContentEngineDeps): ContentEngine {
  const ctx: ContentContext = { deps };
  return {
    getEntriesForWorld: (worldId) => entriesForWorld(ctx, worldId),
    getEntriesForTier: (tier) => entriesForTier(ctx, tier),
    getAvailableEntries: (ids) => availableEntries(ctx, ids),
    getEntryById: (id) => ctx.deps.entries.find(e => e.id === id),
    getQuizzesForEntry: (id) => quizzesForEntry(ctx, id),
    getQuizzesForEntryAndTier: (id, tier) => quizzesForEntryAndTier(ctx, id, tier),
    getMapsForEntry: (id) => mapsForEntry(ctx, id),
    getEntriesForStandardCode: (code) => entriesForStandard(ctx, code),
    validatePrerequisites: (ids, target) => checkPrerequisites(ctx, ids, target),
    getUnlockChain: (id) => buildUnlockChain(ctx, id),
    getStats: () => contentStats(ctx),
    getAllEntries: () => ctx.deps.entries,
    getAllQuizzes: () => ctx.deps.quizzes,
  };
}
