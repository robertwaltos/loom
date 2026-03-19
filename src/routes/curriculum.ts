/**
 * Curriculum Map Routes — Academic standards alignment.
 *
 * GET /v1/curriculum                    — All alignments by domain
 * GET /v1/curriculum/stem               — STEM world alignments (NGSS + CCSS)
 * GET /v1/curriculum/language-arts      — Language arts world alignments
 * GET /v1/curriculum/financial-literacy — Financial literacy alignments
 * GET /v1/curriculum/cross-curricular   — 8 high-value cross-curricular entries
 * GET /v1/curriculum/grade-mappings     — Age band → grade range mappings
 * GET /v1/curriculum/world/:worldId     — Alignment for a specific world
 * GET /v1/curriculum/standard?q=        — Search worlds by standard fragment
 *
 * All data is read-only, in-memory.
 * Thread: silk/curriculum
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { CurriculumMapPort } from '../../fabrics/loom-core/src/curriculum-map.js';

export interface CurriculumRoutesDeps {
  readonly curriculum: CurriculumMapPort;
}

export function registerCurriculumRoutes(app: FastifyAppLike, deps: CurriculumRoutesDeps): void {
  const { curriculum } = deps;

  // GET /v1/curriculum/stem
  app.get('/v1/curriculum/stem', async (_req, reply) => {
    const alignments = curriculum.getSTEMAlignments();
    return reply.send({ ok: true, domain: 'stem', alignments, total: alignments.length });
  });

  // GET /v1/curriculum/language-arts
  app.get('/v1/curriculum/language-arts', async (_req, reply) => {
    const alignments = curriculum.getLanguageArtsAlignments();
    return reply.send({ ok: true, domain: 'language-arts', alignments, total: alignments.length });
  });

  // GET /v1/curriculum/financial-literacy
  app.get('/v1/curriculum/financial-literacy', async (_req, reply) => {
    const alignments = curriculum.getFinancialAlignments();
    return reply.send({ ok: true, domain: 'financial-literacy', alignments, total: alignments.length });
  });

  // GET /v1/curriculum/cross-curricular
  app.get('/v1/curriculum/cross-curricular', async (_req, reply) => {
    const highlights = curriculum.getCrossCurricularHighlights();
    return reply.send({ ok: true, highlights, total: highlights.length });
  });

  // GET /v1/curriculum/grade-mappings
  app.get('/v1/curriculum/grade-mappings', async (_req, reply) => {
    const mappings = curriculum.getGradeMappings();
    return reply.send({ ok: true, mappings });
  });

  // GET /v1/curriculum/standard?q= — search by standard fragment (before /world/:worldId)
  app.get('/v1/curriculum/standard', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const q = typeof query['q'] === 'string' ? query['q'].trim() : null;
    if (q === null || q.length === 0) {
      return reply.code(400).send({ ok: false, error: 'q query param required', code: 'INVALID_INPUT' });
    }
    const worldIds = curriculum.getWorldsByStandard(q);
    return reply.send({ ok: true, query: q, worldIds, total: worldIds.length });
  });

  // GET /v1/curriculum/world/:worldId
  app.get('/v1/curriculum/world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const alignment = curriculum.getAlignmentByWorld(worldId);
    if (alignment === undefined) {
      return reply.code(404).send({ ok: false, error: `No curriculum alignment for world '${worldId}'`, code: 'NOT_FOUND' });
    }
    const domain = curriculum.getDomain(worldId);
    return reply.send({ ok: true, worldId, domain, alignment });
  });

  // GET /v1/curriculum — overview of all domains
  app.get('/v1/curriculum', async (_req, reply) => {
    const stem = curriculum.getSTEMAlignments();
    const languageArts = curriculum.getLanguageArtsAlignments();
    const financial = curriculum.getFinancialAlignments();
    const crossCurricular = curriculum.getCrossCurricularHighlights();
    return reply.send({
      ok: true,
      summary: {
        stem: stem.length,
        'language-arts': languageArts.length,
        'financial-literacy': financial.length,
        'cross-curricular': crossCurricular.length,
      },
      domains: ['stem', 'language-arts', 'financial-literacy'],
    });
  });
}
