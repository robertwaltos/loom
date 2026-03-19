/**
 * Procedural Quest Routes — Dynamic quest generation from world triggers.
 *
 * POST /v1/procedural-quests/templates               — Register quest template
 * GET  /v1/procedural-quests/templates/stats         — Template activation stats
 * POST /v1/procedural-quests/generate                — Generate quest from trigger
 * POST /v1/procedural-quests/chains                  — Create quest chain
 * POST /v1/procedural-quests/expire                  — Expire old quests
 * GET  /v1/procedural-quests/active/:dynastyId       — Active quests for dynasty
 * GET  /v1/procedural-quests/chains/:chainId         — Get quest chain
 * POST /v1/procedural-quests/chains/:chainId/advance — Advance chain to next quest
 * POST /v1/procedural-quests/:questId/activate       — Assign quest to dynasty
 * POST /v1/procedural-quests/:questId/complete       — Complete quest
 * POST /v1/procedural-quests/:questId/fail           — Fail quest
 *
 * BigInt fields (kalonAmount, timestamps) serialized as strings.
 *
 * Thread: silk/quests
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  ProceduralQuestModule,
  QuestTrigger,
  QuestTemplate,
  QuestTriggerType,
  QuestDifficulty,
} from '../../fabrics/loom-core/src/procedural-quest.js';

const VALID_TRIGGER_TYPES: ReadonlySet<string> = new Set([
  'LOW_INTEGRITY', 'NPC_NEED', 'FACTION_CONFLICT',
  'RESOURCE_SHORTAGE', 'PLAYER_LEVEL', 'WORLD_EVENT',
]);

const VALID_DIFFICULTIES: ReadonlySet<string> = new Set([
  'TRIVIAL', 'EASY', 'MODERATE', 'HARD', 'LEGENDARY',
]);

/** Recursively replace bigint with string for JSON. */
function serializeBigInt(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeBigInt);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeBigInt(val)]),
    );
  }
  return v;
}

export interface ProceduralQuestRoutesDeps {
  readonly proceduralQuests: ProceduralQuestModule;
}

