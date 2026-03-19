/**
 * Quest Chains Routes — Cross-world quest chain tracking.
 *
 * GET  /v1/quest-chains                              — List all 20 quest chain definitions
 * GET  /v1/quest-chains/:questId                     — Single quest definition + schema
 * GET  /v1/quest-chains/:questId/progress/:kindlerId — Kindler's progress on a quest
 * POST /v1/quest-chains/:questId/start/:kindlerId    — Start a quest (idempotent)
 * POST /v1/quest-chains/:questId/step/:kindlerId     — Complete a step; body: { stepIndex }
 * GET  /v1/quest-chains/kindler/:kindlerId           — All quest progress for a kindler
 *
 * Thread: silk/quest-chains
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  QuestChainPort,
  QuestChainDefinition,
  QuestCategory,
} from '../../fabrics/loom-core/src/quest-chains.js';
import type { PgQuestChainsRepository } from '../../universe/quests/pg-quest-chains-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface QuestChainsRoutesDeps {
  readonly questChains: QuestChainPort;
  readonly pgQuestRepo: PgQuestChainsRepository;
  readonly now?: () => number;
}

// ─── Response shapes ──────────────────────────────────────────────

interface QuestSummary {
  readonly questId: string;
  readonly name: string;
  readonly category: QuestCategory;
  readonly description: string;
  readonly worldIds: readonly string[];
  readonly stepCount: number;
  readonly sparkReward: number;
}

interface QuestDetail extends QuestSummary {
  readonly steps: readonly {
    readonly stepIndex: number;
    readonly worldId: string;
    readonly description: string;
  }[];
}

interface ProgressResponse {
  readonly ok: true;
  readonly questId: string;
  readonly kindlerId: string;
  readonly startedAt: number | null;
  readonly completedStepIndices: readonly number[];
  readonly totalSteps: number;
  readonly stepsRemaining: number;
  readonly isComplete: boolean;
  readonly sparkReward: number;
}

interface KindlerQuestsResponse {
  readonly ok: true;
  readonly kindlerId: string;
  readonly quests: readonly ProgressResponse[];
  readonly totalStarted: number;
  readonly totalComplete: number;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function toQuestSummary(q: QuestChainDefinition): QuestSummary {
  return {
    questId: q.questId,
    name: q.name,
    category: q.category,
    description: q.description,
    worldIds: q.worldIds,
    stepCount: q.steps.length,
    sparkReward: q.sparkReward,
  };
}

function toQuestDetail(q: QuestChainDefinition): QuestDetail {
  return {
    ...toQuestSummary(q),
    steps: q.steps.map(s => ({ stepIndex: s.stepIndex, worldId: s.worldId, description: s.description })),
  };
}

// ─── Route Registration ────────────────────────────────────────────

export function registerQuestChainsRoutes(app: FastifyAppLike, deps: QuestChainsRoutesDeps): void {
  const { questChains, pgQuestRepo, now = () => Date.now() } = deps;

  // GET /v1/quest-chains/kindler/:kindlerId — BEFORE /:questId to avoid conflict
  app.get('/v1/quest-chains/kindler/:kindlerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid kindlerId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const progressList = await pgQuestRepo.getProgressForKindler(kindlerId);
    const allQuests = questChains.getAllQuests();

    const quests: ProgressResponse[] = progressList.map(p => {
      const def = allQuests.find(q => q.questId === p.questId);
      const totalSteps = def?.steps.length ?? 0;
      const isComplete = totalSteps > 0 && p.completedStepIndices.length >= totalSteps;
      return {
        ok: true,
        questId: p.questId,
        kindlerId,
        startedAt: p.startedAt,
        completedStepIndices: p.completedStepIndices,
        totalSteps,
        stepsRemaining: Math.max(0, totalSteps - p.completedStepIndices.length),
        isComplete,
        sparkReward: def?.sparkReward ?? 0,
      };
    });

    const res: KindlerQuestsResponse = {
      ok: true,
      kindlerId,
      quests,
      totalStarted: quests.length,
      totalComplete: quests.filter(q => q.isComplete).length,
    };
    return reply.send(res);
  });

  // GET /v1/quest-chains — list all quest chain definitions
  app.get('/v1/quest-chains', (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const rawCategory = typeof query['category'] === 'string' ? query['category'] : null;

    let quests = questChains.getAllQuests();
    if (rawCategory !== null) {
      quests = questChains.getQuestsByCategory(rawCategory as QuestCategory);
    }

    return reply.send({ ok: true, quests: quests.map(toQuestSummary), total: quests.length });
  });

  // GET /v1/quest-chains/:questId — single quest definition
  app.get('/v1/quest-chains/:questId', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    if (questId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid questId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const def = questChains.getQuestById(questId);
    if (def === undefined) {
      const err: ErrorResponse = { ok: false, error: `Quest '${questId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    return reply.send({ ok: true, quest: toQuestDetail(def) });
  });

  // GET /v1/quest-chains/:questId/progress/:kindlerId
  app.get('/v1/quest-chains/:questId/progress/:kindlerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (questId === null || kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid questId or kindlerId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const def = questChains.getQuestById(questId);
    if (def === undefined) {
      const err: ErrorResponse = { ok: false, error: `Quest '${questId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    const progress = await pgQuestRepo.getQuestProgress(kindlerId, questId);
    if (progress === null) {
      const res: ProgressResponse = {
        ok: true, questId, kindlerId,
        startedAt: null, completedStepIndices: [],
        totalSteps: def.steps.length, stepsRemaining: def.steps.length,
        isComplete: false, sparkReward: def.sparkReward,
      };
      return reply.send(res);
    }
    const isComplete = progress.completedStepIndices.length >= def.steps.length;
    const res: ProgressResponse = {
      ok: true, questId, kindlerId,
      startedAt: progress.startedAt,
      completedStepIndices: progress.completedStepIndices,
      totalSteps: def.steps.length,
      stepsRemaining: Math.max(0, def.steps.length - progress.completedStepIndices.length),
      isComplete,
      sparkReward: def.sparkReward,
    };
    return reply.send(res);
  });

  // POST /v1/quest-chains/:questId/start/:kindlerId — start a quest
  app.post('/v1/quest-chains/:questId/start/:kindlerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (questId === null || kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid questId or kindlerId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const def = questChains.getQuestById(questId);
    if (def === undefined) {
      const err: ErrorResponse = { ok: false, error: `Quest '${questId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    await pgQuestRepo.startQuest(kindlerId, questId, now());
    return reply.send({ ok: true, questId, kindlerId, startedAt: now() });
  });

  // POST /v1/quest-chains/:questId/step/:kindlerId — complete a step
  app.post('/v1/quest-chains/:questId/step/:kindlerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body as Record<string, unknown> | null | undefined;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (questId === null || kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid questId or kindlerId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const def = questChains.getQuestById(questId);
    if (def === undefined) {
      const err: ErrorResponse = { ok: false, error: `Quest '${questId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    const rawStep = typeof body?.['stepIndex'] === 'number' ? body['stepIndex'] : null;
    if (rawStep === null || rawStep < 0 || rawStep >= def.steps.length) {
      const err: ErrorResponse = { ok: false, error: `stepIndex must be 0–${def.steps.length - 1}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    // Auto-start quest if not started
    await pgQuestRepo.startQuest(kindlerId, questId, now());
    const step = await pgQuestRepo.completeStep(kindlerId, questId, rawStep, now());

    // Check if quest is now complete
    const progress = await pgQuestRepo.getQuestProgress(kindlerId, questId);
    const completedCount = progress?.completedStepIndices.length ?? 0;
    const isComplete = completedCount >= def.steps.length;

    return reply.send({
      ok: true,
      questId,
      kindlerId,
      stepIndex: rawStep,
      alreadyCompleted: step === null,
      isQuestComplete: isComplete,
      stepsRemaining: Math.max(0, def.steps.length - completedCount),
      sparkReward: isComplete ? def.sparkReward : 0,
    });
  });
}
