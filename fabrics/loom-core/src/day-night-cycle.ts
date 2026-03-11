/**
 * Day-Night Cycle — loom-core fabric
 * 1:1 real time world clock. Tracks time-of-day, phase transitions, lighting state.
 * Multiple worlds with independent time zones.
 */

// Port interfaces (duplicated, never imported from other fabrics)
interface CycleClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface CycleLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

// Core types
export type DayPhase =
  | 'DAWN'
  | 'MORNING'
  | 'MIDDAY'
  | 'AFTERNOON'
  | 'DUSK'
  | 'EVENING'
  | 'MIDNIGHT'
  | 'DEEP_NIGHT';

export interface LightingState {
  readonly intensity: number;
  readonly temperature: number;
  readonly shadowLength: number;
}

export interface TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly microseconds: bigint;
}

export interface WorldClock {
  readonly worldId: string;
  currentTimeMicros: bigint;
  readonly timezoneOffsetMicros: bigint;
  currentPhase: DayPhase;
}

export interface PhaseTransition {
  readonly worldId: string;
  readonly fromPhase: DayPhase;
  readonly toPhase: DayPhase;
  readonly transitionTimeMicros: bigint;
}

export type PhaseListener = (transition: PhaseTransition) => void;

// State
interface DayNightCycleState {
  readonly clocks: Map<string, WorldClock>;
  readonly listeners: PhaseListener[];
  readonly transitionHistory: Map<string, PhaseTransition[]>;
}

// Dependencies
export interface DayNightCycleDeps {
  readonly clock: CycleClockPort;
  readonly logger: CycleLoggerPort;
}

// Public API
export interface DayNightCycle {
  readonly registerWorld: (worldId: string, timezoneOffsetMicros: bigint) => string | 'OK';
  readonly advanceClock: (worldId: string) => string | 'OK';
  readonly advanceAllClocks: () => number;
  readonly getCurrentPhase: (worldId: string) => string | DayPhase;
  readonly getLightingState: (worldId: string) => string | LightingState;
  readonly getWorldTime: (worldId: string) => string | TimeOfDay;
  readonly registerPhaseListener: (listener: PhaseListener) => void;
  readonly getTransitionHistory: (worldId: string) => readonly PhaseTransition[];
  readonly getAllWorlds: () => readonly WorldClock[];
}

// Constants
const MICROSECONDS_PER_DAY = BigInt(24 * 60 * 60 * 1000000);
const MICROSECONDS_PER_HOUR = BigInt(60 * 60 * 1000000);
const MICROSECONDS_PER_MINUTE = BigInt(60 * 1000000);
const MICROSECONDS_PER_SECOND = BigInt(1000000);

// Factory
export function createDayNightCycle(deps: DayNightCycleDeps): DayNightCycle {
  const state: DayNightCycleState = {
    clocks: new Map(),
    listeners: [],
    transitionHistory: new Map(),
  };

  return {
    registerWorld: (worldId, timezoneOffsetMicros) =>
      registerWorld(state, deps, worldId, timezoneOffsetMicros),
    advanceClock: (worldId) => advanceClock(state, deps, worldId),
    advanceAllClocks: () => advanceAllClocks(state, deps),
    getCurrentPhase: (worldId) => getCurrentPhase(state, worldId),
    getLightingState: (worldId) => getLightingState(state, worldId),
    getWorldTime: (worldId) => getWorldTime(state, worldId),
    registerPhaseListener: (listener) => registerPhaseListener(state, listener),
    getTransitionHistory: (worldId) => getTransitionHistory(state, worldId),
    getAllWorlds: () => getAllWorlds(state),
  };
}

// Implementation functions
function registerWorld(
  state: DayNightCycleState,
  deps: DayNightCycleDeps,
  worldId: string,
  timezoneOffsetMicros: bigint,
): string | 'OK' {
  if (state.clocks.has(worldId)) {
    return 'WORLD_ALREADY_REGISTERED';
  }

  const now = deps.clock.nowMicroseconds();
  const localTime = now + timezoneOffsetMicros;
  const phase = phaseFromTime(localTime);

  const clock: WorldClock = {
    worldId,
    currentTimeMicros: localTime,
    timezoneOffsetMicros,
    currentPhase: phase,
  };

  state.clocks.set(worldId, clock);
  state.transitionHistory.set(worldId, []);

  deps.logger.info('world_clock_registered', {
    worldId,
    timezoneOffsetMicros: String(timezoneOffsetMicros),
    initialPhase: phase,
  });

  return 'OK';
}

function advanceClock(
  state: DayNightCycleState,
  deps: DayNightCycleDeps,
  worldId: string,
): string | 'OK' {
  const clock = state.clocks.get(worldId);
  if (clock === undefined) {
    return 'WORLD_NOT_FOUND';
  }

  const now = deps.clock.nowMicroseconds();
  const newLocalTime = now + clock.timezoneOffsetMicros;
  const newPhase = phaseFromTime(newLocalTime);

  if (newPhase !== clock.currentPhase) {
    recordPhaseTransition(state, deps, clock, newPhase);
  }

  clock.currentTimeMicros = newLocalTime;
  clock.currentPhase = newPhase;

  return 'OK';
}

