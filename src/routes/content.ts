/**
 * Content Routes — Full entry detail and quiz delivery for game clients.
 *
 * GET  /v1/content/:entryId              — Full entry detail + quiz questions
 * GET  /v1/content/:entryId/quiz         — Quiz questions only (optionally filtered by ?tier=1|2|3)
 * GET  /v1/content/world/:worldId        — All entries for a world (summary list)
 * GET  /v1/content/search?tag=&world=    — Entry search by subject tag or world
 *
 * Uses in-memory ContentEngine (seeded from DB at boot).
 * No PII — content is entirely curriculum-based; COPPA-safe.
 *
 * Thread: silk/content-api
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { ContentEngine } from '../../universe/content/engine.js';
import type { RealWorldEntry, EntryQuizQuestion, DifficultyTier } from '../../universe/content/types.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface ContentRoutesDeps {
  readonly contentEngine: ContentEngine;
}

// ─── Response shapes ──────────────────────────────────────────────

interface EntryDetail {
  readonly id: string;
  readonly type: RealWorldEntry['type'];
  readonly title: string;
  readonly year: number | null;
  readonly yearDisplay: string;
  readonly era: RealWorldEntry['era'];
  readonly descriptions: {
    readonly child: string;
    readonly older: string;
    readonly parent: string;
  };
  readonly realPeople: readonly string[];
  readonly quote: string | null;
  readonly quoteAttribution: string | null;
  readonly geographicLocation: RealWorldEntry['geographicLocation'];
  readonly continent: string | null;
  readonly subjectTags: readonly string[];
  readonly worldId: string;
  readonly guideId: string;
  readonly adventureType: RealWorldEntry['adventureType'];
  readonly difficultyTier: DifficultyTier;
  readonly prerequisites: readonly string[];
  readonly unlocks: readonly string[];
  readonly funFact: string;
  readonly status: RealWorldEntry['status'];
}

interface QuizQuestion {
  readonly id: string;
  readonly difficultyTier: DifficultyTier;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

interface EntrySummary {
  readonly id: string;
  readonly type: RealWorldEntry['type'];
  readonly title: string;
  readonly year: number | null;
  readonly era: RealWorldEntry['era'];
  readonly difficultyTier: DifficultyTier;
  readonly adventureType: RealWorldEntry['adventureType'];
  readonly subjectTags: readonly string[];
  readonly funFact: string;
}

interface EntryDetailResponse {
  readonly ok: true;
  readonly entry: EntryDetail;
  readonly quiz: readonly QuizQuestion[];
}

interface QuizResponse {
  readonly ok: true;
  readonly entryId: string;
  readonly questions: readonly QuizQuestion[];
  readonly total: number;
}

interface EntriesListResponse {
  readonly ok: true;
  readonly worldId: string;
  readonly entries: readonly EntrySummary[];
  readonly total: number;
}

interface SearchResponse {
  readonly ok: true;
  readonly entries: readonly EntrySummary[];
  readonly total: number;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Mappers ──────────────────────────────────────────────────────

function toEntryDetail(e: RealWorldEntry): EntryDetail {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    year: e.year,
    yearDisplay: e.yearDisplay,
    era: e.era,
    descriptions: {
      child: e.descriptionChild,
      older: e.descriptionOlder,
      parent: e.descriptionParent,
    },
    realPeople: e.realPeople,
    quote: e.quote,
    quoteAttribution: e.quoteAttribution,
    geographicLocation: e.geographicLocation,
    continent: e.continent,
    subjectTags: e.subjectTags,
    worldId: e.worldId,
    guideId: e.guideId,
    adventureType: e.adventureType,
    difficultyTier: e.difficultyTier,
    prerequisites: e.prerequisites,
    unlocks: e.unlocks,
    funFact: e.funFact,
    status: e.status,
  };
}

function toEntrySummary(e: RealWorldEntry): EntrySummary {
  return {
    id: e.id,
    type: e.type,
    title: e.title,
    year: e.year,
    era: e.era,
    difficultyTier: e.difficultyTier,
    adventureType: e.adventureType,
    subjectTags: e.subjectTags,
    funFact: e.funFact,
  };
}

function toQuizQuestion(q: EntryQuizQuestion): QuizQuestion {
  return {
    id: q.id,
    difficultyTier: q.difficultyTier,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  };
}

// ─── Route Registration ────────────────────────────────────────────

export function registerContentRoutes(app: FastifyAppLike, deps: ContentRoutesDeps): void {
  const { contentEngine } = deps;

  // GET /v1/content/world/:worldId — must be before /v1/content/:entryId to avoid conflict
  app.get('/v1/content/world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const entries = contentEngine.getEntriesForWorld(worldId);
    const res: EntriesListResponse = {
      ok: true,
      worldId,
      entries: entries.map(toEntrySummary),
      total: entries.length,
    };
    return reply.send(res);
  });

  // GET /v1/content/search?tag=&worldId=&tier= — search entries
  app.get('/v1/content/search', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const tag = typeof query['tag'] === 'string' ? query['tag'].toLowerCase() : null;
    const worldId = typeof query['worldId'] === 'string' ? query['worldId'] : null;
    const rawTier = typeof query['tier'] === 'string' ? parseInt(query['tier'], 10) : null;
    const tier: DifficultyTier | null = rawTier === 1 || rawTier === 2 || rawTier === 3 ? rawTier : null;

    let entries = contentEngine.getAllEntries().filter(e => e.status === 'published');

    if (worldId !== null) entries = entries.filter(e => e.worldId === worldId);
    if (tier !== null) entries = entries.filter(e => e.difficultyTier === tier);
    if (tag !== null) entries = entries.filter(e =>
      e.subjectTags.some(t => t.toLowerCase().includes(tag)),
    );

    const res: SearchResponse = { ok: true, entries: entries.map(toEntrySummary), total: entries.length };
    return reply.send(res);
  });

  // GET /v1/content/:entryId/quiz — quiz questions for an entry
  // Must be before /:entryId catch-all
  app.get('/v1/content/:entryId/quiz', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;
    if (entryId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid entryId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const entry = contentEngine.getEntryById(entryId);
    if (entry === undefined) {
      const err: ErrorResponse = { ok: false, error: `Entry '${entryId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const rawTier = typeof query['tier'] === 'string' ? parseInt(query['tier'], 10) : null;
    const tier: DifficultyTier | null = rawTier === 1 || rawTier === 2 || rawTier === 3 ? rawTier : null;

    const questions = tier !== null
      ? contentEngine.getQuizzesForEntryAndTier(entryId, tier)
      : contentEngine.getQuizzesForEntry(entryId);

    const res: QuizResponse = {
      ok: true,
      entryId,
      questions: questions.map(toQuizQuestion),
      total: questions.length,
    };
    return reply.send(res);
  });

  // GET /v1/content/:entryId — full entry detail + quiz
  app.get('/v1/content/:entryId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;
    if (entryId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid entryId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const entry = contentEngine.getEntryById(entryId);
    if (entry === undefined) {
      const err: ErrorResponse = { ok: false, error: `Entry '${entryId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const quiz = contentEngine.getQuizzesForEntry(entryId);
    const res: EntryDetailResponse = {
      ok: true,
      entry: toEntryDetail(entry),
      quiz: quiz.map(toQuizQuestion),
    };
    return reply.send(res);
  });
}
