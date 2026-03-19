/**
 * NPC Catalog Routes — World-resident character discovery.
 *
 * GET /v1/npcs                    — All world-resident NPCs (optional ?role= ?tier=)
 * GET /v1/npcs/:npcId             — Single NPC detail
 * GET /v1/npcs/world/:worldId     — All NPCs resident in a world
 * GET /v1/npcs/guides             — All primary guides (tier-1 greeter NPCs)
 *
 * All data is read-only, in-memory.
 * Thread: silk/characters
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { NpcCatalogPort, NpcRole } from '../../fabrics/loom-core/src/npc-catalog.js';

const VALID_ROLES: ReadonlySet<string> = new Set([
  'primary-guide', 'scholar', 'scientist', 'artist', 'merchant',
  'explorer', 'storyteller', 'engineer', 'healer', 'archivist',
]);

export interface NpcRoutesDeps {
  readonly npcCatalog: NpcCatalogPort;
}

export function registerNpcRoutes(app: FastifyAppLike, deps: NpcRoutesDeps): void {
  const { npcCatalog } = deps;

  // GET /v1/npcs/guides — must register before /:npcId
  app.get('/v1/npcs/guides', async (_req, reply) => {
    const guides = npcCatalog.getPrimaryGuides();
    return reply.send({ ok: true, guides, total: guides.length });
  });

  // GET /v1/npcs/world/:worldId — must register before /:npcId
  app.get('/v1/npcs/world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const npcs = npcCatalog.getNpcsByWorld(worldId);
    return reply.send({ ok: true, worldId, npcs, total: npcs.length });
  });

  // GET /v1/npcs — all NPCs, optional ?role= or ?tier= filter
  app.get('/v1/npcs', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const roleFilter = typeof query['role'] === 'string' ? query['role'] : null;
    const tierFilter = typeof query['tier'] === 'string' ? parseInt(query['tier'], 10) : null;

    if (roleFilter !== null && !VALID_ROLES.has(roleFilter)) {
      return reply.code(400).send({
        ok: false,
        error: `role must be one of: ${[...VALID_ROLES].join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    if (tierFilter !== null && (isNaN(tierFilter) || tierFilter < 1 || tierFilter > 3)) {
      return reply.code(400).send({ ok: false, error: 'tier must be 1, 2, or 3', code: 'INVALID_INPUT' });
    }

    let npcs = roleFilter !== null
      ? npcCatalog.getNpcsByRole(roleFilter as NpcRole)
      : tierFilter === 1
        ? npcCatalog.getTierOneNpcs()
        : npcCatalog.getAllNpcs();

    if (tierFilter !== null && tierFilter !== 1) {
      npcs = npcs.filter((n) => n.tier === tierFilter);
    }

    return reply.send({ ok: true, npcs, total: npcs.length });
  });

  // GET /v1/npcs/:npcId — single NPC
  app.get('/v1/npcs/:npcId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const npcId = typeof params['npcId'] === 'string' ? params['npcId'] : null;
    if (npcId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid npcId', code: 'INVALID_INPUT' });
    }
    const npc = npcCatalog.getNpcById(npcId);
    if (npc === undefined) {
      return reply.code(404).send({ ok: false, error: `NPC '${npcId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, npc });
  });
}
