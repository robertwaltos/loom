/**
 * Combat Routes — Entity abilities, cooldowns, and effect tracking.
 *
 * POST /v1/combat/abilities                            — Register ability
 * GET  /v1/combat/abilities                            — List all abilities
 * GET  /v1/combat/abilities/:abilityId                 — Get ability
 * GET  /v1/combat/abilities/:abilityId/report          — Activation report
 * POST /v1/combat/entities/:entityId/resources         — Set entity resources
 * GET  /v1/combat/entities/:entityId/resources         — Get entity resources
 * GET  /v1/combat/entities/:entityId/cooldowns         — Active cooldowns
 * GET  /v1/combat/entities/:entityId/effects           — Applied effects
 * POST /v1/combat/entities/:entityId/activate/:abilityId — Activate ability { targetEntityId }
 * POST /v1/combat/entities/:entityId/cooldowns/:abilityId/reset — Reset cooldown (admin)
 *
 * All times in request bodies use milliseconds; internally stored as bigint µs.
 * BigInt fields in responses are serialized as strings.
 *
 * Thread: silk/combat
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import {
  createAbilitySystem,
  registerAbility,
  activateAbility,
  applyEffect,
  resetCooldown,
  getAbilityReport,
  getActiveEffects,
  setEntityResources,
  getEntityResources,
  isOnCooldown,
} from '../../fabrics/loom-core/src/ability-system.js';
import type { ResourceCost, ResourceType, EffectType } from '../../fabrics/loom-core/src/ability-system.js';

const VALID_EFFECT_TYPES: ReadonlySet<string> = new Set([
  'DAMAGE', 'HEAL', 'BUFF', 'DEBUFF', 'TELEPORT', 'SUMMON', 'SHIELD',
]);

const VALID_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  'STAMINA', 'MANA', 'HEALTH', 'ENERGY',
]);

const MS_TO_US = 1000n;

/** Recursively replace bigint with string for JSON. */
function serializeBigInt(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeBigInt);
  if (v instanceof Map) {
    return Object.fromEntries([...v.entries()].map(([k, val]) => [k, serializeBigInt(val)]));
  }
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeBigInt(val)]),
    );
  }
  return v;
}

export interface CombatRoutesDeps {
  readonly abilitySystem: ReturnType<typeof createAbilitySystem>;
}

