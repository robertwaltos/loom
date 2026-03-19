import type { FastifyAppLike } from '@loom/selvage';
import type { EncyclopediaRegistryPort } from '../../fabrics/loom-core/src/encyclopedia-entries.js';

interface Deps {
  encyclopedia: EncyclopediaRegistryPort;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerEncyclopediaRoutes(app: FastifyAppLike, deps: Deps): void {
  const { encyclopedia } = deps;

  // List all entries (optional ?domain= or ?type= filter)
  app.get('/v1/encyclopedia', (rawReq, reply) => {
    const query = r(rawReq).query as Record<string, string | undefined>;
    const domain = query['domain'];
    const type = query['type'];

    let entries = encyclopedia.all();
    if (domain !== undefined) {
      const d = domain as Parameters<typeof encyclopedia.getEntriesByDomain>[0];
      entries = encyclopedia.getEntriesByDomain(d);
    } else if (type !== undefined) {
      const t = type as Parameters<typeof encyclopedia.getEntriesByType>[0];
      entries = encyclopedia.getEntriesByType(t);
    }

    return reply.send({ ok: true, total: entries.length, entries });
  });

  // Stats
  app.get('/v1/encyclopedia/stats', (rawReq, reply) => {
    return reply.send({ ok: true, totalEntries: encyclopedia.totalEntries });
  });

  // Search by historical figure
  app.get('/v1/encyclopedia/search/figure/:name', (rawReq, reply) => {
    const { name } = r(rawReq).params;
    const entries = encyclopedia.searchByFigure(name);
    return reply.send({ ok: true, total: entries.length, entries });
  });

  // Entries for a world
  app.get('/v1/encyclopedia/worlds/:worldId', (rawReq, reply) => {
    const { worldId } = r(rawReq).params;
    const entries = encyclopedia.getEntriesByWorld(worldId);
    return reply.send({ ok: true, worldId, total: entries.length, entries });
  });

  // Single entry by ID
  app.get('/v1/encyclopedia/entries/:entryId', (rawReq, reply) => {
    const { entryId } = r(rawReq).params;
    const entry = encyclopedia.getEntry(entryId);
    if (entry === undefined) {
      return reply.code(404).send({ ok: false, error: 'not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, entry });
  });
}
