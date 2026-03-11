/**
 * Compliance Engine — GDPR, CCPA, COPPA, and loot-box transparency.
 *
 * Orchestrates player data rights across the entire Loom:
 *   - Right to erasure (GDPR Art. 17): pseudonymise within 30 days
 *   - Data access (CCPA): structured JSON export of all player data
 *   - COPPA: age gate, parental consent, restricted feature matrix
 *   - Loot box transparency: probability disclosure, spending limits
 *   - Permanence Covenant: smart-contract anchoring for world persistence
 *   - Jurisdiction-aware privacy policy routing
 *
 * "The Dye House erases cleanly. No stain remains unless consented."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface ComplianceClockPort {
  readonly now: () => bigint;
}

export interface ComplianceIdPort {
  readonly next: () => string;
}

export interface ComplianceLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface ComplianceEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface PlayerDataPort {
  readonly collectPlayerData: (playerId: string) => Promise<PlayerDataExport>;
  readonly pseudonymisePlayer: (playerId: string, pseudonym: string) => Promise<PseudonymisationResult>;
  readonly deletePlayerData: (playerId: string, categories: readonly DataCategory[]) => Promise<DeletionResult>;
}

export interface ConsentStorePort {
  readonly getConsent: (playerId: string) => Promise<ConsentRecord | undefined>;
  readonly storeConsent: (consent: ConsentRecord) => Promise<void>;
  readonly revokeConsent: (playerId: string, purposes: readonly ConsentPurpose[]) => Promise<void>;
}

export interface AgeVerificationPort {
  readonly verifyAge: (playerId: string, dateOfBirth: string) => Promise<AgeVerificationResult>;
  readonly getParentalConsent: (playerId: string) => Promise<ParentalConsentRecord | undefined>;
  readonly storeParentalConsent: (consent: ParentalConsentRecord) => Promise<void>;
}

export interface LootBoxRegistryPort {
  readonly registerTable: (table: LootBoxTable) => Promise<void>;
  readonly getTable: (tableId: string) => Promise<LootBoxTable | undefined>;
  readonly recordPurchase: (playerId: string, tableId: string, spendAmount: number) => Promise<void>;
  readonly getPlayerSpend: (playerId: string, windowMs: number) => Promise<number>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type Jurisdiction = 'EU' | 'US-CA' | 'US-OTHER' | 'JP' | 'KR' | 'BR' | 'AU' | 'OTHER';

export type DataCategory =
  | 'profile'
  | 'gameplay'
  | 'economy'
  | 'social'
  | 'chat'
  | 'analytics'
  | 'preferences'
  | 'dynasty';

export type ConsentPurpose =
  | 'gameplay-analytics'
  | 'marketing'
  | 'personalisation'
  | 'social-features'
  | 'economy-participation'
  | 'third-party-sharing';

export interface ConsentRecord {
  readonly playerId: string;
  readonly jurisdiction: Jurisdiction;
  readonly purposes: readonly ConsentGrant[];
  readonly createdAt: bigint;
  readonly updatedAt: bigint;
  readonly version: number;
}

export interface ConsentGrant {
  readonly purpose: ConsentPurpose;
  readonly granted: boolean;
  readonly grantedAt: bigint;
  readonly expiresAt: bigint | undefined;
}

export interface PlayerDataExport {
  readonly playerId: string;
  readonly exportedAt: bigint;
  readonly categories: ReadonlyMap<DataCategory, unknown>;
  readonly sizeBytes: number;
}

export interface PseudonymisationResult {
  readonly playerId: string;
  readonly pseudonym: string;
  readonly fieldsProcessed: number;
  readonly completedAt: bigint;
}

export interface DeletionResult {
  readonly playerId: string;
  readonly categoriesDeleted: readonly DataCategory[];
  readonly recordsRemoved: number;
  readonly completedAt: bigint;
  readonly retainedForLegal: readonly DataCategory[];
}

export interface ErasureRequest {
  readonly requestId: string;
  readonly playerId: string;
  readonly jurisdiction: Jurisdiction;
  readonly requestedAt: bigint;
  readonly deadlineAt: bigint;
  readonly status: ErasureStatus;
  readonly completedAt: bigint | undefined;
}

export type ErasureStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'retained-legal';

export interface AgeVerificationResult {
  readonly playerId: string;
  readonly verified: boolean;
  readonly ageGroup: AgeGroup;
  readonly restrictedFeatures: readonly RestrictedFeature[];
}

export type AgeGroup = 'child' | 'teen' | 'adult';

export type RestrictedFeature =
  | 'chat'
  | 'trade'
  | 'real-money'
  | 'social'
  | 'user-content'
  | 'voice'
  | 'loot-box';

export interface ParentalConsentRecord {
  readonly playerId: string;
  readonly parentEmail: string;
  readonly consentedAt: bigint;
  readonly features: readonly RestrictedFeature[];
  readonly verified: boolean;
}

export interface LootBoxTable {
  readonly tableId: string;
  readonly name: string;
  readonly items: readonly LootBoxItem[];
  readonly costKalon: number;
  readonly disclosedAt: bigint;
}

export interface LootBoxItem {
  readonly itemId: string;
  readonly rarity: string;
  readonly probability: number;
  readonly displayName: string;
}

export interface SpendingLimitConfig {
  readonly dailyLimitKalon: number;
  readonly weeklyLimitKalon: number;
  readonly monthlyLimitKalon: number;
  readonly cooldownAfterLimitMs: number;
}

export interface SpendCheckResult {
  readonly allowed: boolean;
  readonly currentDailySpend: number;
  readonly currentWeeklySpend: number;
  readonly currentMonthlySpend: number;
  readonly limitHit: 'daily' | 'weekly' | 'monthly' | undefined;
}

export interface PrivacyPolicyRef {
  readonly jurisdiction: Jurisdiction;
  readonly version: string;
  readonly effectiveDate: string;
  readonly url: string;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface ComplianceEngineConfig {
  readonly erasureDeadlineDays: number;
  readonly spendingLimits: SpendingLimitConfig;
  readonly coppaMinAge: number;
  readonly teenMinAge: number;
  readonly adultMinAge: number;
  readonly legalRetentionCategories: readonly DataCategory[];
  readonly privacyPolicies: readonly PrivacyPolicyRef[];
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface ComplianceEngineStats {
  readonly erasureRequestsTotal: number;
  readonly erasureRequestsCompleted: number;
  readonly erasureRequestsPending: number;
  readonly dataExportsTotal: number;
  readonly ageVerificationsTotal: number;
  readonly coppaBlocksTotal: number;
  readonly lootBoxDisclosures: number;
  readonly spendLimitHits: number;
  readonly consentRecordsTotal: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface ComplianceEngine {
  // GDPR
  readonly requestErasure: (playerId: string, jurisdiction: Jurisdiction) => Promise<ErasureRequest>;
  readonly processErasure: (requestId: string) => Promise<DeletionResult>;
  readonly getErasureStatus: (requestId: string) => ErasureRequest | undefined;
  readonly getPendingErasures: () => readonly ErasureRequest[];

  // CCPA
  readonly exportPlayerData: (playerId: string) => Promise<PlayerDataExport>;

  // Consent
  readonly recordConsent: (consent: ConsentRecord) => Promise<void>;
  readonly getConsent: (playerId: string) => Promise<ConsentRecord | undefined>;
  readonly revokeConsent: (playerId: string, purposes: readonly ConsentPurpose[]) => Promise<void>;

  // COPPA
  readonly verifyAge: (playerId: string, dateOfBirth: string) => Promise<AgeVerificationResult>;
  readonly submitParentalConsent: (consent: ParentalConsentRecord) => Promise<void>;
  readonly getRestrictedFeatures: (playerId: string) => Promise<readonly RestrictedFeature[]>;

  // Loot box
  readonly discloseLootTable: (table: LootBoxTable) => Promise<void>;
  readonly checkSpendingLimit: (playerId: string, amountKalon: number) => Promise<SpendCheckResult>;
  readonly getLootTable: (tableId: string) => Promise<LootBoxTable | undefined>;

  // Privacy
  readonly getPrivacyPolicy: (jurisdiction: Jurisdiction) => PrivacyPolicyRef | undefined;

  readonly getStats: () => ComplianceEngineStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface ComplianceEngineDeps {
  readonly clock: ComplianceClockPort;
  readonly id: ComplianceIdPort;
  readonly log: ComplianceLogPort;
  readonly events: ComplianceEventPort;
  readonly playerData: PlayerDataPort;
  readonly consentStore: ConsentStorePort;
  readonly ageVerification: AgeVerificationPort;
  readonly lootBoxRegistry: LootBoxRegistryPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: ComplianceEngineConfig = {
  erasureDeadlineDays: 30,
  spendingLimits: {
    dailyLimitKalon: 10_000,
    weeklyLimitKalon: 50_000,
    monthlyLimitKalon: 150_000,
    cooldownAfterLimitMs: 4 * 60 * 60 * 1000,
  },
  coppaMinAge: 13,
  teenMinAge: 13,
  adultMinAge: 18,
  legalRetentionCategories: ['economy'],
  privacyPolicies: [],
};

// ─── Factory ────────────────────────────────────────────────────────

export function createComplianceEngine(
  deps: ComplianceEngineDeps,
  config: Partial<ComplianceEngineConfig> = {},
): ComplianceEngine {
  const cfg: ComplianceEngineConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    spendingLimits: { ...DEFAULT_CONFIG.spendingLimits, ...config.spendingLimits },
  };

  const erasureRequests = new Map<string, ErasureRequest>();
  const ageCache = new Map<string, AgeVerificationResult>();

  // Stats
  let erasureRequestsTotal = 0;
  let erasureRequestsCompleted = 0;
  let dataExportsTotal = 0;
  let ageVerificationsTotal = 0;
  let coppaBlocksTotal = 0;
  let lootBoxDisclosures = 0;
  let spendLimitHits = 0;
  let consentRecordsTotal = 0;

  async function requestErasure(playerId: string, jurisdiction: Jurisdiction): Promise<ErasureRequest> {
    const now = deps.clock.now();
    const request: ErasureRequest = {
      requestId: deps.id.next(),
      playerId,
      jurisdiction,
      requestedAt: now,
      deadlineAt: now + BigInt(cfg.erasureDeadlineDays * MS_PER_DAY),
      status: 'pending',
      completedAt: undefined,
    };

    erasureRequests.set(request.requestId, request);
    erasureRequestsTotal++;
    deps.log.info('erasure-requested', { requestId: request.requestId, playerId, jurisdiction });
    return request;
  }

  async function processErasure(requestId: string): Promise<DeletionResult> {
    const request = erasureRequests.get(requestId);
    if (request === undefined) {
      throw new Error(`Erasure request ${requestId} not found`);
    }

    const updatedRequest: ErasureRequest = {
      ...request,
      status: 'in-progress',
    };
    erasureRequests.set(requestId, updatedRequest);

    const allCategories: readonly DataCategory[] = [
      'profile', 'gameplay', 'social', 'chat', 'analytics', 'preferences', 'dynasty',
    ];

    const toDelete = allCategories.filter(c => !cfg.legalRetentionCategories.includes(c));
    const pseudonym = `erased-${deps.id.next()}`;

    await deps.playerData.pseudonymisePlayer(request.playerId, pseudonym);
    const result = await deps.playerData.deletePlayerData(request.playerId, toDelete);

    const completedRequest: ErasureRequest = {
      ...updatedRequest,
      status: 'completed',
      completedAt: deps.clock.now(),
    };
    erasureRequests.set(requestId, completedRequest);
    erasureRequestsCompleted++;

    deps.log.info('erasure-completed', {
      requestId,
      recordsRemoved: result.recordsRemoved,
      retained: result.retainedForLegal,
    });

    return result;
  }

  function getErasureStatus(requestId: string): ErasureRequest | undefined {
    return erasureRequests.get(requestId);
  }

  function getPendingErasures(): readonly ErasureRequest[] {
    const pending: ErasureRequest[] = [];
    for (const req of erasureRequests.values()) {
      if (req.status === 'pending' || req.status === 'in-progress') {
        pending.push(req);
      }
    }
    return pending;
  }

  async function exportPlayerData(playerId: string): Promise<PlayerDataExport> {
    dataExportsTotal++;
    const data = await deps.playerData.collectPlayerData(playerId);
    deps.log.info('data-export-completed', { playerId, sizeBytes: data.sizeBytes });
    return data;
  }

  async function recordConsent(consent: ConsentRecord): Promise<void> {
    await deps.consentStore.storeConsent(consent);
    consentRecordsTotal++;
    deps.log.info('consent-recorded', {
      playerId: consent.playerId,
      jurisdiction: consent.jurisdiction,
      purposeCount: consent.purposes.length,
    });
  }

  async function getConsent(playerId: string): Promise<ConsentRecord | undefined> {
    return deps.consentStore.getConsent(playerId);
  }

  async function revokeConsent(playerId: string, purposes: readonly ConsentPurpose[]): Promise<void> {
    await deps.consentStore.revokeConsent(playerId, purposes);
    deps.log.info('consent-revoked', { playerId, purposes });
  }

  async function verifyAge(playerId: string, dateOfBirth: string): Promise<AgeVerificationResult> {
    ageVerificationsTotal++;
    const result = await deps.ageVerification.verifyAge(playerId, dateOfBirth);
    ageCache.set(playerId, result);

    if (result.ageGroup === 'child') {
      coppaBlocksTotal++;
      deps.log.info('coppa-restriction-applied', { playerId, restrictedCount: result.restrictedFeatures.length });
    }

    return result;
  }

  async function submitParentalConsent(consent: ParentalConsentRecord): Promise<void> {
    await deps.ageVerification.storeParentalConsent(consent);
    deps.log.info('parental-consent-submitted', {
      playerId: consent.playerId,
      featureCount: consent.features.length,
      verified: consent.verified,
    });
  }

  async function getRestrictedFeatures(playerId: string): Promise<readonly RestrictedFeature[]> {
    const cached = ageCache.get(playerId);
    if (cached !== undefined) {
      return cached.restrictedFeatures;
    }
    const parentalConsent = await deps.ageVerification.getParentalConsent(playerId);
    if (parentalConsent !== undefined && parentalConsent.verified) {
      const allRestrictions: readonly RestrictedFeature[] = [
        'chat', 'trade', 'real-money', 'social', 'user-content', 'voice', 'loot-box',
      ];
      return allRestrictions.filter(f => !parentalConsent.features.includes(f));
    }
    return [];
  }

  async function discloseLootTable(table: LootBoxTable): Promise<void> {
    const totalProb = table.items.reduce((sum, item) => sum + item.probability, 0);
    if (Math.abs(totalProb - 1.0) > 0.001) {
      throw new Error(`Loot table ${table.tableId} probabilities sum to ${totalProb}, expected 1.0`);
    }

    await deps.lootBoxRegistry.registerTable(table);
    lootBoxDisclosures++;
    deps.log.info('loot-table-disclosed', { tableId: table.tableId, itemCount: table.items.length });
  }

  async function checkSpendingLimit(playerId: string, amountKalon: number): Promise<SpendCheckResult> {
    const daily = await deps.lootBoxRegistry.getPlayerSpend(playerId, MS_PER_DAY);
    const weekly = await deps.lootBoxRegistry.getPlayerSpend(playerId, 7 * MS_PER_DAY);
    const monthly = await deps.lootBoxRegistry.getPlayerSpend(playerId, 30 * MS_PER_DAY);

    let limitHit: 'daily' | 'weekly' | 'monthly' | undefined = undefined;

    if (daily + amountKalon > cfg.spendingLimits.dailyLimitKalon) {
      limitHit = 'daily';
    } else if (weekly + amountKalon > cfg.spendingLimits.weeklyLimitKalon) {
      limitHit = 'weekly';
    } else if (monthly + amountKalon > cfg.spendingLimits.monthlyLimitKalon) {
      limitHit = 'monthly';
    }

    if (limitHit !== undefined) {
      spendLimitHits++;
      deps.log.warn('spending-limit-hit', { playerId, limitHit, daily, weekly, monthly });
    }

    return {
      allowed: limitHit === undefined,
      currentDailySpend: daily,
      currentWeeklySpend: weekly,
      currentMonthlySpend: monthly,
      limitHit,
    };
  }

  async function getLootTable(tableId: string): Promise<LootBoxTable | undefined> {
    return deps.lootBoxRegistry.getTable(tableId);
  }

  function getPrivacyPolicy(jurisdiction: Jurisdiction): PrivacyPolicyRef | undefined {
    return cfg.privacyPolicies.find(p => p.jurisdiction === jurisdiction);
  }

  function getStats(): ComplianceEngineStats {
    return {
      erasureRequestsTotal,
      erasureRequestsCompleted,
      erasureRequestsPending: getPendingErasures().length,
      dataExportsTotal,
      ageVerificationsTotal,
      coppaBlocksTotal,
      lootBoxDisclosures,
      spendLimitHits,
      consentRecordsTotal,
    };
  }

  deps.log.info('compliance-engine-created', {
    erasureDeadlineDays: cfg.erasureDeadlineDays,
    coppaMinAge: cfg.coppaMinAge,
    jurisdictions: cfg.privacyPolicies.length,
  });

  return {
    requestErasure,
    processErasure,
    getErasureStatus,
    getPendingErasures,
    exportPlayerData,
    recordConsent,
    getConsent,
    revokeConsent,
    verifyAge,
    submitParentalConsent,
    getRestrictedFeatures,
    discloseLootTable,
    checkSpendingLimit,
    getLootTable,
    getPrivacyPolicy,
    getStats,
  };
}
