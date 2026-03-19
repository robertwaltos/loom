import type { FastifyAppLike } from '@loom/selvage';
import type {
  AscendancyEngine,
  ObserveAnomalyParams,
} from '../../fabrics/loom-core/src/ascendancy-engine.js';
import type { CompromiseType } from '../../fabrics/loom-core/src/lattice-node.js';

interface Deps {
  ascendancyEngine: AscendancyEngine;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerAscendancyRoutes(app: FastifyAppLike, deps: Deps): void {
  const { ascendancyEngine } = deps;

  // Observe a frequency anomaly
  app.post('/v1/ascendancy/anomalies', (req, reply) => {
    const b = r(req).body;
    const params: ObserveAnomalyParams = {
      nodeId: String(b['nodeId'] ?? ''),
      worldId: String(b['worldId'] ?? ''),
      suspectedVector: (b['suspectedVector'] ?? 'SIGNAL_DEGRADATION') as CompromiseType,
      detectionConfidence: Number(b['detectionConfidence'] ?? 0),
      affectedHarmonicIndex: Number(b['affectedHarmonicIndex'] ?? 0),
      harmonicDeviation: Number(b['harmonicDeviation'] ?? 0),
    };
    const result = ascendancyEngine.observeAnomaly(params);
    return reply.code(201).send({ ok: true, result });
  });

  // Get all anomalies for a node
  app.get('/v1/ascendancy/nodes/:nodeId/anomalies', (req, reply) => {
    const { nodeId } = r(req).params;
    const anomalies = ascendancyEngine.getNodeAnomalies(nodeId);
    return reply.send({ ok: true, total: anomalies.length, anomalies });
  });

  // Get all threats for a node
  app.get('/v1/ascendancy/nodes/:nodeId/threats', (req, reply) => {
    const { nodeId } = r(req).params;
    const threats = ascendancyEngine.getNodeThreats(nodeId);
    return reply.send({ ok: true, total: threats.length, threats });
  });

  // Compute beacon integrity score for a node
  app.get('/v1/ascendancy/nodes/:nodeId/integrity', (req, reply) => {
    const { nodeId } = r(req).params;
    const score = ascendancyEngine.computeIntegrityScore(nodeId);
    return reply.send({ ok: true, score });
  });

  // Compute outer-arc correlation for a node
  app.get('/v1/ascendancy/nodes/:nodeId/outer-arc-correlation', (req, reply) => {
    const { nodeId } = r(req).params;
    const correlation = ascendancyEngine.computeOuterArcCorrelation(nodeId);
    return reply.send({ ok: true, nodeId, outerArcCorrelation: correlation ?? null });
  });

  // Get all threats
  app.get('/v1/ascendancy/threats', (_req, reply) => {
    const threats = ascendancyEngine.getThreats();
    return reply.send({ ok: true, total: threats.length, threats });
  });

  // Network-wide incident count
  app.get('/v1/ascendancy/incidents', (_req, reply) => {
    const count = ascendancyEngine.getIncidentCount();
    return reply.send({ ok: true, incidents: count });
  });
}
