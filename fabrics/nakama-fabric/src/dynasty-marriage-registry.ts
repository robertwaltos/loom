/**
 * dynasty-marriage-registry.ts ΓÇö Inter-dynasty marriage alliance records.
 *
 * Marriages in The Concord are political instruments binding dynasties across
 * Assembly votes, wealth transfers, and generational continuity. Dowries are
 * denominated in micro-KALON (1 KALON = 1_000_000n). The Okafor Suppression
 * (Year 0) triggered coercive unions and subsequent Assembly annulments,
 * making the founding wound a distinct annulment category.
 *
 * Years span the Concord calendar: Year -8 (pre-founding) through Year 28.
 * Post-Year 0 records are better documented; pre-founding entries carry
 * partial provenance.
 */

// ΓöÇΓöÇ Domain Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type MarriageStatus = 'ACTIVE' | 'DISSOLVED' | 'ANNULLED' | 'WIDOWED';

export type MarriagePurpose = 'POLITICAL' | 'ECONOMIC' | 'ROMANTIC' | 'DIPLOMATIC' | 'DYNASTIC';

export type AnnulmentReason =
  | 'ASSEMBLY_ORDER'
  | 'COERCIVE'
  | 'FOUNDING_WOUND'
  | 'VOLUNTARY'
  | 'EXTINCTION';

export interface MarriageRecord {
  readonly marriageId: string;
  readonly dynastyA: string;
  readonly dynastyB: string;
  readonly yearFormed: number;
  readonly yearDissolved: number | null;
  readonly status: MarriageStatus;
  readonly purpose: MarriagePurpose;
  readonly dowryMicro: bigint;
  readonly assemblyVoteAlignment: boolean;
  readonly annulmentReason: AnnulmentReason | null;
  readonly note: string;
}

export interface MarriageSummary {
  readonly totalMarriages: number;
  readonly activeCount: number;
  readonly annulledCount: number;
  readonly totalDowryMicro: bigint;
  readonly foundingWoundAnnulments: number;
  readonly dynastiesWithActiveAlliances: string[];
}

// ΓöÇΓöÇ Canonical Dynasty IDs ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const DYN_FOUNDERS = 'dynasty-founders';
const DYN_ALKAHEST = 'dynasty-alkahest';
const DYN_OKAFOR = 'dynasty-okafor';
const DYN_VOSS = 'dynasty-voss';
const DYN_CHEN = 'dynasty-chen';
const DYN_KADE = 'dynasty-kade';
const DYN_SOLIS = 'dynasty-solis';
const DYN_REN = 'dynasty-ren';
const DYN_MORI = 'dynasty-mori';
const DYN_VALE = 'dynasty-vale';

// ΓöÇΓöÇ Marriage Records ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const M01: MarriageRecord = {
  marriageId: 'marriage-001',
  dynastyA: DYN_FOUNDERS,
  dynastyB: DYN_ALKAHEST,
  yearFormed: -8,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'DYNASTIC',
  dowryMicro: 50_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Pre-founding union between Founders and Alkahest, cementing the earliest governance coalition.',
};

const M02: MarriageRecord = {
  marriageId: 'marriage-002',
  dynastyA: DYN_OKAFOR,
  dynastyB: DYN_VOSS,
  yearFormed: -5,
  yearDissolved: 0,
  status: 'ANNULLED',
  purpose: 'POLITICAL',
  dowryMicro: 10_000_000_000n,
  assemblyVoteAlignment: false,
  annulmentReason: 'FOUNDING_WOUND',
  note: 'Okafor-Voss union forged under duress pre-suppression; annulled by Assembly emergency session at Year 0.',
};

const M03: MarriageRecord = {
  marriageId: 'marriage-003',
  dynastyA: DYN_OKAFOR,
  dynastyB: DYN_CHEN,
  yearFormed: -3,
  yearDissolved: 0,
  status: 'ANNULLED',
  purpose: 'POLITICAL',
  dowryMicro: 8_000_000_000n,
  assemblyVoteAlignment: false,
  annulmentReason: 'COERCIVE',
  note: 'Okafor leveraged Survey Corps debt to compel the Chen alliance; ruled coercive and annulled Year 0.',
};

const M04: MarriageRecord = {
  marriageId: 'marriage-004',
  dynastyA: DYN_ALKAHEST,
  dynastyB: DYN_KADE,
  yearFormed: 2,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'ECONOMIC',
  dowryMicro: 25_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Post-founding economic consolidation; Kade gains Alkahest trade routes, Alkahest gains Kade mining access.',
};

const M05: MarriageRecord = {
  marriageId: 'marriage-005',
  dynastyA: DYN_VOSS,
  dynastyB: DYN_SOLIS,
  yearFormed: 3,
  yearDissolved: 18,
  status: 'DISSOLVED',
  purpose: 'DIPLOMATIC',
  dowryMicro: 5_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Diplomatic union to stabilise post-suppression tensions; dissolved amicably when Solis heir line ended.',
};

