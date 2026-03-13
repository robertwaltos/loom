import { describe, expect, it, vi } from 'vitest';
import { createChaosEngine } from '../chaos-engine.js';
import type { ChaosEngineDeps, ExperimentResult } from '../chaos-engine.js';

function makeClock(startUs = 1_000_000) {
  let nowUs = startUs;
  return {
    nowMicroseconds: () => nowUs,
    set: (next: number) => {
      nowUs = next;
    },
    advance: (delta: number) => {
      nowUs += delta;
    },
  };
}

function makeDeps() {
  const clock = makeClock();
  const thresholdState = { breached: false };
  let idCounter = 0;

  const logger = {
    info: vi.fn<(ctx: Readonly<Record<string, unknown>>, msg: string) => void>(),
    warn: vi.fn<(ctx: Readonly<Record<string, unknown>>, msg: string) => void>(),
    error: vi.fn<(ctx: Readonly<Record<string, unknown>>, msg: string) => void>(),
  };

  const deps: ChaosEngineDeps = {
    clock,
    idGenerator: {
      generate: vi.fn(() => `exp-${++idCounter}`),
    },
    logger,
    metrics: {
      getMetric: vi.fn(() => 0),
      checkThresholdBreach: vi.fn(() => thresholdState.breached),
    },
    executor: {
      killProcess: vi.fn(async () => true),
      injectLatency: vi.fn(async () => true),
      partitionNetwork: vi.fn(async () => true),
      healNetwork: vi.fn(async () => true),
      failoverDatabase: vi.fn(async () => true),
      evictCache: vi.fn(async () => true),
      simulateDiskFull: vi.fn(async () => true),
      restoreService: vi.fn(async () => true),
    },
    notifications: {
      notifyExperimentStart: vi.fn<(experiment: ReturnType<ReturnType<typeof createChaosEngine>['getExperiment']>) => void>(),
      notifyExperimentComplete: vi.fn<(experiment: ReturnType<ReturnType<typeof createChaosEngine>['getExperiment']>) => void>(),
      notifyAutoAbort: vi.fn<(experiment: ReturnType<ReturnType<typeof createChaosEngine>['getExperiment']>, reason: string) => void>(),
    },
  };

  return { deps, clock, thresholdState, logger };
}

describe('Chaos Engine Simulation', () => {
  it('rejects schedules that exceed configured blast radius', () => {
    const { deps } = makeDeps();
    const engine = createChaosEngine(deps);

    expect(() =>
      engine.scheduleExperiment({
        name: 'too-wide',
        description: 'fails safety',
        faultType: 'process-kill',
        targetServices: ['a', 'b', 'c'],
        injectionDurationMs: 100,
        observationDurationMs: 100,
        hypothesis: 'should throw',
        scheduledAt: deps.clock.nowMicroseconds(),
        safetyConfig: { maxBlastRadiusServices: 2 },
      }),
    ).toThrow('Blast radius exceeded');
  });

  it('starts a process-kill experiment and transitions to OBSERVING after fault injection', async () => {
    const { deps } = makeDeps();
    const engine = createChaosEngine(deps, { globalCooldownMs: 0 });

    const scheduled = engine.scheduleExperiment({
      name: 'kill-service',
      description: 'kill one process',
      faultType: 'process-kill',
      targetServices: ['svc-a'],
      injectionDurationMs: 500,
      observationDurationMs: 2_000,
      hypothesis: 'service should recover',
      scheduledAt: deps.clock.nowMicroseconds(),
    });

    const started = await engine.startExperiment(scheduled.experimentId);

    expect(started.phase).toBe('OBSERVING');
    expect(deps.executor.killProcess).toHaveBeenCalledWith('svc-a');
    expect(deps.notifications.notifyExperimentStart).toHaveBeenCalledTimes(1);
    expect(engine.getActiveExperiments()).toHaveLength(1);
  });

  it('auto-aborts during observation when safety metric breaches and records abort history', async () => {
    const { deps, thresholdState } = makeDeps();
    const engine = createChaosEngine(deps, { globalCooldownMs: 0 });

    const exp = engine.scheduleExperiment({
      name: 'latency-drill',
      description: 'inject latency and watch error rate',
      faultType: 'latency-injection',
      targetServices: ['svc-a', 'svc-b'],
      injectionDurationMs: 400,
      observationDurationMs: 1_000,
      hypothesis: 'autoscaling should absorb',
      scheduledAt: deps.clock.nowMicroseconds(),
    });

    await engine.startExperiment(exp.experimentId);
    thresholdState.breached = true;

    await engine.tick();

    const after = engine.getExperiment(exp.experimentId);
    expect(after?.phase).toBe('ABORTED');
    expect(deps.executor.restoreService).toHaveBeenCalledWith('svc-a');
    expect(deps.executor.restoreService).toHaveBeenCalledWith('svc-b');
    expect(deps.notifications.notifyAutoAbort).toHaveBeenCalledTimes(1);
    expect(engine.getHistory().some(history => history.phase === 'ABORTED')).toBe(true);
  });

  it('moves observing experiments to RECOVERING after observation duration elapses', async () => {
    const { deps, clock } = makeDeps();
    const engine = createChaosEngine(deps, { globalCooldownMs: 0 });

    const exp = engine.scheduleExperiment({
      name: 'disk-full-drill',
      description: 'simulate disk pressure',
      faultType: 'disk-full',
      targetServices: ['svc-disk'],
      injectionDurationMs: 250,
      observationDurationMs: 300,
      hypothesis: 'alerts trigger fast',
      scheduledAt: clock.nowMicroseconds(),
    });

    await engine.startExperiment(exp.experimentId);
    clock.advance(301_000);

    await engine.tick();

    const after = engine.getExperiment(exp.experimentId);
    expect(after?.phase).toBe('RECOVERING');
    expect(deps.executor.restoreService).toHaveBeenCalledWith('svc-disk');
  });

  it('completes experiments, computes stats, and enforces global cooldown between starts', async () => {
    const { deps, clock } = makeDeps();
    const engine = createChaosEngine(deps, { globalCooldownMs: 60_000 });

    const first = engine.scheduleExperiment({
      name: 'cache-storm',
      description: 'evict cache',
      faultType: 'cache-eviction',
      targetServices: ['cache-1'],
      injectionDurationMs: 100,
      observationDurationMs: 100,
      hypothesis: 'cache warms up quickly',
      scheduledAt: clock.nowMicroseconds(),
    });

    await engine.startExperiment(first.experimentId);

    const result: ExperimentResult = {
      passed: true,
      recoveryTimeMs: 4200,
      dataLossDetected: false,
      metricsSnapshot: { error_rate_5xx: 0.02 },
      notes: 'stable under chaos',
    };

    const completed = engine.completeExperiment(first.experimentId, result);
    expect(completed.phase).toBe('COMPLETED');

    const second = engine.scheduleExperiment({
      name: 'kill-next',
      description: 'second run',
      faultType: 'process-kill',
      targetServices: ['svc-next'],
      injectionDurationMs: 100,
      observationDurationMs: 100,
      hypothesis: 'should cooldown gate',
      scheduledAt: clock.nowMicroseconds(),
    });

    await expect(engine.startExperiment(second.experimentId)).rejects.toThrow('Global cooldown period has not elapsed');

    const stats = engine.getStats();
    expect(stats.totalExperiments).toBe(2);
    expect(stats.completedExperiments).toBe(1);
    expect(stats.passedExperiments).toBe(1);
    expect(stats.failedExperiments).toBe(0);
    expect(stats.averageRecoveryTimeMs).toBe(4200);
  });
});
