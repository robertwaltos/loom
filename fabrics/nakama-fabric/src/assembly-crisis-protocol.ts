/**
 * Assembly Crisis Protocol ΓÇö Governance crises across The Concord's 105-year arc.
 *
 * Bible v1.2: The Concord Assembly faces existential and constitutional challenges
 * at key points in the 105-year arc. These canonical crises shape political narrative,
 * trigger emergency protocols, and resolve through votes, arbitration, or architect
 * consultation. Three crises remain ONGOING at Year 103, their threads unresolved.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CrisisCategory =
  | 'CONSTITUTIONAL'
  | 'ECONOMIC'
  | 'MILITARY'
  | 'ECOLOGICAL'
  | 'EXISTENTIAL'
  | 'SUCCESSION';

export type CrisisSeverity = 'WATCH' | 'ELEVATED' | 'CRITICAL' | 'EMERGENCY';

export type CrisisResolution =
  | 'RESOLVED_BY_VOTE'
  | 'RESOLVED_BY_ARBITRATION'
  | 'RESOLVED_BY_ARCHITECT'
  | 'ONGOING'
  | 'COLLAPSED';

export type CrisisProtocol =
  | 'STANDARD_DEBATE'
  | 'EMERGENCY_SESSION'
  | 'SOVEREIGN_OVERRIDE'
  | 'FOUNDING_MARK_COUNCIL'
  | 'ARCHITECT_CONSULTATION';

export interface AssemblyCrisis {
  readonly id: string;
  readonly name: string;
  readonly category: CrisisCategory;
  readonly severity: CrisisSeverity;
  readonly year: number;
  readonly description: string;
  readonly triggerEvent: string;
  readonly protocolInvoked: CrisisProtocol;
  readonly resolutionType: CrisisResolution;
  readonly resolvedYear: number | undefined;
  readonly dynastiesInvolved: ReadonlyArray<string>;
  readonly kalonAtStake: bigint;
  readonly chronicleRef: string | undefined;
}

export interface CrisisVote {
  readonly crisisId: string;
  readonly dynastyId: string;
  readonly position: 'FOR' | 'AGAINST' | 'ABSTAIN';
  readonly votingPower: bigint;
  readonly rationale: string | undefined;
}

export interface VoteTally {
  readonly for: number;
  readonly against: number;
  readonly abstain: number;
  readonly totalPower: bigint;
}

// ΓöÇΓöÇ Canonical Crisis Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const CANONICAL_CRISES: ReadonlyArray<AssemblyCrisis> = [
  {
    id: 'crisis-year-08-kalon-devaluation',
    name: 'The Great Devaluation Panic',
    category: 'ECONOMIC',
    severity: 'CRITICAL',
    year: 8,
    description:
      'First major supply shock threatens KALON stability as early-adopter dynasties flood markets following World 3 survey completion.',
    triggerEvent:
      'World 3 survey yields 400% above projected KALON issuance, triggering panic selling.',
    protocolInvoked: 'EMERGENCY_SESSION',
    resolutionType: 'RESOLVED_BY_VOTE',
    resolvedYear: 9,
    dynastiesInvolved: ['founding-bloc', 'early-surveyor-coalition'],
    kalonAtStake: 2_400_000_000_000n,
    chronicleRef: 'chronicle/year-8/devaluation-panic',
  },
  {
    id: 'crisis-year-15-world-access',
    name: 'The Access Rights Dispute',
    category: 'CONSTITUTIONAL',
    severity: 'ELEVATED',
    year: 15,
    description:
      'Three dynasties claim exclusive survey rights to a newly discovered world cluster, challenging the open-access provisions of the founding compact.',
    triggerEvent:
      'Survey Corps maps Cluster 7, prompting three simultaneous exclusive-claim filings.',
    protocolInvoked: 'STANDARD_DEBATE',
    resolutionType: 'RESOLVED_BY_ARBITRATION',
    resolvedYear: 16,
    dynastiesInvolved: ['dynasty-vale', 'dynasty-cressida', 'dynasty-morrow'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-15/access-rights-dispute',
  },
  {
    id: 'crisis-year-22-ascendancy-bloc',
    name: 'The Ascendancy Bloc Formation',
    category: 'CONSTITUTIONAL',
    severity: 'CRITICAL',
    year: 22,
    description:
      'Ascendancy-adjacent dynasties coordinate to claim supermajority and amend founding rights, threatening constitutional integrity.',
    triggerEvent:
      'Forty-one dynasties file coordinated petitions to amend the founding compact under Assembly Rule 17.',
    protocolInvoked: 'FOUNDING_MARK_COUNCIL',
    resolutionType: 'RESOLVED_BY_VOTE',
    resolvedYear: 23,
    dynastiesInvolved: ['ascendancy-bloc', 'founding-mark-holders', 'free-assembly-coalition'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-22/ascendancy-bloc-formation',
  },
  {
    id: 'crisis-year-31-lattice-failure',
    name: 'The World 44 Lattice Collapse',
    category: 'ECOLOGICAL',
    severity: 'EMERGENCY',
    year: 31,
    description:
      "World 44's lattice node degrades to zero, threatening 40 billion KALON in annual issuance and creating an economic void in the outer arc.",
    triggerEvent: 'World 44 lattice integrity index drops to 0 following unregulated extraction.',
    protocolInvoked: 'ARCHITECT_CONSULTATION',
    resolutionType: 'RESOLVED_BY_ARBITRATION',
    resolvedYear: 33,
    dynastiesInvolved: ['world-44-operators', 'outer-arc-council', 'architect-office'],
    kalonAtStake: 40_000_000_000n,
    chronicleRef: 'chronicle/year-31/world-44-lattice-collapse',
  },
  {
    id: 'crisis-year-38-kalon-audit',
    name: 'The Dagna Audit Revelation',
    category: 'ECONOMIC',
    severity: 'CRITICAL',
    year: 38,
    description:
      "Dagna's audit reveals 23.8 trillion KALON in systematic redirection across 17 worlds over 30 years.",
    triggerEvent:
      "Dagna completes Year 38 audit and presents sealed findings to the Assembly's economic committee.",
    protocolInvoked: 'EMERGENCY_SESSION',
    resolutionType: 'ONGOING',
    resolvedYear: undefined,
    dynastiesInvolved: ['dagna-office', 'assembly-economic-committee', 'affected-world-operators'],
    kalonAtStake: 23_800_000_000_000n,
    chronicleRef: 'chronicle/year-38/dagna-audit-revelation',
  },
  {
    id: 'crisis-year-47-chamber-seven',
    name: 'The Chamber Seven Threshold',
    category: 'SUCCESSION',
    severity: 'ELEVATED',
    year: 47,
    description:
      'First dynasty reaches Chamber Seven, triggering constitutional questions about knowledge governance and the limits of accumulated power.',
    triggerEvent:
      'Dynasty Voss achieves Chamber Seven classification after 47 years of knowledge accumulation.',
    protocolInvoked: 'STANDARD_DEBATE',
    resolutionType: 'RESOLVED_BY_VOTE',
    resolvedYear: 48,
    dynastiesInvolved: ['dynasty-voss', 'knowledge-governance-bloc', 'open-knowledge-coalition'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-47/chamber-seven-threshold',
  },
  {
    id: 'crisis-year-62-prediction-error',
    name: 'The Kwame Prediction Crisis',
    category: 'EXISTENTIAL',
    severity: 'CRITICAL',
    year: 62,
    description:
      "Kwame's Year 67 prediction error comes to light five years early through independent research, threatening the scientific authority underpinning the Concord's founding legitimacy.",
    triggerEvent:
      'Independent researcher Selamat Adeyemi publishes calculations contradicting the Year 67 Stability Prediction.',
    protocolInvoked: 'FOUNDING_MARK_COUNCIL',
    resolutionType: 'ONGOING',
    resolvedYear: undefined,
    dynastiesInvolved: ['kwame-lineage', 'scientific-council', 'founding-mark-holders'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-62/kwame-prediction-crisis',
  },
  {
    id: 'crisis-year-75-okafor-revelation',
    name: 'The Okafor Suppression Unveiled',
    category: 'CONSTITUTIONAL',
    severity: 'EMERGENCY',
    year: 75,
    description:
      "Nnamdi's secret fully revealed: founding dynasty complicity in the suppression of World 247 survey data named publicly for the first time.",
    triggerEvent:
      'Declassified Survey Corps records confirm founding dynasty coordination in the Year 3 World 247 survey suppression.',
    protocolInvoked: 'SOVEREIGN_OVERRIDE',
    resolutionType: 'RESOLVED_BY_ARBITRATION',
    resolvedYear: 77,
    dynastiesInvolved: ['okafor-dynasty', 'founding-dynasty-council', 'world-247-claimants'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-75/okafor-suppression-unveiled',
  },
  {
    id: 'crisis-year-89-succession-void',
    name: 'The Amara Succession Void',
    category: 'SUCCESSION',
    severity: 'EMERGENCY',
    year: 89,
    description:
      "Amara's death at Year 55 and subsequent World 394 jurisdiction gap creates a 34-year succession void that crystallises into constitutional crisis.",
    triggerEvent:
      'World 394 governance collapse attributed to unresolved Amara succession triggers Assembly intervention.',
    protocolInvoked: 'FOUNDING_MARK_COUNCIL',
    resolutionType: 'RESOLVED_BY_VOTE',
    resolvedYear: 91,
    dynastiesInvolved: ['amara-heirs', 'world-394-stewards', 'succession-tribunal'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-89/amara-succession-void',
  },
  {
    id: 'crisis-year-103-accountability',
    name: 'The Scientific Accountability Motion',
    category: 'CONSTITUTIONAL',
    severity: 'CRITICAL',
    year: 103,
    description:
      "Kwame publicly confesses the Year 67 prediction error, triggering a constitutional rewrite motion and the most consequential scientific reckoning in the Concord's history.",
    triggerEvent:
      "Kwame delivers a public confession to the Assembly, confirming the Year 67 stability model's fundamental error.",
    protocolInvoked: 'EMERGENCY_SESSION',
    resolutionType: 'ONGOING',
    resolvedYear: undefined,
    dynastiesInvolved: ['kwame-lineage', 'constitutional-reform-bloc', 'stability-council'],
    kalonAtStake: 0n,
    chronicleRef: 'chronicle/year-103/scientific-accountability-motion',
  },
];

// ΓöÇΓöÇ Derived Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ONGOING_CRISES_AT_YEAR_105 = 3;

export const TOTAL_KALON_AT_STAKE: bigint = CANONICAL_CRISES.reduce(
  (sum, crisis) => sum + crisis.kalonAtStake,
  0n,
);

export const EMERGENCY_PROTOCOL_COUNT = CANONICAL_CRISES.filter(
  (c) => c.severity === 'EMERGENCY',
).length;

// ΓöÇΓöÇ Error Type ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export class AssemblyCrisisError extends Error {
  readonly code: string;
  readonly crisisId: string;

  constructor(code: string, crisisId: string, detail: string) {
    super(`${code}: crisis ${crisisId} ΓÇö ${detail}`);
    this.name = 'AssemblyCrisisError';
    this.code = code;
    this.crisisId = crisisId;
  }
}

// ΓöÇΓöÇ Service State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface CrisisProtocolState {
  readonly crises: Map<string, AssemblyCrisis>;
  readonly votes: Map<string, CrisisVote[]>;
}

function buildInitialState(): CrisisProtocolState {
  const crises = new Map<string, AssemblyCrisis>();
  const votes = new Map<string, CrisisVote[]>();
  for (const crisis of CANONICAL_CRISES) {
    crises.set(crisis.id, crisis);
    votes.set(crisis.id, []);
  }
  return { crises, votes };
}

// ΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface CrisisProtocolService {
  getCrisis(crisisId: string): AssemblyCrisis | undefined;
  getActiveCrises(currentYear: number): ReadonlyArray<AssemblyCrisis>;
  getCrisesByYear(year: number): ReadonlyArray<AssemblyCrisis>;
  getCrisesByCategory(category: CrisisCategory): ReadonlyArray<AssemblyCrisis>;
  getCrisesByProtocol(protocol: CrisisProtocol): ReadonlyArray<AssemblyCrisis>;
  castVote(crisisId: string, vote: CrisisVote): VoteTally;
  getVoteTally(crisisId: string): VoteTally;
  resolveCrisis(
    crisisId: string,
    resolution: CrisisResolution,
    resolvedYear: number,
  ): AssemblyCrisis;
  getCrisisTimeline(): ReadonlyArray<AssemblyCrisis>;
}

// ΓöÇΓöÇ Service Deps ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface CrisisProtocolDeps {
  readonly clock: { now(): Date };
  readonly idGenerator: { generate(): string };
}

// ΓöÇΓöÇ Tally Computation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function computeTally(votes: ReadonlyArray<CrisisVote>): VoteTally {
  let forCount = 0;
  let againstCount = 0;
  let abstainCount = 0;
  let totalPower = 0n;

  for (const vote of votes) {
    if (vote.position === 'FOR') forCount++;
    else if (vote.position === 'AGAINST') againstCount++;
    else abstainCount++;
    totalPower += vote.votingPower;
  }

  return { for: forCount, against: againstCount, abstain: abstainCount, totalPower };
}

// ΓöÇΓöÇ Active Crisis Check ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function isCrisisActiveAtYear(crisis: AssemblyCrisis, currentYear: number): boolean {
  if (crisis.year > currentYear) return false;
  if (crisis.resolutionType !== 'ONGOING') return false;
  return true;
}

// ΓöÇΓöÇ Crisis Lookup Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function requireCrisis(state: CrisisProtocolState, crisisId: string): AssemblyCrisis {
  const crisis = state.crises.get(crisisId);
  if (crisis === undefined) {
    throw new AssemblyCrisisError('CRISIS_NOT_FOUND', crisisId, 'crisis does not exist');
  }
  return crisis;
}

function allCrises(state: CrisisProtocolState): AssemblyCrisis[] {
  return Array.from(state.crises.values());
}

// ΓöÇΓöÇ Vote Mutation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function recordVote(state: CrisisProtocolState, crisisId: string, vote: CrisisVote): VoteTally {
  requireCrisis(state, crisisId);
  const existing = state.votes.get(crisisId) ?? [];
  if (existing.some((v) => v.dynastyId === vote.dynastyId)) {
    throw new AssemblyCrisisError(
      'ALREADY_VOTED',
      crisisId,
      `dynasty ${vote.dynastyId} has already voted`,
    );
  }
  existing.push(vote);
  state.votes.set(crisisId, existing);
  return computeTally(existing);
}

// ΓöÇΓöÇ Resolution Mutation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function applyResolution(
  state: CrisisProtocolState,
  crisisId: string,
  resolution: CrisisResolution,
  resolvedYear: number,
): AssemblyCrisis {
  const crisis = requireCrisis(state, crisisId);
  const updated: AssemblyCrisis = { ...crisis, resolutionType: resolution, resolvedYear };
  state.crises.set(crisisId, updated);
  return updated;
}

// ΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createCrisisProtocolService(_deps: CrisisProtocolDeps): CrisisProtocolService {
  const state = buildInitialState();

  return {
    getCrisis: (id) => state.crises.get(id),
    getActiveCrises: (year) => allCrises(state).filter((c) => isCrisisActiveAtYear(c, year)),
    getCrisesByYear: (year) => allCrises(state).filter((c) => c.year === year),
    getCrisesByCategory: (cat) => allCrises(state).filter((c) => c.category === cat),
    getCrisesByProtocol: (proto) => allCrises(state).filter((c) => c.protocolInvoked === proto),
    castVote: (id, vote) => recordVote(state, id, vote),
    getVoteTally: (id) => {
      requireCrisis(state, id);
      return computeTally(state.votes.get(id) ?? []);
    },
    resolveCrisis: (id, res, year) => applyResolution(state, id, res, year),
    getCrisisTimeline: () => allCrises(state).sort((a, b) => a.year - b.year),
  };
}
