import { describe, it, expect } from 'vitest';
import {
  createZeroTrustEngine,
  type ZeroTrustEngine,
  type ZeroTrustEngineDeps,
  type TrustContext,
  type ZeroTrustPolicy,
  type DevicePosture,
  type BehaviorAnomaly,
} from '../zero-trust-engine.js';

function createTestDeps(): ZeroTrustEngineDeps {
  let now = BigInt(1000000000000);
  return {
    clock: {
      nowMicroseconds: () => now,
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
    maxHistoryPerIdentity: 100,
    anomalyExpirationUs: BigInt(86400000000),
  };
}

function createTestContext(): TrustContext {
  return {
    identityId: 'identity-1',
    deviceId: 'device-1',
    ipAddress: '192.168.1.100',
    resource: '/api/data',
    action: 'read',
    timestamp: BigInt(1000000000000),
    userAgent: 'TestAgent/1.0',
    geoLocation: 'US',
  };
}

function createTestPolicy(): ZeroTrustPolicy {
  return {
    name: 'test-policy',
    resource: '/api/data',
    action: 'read',
    requiredScore: 0.7,
    mfaThreshold: 0.5,
    requiredFactors: ['IDENTITY', 'DEVICE', 'NETWORK'],
  };
}

describe('ZeroTrustEngine', () => {
  describe('Policy Management', () => {
    it('registers and counts policies', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      expect(engine.getPolicyCount()).toBe(0);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      expect(engine.getPolicyCount()).toBe(1);
    });

    it('removes registered policies', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const removed = engine.removePolicy('test-policy');
      expect(removed).toBe(true);
      expect(engine.getPolicyCount()).toBe(0);
    });

    it('returns false when removing non-existent policy', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const removed = engine.removePolicy('nonexistent');
      expect(removed).toBe(false);
    });

    it('handles multiple policies', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy1: ZeroTrustPolicy = {
        name: 'policy-1',
        resource: '/api/users',
        action: 'write',
        requiredScore: 0.8,
        mfaThreshold: 0.6,
        requiredFactors: [],
      };

      const policy2: ZeroTrustPolicy = {
        name: 'policy-2',
        resource: '/api/admin',
        action: '*',
        requiredScore: 0.9,
        mfaThreshold: 0.7,
        requiredFactors: [],
      };

      engine.registerPolicy(policy1);
      engine.registerPolicy(policy2);

      expect(engine.getPolicyCount()).toBe(2);
    });
  });

  describe('Device Posture', () => {
    it('updates and retrieves device posture', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const posture: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.2',
        antivirusActive: true,
        encryptionEnabled: true,
      };

      engine.updateDevicePosture(posture);

      const retrieved = engine.getDevicePosture('device-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.deviceId).toBe('device-1');
      expect(retrieved?.compliant).toBe(true);
    });

    it('returns null for unknown device', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const posture = engine.getDevicePosture('unknown-device');
      expect(posture).toBeNull();
    });

    it('updates existing device posture', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const posture1: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.0',
        antivirusActive: true,
        encryptionEnabled: true,
      };

      const posture2: DevicePosture = {
        deviceId: 'device-1',
        compliant: false,
        lastSeen: BigInt(2000000000000),
        osVersion: '14.1',
        antivirusActive: false,
        encryptionEnabled: true,
      };

      engine.updateDevicePosture(posture1);
      engine.updateDevicePosture(posture2);

      const retrieved = engine.getDevicePosture('device-1');
      expect(retrieved?.compliant).toBe(false);
      expect(retrieved?.osVersion).toBe('14.1');
    });
  });

  describe('Anomaly Tracking', () => {
    it('records and retrieves anomalies', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const anomaly: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'unusual-location',
        severity: 0.7,
        detectedAt: BigInt(1000000000000),
        description: 'Access from new country',
      };

      engine.recordAnomaly(anomaly);

      const anomalies = engine.getAnomalies('identity-1');
      expect(anomalies.length).toBe(1);
      expect(anomalies[0]?.anomalyType).toBe('unusual-location');
    });

    it('returns empty array for identity with no anomalies', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const anomalies = engine.getAnomalies('identity-1');
      expect(anomalies.length).toBe(0);
    });

    it('accumulates multiple anomalies per identity', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const anomaly1: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'unusual-time',
        severity: 0.5,
        detectedAt: BigInt(1000000000000),
        description: 'Access at 3 AM',
      };

      const anomaly2: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'high-frequency',
        severity: 0.8,
        detectedAt: BigInt(1000001000000),
        description: 'Too many requests',
      };

      engine.recordAnomaly(anomaly1);
      engine.recordAnomaly(anomaly2);

      const anomalies = engine.getAnomalies('identity-1');
      expect(anomalies.length).toBe(2);
    });

    it('clears expired anomalies', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const oldAnomaly: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'old',
        severity: 0.5,
        detectedAt: BigInt(500000000000),
        description: 'Old anomaly',
      };

      const recentAnomaly: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'recent',
        severity: 0.6,
        detectedAt: BigInt(900000000000),
        description: 'Recent anomaly',
      };

      engine.recordAnomaly(oldAnomaly);
      engine.recordAnomaly(recentAnomaly);

      const cleared = engine.clearExpiredAnomalies(BigInt(200000000000));
      expect(cleared).toBe(1);

      const remaining = engine.getAnomalies('identity-1');
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.anomalyType).toBe('recent');
    });

    it('removes identity when all anomalies expire', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const anomaly: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'old',
        severity: 0.5,
        detectedAt: BigInt(500000000000),
        description: 'Old',
      };

      engine.recordAnomaly(anomaly);
      engine.clearExpiredAnomalies(BigInt(100000000000));

      const anomalies = engine.getAnomalies('identity-1');
      expect(anomalies.length).toBe(0);
    });
  });

  describe('Access Evaluation', () => {
    it('denies access when no policy matches', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).toBe('DENY');
      expect(result.reason).toContain('No matching policy');
    });

    it('allows access with high trust score', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const posture: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.2',
        antivirusActive: true,
        encryptionEnabled: true,
      };
      engine.updateDevicePosture(posture);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).toBe('ALLOW');
      expect(result.trustScore.overall).toBeGreaterThan(0.7);
    });

    it('requires MFA with marginal trust score', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy: ZeroTrustPolicy = {
        name: 'high-security',
        resource: '/api/data',
        action: 'read',
        requiredScore: 0.9,
        mfaThreshold: 0.6,
        requiredFactors: [],
      };
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).toBe('ALLOW_WITH_MFA');
    });

    it('quarantines on behavioral anomaly', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const anomaly: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'suspicious-activity',
        severity: 0.9,
        detectedAt: BigInt(999000000000),
        description: 'Very suspicious',
      };
      engine.recordAnomaly(anomaly);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).toBe('QUARANTINE');
    });

    it('matches wildcard resource policy', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy: ZeroTrustPolicy = {
        name: 'wildcard-policy',
        resource: '*',
        action: 'read',
        requiredScore: 0.5,
        mfaThreshold: 0.3,
        requiredFactors: [],
      };
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).not.toBe('DENY');
    });

    it('matches wildcard action policy', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy: ZeroTrustPolicy = {
        name: 'wildcard-action',
        resource: '/api/data',
        action: '*',
        requiredScore: 0.5,
        mfaThreshold: 0.3,
        requiredFactors: [],
      };
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).not.toBe('DENY');
    });
  });

  describe('Trust Score Computation', () => {
    it('computes trust score with all factors', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.trustScore.factors.size).toBe(5);
      expect(result.trustScore.factors.has('IDENTITY')).toBe(true);
      expect(result.trustScore.factors.has('DEVICE')).toBe(true);
      expect(result.trustScore.factors.has('NETWORK')).toBe(true);
      expect(result.trustScore.factors.has('BEHAVIOR')).toBe(true);
      expect(result.trustScore.factors.has('TIME_OF_DAY')).toBe(true);
    });

    it('weighs device compliance in trust score', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const nonCompliantPosture: DevicePosture = {
        deviceId: 'device-1',
        compliant: false,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.0',
        antivirusActive: false,
        encryptionEnabled: false,
      };
      engine.updateDevicePosture(nonCompliantPosture);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      const deviceScore = result.trustScore.factors.get('DEVICE');
      expect(deviceScore).toBeLessThan(0.2);
    });

    it('gives high network score to private IPs', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      const networkScore = result.trustScore.factors.get('NETWORK');
      expect(networkScore).toBeGreaterThan(0.8);
    });

    it('penalizes unknown geo-location', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context: TrustContext = {
        ...createTestContext(),
        ipAddress: '203.0.113.42',
        geoLocation: 'unknown',
      };
      const result = engine.evaluateAccess(context);

      const networkScore = result.trustScore.factors.get('NETWORK');
      expect(networkScore).toBeLessThan(0.5);
    });
  });

  describe('Access History', () => {
    it('records access decisions in history', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      engine.evaluateAccess(context);

      const history = engine.getAccessHistory('identity-1', 10);
      expect(history.length).toBe(1);
      expect(history[0]?.resource).toBe('/api/data');
    });

    it('returns empty history for unknown identity', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const history = engine.getAccessHistory('unknown', 10);
      expect(history.length).toBe(0);
    });

    it('limits history size per identity', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      for (let i = 0; i < 150; i += 1) {
        engine.evaluateAccess(context);
      }

      const history = engine.getAccessHistory('identity-1', 200);
      expect(history.length).toBe(100);
    });

    it('respects limit parameter', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      for (let i = 0; i < 20; i += 1) {
        engine.evaluateAccess(context);
      }

      const history = engine.getAccessHistory('identity-1', 5);
      expect(history.length).toBe(5);
    });

    it('returns full history when limit exceeds size', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      for (let i = 0; i < 3; i += 1) {
        engine.evaluateAccess(context);
      }

      const history = engine.getAccessHistory('identity-1', 100);
      expect(history.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles device with stale lastSeen', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const stalePosture: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(500000000000),
        osVersion: '14.0',
        antivirusActive: true,
        encryptionEnabled: true,
      };
      engine.updateDevicePosture(stalePosture);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      const deviceScore = result.trustScore.factors.get('DEVICE');
      expect(deviceScore).toBeLessThan(0.8);
    });

    it('computes time-of-day factor for business hours', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const businessHoursUs = BigInt(14 * 3600000000);
      const context: TrustContext = {
        ...createTestContext(),
        timestamp: businessHoursUs,
      };
      const result = engine.evaluateAccess(context);

      const timeScore = result.trustScore.factors.get('TIME_OF_DAY');
      expect(timeScore).toBe(1.0);
    });

    it('penalizes access at unusual hours', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const nightTimeUs = BigInt(3 * 3600000000);
      const context: TrustContext = {
        ...createTestContext(),
        timestamp: nightTimeUs,
      };
      const result = engine.evaluateAccess(context);

      const timeScore = result.trustScore.factors.get('TIME_OF_DAY');
      expect(timeScore).toBeLessThan(0.6);
    });

    it('handles policy with no required factors', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy: ZeroTrustPolicy = {
        name: 'no-required',
        resource: '/api/data',
        action: 'read',
        requiredScore: 0.6,
        mfaThreshold: 0.4,
        requiredFactors: [],
      };
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.trustScore.overall).toBeGreaterThan(0);
    });

    it('handles identity with successful history', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const posture: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.2',
        antivirusActive: true,
        encryptionEnabled: true,
      };
      engine.updateDevicePosture(posture);

      const context = createTestContext();
      for (let i = 0; i < 5; i += 1) {
        engine.evaluateAccess(context);
      }

      const laterContext: TrustContext = {
        ...context,
        timestamp: BigInt(1000001000000),
      };
      const result = engine.evaluateAccess(laterContext);

      const identityScore = result.trustScore.factors.get('IDENTITY');
      expect(identityScore).toBeGreaterThan(0.5);
    });
  });

  describe('Additional Coverage', () => {
    it('handles multiple policies for same resource', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy1: ZeroTrustPolicy = {
        name: 'policy-1',
        resource: '/api/data',
        action: 'read',
        requiredScore: 0.7,
        mfaThreshold: 0.5,
        requiredFactors: [],
      };

      const policy2: ZeroTrustPolicy = {
        name: 'policy-2',
        resource: '/api/data',
        action: 'write',
        requiredScore: 0.9,
        mfaThreshold: 0.7,
        requiredFactors: [],
      };

      engine.registerPolicy(policy1);
      engine.registerPolicy(policy2);

      expect(engine.getPolicyCount()).toBe(2);
    });

    it('handles empty anomaly list', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const cleared = engine.clearExpiredAnomalies(BigInt(1000000000));
      expect(cleared).toBe(0);
    });

    it('handles empty history', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const history = engine.getAccessHistory('unknown-identity', 100);
      expect(history).toEqual([]);
    });

    it('handles public IP addresses', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context: TrustContext = {
        ...createTestContext(),
        ipAddress: '8.8.8.8',
      };
      const result = engine.evaluateAccess(context);

      expect(result.trustScore.factors.has('NETWORK')).toBe(true);
    });

    it('tracks trust score over time', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result1 = engine.evaluateAccess(context);
      const result2 = engine.evaluateAccess(context);

      expect(result2.trustScore.overall).toBeGreaterThanOrEqual(result1.trustScore.overall);
    });

    it('handles device without optional features', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const posture: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.0',
        antivirusActive: false,
        encryptionEnabled: false,
      };
      engine.updateDevicePosture(posture);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).toBeDefined();
    });

    it('validates all trust factors are evaluated', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.trustScore.factors.size).toBe(5);
    });

    it('handles rapid successive evaluations', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context = createTestContext();
      for (let i = 0; i < 10; i += 1) {
        engine.evaluateAccess(context);
      }

      const history = engine.getAccessHistory('identity-1', 20);
      expect(history.length).toBe(10);
    });

    it('handles evening hours time factor', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const eveningUs = BigInt(20 * 3600000000);
      const context: TrustContext = {
        ...createTestContext(),
        timestamp: eveningUs,
      };
      const result = engine.evaluateAccess(context);

      const timeScore = result.trustScore.factors.get('TIME_OF_DAY');
      expect(timeScore).toBeLessThan(1.0);
      expect(timeScore).toBeGreaterThan(0.5);
    });

    it('prevents anomaly from causing negative trust score', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const anomaly: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'extreme',
        severity: 2.0,
        detectedAt: BigInt(999000000000),
        description: 'Extreme severity',
      };
      engine.recordAnomaly(anomaly);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      const behaviorScore = result.trustScore.factors.get('BEHAVIOR');
      expect(behaviorScore).toBeGreaterThanOrEqual(0);
    });

    it('handles policy with specific required factors', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy: ZeroTrustPolicy = {
        name: 'device-only',
        resource: '/api/data',
        action: 'read',
        requiredScore: 0.8,
        mfaThreshold: 0.6,
        requiredFactors: ['DEVICE', 'NETWORK'],
      };
      engine.registerPolicy(policy);

      const posture: DevicePosture = {
        deviceId: 'device-1',
        compliant: true,
        lastSeen: BigInt(1000000000000),
        osVersion: '14.2',
        antivirusActive: true,
        encryptionEnabled: true,
      };
      engine.updateDevicePosture(posture);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      expect(result.decision).toBeDefined();
    });

    it('handles concurrent access evaluations', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const context1 = createTestContext();
      const context2: TrustContext = {
        ...createTestContext(),
        identityId: 'identity-2',
      };

      engine.evaluateAccess(context1);
      engine.evaluateAccess(context2);

      const history1 = engine.getAccessHistory('identity-1', 10);
      const history2 = engine.getAccessHistory('identity-2', 10);

      expect(history1.length).toBe(1);
      expect(history2.length).toBe(1);
    });

    it('validates anomaly severity impact', () => {
      const deps = createTestDeps();
      const engine = createZeroTrustEngine(deps);

      const policy = createTestPolicy();
      engine.registerPolicy(policy);

      const lowSeverity: BehaviorAnomaly = {
        identityId: 'identity-1',
        anomalyType: 'low',
        severity: 0.1,
        detectedAt: BigInt(999000000000),
        description: 'Low severity',
      };
      engine.recordAnomaly(lowSeverity);

      const context = createTestContext();
      const result = engine.evaluateAccess(context);

      const behaviorScore = result.trustScore.factors.get('BEHAVIOR');
      expect(behaviorScore).toBeGreaterThan(0.8);
    });
  });
});
