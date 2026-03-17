/**
 * dynasty-alliance-network.ts ΓÇö Canonical record of formal and informal dynasty alliances.
 *
 * Alliance networks represent binding agreements between dynasties that affect governance,
 * trade, and military affairs. The Ascendancy Alliance (ECONOMIC_UNION, Year 47ΓÇô62) was
 * the largest alliance in Concord history and its dissolution reshaped the Assembly.
 *
 * Key alliances:
 *   - The Ascendancy Alliance (DISSOLVED Year 62): 14-world economic union
 *   - Founding Worlds Trade Pact (ACTIVE since Year 3): original 6 coalitions
 *   - World 394 Aid Alliance (DISSOLVED Year 90): post-collapse mutual aid
 *   - Chronicle Protection Network (ACTIVE): intelligence-sharing post-Sunken Quill
 *   - Anti-Reparations Bloc (ACTIVE): opposing World 394 reparations motion
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type AllianceType =
  | 'TRADE_PACT'
  | 'MUTUAL_DEFENSE'
  | 'POLITICAL_BLOC'
  | 'CULTURAL_EXCHANGE'
  | 'INTELLIGENCE_SHARING'
  | 'ECONOMIC_UNION';

export type AllianceStatus = 'ACTIVE' | 'SUSPENDED' | 'DISSOLVED' | 'PROPOSED' | 'VIOLATED';

export interface DynastyAlliance {
  readonly allianceId: string;
  readonly allianceName: string;
  readonly type: AllianceType;
  readonly status: AllianceStatus;
  readonly memberDynastyIds: readonly string[];
  readonly yearFormed: number;
  readonly yearDissolved: number | null;
  readonly benefitDescription: string;
  readonly kalonBondMicroPerMember: bigint;
  readonly votingWeightBonus: number;
  readonly signatoryCount: number;
  readonly historicalNote: string;
}

export interface AllianceNetworkSummary {
  readonly totalAlliances: number;
  readonly activeAlliances: number;
  readonly dissolvedAlliances: number;
  readonly largestAllianceId: string;
  readonly totalMemberDynasties: number;
}

// ΓöÇΓöÇ Canonical Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ASCENDANCY_ALLIANCE_ID = 'alliance-001';
export const FOUNDING_TRADE_PACT_ID = 'alliance-002';

export const CANONICAL_ALLIANCES: ReadonlyArray<DynastyAlliance> = [
  {
    allianceId: ASCENDANCY_ALLIANCE_ID,
    allianceName: 'The Ascendancy Alliance',
    type: 'ECONOMIC_UNION',
    status: 'DISSOLVED',
    memberDynastyIds: [
      'dynasty-ascendancy-prime',
      'dynasty-ascendancy-tier2-a',
      'dynasty-ascendancy-tier2-b',
      'dynasty-ascendancy-tier2-c',
      'dynasty-ascendancy-tier2-d',
      'dynasty-ascendancy-outer-1',
      'dynasty-ascendancy-outer-2',
      'dynasty-ascendancy-outer-3',
      'dynasty-ascendancy-outer-4',
      'dynasty-ascendancy-outer-5',
      'dynasty-ascendancy-outer-6',
      'dynasty-ascendancy-outer-7',
      'dynasty-ascendancy-outer-8',
      'dynasty-ascendancy-outer-9',
    ],
    yearFormed: 47,
    yearDissolved: 62,
    benefitDescription:
      'Shared KALON issuance pool, coordinated Assembly voting, mutual defense obligations, ' +
      'and preferential lattice transit access across 14 worlds.',
    kalonBondMicroPerMember: 50_000_000_000n,
    votingWeightBonus: 3,
    signatoryCount: 14,
    historicalNote:
      'The largest alliance in Concord history by member count and KALON bond. ' +
      'Dissolved in Year 62 when 3 member worlds withdrew citing Ascendancy centralisation. ' +
      'The dissolution preceded the formal Ascendancy secession by 9 years.',
  },
  {
    allianceId: FOUNDING_TRADE_PACT_ID,
    allianceName: 'Founding Worlds Trade Pact',
    type: 'TRADE_PACT',
    status: 'ACTIVE',
    memberDynastyIds: [
      'dynasty-founding-coalition-1',
      'dynasty-founding-coalition-2',
      'dynasty-founding-coalition-3',
      'dynasty-founding-coalition-4',
      'dynasty-founding-coalition-5',
      'dynasty-founding-coalition-6',
    ],
    yearFormed: 3,
    yearDissolved: null,
    benefitDescription:
      'Zero-tariff trade lanes between the 6 founding worlds, shared levy reduction credits, ' +
      'and preferential settlement rights on newly opened worlds.',
    kalonBondMicroPerMember: 10_000_000_000n,
    votingWeightBonus: 1,
    signatoryCount: 6,
    historicalNote:
      'The oldest surviving alliance in the Concord. Renewed without modification 12 times. ' +
      'Critics call it the structural mechanism for the first founding wound ΓÇö ' +
      'the founding families trading with each other before they traded with anyone else.',
  },
  {
    allianceId: 'alliance-003',
    allianceName: 'Post-Ascendancy Anti-Reparations Bloc',
    type: 'POLITICAL_BLOC',
    status: 'ACTIVE',
    memberDynastyIds: [
      'dynasty-continuationist-hawk',
      'dynasty-founding-coalition-2',
      'dynasty-founding-coalition-4',
      'dynasty-assembly-neutral-block-a',
      'dynasty-assembly-neutral-block-b',
      'dynasty-continuationist-technocrat',
    ],
    yearFormed: 90,
    yearDissolved: null,
    benefitDescription:
      'Coordinated Assembly voting bloc opposing World 394 reparations motion ' +
      'and any Assembly motion establishing liability precedent for prior governance failures.',
    kalonBondMicroPerMember: 5_000_000_000n,
    votingWeightBonus: 2,
    signatoryCount: 6,
    historicalNote:
      'Formed in the wake of the World 394 collapse and the World 394 reparations request. ' +
      'The bloc has successfully stalled the reparations vote for 15 years as of Year 105.',
  },
  {
    allianceId: 'alliance-004',
    allianceName: 'Chronicle Protection Network',
    type: 'INTELLIGENCE_SHARING',
    status: 'ACTIVE',
    memberDynastyIds: [
      'dynasty-sunken-quill-collective',
      'dynasty-returnist-deep',
      'dynasty-lattice-covenant-sec',
      'dynasty-archive-keepers',
      'dynasty-witness-guild',
    ],
    yearFormed: 92,
    yearDissolved: null,
    benefitDescription:
      'Shared intelligence on Remembrance tampering attempts, mutual counter-espionage ' +
      'coverage, and coordinated secure document exfiltration protocols.',
    kalonBondMicroPerMember: 2_000_000_000n,
    votingWeightBonus: 0,
    signatoryCount: 5,
    historicalNote:
      'Founded after the Sunken Quill operation exposed how easily the Ascendancy ' +
      'archive could be accessed. The network has since prevented 3 known tampering attempts.',
  },
  {
    allianceId: 'alliance-005',
    allianceName: 'World 394 Aid Alliance',
    type: 'MUTUAL_DEFENSE',
    status: 'DISSOLVED',
    memberDynastyIds: [
      'dynasty-world-394-council',
      'dynasty-returnist-deep',
      'dynasty-lattice-covenant-sec',
      'dynasty-continuationist-diplomatic',
    ],
    yearFormed: 84,
    yearDissolved: 90,
    benefitDescription:
      'Emergency mutual aid following the Ascendancy withdrawal from World 394. Covered ' +
      'governance infrastructure, commons fund bridging, and lattice node maintenance.',
    kalonBondMicroPerMember: 8_000_000_000n,
    votingWeightBonus: 0,
    signatoryCount: 4,
    historicalNote:
      'Formed at the height of the World 394 collapse in Year 84. Dissolved in Year 90 once ' +
      'the World 394 COUNCIL_ASSEMBLY model proved self-sustaining. The Architect privately ' +
      'noted this alliance as "the Concord responding correctly, once."',
  },
  {
    allianceId: 'alliance-006',
    allianceName: 'Lattice Maintenance Compact',
    type: 'MUTUAL_DEFENSE',
    status: 'ACTIVE',
    memberDynastyIds: [
      'dynasty-lattice-covenant-sec',
      'dynasty-founding-coalition-1',
      'dynasty-founding-coalition-3',
      'dynasty-continuationist-technocrat',
      'dynasty-world-394-council',
      'dynasty-survey-corps-prime',
      'dynasty-silfen-observers',
    ],
    yearFormed: 15,
    yearDissolved: null,
    benefitDescription:
      'Shared lattice node maintenance crews, emergency response for degradation events, ' +
      'and collective funding for Kwame degradation monitoring.',
    kalonBondMicroPerMember: 15_000_000_000n,
    votingWeightBonus: 1,
    signatoryCount: 7,
    historicalNote:
      'The oldest active alliance after the Founding Trade Pact. Expanded in Year 88 to include ' +
      'World 394 after the collapse demonstrated the danger of unmaintained lattice nodes.',
  },
  {
    allianceId: 'alliance-007',
    allianceName: 'Survey Corps Frontier Pact',
    type: 'CULTURAL_EXCHANGE',
    status: 'ACTIVE',
    memberDynastyIds: [
      'dynasty-survey-corps-prime',
      'dynasty-silfen-observers',
      'dynasty-explorers-guild',
      'dynasty-cartography-house',
    ],
    yearFormed: 55,
    yearDissolved: null,
    benefitDescription:
      'Shared world survey data, coordinated first-contact protocols, and cultural exchange ' +
      'training across newly opened worlds.',
    kalonBondMicroPerMember: 1_000_000_000n,
    votingWeightBonus: 0,
    signatoryCount: 4,
    historicalNote:
      'The pact governs conduct on frontier worlds not yet formally opened by the Assembly. ' +
      'All 600-world survey milestones have been coordinated through this compact.',
  },
  {
    allianceId: 'alliance-008',
    allianceName: 'Returnist Reform Covenant',
    type: 'POLITICAL_BLOC',
    status: 'ACTIVE',
    memberDynastyIds: [
      'dynasty-returnist-deep',
      'dynasty-returnist-reform',
      'dynasty-assembly-neutral-reform',
      'dynasty-founding-wound-commission',
    ],
    yearFormed: 70,
    yearDissolved: null,
    benefitDescription:
      'Coordinated Assembly motions on founding wound reparations, structural inequality ' +
      'remedies, and anti-Ascendancy censure resolutions.',
    kalonBondMicroPerMember: 3_000_000_000n,
    votingWeightBonus: 1,
    signatoryCount: 4,
    historicalNote:
      'Split from the original Returnist bloc in Year 70 when the radical wing pushed for ' +
      'immediate contraction. The Reform Covenant has authored 14 founding-wound motions, ' +
      'of which 3 have passed.',
  },
  {
    allianceId: 'alliance-009',
    allianceName: 'Mid-Rim Economic Corridor',
    type: 'ECONOMIC_UNION',
    status: 'VIOLATED',
    memberDynastyIds: [
      'dynasty-korrath',
      'dynasty-mid-rim-trade-house',
      'dynasty-vael',
      'dynasty-world-394-council',
      'dynasty-rim-coalition-alpha',
    ],
    yearFormed: 60,
    yearDissolved: null,
    benefitDescription:
      'Preferential KALON exchange rates, shared trade route protection, and coordinated ' +
      'market pricing on mineral commodities from mid-rim worlds.',
    kalonBondMicroPerMember: 20_000_000_000n,
    votingWeightBonus: 1,
    signatoryCount: 5,
    historicalNote:
      'Status changed to VIOLATED in Year 83 when Dynasty Korrath attempted to corner the ' +
      'Year 82 mineral commodity market, damaging all other member economies. ' +
      'No formal dissolution ΓÇö the alliance is technically active but functionally broken.',
  },
  {
    allianceId: 'alliance-010',
    allianceName: 'Assembly Founding Bloc',
    type: 'POLITICAL_BLOC',
    status: 'SUSPENDED',
    memberDynastyIds: [
      'dynasty-founding-coalition-1',
      'dynasty-founding-coalition-2',
      'dynasty-founding-coalition-3',
      'dynasty-founding-coalition-4',
      'dynasty-founding-coalition-5',
      'dynasty-founding-coalition-6',
      'dynasty-founding-families-prime',
      'dynasty-continuationist-bloc',
    ],
    yearFormed: 1,
    yearDissolved: null,
    benefitDescription:
      'Original Assembly voting alignment. Coordinated procedural control of Assembly agenda ' +
      'and bloc voting on all motions affecting founding family structural advantages.',
    kalonBondMicroPerMember: 25_000_000_000n,
    votingWeightBonus: 4,
    signatoryCount: 8,
    historicalNote:
      'The founding bloc. Suspended ΓÇö not dissolved ΓÇö after the Sunken Quill leak forced ' +
      'founding families to publicly distance from coordinated bloc activity. ' +
      'Three members quietly defected to ASSEMBLY_NEUTRAL affiliation.',
  },
];

// ΓöÇΓöÇ Derived Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function computeNetworkSummary(alliances: ReadonlyArray<DynastyAlliance>): AllianceNetworkSummary {
  const active = alliances.filter((a) => a.status === 'ACTIVE').length;
  const dissolved = alliances.filter((a) => a.status === 'DISSOLVED').length;

  const largest = alliances.reduce(
    (max, a) => (a.signatoryCount > max.signatoryCount ? a : max),
    alliances[0]!,
  );

  const memberSet = new Set<string>();
  for (const alliance of alliances) {
    for (const memberId of alliance.memberDynastyIds) {
      memberSet.add(memberId);
    }
  }

  return {
    totalAlliances: alliances.length,
    activeAlliances: active,
    dissolvedAlliances: dissolved,
    largestAllianceId: largest.allianceId,
    totalMemberDynasties: memberSet.size,
  };
}

export const ALLIANCE_NETWORK_SUMMARY: AllianceNetworkSummary =
  computeNetworkSummary(CANONICAL_ALLIANCES);

// ΓöÇΓöÇ Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getAlliance(allianceId: string): DynastyAlliance | undefined {
  return CANONICAL_ALLIANCES.find((a) => a.allianceId === allianceId);
}

export function getActiveAlliances(): ReadonlyArray<DynastyAlliance> {
  return CANONICAL_ALLIANCES.filter((a) => a.status === 'ACTIVE');
}

export function getAlliancesByType(type: AllianceType): ReadonlyArray<DynastyAlliance> {
  return CANONICAL_ALLIANCES.filter((a) => a.type === type);
}

export function getAlliancesForDynasty(dynastyId: string): ReadonlyArray<DynastyAlliance> {
  return CANONICAL_ALLIANCES.filter((a) => a.memberDynastyIds.includes(dynastyId));
}

export function getLargestAlliance(): DynastyAlliance | undefined {
  if (CANONICAL_ALLIANCES.length === 0) return undefined;
  return CANONICAL_ALLIANCES.reduce(
    (max, a) => (a.signatoryCount > max.signatoryCount ? a : max),
    CANONICAL_ALLIANCES[0]!,
  );
}

export function computeTotalAllianceBond(allianceId: string): bigint {
  const alliance = getAlliance(allianceId);
  if (alliance === undefined) return 0n;
  return alliance.kalonBondMicroPerMember * BigInt(alliance.signatoryCount);
}

export function getViolatedAlliances(): ReadonlyArray<DynastyAlliance> {
  return CANONICAL_ALLIANCES.filter((a) => a.status === 'VIOLATED');
}