export function registerCombatRoutes(app: FastifyAppLike, deps: CombatRoutesDeps): void {
  const { abilitySystem } = deps;

  // GET /v1/combat/abilities — list all (before /:abilityId)
  app.get('/v1/combat/abilities', async (_req, reply) => {
    const abilities = [...abilitySystem.abilities.values()];
    return reply.send({ ok: true, abilities: serializeBigInt(abilities), total: abilities.length });
  });

  // POST /v1/combat/abilities — register
  app.post('/v1/combat/abilities', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['name'] !== 'string') {
      return reply.code(400).send({ ok: false, error: 'name required', code: 'INVALID_INPUT' });
    }
    const effectType = String(b['effectType'] ?? 'DAMAGE');
    if (!VALID_EFFECT_TYPES.has(effectType)) {
      return reply.code(400).send({ ok: false, error: `effectType must be one of: ${[...VALID_EFFECT_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const costs: ResourceCost[] = Array.isArray(b['costs'])
      ? (b['costs'] as Record<string, unknown>[])
          .filter(c => VALID_RESOURCE_TYPES.has(String(c['resourceType'])))
          .map(c => ({
            resourceType: String(c['resourceType']) as ResourceType,
            amount: BigInt(Number(c['amount'] ?? 0)),
          }))
      : [];
    const result = registerAbility(
      abilitySystem,
      b['name'],
      costs,
      BigInt(typeof b['cooldownMs'] === 'number' ? b['cooldownMs'] : 1000) * MS_TO_US,
      effectType as EffectType,
      BigInt(typeof b['magnitude'] === 'number' ? b['magnitude'] : 10),
      BigInt(typeof b['durationMs'] === 'number' ? b['durationMs'] : 0) * MS_TO_US,
      BigInt(typeof b['range'] === 'number' ? b['range'] : 100),
    );
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, ability: serializeBigInt(result) });
  });

  // GET /v1/combat/abilities/:abilityId/report — before /:abilityId
  app.get('/v1/combat/abilities/:abilityId/report', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const abilityId = typeof params['abilityId'] === 'string' ? params['abilityId'] : null;
    if (abilityId === null) return reply.code(400).send({ ok: false, error: 'Invalid abilityId', code: 'INVALID_INPUT' });
    const report = getAbilityReport(abilitySystem, abilityId);
    if (typeof report === 'string') return reply.code(404).send({ ok: false, error: report, code: 'NOT_FOUND' });
    return reply.send({ ok: true, report: serializeBigInt(report) });
  });

  // GET /v1/combat/abilities/:abilityId
  app.get('/v1/combat/abilities/:abilityId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const abilityId = typeof params['abilityId'] === 'string' ? params['abilityId'] : null;
    if (abilityId === null) return reply.code(400).send({ ok: false, error: 'Invalid abilityId', code: 'INVALID_INPUT' });
    const ability = abilitySystem.abilities.get(abilityId);
    if (ability === undefined) return reply.code(404).send({ ok: false, error: 'Ability not found', code: 'NOT_FOUND' });
    return reply.send({ ok: true, ability: serializeBigInt(ability) });
  });

  // POST /v1/combat/entities/:entityId/resources — set resources
  app.post('/v1/combat/entities/:entityId/resources', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const resources = new Map<ResourceType, bigint>();
    for (const key of VALID_RESOURCE_TYPES) {
      if (typeof b[key] === 'number') {
        resources.set(key as ResourceType, BigInt(b[key] as number));
      }
    }
    setEntityResources(abilitySystem, entityId, resources);
    return reply.send({ ok: true, entityId, resources: Object.fromEntries([...resources.entries()].map(([k, v]) => [k, v.toString()])) });
  });

  // GET /v1/combat/entities/:entityId/resources
  app.get('/v1/combat/entities/:entityId/resources', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    const result = getEntityResources(abilitySystem, entityId);
    if (typeof result === 'string') return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    return reply.send({ ok: true, entityId, resources: serializeBigInt(result) });
  });

  // GET /v1/combat/entities/:entityId/cooldowns
  app.get('/v1/combat/entities/:entityId/cooldowns', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    const allAbilities = [...abilitySystem.abilities.keys()];
    const activeCooldowns = allAbilities
      .filter(abilityId => isOnCooldown(abilitySystem, entityId, abilityId))
      .map(abilityId => {
        const cd = abilitySystem.cooldowns.get(`${entityId}:${abilityId}`);
        return cd ? serializeBigInt(cd) : null;
      })
      .filter(Boolean);
    return reply.send({ ok: true, entityId, cooldowns: activeCooldowns, total: activeCooldowns.length });
  });

  // GET /v1/combat/entities/:entityId/effects
  app.get('/v1/combat/entities/:entityId/effects', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    const effects = getActiveEffects(abilitySystem, entityId);
    return reply.send({ ok: true, entityId, effects: serializeBigInt(effects), total: effects.length });
  });

  // POST /v1/combat/entities/:entityId/cooldowns/:abilityId/reset — admin reset
  app.post('/v1/combat/entities/:entityId/cooldowns/:abilityId/reset', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    const abilityId = typeof params['abilityId'] === 'string' ? params['abilityId'] : null;
    if (entityId === null || abilityId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid entityId or abilityId', code: 'INVALID_INPUT' });
    }
    const result = resetCooldown(abilitySystem, entityId, abilityId);
    if (result !== 'ok') return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    return reply.send({ ok: true, entityId, abilityId, reset: true });
  });

  // POST /v1/combat/entities/:entityId/activate/:abilityId — activate ability
  app.post('/v1/combat/entities/:entityId/activate/:abilityId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    const abilityId = typeof params['abilityId'] === 'string' ? params['abilityId'] : null;
    if (entityId === null || abilityId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid entityId or abilityId', code: 'INVALID_INPUT' });
    }
    const targetEntityId = typeof body === 'object' && body !== null && 'targetEntityId' in body
      ? String((body as Record<string, unknown>)['targetEntityId'])
      : entityId;

    const result = activateAbility(abilitySystem, entityId, abilityId, targetEntityId);
    if (typeof result === 'string') {
      const statusCode = result === 'on-cooldown' || result === 'insufficient-resources' ? 409 : 422;
      return reply.code(statusCode).send({ ok: false, error: result, code: result.toUpperCase().replace(/-/g, '_') });
    }

    // Also record effect application
    const ability = abilitySystem.abilities.get(abilityId);
    if (ability !== undefined) {
      applyEffect(abilitySystem, abilityId, entityId, targetEntityId, ability.effectType, ability.effectMagnitude, ability.effectDurationUs);
    }

    return reply.send({ ok: true, activation: serializeBigInt(result) });
  });
}
