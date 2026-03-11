/**
 * PlayerConnectOrchestrator — Full connect lifecycle tests.
 */

import { describe, it, expect } from 'vitest';
import { createPlayerConnectOrchestrator } from '../player-connect-orchestrator.js';
import type {
  PlayerConnectDeps,
  ConnectTokenResult,
  ConnectIdentityInfo,
  PlayerConnectRequest,
} from '../player-connect-orchestrator.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

// ── Mock Builder ────────────────────────────────────────────────

function buildDeps(overrides?: Partial<PlayerConnectDeps>): PlayerConnectDeps {
  let seq = 0;
  return {
    token: overrides?.token ?? {
      validate: (): ConnectTokenResult => ({
        valid: true,
        dynastyId: 'dynasty-alice',
        reason: null,
      }),
    },
    identity: overrides?.identity ?? {
      resolve: (): ConnectIdentityInfo => ({
        dynastyId: 'dynasty-alice',
        displayName: 'Alice',
        homeWorldId: 'earth',
        status: 'active',
      }),
    },
    connections: overrides?.connections ?? {
      connect: () => true,
      markSpawned: () => true,
      disconnect: () => true,
    },
    spawns: overrides?.spawns ?? {
      spawnPlayer: () => {
        seq += 1;
        return { ok: true as const, entityId: eid('player-' + String(seq)) };
      },
    },
    spawnPoints: overrides?.spawnPoints ?? {
      findSpawnPoint: () => 'sp-earth-1',
    },
  };
}

function defaultRequest(): PlayerConnectRequest {
  return {
    connectionId: 'conn-1',
    tokenId: 'tok-abc',
    meshContentHash: 'mesh-alice',
    assetName: 'HumanFemale',
  };
}

// ── Happy Path ──────────────────────────────────────────────────

describe('PlayerConnectOrchestrator — happy path', () => {
  it('connects player through full flow', () => {
    const deps = buildDeps();
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dynastyId).toBe('dynasty-alice');
    expect(result.value.displayName).toBe('Alice');
    expect(result.value.worldId).toBe('earth');
    expect(result.value.entityId).toBeDefined();
  });

  it('passes spawn params from request', () => {
    const spawnCalls: Array<{ playerId: string; mesh: string }> = [];
    const deps = buildDeps({
      spawns: {
        spawnPlayer: (p) => {
          spawnCalls.push({ playerId: p.playerId, mesh: p.meshContentHash });
          return { ok: true, entityId: eid('e-1') };
        },
      },
    });

    const orch = createPlayerConnectOrchestrator(deps);
    orch.connect(defaultRequest());

    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]?.playerId).toBe('dynasty-alice');
    expect(spawnCalls[0]?.mesh).toBe('mesh-alice');
  });
});

// ── Token Failures ──────────────────────────────────────────────

describe('PlayerConnectOrchestrator — token failures', () => {
  it('rejects invalid token', () => {
    const deps = buildDeps({
      token: {
        validate: () => ({ valid: false, dynastyId: null, reason: 'bad-sig' }),
      },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('token_invalid');
  });

  it('rejects expired token', () => {
    const deps = buildDeps({
      token: {
        validate: () => ({ valid: false, dynastyId: null, reason: 'expired' }),
      },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('token_expired');
  });
});

// ── Identity Failures ───────────────────────────────────────────

describe('PlayerConnectOrchestrator — identity failures', () => {
  it('rejects unknown dynasty', () => {
    const deps = buildDeps({
      identity: { resolve: () => undefined },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('dynasty_not_found');
  });

  it('rejects dormant dynasty', () => {
    const deps = buildDeps({
      identity: {
        resolve: () => ({
          dynastyId: 'dynasty-alice',
          displayName: 'Alice',
          homeWorldId: 'earth',
          status: 'dormant',
        }),
      },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('dynasty_inactive');
  });
});

// ── Spawn Failures ──────────────────────────────────────────────

describe('PlayerConnectOrchestrator — spawn failures', () => {
  it('rejects when no spawn point found', () => {
    const deps = buildDeps({
      spawnPoints: { findSpawnPoint: () => undefined },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('no_spawn_point');
  });

  it('rejects when spawn system fails', () => {
    const deps = buildDeps({
      spawns: {
        spawnPlayer: () => ({ ok: false as const, reason: 'spawn-point-full' }),
      },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    const result = orch.connect(defaultRequest());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('spawn_failed');
  });

  it('disconnects on spawn failure', () => {
    let disconnected = false;
    const deps = buildDeps({
      connections: {
        connect: () => true,
        markSpawned: () => true,
        disconnect: () => {
          disconnected = true;
          return true;
        },
      },
      spawns: {
        spawnPlayer: () => ({ ok: false as const, reason: 'full' }),
      },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    orch.connect(defaultRequest());

    expect(disconnected).toBe(true);
  });
});

// ── Disconnect ──────────────────────────────────────────────────

describe('PlayerConnectOrchestrator — disconnect', () => {
  it('delegates disconnect to connection port', () => {
    const disconnected: string[] = [];
    const deps = buildDeps({
      connections: {
        connect: () => true,
        markSpawned: () => true,
        disconnect: (cid) => {
          disconnected.push(cid);
          return true;
        },
      },
    });
    const orch = createPlayerConnectOrchestrator(deps);
    orch.disconnect('conn-1');

    expect(disconnected).toEqual(['conn-1']);
  });
});
