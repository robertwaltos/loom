import { describe, it, expect, vi } from 'vitest';
import { createComplianceEngine } from '../compliance-engine.js';
import type {
  ComplianceEngineDeps,
  ConsentRecord,
  DataCategory,
  LootBoxTable,
  PlayerDataExport,
} from '../compliance-engine.js';

function makeClock(start = 100_000n) {
  let nowValue = start;
  return {
    now: () => nowValue,
    advance: (delta: bigint) => {
      nowValue += delta;
    },
  };
}

function makeIdPort(prefix = 'cmp') {
  let index = 0;
  return {
    next: () => `${prefix}-${++index}`,
  };
}

function makeExport(playerId: string): PlayerDataExport {
  return {
    playerId,
    exportedAt: 111_000n,
    categories: new Map<DataCategory, unknown>([
      ['profile', { nickname: 'alpha' }],
      ['economy', { kalon: 1000 }],
    ]),
    sizeBytes: 2048,
  };
}

function makeDeps() {
  const clock = makeClock();
  const consentByPlayer = new Map<string, ConsentRecord>();
  const parentalConsent = new Map<string, {
    playerId: string;
    parentEmail: string;
    consentedAt: bigint;
    features: readonly ('chat' | 'trade' | 'real-money' | 'social' | 'user-content' | 'voice' | 'loot-box')[];
    verified: boolean;
  }>();
  const lootTables = new Map<string, LootBoxTable>();
  const playerSpend = new Map<string, { day: number; week: number; month: number }>();

  const deleted: Array<{ playerId: string; categories: readonly DataCategory[] }> = [];
  const pseudonymised: Array<{ playerId: string; pseudonym: string }> = [];

  const log = {
    info: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    warn: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    error: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
  };

  const deps: ComplianceEngineDeps = {
    clock,
    id: makeIdPort(),
    log,
    events: { emit: () => undefined },
    playerData: {
      collectPlayerData: vi.fn(async (playerId: string) => makeExport(playerId)),
      pseudonymisePlayer: vi.fn(async (playerId: string, pseudonym: string) => {
        pseudonymised.push({ playerId, pseudonym });
        return { playerId, pseudonym, fieldsProcessed: 12, completedAt: clock.now() };
      }),
      deletePlayerData: vi.fn(async (playerId: string, categories: readonly DataCategory[]) => {
        deleted.push({ playerId, categories });
        return {
          playerId,
          categoriesDeleted: categories,
          recordsRemoved: 77,
          completedAt: clock.now(),
          retainedForLegal: ['economy'] as const,
        };
      }),
    },
    consentStore: {
      getConsent: vi.fn(async (playerId: string) => consentByPlayer.get(playerId)),
      storeConsent: vi.fn(async (consent: ConsentRecord) => {
        consentByPlayer.set(consent.playerId, consent);
      }),
      revokeConsent: vi.fn(async (playerId: string, purposes) => {
        const current = consentByPlayer.get(playerId);
        if (!current) return;
        const revoked = current.purposes.map((grant) =>
          purposes.includes(grant.purpose)
            ? { ...grant, granted: false, expiresAt: clock.now() }
            : grant,
        );
        consentByPlayer.set(playerId, {
          ...current,
          purposes: revoked,
          updatedAt: clock.now(),
        });
      }),
    },
    ageVerification: {
      verifyAge: vi.fn(async (playerId: string, dateOfBirth: string) => {
        if (dateOfBirth.startsWith('2016')) {
          return {
            playerId,
            verified: true,
            ageGroup: 'child' as const,
            restrictedFeatures: ['chat', 'trade', 'real-money', 'voice', 'loot-box'] as const,
          };
        }
        return {
          playerId,
          verified: true,
          ageGroup: 'adult' as const,
          restrictedFeatures: [] as const,
        };
      }),
      getParentalConsent: vi.fn(async (playerId: string) => parentalConsent.get(playerId)),
      storeParentalConsent: vi.fn(async (consent) => {
        parentalConsent.set(consent.playerId, consent);
      }),
    },
    lootBoxRegistry: {
      registerTable: vi.fn(async (table: LootBoxTable) => {
        lootTables.set(table.tableId, table);
      }),
      getTable: vi.fn(async (tableId: string) => lootTables.get(tableId)),
      recordPurchase: vi.fn(async () => undefined),
      getPlayerSpend: vi.fn(async (playerId: string, windowMs: number) => {
        const spend = playerSpend.get(playerId) ?? { day: 0, week: 0, month: 0 };
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        if (windowMs === oneDay) return spend.day;
        if (windowMs === oneWeek) return spend.week;
        return spend.month;
      }),
    },
  };

  return { deps, clock, log, consentByPlayer, parentalConsent, lootTables, playerSpend, deleted, pseudonymised };
}

