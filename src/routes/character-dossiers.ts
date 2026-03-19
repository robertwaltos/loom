/**
 * Character Dossiers Routes — Full background dossiers for all 20 Koydo world guides.
 *
 * GET /v1/character-dossiers                  — All dossiers (summary)
 * GET /v1/character-dossiers/by-role/:role    — Filter by guide role
 * GET /v1/character-dossiers/by-world/:worldId — Filter by primary world
 * GET /v1/character-dossiers/:characterId     — Full single dossier
 *
 * Thread: silk/characters
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  CharacterDossierRegistryPort,
  GuideRole,
} from '../../fabrics/loom-core/src/character-dossiers.js';

const VALID_ROLES: ReadonlySet<string> = new Set([
  'stem_science', 'stem_math', 'stem_technology', 'stem_environment',
  'language_arts', 'financial', 'crossroads', 'wellbeing',
]);

export interface CharacterDossierRoutesDeps {
  readonly dossierRegistry: CharacterDossierRegistryPort;
}

export function registerCharacterDossierRoutes(
  app: FastifyAppLike,
  deps: CharacterDossierRoutesDeps,
): void {
  const { dossierRegistry } = deps;

  // GET /v1/character-dossiers/by-role/:role — before /:characterId
  app.get('/v1/character-dossiers/by-role/:role', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const role = typeof params['role'] === 'string' ? params['role'] : null;
    if (role === null || !VALID_ROLES.has(role)) {
      return reply.code(400).send({
        ok: false,
        error: `role must be one of: ${[...VALID_ROLES].join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    const dossiers = dossierRegistry.getByRole(role as GuideRole);
    return reply.send({ ok: true, role, dossiers, total: dossiers.length });
  });

  // GET /v1/character-dossiers/by-world/:worldId — before /:characterId
  app.get('/v1/character-dossiers/by-world/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const dossiers = dossierRegistry.getByWorld(worldId);
    return reply.send({ ok: true, worldId, dossiers, total: dossiers.length });
  });

  // GET /v1/character-dossiers — list all
  app.get('/v1/character-dossiers', async (_req, reply) => {
    const dossiers = dossierRegistry.allDossiers();
    return reply.send({ ok: true, dossiers, total: dossierRegistry.totalDossiers });
  });

  // GET /v1/character-dossiers/:characterId
  app.get('/v1/character-dossiers/:characterId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const characterId = typeof params['characterId'] === 'string' ? params['characterId'] : null;
    if (characterId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid characterId', code: 'INVALID_INPUT' });
    }
    const dossier = dossierRegistry.getById(characterId);
    if (dossier === undefined) {
      return reply.code(404).send({ ok: false, error: 'Dossier not found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, dossier });
  });
}
