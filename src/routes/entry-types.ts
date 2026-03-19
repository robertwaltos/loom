/**
 * Entry Types Routes — Expanded entry formats (unsolved mysteries, living experiments, thought experiments).
 *
 * GET /v1/entry-types                     — All expanded entries (optional ?type=)
 * GET /v1/entry-types/world-assignments   — World assignment rules per type
 * GET /v1/entry-types/:entryId            — Single expanded entry
 * GET /v1/entry-types/world/:worldId      — Expanded entries for a specific world
 * GET /v1/entry-types/type/:typeName      — All entries of a given type
 *
 * All data is read-only, in-memory.
 * Thread: silk/content
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { EntryTypePort, EntryTypeName } from '../../fabrics/loom-core/src/entry-types.js';

const VALID_TYPES: ReadonlySet<string> = new Set([
  'unsolved_mystery',
  'living_experiment',
  'thought_experiment',
]);

export interface EntryTypeRoutesDeps {
  readonly entryTypes: EntryTypePort;
}

export function registerEntryTypeRoutes(app: FastifyAppLike, deps: EntryTypeRoutesDeps): void {
  const { entryTypes } = deps;

  // GET /v1/entry-types/world-assignments — must register before /world/:worldId
  app.get('/v1/entry-types/world-assignments', async (_req, reply) => {
    const assignments = entryTypes.getWorldAssignments();
    return reply.send({ ok: true, assignments });
  });

  // GET /v1/entry-types/type/:typeName — must register before /:entryId
  app.get('/v1/entry-types/type/:typeName', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const typeName = typeof params['typeName'] === 'string' ? params['typeName'] : null;
    if (typeName === null || !VALID_TYPES.has(typeName)) {
      return reply.code(400).send({
        ok: false,
        error: `typeName must be one of: ${[...VALID_TYPES].join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    const entries = entryTypes.getEntriesByType(typeName as EntryTypeName);
    return reply.send({ ok: true, type: typeName, entries, total: entries.length });
  });

  // GET /v1/entry-types/world/:worldId — must register before /:entryId
  app.get('/v1/entry-types/world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const entries = entryTypes.getEntriesByWorld(worldId);
    return reply.send({ ok: true, worldId, entries, total: entries.length });
  });

  // GET /v1/entry-types/:entryId — single entry
  app.get('/v1/entry-types/:entryId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;
    if (entryId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid entryId', code: 'INVALID_INPUT' });
    }
    const entry = entryTypes.getEntryById(entryId);
    if (entry === undefined) {
      return reply.code(404).send({ ok: false, error: `Entry '${entryId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, entry });
  });

  // GET /v1/entry-types — all expanded entries, optional ?type= filter
  app.get('/v1/entry-types', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const typeFilter = typeof query['type'] === 'string' ? query['type'] : null;
    if (typeFilter !== null && !VALID_TYPES.has(typeFilter)) {
      return reply.code(400).send({
        ok: false,
        error: `type must be one of: ${[...VALID_TYPES].join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    const entries = typeFilter !== null
      ? entryTypes.getEntriesByType(typeFilter as EntryTypeName)
      : entryTypes.getAllEntries();
    return reply.send({ ok: true, entries, total: entries.length });
  });
}
