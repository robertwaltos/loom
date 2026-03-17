/**
 * Game State Aggregator ΓÇö Collects civilisational data for the Architect's quarterly report.
 *
 * Pulls from economy, Chronicle, Assembly, Survey Corps, and Lattice systems.
 * Sensitive fields are marked ΓÇö not all of them are published.
 */

export interface EconomySnapshot {
  readonly totalSupply: bigint;
  readonly weeklyIssuance: bigint;
  readonly averageWealthGini: number; // 0-1
  readonly commonsBalance: bigint;
  readonly dynastiesInStructuralConcentration: number;
  readonly worldsOnline: number;
  readonly averageLatticeIntegrity: number;
}

export interface ChronicleSnapshot {
  readonly totalEntries: number;
  readonly entriesThisQuarter: number;
  readonly averageDepthScore: number;
  readonly dynastiesWithEntry847Read: number; // Sensitive ΓÇö never published
  readonly mostActiveCategory: string;
  readonly foundingWoundEngagementLevel: string;
}

export interface GovernanceSnapshot {
  readonly motionsFiledThisQuarter: number;
  readonly motionsPassed: number;
  readonly motionsFailed: number;
  readonly assemblyParticipationRate: number; // 0-1
  readonly constitutionalMotionsPending: number;
  readonly dominantFaction: string;
}

export interface SurveySnapshot {
  readonly worldsOpenedThisQuarter: number;
  readonly totalWorldsOpen: number;
  readonly activeExpeditions: number;
  readonly lostExpeditions: number;
  readonly outerArcAnomalyDetected: boolean; // Sensitive ΓÇö may or may not disclose
}

export interface LatticeSnapshot {
  readonly averageIntegrity: number;
  readonly degradedWorlds: number; // < 40% integrity
  readonly kwameFragmentsFound: number; // 0-7 ΓÇö Sensitive
  readonly ascendancyInterferenceWorlds: number;
  readonly mostRecentAnomalyType: string | null;
}

export interface FactionSnapshot {
  readonly continuationistSeats: number;
  readonly returnistSeats: number;
  readonly latticeCovenantSeats: number;
  readonly currentPoliticalMoment: string;
}

export interface WoundSnapshot {
  readonly wound1Status: string;
  readonly wound2Status: string;
  readonly wound3Status: string;
  readonly woundsPubliclyKnown: number; // 0-3
}

export interface QuarterlyGameState {
  readonly quarter: number; // 1-4
  readonly inGameYear: number;
  readonly realDate: string;
  readonly economy: EconomySnapshot;
  readonly chronicle: ChronicleSnapshot;
  readonly governance: GovernanceSnapshot;
  readonly survey: SurveySnapshot;
  readonly lattice: LatticeSnapshot;
  readonly factions: FactionSnapshot;
  readonly foundingWounds: WoundSnapshot;
}

export interface QuarterlyDelta {
  readonly economyChanged: boolean;
  readonly newWorldsThisQuarter: number;
  readonly giniDrift: number; // positive = more concentrated
  readonly participationRateChange: number;
  readonly latticeIntegrityChange: number;
  readonly kwameFragmentsDelta: number;
  readonly summary: string;
}

export interface EconomyAggregatorPort {
  readonly getTotalSupply: () => Promise<bigint>;
  readonly getWeeklyIssuance: () => Promise<bigint>;
  readonly getGiniCoefficient: () => Promise<number>;
  readonly getCommonsBalance: () => Promise<bigint>;
  readonly getDynastiesInStructuralConcentration: () => Promise<number>;
  readonly getWorldsOnline: () => Promise<number>;
  readonly getAverageLatticeIntegrity: () => Promise<number>;
}

export interface ChronicleAggregatorPort {
  readonly getTotalEntries: () => Promise<number>;
  readonly getEntriesThisQuarter: (quarter: number, year: number) => Promise<number>;
  readonly getAverageDepthScore: () => Promise<number>;
  readonly getDynastiesWithEntry847Read: () => Promise<number>;
  readonly getMostActiveCategory: () => Promise<string>;
  readonly getFoundingWoundEngagementLevel: () => Promise<string>;
}

export interface GovernanceAggregatorPort {
  readonly getMotionsFiledThisQuarter: (quarter: number, year: number) => Promise<number>;
  readonly getMotionsPassed: (quarter: number, year: number) => Promise<number>;
  readonly getMotionsFailed: (quarter: number, year: number) => Promise<number>;
  readonly getAssemblyParticipationRate: () => Promise<number>;
  readonly getConstitutionalMotionsPending: () => Promise<number>;
  readonly getDominantFaction: () => Promise<string>;
}

export interface SurveyAggregatorPort {
  readonly getWorldsOpenedThisQuarter: (quarter: number, year: number) => Promise<number>;
  readonly getTotalWorldsOpen: () => Promise<number>;
  readonly getActiveExpeditions: () => Promise<number>;
  readonly getLostExpeditions: (quarter: number, year: number) => Promise<number>;
  readonly getOuterArcAnomalyDetected: () => Promise<boolean>;
}

