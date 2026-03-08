/**
 * world-time-zone.ts — Per-world local time tracking.
 *
 * Each world has its own day length and time offset. Converts
 * universal Loom time to local world time, tracks day/night
 * cycles, and reports world-local timestamps.
 */

// ── Ports ────────────────────────────────────────────────────────

interface TimeZoneClock {
  readonly nowMicroseconds: () => number;
}

interface WorldTimeZoneDeps {
  readonly clock: TimeZoneClock;
}

// ── Types ────────────────────────────────────────────────────────

interface WorldTimeConfig {
  readonly worldId: string;
  readonly dayLengthMicro: number;
  readonly offsetMicro: number;
}

interface WorldLocalTime {
  readonly worldId: string;
  readonly localTimeMicro: number;
  readonly dayProgress: number;
  readonly isDay: boolean;
  readonly dayNumber: number;
}

interface WorldTimeZoneStats {
  readonly trackedWorlds: number;
}

interface WorldTimeZoneService {
  readonly configure: (config: WorldTimeConfig) => void;
  readonly getLocalTime: (worldId: string) => WorldLocalTime | undefined;
  readonly isDaytime: (worldId: string) => boolean | undefined;
  readonly getDayNumber: (worldId: string) => number | undefined;
  readonly getStats: () => WorldTimeZoneStats;
}

// ── State ────────────────────────────────────────────────────────

interface TimeZoneState {
  readonly deps: WorldTimeZoneDeps;
  readonly configs: Map<string, WorldTimeConfig>;
}

// ── Operations ───────────────────────────────────────────────────

function getLocalTimeImpl(state: TimeZoneState, worldId: string): WorldLocalTime | undefined {
  const cfg = state.configs.get(worldId);
  if (!cfg) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  const adjustedTime = now + cfg.offsetMicro;
  const localInDay = adjustedTime % cfg.dayLengthMicro;
  const dayProgress = localInDay / cfg.dayLengthMicro;
  const dayNumber = Math.floor(adjustedTime / cfg.dayLengthMicro);
  return {
    worldId,
    localTimeMicro: localInDay,
    dayProgress,
    isDay: dayProgress >= 0.25 && dayProgress < 0.75,
    dayNumber,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldTimeZoneService(deps: WorldTimeZoneDeps): WorldTimeZoneService {
  const state: TimeZoneState = { deps, configs: new Map() };
  return {
    configure: (cfg) => { state.configs.set(cfg.worldId, cfg); },
    getLocalTime: (id) => getLocalTimeImpl(state, id),
    isDaytime: (id) => getLocalTimeImpl(state, id)?.isDay,
    getDayNumber: (id) => getLocalTimeImpl(state, id)?.dayNumber,
    getStats: () => ({ trackedWorlds: state.configs.size }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldTimeZoneService };
export type {
  WorldTimeZoneService,
  WorldTimeZoneDeps,
  WorldTimeConfig,
  WorldLocalTime,
  WorldTimeZoneStats,
};
