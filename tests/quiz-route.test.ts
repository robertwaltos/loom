/**
 * Quiz Route Tests
 *
 * Tests for /v1/quiz/entry/:entryId endpoints: question listing,
 * tier filtering, and summary counts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerQuizRoutes } from '../src/routes/quiz.js';
import type { QuizRoutesDeps } from '../src/routes/quiz.js';
import type { ContentEngine } from '../universe/content/engine.js';
import type { RealWorldEntry, EntryQuizQuestion, DifficultyTier } from '../universe/content/types.js';

// ─── Test doubles ─────────────────────────────────────────────────

const MOCK_ENTRY: RealWorldEntry = {
  id: 'entry-fibonacci-rabbit-problem',
  type: 'discovery',
  title: 'Fibonacci Rabbit Problem',
  year: 1202,
  yearDisplay: '1202 CE',
  era: 'medieval',
  descriptionChild: 'A counting pattern!',
  descriptionOlder: 'Leonardo of Pisa...',
  descriptionParent: 'A foundational pattern.',
  realPeople: ['Fibonacci'],
  quote: 'Patterns are everywhere.',
  quoteAttribution: 'Fibonacci',
  geographicLocation: { lat: 43.7, lng: 10.4, name: 'Pisa' },
  continent: 'Europe',
  subjectTags: ['mathematics'],
  worldId: 'number-garden',
  guideId: 'dottie-chakravarti',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: [],
  funFact: 'Fibonacci numbers appear in nature!',
  imagePrompt: 'A spiral garden...',
  status: 'published',
};

const MOCK_QUIZZES: readonly EntryQuizQuestion[] = [
  { id: 'q1', entryId: 'entry-fibonacci-rabbit-problem', difficultyTier: 1, question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'Exp1' },
  { id: 'q2', entryId: 'entry-fibonacci-rabbit-problem', difficultyTier: 2, question: 'Q2?', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'Exp2' },
  { id: 'q3', entryId: 'entry-fibonacci-rabbit-problem', difficultyTier: 3, question: 'Q3?', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Exp3' },
];

function makeContentEngine(entries: readonly RealWorldEntry[], quizzes: readonly EntryQuizQuestion[]): ContentEngine {
  return {
    getEntriesForWorld: (worldId) => entries.filter(e => e.worldId === worldId),
    getEntriesForTier: (tier) => entries.filter(e => e.difficultyTier === tier),
    getAvailableEntries: () => entries,
    getEntryById: (id) => entries.find(e => e.id === id),
    getQuizzesForEntry: (entryId) => quizzes.filter(q => q.entryId === entryId),
    getQuizzesForEntryAndTier: (entryId, tier) => quizzes.filter(q => q.entryId === entryId && q.difficultyTier === tier),
    getMapsForEntry: () => [],
    getEntriesForStandardCode: () => [],
    validatePrerequisites: () => [],
    getUnlockChain: () => [],
    getStats: () => ({
      totalEntries: entries.length,
      publishedEntries: entries.length,
      totalQuizQuestions: quizzes.length,
      totalCurriculumMaps: 0,
      worldIds: [...new Set(entries.map(e => e.worldId))],
    }),
  };
}

// ─── Minimal test harness ─────────────────────────────────────────

type Handler = (req: unknown, reply: unknown) => Promise<unknown>;
interface MockApp {
  routes: Map<string, Handler>;
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  delete(path: string, handler: Handler): void;
  patch(path: string, handler: Handler): void;
}

function makeApp(): MockApp {
  const routes = new Map<string, Handler>();
  return {
    routes,
    get(path, handler) { routes.set(`GET ${path}`, handler); },
    post(path, handler) { routes.set(`POST ${path}`, handler); },
    delete(path, handler) { routes.set(`DELETE ${path}`, handler); },
    patch(path, handler) { routes.set(`PATCH ${path}`, handler); },
  };
}

interface MockReply {
  statusCode: number;
  body: unknown;
  code(n: number): MockReply;
  status(n: number): MockReply;
  send(data: unknown): MockReply;
}

function makeReply(): MockReply {
  const r: MockReply = {
    statusCode: 200,
    body: null,
    code(n) { r.statusCode = n; return r; },
    status(n) { r.statusCode = n; return r; },
    send(data) { r.body = data; return r; },
  };
  return r;
}

function matchRoute(pattern: string, actual: string): Record<string, string> | null {
  const rp = pattern.split('/');
  const ap = actual.split('/');
  if (rp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < rp.length; i++) {
    const seg = rp[i]!;
    const act = ap[i]!;
    if (seg.startsWith(':')) params[seg.slice(1)] = act;
    else if (seg !== act) return null;
  }
  return params;
}

async function invoke(
  app: MockApp,
  method: string,
  path: string,
  query: Record<string, unknown> = {},
): Promise<MockReply> {
  let handler: Handler | undefined;
  let params: Record<string, unknown> = {};

  const staticKey = `${method} ${path}`;
  if (app.routes.has(staticKey)) {
    handler = app.routes.get(staticKey);
  } else {
    // Match longest static prefix first — so /summary matches before /:entryId
    const candidates: Array<{ key: string; h: Handler; params: Record<string, string> }> = [];
    for (const [key, h] of app.routes) {
      if (!key.startsWith(`${method} `)) continue;
      const m = matchRoute(key.slice(method.length + 1), path);
      if (m !== null) candidates.push({ key, h, params: m });
    }
    // Prefer routes with more static (non-param) segments
    candidates.sort((a, b) => {
      const aStatic = a.key.split('/').filter(s => !s.startsWith(':')).length;
      const bStatic = b.key.split('/').filter(s => !s.startsWith(':')).length;
      return bStatic - aStatic;
    });
    if (candidates.length > 0) {
      const best = candidates[0]!;
      handler = best.h;
      params = best.params;
    }
  }

  const reply = makeReply();
  if (handler === undefined) return reply.code(404).send({ ok: false, error: 'Not found', code: 'NOT_FOUND' });
  await handler({ params, query }, reply);
  return reply;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Quiz Routes', () => {
  let app: MockApp;
  let deps: QuizRoutesDeps;

  beforeEach(() => {
    app = makeApp();
    deps = { contentEngine: makeContentEngine([MOCK_ENTRY], MOCK_QUIZZES) };
    registerQuizRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, deps);
  });

  describe('GET /v1/quiz/entry/:entryId', () => {
    it('returns all 3 quiz questions', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/entry-fibonacci-rabbit-problem');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; entryId: string; questions: unknown[]; total: number };
      expect(body.ok).toBe(true);
      expect(body.entryId).toBe('entry-fibonacci-rabbit-problem');
      expect(body.total).toBe(3);
    });

    it('filters by tier=1', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/entry-fibonacci-rabbit-problem', { tier: '1' });
      const body = reply.body as { questions: Array<{ difficultyTier: DifficultyTier }>; total: number };
      expect(body.total).toBe(1);
      expect(body.questions[0]!.difficultyTier).toBe(1);
    });

    it('filters by tier=2', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/entry-fibonacci-rabbit-problem', { tier: '2' });
      const body = reply.body as { total: number; questions: Array<{ difficultyTier: DifficultyTier }> };
      expect(body.total).toBe(1);
      expect(body.questions[0]!.difficultyTier).toBe(2);
    });

    it('rejects invalid tier', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/entry-fibonacci-rabbit-problem', { tier: '5' });
      expect(reply.statusCode).toBe(400);
      const body = reply.body as { code: string };
      expect(body.code).toBe('INVALID_INPUT');
    });

    it('returns 404 for unknown entry', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/nonexistent');
      expect(reply.statusCode).toBe(404);
    });

    it('does NOT include correctIndex in response', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/entry-fibonacci-rabbit-problem');
      const body = reply.body as { questions: Array<Record<string, unknown>> };
      const q = body.questions[0]!;
      expect('correctIndex' in q).toBe(false);
    });
  });

  describe('GET /v1/quiz/entry/:entryId/summary', () => {
    it('returns tier counts', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/entry-fibonacci-rabbit-problem/summary');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; tier1Count: number; tier2Count: number; tier3Count: number; totalCount: number };
      expect(body.ok).toBe(true);
      expect(body.tier1Count).toBe(1);
      expect(body.tier2Count).toBe(1);
      expect(body.tier3Count).toBe(1);
      expect(body.totalCount).toBe(3);
    });

    it('returns 404 for unknown entry', async () => {
      const reply = await invoke(app, 'GET', '/v1/quiz/entry/nonexistent/summary');
      expect(reply.statusCode).toBe(404);
    });
  });
});
