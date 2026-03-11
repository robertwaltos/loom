/**
 * PlayerConnectOrchestrator — Full player connection lifecycle.
 *
 * Sequences the vertical slice from network arrival to game world:
 *   1. Validate auth token (→ dye-house)
 *   2. Resolve dynasty identity (→ nakama-fabric)
 *   3. Register connection (→ player-connection-system)
 *   4. Spawn player entity (→ spawn-system)
 *   5. Mark connection as spawned
 *
 * All external dependencies expressed as port interfaces to preserve
 * hexagonal boundaries. No cross-fabric imports.
 */

import type { EntityId } from '@loom/entities-contracts';

// ── Port Interfaces ─────────────────────────────────────────────

export interface ConnectTokenPort {
  readonly validate: (tokenId: string) => ConnectTokenResult;
}

export interface ConnectTokenResult {
  readonly valid: boolean;
  readonly dynastyId: string | null;
  readonly reason: string | null;
}

export interface ConnectIdentityPort {
  readonly resolve: (dynastyId: string) => ConnectIdentityInfo | undefined;
}

export interface ConnectIdentityInfo {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly homeWorldId: string;
  readonly status: string;
}

export interface ConnectPlayerPort {
  readonly connect: (params: ConnectPlayerInput) => boolean;
  readonly markSpawned: (connectionId: string, entityId: EntityId, worldId: string) => boolean;
  readonly disconnect: (connectionId: string) => boolean;
}

export interface ConnectPlayerInput {
  readonly connectionId: string;
  readonly playerId: string;
  readonly displayName: string;
}

export interface ConnectSpawnPort {
  readonly spawnPlayer: (params: ConnectSpawnInput) => ConnectSpawnResult;
}

export interface ConnectSpawnInput {
  readonly spawnPointEntityId: string;
  readonly playerId: string;
  readonly displayName: string;
  readonly meshContentHash: string;
  readonly assetName: string;
}

export type ConnectSpawnResult =
  | { readonly ok: true; readonly entityId: EntityId }
  | { readonly ok: false; readonly reason: string };

export interface ConnectSpawnPointPort {
  readonly findSpawnPoint: (worldId: string) => string | undefined;
}

export interface ConnectLifecyclePort {
  readonly onConnect?: (dynastyId: string, worldId: string) => void;
  readonly onDisconnect?: (connectionId: string) => void;
}

// ── Deps ────────────────────────────────────────────────────────

export interface PlayerConnectDeps {
  readonly token: ConnectTokenPort;
  readonly identity: ConnectIdentityPort;
  readonly connections: ConnectPlayerPort;
  readonly spawns: ConnectSpawnPort;
  readonly spawnPoints: ConnectSpawnPointPort;
  readonly lifecycle?: ConnectLifecyclePort;
}

// ── Request/Response ────────────────────────────────────────────

export interface PlayerConnectRequest {
  readonly connectionId: string;
  readonly tokenId: string;
  readonly meshContentHash: string;
  readonly assetName: string;
}

export interface PlayerConnectSuccess {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly entityId: EntityId;
  readonly worldId: string;
}

export type PlayerConnectErrorCode =
  | 'token_invalid'
  | 'token_expired'
  | 'dynasty_not_found'
  | 'dynasty_inactive'
  | 'already_connected'
  | 'no_spawn_point'
  | 'spawn_failed';

export interface PlayerConnectError {
  readonly code: PlayerConnectErrorCode;
  readonly message: string;
}

export type PlayerConnectResult =
  | { readonly ok: true; readonly value: PlayerConnectSuccess }
  | { readonly ok: false; readonly error: PlayerConnectError };

// ── Public Interface ────────────────────────────────────────────

export interface PlayerConnectOrchestrator {
  readonly connect: (req: PlayerConnectRequest) => PlayerConnectResult;
  readonly disconnect: (connectionId: string) => boolean;
}

// ── Factory ─────────────────────────────────────────────────────

function createPlayerConnectOrchestrator(deps: PlayerConnectDeps): PlayerConnectOrchestrator {
  return {
    connect: (req) => executeConnect(deps, req),
    disconnect: (cid) => executeDisconnect(deps, cid),
  };
}

function executeDisconnect(deps: PlayerConnectDeps, connectionId: string): boolean {
  const result = deps.connections.disconnect(connectionId);
  if (result && deps.lifecycle?.onDisconnect !== undefined) {
    deps.lifecycle.onDisconnect(connectionId);
  }
  return result;
}

// ── Connect Flow ────────────────────────────────────────────────

