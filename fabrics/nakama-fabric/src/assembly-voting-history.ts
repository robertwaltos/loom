/**
 * Assembly Voting History ΓÇö The 20 most significant Assembly votes across the 105-year arc.
 *
 * These are the canonical votes that shaped the Concord's constitution, economy, and memory.
 * Votes are sorted by year in the timeline. KALON amounts are in micro-KALON (10^6 precision).
 *
 * Key milestones captured:
 *   Year 1  ΓÇö Founding Charter + Stellar Standard Act
 *   Year 8  ΓÇö Universal Basic KALON established
 *   Year 22 ΓÇö Ascendancy supermajority attempt defeated
 *   Year 30 ΓÇö First Founding Wound formally recognised
 *   Year 31 ΓÇö World 44 Emergency Lattice Protocol
 *   Year 44 ΓÇö Survey Corps Neutrality Covenant reaffirmed
 *   Year 45 ΓÇö First readings: Governance Reform + Okafor Reparations
 *   Year 50 ΓÇö Ascendancy KALON Audit Mandate fails
 *   Year 60 ΓÇö Governance Reform passes + Chosen Worlds Reparations
 *   Year 71 ΓÇö Survey Corps Independence rejected + Bello-Ferreira recognition
 *   Year 84 ΓÇö World 394 Emergency Aid (second-highest consensus)
 *   Year 85 ΓÇö Emergency Powers Expansion
 *   Year 86 ΓÇö World 394 Reparations Framework
 *   Year 102 ΓÇö World 601 Classification Seal
 *   Year 103 ΓÇö Scientific Accountability Motion
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type VoteOutcome = 'PASSED' | 'FAILED' | 'VETOED_BY_ARCHITECT' | 'WITHDRAWN' | 'TIED';

export type VoteThreshold = 'ORDINARY' | 'SIGNIFICANT' | 'CONSTITUTIONAL';

export type VoteCategory =
  | 'ECONOMIC'
  | 'CONSTITUTIONAL'
  | 'GOVERNANCE'
  | 'MILITARY'
  | 'REPARATION'
  | 'WOUND_RECOGNITION'
  | 'EMERGENCY';

export type ArchitectVote = 'FOR' | 'AGAINST' | 'ADVISORY_ONLY' | 'ABSENT' | 'VETO';

export interface AssemblyVote {
  readonly id: string;
  readonly title: string;
  readonly category: VoteCategory;
  readonly threshold: VoteThreshold;
  readonly year: number;
  readonly outcome: VoteOutcome;
  readonly forPercentage: number;
  readonly againstPercentage: number;
  readonly abstainPercentage: number;
  readonly summary: string;
  readonly sponsoringDynastyId?: string;
  readonly architectVote: ArchitectVote;
  readonly kalonAtStakeMicro: bigint;
  readonly isConstitutionallySignificant: boolean;
}

// ΓöÇΓöÇ Canonical Votes ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ASSEMBLY_VOTES: ReadonlyArray<AssemblyVote> = [
  {
    id: 'vote-001',
    title: 'Founding Charter Ratification',
    category: 'CONSTITUTIONAL',
    threshold: 'CONSTITUTIONAL',
    year: 1,
    outcome: 'PASSED',
    forPercentage: 98,
    againstPercentage: 1,
    abstainPercentage: 1,
    summary:
      'The unanimous founding vote. The only vote in Concord history to exceed 95%. ' +
      'Every founding dynasty voted in favour. The Ascendancy bloc later argued the vote ' +
      'was made before economic asymmetries were visible.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-002',
    title: 'Stellar Standard Act',
    category: 'ECONOMIC',
    threshold: 'SIGNIFICANT',
    year: 1,
    outcome: 'PASSED',
    forPercentage: 87,
    againstPercentage: 8,
    abstainPercentage: 5,
    summary:
      'Established dynamic world-based KALON issuance. First major economic policy. ' +
      'Replaced the proposed fixed 1B KALON supply with a world-class-driven formula. ' +
      'The eight dissenting dynasties formed the nucleus of the Ascendancy bloc.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-003',
    title: 'Emergency Lattice Protocol (World 44)',
    category: 'EMERGENCY',
    threshold: 'ORDINARY',
    year: 31,
    outcome: 'PASSED',
    forPercentage: 76,
    againstPercentage: 18,
    abstainPercentage: 6,
    summary:
      'Emergency session after World 44 collapse. Released treasury reserves to stabilize ' +
      'supply. The Architect cast an advisory vote FOR ΓÇö the first use of advisory authority ' +
      'in an emergency session. Eighteen percent opposition remains unexplained in the record.',
    architectVote: 'ADVISORY_ONLY',
    kalonAtStakeMicro: 200_000_000_000_000n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-004',
    title: 'Ascendancy Bloc Supermajority Challenge',
    category: 'CONSTITUTIONAL',
    threshold: 'CONSTITUTIONAL',
    year: 22,
    outcome: 'FAILED',
    forPercentage: 52,
    againstPercentage: 43,
    abstainPercentage: 5,
    summary:
      'Ascendancy bloc attempted constitutional amendment to weight Assembly votes by KALON ' +
      'holdings. Failed to reach the 75% constitutional threshold. The Architect voted against ΓÇö ' +
      'the only time the Architect has opposed the Ascendancy bloc directly on record.',
    architectVote: 'AGAINST',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-005',
    title: 'Universal Basic KALON Establishment',
    category: 'ECONOMIC',
    threshold: 'SIGNIFICANT',
    year: 8,
    outcome: 'PASSED',
    forPercentage: 71,
    againstPercentage: 22,
    abstainPercentage: 7,
    summary:
      'First UBK vote. Established 100-500 KALON monthly distribution funded by Commons Fund. ' +
      'The Ascendancy bloc voted against uniformly. The 71% result fell short of constitutional ' +
      'threshold but exceeded the 65% significant bar needed for economic policy.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 15_000_000_000_000n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-006',
    title: 'World 247 Quarantine Order',
    category: 'EMERGENCY',
    threshold: 'SIGNIFICANT',
    year: 33,
    outcome: 'PASSED',
    forPercentage: 83,
    againstPercentage: 12,
    abstainPercentage: 5,
    summary:
      'Emergency quarantine of World 247 after anomalous Lattice readings. No dissenting voice ' +
      'explained their opposition publicly. The Remembrance records this as the only emergency ' +
      'vote where the minority held silence.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-007',
    title: 'Governance Reform Act (First Reading)',
    category: 'GOVERNANCE',
    threshold: 'CONSTITUTIONAL',
    year: 45,
    outcome: 'FAILED',
    forPercentage: 61,
    againstPercentage: 34,
    abstainPercentage: 5,
    summary:
      'First reading of the Governance Reform Act. Failed to reach 75% constitutional threshold. ' +
      'Ikenna Osei-Mensah recorded in the Remembrance: "We will return." The 15-year gap before ' +
      'the second reading became known as the Long Wait.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-008',
    title: 'Governance Reform Act (Second Reading)',
    category: 'GOVERNANCE',
    threshold: 'CONSTITUTIONAL',
    year: 60,
    outcome: 'PASSED',
    forPercentage: 77,
    againstPercentage: 18,
    abstainPercentage: 5,
    summary:
      'Second reading passed after 15 years of political work. The Ascendancy abstained rather ' +
      'than voted against ΓÇö a calculated retreat that preserved their standing while allowing ' +
      'the reform to pass. The 77% result exceeded the constitutional threshold by two points.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-009',
    title: 'First Founding Wound Recognition',
    category: 'WOUND_RECOGNITION',
    threshold: 'SIGNIFICANT',
    year: 30,
    outcome: 'PASSED',
    forPercentage: 67,
    againstPercentage: 28,
    abstainPercentage: 5,
    summary:
      'First formal acknowledgment of the Five Founding Wounds as official Concord record. ' +
      'The Ascendancy bloc voted against uniformly. The 67% margin met the 65% significant ' +
      'threshold but signalled deep civilisational division that would persist for decades.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-010',
    title: 'Okafor Reparations (First Motion)',
    category: 'REPARATION',
    threshold: 'CONSTITUTIONAL',
    year: 45,
    outcome: 'FAILED',
    forPercentage: 58,
    againstPercentage: 37,
    abstainPercentage: 5,
    summary:
      'First reparations motion for the Okafor suppression. Failed to reach the 75% constitutional ' +
      'threshold. The Architect cast an advisory vote FOR. The motion was re-introduced in Year 60 ' +
      'as part of the broader Chosen Worlds Reparations Order.',
    architectVote: 'ADVISORY_ONLY',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-011',
    title: 'Chosen Worlds Reparations Order',
    category: 'REPARATION',
    threshold: 'CONSTITUTIONAL',
    year: 60,
    outcome: 'PASSED',
    forPercentage: 76,
    againstPercentage: 19,
    abstainPercentage: 5,
    summary:
      'Forty-eight billion KALON reparation order for the Chosen Worlds wound. The largest ' +
      'financial order in Assembly history. Passed at the constitutional threshold. Financed ' +
      'from Commons Fund reserves accumulated over 60 years of Stellar Standard issuance.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 48_000_000_000_000_000n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-012',
    title: 'Survey Corps Independence Clause (Rejected)',
    category: 'GOVERNANCE',
    threshold: 'CONSTITUTIONAL',
    year: 71,
    outcome: 'FAILED',
    forPercentage: 35,
    againstPercentage: 60,
    abstainPercentage: 5,
    summary:
      'Attempt to make Survey Corps fully independent of Assembly oversight. Failed decisively ΓÇö ' +
      'the only constitutional vote in Concord history where the for-vote fell below 40%. ' +
      'The Architect was absent. No proxy or advisory vote was recorded.',
    architectVote: 'ABSENT',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-013',
    title: 'World 394 Emergency Aid Package',
    category: 'EMERGENCY',
    threshold: 'ORDINARY',
    year: 84,
    outcome: 'PASSED',
    forPercentage: 91,
    againstPercentage: 5,
    abstainPercentage: 4,
    summary:
      'Post-collapse aid package for World 394. Second highest consensus in Concord history ' +
      'after the Founding Charter. Only Ascendancy hardliners dissented. The 800 trillion ' +
      'micro-KALON deployment became the benchmark for emergency economic intervention.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 800_000_000_000_000n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-014',
    title: 'Bello-Ferreira Lineage Recognition',
    category: 'WOUND_RECOGNITION',
    threshold: 'SIGNIFICANT',
    year: 71,
    outcome: 'PASSED',
    forPercentage: 79,
    againstPercentage: 16,
    abstainPercentage: 5,
    summary:
      "Formal recognition of the Bello-Ferreira dynasty as founding-lineage following Falaye's " +
      'public disclosure. The 79% vote exceeded the significant threshold by 14 points. ' +
      'The Remembrance sealed the recognition with a Category I entry.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-015',
    title: 'World 394 Reparations Framework',
    category: 'REPARATION',
    threshold: 'CONSTITUTIONAL',
    year: 86,
    outcome: 'PASSED',
    forPercentage: 75,
    againstPercentage: 20,
    abstainPercentage: 5,
    summary:
      'Reparations framework for World 394 survivors. Passed at exactly the 75% constitutional ' +
      'threshold ΓÇö the narrowest constitutional passage in Concord history. The 150 billion KALON ' +
      'order was the largest single reparations award, surpassing the Chosen Worlds order.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 150_000_000_000_000_000n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-016',
    title: 'Assembly Scientific Accountability Motion',
    category: 'GOVERNANCE',
    threshold: 'SIGNIFICANT',
    year: 103,
    outcome: 'PASSED',
    forPercentage: 82,
    againstPercentage: 13,
    abstainPercentage: 5,
    summary:
      'Motion requiring voluntary disclosure of known predictive errors by Concord scientists ' +
      "holding public appointments. Triggered Kwame's public confession within 30 days of passage. " +
      'The Architect was absent ΓÇö recorded as deceased in the Remembrance at Year 102.',
    architectVote: 'ABSENT',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-017',
    title: 'Emergency Powers Expansion (Post-World 394)',
    category: 'CONSTITUTIONAL',
    threshold: 'CONSTITUTIONAL',
    year: 85,
    outcome: 'PASSED',
    forPercentage: 82,
    againstPercentage: 13,
    abstainPercentage: 5,
    summary:
      'Expanded Assembly emergency powers in the aftermath of World 394. Last constitutional vote ' +
      'where the Architect cast an advisory vote. The expansion was retroactively applied to the ' +
      'Year 84 aid package, legitimising the deployment scale.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: true,
  },
  {
    id: 'vote-018',
    title: 'Ascendancy KALON Audit Mandate',
    category: 'ECONOMIC',
    threshold: 'SIGNIFICANT',
    year: 50,
    outcome: 'FAILED',
    forPercentage: 61,
    againstPercentage: 34,
    abstainPercentage: 5,
    summary:
      'Attempted to mandate full Ascendancy KALON audit. Failed to reach the 65% significant ' +
      'threshold. The Architect cast an advisory vote FOR. The audit data was eventually obtained ' +
      "through the Governance Reform Act's disclosure provisions in Year 60.",
    architectVote: 'ADVISORY_ONLY',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-019',
    title: 'Survey Corps Neutrality Covenant Reaffirmation',
    category: 'GOVERNANCE',
    threshold: 'ORDINARY',
    year: 44,
    outcome: 'PASSED',
    forPercentage: 88,
    againstPercentage: 7,
    abstainPercentage: 5,
    summary:
      'Reaffirmation of Survey Corps neutrality after the Ascendancy observer incident on ' +
      'EXP-0044 (World 312). The 88% consensus was the strongest non-emergency, non-founding ' +
      'vote in the first 50 years. The Ascendancy did not contest the result publicly.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
  {
    id: 'vote-020',
    title: 'World 601 Classification Seal',
    category: 'GOVERNANCE',
    threshold: 'SIGNIFICANT',
    year: 102,
    outcome: 'PASSED',
    forPercentage: 71,
    againstPercentage: 24,
    abstainPercentage: 5,
    summary:
      'Sealed World 601 discovery data under Architect authority. The 24% opposition was the ' +
      'highest dissent on a passed governance motion in the final decade. The nature of the ' +
      'opposition remains unrecorded ΓÇö the Remembrance entry was sealed with the data.',
    architectVote: 'FOR',
    kalonAtStakeMicro: 0n,
    isConstitutionallySignificant: false,
  },
];

// ΓöÇΓöÇ Derived Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const PASSED_VOTE_COUNT = 15;
export const FAILED_VOTE_COUNT = 5;
export const CONSTITUTIONAL_VOTE_COUNT = 9;

export const TOTAL_REPARATION_KALON_MICRO: bigint = ASSEMBLY_VOTES.filter(
  (v) => v.category === 'REPARATION',
).reduce((acc, v) => acc + v.kalonAtStakeMicro, 0n);

// ΓöÇΓöÇ Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getVote(id: string): AssemblyVote | undefined {
  return ASSEMBLY_VOTES.find((v) => v.id === id);
}

export function getVotesByCategory(category: VoteCategory): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.category === category);
}

export function getVotesByYear(year: number): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.year === year);
}

export function getVotesByOutcome(outcome: VoteOutcome): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.outcome === outcome);
}

export function getConstitutionalVotes(): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.isConstitutionallySignificant);
}

export function getFailedVotes(): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.outcome === 'FAILED');
}

export function getArchitectVetoedVotes(): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.outcome === 'VETOED_BY_ARCHITECT');
}

export function computePassRate(): number {
  const passed = ASSEMBLY_VOTES.filter((v) => v.outcome === 'PASSED').length;
  return (passed / ASSEMBLY_VOTES.length) * 100;
}

export function getTotalKalonAtStakeMicro(): bigint {
  return ASSEMBLY_VOTES.reduce((acc, v) => acc + v.kalonAtStakeMicro, 0n);
}

export function getVoteTimeline(): ReadonlyArray<AssemblyVote> {
  return [...ASSEMBLY_VOTES].sort((a, b) => a.year - b.year);
}

export function getVotesByThreshold(threshold: VoteThreshold): ReadonlyArray<AssemblyVote> {
  return ASSEMBLY_VOTES.filter((v) => v.threshold === threshold);
}
