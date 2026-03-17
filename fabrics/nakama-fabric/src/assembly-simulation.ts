/**
 * Assembly Simulation Service ΓÇö proves governance works at civilisational scale.
 *
 * Bible v1.2: The Assembly governs 600 worlds and 25M+ dynasties by Year 105.
 * This simulation runs deterministic large-scale vote tabulations to validate
 * the weighted voting system under realistic load.
 *
 * Voting weight factors (per bible):
 *   40% Chronicle depth  ΓÇö proxy: seeded random 0ΓÇô100 per dynasty
 *   35% Economic position ΓÇö proxy: KALON wealth tier (seeded)
 *   25% Civic contribution ΓÇö proxy: seeded random 0ΓÇô100 per dynasty
 *
 * Architect advisory weight: 7% ORDINARY, 14% SIGNIFICANT, CONSTITUTIONAL = blocked if against.
 */

export interface AssemblySimulationConfig {
  readonly worldCount: number;
  readonly dynastiesPerWorld: number;
  readonly motionType: 'ORDINARY' | 'SIGNIFICANT' | 'CONSTITUTIONAL';
  readonly ascendancyDynastyFraction: number;
  readonly participationRate: number;
  /** Fraction of non-Ascendancy dynasties that vote 'for'. Default: 0.65 */
  readonly generalForBias?: number;
}

export interface AssemblySimulationResult {
  readonly totalDynasties: number;
  readonly totalVotesCast: number;
  readonly motionType: string;
  readonly forWeight: number;
  readonly againstWeight: number;
  readonly abstainWeight: number;
  readonly architectWeight: number;
  readonly passed: boolean;
  readonly blockedByArchitect: boolean;
  readonly processingTimeMs: number;
  readonly quorumMet: boolean;
}

const THRESHOLDS: Readonly<Record<string, number>> = {
  ORDINARY: 0.5,
  SIGNIFICANT: 0.65,
  CONSTITUTIONAL: 0.75,
};

const ARCHITECT_ADVISORY_WEIGHT: Readonly<Record<string, number>> = {
  ORDINARY: 0.07,
  SIGNIFICANT: 0.14,
  CONSTITUTIONAL: 0,
};

const CHRONICLE_WEIGHT = 0.4;
const ECONOMIC_WEIGHT = 0.35;
const CIVIC_WEIGHT = 0.25;
const DIGNITY_FLOOR = 0.001;
const QUORUM_FRACTION = 0.5;

/** Seeded PRNG ΓÇö mulberry32. Deterministic given seed. */
function createPrng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

function computeDynastyVotingWeight(chronicle: number, economic: number, civic: number): number {
  const raw = chronicle * CHRONICLE_WEIGHT + economic * ECONOMIC_WEIGHT + civic * CIVIC_WEIGHT;
  return Math.max(raw / 100, DIGNITY_FLOOR);
}

function selectVoteChoice(
  rand: number,
  isAscendancy: boolean,
  forBias: number,
): 'for' | 'against' | 'abstain' {
  const abstainThreshold = 0.05;
  if (rand < abstainThreshold) return 'abstain';
  if (isAscendancy) return rand < abstainThreshold + 0.8 ? 'against' : 'for';
  return rand < abstainThreshold + forBias ? 'for' : 'against';
}

function tabulate(
  totalDynasties: number,
  config: AssemblySimulationConfig,
  rand: () => number,
): { forW: number; againstW: number; abstainW: number; cast: number } {
  let forW = 0;
  let againstW = 0;
  let abstainW = 0;
  let cast = 0;

  const ascendancyCount = Math.floor(totalDynasties * config.ascendancyDynastyFraction);
  const forBias = config.generalForBias ?? 0.65;

  for (let i = 0; i < totalDynasties; i++) {
    const participates = rand() < config.participationRate;
    if (!participates) {
      rand();
      rand();
      rand();
      rand();
      continue;
    }
    const chronicle = rand() * 100;
    const economic = rand() * 100;
    const civic = rand() * 100;
    const weight = computeDynastyVotingWeight(chronicle, economic, civic);
    const isAscendancy = i < ascendancyCount;
    const choice = selectVoteChoice(rand(), isAscendancy, forBias);
    cast++;
    if (choice === 'for') forW += weight;
    else if (choice === 'against') againstW += weight;
    else abstainW += weight;
  }

  return { forW, againstW, abstainW, cast };
}

function resolveOutcome(
  forW: number,
  againstW: number,
  architectChoice: 'for' | 'against',
  motionType: string,
  quorumMet: boolean,
): { passed: boolean; blockedByArchitect: boolean } {
  if (!quorumMet) return { passed: false, blockedByArchitect: false };

  const decisive = forW + againstW;
  const percentFor = decisive > 0 ? forW / decisive : 0;
  const threshold = THRESHOLDS[motionType] ?? 0.5;

  if (motionType === 'CONSTITUTIONAL') {
    const blocked = architectChoice === 'against';
    const passed = !blocked && percentFor >= threshold;
    return { passed, blockedByArchitect: blocked };
  }

  return { passed: percentFor >= threshold, blockedByArchitect: false };
}

export function runSimulation(
  config: AssemblySimulationConfig,
  seed: number,
): AssemblySimulationResult {
  const start = performance.now();
  const rand = createPrng(seed);
  const totalDynasties = config.worldCount * config.dynastiesPerWorld;

  const { forW, againstW, abstainW, cast } = tabulate(totalDynasties, config, rand);

  const architectAdvisoryWeight = ARCHITECT_ADVISORY_WEIGHT[config.motionType] ?? 0;
  const architectRoll = rand();
  const architectChoice: 'for' | 'against' = architectRoll > 0.5 ? 'for' : 'against';

  const quorumMet = cast >= totalDynasties * QUORUM_FRACTION;
  const { passed, blockedByArchitect } = resolveOutcome(
    forW,
    againstW,
    architectChoice,
    config.motionType,
    quorumMet,
  );

  const processingTimeMs = performance.now() - start;

  return {
    totalDynasties,
    totalVotesCast: cast,
    motionType: config.motionType,
    forWeight: forW,
    againstWeight: againstW,
    abstainWeight: abstainW,
    architectWeight: architectAdvisoryWeight,
    passed,
    blockedByArchitect,
    processingTimeMs,
    quorumMet,
  };
}
