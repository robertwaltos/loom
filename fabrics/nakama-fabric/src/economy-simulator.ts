/**
 * economy-simulator.ts ΓÇö Sandbox economy simulator for The Concord.
 *
 * Allows game designers and economists to run parameter sweeps on
 * the KALON economy without touching production data. Simulates
 * minting, burning, trade taxation, inflation pressure, and world
 * allocation over configurable game-year spans.
 *
 * All simulation state is in-memory and deterministic for a given seed.
 *
 * Thread: nakama-fabric
 * Tier: 1
 */

// ΓöÇΓöÇΓöÇ Economy Parameters ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface EconomyParams {
  readonly initialSupply: number;
  readonly mintRatePerYear: number;
  readonly burnRatePerYear: number;
  readonly tradeTaxRate: number;
  readonly worldCount: number;
  readonly activeTraderFraction: number;
  readonly tradeVolumePerTraderPerYear: number;
  readonly inflationTargetPercent: number;
  readonly dynastiesPerWorld: number;
}

export const DEFAULT_ECONOMY_PARAMS: EconomyParams = {
  initialSupply: 10_000_000,
  mintRatePerYear: 50_000,
  burnRatePerYear: 30_000,
  tradeTaxRate: 0.02,
  worldCount: 600,
  activeTraderFraction: 0.1,
  tradeVolumePerTraderPerYear: 500,
  inflationTargetPercent: 2.0,
  dynastiesPerWorld: 20,
};

// ΓöÇΓöÇΓöÇ Simulation Tick / Year ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface EconomyYearSnapshot {
  readonly year: number;
  readonly totalSupply: number;
  readonly mintedThisYear: number;
  readonly burnedThisYear: number;
  readonly taxCollectedThisYear: number;
  readonly totalTrades: number;
  readonly inflationPercent: number;
  readonly activeTraders: number;
  readonly kalonPerDynasty: number;
  readonly supplyChangePercent: number;
}

export interface SimulationResult {
  readonly params: EconomyParams;
  readonly years: readonly EconomyYearSnapshot[];
  readonly finalSupply: number;
  readonly averageInflation: number;
  readonly peakSupply: number;
  readonly troughSupply: number;
  readonly totalMinted: number;
  readonly totalBurned: number;
  readonly totalTaxCollected: number;
  readonly isStable: boolean;
  readonly stabilityScore: number;
}

// ΓöÇΓöÇΓöÇ Scenario Presets ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type EconomyScenario =
  | 'BASELINE'
  | 'HIGH_INFLATION'
  | 'DEFLATION_SPIRAL'
  | 'TRADE_BOOM'
  | 'ISOLATED_WORLDS'
  | 'TAX_FREE';

export const SCENARIO_PARAMS: Record<EconomyScenario, Partial<EconomyParams>> = {
  BASELINE: {},
  HIGH_INFLATION: { mintRatePerYear: 200_000, burnRatePerYear: 10_000 },
  DEFLATION_SPIRAL: { mintRatePerYear: 5_000, burnRatePerYear: 80_000 },
  TRADE_BOOM: { activeTraderFraction: 0.5, tradeVolumePerTraderPerYear: 2000 },
  ISOLATED_WORLDS: { activeTraderFraction: 0.01, tradeTaxRate: 0.0 },
  TAX_FREE: { tradeTaxRate: 0.0 },
};

// ΓöÇΓöÇΓöÇ Simulator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function buildSimulationParams(
  scenario: EconomyScenario,
  overrides?: Partial<EconomyParams>,
): EconomyParams {
  return {
    ...DEFAULT_ECONOMY_PARAMS,
    ...SCENARIO_PARAMS[scenario],
    ...(overrides ?? {}),
  };
}