const M06: MarriageRecord = {
  marriageId: 'marriage-006',
  dynastyA: DYN_CHEN,
  dynastyB: DYN_REN,
  yearFormed: 4,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'ROMANTIC',
  dowryMicro: 2_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Rare romantic union; both heirs met during Survey Corps survey of the Ren outer belt.',
};

const M07: MarriageRecord = {
  marriageId: 'marriage-007',
  dynastyA: DYN_FOUNDERS,
  dynastyB: DYN_MORI,
  yearFormed: 5,
  yearDissolved: 15,
  status: 'WIDOWED',
  purpose: 'DYNASTIC',
  dowryMicro: 30_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Founders-Mori union ended when Mori primary heir died during Silfen transit accident Year 15.',
};

const M08: MarriageRecord = {
  marriageId: 'marriage-008',
  dynastyA: DYN_VALE,
  dynastyB: DYN_VOSS,
  yearFormed: 6,
  yearDissolved: 22,
  status: 'DISSOLVED',
  purpose: 'POLITICAL',
  dowryMicro: 4_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Vale-Voss political compact; dissolved following the Year 22 Assembly redistricting dispute.',
};

const M09: MarriageRecord = {
  marriageId: 'marriage-009',
  dynastyA: DYN_SOLIS,
  dynastyB: DYN_KADE,
  yearFormed: 7,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'ECONOMIC',
  dowryMicro: 15_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Solis energy holdings paired with Kade manufacturing ΓÇö the first purely economic alliance ratified post-Year 0.',
};

const M10: MarriageRecord = {
  marriageId: 'marriage-010',
  dynastyA: DYN_MORI,
  dynastyB: DYN_CHEN,
  yearFormed: 8,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'DIPLOMATIC',
  dowryMicro: 3_500_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Mori-Chen diplomatic union, partly to compensate Mori for the Founders-Mori widowing of Year 15.',
};

const M11: MarriageRecord = {
  marriageId: 'marriage-011',
  dynastyA: DYN_ALKAHEST,
  dynastyB: DYN_VALE,
  yearFormed: 9,
  yearDissolved: 14,
  status: 'ANNULLED',
  purpose: 'POLITICAL',
  dowryMicro: 6_000_000_000n,
  assemblyVoteAlignment: false,
  annulmentReason: 'ASSEMBLY_ORDER',
  note: 'Assembly annulled this union after evidence emerged of Alkahest exploiting Vale succession uncertainty.',
};

const M12: MarriageRecord = {
  marriageId: 'marriage-012',
  dynastyA: DYN_REN,
  dynastyB: DYN_VOSS,
  yearFormed: 10,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'ECONOMIC',
  dowryMicro: 7_500_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Ren stellar cartography rights traded for Voss logistical network access across three worlds.',
};

const M13: MarriageRecord = {
  marriageId: 'marriage-013',
  dynastyA: DYN_FOUNDERS,
  dynastyB: DYN_SOLIS,
  yearFormed: 11,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'POLITICAL',
  dowryMicro: 20_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Founders-Solis union consolidates Assembly majority bloc following the Alkahest-Vale annulment.',
};

const M14: MarriageRecord = {
  marriageId: 'marriage-014',
  dynastyA: DYN_KADE,
  dynastyB: DYN_MORI,
  yearFormed: 12,
  yearDissolved: 20,
  status: 'DISSOLVED',
  purpose: 'ROMANTIC',
  dowryMicro: 1_000_000_000n,
  assemblyVoteAlignment: false,
  annulmentReason: null,
  note: 'Romantic union dissolved by mutual consent Year 20; both parties remained on amicable chronicle terms.',
};

const M15: MarriageRecord = {
  marriageId: 'marriage-015',
  dynastyA: DYN_CHEN,
  dynastyB: DYN_VALE,
  yearFormed: 13,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'DYNASTIC',
  dowryMicro: 12_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Chen-Vale dynastic pact restores Vale standing after the Alkahest-Vale annulment of Year 14.',
};

const M16: MarriageRecord = {
  marriageId: 'marriage-016',
  dynastyA: DYN_OKAFOR,
  dynastyB: DYN_FOUNDERS,
  yearFormed: -6,
  yearDissolved: -1,
  status: 'ANNULLED',
  purpose: 'POLITICAL',
  dowryMicro: 15_000_000_000n,
  assemblyVoteAlignment: false,
  annulmentReason: 'FOUNDING_WOUND',
  note: 'Okafor-Founders pre-founding union, annulled retroactively as part of founding wound reparations process.',
};

const M17: MarriageRecord = {
  marriageId: 'marriage-017',
  dynastyA: DYN_VALE,
  dynastyB: DYN_REN,
  yearFormed: 16,
  yearDissolved: 25,
  status: 'DISSOLVED',
  purpose: 'DIPLOMATIC',
  dowryMicro: 2_500_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Vale-Ren union bridged Survey Corps disputes over the outer belt cartography rights.',
};

