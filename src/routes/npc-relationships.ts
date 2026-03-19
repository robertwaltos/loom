/**
 * NPC Relationship Registry Routes — Cross-world character bonds.
 *
 * GET /v1/npc-relationships                         — All 17 relationships (optional ?character= ?world=)
 * GET /v1/npc-relationships/cross-world-pairs       — World pairs connected via character bonds
 * GET /v1/npc-relationships/:relationshipId         — Full bond detail
 *
 * All data is read-only, in-memory.
 * Thread: silk/narrative
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { NpcRelationshipRegistryPort } from '../../fabrics/loom-core/src/npc-relationship-registry.js';

export interface NpcRelationshipRoutesDeps {
  readonly npcRelationships: NpcRelationshipRegistryPort;
}

export function registerNpcRelationshipRoutes(app: FastifyAppLike, deps: NpcRelationshipRoutesDeps): void {
  const { npcRelationships } = deps;

  // GET /v1/npc-relationships/cross-world-pairs — must register before /:relationshipId
  app.get('/v1/npc-relationships/cross-world-pairs', async (_req, reply) => {
    const pairs = npcRelationships.getCrossWorldPairs();
    return reply.send({ ok: true, pairs, total: pairs.length });
  });

  // GET /v1/npc-relationships — all, optional ?character= or ?world= filter
  app.get('/v1/npc-relationships', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const character = typeof query['character'] === 'string' ? query['character'].trim() : null;
    const world = typeof query['world'] === 'string' ? query['world'].trim() : null;

    const relationships = character !== null
      ? npcRelationships.getRelationshipsForCharacter(character)
      : world !== null
        ? npcRelationships.getRelationshipsForWorld(world)
        : npcRelationships.all();

    return reply.send({
      ok: true,
      relationships,
      total: relationships.length,
      totalInRegistry: npcRelationships.totalRelationships,
    });
  });

  // GET /v1/npc-relationships/:relationshipId
  app.get('/v1/npc-relationships/:relationshipId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const relationshipId = typeof params['relationshipId'] === 'string' ? params['relationshipId'] : null;
    if (relationshipId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid relationshipId', code: 'INVALID_INPUT' });
    }
    const relationship = npcRelationships.getRelationship(relationshipId);
    if (relationship === undefined) {
      return reply.code(404).send({ ok: false, error: `Relationship '${relationshipId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, relationship });
  });
}
