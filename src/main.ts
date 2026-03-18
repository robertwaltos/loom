/**
 * main.ts — Production server bootstrap for The Loom.
 *
 * Wires real infrastructure adapters (Fastify, PostgreSQL, Redis,
 * libsodium, Pino) into the hexagonal fabric architecture and
 * starts the game loop.
 *
 * Usage:
 *   npx tsx src/main.ts
 *
 * Environment variables:
 *   LOOM_HOST        — Bind address (default: 0.0.0.0)
 *   LOOM_PORT        — Listen port (default: 8080)
 *   LOOM_TICK_RATE   — Tick rate in Hz (default: 20)
 *   LOOM_GRPC_PORT   — gRPC bridge port for UE5 clients (default: 50051)
 *   PG_HOST          — PostgreSQL host (default: 127.0.0.1)
 *   PG_PORT          — PostgreSQL port (default: 5432)
 *   PG_DATABASE      — PostgreSQL database (default: loom)
 *   PG_USER          — PostgreSQL user (default: loom)
 *   PG_PASSWORD      — PostgreSQL password (default: empty)
 *   REDIS_HOST       — Redis host (default: 127.0.0.1)
 *   REDIS_PORT       — Redis port (default: 6379)
 *   REDIS_PASSWORD   — Redis password (default: empty)
 *
 * Thread: bridge/bootstrap
 * Tier: 0
 */

import type { WorldLuminance } from '../universe/worlds/types.js';

// ─── Environment Config ─────────────────────────────────────────

interface LoomEnv {
  readonly host: string;
  readonly port: number;
  readonly tickRateHz: number;
  readonly grpcPort: number;
  readonly pg: {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly user: string;
    readonly password: string;
  };
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly password: string | undefined;
  };
  readonly supabase: {
    readonly url: string | undefined;
    readonly key: string | undefined;
  };
}

function loadEnv(): LoomEnv {
  return {
    host: process.env['LOOM_HOST'] ?? '0.0.0.0',
    port: parseInt(process.env['LOOM_PORT'] ?? '8080', 10),
    tickRateHz: parseInt(process.env['LOOM_TICK_RATE'] ?? '20', 10),
    grpcPort: parseInt(process.env['LOOM_GRPC_PORT'] ?? '50051', 10),
    pg: {
      host: process.env['PG_HOST'] ?? '127.0.0.1',
      port: parseInt(process.env['PG_PORT'] ?? '5432', 10),
      database: process.env['PG_DATABASE'] ?? 'loom',
      user: process.env['PG_USER'] ?? 'loom',
      password: process.env['PG_PASSWORD'] ?? '',
    },
    redis: {
      host: process.env['REDIS_HOST'] ?? '127.0.0.1',
      port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
      password: process.env['REDIS_PASSWORD'] ?? undefined,
    },
    supabase: {
      url: process.env['SUPABASE_URL'],
      key: process.env['SUPABASE_SERVICE_KEY'],
    },
  };
}

// ─── Bootstrap ──────────────────────────────────────────────────

