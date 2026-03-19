/**
 * Leitmotif Catalog Routes — 50 character musical motifs.
 *
 * GET /v1/leitmotifs                  — All motifs (optional ?key= or ?mood= filters)
 * GET /v1/leitmotifs/:characterId     — Single motif by character ID
 *
 * All data is read-only, in-memory.
 * Thread: silk/audio
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { LeitmotifCatalogPort } from '../../fabrics/loom-core/src/leitmotif-catalog.js';

export interface LeitmotifRoutesDeps {
  readonly catalog: LeitmotifCatalogPort;
}

export function registerLeitmotifRoutes(app: FastifyAppLike, deps: LeitmotifRoutesDeps): void {
  const { catalog } = deps;

  // GET /v1/leitmotifs — all motifs, with optional ?key= or ?mood= filter
  app.get('/v1/leitmotifs', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const keyFilter = typeof query['key'] === 'string' ? query['key'] : null;
    const moodFilter = typeof query['mood'] === 'string' ? query['mood'] : null;

    let motifs = catalog.getAllMotifs();
    if (keyFilter !== null) {
      // @ts-ignore — MusicalKey is a union; filter by string equality
      motifs = catalog.getMotifsByKey(keyFilter as Parameters<typeof catalog.getMotifsByKey>[0]);
    } else if (moodFilter !== null) {
      motifs = catalog.getMotifsByMood(moodFilter);
    }
    return reply.send({ ok: true, motifs, total: motifs.length });
  });

  // GET /v1/leitmotifs/:characterId — single motif
  app.get('/v1/leitmotifs/:characterId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const characterId = typeof params['characterId'] === 'string' ? params['characterId'] : null;
    if (characterId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid characterId', code: 'INVALID_INPUT' });
    }
    const motif = catalog.getMotifByCharacter(characterId);
    if (motif === undefined) {
      return reply.code(404).send({ ok: false, error: `No motif for character '${characterId}'`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, motif });
  });
}
