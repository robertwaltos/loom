/**
 * Status Effects Routes — Buffs, debuffs, immunity management.
 *
 * GET  /v1/status-effects/:entityId              — Active effects + immunities
 * POST /v1/status-effects/:entityId/apply        — Apply a status effect
 * POST /v1/status-effects/:entityId/tick         — Tick effects (process damage/heal)
 * POST /v1/status-effects/:entityId/immunity     — Grant immunity { effectType, durationMs }
 * DELETE /v1/status-effects/:entityId/:effectId  — Remove effect
 * DELETE /v1/status-effects/:entityId/immunity/:effectType — Revoke immunity
 *
 * All times in request bodies use milliseconds; internally stored as bigint µs.
 * BigInt fields in responses are serialized as strings.
 *
 * Thread: silk/combat
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import {
  createStatusEffectSystem,
  applyEffect,
  removeEffect,
  grantImmunity,
  revokeImmunity,
  tickEffects,
  getActiveEffects,
} from '../../fabrics/loom-core/src/status-effect.js';
import type { EffectType, StackBehavior } from '../../fabrics/loom-core/src/status-effect.js';

const VALID_EFFECT_TYPES: ReadonlySet<string> = new Set([
  'POISON', 'BURN', 'FREEZE', 'STUN', 'SLOW', 'HASTE', 'REGEN', 'SHIELD', 'WEAKNESS', 'STRENGTH',
]);

const VALID_STACK_BEHAVIORS: ReadonlySet<string> = new Set([
  'REPLACE', 'EXTEND', 'STACK', 'REFRESH',
]);

/** Recursively replace bigint with string for JSON. */
function serializeBigInt(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeBigInt);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeBigInt(val)]),
    );
  }
  return v;
}

const MS_TO_US = 1000n;

export interface StatusEffectRoutesDeps {
  readonly statusEffectSystem: ReturnType<typeof createStatusEffectSystem>;
}

export function registerStatusEffectRoutes(app: FastifyAppLike, deps: StatusEffectRoutesDeps): void {
  const { statusEffectSystem } = deps;

  // GET /v1/status-effects/:entityId — active effects + immunities
  app.get('/v1/status-effects/:entityId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    const effects = getActiveEffects(statusEffectSystem, entityId);
    return reply.send({ ok: true, entityId, effects: serializeBigInt(effects), total: effects.length });
  });

  // POST /v1/status-effects/:entityId/apply — apply effect
  app.post('/v1/status-effects/:entityId/apply', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const effectType = String(b['effectType'] ?? '');
    const stackBehavior = String(b['stackBehavior'] ?? 'REPLACE');
    if (!VALID_EFFECT_TYPES.has(effectType)) {
      return reply.code(400).send({ ok: false, error: `effectType must be one of: ${[...VALID_EFFECT_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    if (!VALID_STACK_BEHAVIORS.has(stackBehavior)) {
      return reply.code(400).send({ ok: false, error: `stackBehavior must be one of: ${[...VALID_STACK_BEHAVIORS].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const magnitudeMs = typeof b['magnitude'] === 'number' ? b['magnitude'] : 10;
    const durationMs = typeof b['durationMs'] === 'number' ? b['durationMs'] : 5000;
    const tickIntervalMs = typeof b['tickIntervalMs'] === 'number' ? b['tickIntervalMs'] : 1000;
    const sourceEntityId = typeof b['sourceEntityId'] === 'string' ? b['sourceEntityId'] : 'system';

    const result = applyEffect(
      statusEffectSystem,
      sourceEntityId,
      entityId,
      effectType as EffectType,
      BigInt(magnitudeMs),
      BigInt(durationMs) * MS_TO_US,
      stackBehavior as StackBehavior,
      BigInt(tickIntervalMs) * MS_TO_US,
    );
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, effect: serializeBigInt(result) });
  });

  // POST /v1/status-effects/:entityId/tick — process effects
  app.post('/v1/status-effects/:entityId/tick', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    const results = tickEffects(statusEffectSystem, entityId);
    if (typeof results === 'string') {
      return reply.code(404).send({ ok: false, error: results, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, entityId, ticks: serializeBigInt(results), total: results.length });
  });

  // POST /v1/status-effects/:entityId/immunity — grant immunity
  app.post('/v1/status-effects/:entityId/immunity', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    if (entityId === null) return reply.code(400).send({ ok: false, error: 'Invalid entityId', code: 'INVALID_INPUT' });
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const effectType = String(b['effectType'] ?? '');
    if (!VALID_EFFECT_TYPES.has(effectType)) {
      return reply.code(400).send({ ok: false, error: `effectType must be one of: ${[...VALID_EFFECT_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const durationMs = typeof b['durationMs'] === 'number' ? b['durationMs'] : 30000;
    const result = grantImmunity(statusEffectSystem, entityId, effectType as EffectType, BigInt(durationMs) * MS_TO_US);
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, immunity: serializeBigInt(result) });
  });

  // DELETE /v1/status-effects/:entityId/immunity/:effectType — revoke immunity
  app.delete('/v1/status-effects/:entityId/immunity/:effectType', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    const effectType = typeof params['effectType'] === 'string' ? params['effectType'] : null;
    if (entityId === null || effectType === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid entityId or effectType', code: 'INVALID_INPUT' });
    }
    if (!VALID_EFFECT_TYPES.has(effectType)) {
      return reply.code(400).send({ ok: false, error: `effectType must be one of: ${[...VALID_EFFECT_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const result = revokeImmunity(statusEffectSystem, entityId, effectType as EffectType);
    if (result !== 'ok') return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    return reply.send({ ok: true, entityId, effectType, revoked: true });
  });

  // DELETE /v1/status-effects/:entityId/:effectId — remove specific effect
  app.delete('/v1/status-effects/:entityId/:effectId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entityId = typeof params['entityId'] === 'string' ? params['entityId'] : null;
    const effectId = typeof params['effectId'] === 'string' ? params['effectId'] : null;
    if (entityId === null || effectId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid entityId or effectId', code: 'INVALID_INPUT' });
    }
    const result = removeEffect(statusEffectSystem, entityId, effectId);
    if (result !== 'ok') return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    return reply.send({ ok: true, entityId, effectId, removed: true });
  });
}