function executeConnect(deps: PlayerConnectDeps, req: PlayerConnectRequest): PlayerConnectResult {
  const tokenResult = validateToken(deps, req.tokenId);
  if (!tokenResult.ok) return tokenResult;

  const identityResult = resolveIdentity(deps, tokenResult.dynastyId);
  if (!identityResult.ok) return identityResult;

  return spawnAndRegister(deps, req, identityResult.identity);
}

// ── Step 1: Token Validation ────────────────────────────────────

interface TokenSuccess {
  readonly ok: true;
  readonly dynastyId: string;
}

function validateToken(
  deps: PlayerConnectDeps,
  tokenId: string,
): TokenSuccess | { readonly ok: false; readonly error: PlayerConnectError } {
  const result = deps.token.validate(tokenId);

  if (!result.valid || result.dynastyId === null) {
    const code = resolveTokenErrorCode(result.reason);
    return { ok: false, error: { code, message: result.reason ?? 'Invalid token' } };
  }

  return { ok: true, dynastyId: result.dynastyId };
}

function resolveTokenErrorCode(reason: string | null): PlayerConnectErrorCode {
  if (reason === 'expired') return 'token_expired';
  return 'token_invalid';
}

// ── Step 2: Identity Resolution ─────────────────────────────────

interface IdentitySuccess {
  readonly ok: true;
  readonly identity: ConnectIdentityInfo;
}

function resolveIdentity(
  deps: PlayerConnectDeps,
  dynastyId: string,
): IdentitySuccess | { readonly ok: false; readonly error: PlayerConnectError } {
  const info = deps.identity.resolve(dynastyId);

  if (info === undefined) {
    return {
      ok: false,
      error: { code: 'dynasty_not_found', message: 'Dynasty ' + dynastyId + ' not found' },
    };
  }

  if (info.status !== 'active') {
    return {
      ok: false,
      error: { code: 'dynasty_inactive', message: 'Dynasty ' + dynastyId + ' is ' + info.status },
    };
  }

  return { ok: true, identity: info };
}

// ── Step 3: Spawn + Register ────────────────────────────────────

function spawnAndRegister(
  deps: PlayerConnectDeps,
  req: PlayerConnectRequest,
  identity: ConnectIdentityInfo,
): PlayerConnectResult {
  const connected = deps.connections.connect({
    connectionId: req.connectionId,
    playerId: identity.dynastyId,
    displayName: identity.displayName,
  });

  if (!connected) {
    return {
      ok: false,
      error: { code: 'already_connected', message: 'Connection already exists' },
    };
  }

  return attemptSpawn(deps, req, identity);
}

function attemptSpawn(
  deps: PlayerConnectDeps,
  req: PlayerConnectRequest,
  identity: ConnectIdentityInfo,
): PlayerConnectResult {
  const spawnPointId = deps.spawnPoints.findSpawnPoint(identity.homeWorldId);
  if (spawnPointId === undefined) {
    deps.connections.disconnect(req.connectionId);
    return {
      ok: false,
      error: { code: 'no_spawn_point', message: 'No spawn point in ' + identity.homeWorldId },
    };
  }

  return finalizeSpawn(deps, req, identity, spawnPointId);
}

function finalizeSpawn(
  deps: PlayerConnectDeps,
  req: PlayerConnectRequest,
  identity: ConnectIdentityInfo,
  spawnPointId: string,
): PlayerConnectResult {
  const spawnResult = deps.spawns.spawnPlayer({
    spawnPointEntityId: spawnPointId,
    playerId: identity.dynastyId,
    displayName: identity.displayName,
    meshContentHash: req.meshContentHash,
    assetName: req.assetName,
  });

  if (!spawnResult.ok) {
    deps.connections.disconnect(req.connectionId);
    return { ok: false, error: { code: 'spawn_failed', message: spawnResult.reason } };
  }

  deps.connections.markSpawned(req.connectionId, spawnResult.entityId, identity.homeWorldId);
  notifyLifecycleConnect(deps, identity.dynastyId, identity.homeWorldId);
  return buildSuccess(identity, spawnResult.entityId);
}

function notifyLifecycleConnect(deps: PlayerConnectDeps, dynastyId: string, worldId: string): void {
  if (deps.lifecycle?.onConnect !== undefined) {
    deps.lifecycle.onConnect(dynastyId, worldId);
  }
}

function buildSuccess(identity: ConnectIdentityInfo, entityId: EntityId): PlayerConnectResult {
  return {
    ok: true,
    value: {
      dynastyId: identity.dynastyId,
      displayName: identity.displayName,
      entityId,
      worldId: identity.homeWorldId,
    },
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createPlayerConnectOrchestrator };
