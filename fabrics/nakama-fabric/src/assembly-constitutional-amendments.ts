/**
 * Assembly Constitutional Amendments ΓÇö 12 canonical amendments across the 105-year arc.
 *
 * The Concord constitution is a living document. Each amendment reflects a crisis,
 * a power struggle, or a moral reckoning that shaped civilisation's governance.
 *
 * Voting thresholds for constitutional amendments: 75% supermajority required.
 * The Architect holds an advisory vote only on constitutional matters (no veto weight).
 */

export type AmendmentStatus = 'RATIFIED' | 'PROPOSED' | 'REJECTED' | 'SUPERSEDED';

export type AmendmentScope =
  | 'GOVERNANCE'
  | 'ECONOMY'
  | 'RIGHTS'
  | 'TERRITORY'
  | 'ACCOUNTABILITY'
  | 'SUCCESSION';

export interface ConstitutionalAmendment {
  readonly amendmentId: string;
  readonly year: number;
  readonly title: string;
  readonly scope: AmendmentScope;
  readonly status: AmendmentStatus;
  readonly yesVotes: number;
  readonly noVotes: number;
  readonly architectVote: 'FOR' | 'AGAINST' | 'ADVISORY_ONLY' | 'ABSENT';
  readonly summary: string;
  readonly supersededBy: string | null;
  readonly triggeringCrisis: string | null;
  readonly kalonImpactMicro: bigint;
}

export interface AmendmentSummary {
  readonly total: number;
  readonly ratified: number;
  readonly rejected: number;
  readonly architectVetoed: number;
  readonly totalEconomicImpactMicro: bigint;
  readonly scopeBreakdown: Readonly<Record<AmendmentScope, number>>;
}