export interface LatticeAggregatorPort {
  readonly getAverageIntegrity: () => Promise<number>;
  readonly getDegradedWorlds: () => Promise<number>;
  readonly getKwameFragmentsFound: () => Promise<number>;
  readonly getAscendancyInterferenceWorlds: () => Promise<number>;
  readonly getMostRecentAnomalyType: () => Promise<string | null>;
}

export interface FactionAggregatorPort {
  readonly getContinuationistSeats: () => Promise<number>;
  readonly getReturnistSeats: () => Promise<number>;
  readonly getLatticeCovenantSeats: () => Promise<number>;
  readonly getCurrentPoliticalMoment: () => Promise<string>;
}

export interface WoundAggregatorPort {
  readonly getWound1Status: () => Promise<string>;
  readonly getWound2Status: () => Promise<string>;
  readonly getWound3Status: () => Promise<string>;
  readonly getWoundsPubliclyKnown: () => Promise<number>;
}

export interface GameStateDependencies {
  readonly economy: EconomyAggregatorPort;
  readonly chronicle: ChronicleAggregatorPort;
  readonly governance: GovernanceAggregatorPort;
  readonly survey: SurveyAggregatorPort;
  readonly lattice: LatticeAggregatorPort;
  readonly factions: FactionAggregatorPort;
  readonly wounds: WoundAggregatorPort;
}

async function gatherEconomySnapshot(port: EconomyAggregatorPort): Promise<EconomySnapshot> {
  const [
    totalSupply,
    weeklyIssuance,
    averageWealthGini,
    commonsBalance,
    dynastiesInStructuralConcentration,
    worldsOnline,
    averageLatticeIntegrity,
  ] = await Promise.all([
    port.getTotalSupply(),
    port.getWeeklyIssuance(),
    port.getGiniCoefficient(),
    port.getCommonsBalance(),
    port.getDynastiesInStructuralConcentration(),
    port.getWorldsOnline(),
    port.getAverageLatticeIntegrity(),
  ]);

  return {
    totalSupply,
    weeklyIssuance,
    averageWealthGini: Math.max(0, Math.min(1, averageWealthGini)),
    commonsBalance,
    dynastiesInStructuralConcentration,
    worldsOnline,
    averageLatticeIntegrity: Math.max(0, Math.min(100, averageLatticeIntegrity)),
  };
}

async function gatherChronicleSnapshot(
  port: ChronicleAggregatorPort,
  quarter: number,
  year: number,
): Promise<ChronicleSnapshot> {
  const [
    totalEntries,
    entriesThisQuarter,
    averageDepthScore,
    dynastiesWithEntry847Read,
    mostActiveCategory,
    foundingWoundEngagementLevel,
  ] = await Promise.all([
    port.getTotalEntries(),
    port.getEntriesThisQuarter(quarter, year),
    port.getAverageDepthScore(),
    port.getDynastiesWithEntry847Read(),
    port.getMostActiveCategory(),
    port.getFoundingWoundEngagementLevel(),
  ]);

  return {
    totalEntries,
    entriesThisQuarter,
    averageDepthScore,
    dynastiesWithEntry847Read,
    mostActiveCategory,
    foundingWoundEngagementLevel,
  };
}

async function gatherGovernanceSnapshot(
  port: GovernanceAggregatorPort,
  quarter: number,
  year: number,
): Promise<GovernanceSnapshot> {
  const [
    motionsFiledThisQuarter,
    motionsPassed,
    motionsFailed,
    assemblyParticipationRate,
    constitutionalMotionsPending,
    dominantFaction,
  ] = await Promise.all([
    port.getMotionsFiledThisQuarter(quarter, year),
    port.getMotionsPassed(quarter, year),
    port.getMotionsFailed(quarter, year),
    port.getAssemblyParticipationRate(),
    port.getConstitutionalMotionsPending(),
    port.getDominantFaction(),
  ]);

  return {
    motionsFiledThisQuarter,
    motionsPassed,
    motionsFailed,
    assemblyParticipationRate: Math.max(0, Math.min(1, assemblyParticipationRate)),
    constitutionalMotionsPending,
    dominantFaction,
  };
}

async function gatherSurveySnapshot(
  port: SurveyAggregatorPort,
  quarter: number,
  year: number,
): Promise<SurveySnapshot> {
  const [
    worldsOpenedThisQuarter,
    totalWorldsOpen,
    activeExpeditions,
    lostExpeditions,
    outerArcAnomalyDetected,
  ] = await Promise.all([
    port.getWorldsOpenedThisQuarter(quarter, year),
    port.getTotalWorldsOpen(),
    port.getActiveExpeditions(),
    port.getLostExpeditions(quarter, year),
    port.getOuterArcAnomalyDetected(),
  ]);

  return {
    worldsOpenedThisQuarter,
    totalWorldsOpen,
    activeExpeditions,
    lostExpeditions,
    outerArcAnomalyDetected,
  };
}

