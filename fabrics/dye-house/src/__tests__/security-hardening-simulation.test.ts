import { describe, it, expect, vi } from 'vitest';
import { createSecurityHardeningEngine } from '../security-hardening.js';
import type {
  ApiKeyRecord,
  ApiKeyScope,
  SchemaDefinition,
  SecurityHardeningDeps,
  VulnFinding,
  VulnScanResult,
} from '../security-hardening.js';

function makeClock(start = 10_000n) {
  let nowValue = start;
  return {
    now: () => nowValue,
    setNow: (value: bigint) => {
      nowValue = value;
    },
    advance: (delta: bigint) => {
      nowValue += delta;
    },
  };
}

function makeIdPort(prefix = 'sec') {
  let index = 0;
  return {
    next: () => `${prefix}-${++index}`,
  };
}

function makeDeps() {
  const clock = makeClock();
  const revokedTokens = new Set<string>();
  const refreshTokens = new Map<string, { playerId: string; expiresAt: bigint }>();
  const apiKeysByHash = new Map<string, ApiKeyRecord>();
  const revokedKeyIds = new Set<string>();
  const scanResults = new Map<string, VulnScanResult>();

  const log = {
    info: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    warn: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    error: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
  };

  const deps: SecurityHardeningDeps = {
    clock,
    id: makeIdPort(),
    log,
    events: { emit: () => undefined },
    tokenStore: {
      storeRefreshToken: vi.fn(async (tokenId: string, playerId: string, expiresAt: bigint) => {
        refreshTokens.set(tokenId, { playerId, expiresAt });
      }),
      revokeRefreshToken: vi.fn(async (tokenId: string) => {
        revokedTokens.add(tokenId);
      }),
      revokeAllForPlayer: vi.fn(async (playerId: string) => {
        for (const [tokenId, record] of refreshTokens.entries()) {
          if (record.playerId === playerId) revokedTokens.add(tokenId);
        }
      }),
      isRevoked: vi.fn(async (tokenId: string) => revokedTokens.has(tokenId)),
    },
    apiKeyStore: {
      store: vi.fn(async (key: ApiKeyRecord) => {
        apiKeysByHash.set(key.keyHash, key);
      }),
      lookup: vi.fn(async (keyHash: string) => {
        const key = apiKeysByHash.get(keyHash);
        if (!key) return undefined;
        if (revokedKeyIds.has(key.keyId)) return { ...key, revoked: true };
        return key;
      }),
      listForClient: vi.fn(async (clientId: string) => {
        return [...apiKeysByHash.values()].filter((k) => k.clientId === clientId);
      }),
      revoke: vi.fn(async (keyId: string) => {
        revokedKeyIds.add(keyId);
      }),
    },
    vulnScanner: {
      runScan: vi.fn(async (scanType) => {
        const result = scanResults.get(scanType);
        if (result) return result;
        return {
          scanId: `scan-${scanType}`,
          scanType,
          scannedAt: clock.now(),
          findings: [],
          passesGate: true,
        };
      }),
      getLastScan: vi.fn(async (scanType) => scanResults.get(scanType)),
    },
  };

  return { deps, clock, log, apiKeysByHash, refreshTokens, revokedTokens, scanResults };
}

function makeScan(scanType: 'dependency' | 'container' | 'sast' | 'dast' | 'secret-leak', findings: readonly VulnFinding[], passesGate: boolean): VulnScanResult {
  return {
    scanId: `scan-${scanType}`,
    scanType,
    scannedAt: 20_000n,
    findings,
    passesGate,
  };
}