export const CONSTITUTIONAL_AMENDMENTS: ReadonlyArray<ConstitutionalAmendment> = [
  {
    amendmentId: 'CA-001',
    year: 5,
    title: 'First Economy Amendment',
    scope: 'ECONOMY',
    status: 'RATIFIED',
    yesVotes: 312,
    noVotes: 41,
    architectVote: 'FOR',
    summary:
      'Codified the progressive levy formula into constitutional law, establishing KALON micro-precision accounting and the commons fund allocation at 9% of annual issuance. Prevented arbitrary levy rate changes without a 75% supermajority vote.',
    supersededBy: null,
    triggeringCrisis:
      'Early speculative accumulation crisis ΓÇö three dynasties held 40% of circulating supply by Year 4',
    kalonImpactMicro: 5_000_000_000_000n,
  },
  {
    amendmentId: 'CA-002',
    year: 12,
    title: 'Founding Dynasty Protections Act',
    scope: 'RIGHTS',
    status: 'RATIFIED',
    yesVotes: 289,
    noVotes: 78,
    architectVote: 'FOR',
    summary:
      'Secured charter member rights for the eight founding dynasties, granting perpetual Assembly standing and immunity from retroactive levy increases on Genesis Vault holdings. Established the dignity floor for civic score voting weight at 0.001.',
    supersededBy: null,
    triggeringCrisis:
      'Founding dynasty Okafor-Nkosi narrowly avoided dissolution by rival coalition in Year 11',
    kalonImpactMicro: 2_500_000_000_000n,
  },
  {
    amendmentId: 'CA-003',
    year: 23,
    title: 'Emergency Suppression Protocol',
    scope: 'GOVERNANCE',
    status: 'RATIFIED',
    yesVotes: 221,
    noVotes: 189,
    architectVote: 'FOR',
    summary:
      "Granted the Architect authority to classify Remembrance records as restricted during declared emergencies, suspending public hash-chain verification for up to 90 days per incident. Passed on the narrowest constitutional margin ever recorded ΓÇö 54% in favor, with the Architect's advisory vote interpreted as moral endorsement.",
    supersededBy: null,
    triggeringCrisis:
      'The Silence of Meridian ΓÇö a coordinated disinformation campaign nearly toppled three sector governments in Year 22',
    kalonImpactMicro: 0n,
  },
  {
    amendmentId: 'CA-004',
    year: 28,
    title: 'Transparency Restoration Act',
    scope: 'ACCOUNTABILITY',
    status: 'REJECTED',
    yesVotes: 198,
    noVotes: 214,
    architectVote: 'AGAINST',
    summary:
      'Attempted to reverse CA-003 by mandating full Remembrance transparency within 30 days of any suppression event and creating an independent oversight panel with subpoena power. Defeated after the Architect cast an unusual AGAINST advisory vote and the Ascendancy bloc held firm.',
    supersededBy: null,
    triggeringCrisis:
      'Five classified suppressions in three years under CA-003 with no public accounting',
    kalonImpactMicro: 0n,
  },
  {
    amendmentId: 'CA-005',
    year: 35,
    title: 'World Sovereignty Act',
    scope: 'TERRITORY',
    status: 'RATIFIED',
    yesVotes: 344,
    noVotes: 67,
    architectVote: 'FOR',
    summary:
      'Formalized the Survey Corps claim window system: 90-day exclusive claim periods after first contact, tiered sovereignty classes based on LatticeIntegrity scores, and mandatory 1% annual world issuance contribution to the Commonwealth Fund. Defined the legal boundary between exploration rights and permanent sovereignty.',
    supersededBy: null,
    triggeringCrisis:
      'Three simultaneous contested claims over newly surveyed systems in the Vethara Expanse triggered armed standoffs',
    kalonImpactMicro: 18_000_000_000_000n,
  },
  {
    amendmentId: 'CA-006',
    year: 45,
    title: 'Universal Basic KALON Rights Amendment',
    scope: 'ECONOMY',
    status: 'RATIFIED',
    yesVotes: 378,
    noVotes: 44,
    architectVote: 'FOR',
    summary:
      'Elevated Universal Basic KALON to a constitutional right, mandating a floor of 100 micro-KALON per dynasty per month and tying UBK increases to a prosperity multiplier derived from the Lattice Integrity Index. No Assembly vote could reduce UBK below the constitutional floor without a 90% supermajority.',
    supersededBy: null,
    triggeringCrisis:
      'The Great Lattice Famine of Year 43 ΓÇö degraded worlds produced near-zero issuance, leaving 12 million dynasties below subsistence',
    kalonImpactMicro: 85_000_000_000_000n,
  },
  {
    amendmentId: 'CA-007',
    year: 55,
    title: 'Audit Independence Act',
    scope: 'ACCOUNTABILITY',
    status: 'RATIFIED',
    yesVotes: 287,
    noVotes: 124,
    architectVote: 'ADVISORY_ONLY',
    summary:
      'Established the Independent Audit Bureau as a constitutionally protected body with authority to inspect any KALON transaction, Remembrance record, or suppression event without prior Assembly approval. Passed by the narrowest ratifiable margin ΓÇö 69.8% yes ΓÇö after three failed prior votes in committee.',
    supersededBy: null,
    triggeringCrisis:
      "Dagna Ironveil's decade-long campaign exposing systematic auditing failures and the discovery of 47 unexplained suppression events",
    kalonImpactMicro: 500_000_000_000n,
  },
  {
    amendmentId: 'CA-008',
    year: 68,
    title: 'Succession Rights Act',
    scope: 'SUCCESSION',
    status: 'RATIFIED',
    yesVotes: 356,
    noVotes: 55,
    architectVote: 'FOR',
    summary:
      'Defined the legal fate of extinct dynasties: unclaimed Genesis Vault holdings escheat to the Commonwealth Fund after 10 years, Remembrance records become public after 25 years, and territory claims revert to open survey status after 50 years. Created the Office of Dynasty Succession to manage transition.',
    supersededBy: null,
    triggeringCrisis:
      'Mass extinction events during the Rift Wars of Year 61-65 left over 2,000 dynasties legally unresolved',
    kalonImpactMicro: 12_000_000_000_000n,
  },
  {
    amendmentId: 'CA-009',
    year: 75,
    title: 'Posthumous Disclosure Act',
    scope: 'ACCOUNTABILITY',
    status: 'RATIFIED',
    yesVotes: 401,
    noVotes: 31,
    architectVote: 'ABSENT',
    summary:
      "Mandated automatic declassification of all suppressed Remembrance records within 2 years of the death of every party named in the suppression order. Enabled by the Architect's death in Year 74, which removed the primary veto bloc; passed with the highest margin of any constitutional amendment.",
    supersededBy: null,
    triggeringCrisis:
      "Discovery that 23 suppression events under CA-003 involved records directly implicating the Architect's personal directives",
    kalonImpactMicro: 0n,
  },
  {
    amendmentId: 'CA-010',
    year: 85,
    title: 'Reparations Framework Amendment',
    scope: 'RIGHTS',
    status: 'RATIFIED',
    yesVotes: 334,
    noVotes: 88,
    architectVote: 'ABSENT',
    summary:
      'Established a constitutional mechanism for collective reparations: dynasties found to have caused material harm through suppressed records or illegal economic acts must contribute to a Reparations Pool, distributed by the Independent Audit Bureau. Directly enabled the Okafor-Bello-Ferreira historical resolution after Posthumous Disclosure surfaced the Year 23 suppression records.',
    supersededBy: null,
    triggeringCrisis:
      'Posthumous Disclosure revealed the Okafor and Bello-Ferreira dynasties were victims of coordinated economic sabotage hidden under CA-003 for 52 years',
    kalonImpactMicro: 42_000_000_000_000n,
  },
  {
    amendmentId: 'CA-011',
    year: 98,
    title: 'Anti-Concentration Act',
    scope: 'ECONOMY',
    status: 'RATIFIED',
    yesVotes: 367,
    noVotes: 71,
    architectVote: 'ABSENT',
    summary:
      'Constitutionally capped single-dynasty KALON holdings at 0.050% of total supply, designated the Structural Concentration threshold as a constitutional violation trigger, and mandated automatic wealth redistribution via the commons fund for any breach. Directly targeted Ascendancy faction accumulation patterns documented by the Audit Bureau.',
    supersededBy: null,
    triggeringCrisis:
      'The Ascendancy coalition briefly held 38% of total KALON supply in Year 96, threatening democratic governance via economic coercion',
    kalonImpactMicro: 120_000_000_000_000n,
  },
  {
    amendmentId: 'CA-012',
    year: 103,
    title: 'Scientific Accountability Amendment',
    scope: 'ACCOUNTABILITY',
    status: 'RATIFIED',
    yesVotes: 389,
    noVotes: 43,
    architectVote: 'ABSENT',
    summary:
      'Required all research conducted under Assembly funding to deposit raw data into the Remembrance with a 15-year public embargo at most, and criminalised falsification of scientific records as a constitutional offense. Passed in the wake of the Kwame Mensah-Asante confession, enabling formal acknowledgment of the fabricated Lattice Integrity studies from Year 30-48.',
    supersededBy: null,
    triggeringCrisis:
      "Kwame Mensah-Asante's deathbed confession revealed that foundational Lattice Integrity research underpinning the Year 45 UBK formula had been systematically falsified",
    kalonImpactMicro: 8_000_000_000_000n,
  },
];

