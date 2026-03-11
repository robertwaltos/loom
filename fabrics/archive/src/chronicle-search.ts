/**
 * Chronicle Search — Full-text search over Chronicle entries.
 *
 * Provides keyword-based search across Chronicle content with
 * relevance scoring. Designed as a lightweight in-memory index
 * that can be rebuilt from the Chronicle at startup.
 *
 * Features:
 *   - Keyword tokenization and inverted index
 *   - Case-insensitive search
 *   - Multi-term AND/OR queries
 *   - Relevance scoring (term frequency)
 *   - Category and world filtering
 *   - Result pagination
 *
 * "The Archive remembers. The Search helps you find what you seek."
 */

import type { ChronicleCategory } from './chronicle.js';

// ─── Types ──────────────────────────────────────────────────────────

export interface SearchResult {
  readonly entryId: string;
  readonly score: number;
  readonly matchedTerms: ReadonlyArray<string>;
}

export interface SearchQuery {
  readonly terms: ReadonlyArray<string>;
  readonly mode: SearchMode;
  readonly category?: ChronicleCategory;
  readonly worldId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export type SearchMode = 'and' | 'or';

export interface IndexEntry {
  readonly entryId: string;
  readonly category: ChronicleCategory;
  readonly worldId: string;
  readonly tokens: ReadonlyArray<string>;
}

export interface SearchStats {
  readonly indexedEntries: number;
  readonly uniqueTokens: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ChronicleSearchIndex {
  index(entry: IndexEntry): void;
  remove(entryId: string): boolean;
  search(query: SearchQuery): ReadonlyArray<SearchResult>;
  getStats(): SearchStats;
  clear(): void;
}

// ─── State ──────────────────────────────────────────────────────────

interface IndexState {
  readonly invertedIndex: Map<string, Set<string>>; // token → entryIds
  readonly entryMeta: Map<string, EntryMeta>;
}

interface EntryMeta {
  readonly entryId: string;
  readonly category: ChronicleCategory;
  readonly worldId: string;
  readonly tokenSet: ReadonlySet<string>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createChronicleSearchIndex(): ChronicleSearchIndex {
  const state: IndexState = {
    invertedIndex: new Map(),
    entryMeta: new Map(),
  };

  return {
    index: (e) => {
      indexImpl(state, e);
    },
    remove: (id) => removeImpl(state, id),
    search: (q) => searchImpl(state, q),
    getStats: () => getStatsImpl(state),
    clear: () => {
      clearImpl(state);
    },
  };
}

// ─── Indexing ───────────────────────────────────────────────────────

function indexImpl(state: IndexState, entry: IndexEntry): void {
  const tokens = normalizeTokens(entry.tokens);
  const tokenSet = new Set(tokens);

  state.entryMeta.set(entry.entryId, {
    entryId: entry.entryId,
    category: entry.category,
    worldId: entry.worldId,
    tokenSet,
  });

  for (const token of tokenSet) {
    addToInvertedIndex(state, token, entry.entryId);
  }
}

function addToInvertedIndex(state: IndexState, token: string, entryId: string): void {
  const existing = state.invertedIndex.get(token);
  if (existing !== undefined) {
    existing.add(entryId);
  } else {
    state.invertedIndex.set(token, new Set([entryId]));
  }
}

function normalizeTokens(tokens: ReadonlyArray<string>): string[] {
  return tokens.map((t) => t.toLowerCase());
}

// ─── Removal ────────────────────────────────────────────────────────

function removeImpl(state: IndexState, entryId: string): boolean {
  const meta = state.entryMeta.get(entryId);
  if (meta === undefined) return false;

  for (const token of meta.tokenSet) {
    const entries = state.invertedIndex.get(token);
    if (entries !== undefined) {
      entries.delete(entryId);
      if (entries.size === 0) state.invertedIndex.delete(token);
    }
  }
  state.entryMeta.delete(entryId);
  return true;
}

// ─── Search ─────────────────────────────────────────────────────────

function searchImpl(state: IndexState, query: SearchQuery): ReadonlyArray<SearchResult> {
  if (query.terms.length === 0) return [];

  const normalizedTerms = query.terms.map((t) => t.toLowerCase());
  const candidates = findCandidates(state, normalizedTerms, query.mode);
  const filtered = filterCandidates(state, candidates, query);
  const scored = scoreCandidates(state, filtered, normalizedTerms);
  const sorted = scored.sort(byScoreDescending);
  return paginate(sorted, query.offset, query.limit);
}

function findCandidates(state: IndexState, terms: string[], mode: SearchMode): Set<string> {
  if (mode === 'and') return findAndCandidates(state, terms);
  return findOrCandidates(state, terms);
}

function findAndCandidates(state: IndexState, terms: string[]): Set<string> {
  let result: Set<string> | null = null;
  for (const term of terms) {
    const entries = state.invertedIndex.get(term);
    if (entries === undefined) return new Set();
    if (result === null) {
      result = new Set(entries);
    } else {
      intersectInPlace(result, entries);
    }
  }
  return result ?? new Set();
}

function findOrCandidates(state: IndexState, terms: string[]): Set<string> {
  const result = new Set<string>();
  for (const term of terms) {
    const entries = state.invertedIndex.get(term);
    if (entries !== undefined) {
      for (const id of entries) result.add(id);
    }
  }
  return result;
}

function intersectInPlace(target: Set<string>, other: Set<string>): void {
  for (const id of target) {
    if (!other.has(id)) target.delete(id);
  }
}

// ─── Filtering ──────────────────────────────────────────────────────

function filterCandidates(
  state: IndexState,
  candidates: Set<string>,
  query: SearchQuery,
): Set<string> {
  if (query.category === undefined && query.worldId === undefined) {
    return candidates;
  }

  const filtered = new Set<string>();
  for (const id of candidates) {
    const meta = state.entryMeta.get(id);
    if (meta === undefined) continue;
    if (query.category !== undefined && meta.category !== query.category) {
      continue;
    }
    if (query.worldId !== undefined && meta.worldId !== query.worldId) {
      continue;
    }
    filtered.add(id);
  }
  return filtered;
}

// ─── Scoring ────────────────────────────────────────────────────────

function scoreCandidates(
  state: IndexState,
  candidates: Set<string>,
  terms: string[],
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const id of candidates) {
    const meta = state.entryMeta.get(id);
    if (meta === undefined) continue;
    const matched = matchedTerms(meta, terms);
    results.push({
      entryId: id,
      score: matched.length / terms.length,
      matchedTerms: matched,
    });
  }
  return results;
}

function matchedTerms(meta: EntryMeta, terms: string[]): string[] {
  return terms.filter((t) => meta.tokenSet.has(t));
}

function byScoreDescending(a: SearchResult, b: SearchResult): number {
  return b.score - a.score;
}

// ─── Pagination ─────────────────────────────────────────────────────

function paginate(
  results: SearchResult[],
  offset: number | undefined,
  limit: number | undefined,
): SearchResult[] {
  const start = offset ?? 0;
  const end = limit !== undefined ? start + limit : results.length;
  return results.slice(start, end);
}

// ─── Stats ──────────────────────────────────────────────────────────

function getStatsImpl(state: IndexState): SearchStats {
  return {
    indexedEntries: state.entryMeta.size,
    uniqueTokens: state.invertedIndex.size,
  };
}

// ─── Clear ──────────────────────────────────────────────────────────

function clearImpl(state: IndexState): void {
  state.invertedIndex.clear();
  state.entryMeta.clear();
}
