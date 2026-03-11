import { describe, it, expect } from 'vitest';
import {
  createChaosEngineer,
  type ChaosEngineer,
  type ChaosEngineerDeps,
  type ChaosScenario,
  type InjectionTarget,
  type FaultParameters,
} from '../chaos-engineer.js';

function createTestDeps(): ChaosEngineerDeps {
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
        const id = 'exp-' + String(idCounter);
        idCounter += 1;
        return id;
      },
    },
    maxObservationsPerExperiment: 100,
  };
}

function createTestTarget(): InjectionTarget {
  return {
    fabric: 'loom-core',
    service: 'event-bus',
    operation: 'publish',
  };
}

function createTestScenario(): ChaosScenario {
  const target = createTestTarget();
  const params: FaultParameters = {
    intensity: 0.5,
    frequency: 0.1,
    metadata: { description: 'test fault' },
  };

  return {
    name: 'latency-test',
    description: 'Test latency injection',
    faultType: 'LATENCY',
    target,
    parameters: params,
    durationMicroseconds: BigInt(10000000),
  };
}

describe('ChaosEngineer', () => {
  describe('Scenario Management', () => {
    it('defines a chaos scenario', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      expect(engineer.getScenarioCount()).toBe(0);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      expect(engineer.getScenarioCount()).toBe(1);
    });

    it('removes a scenario', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const removed = engineer.removeScenario('latency-test');
      expect(removed).toBe(true);
      expect(engineer.getScenarioCount()).toBe(0);
    });

    it('returns false when removing non-existent scenario', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const removed = engineer.removeScenario('nonexistent');
      expect(removed).toBe(false);
    });

    it('defines multiple scenarios', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = {
        intensity: 0.8,
        frequency: 0.2,
        metadata: {},
      };

      const scenario1: ChaosScenario = {
        name: 'latency-test',
        description: 'Latency test',
        faultType: 'LATENCY',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      const scenario2: ChaosScenario = {
        name: 'error-test',
        description: 'Error rate test',
        faultType: 'ERROR_RATE',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario1);
      engineer.defineScenario(scenario2);

      expect(engineer.getScenarioCount()).toBe(2);
    });
  });

  describe('Experiment Lifecycle', () => {
    it('starts an experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      expect(experimentId).toBe('exp-1');
    });

    it('returns error when starting experiment for unknown scenario', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const result = engineer.startExperiment('nonexistent');
      expect(result).toContain('error');
    });

    it('tracks running experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      const experiment = engineer.getExperiment(experimentId);

      expect(experiment).not.toBeNull();
      expect(experiment?.status).toBe('RUNNING');
      expect(experiment?.startedAt).not.toBeNull();
    });

    it('stops a running experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      const stopped = engineer.stopExperiment(experimentId);

      expect(stopped).toBe(true);

      const experiment = engineer.getExperiment(experimentId);
      expect(experiment?.status).toBe('STOPPED');
      expect(experiment?.completedAt).not.toBeNull();
    });

    it('returns false when stopping non-existent experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const stopped = engineer.stopExperiment('nonexistent');
      expect(stopped).toBe(false);
    });

    it('returns false when stopping already stopped experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      engineer.stopExperiment(experimentId);

      const stopped = engineer.stopExperiment(experimentId);
      expect(stopped).toBe(false);
    });

    it('lists active experiments', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      engineer.startExperiment('latency-test');
      engineer.startExperiment('latency-test');

      const active = engineer.getActiveExperiments();
      expect(active.length).toBe(2);
    });

    it('excludes stopped experiments from active list', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const exp1 = engineer.startExperiment('latency-test');
      engineer.startExperiment('latency-test');

      engineer.stopExperiment(exp1);

      const active = engineer.getActiveExperiments();
      expect(active.length).toBe(1);
    });
  });

  describe('Fault Injection', () => {
    it('injects a fault into running experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      const injected = engineer.injectFault(experimentId);

      expect(injected).toBe(true);
    });

    it('increments fault counter', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      engineer.injectFault(experimentId);
      engineer.injectFault(experimentId);
      engineer.injectFault(experimentId);

      const experiment = engineer.getExperiment(experimentId);
      expect(experiment?.faultsInjected).toBe(3);
    });

    it('returns false when injecting into non-existent experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const injected = engineer.injectFault('nonexistent');
      expect(injected).toBe(false);
    });

    it('returns false when injecting into stopped experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      engineer.stopExperiment(experimentId);

      const injected = engineer.injectFault(experimentId);
      expect(injected).toBe(false);
    });

    it('records observations during fault injection', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const experimentId = engineer.startExperiment('latency-test');
      engineer.injectFault(experimentId);

      engineer.stopExperiment(experimentId);
      const result = engineer.getExperimentResult(experimentId);

      expect(result?.observations.length).toBeGreaterThan(0);
    });
  });

  describe('Experiment Processing', () => {
    it('completes experiments after duration expires', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      engineer.startExperiment('latency-test');

      currentTime = BigInt(1000000000000 + 10000001);

      const completed = engineer.processExperiments();
      expect(completed).toBe(1);
    });

    it('does not complete experiments before duration', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      engineer.startExperiment('latency-test');

      currentTime = BigInt(1000000000000 + 5000000);

      const completed = engineer.processExperiments();
      expect(completed).toBe(0);
    });

    it('processes multiple experiments', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      engineer.startExperiment('latency-test');
      engineer.startExperiment('latency-test');
      engineer.startExperiment('latency-test');

      currentTime = BigInt(1000000000000 + 10000001);

      const completed = engineer.processExperiments();
      expect(completed).toBe(3);
    });

    it('marks completed experiments with COMPLETED status', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');

      currentTime = BigInt(1000000000000 + 10000001);

      engineer.processExperiments();

      const experiment = engineer.getExperiment(expId);
      expect(experiment?.status).toBe('COMPLETED');
    });
  });

  describe('Experiment Results', () => {
    it('returns null for non-existent experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const result = engineer.getExperimentResult('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null for running experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');

      const result = engineer.getExperimentResult(expId);
      expect(result).toBeNull();
    });

    it('returns result for completed experiment', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');
      engineer.injectFault(expId);

      currentTime = BigInt(1000000000000 + 10000001);
      engineer.processExperiments();

      const result = engineer.getExperimentResult(expId);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('COMPLETED');
      expect(result?.faultsInjected).toBe(1);
    });

    it('returns result for stopped experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');
      engineer.stopExperiment(expId);

      const result = engineer.getExperimentResult(expId);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('STOPPED');
    });

    it('computes experiment duration', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');

      currentTime = BigInt(1000000000000 + 10000001);
      engineer.processExperiments();

      const result = engineer.getExperimentResult(expId);
      expect(result?.durationMicroseconds).toBe(BigInt(10000001));
    });

    it('computes impact score', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');
      engineer.injectFault(expId);
      engineer.injectFault(expId);

      engineer.stopExperiment(expId);

      const result = engineer.getExperimentResult(expId);
      expect(result?.impactScore).toBeGreaterThan(0);
    });
  });

  describe('Resilience Reporting', () => {
    it('generates resilience report', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const report = engineer.getResilienceReport();

      expect(report).not.toBeNull();
      expect(report.generatedAt).toBeGreaterThan(0);
    });

    it('tracks total experiments', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      engineer.startExperiment('latency-test');
      engineer.startExperiment('latency-test');

      const report = engineer.getResilienceReport();
      expect(report.totalExperiments).toBe(2);
    });

    it('tracks completed experiments', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      engineer.startExperiment('latency-test');
      const exp2 = engineer.startExperiment('latency-test');

      engineer.stopExperiment(exp2);

      const report = engineer.getResilienceReport();
      expect(report.completedExperiments).toBe(1);
    });

    it('computes average impact score', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const exp1 = engineer.startExperiment('latency-test');
      engineer.injectFault(exp1);
      engineer.stopExperiment(exp1);

      const report = engineer.getResilienceReport();
      expect(report.averageImpactScore).toBeGreaterThan(0);
    });

    it('identifies weaknesses', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: ChaosEngineerDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'exp-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxObservationsPerExperiment: 100,
      };
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const highImpactParams: FaultParameters = {
        intensity: 0.9,
        frequency: 0.5,
        metadata: {},
      };

      const scenario: ChaosScenario = {
        name: 'high-impact',
        description: 'High impact test',
        faultType: 'CPU_SPIKE',
        target,
        parameters: highImpactParams,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('high-impact');
      engineer.injectFault(expId);
      engineer.injectFault(expId);

      currentTime = BigInt(1000000000000 + 5000001);
      engineer.processExperiments();

      const report = engineer.getResilienceReport();
      expect(report.weaknesses.length).toBeGreaterThan(0);
    });

    it('generates recommendations', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const report = engineer.getResilienceReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('provides default recommendation when no weaknesses', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const report = engineer.getResilienceReport();
      expect(report.recommendations[0]).toContain('resilience');
    });
  });

  describe('Fault Types', () => {
    it('supports LATENCY fault type', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');
      const experiment = engineer.getExperiment(expId);

      expect(experiment?.scenario.faultType).toBe('LATENCY');
    });

    it('supports ERROR_RATE fault type', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 0.3, frequency: 0.2, metadata: {} };
      const scenario: ChaosScenario = {
        name: 'error-test',
        description: 'Error rate test',
        faultType: 'ERROR_RATE',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario);
      const expId = engineer.startExperiment('error-test');
      const experiment = engineer.getExperiment(expId);

      expect(experiment?.scenario.faultType).toBe('ERROR_RATE');
    });

    it('supports CPU_SPIKE fault type', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 0.8, frequency: 0.1, metadata: {} };
      const scenario: ChaosScenario = {
        name: 'cpu-test',
        description: 'CPU spike test',
        faultType: 'CPU_SPIKE',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario);
      const expId = engineer.startExperiment('cpu-test');
      const experiment = engineer.getExperiment(expId);

      expect(experiment?.scenario.faultType).toBe('CPU_SPIKE');
    });

    it('supports MEMORY_PRESSURE fault type', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 0.6, frequency: 0.1, metadata: {} };
      const scenario: ChaosScenario = {
        name: 'memory-test',
        description: 'Memory pressure test',
        faultType: 'MEMORY_PRESSURE',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario);
      const expId = engineer.startExperiment('memory-test');
      const experiment = engineer.getExperiment(expId);

      expect(experiment?.scenario.faultType).toBe('MEMORY_PRESSURE');
    });

    it('supports NETWORK_PARTITION fault type', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 1.0, frequency: 0.05, metadata: {} };
      const scenario: ChaosScenario = {
        name: 'partition-test',
        description: 'Network partition test',
        faultType: 'NETWORK_PARTITION',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario);
      const expId = engineer.startExperiment('partition-test');
      const experiment = engineer.getExperiment(expId);

      expect(experiment?.scenario.faultType).toBe('NETWORK_PARTITION');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero duration experiments', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 0.5, frequency: 0.1, metadata: {} };
      const scenario: ChaosScenario = {
        name: 'zero-duration',
        description: 'Zero duration',
        faultType: 'LATENCY',
        target,
        parameters: params,
        durationMicroseconds: BigInt(0),
      };

      engineer.defineScenario(scenario);
      const expId = engineer.startExperiment('zero-duration');

      const completed = engineer.processExperiments();
      expect(completed).toBe(1);
    });

    it('handles experiment with no faults injected', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');
      engineer.stopExperiment(expId);

      const result = engineer.getExperimentResult(expId);
      expect(result?.faultsInjected).toBe(0);
      expect(result?.impactScore).toBe(0);
    });

    it('limits observations per experiment', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const scenario = createTestScenario();
      engineer.defineScenario(scenario);

      const expId = engineer.startExperiment('latency-test');

      for (let i = 0; i < 150; i += 1) {
        engineer.injectFault(expId);
      }

      engineer.stopExperiment(expId);
      const result = engineer.getExperimentResult(expId);

      expect(result?.observations.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Additional Coverage', () => {
    it('handles experiment with custom metadata', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = {
        intensity: 0.5,
        frequency: 0.1,
        metadata: { team: 'platform', env: 'staging' },
      };

      const scenario: ChaosScenario = {
        name: 'custom-test',
        description: 'Custom metadata test',
        faultType: 'LATENCY',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      engineer.defineScenario(scenario);
      const expId = engineer.startExperiment('custom-test');

      const experiment = engineer.getExperiment(expId);
      expect(experiment?.scenario.parameters.metadata).toBeDefined();
    });

    it('generates recommendations for all fault types', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 0.9, frequency: 0.5, metadata: {} };

      const faultTypes: Array<
        'LATENCY' | 'ERROR_RATE' | 'CPU_SPIKE' | 'MEMORY_PRESSURE' | 'NETWORK_PARTITION'
      > = ['LATENCY', 'ERROR_RATE', 'CPU_SPIKE', 'MEMORY_PRESSURE', 'NETWORK_PARTITION'];

      for (const faultType of faultTypes) {
        const scenario: ChaosScenario = {
          name: 'test-' + faultType,
          description: 'Test ' + faultType,
          faultType,
          target,
          parameters: params,
          durationMicroseconds: BigInt(1000000),
        };

        engineer.defineScenario(scenario);
        const expId = engineer.startExperiment('test-' + faultType);
        engineer.injectFault(expId);
        engineer.stopExperiment(expId);
      }

      const report = engineer.getResilienceReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('handles scenario replacement', () => {
      const deps = createTestDeps();
      const engineer = createChaosEngineer(deps);

      const target = createTestTarget();
      const params: FaultParameters = { intensity: 0.5, frequency: 0.1, metadata: {} };

      const scenario1: ChaosScenario = {
        name: 'test-scenario',
        description: 'First version',
        faultType: 'LATENCY',
        target,
        parameters: params,
        durationMicroseconds: BigInt(5000000),
      };

      const scenario2: ChaosScenario = {
        name: 'test-scenario',
        description: 'Second version',
        faultType: 'ERROR_RATE',
        target,
        parameters: params,
        durationMicroseconds: BigInt(10000000),
      };

      engineer.defineScenario(scenario1);
      engineer.defineScenario(scenario2);

      expect(engineer.getScenarioCount()).toBe(1);
    });
  });
});
