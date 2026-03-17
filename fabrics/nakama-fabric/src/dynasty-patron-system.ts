/**
 * Dynasty Patron System ΓÇö Feudal-adjacent patron-client relationships between dynasties.
 *
 * Tracks the web of protection, capital, and loyalty exchanges that define
 * political power in The Concord. Large dynasties (patrons) provide KALON loans,
 * legal cover, and political shelter to smaller client dynasties, who repay with
 * Assembly votes and preferential contracts.
 *
 * Historical note: The Ascendancy exploited this system to build a super-majority
 * voting bloc. Assembly Rule 44 (post-Okafor Suppression) capped patron voting
 * weight at three active clients. Falaye's dynasty broke from the Ascendancy in
 * Year 18 ΓÇö the defining act of her political independence.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type PatronStatus = 'ACTIVE' | 'DISSOLVED' | 'CONTESTED' | 'SUSPENDED_BY_ASSEMBLY';

export type PatronRelationType =
  | 'PROTECTION'
  | 'FINANCIAL'
  | 'POLITICAL'
  | 'MILITARY'
  | 'CULTURAL';

export interface PatronRecord {
  readonly patronId: string;
  readonly patronDynastyId: string;
  readonly clientDynastyId: string;
  readonly relationTypes: readonly PatronRelationType[];
  readonly status: PatronStatus;
  readonly yearEstablished: number;
  readonly yearDissolved: number | null;
  readonly annualKalonTransferMicro: bigint;
  readonly assemblyVotesAligned: boolean;
  readonly isAscendancyRelated: boolean;
  readonly note: string;
}

export interface DynastyPatronProfile {
  readonly dynastyId: string;
  readonly isPatron: boolean;
  readonly isClient: boolean;
  readonly currentPatronId: string | null;
  readonly currentClientCount: number;
  readonly totalKalonProvidedMicro: bigint;
}

export interface PatronSummary {
  readonly totalRelationships: number;
  readonly activeCount: number;
  readonly ascendancyRelatedCount: number;
  readonly totalKalonFlowingMicro: bigint;
  readonly dynastiesWithActivePatron: number;
}

// ΓöÇΓöÇ Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const PATRON_RECORDS: readonly PatronRecord[] = [
  // ΓöÇΓöÇ Ascendancy-controlled bloc (pre-Suppression) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    patronId: 'pat-001',
    patronDynastyId: 'dynasty-ascendancy',
    clientDynastyId: 'dynasty-falaye',
    relationTypes: ['POLITICAL', 'FINANCIAL'],
    status: 'DISSOLVED',
    yearEstablished: 2,
    yearDissolved: 18,
    annualKalonTransferMicro: 4_000_000_000n,
    assemblyVotesAligned: false,
    isAscendancyRelated: true,
    note: "Falaye broke the relationship in Year 18, forfeiting Ascendancy capital to reclaim vote independence.",
  },
  {
    patronId: 'pat-002',
    patronDynastyId: 'dynasty-ascendancy',
    clientDynastyId: 'dynasty-morrow',
    relationTypes: ['PROTECTION', 'POLITICAL'],
    status: 'DISSOLVED',
    yearEstablished: -5,
    yearDissolved: 22,
    annualKalonTransferMicro: 2_500_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: true,
    note: "Morrow dynasty dissolved after the Okafor Suppression stripped the Ascendancy of its bloc.",
  },
  {
    patronId: 'pat-003',
    patronDynastyId: 'dynasty-ascendancy',
    clientDynastyId: 'dynasty-vesper',
    relationTypes: ['POLITICAL', 'MILITARY'],
    status: 'SUSPENDED_BY_ASSEMBLY',
    yearEstablished: 1,
    yearDissolved: null,
    annualKalonTransferMicro: 3_200_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: true,
    note: "Suspended under Rule 44; Vesper's vote remains frozen pending review.",
  },
  {
    patronId: 'pat-004',
    patronDynastyId: 'dynasty-ascendancy',
    clientDynastyId: 'dynasty-aldric',
    relationTypes: ['PROTECTION', 'FINANCIAL', 'POLITICAL'],
    status: 'DISSOLVED',
    yearEstablished: -3,
    yearDissolved: 20,
    annualKalonTransferMicro: 5_000_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: true,
    note: "Aldric was the Ascendancy's oldest client; dissolved post-Suppression.",
  },
  // ΓöÇΓöÇ Luca patron relationships (FINANCIAL) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    patronId: 'pat-005',
    patronDynastyId: 'dynasty-luca',
    clientDynastyId: 'dynasty-tressa',
    relationTypes: ['FINANCIAL'],
    status: 'ACTIVE',
    yearEstablished: 15,
    yearDissolved: null,
    annualKalonTransferMicro: 1_800_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Luca provides KALON liquidity to Tressa's interstellar trading operations.",
  },
  {
    patronId: 'pat-006',
    patronDynastyId: 'dynasty-luca',
    clientDynastyId: 'dynasty-orindel',
    relationTypes: ['FINANCIAL'],
    status: 'ACTIVE',
    yearEstablished: 17,
    yearDissolved: null,
    annualKalonTransferMicro: 1_200_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Orindel leverages Luca's capital for rapid world-node expansion.",
  },
  {
    patronId: 'pat-007',
    patronDynastyId: 'dynasty-luca',
    clientDynastyId: 'dynasty-shen',
    relationTypes: ['FINANCIAL'],
    status: 'ACTIVE',
    yearEstablished: 20,
    yearDissolved: null,
    annualKalonTransferMicro: 950_000_000n,
    assemblyVotesAligned: false,
    isAscendancyRelated: false,
    note: "Shen takes Luca financing but retains independent Assembly vote.",
  },
  // ΓöÇΓöÇ Miscellaneous active relationships ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    patronId: 'pat-008',
    patronDynastyId: 'dynasty-okafor',
    clientDynastyId: 'dynasty-nkosi',
    relationTypes: ['PROTECTION', 'CULTURAL'],
    status: 'ACTIVE',
    yearEstablished: 23,
    yearDissolved: null,
    annualKalonTransferMicro: 800_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Post-Suppression bond: Okafor clan extends protection to historically marginalized Nkosi dynasty.",
  },
  {
    patronId: 'pat-009',
    patronDynastyId: 'dynasty-falaye',
    clientDynastyId: 'dynasty-mbeki',
    relationTypes: ['POLITICAL', 'PROTECTION'],
    status: 'ACTIVE',
    yearEstablished: 19,
    yearDissolved: null,
    annualKalonTransferMicro: 1_500_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Falaye became patron herself after breaking from the Ascendancy, mentoring Mbeki.",
  },
  {
    patronId: 'pat-010',
    patronDynastyId: 'dynasty-falaye',
    clientDynastyId: 'dynasty-diallo',
    relationTypes: ['FINANCIAL', 'POLITICAL'],
    status: 'ACTIVE',
    yearEstablished: 21,
    yearDissolved: null,
    annualKalonTransferMicro: 700_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Diallo dynasty benefits from Falaye's Assembly connections.",
  },
  {
    patronId: 'pat-011',
    patronDynastyId: 'dynasty-sylvara',
    clientDynastyId: 'dynasty-crest',
    relationTypes: ['MILITARY', 'PROTECTION'],
    status: 'ACTIVE',
    yearEstablished: 10,
    yearDissolved: null,
    annualKalonTransferMicro: 2_100_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Sylvara provides armed escorts for Crest's survey missions.",
  },
  {
    patronId: 'pat-012',
    patronDynastyId: 'dynasty-sylvara',
    clientDynastyId: 'dynasty-wayfarer',
    relationTypes: ['MILITARY'],
    status: 'CONTESTED',
    yearEstablished: 12,
    yearDissolved: null,
    annualKalonTransferMicro: 1_000_000_000n,
    assemblyVotesAligned: false,
    isAscendancyRelated: false,
    note: "Wayfarer disputes the terms; both parties filed competing Assembly motions.",
  },
  {
    patronId: 'pat-013',
    patronDynastyId: 'dynasty-thornwall',
    clientDynastyId: 'dynasty-grundel',
    relationTypes: ['PROTECTION', 'FINANCIAL'],
    status: 'ACTIVE',
    yearEstablished: 5,
    yearDissolved: null,
    annualKalonTransferMicro: 1_600_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Long-running relationship; Grundel dynasty owes its survival to Thornwall intervention.",
  },
  {
    patronId: 'pat-014',
    patronDynastyId: 'dynasty-thornwall',
    clientDynastyId: 'dynasty-brecken',
    relationTypes: ['CULTURAL', 'FINANCIAL'],
    status: 'ACTIVE',
    yearEstablished: 8,
    yearDissolved: null,
    annualKalonTransferMicro: 600_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Thornwall sponsors Brecken archival projects; soft-power alignment.",
  },
  {
    patronId: 'pat-015',
    patronDynastyId: 'dynasty-vayne',
    clientDynastyId: 'dynasty-collis',
    relationTypes: ['FINANCIAL', 'POLITICAL'],
    status: 'DISSOLVED',
    yearEstablished: 0,
    yearDissolved: 15,
    annualKalonTransferMicro: 900_000_000n,
    assemblyVotesAligned: false,
    isAscendancyRelated: false,
    note: "Collis repaid loans in full and terminated the arrangement amicably.",
  },
  {
    patronId: 'pat-016',
    patronDynastyId: 'dynasty-vayne',
    clientDynastyId: 'dynasty-irenmoor',
    relationTypes: ['PROTECTION'],
    status: 'ACTIVE',
    yearEstablished: 16,
    yearDissolved: null,
    annualKalonTransferMicro: 1_100_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Vayne provides security guarantees for Irenmoor's outer-zone holdings.",
  },
  {
    patronId: 'pat-017',
    patronDynastyId: 'dynasty-okafor',
    clientDynastyId: 'dynasty-sembene',
    relationTypes: ['POLITICAL', 'CULTURAL'],
    status: 'ACTIVE',
    yearEstablished: 25,
    yearDissolved: null,
    annualKalonTransferMicro: 500_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Sembene dynasty carries Okafor reform agenda into the Assembly's younger bloc.",
  },
  {
    patronId: 'pat-018',
    patronDynastyId: 'dynasty-luca',
    clientDynastyId: 'dynasty-auren',
    relationTypes: ['FINANCIAL', 'POLITICAL'],
    status: 'CONTESTED',
    yearEstablished: 28,
    yearDissolved: null,
    annualKalonTransferMicro: 750_000_000n,
    assemblyVotesAligned: false,
    isAscendancyRelated: false,
    note: "Auren accepted Luca capital but refuses Assembly vote alignment; contested under Rule 44 review.",
  },
  {
    patronId: 'pat-019',
    patronDynastyId: 'dynasty-thornwall',
    clientDynastyId: 'dynasty-quell',
    relationTypes: ['MILITARY', 'PROTECTION'],
    status: 'ACTIVE',
    yearEstablished: 29,
    yearDissolved: null,
    annualKalonTransferMicro: 1_300_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Newest Thornwall client; Quell dynasty expanding into contested border systems.",
  },
  {
    patronId: 'pat-020',
    patronDynastyId: 'dynasty-sylvara',
    clientDynastyId: 'dynasty-peln',
    relationTypes: ['CULTURAL', 'PROTECTION'],
    status: 'ACTIVE',
    yearEstablished: 30,
    yearDissolved: null,
    annualKalonTransferMicro: 400_000_000n,
    assemblyVotesAligned: true,
    isAscendancyRelated: false,
    note: "Peln dynasty under Sylvara sponsorship for cultural exchange and frontier protection.",
  },
];

// ΓöÇΓöÇ Derived constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ACTIVE_PATRON_COUNT: number = PATRON_RECORDS.filter(
  (r) => r.status === 'ACTIVE',
).length;

export const ASCENDANCY_PATRON_COUNT: number = PATRON_RECORDS.filter(
  (r) => r.isAscendancyRelated,
).length;

export const TOTAL_KALON_FLOW_MICRO: bigint = PATRON_RECORDS.filter(
  (r) => r.status === 'ACTIVE',
).reduce((sum, r) => sum + r.annualKalonTransferMicro, 0n);

// ΓöÇΓöÇ Query functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getPatronRecord(id: string): PatronRecord | undefined {
  return PATRON_RECORDS.find((r) => r.patronId === id);
}

export function getPatronsByDynasty(dynastyId: string): readonly PatronRecord[] {
  return PATRON_RECORDS.filter((r) => r.patronDynastyId === dynastyId);
}

export function getClientsByDynasty(dynastyId: string): readonly PatronRecord[] {
  return PATRON_RECORDS.filter((r) => r.clientDynastyId === dynastyId);
}

export function getActiveRelationships(): readonly PatronRecord[] {
  return PATRON_RECORDS.filter((r) => r.status === 'ACTIVE');
}

export function getAscendancyRelationships(): readonly PatronRecord[] {
  return PATRON_RECORDS.filter((r) => r.isAscendancyRelated);
}

export function getDynastyPatronProfile(dynastyId: string): DynastyPatronProfile {
  const asPatron = getPatronsByDynasty(dynastyId);
  const asClient = getClientsByDynasty(dynastyId);

  const activeAsPatron = asPatron.filter((r) => r.status === 'ACTIVE');
  const activeClientRecord = asClient.find((r) => r.status === 'ACTIVE');

  const totalProvided = asPatron.reduce((sum, r) => sum + r.annualKalonTransferMicro, 0n);

  return {
    dynastyId,
    isPatron: asPatron.length > 0,
    isClient: asClient.length > 0,
    currentPatronId: activeClientRecord?.patronDynastyId ?? null,
    currentClientCount: activeAsPatron.length,
    totalKalonProvidedMicro: totalProvided,
  };
}

export function computePatronSummary(): PatronSummary {
  const active = PATRON_RECORDS.filter((r) => r.status === 'ACTIVE');
  const ascendancyRelated = PATRON_RECORDS.filter((r) => r.isAscendancyRelated);
  const totalFlow = active.reduce((sum, r) => sum + r.annualKalonTransferMicro, 0n);
  const clientsWithActivePatron = new Set(active.map((r) => r.clientDynastyId));

  return {
    totalRelationships: PATRON_RECORDS.length,
    activeCount: active.length,
    ascendancyRelatedCount: ascendancyRelated.length,
    totalKalonFlowingMicro: totalFlow,
    dynastiesWithActivePatron: clientsWithActivePatron.size,
  };
}