const M18: MarriageRecord = {
  marriageId: 'marriage-018',
  dynastyA: DYN_SOLIS,
  dynastyB: DYN_MORI,
  yearFormed: 18,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'ECONOMIC',
  dowryMicro: 9_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Solis-Mori energy-for-transit pact; Mori receives Solis orbital fuel rights, Solis gains Mori transit lanes.',
};

const M19: MarriageRecord = {
  marriageId: 'marriage-019',
  dynastyA: DYN_KADE,
  dynastyB: DYN_REN,
  yearFormed: 22,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'DYNASTIC',
  dowryMicro: 500_000n,
  assemblyVoteAlignment: false,
  annulmentReason: null,
  note: 'Minimal-dowry dynastic union negotiated after Kade succession crisis; vote alignment waived by charter.',
};

const M20: MarriageRecord = {
  marriageId: 'marriage-020',
  dynastyA: DYN_VOSS,
  dynastyB: DYN_ALKAHEST,
  yearFormed: 28,
  yearDissolved: null,
  status: 'ACTIVE',
  purpose: 'POLITICAL',
  dowryMicro: 18_000_000_000n,
  assemblyVoteAlignment: true,
  annulmentReason: null,
  note: 'Most recent ratified union; Voss-Alkahest political bloc formed to contest the Year 30 Assembly review.',
};

// ΓöÇΓöÇ Canonical Exports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const MARRIAGE_RECORDS: readonly MarriageRecord[] = [
  M01,
  M02,
  M03,
  M04,
  M05,
  M06,
  M07,
  M08,
  M09,
  M10,
  M11,
  M12,
  M13,
  M14,
  M15,
  M16,
  M17,
  M18,
  M19,
  M20,
] as const;

export const ACTIVE_MARRIAGE_COUNT: number = MARRIAGE_RECORDS.filter(
  (m) => m.status === 'ACTIVE',
).length;

export const FOUNDING_WOUND_ANNULMENT_COUNT: number = MARRIAGE_RECORDS.filter(
  (m) => m.annulmentReason === 'FOUNDING_WOUND',
).length;

export const TOTAL_DOWRY_MICRO: bigint = MARRIAGE_RECORDS.reduce(
  (sum, m) => sum + m.dowryMicro,
  0n,
);

// ΓöÇΓöÇ Pure Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getMarriage(id: string): MarriageRecord | undefined {
  return MARRIAGE_RECORDS.find((m) => m.marriageId === id);
}

export function getMarriagesByDynasty(dynastyId: string): readonly MarriageRecord[] {
  return MARRIAGE_RECORDS.filter((m) => m.dynastyA === dynastyId || m.dynastyB === dynastyId);
}

export function getActiveMarriages(): readonly MarriageRecord[] {
  return MARRIAGE_RECORDS.filter((m) => m.status === 'ACTIVE');
}

export function getAnnulledMarriages(): readonly MarriageRecord[] {
  return MARRIAGE_RECORDS.filter((m) => m.status === 'ANNULLED');
}

export function getMarriagesByPurpose(purpose: MarriagePurpose): readonly MarriageRecord[] {
  return MARRIAGE_RECORDS.filter((m) => m.purpose === purpose);
}

export function getMarriagesFormedBeforeYear(year: number): readonly MarriageRecord[] {
  return MARRIAGE_RECORDS.filter((m) => m.yearFormed < year);
}

export function getDynastyAlliances(): Map<string, string[]> {
  const alliances = new Map<string, string[]>();

  for (const m of MARRIAGE_RECORDS) {
    if (m.status !== 'ACTIVE') continue;
    addAllianceEntry(alliances, m.dynastyA, m.dynastyB);
    addAllianceEntry(alliances, m.dynastyB, m.dynastyA);
  }

  return alliances;
}

function addAllianceEntry(map: Map<string, string[]>, key: string, value: string): void {
  const existing = map.get(key);
  if (existing === undefined) {
    map.set(key, [value]);
  } else {
    existing.push(value);
  }
}

export function computeMarriageSummary(): MarriageSummary {
  const activeRecords = MARRIAGE_RECORDS.filter((m) => m.status === 'ACTIVE');
  const activeDynastySet = new Set<string>();

  for (const m of activeRecords) {
    activeDynastySet.add(m.dynastyA);
    activeDynastySet.add(m.dynastyB);
  }

  return {
    totalMarriages: MARRIAGE_RECORDS.length,
    activeCount: ACTIVE_MARRIAGE_COUNT,
    annulledCount: MARRIAGE_RECORDS.filter((m) => m.status === 'ANNULLED').length,
    totalDowryMicro: TOTAL_DOWRY_MICRO,
    foundingWoundAnnulments: FOUNDING_WOUND_ANNULMENT_COUNT,
    dynastiesWithActiveAlliances: Array.from(activeDynastySet).sort(),
  };
}