export const RATIFIED_COUNT: number = CONSTITUTIONAL_AMENDMENTS.filter(
  (a) => a.status === 'RATIFIED',
).length;

export const REJECTED_COUNT: number = CONSTITUTIONAL_AMENDMENTS.filter(
  (a) => a.status === 'REJECTED',
).length;

export const ARCHITECT_VETOED_COUNT: number = CONSTITUTIONAL_AMENDMENTS.filter(
  (a) => a.architectVote === 'AGAINST',
).length;

export function getAmendment(amendmentId: string): ConstitutionalAmendment | undefined {
  return CONSTITUTIONAL_AMENDMENTS.find((a) => a.amendmentId === amendmentId);
}

export function getAmendmentsByScope(
  scope: AmendmentScope,
): ReadonlyArray<ConstitutionalAmendment> {
  return CONSTITUTIONAL_AMENDMENTS.filter((a) => a.scope === scope);
}

export function getAmendmentsByYear(year: number): ReadonlyArray<ConstitutionalAmendment> {
  return CONSTITUTIONAL_AMENDMENTS.filter((a) => a.year === year);
}

export function getRatifiedAmendments(): ReadonlyArray<ConstitutionalAmendment> {
  return CONSTITUTIONAL_AMENDMENTS.filter((a) => a.status === 'RATIFIED');
}

export function getRejectedAmendments(): ReadonlyArray<ConstitutionalAmendment> {
  return CONSTITUTIONAL_AMENDMENTS.filter((a) => a.status === 'REJECTED');
}

export function getAmendmentsWithArchitectVeto(): ReadonlyArray<ConstitutionalAmendment> {
  return CONSTITUTIONAL_AMENDMENTS.filter((a) => a.architectVote === 'AGAINST');
}

export function getAmendmentChronology(): ReadonlyArray<ConstitutionalAmendment> {
  return [...CONSTITUTIONAL_AMENDMENTS].sort((a, b) => a.year - b.year);
}

export function computeTotalEconomicImpactMicro(): bigint {
  return CONSTITUTIONAL_AMENDMENTS.reduce((sum, a) => sum + a.kalonImpactMicro, 0n);
}

function buildScopeBreakdown(): Readonly<Record<AmendmentScope, number>> {
  const counts: Record<AmendmentScope, number> = {
    GOVERNANCE: 0,
    ECONOMY: 0,
    RIGHTS: 0,
    TERRITORY: 0,
    ACCOUNTABILITY: 0,
    SUCCESSION: 0,
  };
  for (const amendment of CONSTITUTIONAL_AMENDMENTS) {
    counts[amendment.scope] += 1;
  }
  return counts;
}

export function getAmendmentSummary(): AmendmentSummary {
  return {
    total: CONSTITUTIONAL_AMENDMENTS.length,
    ratified: RATIFIED_COUNT,
    rejected: REJECTED_COUNT,
    architectVetoed: ARCHITECT_VETOED_COUNT,
    totalEconomicImpactMicro: computeTotalEconomicImpactMicro(),
    scopeBreakdown: buildScopeBreakdown(),
  };
}
