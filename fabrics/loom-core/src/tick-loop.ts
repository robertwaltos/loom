/**
 * Tick Loop — The Loom's heartbeat.
 *
 * Drives the ECS: each tick runs all registered systems.
 * Decoupled from render loop — The Loom ticks at its own rate.
 * Uses setInterval for steady cadence. Target: < 0.5ms per tick.
 */

import type { Clock } from './clock.js';
import type { Logger } from './logger.js';
import type { SystemRegistry, SystemContext } from './system-registry.js';

export type TickLoopState = 'idle' | 'running' | 'paused';

export interface TickStats {
  readonly tickNumber: number;
  readonly lastTickDurationMs: number;
  readonly averageTickDurationMs: number;
  readonly peakTickDurationMs: number;
  readonly ticksOverBudget: number;
}

export interface TickLoop {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  tickOnce(): void;
  state(): TickLoopState;
  stats(): TickStats;
}

interface LoopState {
  readonly systems: SystemRegistry;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly tickRateHz: number;
  readonly budgetMs: number;
  currentState: TickLoopState;
  tickNumber: number;
  lastTickTime: number;
  lastTickDurationMs: number;
  totalTickDurationMs: number;
  peakTickDurationMs: number;
  ticksOverBudget: number;
  intervalHandle: ReturnType<typeof setInterval> | null;
}

const DEFAULT_TICK_RATE_HZ = 30;
const DEFAULT_BUDGET_MS = 0.5;

export interface TickLoopConfig {
  readonly systems: SystemRegistry;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly tickRateHz?: number;
  readonly budgetMs?: number;
}

export function createTickLoop(config: TickLoopConfig): TickLoop {
  const state = initLoopState(config);

  return {
    start: () => {
      startLoop(state);
    },
    stop: () => {
      stopLoop(state);
    },
    pause: () => {
      pauseLoop(state);
    },
    resume: () => {
      resumeLoop(state);
    },
    tickOnce: () => {
      executeTick(state);
    },
    state: () => state.currentState,
    stats: () => getStats(state),
  };
}

function initLoopState(config: TickLoopConfig): LoopState {
  return {
    systems: config.systems,
    clock: config.clock,
    logger: config.logger,
    tickRateHz: config.tickRateHz ?? DEFAULT_TICK_RATE_HZ,
    budgetMs: config.budgetMs ?? DEFAULT_BUDGET_MS,
    currentState: 'idle',
    tickNumber: 0,
    lastTickTime: 0,
    lastTickDurationMs: 0,
    totalTickDurationMs: 0,
    peakTickDurationMs: 0,
    ticksOverBudget: 0,
    intervalHandle: null,
  };
}

function startLoop(state: LoopState): void {
  if (state.currentState === 'running') return;
  state.currentState = 'running';
  state.lastTickTime = state.clock.nowMicroseconds();
  const intervalMs = Math.floor(1000 / state.tickRateHz);
  state.intervalHandle = setInterval(() => {
    executeTick(state);
  }, intervalMs);
}

function stopLoop(state: LoopState): void {
  if (state.intervalHandle !== null) {
    clearInterval(state.intervalHandle);
    state.intervalHandle = null;
  }
  state.currentState = 'idle';
}

function pauseLoop(state: LoopState): void {
  if (state.currentState !== 'running') return;
  if (state.intervalHandle !== null) {
    clearInterval(state.intervalHandle);
    state.intervalHandle = null;
  }
  state.currentState = 'paused';
}

function resumeLoop(state: LoopState): void {
  if (state.currentState !== 'paused') return;
  state.lastTickTime = state.clock.nowMicroseconds();
  startLoop(state);
}

function executeTick(state: LoopState): void {
  if (state.currentState === 'paused') return;

  const now = state.clock.nowMicroseconds();
  const deltaMicroseconds = now - state.lastTickTime;
  const deltaMs = deltaMicroseconds / 1000;
  state.lastTickTime = now;
  state.tickNumber += 1;

  const context: SystemContext = {
    deltaMs,
    tickNumber: state.tickNumber,
    wallTimeMicroseconds: now,
  };

  const beforeMs = performance.now();
  state.systems.runAll(context);
  const durationMs = performance.now() - beforeMs;

  recordTickMetrics(state, durationMs);
}

function recordTickMetrics(state: LoopState, durationMs: number): void {
  state.lastTickDurationMs = durationMs;
  state.totalTickDurationMs += durationMs;
  if (durationMs > state.peakTickDurationMs) state.peakTickDurationMs = durationMs;
  if (durationMs > state.budgetMs) {
    state.ticksOverBudget += 1;
    state.logger.warn(
      { tickNumber: state.tickNumber, durationMs, budgetMs: state.budgetMs },
      'Tick exceeded budget',
    );
  }
}

function getStats(state: LoopState): TickStats {
  const avg = state.tickNumber > 0 ? state.totalTickDurationMs / state.tickNumber : 0;
  return {
    tickNumber: state.tickNumber,
    lastTickDurationMs: state.lastTickDurationMs,
    averageTickDurationMs: avg,
    peakTickDurationMs: state.peakTickDurationMs,
    ticksOverBudget: state.ticksOverBudget,
  };
}