async function main(): Promise<void> {
  const env = loadEnv();

  // 1. Logger (everything else can log through this)
  const { createPinoLogger } = await import('@loom/loom-core');
  const logger = createPinoLogger('loom');

  logger.info({ host: env.host, port: env.port, tickRateHz: env.tickRateHz }, 'Loom starting');

  // 2. PostgreSQL
  const { createPgPool, migrateSchema } = await import('@loom/archive');
  const pgPool = await createPgPool({
    host: env.pg.host,
    port: env.pg.port,
    database: env.pg.database,
    user: env.pg.user,
    password: env.pg.password,
  });
  await migrateSchema(pgPool);
  logger.info({ host: env.pg.host, database: env.pg.database }, 'PostgreSQL connected, schema migrated');

  // 3. Redis cache
  const { createRedisCache } = await import('@loom/loom-core');
  const cache = await createRedisCache({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
  });
  logger.info({ host: env.redis.host }, 'Redis cache connected');

  // 4. Encryption
  const { createSodiumEncryptionBackend, createNodeHashBackend } = await import('@loom/dye-house');
  const encryptionBackend = createSodiumEncryptionBackend();
  const hashBackend = createNodeHashBackend();
  logger.info({}, 'Crypto backends initialised (XChaCha20-Poly1305 + SHA-256)');

  // 5. Game Orchestrator (owns the core tick loop)
  const { createGameOrchestrator } = await import('@loom/loom-core');
  const renderingFabric = createWirableRenderingFabric();
  const orchestrator = createGameOrchestrator({
    renderingFabric: {
      pushStateSnapshot: renderingFabric.pushStateSnapshot,
      spawnVisual: renderingFabric.spawnVisual,
      despawnVisual: renderingFabric.despawnVisual,
    } as never,
    coreConfig: {
      logger,
      tickRateHz: env.tickRateHz,
    },
  });
  logger.info({}, 'Game orchestrator assembled');

  // 5b. Seed all 9 canonical worlds at boot
  const { seedAllWorlds } = await import('./world-seed-boot.js');
  seedAllWorlds(orchestrator, logger);

  // 6. Selvage — Fastify WebSocket transport
  const { createFastifyTransport } = await import('@loom/selvage');
  const { createAuthRoutes } = await import('./routes/auth.js');
  const { createSupportRoutes } = await import('../tools/support/src/support-webhook.js');

  // 6a. Koydo Worlds — Kindler progression engine + persistence
  const { createKindlerEngine } = await import('../universe/kindler/engine.js');
  const { createKindlerRepository, createMockKindlerRepository } = await import('../universe/kindler/repository.js');
  const { createBootstrappedCharactersEngine } = await import('../universe/characters/bootstrap.js');
  const { createBootstrappedContentEngine } = await import('../universe/content/bootstrap.js');
  const { createWorldsEngine } = await import('../universe/worlds/engine.js');
  const { ALL_WORLDS } = await import('../universe/worlds/registry.js');
  const { applyRestoration, calculateRestorationDelta, resolveFadingStage } = await import('../universe/fading/engine.js');
  const { createBootstrappedAdventuresEngine } = await import('../universe/adventures/bootstrap.js');
  const { registerKindlerRoutes } = await import('./routes/kindler.js');
  const { registerSessionRoutes } = await import('./routes/session.js');
  const { registerGuideRoutes } = await import('./routes/guide.js');
  const { registerParentDashboardRoutes } = await import('./routes/parent-dashboard.js');
  const { registerSafetyRoutes } = await import('./routes/safety.js');
  const { registerWorldsRoutes } = await import('./routes/worlds.js');
  const { registerAdventuresRoutes } = await import('./routes/adventures.js');
  const { registerQuizRoutes } = await import('./routes/quiz.js');

  const koydoIdGen = { generate: () => crypto.randomUUID() };

  const kindlerEngine = createKindlerEngine({
    clock: { nowMilliseconds: () => Date.now() },
    logger: {
      info: (msg, meta) => logger.info(meta ?? {}, msg),
      warn: (msg, meta) => logger.warn(meta ?? {}, msg),
    },
    idGenerator: koydoIdGen,
    events: {
      onSparkChange: (event) => logger.info({ event }, 'spark_change'),
      onChapterAdvanced: (event) => logger.info({ event }, 'chapter_advanced'),
    },
  });

  // TODO (prod): Install @supabase/supabase-js and wire real adapter when
  // SUPABASE_URL + SUPABASE_SERVICE_KEY are configured.
  const kindlerRepo = createMockKindlerRepository();
  const charactersEngine = createBootstrappedCharactersEngine();
  const contentEngine = createBootstrappedContentEngine();
  const adventuresEngine = createBootstrappedAdventuresEngine();
  const worldsEngine = createWorldsEngine({ worlds: ALL_WORLDS });

  // In-memory luminance store: all 50 worlds start at 0.5 (dimming) until Kindlers restore them
  const now = Date.now();
  const luminanceStore = new Map<string, WorldLuminance>(
    ALL_WORLDS.map(w => [w.id, {
      worldId: w.id,
      luminance: 0.5,
      stage: resolveFadingStage(0.5),
      lastRestoredAt: now,
      totalKindlersContributed: 0,
      activeKindlerCount: 0,
    }]),
  );

  function onEntryCompleted(worldId: string, kindlerId: string, tier: 1 | 2 | 3): void {
    const current = luminanceStore.get(worldId);
    if (current === undefined) return;
    const delta = calculateRestorationDelta({ difficultyTier: tier, isCollaborative: false, returnBonus: false });
    const { updated } = applyRestoration(current, delta, 'kindler_progress', kindlerId);
    luminanceStore.set(worldId, updated);
    logger.info({ worldId, luminance: updated.luminance, stage: updated.stage }, 'koydo:fading:restored');
  }

  function getEntryTier(entryId: string): 1 | 2 | 3 | null {
    const entry = contentEngine.getEntryById(entryId);
    return entry?.difficultyTier ?? null;
  }

  if (env.supabase.url) {
    logger.warn({}, 'SUPABASE_URL set but @supabase/supabase-js not installed — using mock repo');
  } else {
    logger.warn({}, 'SUPABASE_URL not set — using in-memory mock KindlerRepository (dev mode)');
  }
  logger.info({ guides: 49, worlds: ALL_WORLDS.length, contentEntries: contentEngine.getStats().totalEntries, adventureConfigs: adventuresEngine.getStats().totalConfigs }, 'Koydo: KindlerEngine + CharactersEngine + WorldsEngine + ContentEngine + AdventuresEngine ready');

  function koydoLog(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>): void {
    if (level === 'error') logger.error(meta ?? {}, msg);
    else if (level === 'warn') logger.warn(meta ?? {}, msg);
    else logger.info(meta ?? {}, msg);
  }

  const transport = createFastifyTransport({
    host: env.host,
    port: env.port,
    routeRegistrars: [
      createAuthRoutes({
        nakamaHost: process.env['NAKAMA_HOST'] ?? '127.0.0.1',
        nakamaPort: parseInt(process.env['NAKAMA_PORT'] ?? '7350', 10),
        serverKey: process.env['NAKAMA_SERVER_KEY'] ?? 'defaultkey',
      }),
      createSupportRoutes({
        sharedSecret: process.env['SUPPORT_MODERATION_SECRET'] ?? '',
        ...(process.env['SUPPORT_DISCORD_WEBHOOK_URL']
          ? { discordWebhookUrl: process.env['SUPPORT_DISCORD_WEBHOOK_URL'] }
          : {}),
      }),
      (app) => registerKindlerRoutes(app, { repo: kindlerRepo, engine: kindlerEngine, idGenerator: koydoIdGen }),
      (app) => registerSessionRoutes(app, {
        repo: kindlerRepo,
        engine: kindlerEngine,
        idGenerator: koydoIdGen,
        getEntryTier,
        onEntryCompleted,
      }),
      (app) => registerGuideRoutes(app, { charactersEngine, kindlerRepo }),
      (app) => registerParentDashboardRoutes(app, {
        generateId: () => koydoIdGen.generate(),
        now: () => Date.now(),
        log: koydoLog,
      }),
      (app) => registerSafetyRoutes(app, {
        generateId: () => koydoIdGen.generate(),
        now: () => Date.now(),
        log: koydoLog,
      }),
      (app) => registerWorldsRoutes(app, { worldsEngine, contentEngine, luminanceStore }),
      (app) => registerAdventuresRoutes(app, { adventuresEngine, worldsEngine }),
      (app) => registerQuizRoutes(app, { contentEngine }),
    ],
  });

  // 7. Network server wiring (connection manager, snapshot builder, codec)
  const {
    createConnectionManager,
    createSnapshotBuilder,
    createJsonCodec,
    createNetworkServer,
  } = await import('@loom/selvage');
  const {
    createEntityQueryAdapter,
    createComponentQueryAdapter,
    createSystemClock,
    createUuidGenerator,
  } = await import('@loom/loom-core');

  const clock = createSystemClock();
  const idGen = createUuidGenerator();

  // The PlayerEntityPort expected by ConnectionManager is a thin
  // interface (spawnPlayer(connId, worldId) => entityId).
  // We provide a stub that creates a bare entity — the full spawn
  // system needs spawn points and mesh data that come later.
  const playerEntities = {
    spawnPlayer: (connectionId: string, worldId: string): string => {
      const entityId = orchestrator.core.entities.spawn('player', worldId, { connectionId });
      logger.info({ connectionId, entityId }, 'Player entity spawned');
      return entityId;
    },
    despawnPlayer: (entityId: string): void => {
      orchestrator.core.entities.despawn(entityId as never, 'destroyed');
    },
  };

  const connectionManager = createConnectionManager({
    playerEntities,
    clock,
    idGenerator: idGen,
    logger,
    defaultWorldId: 'default',
  });

  const snapshotBuilder = createSnapshotBuilder({
    entityQuery: createEntityQueryAdapter(orchestrator.core.entities),
    componentQuery: createComponentQueryAdapter(orchestrator.core.entities.components),
  });

  const codec = createJsonCodec();

  const networkServer = createNetworkServer({
    transport,
    connections: connectionManager,
    snapshots: snapshotBuilder,
    codec,
    logger,
    serverId: `loom-${Date.now()}`,
    tickRateHz: env.tickRateHz,
  });

  // 8. gRPC Bridge Server (UE5 clients connect here on port 50051)
  const {
    createBridgeGrpcServer,
    createBridgeGrpcTransport,
    createBridgeWorldStateAdapter,
  } = await import('@loom/selvage');

  const bridgeLog = {
    info: (ctx: Readonly<Record<string, unknown>>, msg: string) => logger.info(ctx, msg),
    warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => logger.warn(ctx, msg),
    error: (ctx: Readonly<Record<string, unknown>>, msg: string) => logger.error(ctx, msg),
  };

  const bridgeGrpc = createBridgeGrpcServer({
    clock: { nowMicroseconds: () => clock.nowMicroseconds() },
    id: { generate: () => idGen.generate() },
    log: bridgeLog,
    config: {
      host: env.host,
      port: env.grpcPort,
    },
  });

  // World state adapter: converts BridgeService visual updates → gRPC messages
  const worldStateAdapter = createBridgeWorldStateAdapter({
    clock: { nowMicroseconds: () => clock.nowMicroseconds() },
  });
  bridgeGrpc.registerWorldStateProvider(worldStateAdapter.provider);

  // Wire the rendering fabric: BridgeService tick → worldStateAdapter → gRPC
  renderingFabric.wire({
    onStatePush: (updates) => worldStateAdapter.onStatePush(updates as never),
    onSpawn: (entityId, state) => worldStateAdapter.onEntitySpawn(entityId, {
      entityId,
      timestamp: clock.nowMicroseconds(),
      sequenceNumber: 0,
      delta: state as never,
    }),
    onDespawn: (entityId) => worldStateAdapter.onEntityDespawn(entityId),
  });
  logger.info({}, 'Rendering fabric wired: BridgeService → WorldStateAdapter → gRPC');

  // Input handler: decode FlatBuffers input, map clientId → entityId, write ECS component
  const { readPlayerInput } = await import('@loom/protocols-contracts');
  bridgeGrpc.registerInputHandler({
    onPlayerInput: (clientId, payload, sequenceNumber) => {
      const conn = orchestrator.connections.getConnection(clientId);
      if (!conn?.entityId) return;
      const input = readPlayerInput(payload);
      const actions = actionFlagsToNames(input.actionFlags);
      orchestrator.core.entities.components.set(conn.entityId, 'player-input', {
        moveDirection: { x: input.moveX, y: input.moveY, z: input.moveZ },
        lookDirection: yawPitchToLookVector(input.yaw, input.pitch),
        actions,
        sequenceNumber,
      });
    },
  });

  // Negotiate handler: connect player, spawn entity, seed components
  bridgeGrpc.registerNegotiateHandler({
    onNegotiate: (clientId, manifest) => {
      logger.info(
        { clientId, fabricId: manifest.fabricId, tier: manifest.currentTier },
        'UE5 client negotiated',
      );
      orchestrator.connections.connect({
        connectionId: clientId,
        playerId: `player-${clientId}`,
        displayName: `Player-${clientId.slice(0, 8)}`,
      });
      const entityId = orchestrator.core.entities.spawn('player', 'default');
      orchestrator.connections.markSpawned(clientId, entityId, 'default');
      orchestrator.core.entities.components.set(entityId, 'transform', {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });
      orchestrator.core.entities.components.set(entityId, 'movement', {
        speed: 0, maxSpeed: 3.5, isGrounded: true, movementMode: 'walking',
      });
      worldStreaming.updatePlayerPosition(clientId, 'default', 0, 0, 0);
      logger.info({ clientId, entityId: entityId as string }, 'Player entity spawned for UE5 client');
    },
  });

  // Disconnect handler: despawn entity, clean up connection
  bridgeGrpc.registerDisconnectHandler({
    onDisconnect: (clientId) => {
      const conn = orchestrator.connections.getConnection(clientId);
      if (conn?.entityId) {
        orchestrator.core.entities.despawn(conn.entityId, 'destroyed');
      }
      orchestrator.connections.disconnect(clientId);
      worldStreaming.removePlayer(clientId);
      logger.info({ clientId }, 'UE5 client disconnected, entity despawned');
    },
  });

  // gRPC transport: binds to port 50051, routes proto RPCs to bridgeGrpc
  const bridgeTransport = await createBridgeGrpcTransport({
    bridge: bridgeGrpc,
    log: bridgeLog,
    config: {
      host: env.host,
      port: env.grpcPort,
      tickIntervalMs: Math.round(1000 / env.tickRateHz),
    },
  });

  logger.info({ grpcPort: env.grpcPort }, 'Bridge gRPC server assembled (UE5 ↔ Loom)');

  // 9. World Streaming — Silfen Weave chunk-based interest management
  const { createWorldStreamingManager } = await import('@loom/silfen-weave');
  const worldStreaming = createWorldStreamingManager();

  // On each game tick, compute chunk load/unload commands → bridge WorldCommand RPC
  const streamingTickMs = Math.round(1000 / env.tickRateHz);
  const streamingInterval = setInterval(() => {
    const commands = worldStreaming.computeCommands();
    for (const cmd of commands) {
      if (cmd.kind === 'load') {
        bridgeGrpc.worldCommand({
          commandType: 'preload',
          worldId: cmd.chunk.worldId,
          assetManifest: [`chunk:${cmd.chunk.cx},${cmd.chunk.cy},${cmd.chunk.cz}`],
        });
      } else {
        bridgeGrpc.worldCommand({
          commandType: 'unload',
          worldId: cmd.chunk.worldId,
        });
      }
    }
  }, streamingTickMs);
  logger.info({}, 'World streaming manager wired (Silfen Weave → Bridge WorldCommand)');

  // 10. Inspector — Health probes for real metrics
  const { createHealthCheckEngine } = await import('@loom/inspector');
  const healthEngine = createHealthCheckEngine({
    clock: { nowMicroseconds: () => Number(clock.nowMicroseconds()) },
    maxHistory: 100,
  });

  healthEngine.registerProbe({
    name: 'bridge-grpc',
    fabric: 'selvage',
    evaluate: () => {
      const health = bridgeGrpc.healthCheck();
      return {
        status: health.healthy ? 'healthy' : 'unhealthy',
        message: `clients=${health.connectedClients} streams=${health.activeStreams} rtt=${Math.round(health.avgRoundTripMs)}ms`,
        durationMicroseconds: 0,
      };
    },
  });

  healthEngine.registerProbe({
    name: 'ecs-entities',
    fabric: 'loom-core',
    evaluate: () => {
      const count = orchestrator.core.entities.count();
      return {
        status: count < 10_000 ? 'healthy' : count < 50_000 ? 'degraded' : 'unhealthy',
        message: `entities=${count}`,
        durationMicroseconds: 0,
      };
    },
  });

  healthEngine.registerProbe({
    name: 'world-streaming',
    fabric: 'silfen-weave',
    evaluate: () => {
      const players = worldStreaming.playerCount();
      const chunks = worldStreaming.totalLoadedChunks();
      return {
        status: 'healthy',
        message: `players=${players} loadedChunks=${chunks}`,
        durationMicroseconds: 0,
      };
    },
  });

  logger.info({}, 'Inspector health engine wired with 3 probes');

  // 11. Start
  const address = await transport.boot();
  const grpcAddress = await bridgeTransport.start();
  networkServer.start();
  orchestrator.start();

  logger.info({ address, grpcAddress }, 'Loom server is live');

  // 12. Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info({}, 'Shutdown signal received');
    clearInterval(streamingInterval);
    orchestrator.stop();
    networkServer.stop();
    await bridgeTransport.stop();
    await transport.teardown();
    await cache.close();
    await pgPool.end();
    logger.info({}, 'Loom server stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

// ─── Wirable Rendering Fabric ───────────────────────────────────
// Starts as no-op. Once wire() is called, routes BridgeService
// visual updates through the worldStateAdapter → gRPC pipeline.

// ─── Player Input Helpers ────────────────────────────────────────

const ACTION_FLAG_MAP: ReadonlyArray<readonly [number, string]> = [
  [1 << 0, 'jump'],
  [1 << 1, 'sprint'],
  [1 << 2, 'interact'],
  [1 << 3, 'attack'],
  [1 << 4, 'defend'],
  [1 << 5, 'dodge'],
];

function actionFlagsToNames(flags: number): string[] {
  const names: string[] = [];
  for (const [bit, name] of ACTION_FLAG_MAP) {
    if (flags & bit) names.push(name);
  }
  return names;
}

function yawPitchToLookVector(yaw: number, pitch: number): { x: number; y: number; z: number } {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { x: cy * cp, y: sy * cp, z: sp };
}

// ─── Wirable Rendering Fabric ───────────────────────────────────

interface RenderingFabricWiring {
  readonly onStatePush: (updates: ReadonlyArray<Record<string, unknown>>) => void;
  readonly onSpawn: (entityId: string, state: Record<string, unknown>) => void;
  readonly onDespawn: (entityId: string) => void;
}

interface WirableRenderingFabric {
  readonly pushStateSnapshot: (updates: ReadonlyArray<Record<string, unknown>>) => void;
  readonly spawnVisual: (entityId: string, state: Record<string, unknown>) => Promise<void>;
  readonly despawnVisual: (entityId: string) => Promise<void>;
  readonly wire: (t: RenderingFabricWiring) => void;
}

function createWirableRenderingFabric(): WirableRenderingFabric {
  let target: RenderingFabricWiring | undefined;

  return {
    pushStateSnapshot: (updates) => {
      if (target) target.onStatePush(updates);
    },
    spawnVisual: async (entityId, state) => {
      if (target) target.onSpawn(entityId, state);
    },
    despawnVisual: async (entityId) => {
      if (target) target.onDespawn(entityId);
    },
    wire: (t) => {
      target = t;
    },
  };
}

// ─── Entry Point ────────────────────────────────────────────────

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