describe('Compliance Engine Simulation', () => {
  it('creates erasure request with configured deadline and pending status', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps, { erasureDeadlineDays: 10 });

    const request = await engine.requestErasure('player-1', 'EU');

    expect(request.status).toBe('pending');
    expect(request.requestedAt).toBe(100_000n);
    expect(request.deadlineAt).toBe(864_100_000n);
    expect(engine.getPendingErasures()).toHaveLength(1);
  });

  it('throws when processing unknown erasure request id', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    await expect(engine.processErasure('missing')).rejects.toThrow('Erasure request missing not found');
  });

  it('processes erasure by pseudonymising then deleting non-retained categories', async () => {
    const { deps, deleted, pseudonymised } = makeDeps();
    const engine = createComplianceEngine(deps, {
      legalRetentionCategories: ['economy', 'chat'],
    });

    const request = await engine.requestErasure('player-2', 'US-CA');
    const result = await engine.processErasure(request.requestId);

    expect(pseudonymised[0]?.playerId).toBe('player-2');
    expect(pseudonymised[0]?.pseudonym).toContain('erased-cmp-2');
    expect(deleted[0]?.categories).not.toContain('economy');
    expect(deleted[0]?.categories).not.toContain('chat');
    expect(result.recordsRemoved).toBe(77);

    const status = engine.getErasureStatus(request.requestId);
    expect(status?.status).toBe('completed');
    expect(engine.getStats().erasureRequestsCompleted).toBe(1);
  });

  it('exports player data and increments export stats', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    const exported = await engine.exportPlayerData('player-export');

    expect(exported.playerId).toBe('player-export');
    expect(exported.sizeBytes).toBe(2048);
    expect(engine.getStats().dataExportsTotal).toBe(1);
  });

  it('records and fetches consent records', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    const consent: ConsentRecord = {
      playerId: 'player-consent',
      jurisdiction: 'EU',
      purposes: [
        { purpose: 'marketing', granted: true, grantedAt: 100_000n, expiresAt: undefined },
      ],
      createdAt: 100_000n,
      updatedAt: 100_000n,
      version: 1,
    };

    await engine.recordConsent(consent);
    const stored = await engine.getConsent('player-consent');

    expect(stored).toEqual(consent);
    expect(engine.getStats().consentRecordsTotal).toBe(1);
  });

  it('revokes targeted consent purposes through store port', async () => {
    const { deps, clock } = makeDeps();
    const engine = createComplianceEngine(deps);

    const consent: ConsentRecord = {
      playerId: 'player-revoke',
      jurisdiction: 'US-CA',
      purposes: [
        { purpose: 'marketing', granted: true, grantedAt: 100_000n, expiresAt: undefined },
        { purpose: 'social-features', granted: true, grantedAt: 100_000n, expiresAt: undefined },
      ],
      createdAt: 100_000n,
      updatedAt: 100_000n,
      version: 2,
    };

    await engine.recordConsent(consent);
    clock.advance(10n);
    await engine.revokeConsent('player-revoke', ['marketing']);

    const updated = await engine.getConsent('player-revoke');
    const marketing = updated?.purposes.find((p) => p.purpose === 'marketing');
    const social = updated?.purposes.find((p) => p.purpose === 'social-features');

    expect(marketing?.granted).toBe(false);
    expect(social?.granted).toBe(true);
  });

  it('tracks COPPA blocks when verifyAge returns child group', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    const result = await engine.verifyAge('player-child', '2016-05-14');

    expect(result.ageGroup).toBe('child');
    expect(result.restrictedFeatures).toContain('chat');
    expect(engine.getStats().coppaBlocksTotal).toBe(1);
  });

  it('uses age cache for restricted features after verifyAge', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    await engine.verifyAge('player-cached', '2016-01-01');
    const restricted = await engine.getRestrictedFeatures('player-cached');

    expect(restricted).toContain('real-money');
  });

  it('derives restricted features from verified parental consent when no age cache exists', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    await engine.submitParentalConsent({
      playerId: 'player-parent',
      parentEmail: 'parent@example.com',
      consentedAt: 100_000n,
      features: ['chat', 'trade', 'social'],
      verified: true,
    });

    const restricted = await engine.getRestrictedFeatures('player-parent');

    expect(restricted).toContain('real-money');
    expect(restricted).not.toContain('chat');
  });

  it('rejects loot tables whose probabilities do not sum to one', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    const invalid: LootBoxTable = {
      tableId: 'loot-bad',
      name: 'Broken probabilities',
      items: [
        { itemId: 'a', rarity: 'common', probability: 0.7, displayName: 'A' },
        { itemId: 'b', rarity: 'rare', probability: 0.2, displayName: 'B' },
      ],
      costKalon: 10,
      disclosedAt: 100_000n,
    };

    await expect(engine.discloseLootTable(invalid)).rejects.toThrow('expected 1.0');
  });

  it('discloses valid loot table and retrieves it by id', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps);

    const valid: LootBoxTable = {
      tableId: 'loot-good',
      name: 'Standard chest',
      items: [
        { itemId: 'a', rarity: 'common', probability: 0.5, displayName: 'A' },
        { itemId: 'b', rarity: 'rare', probability: 0.3, displayName: 'B' },
        { itemId: 'c', rarity: 'epic', probability: 0.2, displayName: 'C' },
      ],
      costKalon: 20,
      disclosedAt: 100_000n,
    };

    await engine.discloseLootTable(valid);
    const stored = await engine.getLootTable('loot-good');

    expect(stored?.name).toBe('Standard chest');
    expect(engine.getStats().lootBoxDisclosures).toBe(1);
  });

  it('blocks spending at daily, weekly, and monthly thresholds', async () => {
    const { deps, playerSpend } = makeDeps();
    const engine = createComplianceEngine(deps, {
      spendingLimits: {
        dailyLimitKalon: 100,
        weeklyLimitKalon: 200,
        monthlyLimitKalon: 300,
        cooldownAfterLimitMs: 1_000,
      },
    });

    playerSpend.set('spender-day', { day: 95, week: 95, month: 95 });
    const day = await engine.checkSpendingLimit('spender-day', 10);
    expect(day.allowed).toBe(false);
    expect(day.limitHit).toBe('daily');

    playerSpend.set('spender-week', { day: 50, week: 195, month: 195 });
    const week = await engine.checkSpendingLimit('spender-week', 10);
    expect(week.allowed).toBe(false);
    expect(week.limitHit).toBe('weekly');

    playerSpend.set('spender-month', { day: 50, week: 100, month: 295 });
    const month = await engine.checkSpendingLimit('spender-month', 10);
    expect(month.allowed).toBe(false);
    expect(month.limitHit).toBe('monthly');

    expect(engine.getStats().spendLimitHits).toBe(3);
  });

  it('returns jurisdiction privacy policy and exposes aggregate stats', async () => {
    const { deps } = makeDeps();
    const engine = createComplianceEngine(deps, {
      privacyPolicies: [
        {
          jurisdiction: 'EU',
          version: '2026.03',
          effectiveDate: '2026-03-01',
          url: 'https://loom.example/privacy/eu',
        },
      ],
    });

    await engine.requestErasure('player-stat', 'EU');
    await engine.exportPlayerData('player-stat');

    const policy = engine.getPrivacyPolicy('EU');
    const stats = engine.getStats();

    expect(policy?.url).toContain('/privacy/eu');
    expect(stats.erasureRequestsTotal).toBe(1);
    expect(stats.dataExportsTotal).toBe(1);
    expect(stats.erasureRequestsPending).toBe(1);
  });
});
