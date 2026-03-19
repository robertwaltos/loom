/**
 * Hidden Zones Routes — Secret discoverable areas from Bible v5.
 *
 * GET  /v1/hidden-zones                           — All 5 zone definitions
 * GET  /v1/hidden-zones/:zoneId                   — Single zone definition
 * GET  /v1/kindler/:kindlerId/hidden-zones         — Discovered zones for a kindler
 * POST /v1/kindler/:kindlerId/hidden-zones/:zoneId/discover — Mark zone discovered
 *
 * Discovery grants +15 spark (one-time). The eligibility check is done
 * client-side (using kindler state from other endpoints); the server
 * records the discovery idempotently.
 *
 * Thread: silk/exploration
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { HiddenZonePort, HiddenZoneId } from '../../fabrics/loom-core/src/hidden-zones.js';
import type { PgHiddenZonesRepository } from '../../universe/hidden-zones/pg-hidden-zones-repository.js';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import type { SparkLogEntry } from '../../universe/kindler/types.js';

export interface HiddenZoneRoutesDeps {
  readonly hiddenZones: HiddenZonePort;
  readonly pgHiddenZonesRepo?: PgHiddenZonesRepository;
  readonly kindlerRepo?: KindlerRepository;
}

export function registerHiddenZoneRoutes(app: FastifyAppLike, deps: HiddenZoneRoutesDeps): void {
  const { hiddenZones, pgHiddenZonesRepo, kindlerRepo } = deps;

  // GET /v1/hidden-zones — all zone definitions
  app.get('/v1/hidden-zones', async (_req, reply) => {
    const zones = hiddenZones.getAllZones();
    const totalSparkAvailable = hiddenZones.getTotalSparkAvailable();
    return reply.send({ ok: true, zones, total: zones.length, totalSparkAvailable });
  });

  // GET /v1/hidden-zones/:zoneId — single zone
  app.get('/v1/hidden-zones/:zoneId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const zoneId = typeof params['zoneId'] === 'string' ? params['zoneId'] : null;
    if (zoneId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid zoneId', code: 'INVALID_INPUT' });
    }
    const zone = hiddenZones.getZoneById(zoneId as HiddenZoneId);
    if (zone === undefined) {
      return reply.code(404).send({ ok: false, error: `Zone '${zoneId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, zone });
  });

  // GET /v1/kindler/:kindlerId/hidden-zones — discovered zones for a kindler
  app.get('/v1/kindler/:kindlerId/hidden-zones', async (req, reply) => {
    if (!pgHiddenZonesRepo) {
      return reply.code(503).send({ ok: false, error: 'Discovery tracking unavailable', code: 'SERVICE_UNAVAILABLE' });
    }
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid kindlerId', code: 'INVALID_INPUT' });
    }
    const discoveries = await pgHiddenZonesRepo.getDiscoveriesForKindler(kindlerId);
    const allZones = hiddenZones.getAllZones();
    const discoveredSet = new Set(discoveries.map((d) => d.zoneId));
    return reply.send({
      ok: true,
      kindlerId,
      discovered: discoveries,
      discoveredCount: discoveries.length,
      totalZones: allZones.length,
      remaining: allZones.filter((z) => !discoveredSet.has(z.zoneId)).map((z) => z.zoneId),
    });
  });

  // POST /v1/kindler/:kindlerId/hidden-zones/:zoneId/discover — record discovery + grant spark
  app.post('/v1/kindler/:kindlerId/hidden-zones/:zoneId/discover', async (req, reply) => {
    if (!pgHiddenZonesRepo || !kindlerRepo) {
      return reply.code(503).send({ ok: false, error: 'Discovery tracking unavailable', code: 'SERVICE_UNAVAILABLE' });
    }
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    const zoneId = typeof params['zoneId'] === 'string' ? params['zoneId'] : null;
    if (kindlerId === null || zoneId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid kindlerId or zoneId', code: 'INVALID_INPUT' });
    }

    const zone = hiddenZones.getZoneById(zoneId as HiddenZoneId);
    if (zone === undefined) {
      return reply.code(404).send({ ok: false, error: `Zone '${zoneId}' not found`, code: 'NOT_FOUND' });
    }

    const profile = await kindlerRepo.findById(kindlerId);
    if (profile === null) {
      return reply.code(404).send({ ok: false, error: `Kindler '${kindlerId}' not found`, code: 'NOT_FOUND' });
    }

    const now = Date.now();
    const discovery = await pgHiddenZonesRepo.recordDiscovery(kindlerId, zoneId, now);
    if (discovery === null) {
      // Already discovered — idempotent
      return reply.send({
        ok: true,
        alreadyDiscovered: true,
        kindlerId,
        zoneId,
        sparkGranted: 0,
        message: `${zone.name} was already discovered`,
      });
    }

    // Grant spark reward
    const sparkReward = zone.sparkReward;
    const newSparkLevel = Math.min(1.0, parseFloat((profile.sparkLevel + sparkReward / 1000).toFixed(4)));
    const updatedProfile = { ...profile, sparkLevel: newSparkLevel };
    await kindlerRepo.save(updatedProfile);

    const sparkEntry: SparkLogEntry = {
      id: crypto.randomUUID(),
      kindlerId,
      sparkLevel: newSparkLevel,
      delta: sparkReward / 1000,
      cause: 'world_restored', // closest analog — hidden zone discovery
      timestamp: now,
    };
    await kindlerRepo.appendSparkEntry(sparkEntry);

    return reply.send({
      ok: true,
      alreadyDiscovered: false,
      kindlerId,
      zoneId,
      zoneName: zone.name,
      sparkGranted: sparkReward,
      newSparkLevel,
      discoveredAt: now,
    });
  });
}