export function runEconomySimulation(
  params: EconomyParams,
  yearsToSimulate: number,
): SimulationResult {
  if (yearsToSimulate < 1) throw new RangeError('yearsToSimulate must be >= 1');
  if (yearsToSimulate > 1_000) throw new RangeError('yearsToSimulate must be <= 1000');

  const years: EconomyYearSnapshot[] = [];
  let supply = params.initialSupply;
  const totalDynasties = params.worldCount * params.dynastiesPerWorld;
  const tradersTotal = Math.round(totalDynasties * params.activeTraderFraction);

  let totalMinted = 0;
  let totalBurned = 0;
  let totalTaxCollected = 0;
  let peakSupply = supply;
  let troughSupply = supply;
  let inflationSum = 0;

  for (let year = 1; year <= yearsToSimulate; year++) {
    const prevSupply = supply;

    const minted = params.mintRatePerYear;
    const burned = params.burnRatePerYear;
    const totalTradeVolume = tradersTotal * params.tradeVolumePerTraderPerYear;
    const taxCollected = totalTradeVolume * params.tradeTaxRate;

    // Tax proceeds are burned (deflationary sink)
    const netBurn = burned + taxCollected;
    supply = Math.max(0, supply + minted - netBurn);

    totalMinted += minted;
    totalBurned += netBurn;
    totalTaxCollected += taxCollected;

    peakSupply = Math.max(peakSupply, supply);
    troughSupply = Math.min(troughSupply, supply);

    const supplyChangePercent = prevSupply > 0
      ? ((supply - prevSupply) / prevSupply) * 100
      : 0;

    inflationSum += supplyChangePercent;

    years.push({
      year,
      totalSupply: supply,
      mintedThisYear: minted,
      burnedThisYear: netBurn,
      taxCollectedThisYear: taxCollected,
      totalTrades: tradersTotal,
      inflationPercent: supplyChangePercent,
      activeTraders: tradersTotal,
      kalonPerDynasty: totalDynasties > 0 ? supply / totalDynasties : 0,
      supplyChangePercent,
    });
  }

  const averageInflation = inflationSum / yearsToSimulate;
  const deviations = years.map((y) => Math.abs(y.inflationPercent - averageInflation));
  const maxDeviation = Math.max(...deviations);
  const stabilityScore = Math.max(0, 100 - maxDeviation * 10);
  const isStable = Math.abs(averageInflation) <= params.inflationTargetPercent * 1.5
    && supply > 0;

  return {
    params,
    years,
    finalSupply: supply,
    averageInflation,
    peakSupply,
    troughSupply,
    totalMinted,
    totalBurned,
    totalTaxCollected,
    isStable,
    stabilityScore,
  };
}

// ΓöÇΓöÇΓöÇ Parameter Sweep ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface SweepAxis {
  readonly param: keyof EconomyParams;
  readonly values: readonly number[];
}

export interface SweepEntry {
  readonly paramValue: number;
  readonly result: SimulationResult;
}

export function sweepParameter(
  baseParams: EconomyParams,
  axis: SweepAxis,
  yearsToSimulate: number,
): readonly SweepEntry[] {
  return axis.values.map((v) => {
    const params = { ...baseParams, [axis.param]: v };
    return { paramValue: v, result: runEconomySimulation(params, yearsToSimulate) };
  });
}

// ΓöÇΓöÇΓöÇ Comparison Report ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ScenarioComparison {
  readonly scenario: EconomyScenario;
  readonly finalSupply: number;
  readonly averageInflation: number;
  readonly isStable: boolean;
  readonly stabilityScore: number;
  readonly totalMinted: number;
  readonly totalBurned: number;
}

export function compareScenarios(
  yearsToSimulate: number,
  scenarios: readonly EconomyScenario[] = [
    'BASELINE',
    'HIGH_INFLATION',
    'DEFLATION_SPIRAL',
    'TRADE_BOOM',
    'TAX_FREE',
  ],
): readonly ScenarioComparison[] {
  return scenarios.map((scenario) => {
    const params = buildSimulationParams(scenario);
    const result = runEconomySimulation(params, yearsToSimulate);
    return {
      scenario,
      finalSupply: result.finalSupply,
      averageInflation: result.averageInflation,
      isStable: result.isStable,
      stabilityScore: result.stabilityScore,
      totalMinted: result.totalMinted,
      totalBurned: result.totalBurned,
    };
  });
}

// ΓöÇΓöÇΓöÇ Sensitivity Analysis ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface SensitivityResult {
  readonly param: keyof EconomyParams;
  readonly baselineStability: number;
  readonly plusTenPercentStability: number;
  readonly minusTenPercentStability: number;
  readonly sensitivity: number;
}

export function runSensitivityAnalysis(
  baseParams: EconomyParams,
  yearsToSimulate: number,
  paramsToTest: readonly (keyof EconomyParams)[] = [
    'mintRatePerYear',
    'burnRatePerYear',
    'tradeTaxRate',
    'activeTraderFraction',
    'tradeVolumePerTraderPerYear',
  ],
): readonly SensitivityResult[] {
  const baseline = runEconomySimulation(baseParams, yearsToSimulate);

  return paramsToTest.map((param) => {
    const baseVal = baseParams[param] as number;
    const high = { ...baseParams, [param]: baseVal * 1.1 };
    const low = { ...baseParams, [param]: baseVal * 0.9 };
    const highResult = runEconomySimulation(high, yearsToSimulate);
    const lowResult = runEconomySimulation(low, yearsToSimulate);
    const sensitivity =
      Math.abs(highResult.stabilityScore - baseline.stabilityScore) +
      Math.abs(lowResult.stabilityScore - baseline.stabilityScore);
    return {
      param,
      baselineStability: baseline.stabilityScore,
      plusTenPercentStability: highResult.stabilityScore,
      minusTenPercentStability: lowResult.stabilityScore,
      sensitivity,
    };
  });
}
