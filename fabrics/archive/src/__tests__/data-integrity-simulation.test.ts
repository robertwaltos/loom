/**
 * Data Integrity Engine — Simulation Tests
 *
 * Tests the Permanence Covenant enforcement: WAL archive checks,
 * replication monitoring, backup verification, hash chain validation,
 * KALON ledger reconciliation, geo-replication health, audit log
 * verification, and disaster recovery drills.
 *
 * Phase 9.24 — Permanence Covenant
 * Thread: test/archive/data-integrity
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createDataIntegrityEngine,
  type WalArchivePort,
  type ReplicationPort,
  type BackupPort,
  type HashChainPort,
  type LedgerReconciliationPort,
  type GeoReplicationPort,
  type AuditLogPort,
  type BackupRecord,
} from '../data-integrity.js';

// ─── Fake Ports ─────────────────────────────────────────────────

function createFakeClock(startUs = 1_000_000) {
  let now = startUs;
  return {
    nowMicroseconds: () => now,
    advance: (us: number) => { now += us; },
  };
}

function createFakeIds(prefix = 'id') {
  let counter = 0;
  return { generate: () => `${prefix}-${++counter}` };
}

function createFakeLogger() {
  const entries: Array<{ level: string; msg: string }> = [];
  return {
    entries,
    info: (_ctx: Record<string, unknown>, msg: string) => { entries.push({ level: 'info', msg }); },
    warn: (_ctx: Record<string, unknown>, msg: string) => { entries.push({ level: 'warn', msg }); },
    error: (_ctx: Record<string, unknown>, msg: string) => { entries.push({ level: 'error', msg }); },
  };
}

function createHealthyWalArchive(lagMs = 100): WalArchivePort {
  return {
    getLastArchivedLsn: async () => 'lsn-100',
    getCurrentLsn: async () => 'lsn-101',
    verifySegment: async () => true,
    getArchiveLagMs: async () => lagMs,
  };
}

function createHealthyReplication(lagMs = 50): ReplicationPort {
  return {
    getReplicaLag: async () => lagMs,
    getReplicaIds: () => ['replica-1', 'replica-2'],
    promoteReplica: async () => true,
    verifyReplicaStreaming: async () => true,
  };
}

function createHealthyBackup(): BackupPort {
  const record: BackupRecord = {
    backupId: 'backup-latest',
    startedAt: 500_000,
    completedAt: 900_000,
    sizeBytes: 1024 * 1024,
    hashSha256: 'abc123',
    type: 'full',
  };
  return {
    triggerFullBackup: async () => record,
    restoreToTestCluster: async () => ({
      backupId: record.backupId,
      success: true,
      restoredAt: 1_000_000,
      validationPassed: true,
      hashMatch: true,
      durationMs: 5000,
    }),
    getLatestBackup: async () => record,
    verifyBackupHash: async () => true,
  };
}

function createHealthyHashChain(): HashChainPort {
  return {
    verifyChainIntegrity: async (worldId) => ({
      worldId,
      valid: true,
      chainLength: 1000,
      brokenAt: null,
      headHash: 'head-hash-abc',
    }),
    getChainHead: async () => 'head-hash-abc',
    getChainLength: async () => 1000,
  };
}

function createBalancedLedger(supply = 1_000_000_000n): LedgerReconciliationPort {
  return {
    getTotalSupply: async () => supply,
    getSumOfBalances: async () => supply,
    getWorldBalances: async () => [
      { worldId: 'w1', totalBalance: supply / 2n, accountCount: 100 },
      { worldId: 'w2', totalBalance: supply / 2n, accountCount: 50 },
    ],
  };
}

function createHealthyGeoReplication(): GeoReplicationPort {
  return {
    getProviderStatus: async (providerId) => ({
      providerId,
      healthy: true,
      copyCount: 3,
      lastSyncAt: 900_000,
      lagMs: 200,
    }),
    getProviderIds: () => ['provider-a', 'provider-b', 'provider-c'],
    getCopyCount: async () => 9,
    verifyCrossRegionConsistency: async () => true,
  };
}

function createHealthyAuditLog(): AuditLogPort {
  return {
    getLatestEntry: async () => ({
      entryId: 'audit-1',
      timestamp: 900_000,
      action: 'snapshot_created',
      actorId: 'system',
      previousHash: 'prev-hash',
      hash: 'curr-hash',
    }),
    verifyChain: async () => true,
    getEntryCount: async () => 500,
  };
}

// ─── Setup helper ───────────────────────────────────────────────

function setup(overrides?: {
  walArchive?: WalArchivePort;
  replication?: ReplicationPort;
  backup?: BackupPort;
  hashChain?: HashChainPort;
  ledger?: LedgerReconciliationPort;
  geoReplication?: GeoReplicationPort;
  auditLog?: AuditLogPort;
  config?: Record<string, unknown>;
}) {
  const clock = createFakeClock();
  const ids = createFakeIds();
  const logger = createFakeLogger();
  const engine = createDataIntegrityEngine({
    clock,
    idGenerator: ids,
    logger,
    walArchive: overrides?.walArchive ?? createHealthyWalArchive(),
    replication: overrides?.replication ?? createHealthyReplication(),
    backup: overrides?.backup ?? createHealthyBackup(),
    hashChain: overrides?.hashChain ?? createHealthyHashChain(),
    ledger: overrides?.ledger ?? createBalancedLedger(),
    geoReplication: overrides?.geoReplication ?? createHealthyGeoReplication(),
    auditLog: overrides?.auditLog ?? createHealthyAuditLog(),
  }, overrides?.config as undefined);
  return { engine, clock, logger };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('DataIntegrityEngine', () => {

  // ─── WAL Archive ────────────────────────────────────────────

  describe('WAL archive check', () => {
    it('ok when lag is within range', async () => {
      const { engine } = setup();
      const check = await engine.checkWalArchive();
      expect(check.severity).toBe('ok');
      expect(check.category).toBe('wal-archive');
    });

    it('warning when lag exceeds warning threshold', async () => {
      const { engine } = setup({ walArchive: createHealthyWalArchive(50_000) });
      const check = await engine.checkWalArchive();
      expect(check.severity).toBe('warning');
    });

    it('critical when lag exceeds critical threshold', async () => {
      const { engine } = setup({ walArchive: createHealthyWalArchive(500_000) });
      const check = await engine.checkWalArchive();
      expect(check.severity).toBe('critical');
    });
  });

  // ─── Replication ────────────────────────────────────────────

  describe('replication check', () => {
    it('ok when all replicas are healthy', async () => {
      const { engine } = setup();
      const checks = await engine.checkReplication();
      expect(checks).toHaveLength(2);
      for (const c of checks) {
        expect(c.severity).toBe('ok');
      }
    });

    it('critical when replica is not streaming', async () => {
      const { engine } = setup({
        replication: {
          ...createHealthyReplication(),
          verifyReplicaStreaming: async () => false,
        },
      });
      const checks = await engine.checkReplication();
      expect(checks.some(c => c.severity === 'critical')).toBe(true);
    });

    it('warning when replica lag is elevated', async () => {
      const { engine } = setup({
        replication: createHealthyReplication(5_000),
      });
      const checks = await engine.checkReplication();
      expect(checks.some(c => c.severity === 'warning')).toBe(true);
    });
  });

  // ─── Backup ─────────────────────────────────────────────────

  describe('backup check', () => {
    it('ok when backup is recent and hash valid', async () => {
      const { engine } = setup();
      const check = await engine.checkBackup();
      expect(check.severity).toBe('ok');
    });

    it('critical when no backup exists', async () => {
      const { engine } = setup({
        backup: {
          ...createHealthyBackup(),
          getLatestBackup: async () => null,
        },
      });
      const check = await engine.checkBackup();
      expect(check.severity).toBe('critical');
    });

    it('critical when hash verification fails', async () => {
      const { engine } = setup({
        backup: {
          ...createHealthyBackup(),
          verifyBackupHash: async () => false,
        },
      });
      const check = await engine.checkBackup();
      expect(check.severity).toBe('critical');
    });
  });

  // ─── Hash Chains ────────────────────────────────────────────

  describe('hash chain check', () => {
    it('ok when all chains are valid', async () => {
      const { engine } = setup();
      const checks = await engine.checkHashChains(['world-1', 'world-2']);
      expect(checks).toHaveLength(2);
      for (const c of checks) {
        expect(c.severity).toBe('ok');
      }
    });

    it('critical when chain is broken', async () => {
      const { engine } = setup({
        hashChain: {
          ...createHealthyHashChain(),
          verifyChainIntegrity: async (worldId) => ({
            worldId,
            valid: false,
            chainLength: 500,
            brokenAt: 250,
            headHash: 'corrupt',
          }),
        },
      });
      const checks = await engine.checkHashChains(['world-1']);
      expect(checks[0]!.severity).toBe('critical');
    });
  });

  // ─── Ledger Reconciliation ──────────────────────────────────

  describe('ledger balance check', () => {
    it('ok when supply equals sum of balances', async () => {
      const { engine } = setup();
      const check = await engine.checkLedgerBalance();
      expect(check.severity).toBe('ok');
      expect(check.category).toBe('ledger');
    });

    it('critical when ledger is imbalanced', async () => {
      const { engine } = setup({
        ledger: {
          getTotalSupply: async () => 1_000_000n,
          getSumOfBalances: async () => 999_000n,
          getWorldBalances: async () => [],
        },
      });
      const check = await engine.checkLedgerBalance();
      expect(check.severity).toBe('critical');
    });
  });

  // ─── Geo Replication ────────────────────────────────────────

  describe('geo-replication check', () => {
    it('ok when enough providers and copies', async () => {
      const { engine } = setup();
      const check = await engine.checkGeoReplication();
      expect(check.severity).toBe('ok');
    });

    it('critical when too few healthy providers', async () => {
      const { engine } = setup({
        geoReplication: {
          ...createHealthyGeoReplication(),
          getProviderStatus: async (providerId) => ({
            providerId,
            healthy: false,
            copyCount: 1,
            lastSyncAt: 0,
            lagMs: 99999,
          }),
        },
      });
      const check = await engine.checkGeoReplication();
      expect(check.severity).toBe('critical');
    });

    it('warning when cross-region consistency fails', async () => {
      const { engine } = setup({
        geoReplication: {
          ...createHealthyGeoReplication(),
          verifyCrossRegionConsistency: async () => false,
        },
      });
      const check = await engine.checkGeoReplication();
      expect(check.severity).toBe('warning');
    });
  });

  // ─── Audit Log ──────────────────────────────────────────────

  describe('audit log check', () => {
    it('ok when audit log has entries', async () => {
      const { engine } = setup();
      const check = await engine.checkAuditLog();
      expect(check.severity).toBe('ok');
    });

    it('warning when audit log is empty', async () => {
      const { engine } = setup({
        auditLog: {
          getLatestEntry: async () => null,
          verifyChain: async () => true,
          getEntryCount: async () => 0,
        },
      });
      const check = await engine.checkAuditLog();
      expect(check.severity).toBe('warning');
    });
  });

  // ─── Full Report ────────────────────────────────────────────

  describe('full report', () => {
    it('generates healthy report when all systems ok', async () => {
      const { engine } = setup();
      const report = await engine.runFullReport();

      expect(report.overallSeverity).toBe('ok');
      expect(report.walHealthy).toBe(true);
      expect(report.replicationHealthy).toBe(true);
      expect(report.backupVerified).toBe(true);
      expect(report.ledgerBalanced).toBe(true);
      expect(report.geoReplicationHealthy).toBe(true);
      expect(report.auditLogIntact).toBe(true);
      expect(report.checks.length).toBeGreaterThan(0);
    });

    it('overall severity is critical when any check is critical', async () => {
      const { engine } = setup({
        walArchive: createHealthyWalArchive(500_000),
      });
      const report = await engine.runFullReport();
      expect(report.overallSeverity).toBe('critical');
      expect(report.walHealthy).toBe(false);
    });

    it('overall severity is warning when no critical but has warning', async () => {
      const { engine } = setup({
        geoReplication: {
          ...createHealthyGeoReplication(),
          verifyCrossRegionConsistency: async () => false,
        },
      });
      const report = await engine.runFullReport();
      expect(report.overallSeverity).toBe('warning');
    });
  });

  // ─── Disaster Recovery Drills ───────────────────────────────

  describe('disaster recovery drills', () => {
    it('schedules a drill', () => {
      const { engine } = setup();
      const drill = engine.scheduleDrill(2_000_000);

      expect(drill.drillId).toBeDefined();
      expect(drill.phase).toBe('scheduled');
      expect(drill.scheduledAt).toBe(2_000_000);
      expect(drill.steps).toHaveLength(5);
      for (const step of drill.steps) {
        expect(step.status).toBe('pending');
      }
    });

    it('runs a drill successfully with healthy systems', async () => {
      const { engine } = setup();
      const drill = engine.scheduleDrill(1_500_000);
      const result = await engine.runDrill(drill.drillId);

      expect(result.phase).toBe('completed');
      expect(result.fullStateRestored).toBe(true);
      for (const step of result.steps) {
        expect(step.status).toBe('passed');
      }
    });

    it('drill fails when backup restore fails', async () => {
      const { engine } = setup({
        backup: {
          ...createHealthyBackup(),
          restoreToTestCluster: async () => ({
            backupId: 'backup-latest',
            success: false,
            restoredAt: 0,
            validationPassed: false,
            hashMatch: false,
            durationMs: 1000,
          }),
        },
      });
      const drill = engine.scheduleDrill(1_500_000);
      const result = await engine.runDrill(drill.drillId);

      expect(result.phase).toBe('failed');
      expect(result.fullStateRestored).toBe(false);
    });

    it('throws on unknown drill id', async () => {
      const { engine } = setup();
      await expect(engine.runDrill('nonexistent')).rejects.toThrow('not found');
    });
  });

  // ─── Stats ──────────────────────────────────────────────────

  describe('stats', () => {
    it('starts with zero stats', () => {
      const { engine } = setup();
      const stats = engine.getStats();

      expect(stats.totalChecksRun).toBe(0);
      expect(stats.checksOk).toBe(0);
      expect(stats.checksWarning).toBe(0);
      expect(stats.checksCritical).toBe(0);
      expect(stats.drillsPassed).toBe(0);
      expect(stats.drillsFailed).toBe(0);
    });

    it('accumulates check counts', async () => {
      const { engine } = setup();
      await engine.checkWalArchive();
      await engine.checkLedgerBalance();

      const stats = engine.getStats();
      expect(stats.totalChecksRun).toBe(2);
      expect(stats.checksOk).toBe(2);
    });

    it('tracks drill results', async () => {
      const { engine } = setup();
      const drill = engine.scheduleDrill(0);
      await engine.runDrill(drill.drillId);

      const stats = engine.getStats();
      expect(stats.drillsPassed).toBe(1);
      expect(stats.lastDrillAt).toBeGreaterThan(0);
    });
  });
});
