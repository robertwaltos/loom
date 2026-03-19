/**
 * Forgetting Well Routes — The inverted tower beneath the Great Archive.
 *
 * GET /v1/forgetting-well                                       — Overview
 * GET /v1/forgetting-well/levels                                — All 5 levels
 * GET /v1/forgetting-well/characters                            — Well characters
 * GET /v1/forgetting-well/recovery-quests                       — All recovery quests
 * GET /v1/forgetting-well/recovery-quests/by-level/:level       — Quests by level
 * GET /v1/forgetting-well/echoes/by-world/:worldId              — Echoes for world
 * GET /v1/forgetting-well/levels/:level                         — Single level (0–4)
 * GET /v1/forgetting-well/characters/:characterId               — Single character
 * GET /v1/forgetting-well/recovery-quests/:questId              — Single quest
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { ForgettingWellPort } from '../../fabrics/loom-core/src/forgetting-well.js';

type WellLevel = 0 | 1 | 2 | 3 | 4;

function parseWellLevel(s: string): WellLevel | null {
  const n = parseInt(s, 10);
  if (n >= 0 && n <= 4) return n as WellLevel;
  return null;
}

export interface ForgettingWellRoutesDeps {
  readonly forgettingWell: ForgettingWellPort;
}

export function registerForgettingWellRoutes(
  app: FastifyAppLike,
  deps: ForgettingWellRoutesDeps,
): void {
  const { forgettingWell } = deps;

  // GET /v1/forgetting-well — overview
  app.get('/v1/forgetting-well', async (_req, reply) => {
    return reply.send({
      ok: true,
      totalLevels: forgettingWell.totalLevels,
      totalRecoveryQuests: forgettingWell.totalRecoveryQuests,
    });
  });

  // GET /v1/forgetting-well/levels — all levels (before /:level)
  app.get('/v1/forgetting-well/levels', async (_req, reply) => {
    const levels = forgettingWell.allLevels();
    return reply.send({ ok: true, levels, total: levels.length });
  });

  // GET /v1/forgetting-well/characters — all characters (before /:characterId)
  app.get('/v1/forgetting-well/characters', async (_req, reply) => {
    const characters = forgettingWell.allCharacters();
    return reply.send({ ok: true, characters, total: characters.length });
  });

  // GET /v1/forgetting-well/recovery-quests/by-level/:level — before /recovery-quests/:questId
  app.get('/v1/forgetting-well/recovery-quests/by-level/:level', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const levelStr = typeof params['level'] === 'string' ? params['level'] : '';
    const level = parseWellLevel(levelStr);
    if (level === null) {
      return reply.code(400).send({ ok: false, error: 'level must be 0–4', code: 'INVALID_INPUT' });
    }
    const quests = forgettingWell.getRecoveryQuestsByLevel(level);
    return reply.send({ ok: true, level, quests, total: quests.length });
  });

  // GET /v1/forgetting-well/recovery-quests — all recovery quests
  app.get('/v1/forgetting-well/recovery-quests', async (_req, reply) => {
    const quests = forgettingWell.allRecoveryQuests();
    return reply.send({ ok: true, quests, total: quests.length });
  });

  // GET /v1/forgetting-well/echoes/by-world/:worldId
  app.get('/v1/forgetting-well/echoes/by-world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const echoes = forgettingWell.getEchoesForWorld(worldId);
    return reply.send({ ok: true, worldId, echoes, total: echoes.length });
  });

  // GET /v1/forgetting-well/levels/:level
  app.get('/v1/forgetting-well/levels/:level', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const levelStr = typeof params['level'] === 'string' ? params['level'] : '';
    const level = parseWellLevel(levelStr);
    if (level === null) {
      return reply.code(400).send({ ok: false, error: 'level must be 0–4', code: 'INVALID_INPUT' });
    }
    const wellLevel = forgettingWell.getLevel(level);
    if (wellLevel === undefined) {
      return reply.code(404).send({ ok: false, error: 'Level not found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, level: wellLevel });
  });

  // GET /v1/forgetting-well/characters/:characterId
  app.get('/v1/forgetting-well/characters/:characterId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const characterId = typeof params['characterId'] === 'string' ? params['characterId'] : null;
    if (characterId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid characterId', code: 'INVALID_INPUT' });
    }
    const character = forgettingWell.getCharacter(characterId);
    if (character === undefined) {
      return reply.code(404).send({ ok: false, error: 'Character not found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, character });
  });

  // GET /v1/forgetting-well/recovery-quests/:questId
  app.get('/v1/forgetting-well/recovery-quests/:questId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const questId = typeof params['questId'] === 'string' ? params['questId'] : null;
    if (questId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid questId', code: 'INVALID_INPUT' });
    }
    const quest = forgettingWell.getRecoveryQuest(questId);
    if (quest === undefined) {
      return reply.code(404).send({ ok: false, error: 'Recovery quest not found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, quest });
  });
}
