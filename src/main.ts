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
  const orchestrator = createGameOrchestrator({
    renderingFabric: createNoOpRenderingFabric(),
    coreConfig: {
      logger,
      tickRateHz: env.tickRateHz,
    },
  });
  logger.info({}, 'Game orchestrator assembled');

  // 6. Selvage — Fastify WebSocket transport
  const { createFastifyTransport } = await import('@loom/selvage');
  const transport = createFastifyTransport({ host: env.host, port: env.port });

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
  const { createBridgeGrpcServer } = await import('@loom/selvage');
  const bridgeGrpc = createBridgeGrpcServer({
    clock: { nowMicroseconds: () => clock.nowMicroseconds() },
    id: { generate: () => idGen.generate() },
    log: {
      info: (ctx, msg) => logger.info(ctx, msg),
      warn: (ctx, msg) => logger.warn(ctx, msg),
      error: (ctx, msg) => logger.error(ctx, msg),
    },
    config: {
      host: env.host,
      port: env.grpcPort,
    },
  });

  // Register world state provider so bridge ticks push entity state to UE5
  bridgeGrpc.registerInputHandler({
    onPlayerInput: (clientId, payload, sequenceNumber) => {
      logger.info({ clientId, sequenceNumber }, 'UE5 player input received');
    },
  });

  bridgeGrpc.registerNegotiateHandler({
    onNegotiate: (clientId, manifest) => {
      logger.info(
        { clientId, fabricId: manifest.fabricId, tier: manifest.currentTier },
        'UE5 client negotiated',
      );
    },
  });

  bridgeGrpc.registerDisconnectHandler({
    onDisconnect: (clientId) => {
      logger.info({ clientId }, 'UE5 client disconnected');
    },
  });

  logger.info({ grpcPort: env.grpcPort }, 'Bridge gRPC server assembled (UE5 ↔ Loom)');

  // 9. Start
  const address = await transport.boot();
  networkServer.start();
  orchestrator.start();

  logger.info({ address, grpcPort: env.grpcPort }, 'Loom server is live');

  // 10. Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info({}, 'Shutdown signal received');
    orchestrator.stop();
    networkServer.stop();
    await transport.teardown();
    await cache.close();
    await pgPool.end();
    logger.info({}, 'Loom server stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

// ─── No-Op Rendering Fabric (server-only, no UE5) ──────────────

function createNoOpRenderingFabric() {
  return {
    pushStateSnapshot: () => {},
    spawnVisual: async () => {},
    despawnVisual: async () => {},
  };
}

// ─── Entry Point ────────────────────────────────────────────────

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
