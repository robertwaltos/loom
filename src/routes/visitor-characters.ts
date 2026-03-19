/**
 * Visitor Characters Routes — Compass, recurring visitors, legendary figures.
 *
 * GET /v1/visitor-characters                — All recurring + legendary (no compass)
 * GET /v1/visitor-characters/compass        — The Compass definition + modes
 * GET /v1/visitor-characters/:characterId   — Single visitor or legendary figure
 * GET /v1/visitor-characters/world/:worldId — All characters present in a world
 *
 * All data is read-only, in-memory.
 * Thread: silk/characters
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { VisitorCharacterPort } from '../../fabrics/loom-core/src/visitor-characters.js';

export interface VisitorCharacterRoutesDeps {
  readonly visitors: VisitorCharacterPort;
}

export function registerVisitorCharacterRoutes(app: FastifyAppLike, deps: VisitorCharacterRoutesDeps): void {
  const { visitors } = deps;

  // GET /v1/visitor-characters/compass — must be before /:characterId
  app.get('/v1/visitor-characters/compass', async (_req, reply) => {
    const compass = visitors.getCompass();
    return reply.send({ ok: true, compass });
  });

  // GET /v1/visitor-characters/world/:worldId — must be before /:characterId
  app.get('/v1/visitor-characters/world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const characters = visitors.getVisitorsForWorld(worldId);
    return reply.send({ ok: true, worldId, characters, total: characters.length });
  });

  // GET /v1/visitor-characters — all recurring visitors + legendary figures
  app.get('/v1/visitor-characters', async (_req, reply) => {
    const recurring = visitors.getRecurringVisitors();
    const legendary = visitors.getLegendaryFigures();
    return reply.send({
      ok: true,
      recurring,
      legendary,
      totals: { recurring: recurring.length, legendary: legendary.length },
    });
  });

  // GET /v1/visitor-characters/:characterId — single visitor/legendary
  app.get('/v1/visitor-characters/:characterId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const characterId = typeof params['characterId'] === 'string' ? params['characterId'] : null;
    if (characterId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid characterId', code: 'INVALID_INPUT' });
    }
    const character = visitors.getVisitorById(characterId);
    if (character === undefined) {
      return reply.code(404).send({ ok: false, error: `Character '${characterId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, character });
  });
}
