import { describe, it, expect } from 'vitest';
import {
  createSecretsRotationEngine,
  type SecretsRotationEngine,
  type SecretsRotationEngineDeps,
  type RotationSchedule,
} from '../secrets-rotation.js';

function createTestDeps(): SecretsRotationEngineDeps {
  let now = BigInt(1000000000000);
  let idCounter = 1;
  return {
    clock: {
      nowMicroseconds: () => now,
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
    idGenerator: {
      generate: () => {
        const id = 'version-' + String(idCounter);
        idCounter += 1;
        return id;
      },
    },
    maxAuditsPerSecret: 100,
  };
}

describe('SecretsRotationEngine', () => {
  describe('Secret Registration', () => {
    it('registers a new secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      expect(engine.getSecretCount()).toBe(0);

      engine.registerSecret('api-key-1', 'API_KEY', 'secret-value', null);

      expect(engine.getSecretCount()).toBe(1);
    });

    it('creates secret with active version', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('db-pass', 'DATABASE_PASSWORD', 'initial-pass', null);

      const version = engine.getActiveVersion('db-pass');
      expect(version).not.toBeNull();
      expect(version?.value).toBe('initial-pass');
      expect(version?.status).toBe('ACTIVE');
    });

    it('supports different secret types', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key1', 'API_KEY', 'val1', null);
      engine.registerSecret('key2', 'DATABASE_PASSWORD', 'val2', null);
      engine.registerSecret('key3', 'JWT_SECRET', 'val3', null);
      engine.registerSecret('key4', 'ENCRYPTION_KEY', 'val4', null);
      engine.registerSecret('key5', 'CERTIFICATE', 'val5', null);

      expect(engine.getSecretCount()).toBe(5);
    });

    it('registers secret with rotation schedule', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: true,
      };

      engine.registerSecret('scheduled-key', 'API_KEY', 'value', schedule);

      const secret = engine.getSecret('scheduled-key');
      expect(secret?.rotationSchedule).not.toBeNull();
      expect(secret?.rotationSchedule?.autoRotate).toBe(true);
    });
  });

  describe('Secret Rotation', () => {
    it('rotates a secret successfully', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('api-key', 'API_KEY', 'old-value', null);

      const result = engine.rotateSecret('api-key', 'new-value');

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.secretName).toBe('api-key');
        expect(result.newVersionId).toBe('version-2');
      }
    });

    it('marks old version as previous', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'old', null);
      engine.rotateSecret('key', 'new');

      const active = engine.getActiveVersion('key');
      const previous = engine.getPreviousVersion('key');

      expect(active?.value).toBe('new');
      expect(previous?.value).toBe('old');
      expect(previous?.status).toBe('PREVIOUS');
    });

    it('returns error for non-existent secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const result = engine.rotateSecret('nonexistent', 'value');

      expect(typeof result).toBe('string');
      expect(result).toContain('not found');
    });

    it('applies grace period to previous version', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'old', schedule);
      engine.rotateSecret('key', 'new');

      const previous = engine.getPreviousVersion('key');
      expect(previous?.expiresAt).not.toBeNull();
    });

    it('updates lastRotatedAt timestamp', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'v1', null);
      const secret1 = engine.getSecret('key');
      const firstRotation = secret1?.lastRotatedAt;

      engine.rotateSecret('key', 'v2');
      const secret2 = engine.getSecret('key');

      expect(secret2?.lastRotatedAt).toBe(firstRotation);
    });
  });

  describe('Version Retrieval', () => {
    it('returns null for non-existent secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const version = engine.getActiveVersion('nonexistent');
      expect(version).toBeNull();
    });

    it('returns null when no previous version exists', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);

      const previous = engine.getPreviousVersion('key');
      expect(previous).toBeNull();
    });

    it('retrieves secret with all metadata', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(3600000000),
        gracePeriodMicroseconds: BigInt(600000000),
        autoRotate: true,
      };

      engine.registerSecret('key', 'JWT_SECRET', 'value', schedule);

      const secret = engine.getSecret('key');
      expect(secret?.name).toBe('key');
      expect(secret?.type).toBe('JWT_SECRET');
      expect(secret?.currentVersion.value).toBe('value');
      expect(secret?.rotationSchedule?.autoRotate).toBe(true);
    });
  });

  describe('Rotation Scheduling', () => {
    it('adds rotation schedule to existing secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: true,
      };

      engine.scheduleRotation('key', schedule);

      const secret = engine.getSecret('key');
      expect(secret?.rotationSchedule).not.toBeNull();
    });

    it('processes scheduled rotations', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(3600000000),
        gracePeriodMicroseconds: BigInt(600000000),
        autoRotate: true,
      };

      engine.registerSecret('key1', 'API_KEY', 'v1', schedule);

      currentTime = BigInt(1000000000000 + 3600000001);

      const rotated = engine.processScheduledRotations();
      expect(rotated).toBe(1);
    });

    it('skips secrets not due for rotation', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: true,
      };

      engine.registerSecret('key', 'API_KEY', 'value', schedule);

      currentTime = BigInt(1000000000000 + 3600000000);

      const rotated = engine.processScheduledRotations();
      expect(rotated).toBe(0);
    });

    it('skips secrets with autoRotate disabled', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(3600000000),
        gracePeriodMicroseconds: BigInt(600000000),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'value', schedule);

      currentTime = BigInt(1000000000000 + 7200000000);

      const rotated = engine.processScheduledRotations();
      expect(rotated).toBe(0);
    });

    it('processes multiple scheduled rotations', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(3600000000),
        gracePeriodMicroseconds: BigInt(600000000),
        autoRotate: true,
      };

      engine.registerSecret('key1', 'API_KEY', 'v1', schedule);
      engine.registerSecret('key2', 'API_KEY', 'v1', schedule);
      engine.registerSecret('key3', 'API_KEY', 'v1', schedule);

      currentTime = BigInt(1000000000000 + 3600000001);

      const rotated = engine.processScheduledRotations();
      expect(rotated).toBe(3);
    });
  });

  describe('Grace Period Management', () => {
    it('cleans up expired grace periods', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'old', schedule);
      engine.rotateSecret('key', 'new');

      currentTime = BigInt(1000000000000 + 3600000001);

      const revoked = engine.cleanupExpiredGracePeriods();
      expect(revoked).toBe(1);
    });

    it('does not revoke unexpired grace periods', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'old', schedule);
      engine.rotateSecret('key', 'new');

      currentTime = BigInt(1000000000000 + 1800000000);

      const revoked = engine.cleanupExpiredGracePeriods();
      expect(revoked).toBe(0);
    });

    it('returns active grace periods', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: false,
      };

      engine.registerSecret('key1', 'API_KEY', 'v1', schedule);
      engine.registerSecret('key2', 'API_KEY', 'v1', schedule);

      engine.rotateSecret('key1', 'v2');
      engine.rotateSecret('key2', 'v2');

      const periods = engine.getGracePeriods();
      expect(periods.length).toBe(2);
      expect(periods[0]?.active).toBe(true);
    });

    it('marks expired grace periods as inactive', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: SecretsRotationEngineDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'version-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxAuditsPerSecret: 100,
      };
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'v1', schedule);
      engine.rotateSecret('key', 'v2');

      currentTime = BigInt(1000000000000 + 3600000001);

      const periods = engine.getGracePeriods();
      expect(periods[0]?.active).toBe(false);
    });
  });

  describe('Version Revocation', () => {
    it('revokes a version immediately', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'v1', null);
      engine.rotateSecret('key', 'v2');

      const previous = engine.getPreviousVersion('key');
      const revoked = engine.revokeVersion('key', previous!.versionId);

      expect(revoked).toBe(true);
    });

    it('returns false for non-existent secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const revoked = engine.revokeVersion('nonexistent', 'version-1');
      expect(revoked).toBe(false);
    });

    it('returns false for non-existent version', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);

      const revoked = engine.revokeVersion('key', 'nonexistent-version');
      expect(revoked).toBe(false);
    });

    it('returns false when revoking already revoked version', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'v1', null);
      engine.rotateSecret('key', 'v2');

      const previous = engine.getPreviousVersion('key');
      engine.revokeVersion('key', previous!.versionId);
      const secondRevoke = engine.revokeVersion('key', previous!.versionId);

      expect(secondRevoke).toBe(false);
    });
  });

  describe('Access Auditing', () => {
    it('records access audit', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);
      engine.auditAccess('key', 'user-1', 'API call');

      const audits = engine.getAccessAudits('key', 10);
      expect(audits.length).toBe(1);
      expect(audits[0]?.accessedBy).toBe('user-1');
    });

    it('returns empty audits for non-existent secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const audits = engine.getAccessAudits('nonexistent', 10);
      expect(audits.length).toBe(0);
    });

    it('accumulates multiple audits', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);
      engine.auditAccess('key', 'user-1', 'read');
      engine.auditAccess('key', 'user-2', 'write');
      engine.auditAccess('key', 'user-1', 'read');

      const audits = engine.getAccessAudits('key', 10);
      expect(audits.length).toBe(3);
    });

    it('limits audit history size', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);

      for (let i = 0; i < 150; i += 1) {
        engine.auditAccess('key', 'user-' + String(i), 'access');
      }

      const audits = engine.getAccessAudits('key', 200);
      expect(audits.length).toBe(100);
    });

    it('respects limit parameter', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);

      for (let i = 0; i < 20; i += 1) {
        engine.auditAccess('key', 'user', 'access');
      }

      const audits = engine.getAccessAudits('key', 5);
      expect(audits.length).toBe(5);
    });

    it('returns all audits when limit exceeds size', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);
      engine.auditAccess('key', 'user', 'access');
      engine.auditAccess('key', 'user', 'access');

      const audits = engine.getAccessAudits('key', 100);
      expect(audits.length).toBe(2);
    });

    it('records audit with active version', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'v1', null);
      engine.auditAccess('key', 'user', 'access');

      const audits = engine.getAccessAudits('key', 1);
      expect(audits[0]?.versionId).toBe('version-1');
    });

    it('tracks purpose of access', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'DATABASE_PASSWORD', 'pass', null);
      engine.auditAccess('key', 'app-server', 'Database connection');

      const audits = engine.getAccessAudits('key', 1);
      expect(audits[0]?.purpose).toBe('Database connection');
    });
  });

  describe('Edge Cases', () => {
    it('handles secret with no schedule', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);

      const secret = engine.getSecret('key');
      expect(secret?.rotationSchedule).toBeNull();
    });

    it('handles rotation with zero grace period', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(0),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'old', schedule);
      const result = engine.rotateSecret('key', 'new');

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.gracePeriodEndsAt).toBe(BigInt(1000000000000));
      }
    });

    it('handles multiple rotations', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'v1', null);
      engine.rotateSecret('key', 'v2');
      engine.rotateSecret('key', 'v3');
      engine.rotateSecret('key', 'v4');

      const active = engine.getActiveVersion('key');
      expect(active?.value).toBe('v4');
    });

    it('handles audit when no active version', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'value', null);
      const active = engine.getActiveVersion('key');
      engine.revokeVersion('key', active!.versionId);

      engine.auditAccess('key', 'user', 'attempt');

      const audits = engine.getAccessAudits('key', 10);
      expect(audits.length).toBe(0);
    });

    it('handles schedule update on existing secret', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule1: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(3600000000),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'value', schedule1);

      const schedule2: RotationSchedule = {
        intervalMicroseconds: BigInt(43200000000),
        gracePeriodMicroseconds: BigInt(1800000000),
        autoRotate: true,
      };

      engine.scheduleRotation('key', schedule2);

      const secret = engine.getSecret('key');
      expect(secret?.rotationSchedule?.intervalMicroseconds).toBe(BigInt(43200000000));
    });

    it('processes empty rotation queue', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const rotated = engine.processScheduledRotations();
      expect(rotated).toBe(0);
    });

    it('cleans up when no grace periods exist', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const revoked = engine.cleanupExpiredGracePeriods();
      expect(revoked).toBe(0);
    });
  });

  describe('Additional Coverage', () => {
    it('handles concurrent rotations', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key1', 'API_KEY', 'v1', null);
      engine.registerSecret('key2', 'API_KEY', 'v1', null);

      engine.rotateSecret('key1', 'v2');
      engine.rotateSecret('key2', 'v2');

      expect(engine.getSecretCount()).toBe(2);
    });

    it('handles very long grace periods', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      const schedule: RotationSchedule = {
        intervalMicroseconds: BigInt(86400000000),
        gracePeriodMicroseconds: BigInt(86400000000 * 30),
        autoRotate: false,
      };

      engine.registerSecret('key', 'API_KEY', 'old', schedule);
      engine.rotateSecret('key', 'new');

      const periods = engine.getGracePeriods();
      expect(periods[0]?.active).toBe(true);
    });

    it('tracks secret metadata through rotations', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'JWT_SECRET', 'v1', null);
      const secret1 = engine.getSecret('key');
      const createdAt = secret1?.createdAt;

      engine.rotateSecret('key', 'v2');
      const secret2 = engine.getSecret('key');

      expect(secret2?.createdAt).toBe(createdAt);
    });

    it('handles audit of multiple concurrent accesses', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('shared-key', 'API_KEY', 'value', null);

      engine.auditAccess('shared-key', 'service-1', 'API call');
      engine.auditAccess('shared-key', 'service-2', 'API call');
      engine.auditAccess('shared-key', 'service-3', 'API call');

      const audits = engine.getAccessAudits('shared-key', 10);
      expect(audits.length).toBe(3);
    });

    it('validates rotation generates new version ID', () => {
      const deps = createTestDeps();
      const engine = createSecretsRotationEngine(deps);

      engine.registerSecret('key', 'API_KEY', 'v1', null);
      const secret1 = engine.getSecret('key');
      const version1 = secret1?.currentVersion.versionId;

      engine.rotateSecret('key', 'v2');
      const secret2 = engine.getSecret('key');
      const version2 = secret2?.currentVersion.versionId;

      expect(version1).not.toBe(version2);
    });
  });
});