describe('Security Hardening Simulation', () => {
  it('registers schemas and validates unknown schema names as failures', () => {
    const { deps } = makeDeps();
    const engine = createSecurityHardeningEngine(deps);

    const unknown = engine.validateMessage('missing-schema', { foo: 'bar' });
    expect(unknown.valid).toBe(false);
    expect(unknown.errors[0]?.message).toContain('Unknown schema');

    const schema: SchemaDefinition = {
      name: 'chat-message',
      version: 1,
      validate: (value: unknown) => {
        if (typeof value === 'string') {
          return { valid: true, errors: [], sanitized: value.trim() };
        }
        return {
          valid: false,
          errors: [{ path: '$', message: 'must be string', expected: 'string', received: typeof value }],
          sanitized: undefined,
        };
      },
    };

    engine.registerSchema(schema);
    const ok = engine.validateMessage('chat-message', '  hi  ');

    expect(ok.valid).toBe(true);
    expect(ok.sanitized).toBe('hi');
    expect(engine.getStats().schemasRegistered).toBe(1);
    expect(engine.getStats().validationsFailed).toBe(1);
  });

  it('generates CSP header with report-uri when configured', () => {
    const { deps } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      csp: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.example'],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        frameSrc: ["'none'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        reportUri: 'https://csp.example/report',
      },
    });

    const header = engine.generateCspHeader();

    expect(header).toContain("default-src 'self'");
    expect(header).toContain('script-src \'self\' https://cdn.example');
    expect(header).toContain('report-uri https://csp.example/report');
  });

  it('issues and refreshes token pairs while revoking old refresh tokens', async () => {
    const { deps, refreshTokens, revokedTokens } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      jwt: { accessTokenTtlMs: 1_000, refreshTokenTtlMs: 5_000, maxRefreshCount: 5, issuer: 'i', audience: 'a' },
    });

    const pair = await engine.issueTokenPair('player-1');
    expect(pair.accessExpiresAt).toBe(11_000n);
    expect(refreshTokens.has(pair.refreshTokenId)).toBe(true);

    const rotated = await engine.refreshTokens(pair.refreshTokenId, 'player-1');

    expect(rotated.oldRefreshRevoked).toBe(true);
    expect(revokedTokens.has(pair.refreshTokenId)).toBe(true);
    expect(engine.getStats().tokensRefreshed).toBe(1);
  });

  it('throws when refreshing an already revoked token', async () => {
    const { deps, revokedTokens } = makeDeps();
    const engine = createSecurityHardeningEngine(deps);
    revokedTokens.add('revoked-1');

    await expect(engine.refreshTokens('revoked-1', 'player-2')).rejects.toThrow('Refresh token revoked');
  });

  it('enforces API key max per client and scope validation', async () => {
    const { deps, clock } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      apiKey: { maxKeysPerClient: 1, defaultTtlMs: 100, rotationWarningMs: 20 },
    });

    const key = await engine.createApiKey('client-a', ['read:world']);
    expect(key.clientId).toBe('client-a');

    await expect(engine.createApiKey('client-a', ['write:world'])).rejects.toThrow('already has 1 keys');

    expect(await engine.validateApiKey(key.keyHash, 'read:world')).toBe(true);
    expect(await engine.validateApiKey(key.keyHash, 'write:world')).toBe(false);

    clock.advance(200n);
    expect(await engine.validateApiKey(key.keyHash, 'read:world')).toBe(false);
  });

  it('accepts admin API keys for all required scopes', async () => {
    const { deps } = makeDeps();
    const engine = createSecurityHardeningEngine(deps);

    const key = await engine.createApiKey('client-admin', ['admin:all']);

    expect(await engine.validateApiKey(key.keyHash, 'write:economy')).toBe(true);
  });

  it('rotates API key by revoking old id and preserving old scopes when found', async () => {
    const { deps } = makeDeps();
    const engine = createSecurityHardeningEngine(deps);

    const key = await engine.createApiKey('client-r', ['write:economy']);
    const rotated = await engine.rotateApiKey(key.keyId, 'client-r');

    expect(rotated.keyId).not.toBe(key.keyId);
    expect(rotated.scopes).toEqual(['write:economy']);
    expect(engine.getStats().apiKeysRotated).toBe(1);
  });

  it('detects attack state and load shedding with low deterministic thresholds', () => {
    const { deps } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      ddos: {
        edgeRateLimit: 2,
        internalBackpressureThreshold: 0.5,
        loadShedPercentage: 0.25,
        requestWindowMs: 60_000,
        maxUniqueIpsPerWindow: 2,
      },
    });

    engine.recordRequest('10.0.0.1');
    engine.recordRequest('10.0.0.1');
    engine.recordRequest('10.0.0.1');
    engine.recordRequest('10.0.0.2');
    engine.recordRequest('10.0.0.3');

    expect(engine.isUnderAttack()).toBe(true);
    expect(engine.shouldShedLoad()).toBe(true);

    const metrics = engine.getDdosMetrics();
    expect(metrics.uniqueIps).toBe(3);
    expect(metrics.blockedRequests).toBe(1);
    expect(metrics.backpressure.shedding).toBe(true);
    expect(engine.getStats().ddosEventsDetected).toBe(1);
  });

  it('runs vulnerability scans and updates passed count only for passing results', async () => {
    const { deps, scanResults } = makeDeps();
    const engine = createSecurityHardeningEngine(deps);

    scanResults.set('dependency', makeScan('dependency', [], true));
    scanResults.set('sast', makeScan('sast', [{
      id: 'f1', severity: 'high', package: 'pkg-a', version: '1.0.0', fixedIn: undefined, description: 'issue', cve: 'CVE-1',
    }], false));

    await engine.runVulnScan('dependency');
    await engine.runVulnScan('sast');

    const stats = engine.getStats();
    expect(stats.vulnScansRun).toBe(2);
    expect(stats.vulnScansPassed).toBe(1);
  });

  it('fails security gate if required scan is missing', async () => {
    const { deps } = makeDeps();
    const engine = createSecurityHardeningEngine(deps);

    await expect(engine.passesSecurityGate()).resolves.toBe(false);
  });

  it('fails security gate on high findings when blockOnHigh is true', async () => {
    const { deps, scanResults } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      vulnScan: { blockOnCritical: true, blockOnHigh: true, maxAcceptableFindings: 0 },
    });

    scanResults.set('dependency', makeScan('dependency', [], true));
    scanResults.set('container', makeScan('container', [], true));
    scanResults.set('sast', makeScan('sast', [], true));
    scanResults.set('secret-leak', makeScan('secret-leak', [{
      id: 'high-1', severity: 'high', package: 'pkg-b', version: '2.0.0', fixedIn: '2.0.1', description: 'high issue', cve: undefined,
    }], true));

    await expect(engine.passesSecurityGate()).resolves.toBe(false);
  });

  it('passes security gate when all required scans exist and have no blocked severities', async () => {
    const { deps, scanResults } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      vulnScan: { blockOnCritical: true, blockOnHigh: false, maxAcceptableFindings: 10 },
    });

    const emptyFindings: readonly VulnFinding[] = [];
    scanResults.set('dependency', makeScan('dependency', emptyFindings, true));
    scanResults.set('container', makeScan('container', emptyFindings, true));
    scanResults.set('sast', makeScan('sast', emptyFindings, true));
    scanResults.set('secret-leak', makeScan('secret-leak', [{
      id: 'low-1', severity: 'low', package: 'pkg-c', version: '3.0.0', fixedIn: undefined, description: 'low issue', cve: undefined,
    }], true));

    await expect(engine.passesSecurityGate()).resolves.toBe(true);
  });

  it('resets DDoS counters when request window expires', () => {
    const { deps, clock } = makeDeps();
    const engine = createSecurityHardeningEngine(deps, {
      ddos: {
        edgeRateLimit: 1,
        internalBackpressureThreshold: 0.1,
        loadShedPercentage: 0.5,
        requestWindowMs: 100,
        maxUniqueIpsPerWindow: 2,
      },
    });

    engine.recordRequest('1.1.1.1');
    expect(engine.getDdosMetrics().requestsPerSecond).toBeGreaterThan(0);

    clock.advance(200n);
    const metrics = engine.getDdosMetrics();

    expect(metrics.requestsPerSecond).toBe(0);
    expect(metrics.uniqueIps).toBe(0);
    expect(metrics.blockedRequests).toBe(0);
  });
});
