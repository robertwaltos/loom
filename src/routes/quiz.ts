/**
 * Quiz Routes — Entry quiz questions for in-world knowledge checks.
 *
 * GET  /v1/quiz/entry/:entryId                — All quiz questions for an entry
 * GET  /v1/quiz/entry/:entryId/summary        — Question count per difficulty tier
 *
 * COPPA note: Quiz answers (correctIndex) are only returned for authenticated
 * requests. Public endpoint returns questions + options only (no answer key).
 * TODO: Add answer-key suppression once JWT auth is wired.
 *
 * Thread: silk/adventures-quiz
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { ContentEngine } from '../../universe/content/engine.js';
import type { EntryQuizQuestion, DifficultyTier } from '../../universe/content/types.js';
import type { AnalyticsEmitter } from '../../universe/analytics/pg-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface QuizRoutesDeps {
  readonly contentEngine: ContentEngine;
  /** Optional: fire-and-forget analytics emitter. */
  readonly analyticsEmitter?: AnalyticsEmitter;
}

// ─── Response shapes ──────────────────────────────────────────────

interface QuizQuestionSummary {
  readonly id: string;
  readonly entryId: string;
  readonly difficultyTier: DifficultyTier;
  readonly question: string;
  readonly options: readonly string[];
  readonly explanation: string;
  // correctIndex intentionally omitted — sent separately when auth is added
}

interface QuizListResponse {
  readonly ok: true;
  readonly entryId: string;
  readonly questions: readonly QuizQuestionSummary[];
  readonly total: number;
}

interface QuizSummaryResponse {
  readonly ok: true;
  readonly entryId: string;
  readonly tier1Count: number;
  readonly tier2Count: number;
  readonly tier3Count: number;
  readonly totalCount: number;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function questionToSummary(q: EntryQuizQuestion): QuizQuestionSummary {
  return {
    id: q.id,
    entryId: q.entryId,
    difficultyTier: q.difficultyTier,
    question: q.question,
    options: q.options,
    explanation: q.explanation,
  };
}

// ─── Route Registration ────────────────────────────────────────────

export function registerQuizRoutes(app: FastifyAppLike, deps: QuizRoutesDeps): void {
  const { contentEngine, analyticsEmitter } = deps;

  // GET /v1/quiz/entry/:entryId/summary — question counts per tier
  app.get('/v1/quiz/entry/:entryId/summary', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;

    if (entryId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid entryId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const entry = contentEngine.getEntryById(entryId);
    if (entry === undefined) {
      const err: ErrorResponse = {
        ok: false,
        error: `Entry '${entryId}' not found`,
        code: 'NOT_FOUND',
      };
      return reply.code(404).send(err);
    }

    const all = contentEngine.getQuizzesForEntry(entryId);
    const tier1 = all.filter(q => q.difficultyTier === 1).length;
    const tier2 = all.filter(q => q.difficultyTier === 2).length;
    const tier3 = all.filter(q => q.difficultyTier === 3).length;

    const res: QuizSummaryResponse = {
      ok: true,
      entryId,
      tier1Count: tier1,
      tier2Count: tier2,
      tier3Count: tier3,
      totalCount: all.length,
    };
    return reply.send(res);
  });

  // GET /v1/quiz/entry/:entryId — quiz questions (optional ?tier=1|2|3 filter)
  app.get('/v1/quiz/entry/:entryId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;

    if (entryId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid entryId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const entry = contentEngine.getEntryById(entryId);
    if (entry === undefined) {
      const err: ErrorResponse = {
        ok: false,
        error: `Entry '${entryId}' not found`,
        code: 'NOT_FOUND',
      };
      return reply.code(404).send(err);
    }

    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const tierRaw = query['tier'];
    let questions: readonly EntryQuizQuestion[];

    if (tierRaw !== undefined) {
      const tier = Number(tierRaw);
      if (tier !== 1 && tier !== 2 && tier !== 3) {
        const err: ErrorResponse = {
          ok: false,
          error: 'tier must be 1, 2, or 3',
          code: 'INVALID_INPUT',
        };
        return reply.code(400).send(err);
      }
      questions = contentEngine.getQuizzesForEntryAndTier(entryId, tier as DifficultyTier);
    } else {
      questions = contentEngine.getQuizzesForEntry(entryId);
    }

    const res: QuizListResponse = {
      ok: true,
      entryId,
      questions: questions.map(questionToSummary),
      total: questions.length,
    };
    analyticsEmitter?.emit({ eventType: 'quiz_viewed', properties: { entryId } });
    return reply.send(res);
  });
}