export function registerProceduralQuestRoutes(
  app: FastifyAppLike,
  deps: ProceduralQuestRoutesDeps,
): void {
  const { proceduralQuests } = deps;

  // GET /v1/procedural-quests/templates/stats — before /:questId
  app.get('/v1/procedural-quests/templates/stats', async (_req, reply) => {
    const stats = proceduralQuests.getTemplateStats();
    return reply.send({ ok: true, stats });
  });

  // POST /v1/procedural-quests/expire — before /:questId
  app.post('/v1/procedural-quests/expire', async (_req, reply) => {
    const expired = proceduralQuests.expireOldQuests();
    return reply.send({ ok: true, expired });
  });

  // POST /v1/procedural-quests/templates — register template
  app.post('/v1/procedural-quests/templates', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['templateId'] !== 'string' || typeof b['name'] !== 'string') {
      return reply.code(400).send({ ok: false, error: 'templateId and name required', code: 'INVALID_INPUT' });
    }
    const triggerType = String(b['triggerType'] ?? 'WORLD_EVENT');
    const difficulty = String(b['difficulty'] ?? 'MODERATE');
    if (!VALID_TRIGGER_TYPES.has(triggerType)) {
      return reply.code(400).send({ ok: false, error: `triggerType must be one of: ${[...VALID_TRIGGER_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    if (!VALID_DIFFICULTIES.has(difficulty)) {
      return reply.code(400).send({ ok: false, error: `difficulty must be one of: ${[...VALID_DIFFICULTIES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const rawReward = typeof b['baseReward'] === 'object' && b['baseReward'] !== null
      ? b['baseReward'] as Record<string, unknown>
      : {};
    const template: QuestTemplate = {
      templateId: b['templateId'],
      name: b['name'],
      description: typeof b['description'] === 'string' ? b['description'] : '',
      triggerType: triggerType as QuestTriggerType,
      difficulty: difficulty as QuestDifficulty,
      prerequisites: Array.isArray(b['prerequisites']) ? (b['prerequisites'] as string[]) : [],
      baseReward: {
        kalonAmount: BigInt(typeof rawReward['kalonAmount'] === 'number' ? rawReward['kalonAmount'] : 100),
        experiencePoints: typeof rawReward['experiencePoints'] === 'number' ? rawReward['experiencePoints'] : 50,
        items: Array.isArray(rawReward['items']) ? (rawReward['items'] as string[]) : [],
        reputationGain: typeof rawReward['reputationGain'] === 'number' ? rawReward['reputationGain'] : 5,
      },
      estimatedDurationMinutes: typeof b['estimatedDurationMinutes'] === 'number' ? b['estimatedDurationMinutes'] : 15,
      maxActiveInstances: typeof b['maxActiveInstances'] === 'number' ? b['maxActiveInstances'] : 10,
    };
    const result = proceduralQuests.registerTemplate(template);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, templateId: result });
  });

  // POST /v1/procedural-quests/generate — generate from trigger
  app.post('/v1/procedural-quests/generate', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const triggerType = String(b['type'] ?? 'WORLD_EVENT');
    if (!VALID_TRIGGER_TYPES.has(triggerType)) {
      return reply.code(400).send({ ok: false, error: `type must be one of: ${[...VALID_TRIGGER_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const trigger: QuestTrigger = {
      type: triggerType as QuestTriggerType,
      worldId: typeof b['worldId'] === 'string' ? b['worldId'] : 'unknown',
      severity: typeof b['severity'] === 'number' ? b['severity'] : 0.5,
      metadata: typeof b['metadata'] === 'object' && b['metadata'] !== null
        ? b['metadata'] as Record<string, unknown>
        : {},
    };
    const result = proceduralQuests.generateQuest(trigger);
    if ('error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, quest: serializeBigInt(result) });
  });

  // POST /v1/procedural-quests/chains — create chain
  app.post('/v1/procedural-quests/chains', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['name'] !== 'string' || !Array.isArray(b['templateIds'])) {
      return reply.code(400).send({ ok: false, error: 'name and templateIds[] required', code: 'INVALID_INPUT' });
    }
    const result = proceduralQuests.createChain(b['name'], b['templateIds'] as string[]);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, chainId: result });
  });

  // GET /v1/procedural-quests/active/:dynastyId — before /:questId
  app.get('/v1/procedural-quests/active/:dynastyId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const dynastyId = typeof params['dynastyId'] === 'string' ? params['dynastyId'] : null;
    if (dynastyId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid dynastyId', code: 'INVALID_INPUT' });
    }
    const quests = proceduralQuests.getActiveQuests(dynastyId);
    return reply.send({ ok: true, dynastyId, quests: serializeBigInt(quests), total: quests.length });
  });

  // GET /v1/procedural-quests/chains/:chainId
  app.get('/v1/procedural-quests/chains/:chainId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const chainId = typeof params['chainId'] === 'string' ? params['chainId'] : null;
    if (chainId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid chainId', code: 'INVALID_INPUT' });
    }
    const result = proceduralQuests.getQuestChain(chainId);
    if ('error' in result) {
      return reply.code(404).send({ ok: false, error: result.error, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, chain: result });
  });

  // POST /v1/procedural-quests/chains/:chainId/advance
  app.post('/v1/procedural-quests/chains/:chainId/advance', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const chainId = typeof params['chainId'] === 'string' ? params['chainId'] : null;
    if (chainId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid chainId', code: 'INVALID_INPUT' });
    }
    const result = proceduralQuests.advanceChain(chainId);
    if ('error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, quest: serializeBigInt(result) });
  });

  // POST /v1/procedural-quests/:questId/activate
  app.post('/v1/procedural-quests/:questId/activate', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    if (questId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid questId', code: 'INVALID_INPUT' });
    }
    const dynastyId = typeof body === 'object' && body !== null && 'dynastyId' in body
      ? String((body as Record<string, unknown>)['dynastyId'])
      : null;
    if (dynastyId === null) {
      return reply.code(400).send({ ok: false, error: 'dynastyId required', code: 'INVALID_INPUT' });
    }
    const result = proceduralQuests.activateQuest(questId, dynastyId);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, questId: result, dynastyId });
  });

  // POST /v1/procedural-quests/:questId/complete
  app.post('/v1/procedural-quests/:questId/complete', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    if (questId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid questId', code: 'INVALID_INPUT' });
    }
    const result = proceduralQuests.completeQuest(questId);
    if ('error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, questId, reward: serializeBigInt(result) });
  });

  // POST /v1/procedural-quests/:questId/fail
  app.post('/v1/procedural-quests/:questId/fail', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    if (questId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid questId', code: 'INVALID_INPUT' });
    }
    const reason = typeof body === 'object' && body !== null && 'reason' in body
      ? String((body as Record<string, unknown>)['reason'])
      : 'unspecified';
    const result = proceduralQuests.failQuest(questId, reason);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, questId, failed: true, reason });
  });
}
