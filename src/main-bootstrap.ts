import { DEFAULT_BOOT_WORLD_ID } from './bootstrap-world.js';

export interface LoomEnv {
  readonly host: string;
  readonly port: number;
  readonly tickRateHz: number;
  readonly defaultWorldId: string;
  readonly bootWorldIds: ReadonlyArray<string>;
  readonly grpc: {
    readonly host: string;
    readonly port: number;
  };
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

type EnvSource = Readonly<Record<string, string | undefined>>;

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseWorldId(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : fallback;
}

export function parseBootWorldIds(
  rawValue: string | undefined,
  defaultWorldId: string = DEFAULT_BOOT_WORLD_ID,
): ReadonlyArray<string> {
  const configuredWorldIds = (rawValue ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const uniqueWorldIds = new Set<string>([defaultWorldId, ...configuredWorldIds]);
  return [...uniqueWorldIds];
}

export function loadEnv(source: EnvSource = process.env): LoomEnv {
  const defaultWorldId = parseWorldId(source['LOOM_DEFAULT_WORLD_ID'], DEFAULT_BOOT_WORLD_ID);

  return {
    host: source['LOOM_HOST'] ?? '0.0.0.0',
    port: parseInteger(source['LOOM_PORT'], 8080),
    tickRateHz: parseInteger(source['LOOM_TICK_RATE'], 20),
    defaultWorldId,
    bootWorldIds: parseBootWorldIds(source['LOOM_BOOT_WORLD_IDS'], defaultWorldId),
    grpc: {
      host: source['LOOM_GRPC_HOST'] ?? '0.0.0.0',
      port: parseInteger(source['LOOM_GRPC_PORT'], 50051),
    },
    pg: {
      host: source['PG_HOST'] ?? '127.0.0.1',
      port: parseInteger(source['PG_PORT'], 5432),
      database: source['PG_DATABASE'] ?? 'loom',
      user: source['PG_USER'] ?? 'loom',
      password: source['PG_PASSWORD'] ?? source['PGPASSWORD'] ?? source['LOOM_PG_PASSWORD'] ?? '',
    },
    redis: {
      host: source['REDIS_HOST'] ?? '127.0.0.1',
      port: parseInteger(source['REDIS_PORT'], 6379),
      password: source['REDIS_PASSWORD'] ?? undefined,
    },
  };
}