async function gatherLatticeSnapshot(port: LatticeAggregatorPort): Promise<LatticeSnapshot> {
  const [
    averageIntegrity,
    degradedWorlds,
    kwameFragmentsFound,
    ascendancyInterferenceWorlds,
    mostRecentAnomalyType,
  ] = await Promise.all([
    port.getAverageIntegrity(),
    port.getDegradedWorlds(),
    port.getKwameFragmentsFound(),
    port.getAscendancyInterferenceWorlds(),
    port.getMostRecentAnomalyType(),
  ]);

  return {
    averageIntegrity: Math.max(0, Math.min(100, averageIntegrity)),
    degradedWorlds,
    kwameFragmentsFound: Math.max(0, Math.min(7, kwameFragmentsFound)),
    ascendancyInterferenceWorlds,
    mostRecentAnomalyType,
  };
}

async function gatherFactionSnapshot(port: FactionAggregatorPort): Promise<FactionSnapshot> {
  const [continuationistSeats, returnistSeats, latticeCovenantSeats, currentPoliticalMoment] =
    await Promise.all([
      port.getContinuationistSeats(),
      port.getReturnistSeats(),
      port.getLatticeCovenantSeats(),
      port.getCurrentPoliticalMoment(),
    ]);

  return { continuationistSeats, returnistSeats, latticeCovenantSeats, currentPoliticalMoment };
}

async function gatherWoundSnapshot(port: WoundAggregatorPort): Promise<WoundSnapshot> {
  const [wound1Status, wound2Status, wound3Status, woundsPubliclyKnown] = await Promise.all([
    port.getWound1Status(),
    port.getWound2Status(),
    port.getWound3Status(),
    port.getWoundsPubliclyKnown(),
  ]);

  return {
    wound1Status,
    wound2Status,
    wound3Status,
    woundsPubliclyKnown: Math.max(0, Math.min(3, woundsPubliclyKnown)),
  };
}

export async function aggregateQuarterlyState(
  deps: GameStateDependencies,
  quarter: number,
  inGameYear: number,
  realDate: string,
): Promise<QuarterlyGameState> {
  const [economy, chronicle, governance, survey, lattice, factions, foundingWounds] =
    await Promise.all([
      gatherEconomySnapshot(deps.economy),
      gatherChronicleSnapshot(deps.chronicle, quarter, inGameYear),
      gatherGovernanceSnapshot(deps.governance, quarter, inGameYear),
      gatherSurveySnapshot(deps.survey, quarter, inGameYear),
      gatherLatticeSnapshot(deps.lattice),
      gatherFactionSnapshot(deps.factions),
      gatherWoundSnapshot(deps.wounds),
    ]);

  return {
    quarter,
    inGameYear,
    realDate,
    economy,
    chronicle,
    governance,
    survey,
    lattice,
    factions,
    foundingWounds,
  };
}

export function compareWithPreviousQuarter(
  current: QuarterlyGameState,
  previous: QuarterlyGameState,
): QuarterlyDelta {
  const newWorldsThisQuarter = current.survey.totalWorldsOpen - previous.survey.totalWorldsOpen;
  const giniDrift = current.economy.averageWealthGini - previous.economy.averageWealthGini;
  const participationRateChange =
    current.governance.assemblyParticipationRate - previous.governance.assemblyParticipationRate;
  const latticeIntegrityChange =
    current.lattice.averageIntegrity - previous.lattice.averageIntegrity;
  const kwameFragmentsDelta =
    current.lattice.kwameFragmentsFound - previous.lattice.kwameFragmentsFound;

  const economyChanged =
    current.economy.totalSupply !== previous.economy.totalSupply ||
    Math.abs(giniDrift) > 0.01 ||
    current.economy.worldsOnline !== previous.economy.worldsOnline;

  const summary = buildDeltaSummary(
    giniDrift,
    newWorldsThisQuarter,
    participationRateChange,
    latticeIntegrityChange,
  );

  return {
    economyChanged,
    newWorldsThisQuarter,
    giniDrift,
    participationRateChange,
    latticeIntegrityChange,
    kwameFragmentsDelta,
    summary,
  };
}

function buildDeltaSummary(
  giniDrift: number,
  newWorlds: number,
  participationChange: number,
  integrityChange: number,
): string {
  const parts: string[] = [];

  if (Math.abs(giniDrift) > 0.01) {
    parts.push(giniDrift > 0 ? 'Wealth concentration increased.' : 'Wealth distribution improved.');
  }
  if (newWorlds > 0) {
    parts.push(`${newWorlds} new world${newWorlds === 1 ? '' : 's'} opened.`);
  }
  if (Math.abs(participationChange) > 0.05) {
    parts.push(
      participationChange > 0 ? 'Assembly participation rose.' : 'Assembly participation declined.',
    );
  }
  if (Math.abs(integrityChange) > 2) {
    parts.push(integrityChange > 0 ? 'Lattice integrity improved.' : 'Lattice integrity declined.');
  }
  if (parts.length === 0) {
    return 'No significant changes observed this quarter.';
  }

  return parts.join(' ');
}