function advanceAllClocks(state: DayNightCycleState, deps: DayNightCycleDeps): number {
  let advancedCount = 0;

  for (const worldId of state.clocks.keys()) {
    const result = advanceClock(state, deps, worldId);
    if (result === 'OK') {
      advancedCount = advancedCount + 1;
    }
  }

  return advancedCount;
}

function phaseFromTime(timeMicros: bigint): DayPhase {
  const dayMicros = timeMicros % MICROSECONDS_PER_DAY;
  const hours = Number(dayMicros / MICROSECONDS_PER_HOUR);

  if (hours >= 0 && hours < 3) {
    return 'DEEP_NIGHT';
  }
  if (hours >= 3 && hours < 6) {
    return 'DAWN';
  }
  if (hours >= 6 && hours < 9) {
    return 'MORNING';
  }
  if (hours >= 9 && hours < 12) {
    return 'MIDDAY';
  }
  if (hours >= 12 && hours < 15) {
    return 'AFTERNOON';
  }
  if (hours >= 15 && hours < 18) {
    return 'DUSK';
  }
  if (hours >= 18 && hours < 21) {
    return 'EVENING';
  }
  return 'MIDNIGHT';
}

function recordPhaseTransition(
  state: DayNightCycleState,
  deps: DayNightCycleDeps,
  clock: WorldClock,
  newPhase: DayPhase,
): void {
  const transition: PhaseTransition = {
    worldId: clock.worldId,
    fromPhase: clock.currentPhase,
    toPhase: newPhase,
    transitionTimeMicros: deps.clock.nowMicroseconds(),
  };

  const history = state.transitionHistory.get(clock.worldId);
  if (history !== undefined) {
    history.push(transition);
    if (history.length > 50) {
      history.shift();
    }
  }

  deps.logger.info('phase_transition', {
    worldId: clock.worldId,
    from: clock.currentPhase,
    to: newPhase,
  });

  notifyListeners(state, transition);
}

function notifyListeners(state: DayNightCycleState, transition: PhaseTransition): void {
  for (const listener of state.listeners) {
    listener(transition);
  }
}

function getCurrentPhase(state: DayNightCycleState, worldId: string): string | DayPhase {
  const clock = state.clocks.get(worldId);
  if (clock === undefined) {
    return 'WORLD_NOT_FOUND';
  }
  return clock.currentPhase;
}

function getLightingState(state: DayNightCycleState, worldId: string): string | LightingState {
  const clock = state.clocks.get(worldId);
  if (clock === undefined) {
    return 'WORLD_NOT_FOUND';
  }

  return lightingStateFromPhase(clock.currentPhase);
}

function lightingStateFromPhase(phase: DayPhase): LightingState {
  if (phase === 'DEEP_NIGHT') {
    return { intensity: 0.05, temperature: 4000, shadowLength: 0.0 };
  }
  if (phase === 'DAWN') {
    return { intensity: 0.3, temperature: 5500, shadowLength: 5.0 };
  }
  if (phase === 'MORNING') {
    return { intensity: 0.7, temperature: 6000, shadowLength: 3.0 };
  }
  if (phase === 'MIDDAY') {
    return { intensity: 1.0, temperature: 6500, shadowLength: 1.0 };
  }
  if (phase === 'AFTERNOON') {
    return { intensity: 0.8, temperature: 6000, shadowLength: 2.0 };
  }
  if (phase === 'DUSK') {
    return { intensity: 0.4, temperature: 4500, shadowLength: 4.0 };
  }
  if (phase === 'EVENING') {
    return { intensity: 0.15, temperature: 3500, shadowLength: 0.5 };
  }
  return { intensity: 0.08, temperature: 3000, shadowLength: 0.0 };
}

function getWorldTime(state: DayNightCycleState, worldId: string): string | TimeOfDay {
  const clock = state.clocks.get(worldId);
  if (clock === undefined) {
    return 'WORLD_NOT_FOUND';
  }

  return timeOfDayFromMicros(clock.currentTimeMicros);
}

function timeOfDayFromMicros(timeMicros: bigint): TimeOfDay {
  const dayMicros = timeMicros % MICROSECONDS_PER_DAY;
  const hours = Number(dayMicros / MICROSECONDS_PER_HOUR);
  const remainderAfterHours = dayMicros % MICROSECONDS_PER_HOUR;
  const minutes = Number(remainderAfterHours / MICROSECONDS_PER_MINUTE);
  const remainderAfterMinutes = remainderAfterHours % MICROSECONDS_PER_MINUTE;
  const seconds = Number(remainderAfterMinutes / MICROSECONDS_PER_SECOND);
  const microseconds = remainderAfterMinutes % MICROSECONDS_PER_SECOND;

  return {
    hours,
    minutes,
    seconds,
    microseconds,
  };
}

function registerPhaseListener(state: DayNightCycleState, listener: PhaseListener): void {
  state.listeners.push(listener);
}

function getTransitionHistory(
  state: DayNightCycleState,
  worldId: string,
): readonly PhaseTransition[] {
  const history = state.transitionHistory.get(worldId);
  if (history === undefined) {
    return [];
  }
  return history;
}

function getAllWorlds(state: DayNightCycleState): readonly WorldClock[] {
  return Array.from(state.clocks.values());
}
