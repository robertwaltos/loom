/**
 * Economy Simulator — Sandbox tool for testing economic parameter changes.
 *
 * NEXT-STEPS Phase 16.4: "Economy simulator: sandbox tool for testing
 * economic parameter changes."
 *
 * Allows developers and designers to fast-forward a deterministic in-game
 * economy without running a live server. Given initial capital supplies,
 * tax rates, and trade volumes, the simulator ticks forward and exposes
 * wealth distribution, KALON velocity, inflation index, and Gini coefficient
 * at each step.
 *
 * The simulator is DETERMINISTIC — same params + tick count → same output.
 *
 * Features:
 *   PARAMETER SPACE  — supply, tax rate, trade volume, inflation floor/ceil
 *   TICK ENGINE      — each tick applies tax drain, trade velocity, supply shift
 *   SNAPSHOT API     — inspect state at any tick
 *   RESET            — return to initial params without re-creating the object
 *   SCENARIO PRESETS — common starting configurations (healthy/stagnant/hyperinflationary)
 *
 * Thread: cotton/tools/economy-simulator
 * Tier: 1
 */

// ── Parameters ────────────────────────────────────────────────────

export interface EconomyParams {
  /** Total KALON in circulation. */
  readonly kalonSupply: number;
  /** Fraction of each trade taken as tax (0.0 – 1.0). */
  readonly taxRate: number;
  /** Average KALON exchanged per player per tick. */
  readonly avgTradeVolumePerPlayer: number;
  /** Number of active players in the simulated world. */
  readonly playerCount: number;
  /** Minimum inflation index (floor). */
  readonly inflationFloor: number;
  /** Maximum inflation index before hyperinflation triggers. */
  readonly inflationCeiling: number;
}

export const DEFAULT_ECONOMY_PARAMS: EconomyParams = {
  kalonSupply: 1_000_000,
  taxRate: 0.05,
  avgTradeVolumePerPlayer: 200,
  playerCount: 500,
  inflationFloor: 1.0,
  inflationCeiling: 3.0,
};

// ── Scenario Presets ──────────────────────────────────────────────

export const ECONOMY_PRESETS = {
  healthy: DEFAULT_ECONOMY_PARAMS,

  stagnant: {
    ...DEFAULT_ECONOMY_PARAMS,
    avgTradeVolumePerPlayer: 20,
    taxRate: 0.15,
  },

  hyperinflationary: {
    ...DEFAULT_ECONOMY_PARAMS,
    kalonSupply: 50_000_000,
    avgTradeVolumePerPlayer: 5_000,
    taxRate: 0.01,
  },
} as const satisfies Record<string, EconomyParams>;

// ── Snapshot Types ────────────────────────────────────────────────

export interface WealthBand {
  readonly label: string;
  readonly minKalon: number;
  readonly maxKalon: number;
  readonly playerCount: number;
}

export interface EconomySnapshot {
  readonly tick: number;
  readonly kalonSupply: number;
  /** KALON velocity: total volume traded this tick divided by supply. */
  readonly velocity: number;
  /** Gini coefficient (0 = perfectly equal, 1 = perfectly unequal). */
  readonly giniCoefficient: number;
  /** Simple inflation index relative to tick 0. */
  readonly inflationIndex: number;
  /** Tax revenue collected this tick. */
  readonly taxRevenue: number;
  readonly wealthBands: readonly WealthBand[];
}

// ── Stats ─────────────────────────────────────────────────────────

export interface SimulatorStats {
  readonly currentTick: number;
  readonly totalTaxCollected: number;
  readonly peakInflationIndex: number;
  readonly snapshotCount: number;
}

// ── Public Interface ──────────────────────────────────────────────

export interface EconomySimulator {
  /** Set or override a parameter. Takes effect on the next tick. */
  readonly setParameter: <K extends keyof EconomyParams>(key: K, value: EconomyParams[K]) => void;
  /** Advance the simulation by the given number of ticks. */
  readonly run: (ticks: number) => readonly EconomySnapshot[];
  /** Get the snapshot at the given tick (must have been run). */
  readonly getSnapshot: (tick: number) => EconomySnapshot | null;
  /** Get the latest snapshot. */
  readonly getLatest: () => EconomySnapshot | null;
  /** Reset to initial params and wipe all tick history. */
  readonly reset: (params?: Partial<EconomyParams>) => void;
  /** Current simulator statistics. */
  readonly getStats: () => SimulatorStats;
}

// ── Internal State ────────────────────────────────────────────────

interface SimState {
  params: EconomyParams;
  tick: number;
  kalonSupply: number;
  inflationIndex: number;
  totalTaxCollected: number;
  peakInflationIndex: number;
  snapshots: Map<number, EconomySnapshot>;
}

// ── Wealth Distribution ───────────────────────────────────────────

