import type { FastifyAppLike } from '@loom/selvage';
import type {
  QuestTrackerSystem,
  QuestObjectiveTemplate,
  QuestStatus,
} from '../../fabrics/loom-core/src/quest-tracker.js';

interface Deps {
  questTracker: QuestTrackerSystem;
}

function serialize(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Map) {
    return Object.fromEntries(Array.from(v.entries()).map(([k, val]) => [k, serialize(val)]));
  }
  if (Array.isArray(v)) return v.map(serialize);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serialize(val)]),
    );
  }
  return v;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerQuestTrackerRoutes(app: FastifyAppLike, deps: Deps): void {
  const { questTracker } = deps;

  // Define a quest template
  app.post('/v1/quest-tracker/templates', (req, reply) => {
    const b = r(req).body;
    const questId = String(b['questId'] ?? '');
    const title = String(b['title'] ?? '');
    const description = String(b['description'] ?? '');
    const objectives = (b['objectives'] ?? []) as ReadonlyArray<QuestObjectiveTemplate>;
    const rewardKalon = BigInt(String(b['rewardKalon'] ?? '0'));
    const timeLimit = b['timeLimit'] !== undefined && b['timeLimit'] !== null
      ? BigInt(String(b['timeLimit']))
      : null;
    const result = questTracker.defineQuest(questId, title, description, objectives, rewardKalon, timeLimit);
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, template: serialize(result) });
  });

  // Register player
  app.post('/v1/quest-tracker/players/:playerId/register', (req, reply) => {
    const { playerId } = r(req).params;
    const result = questTracker.registerPlayer(playerId);
    if (!result.success) {
      const code = result.error === 'already-registered' ? 409 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, playerId });
  });

  // Accept a quest
  app.post('/v1/quest-tracker/players/:playerId/quests', (req, reply) => {
    const { playerId } = r(req).params;
    const b = r(req).body;
    const questId = String(b['questId'] ?? '');
    const result = questTracker.acceptQuest(playerId, questId);
    if (typeof result === 'string') {
      const code = result === 'player-not-found' || result === 'quest-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, playerQuest: serialize(result) });
  });

  // List player quests (optional ?status= filter)
  app.get('/v1/quest-tracker/players/:playerId/quests', (req, reply) => {
    const { playerId } = r(req).params;
    const q = r(req).query;
    const status = q['status'] as QuestStatus | undefined;
    const quests = questTracker.listPlayerQuests(playerId, status);
    return reply.send({ ok: true, total: quests.length, quests: serialize(quests) });
  });

  // Player stats
  app.get('/v1/quest-tracker/players/:playerId/stats', (req, reply) => {
    const { playerId } = r(req).params;
    const stats = questTracker.getPlayerStats(playerId);
    if (stats === undefined) {
      return reply.code(404).send({ ok: false, error: 'player-not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, stats: serialize(stats) });
  });

  // Get a specific player quest
  app.get('/v1/quest-tracker/player-quests/:playerQuestId', (req, reply) => {
    const { playerQuestId } = r(req).params;
    const pq = questTracker.getPlayerQuest(playerQuestId);
    if (pq === undefined) {
      return reply.code(404).send({ ok: false, error: 'quest-not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, playerQuest: serialize(pq) });
  });

  // Progress an objective
  app.post('/v1/quest-tracker/player-quests/:playerQuestId/objectives/:objectiveId/progress', (req, reply) => {
    const { playerQuestId, objectiveId } = r(req).params;
    const result = questTracker.progressObjective(playerQuestId, objectiveId);
    if (!result.success) {
      const code = result.error === 'quest-not-found' || result.error === 'objective-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, questCompleted: result.questCompleted });
  });

  // Fail an objective
  app.post('/v1/quest-tracker/player-quests/:playerQuestId/objectives/:objectiveId/fail', (req, reply) => {
    const { playerQuestId, objectiveId } = r(req).params;
    const result = questTracker.failObjective(playerQuestId, objectiveId);
    if (!result.success) {
      const code = result.error === 'quest-not-found' || result.error === 'objective-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, questFailed: result.questFailed });
  });

  // Abandon a quest
  app.post('/v1/quest-tracker/player-quests/:playerQuestId/abandon', (req, reply) => {
    const { playerQuestId } = r(req).params;
    const result = questTracker.abandonQuest(playerQuestId);
    if (!result.success) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, abandoned: true });
  });

  // Award reward
  app.post('/v1/quest-tracker/player-quests/:playerQuestId/reward', (req, reply) => {
    const { playerQuestId } = r(req).params;
    const result = questTracker.awardReward(playerQuestId);
    if (!result.success) {
      const code = result.error === 'quest-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, reward: serialize(result.reward) });
  });
}
