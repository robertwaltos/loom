/**
 * Security Hardening Engine — Production-grade defense-in-depth.
 *
 * Orchestrates multiple security layers for public launch readiness:
 *   - Schema validation at every message boundary (Zod-style)
 *   - Content Security Policy (CSP) header generation
 *   - DDoS protection with edge + internal backpressure
 *   - JWT lifecycle: short-lived access + refresh rotation + revocation
 *   - API key management: scoped keys, rotation schedules, usage tracking
 *   - Vulnerability scan tracking and gate enforcement
 *
 * "The Dye House seals every edge. No thread enters un-checked."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface HardeningClockPort {
  readonly now: () => bigint;
}

export interface HardeningIdPort {
  readonly next: () => string;
}

export interface HardeningLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface HardeningEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface TokenStorePort {
  readonly storeRefreshToken: (tokenId: string, playerId: string, expiresAt: bigint) => Promise<void>;
  readonly revokeRefreshToken: (tokenId: string) => Promise<void>;
  readonly revokeAllForPlayer: (playerId: string) => Promise<void>;
  readonly isRevoked: (tokenId: string) => Promise<boolean>;
}

export interface ApiKeyStorePort {
  readonly store: (key: ApiKeyRecord) => Promise<void>;
  readonly lookup: (keyHash: string) => Promise<ApiKeyRecord | undefined>;
  readonly listForClient: (clientId: string) => Promise<readonly ApiKeyRecord[]>;
  readonly revoke: (keyId: string) => Promise<void>;
}

export interface VulnScanPort {
  readonly runScan: (scanType: ScanType) => Promise<VulnScanResult>;
  readonly getLastScan: (scanType: ScanType) => Promise<VulnScanResult | undefined>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type ScanType = 'dependency' | 'container' | 'sast' | 'dast' | 'secret-leak';

export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface VulnFinding {
  readonly id: string;
  readonly severity: VulnSeverity;
  readonly package: string;
  readonly version: string;
  readonly fixedIn: string | undefined;
  readonly description: string;
  readonly cve: string | undefined;
}

export interface VulnScanResult {
  readonly scanId: string;
  readonly scanType: ScanType;
  readonly scannedAt: bigint;
  readonly findings: readonly VulnFinding[];
  readonly passesGate: boolean;
}

export type ApiKeyScope =
  | 'read:world'
  | 'write:world'
  | 'read:player'
  | 'write:player'
  | 'read:economy'
  | 'write:economy'
  | 'admin:all';

export interface ApiKeyRecord {
  readonly keyId: string;
  readonly keyHash: string;
  readonly clientId: string;
  readonly scopes: readonly ApiKeyScope[];
  readonly createdAt: bigint;
  readonly expiresAt: bigint;
  readonly rotatedAt: bigint | undefined;
  readonly lastUsedAt: bigint | undefined;
  readonly usageCount: number;
  readonly revoked: boolean;
}

export interface JwtConfig {
  readonly accessTokenTtlMs: number;
  readonly refreshTokenTtlMs: number;
  readonly maxRefreshCount: number;
  readonly issuer: string;
  readonly audience: string;
}

export interface CspDirectives {
  readonly defaultSrc: readonly string[];
  readonly scriptSrc: readonly string[];
  readonly styleSrc: readonly string[];
  readonly imgSrc: readonly string[];
  readonly connectSrc: readonly string[];
  readonly fontSrc: readonly string[];
  readonly frameSrc: readonly string[];
  readonly mediaSrc: readonly string[];
  readonly objectSrc: readonly string[];
  readonly reportUri: string | undefined;
}

export interface SchemaValidationResult {
  readonly valid: boolean;
  readonly errors: readonly SchemaError[];
  readonly sanitized: unknown;
}

export interface SchemaError {
  readonly path: string;
  readonly message: string;
  readonly expected: string;
  readonly received: string;
}

export interface BackpressureState {
  readonly currentLoad: number;
  readonly threshold: number;
  readonly shedding: boolean;
  readonly shedRate: number;
  readonly queueDepth: number;
}

export interface DdosMetrics {
  readonly requestsPerSecond: number;
  readonly uniqueIps: number;
  readonly blockedRequests: number;
  readonly backpressure: BackpressureState;
  readonly edgeFiltered: number;
}

export interface TokenPair {
  readonly accessTokenId: string;
  readonly refreshTokenId: string;
  readonly accessExpiresAt: bigint;
  readonly refreshExpiresAt: bigint;
  readonly playerId: string;
}

export interface RotateResult {
  readonly newTokenPair: TokenPair;
  readonly oldRefreshRevoked: boolean;
}

export type SchemaRegistry = ReadonlyMap<string, SchemaDefinition>;

export interface SchemaDefinition {
  readonly name: string;
  readonly version: number;
  readonly validate: (data: unknown) => SchemaValidationResult;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface SecurityHardeningConfig {
  readonly jwt: JwtConfig;
  readonly csp: CspDirectives;
  readonly ddos: {
    readonly edgeRateLimit: number;
    readonly internalBackpressureThreshold: number;
    readonly loadShedPercentage: number;
    readonly requestWindowMs: number;
    readonly maxUniqueIpsPerWindow: number;
  };
  readonly apiKey: {
    readonly maxKeysPerClient: number;
    readonly defaultTtlMs: number;
    readonly rotationWarningMs: number;
  };
  readonly vulnScan: {
    readonly blockOnCritical: boolean;
    readonly blockOnHigh: boolean;
    readonly maxAcceptableFindings: number;
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface SecurityHardeningStats {
  readonly schemasRegistered: number;
  readonly validationsRun: number;
  readonly validationsFailed: number;
  readonly tokensIssued: number;
  readonly tokensRevoked: number;
  readonly tokensRefreshed: number;
  readonly apiKeysActive: number;
  readonly apiKeysRotated: number;
  readonly ddosEventsDetected: number;
  readonly vulnScansRun: number;
  readonly vulnScansPassed: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface SecurityHardeningEngine {
  readonly registerSchema: (schema: SchemaDefinition) => void;
  readonly validateMessage: (schemaName: string, data: unknown) => SchemaValidationResult;
  readonly generateCspHeader: () => string;

  readonly issueTokenPair: (playerId: string) => Promise<TokenPair>;
  readonly refreshTokens: (refreshTokenId: string, playerId: string) => Promise<RotateResult>;
  readonly revokeToken: (tokenId: string) => Promise<void>;
  readonly revokeAllPlayerTokens: (playerId: string) => Promise<void>;
  readonly isTokenRevoked: (tokenId: string) => Promise<boolean>;

  readonly createApiKey: (clientId: string, scopes: readonly ApiKeyScope[]) => Promise<ApiKeyRecord>;
  readonly validateApiKey: (keyHash: string, requiredScope: ApiKeyScope) => Promise<boolean>;
  readonly rotateApiKey: (keyId: string, clientId: string) => Promise<ApiKeyRecord>;
  readonly revokeApiKey: (keyId: string) => Promise<void>;
  readonly listClientKeys: (clientId: string) => Promise<readonly ApiKeyRecord[]>;

  readonly recordRequest: (ip: string) => void;
  readonly getDdosMetrics: () => DdosMetrics;
  readonly isUnderAttack: () => boolean;
  readonly shouldShedLoad: () => boolean;

  readonly runVulnScan: (scanType: ScanType) => Promise<VulnScanResult>;
  readonly passesSecurityGate: () => Promise<boolean>;

  readonly getStats: () => SecurityHardeningStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface SecurityHardeningDeps {
  readonly clock: HardeningClockPort;
  readonly id: HardeningIdPort;
  readonly log: HardeningLogPort;
  readonly events: HardeningEventPort;
  readonly tokenStore: TokenStorePort;
  readonly apiKeyStore: ApiKeyStorePort;
  readonly vulnScanner: VulnScanPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CSP: CspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  frameSrc: ["'none'"],
  mediaSrc: ["'self'"],
  objectSrc: ["'none'"],
  reportUri: undefined,
};

const DEFAULT_CONFIG: SecurityHardeningConfig = {
  jwt: {
    accessTokenTtlMs: 15 * 60 * 1000,
    refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
    maxRefreshCount: 30,
    issuer: 'loom-dye-house',
    audience: 'loom-services',
  },
  csp: DEFAULT_CSP,
  ddos: {
    edgeRateLimit: 1000,
    internalBackpressureThreshold: 0.8,
    loadShedPercentage: 0.2,
    requestWindowMs: 60_000,
    maxUniqueIpsPerWindow: 50_000,
  },
  apiKey: {
    maxKeysPerClient: 5,
    defaultTtlMs: 90 * 24 * 60 * 60 * 1000,
    rotationWarningMs: 7 * 24 * 60 * 60 * 1000,
  },
  vulnScan: {
    blockOnCritical: true,
    blockOnHigh: true,
    maxAcceptableFindings: 0,
  },
};

// ─── Factory ────────────────────────────────────────────────────────

export function createSecurityHardeningEngine(
  deps: SecurityHardeningDeps,
  config: Partial<SecurityHardeningConfig> = {},
): SecurityHardeningEngine {
  const cfg: SecurityHardeningConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    jwt: { ...DEFAULT_CONFIG.jwt, ...config.jwt },
    csp: { ...DEFAULT_CSP, ...config.csp },
    ddos: { ...DEFAULT_CONFIG.ddos, ...config.ddos },
    apiKey: { ...DEFAULT_CONFIG.apiKey, ...config.apiKey },
    vulnScan: { ...DEFAULT_CONFIG.vulnScan, ...config.vulnScan },
  };

  const schemas = new Map<string, SchemaDefinition>();

  // DDoS tracking
  const ipRequestCounts = new Map<string, number>();
  let windowStart = deps.clock.now();
  let totalRequestsInWindow = 0;
  let blockedCount = 0;
  let ddosEventsDetected = 0;

  // Stats
  let validationsRun = 0;
  let validationsFailed = 0;
  let tokensIssued = 0;
  let tokensRevoked = 0;
  let tokensRefreshed = 0;
  let apiKeysActive = 0;
  let apiKeysRotated = 0;
  let vulnScansRun = 0;
  let vulnScansPassed = 0;

  function resetWindowIfExpired(): void {
    const now = deps.clock.now();
    const elapsed = Number(now - windowStart);
    if (elapsed >= cfg.ddos.requestWindowMs) {
      ipRequestCounts.clear();
      totalRequestsInWindow = 0;
      blockedCount = 0;
      windowStart = now;
    }
  }

  function registerSchema(schema: SchemaDefinition): void {
    schemas.set(schema.name, schema);
    deps.log.info('schema-registered', { name: schema.name, version: schema.version });
  }

  function validateMessage(schemaName: string, data: unknown): SchemaValidationResult {
    validationsRun++;
    const schema = schemas.get(schemaName);
    if (!schema) {
      validationsFailed++;
      return {
        valid: false,
        errors: [{ path: '$', message: `Unknown schema: ${schemaName}`, expected: 'registered-schema', received: 'unknown' }],
        sanitized: undefined,
      };
    }
    const result = schema.validate(data);
    if (!result.valid) {
      validationsFailed++;
      deps.log.warn('validation-failed', { schemaName, errorCount: result.errors.length });
    }
    return result;
  }

  function generateCspHeader(): string {
    const directives: string[] = [];
    const csp = cfg.csp;

    directives.push(`default-src ${csp.defaultSrc.join(' ')}`);
    directives.push(`script-src ${csp.scriptSrc.join(' ')}`);
    directives.push(`style-src ${csp.styleSrc.join(' ')}`);
    directives.push(`img-src ${csp.imgSrc.join(' ')}`);
    directives.push(`connect-src ${csp.connectSrc.join(' ')}`);
    directives.push(`font-src ${csp.fontSrc.join(' ')}`);
    directives.push(`frame-src ${csp.frameSrc.join(' ')}`);
    directives.push(`media-src ${csp.mediaSrc.join(' ')}`);
    directives.push(`object-src ${csp.objectSrc.join(' ')}`);

    if (csp.reportUri !== undefined) {
      directives.push(`report-uri ${csp.reportUri}`);
    }

    return directives.join('; ');
  }

  async function issueTokenPair(playerId: string): Promise<TokenPair> {
    const now = deps.clock.now();
    const pair: TokenPair = {
      accessTokenId: deps.id.next(),
      refreshTokenId: deps.id.next(),
      accessExpiresAt: now + BigInt(cfg.jwt.accessTokenTtlMs),
      refreshExpiresAt: now + BigInt(cfg.jwt.refreshTokenTtlMs),
      playerId,
    };

    await deps.tokenStore.storeRefreshToken(pair.refreshTokenId, playerId, pair.refreshExpiresAt);
    tokensIssued++;
    deps.log.info('token-pair-issued', { playerId, accessTokenId: pair.accessTokenId });
    return pair;
  }

  async function refreshTokens(refreshTokenId: string, playerId: string): Promise<RotateResult> {
    const revoked = await deps.tokenStore.isRevoked(refreshTokenId);
    if (revoked) {
      deps.log.warn('refresh-token-already-revoked', { refreshTokenId, playerId });
      throw new Error('Refresh token revoked');
    }

    await deps.tokenStore.revokeRefreshToken(refreshTokenId);
    const newPair = await issueTokenPair(playerId);
    tokensRefreshed++;

    return { newTokenPair: newPair, oldRefreshRevoked: true };
  }

  async function revokeToken(tokenId: string): Promise<void> {
    await deps.tokenStore.revokeRefreshToken(tokenId);
    tokensRevoked++;
    deps.log.info('token-revoked', { tokenId });
  }

  async function revokeAllPlayerTokens(playerId: string): Promise<void> {
    await deps.tokenStore.revokeAllForPlayer(playerId);
    tokensRevoked++;
    deps.log.info('all-player-tokens-revoked', { playerId });
  }

  async function isTokenRevoked(tokenId: string): Promise<boolean> {
    return deps.tokenStore.isRevoked(tokenId);
  }

  async function createApiKey(clientId: string, scopes: readonly ApiKeyScope[]): Promise<ApiKeyRecord> {
    const existing = await deps.apiKeyStore.listForClient(clientId);
    if (existing.length >= cfg.apiKey.maxKeysPerClient) {
      throw new Error(`Client ${clientId} already has ${existing.length} keys (max: ${cfg.apiKey.maxKeysPerClient})`);
    }

    const now = deps.clock.now();
    const record: ApiKeyRecord = {
      keyId: deps.id.next(),
      keyHash: deps.id.next(),
      clientId,
      scopes,
      createdAt: now,
      expiresAt: now + BigInt(cfg.apiKey.defaultTtlMs),
      rotatedAt: undefined,
      lastUsedAt: undefined,
      usageCount: 0,
      revoked: false,
    };

    await deps.apiKeyStore.store(record);
    apiKeysActive++;
    deps.log.info('api-key-created', { keyId: record.keyId, clientId, scopeCount: scopes.length });
    return record;
  }

  async function validateApiKey(keyHash: string, requiredScope: ApiKeyScope): Promise<boolean> {
    const record = await deps.apiKeyStore.lookup(keyHash);
    if (record === undefined) return false;
    if (record.revoked) return false;

    const now = deps.clock.now();
    if (now > record.expiresAt) return false;

    if (record.scopes.includes('admin:all')) return true;
    return record.scopes.includes(requiredScope);
  }

  async function rotateApiKey(keyId: string, clientId: string): Promise<ApiKeyRecord> {
    await deps.apiKeyStore.revoke(keyId);
    const existing = await deps.apiKeyStore.listForClient(clientId);
    const oldKey = existing.find(k => k.keyId === keyId);
    const scopes = oldKey !== undefined ? oldKey.scopes : (['read:world'] as const);

    const now = deps.clock.now();
    const record: ApiKeyRecord = {
      keyId: deps.id.next(),
      keyHash: deps.id.next(),
      clientId,
      scopes,
      createdAt: now,
      expiresAt: now + BigInt(cfg.apiKey.defaultTtlMs),
      rotatedAt: now,
      lastUsedAt: undefined,
      usageCount: 0,
      revoked: false,
    };

    await deps.apiKeyStore.store(record);
    apiKeysRotated++;
    deps.log.info('api-key-rotated', { oldKeyId: keyId, newKeyId: record.keyId, clientId });
    return record;
  }

  async function revokeApiKey(keyId: string): Promise<void> {
    await deps.apiKeyStore.revoke(keyId);
    apiKeysActive = Math.max(0, apiKeysActive - 1);
    deps.log.info('api-key-revoked', { keyId });
  }

  async function listClientKeys(clientId: string): Promise<readonly ApiKeyRecord[]> {
    return deps.apiKeyStore.listForClient(clientId);
  }

  function recordRequest(ip: string): void {
    resetWindowIfExpired();
    totalRequestsInWindow++;
    const current = ipRequestCounts.get(ip) ?? 0;
    ipRequestCounts.set(ip, current + 1);

    if (current + 1 > cfg.ddos.edgeRateLimit) {
      blockedCount++;
    }

    if (isUnderAttack() && ddosEventsDetected === 0) {
      ddosEventsDetected++;
      deps.log.warn('ddos-attack-detected', {
        uniqueIps: ipRequestCounts.size,
        requestsInWindow: totalRequestsInWindow,
      });
    }
  }

  function getDdosMetrics(): DdosMetrics {
    resetWindowIfExpired();
    const load = totalRequestsInWindow / (cfg.ddos.edgeRateLimit * cfg.ddos.maxUniqueIpsPerWindow);
    const shedding = load > cfg.ddos.internalBackpressureThreshold;
    return {
      requestsPerSecond: totalRequestsInWindow / (cfg.ddos.requestWindowMs / 1000),
      uniqueIps: ipRequestCounts.size,
      blockedRequests: blockedCount,
      backpressure: {
        currentLoad: load,
        threshold: cfg.ddos.internalBackpressureThreshold,
        shedding,
        shedRate: shedding ? cfg.ddos.loadShedPercentage : 0,
        queueDepth: totalRequestsInWindow,
      },
      edgeFiltered: blockedCount,
    };
  }

  function isUnderAttack(): boolean {
    resetWindowIfExpired();
    return ipRequestCounts.size > cfg.ddos.maxUniqueIpsPerWindow;
  }

  function shouldShedLoad(): boolean {
    resetWindowIfExpired();
    const load = totalRequestsInWindow / (cfg.ddos.edgeRateLimit * cfg.ddos.maxUniqueIpsPerWindow);
    return load > cfg.ddos.internalBackpressureThreshold;
  }

  async function runVulnScan(scanType: ScanType): Promise<VulnScanResult> {
    vulnScansRun++;
    const result = await deps.vulnScanner.runScan(scanType);
    if (result.passesGate) {
      vulnScansPassed++;
    }
    deps.log.info('vuln-scan-completed', {
      scanType,
      findingCount: result.findings.length,
      passed: result.passesGate,
    });
    return result;
  }

  async function passesSecurityGate(): Promise<boolean> {
    const scanTypes: readonly ScanType[] = ['dependency', 'container', 'sast', 'secret-leak'];
    for (const scanType of scanTypes) {
      const last = await deps.vulnScanner.getLastScan(scanType);
      if (last === undefined) return false;
      if (!last.passesGate) return false;

      if (cfg.vulnScan.blockOnCritical) {
        const hasCritical = last.findings.some(f => f.severity === 'critical');
        if (hasCritical) return false;
      }
      if (cfg.vulnScan.blockOnHigh) {
        const hasHigh = last.findings.some(f => f.severity === 'high');
        if (hasHigh) return false;
      }
    }
    return true;
  }

  function getStats(): SecurityHardeningStats {
    return {
      schemasRegistered: schemas.size,
      validationsRun,
      validationsFailed,
      tokensIssued,
      tokensRevoked,
      tokensRefreshed,
      apiKeysActive,
      apiKeysRotated,
      ddosEventsDetected,
      vulnScansRun,
      vulnScansPassed,
    };
  }

  deps.log.info('security-hardening-engine-created', {
    accessTokenTtlMs: cfg.jwt.accessTokenTtlMs,
    edgeRateLimit: cfg.ddos.edgeRateLimit,
    maxKeysPerClient: cfg.apiKey.maxKeysPerClient,
  });

  return {
    registerSchema,
    validateMessage,
    generateCspHeader,
    issueTokenPair,
    refreshTokens,
    revokeToken,
    revokeAllPlayerTokens,
    isTokenRevoked,
    createApiKey,
    validateApiKey,
    rotateApiKey,
    revokeApiKey,
    listClientKeys,
    recordRequest,
    getDdosMetrics,
    isUnderAttack,
    shouldShedLoad,
    runVulnScan,
    passesSecurityGate,
    getStats,
  };
}