function buildWealthBands(supply: number, playerCount: number): WealthBand[] {
  const avgWealth = playerCount > 0 ? supply / playerCount : 0;
  return [
    { label: 'destitute',  minKalon: 0,          maxKalon: avgWealth * 0.1,  playerCount: Math.floor(playerCount * 0.10) },
    { label: 'struggling', minKalon: avgWealth * 0.1,  maxKalon: avgWealth * 0.5,  playerCount: Math.floor(playerCount * 0.25) },
    { label: 'comfortable',minKalon: avgWealth * 0.5,  maxKalon: avgWealth * 1.5,  playerCount: Math.floor(playerCount * 0.40) },
    { label: 'wealthy',    minKalon: avgWealth * 1.5,  maxKalon: avgWealth * 5.0,  playerCount: Math.floor(playerCount * 0.20) },
    { label: 'ultra-rich', minKalon: avgWealth * 5.0,  maxKalon: Infinity,         playerCount: Math.floor(playerCount * 0.05) },
  ];
}

// ── Gini Estimate ─────────────────────────────────────────────────

function estimateGini(bands: readonly WealthBand[]): number {
  const totalPlayers = bands.reduce((s, b) => s + b.playerCount, 0);
  if (totalPlayers === 0) return 0;
  let giniNum = 0;
  for (const b of bands) {
    const midpoint = b.maxKalon === Infinity ? b.minKalon * 2 : (b.minKalon + b.maxKalon) / 2;
    const share = b.playerCount / totalPlayers;
    giniNum += share * (1 - share) * Math.abs(midpoint);
  }
  const maxGini = bands.reduce((s, b) => {
    const mid = b.maxKalon === Infinity ? b.minKalon * 2 : (b.minKalon + b.maxKalon) / 2;
    return s + mid;
  }, 0);
  return maxGini > 0 ? Math.min(giniNum / maxGini, 1) : 0;
}

// ── Single Tick ───────────────────────────────────────────────────

function applyTick(state: SimState): EconomySnapshot {
  state.tick++;
  const { params } = state;
  const totalVolume = params.avgTradeVolumePerPlayer * params.playerCount;
  const taxRev = totalVolume * params.taxRate;

  // Supply grows by tax redistribution injection minus drain
  const supplyDelta = taxRev * 0.6; // 60% re-injected as stimulus
  state.kalonSupply = Math.max(0, state.kalonSupply + supplyDelta);

  // Inflation driven by supply growth relative to player demand
  const demandBase = params.avgTradeVolumePerPlayer * params.playerCount;
  const supplyRatio = demandBase > 0 ? state.kalonSupply / (demandBase * 100) : 1;
  const newInflation = Math.min(
    params.inflationCeiling,
    Math.max(params.inflationFloor, state.inflationIndex * (1 + (supplyRatio - 1) * 0.01)),
  );
  state.inflationIndex = newInflation;
  state.totalTaxCollected += taxRev;
  if (newInflation > state.peakInflationIndex) state.peakInflationIndex = newInflation;

  const velocity = state.kalonSupply > 0 ? totalVolume / state.kalonSupply : 0;
  const bands = buildWealthBands(state.kalonSupply, params.playerCount);
  const snapshot: EconomySnapshot = Object.freeze({
    tick: state.tick,
    kalonSupply: state.kalonSupply,
    velocity,
    giniCoefficient: estimateGini(bands),
    inflationIndex: state.inflationIndex,
    taxRevenue: taxRev,
    wealthBands: Object.freeze(bands),
  });
  state.snapshots.set(state.tick, snapshot);
  return snapshot;
}

// ── Run Multiple Ticks ────────────────────────────────────────────

function runTicks(state: SimState, ticks: number): readonly EconomySnapshot[] {
  const results: EconomySnapshot[] = [];
  const maxTicks = Math.max(0, Math.floor(ticks));
  for (let i = 0; i < maxTicks; i++) {
    results.push(applyTick(state));
  }
  return Object.freeze(results);
}

// ── Reset ─────────────────────────────────────────────────────────

function resetState(state: SimState, overrides?: Partial<EconomyParams>): void {
  state.params = { ...state.params, ...overrides };
  state.tick = 0;
  state.kalonSupply = state.params.kalonSupply;
  state.inflationIndex = state.params.inflationFloor;
  state.totalTaxCollected = 0;
  state.peakInflationIndex = state.params.inflationFloor;
  state.snapshots.clear();
}

// ── Factory ───────────────────────────────────────────────────────

export function createEconomySimulator(
  initialParams?: Partial<EconomyParams>,
): EconomySimulator {
  const params: EconomyParams = { ...DEFAULT_ECONOMY_PARAMS, ...initialParams };
  const state: SimState = {
    params,
    tick: 0,
    kalonSupply: params.kalonSupply,
    inflationIndex: params.inflationFloor,
    totalTaxCollected: 0,
    peakInflationIndex: params.inflationFloor,
    snapshots: new Map(),
  };

  return {
    setParameter: (key, value) => { state.params = { ...state.params, [key]: value }; },
    run: (ticks) => runTicks(state, ticks),
    getSnapshot: (tick) => state.snapshots.get(tick) ?? null,
    getLatest: () => state.tick > 0 ? (state.snapshots.get(state.tick) ?? null) : null,
    reset: (p) => { resetState(state, p); },
    getStats: () => ({
      currentTick: state.tick,
      totalTaxCollected: state.totalTaxCollected,
      peakInflationIndex: state.peakInflationIndex,
      snapshotCount: state.snapshots.size,
    }),
  };
}
