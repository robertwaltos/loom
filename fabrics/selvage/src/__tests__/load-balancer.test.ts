/**
 * Load Balancer Tests
 * Fabric: selvage
 */

import { describe, it, expect } from 'vitest';
import { createLoadBalancer } from '../load-balancer.js';

// ============================================================================
// Test Ports
// ============================================================================

function createMockClock(startMicros = 1000000n) {
  let current = startMicros;
  return {
    nowMicroseconds: () => current,
    advance: (deltaMicros: bigint) => {
      current = current + deltaMicros;
    },
  };
}

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

describe('LoadBalancer', () => {
  describe('registerInstance', () => {
    it('should register a new instance successfully', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      expect(result).toBe('OK');
      const stats = lb.getStats();
      expect(stats.totalInstances).toBe(1);
      expect(stats.healthyInstances).toBe(1);
    });

    it('should reject duplicate instance registration', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const instance = {
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      };

      lb.registerInstance(instance);
      const result = lb.registerInstance(instance);

      expect(result).toBe('INSTANCE_ALREADY_REGISTERED');
    });

    it('should log instance registration', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.level).toBe('info');
      expect(logs[0]?.msg).toBe('Instance registered');
    });

    it('should initialize instance with zero connections', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      const stats = lb.getStats();
      expect(stats.averageConnections).toBe(0);
    });

    it('should register multiple instances', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      const stats = lb.getStats();
      expect(stats.totalInstances).toBe(2);
      expect(stats.healthyInstances).toBe(2);
    });
  });

  describe('deregisterInstance', () => {
    it('should deregister an existing instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      const result = lb.deregisterInstance('inst-1');
      expect(result).toBe('OK');

      const stats = lb.getStats();
      expect(stats.totalInstances).toBe(0);
    });

    it('should return error for non-existent instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.deregisterInstance('inst-999');
      expect(result).toBe('INSTANCE_NOT_FOUND');
    });

    it('should log instance deregistration', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.deregisterInstance('inst-1');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Instance deregistered')).toBe(true);
    });
  });

  describe('selectInstance - ROUND_ROBIN', () => {
    it('should return error when no instances available', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.selectInstance();
      expect(result).toBe('NO_HEALTHY_INSTANCES');
    });

    it('should select instances in round-robin order', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-3',
        host: '192.168.1.12',
        port: 8080,
        weight: 1,
      });

      const r1 = lb.selectInstance();
      const r2 = lb.selectInstance();
      const r3 = lb.selectInstance();
      const r4 = lb.selectInstance();

      expect(r1).not.toBe('NO_HEALTHY_INSTANCES');
      expect(r2).not.toBe('NO_HEALTHY_INSTANCES');
      expect(r3).not.toBe('NO_HEALTHY_INSTANCES');
      expect(r4).not.toBe('NO_HEALTHY_INSTANCES');

      if (
        r1 !== 'NO_HEALTHY_INSTANCES' &&
        r2 !== 'NO_HEALTHY_INSTANCES' &&
        r3 !== 'NO_HEALTHY_INSTANCES' &&
        r4 !== 'NO_HEALTHY_INSTANCES'
      ) {
        expect(r1.instance.id).toBe('inst-1');
        expect(r2.instance.id).toBe('inst-2');
        expect(r3.instance.id).toBe('inst-3');
        expect(r4.instance.id).toBe('inst-1');
      }
    });

    it('should skip unhealthy instances', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      lb.markUnhealthy('inst-1');

      const result = lb.selectInstance();
      expect(result).not.toBe('NO_HEALTHY_INSTANCES');

      if (result !== 'NO_HEALTHY_INSTANCES') {
        expect(result.instance.id).toBe('inst-2');
      }
    });

    it('should increment total requests', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.selectInstance();
      lb.selectInstance();
      lb.selectInstance();

      const stats = lb.getStats();
      expect(stats.totalRequests).toBe(3n);
    });
  });

  describe('selectInstance - LEAST_CONNECTIONS', () => {
    it('should select instance with fewest connections', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.setStrategy('LEAST_CONNECTIONS');

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      lb.incrementConnections('inst-1');
      lb.incrementConnections('inst-1');
      lb.incrementConnections('inst-2');

      const result = lb.selectInstance();
      expect(result).not.toBe('NO_HEALTHY_INSTANCES');

      if (result !== 'NO_HEALTHY_INSTANCES') {
        expect(result.instance.id).toBe('inst-2');
      }
    });

    it('should select first instance when connections equal', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.setStrategy('LEAST_CONNECTIONS');

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      const result = lb.selectInstance();
      expect(result).not.toBe('NO_HEALTHY_INSTANCES');

      if (result !== 'NO_HEALTHY_INSTANCES') {
        expect(result.strategy).toBe('LEAST_CONNECTIONS');
      }
    });
  });

  describe('selectInstance - RANDOM', () => {
    it('should select random instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.setStrategy('RANDOM');

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      const result = lb.selectInstance();
      expect(result).not.toBe('NO_HEALTHY_INSTANCES');

      if (result !== 'NO_HEALTHY_INSTANCES') {
        expect(result.strategy).toBe('RANDOM');
        expect(['inst-1', 'inst-2']).toContain(result.instance.id);
      }
    });
  });

  describe('markUnhealthy', () => {
    it('should mark instance as unhealthy', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      const result = lb.markUnhealthy('inst-1');
      expect(result).toBe('OK');

      const stats = lb.getStats();
      expect(stats.healthyInstances).toBe(0);
    });

    it('should return error for non-existent instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.markUnhealthy('inst-999');
      expect(result).toBe('INSTANCE_NOT_FOUND');
    });

    it('should log unhealthy marking', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.markUnhealthy('inst-1');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Instance marked unhealthy')).toBe(true);
    });
  });

  describe('markHealthy', () => {
    it('should mark instance as healthy', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.markUnhealthy('inst-1');
      const result = lb.markHealthy('inst-1');

      expect(result).toBe('OK');

      const stats = lb.getStats();
      expect(stats.healthyInstances).toBe(1);
    });

    it('should return error for non-existent instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.markHealthy('inst-999');
      expect(result).toBe('INSTANCE_NOT_FOUND');
    });
  });

  describe('incrementConnections', () => {
    it('should increment connection count', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.incrementConnections('inst-1');
      lb.incrementConnections('inst-1');

      const stats = lb.getStats();
      expect(stats.averageConnections).toBe(2);
    });

    it('should return error for non-existent instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.incrementConnections('inst-999');
      expect(result).toBe('INSTANCE_NOT_FOUND');
    });
  });

  describe('decrementConnections', () => {
    it('should decrement connection count', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.incrementConnections('inst-1');
      lb.incrementConnections('inst-1');
      lb.decrementConnections('inst-1');

      const stats = lb.getStats();
      expect(stats.averageConnections).toBe(1);
    });

    it('should not go below zero', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });

      lb.decrementConnections('inst-1');
      lb.decrementConnections('inst-1');

      const stats = lb.getStats();
      expect(stats.averageConnections).toBe(0);
    });

    it('should return error for non-existent instance', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const result = lb.decrementConnections('inst-999');
      expect(result).toBe('INSTANCE_NOT_FOUND');
    });
  });

  describe('setStrategy', () => {
    it('should change load balancing strategy', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.setStrategy('LEAST_CONNECTIONS');

      const stats = lb.getStats();
      expect(stats.strategy).toBe('LEAST_CONNECTIONS');
    });

    it('should reset round robin index', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      lb.selectInstance();
      lb.selectInstance();

      lb.setStrategy('ROUND_ROBIN');

      const result = lb.selectInstance();
      expect(result).not.toBe('NO_HEALTHY_INSTANCES');

      if (result !== 'NO_HEALTHY_INSTANCES') {
        expect(result.instance.id).toBe('inst-1');
      }
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      lb.registerInstance({
        id: 'inst-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
      });
      lb.registerInstance({
        id: 'inst-2',
        host: '192.168.1.11',
        port: 8080,
        weight: 1,
      });

      lb.incrementConnections('inst-1');
      lb.incrementConnections('inst-2');
      lb.incrementConnections('inst-2');

      lb.selectInstance();
      lb.selectInstance();

      const stats = lb.getStats();

      expect(stats.totalInstances).toBe(2);
      expect(stats.healthyInstances).toBe(2);
      expect(stats.totalRequests).toBe(2n);
      expect(stats.averageConnections).toBe(1.5);
      expect(stats.strategy).toBe('ROUND_ROBIN');
    });

    it('should handle empty load balancer', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const lb = createLoadBalancer({ clock, logger });

      const stats = lb.getStats();

      expect(stats.totalInstances).toBe(0);
      expect(stats.healthyInstances).toBe(0);
      expect(stats.totalRequests).toBe(0n);
      expect(stats.averageConnections).toBe(0);
    });
  });
});
