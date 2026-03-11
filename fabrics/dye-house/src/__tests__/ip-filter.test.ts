/**
 * IP Filter Tests
 * Fabric: dye-house
 */

import { describe, it, expect } from 'vitest';
import { createIpFilter } from '../ip-filter.js';

// ============================================================================
// Test Ports
// ============================================================================

function createMockLogger() {
  const logs: Array<{ level: string; msg: string; ctx: Record<string, unknown> }> = [];
  return {
    info: (msg: string, ctx: Record<string, unknown>) => {
      logs.push({ level: 'info', msg, ctx });
    },
    warn: (msg: string, ctx: Record<string, unknown>) => {
      logs.push({ level: 'warn', msg, ctx });
    },
    getLogs: () => logs,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('IpFilter', () => {
  describe('addAllowRule', () => {
    it('should add CIDR allow rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addAllowRule('rule-1', '192.168.1.0/24', 'Internal network');

      expect(result).toBe('OK');

      const rules = filter.getRules();
      expect(rules).toHaveLength(1);
    });

    it('should reject invalid CIDR format', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addAllowRule('rule-1', '192.168.1.0', 'Invalid');

      expect(result).not.toBe('OK');
    });

    it('should reject invalid IP octets', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addAllowRule('rule-1', '999.168.1.0/24', 'Invalid');

      expect(result).not.toBe('OK');
    });

    it('should reject invalid prefix length', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addAllowRule('rule-1', '192.168.1.0/99', 'Invalid');

      expect(result).not.toBe('OK');
    });

    it('should log rule addition', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addAllowRule('rule-1', '192.168.1.0/24', 'Internal network');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Allow rule added')).toBe(true);
    });
  });

  describe('addBlockRule', () => {
    it('should add CIDR block rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked network');

      expect(result).toBe('OK');

      const rules = filter.getRules();
      expect(rules).toHaveLength(1);
    });

    it('should log rule addition', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked network');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Block rule added')).toBe(true);
    });
  });

  describe('addExactRule', () => {
    it('should add exact IP match rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addExactRule('rule-1', '192.168.1.100', 'BLOCK', 'Known attacker');

      expect(result).toBe('OK');
    });

    it('should prioritize exact match over CIDR', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addAllowRule('rule-1', '192.168.1.0/24', 'Internal network');
      filter.addExactRule('rule-2', '192.168.1.100', 'BLOCK', 'Known attacker');

      const checkResult = filter.checkIp('192.168.1.100');

      expect(checkResult.action).toBe('BLOCK');
    });

    it('should log exact rule addition', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addExactRule('rule-1', '192.168.1.100', 'BLOCK', 'Known attacker');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Exact rule added')).toBe(true);
    });
  });

  describe('addGeoBlock', () => {
    it('should add geo blocking rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.addGeoBlock('CN', 'BLOCK', 'Geo block policy');

      expect(result).toBe('OK');
    });

    it('should log geo block addition', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addGeoBlock('CN', 'BLOCK', 'Geo block policy');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Geo block added')).toBe(true);
    });
  });

  describe('checkIp', () => {
    it('should allow IP by default', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.checkIp('192.168.1.10');

      expect(result.action).toBe('ALLOW');
      expect(result.matchedRule).toBe('DEFAULT');
    });

    it('should block IP matching block rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked network');

      const result = filter.checkIp('10.5.10.20');

      expect(result.action).toBe('BLOCK');
    });

    it('should allow IP matching allow rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.setDefaultAction('BLOCK');
      filter.addAllowRule('rule-1', '192.168.1.0/24', 'Internal network');

      const result = filter.checkIp('192.168.1.10');

      expect(result.action).toBe('ALLOW');
    });

    it('should match /32 CIDR exactly', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '192.168.1.100/32', 'Specific IP');

      const result1 = filter.checkIp('192.168.1.100');
      const result2 = filter.checkIp('192.168.1.101');

      expect(result1.action).toBe('BLOCK');
      expect(result2.action).toBe('ALLOW');
    });

    it('should match /16 CIDR range', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '172.16.0.0/16', 'Private range');

      const result1 = filter.checkIp('172.16.0.1');
      const result2 = filter.checkIp('172.16.255.254');
      const result3 = filter.checkIp('172.17.0.1');

      expect(result1.action).toBe('BLOCK');
      expect(result2.action).toBe('BLOCK');
      expect(result3.action).toBe('ALLOW');
    });

    it('should prioritize exact match highest', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '192.168.1.0/24', 'Block subnet');
      filter.addAllowRule('rule-2', '192.168.1.0/28', 'Allow small range');
      filter.addExactRule('rule-3', '192.168.1.10', 'ALLOW', 'Exact override');

      const result = filter.checkIp('192.168.1.10');

      expect(result.action).toBe('ALLOW');
      expect(result.matchedRule).toContain('EXACT');
    });

    it('should prioritize block over allow in CIDR rules', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addAllowRule('rule-1', '192.168.1.0/24', 'Allow subnet');
      filter.addBlockRule('rule-2', '192.168.1.0/28', 'Block small range');

      const result = filter.checkIp('192.168.1.10');

      expect(result.action).toBe('BLOCK');
    });

    it('should apply geo blocking', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addGeoBlock('RU', 'BLOCK', 'Geo policy');

      const result = filter.checkIp('5.5.5.5', 'RU');

      expect(result.action).toBe('BLOCK');
      expect(result.matchedRule).toContain('GEO');
    });

    it('should prioritize CIDR over geo blocking', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addGeoBlock('RU', 'BLOCK', 'Geo policy');
      filter.addAllowRule('rule-1', '5.5.5.0/24', 'Allowed subnet');

      const result = filter.checkIp('5.5.5.5', 'RU');

      expect(result.action).toBe('ALLOW');
    });

    it('should increment check statistics', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.checkIp('192.168.1.10');
      filter.checkIp('192.168.1.11');
      filter.checkIp('192.168.1.12');

      const stats = filter.getStats();
      expect(stats.totalChecks).toBe(3n);
    });

    it('should track allowed count', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.checkIp('192.168.1.10');
      filter.checkIp('192.168.1.11');

      const stats = filter.getStats();
      expect(stats.totalAllowed).toBe(2n);
    });

    it('should track blocked count', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked');

      filter.checkIp('10.5.10.20');
      filter.checkIp('10.10.10.10');

      const stats = filter.getStats();
      expect(stats.totalBlocked).toBe(2n);
    });

    it('should log blocked IP', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked');

      filter.checkIp('10.5.10.20');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'IP blocked')).toBe(true);
    });
  });

  describe('removeRule', () => {
    it('should remove existing rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked');

      const result = filter.removeRule('rule-1');

      expect(result).toBe('OK');

      const rules = filter.getRules();
      expect(rules).toHaveLength(0);
    });

    it('should return error for non-existent rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.removeRule('rule-999');

      expect(result).toBe('RULE_NOT_FOUND');
    });

    it('should remove exact match rule', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addExactRule('rule-1', '192.168.1.100', 'BLOCK', 'Test');

      filter.removeRule('rule-1');

      const checkResult = filter.checkIp('192.168.1.100');

      expect(checkResult.action).toBe('ALLOW');
    });

    it('should log rule removal', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked');

      filter.removeRule('rule-1');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Rule removed')).toBe(true);
    });
  });

  describe('removeGeoBlock', () => {
    it('should remove geo block', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addGeoBlock('CN', 'BLOCK', 'Test');

      const result = filter.removeGeoBlock('CN');

      expect(result).toBe('OK');
    });

    it('should return error for non-existent geo block', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const result = filter.removeGeoBlock('ZZ');

      expect(result).toBe('GEO_BLOCK_NOT_FOUND');
    });

    it('should log geo block removal', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addGeoBlock('CN', 'BLOCK', 'Test');

      filter.removeGeoBlock('CN');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Geo block removed')).toBe(true);
    });
  });

  describe('getRules', () => {
    it('should return all rules sorted by priority', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addAllowRule('rule-1', '192.168.1.0/24', 'Allow');
      filter.addBlockRule('rule-2', '10.0.0.0/8', 'Block');
      filter.addExactRule('rule-3', '5.5.5.5', 'BLOCK', 'Exact');

      const rules = filter.getRules();

      expect(rules).toHaveLength(3);
      expect(rules[0]?.priority).toBeGreaterThanOrEqual(rules[1]?.priority || 0);
      expect(rules[1]?.priority).toBeGreaterThanOrEqual(rules[2]?.priority || 0);
    });

    it('should return empty array when no rules', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const rules = filter.getRules();

      expect(rules).toHaveLength(0);
    });
  });

  describe('setDefaultAction', () => {
    it('should change default action to BLOCK', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.setDefaultAction('BLOCK');

      const result = filter.checkIp('1.2.3.4');

      expect(result.action).toBe('BLOCK');
    });

    it('should change default action to ALLOW', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.setDefaultAction('BLOCK');
      filter.setDefaultAction('ALLOW');

      const result = filter.checkIp('1.2.3.4');

      expect(result.action).toBe('ALLOW');
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '10.0.0.0/8', 'Blocked');
      filter.addAllowRule('rule-2', '192.168.1.0/24', 'Allowed');
      filter.addGeoBlock('CN', 'BLOCK', 'Geo');

      filter.checkIp('10.5.10.20');
      filter.checkIp('192.168.1.10');

      const stats = filter.getStats();

      expect(stats.totalChecks).toBe(2n);
      expect(stats.totalBlocked).toBe(1n);
      expect(stats.totalAllowed).toBe(1n);
      expect(stats.ruleCount).toBe(2);
      expect(stats.geoBlockCount).toBe(1);
    });

    it('should handle empty filter', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      const stats = filter.getStats();

      expect(stats.totalChecks).toBe(0n);
      expect(stats.totalBlocked).toBe(0n);
      expect(stats.totalAllowed).toBe(0n);
      expect(stats.ruleCount).toBe(0);
      expect(stats.geoBlockCount).toBe(0);
    });
  });

  describe('CIDR matching edge cases', () => {
    it('should match /0 CIDR for all IPs', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '0.0.0.0/0', 'Block all');

      const result1 = filter.checkIp('1.2.3.4');
      const result2 = filter.checkIp('255.255.255.255');

      expect(result1.action).toBe('BLOCK');
      expect(result2.action).toBe('BLOCK');
    });

    it('should handle /24 subnet correctly', () => {
      const logger = createMockLogger();
      const filter = createIpFilter({ logger });

      filter.addBlockRule('rule-1', '192.168.1.0/24', 'Subnet');

      const result1 = filter.checkIp('192.168.1.0');
      const result2 = filter.checkIp('192.168.1.255');
      const result3 = filter.checkIp('192.168.2.0');

      expect(result1.action).toBe('BLOCK');
      expect(result2.action).toBe('BLOCK');
      expect(result3.action).toBe('ALLOW');
    });
  });
});
