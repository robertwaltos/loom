/**
 * Dynasty Succession Law ΓÇö Canonical succession rules, disputes, and inheritance laws.
 *
 * Governs how dynasties in The Concord pass wealth, Assembly seats, and world claims
 * to heirs. The Assembly validates contested successions. The founding wound
 * complicates succession: the Okafor dynasty was suppressed (Year 3), but their
 * lineage survived through Bello-Ferreira and was restored by Assembly ruling (Year 82).
 *
 * Ascendancy proxy manipulation contested several successions in Years 40ΓÇô60.
 *
 * "The line does not die when the holder falls. It waits."
 *   ΓÇö Assembly Resolution on Lineage Continuity, Year 82
 */

// ΓöÇΓöÇΓöÇ Type Definitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type SuccessionModel =
  | 'PRIMOGENITURE'
  | 'MERITOCRATIC'
  | 'ASSEMBLY_APPOINTED'
  | 'ELECTORAL'
  | 'COVENANT_BOUND'
  | 'BIFURCATED';

export type SuccessionStatus =
  | 'SETTLED'
  | 'CONTESTED'
  | 'DISPUTED'
  | 'VOID'
  | 'PENDING'
  | 'RESTORED';

export interface SuccessionRecord {
  readonly successionId: string;
  readonly dynastyId: string;
  readonly fromHolderId: string;
  readonly toHolderId: string | null;
  readonly year: number;
  readonly model: SuccessionModel;
  readonly status: SuccessionStatus;
  readonly assemblyValidated: boolean;
  readonly kalonInheritedMicro: bigint;
  readonly worldsInherited: string[];
  readonly contestedBy: string[];
  readonly resolution: string;
  readonly notes: string;
}

export interface SuccessionDispute {
  readonly disputeId: string;
  readonly successionId: string;
  readonly challengerDynastyId: string;
  readonly challengerClaim: string;
  readonly year: number;
  readonly resolved: boolean;
  readonly resolution: string | null;
  readonly assemblyRuling: string | null;
}

export interface SuccessionLaw {
  readonly lawId: string;
  readonly name: string;
  readonly enactedYear: number;
  readonly repealedYear: number | null;
  readonly description: string;
  readonly applicableTo: 'ALL_DYNASTIES' | 'FOUNDING' | 'CHARTER_MEMBER' | 'EARLY_SETTLER';
}

export interface SuccessionSummary {
  readonly totalSuccessions: number;
  readonly contestedCount: number;
  readonly voidCount: number;
  readonly totalKalonInheritedMicro: bigint;
  readonly okaforLineageRestored: boolean;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const OKAFOR_LINEAGE_RESTORED_YEAR = 82;

// ΓöÇΓöÇΓöÇ Canonical Succession Records ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const SUCCESSION_RECORDS: readonly SuccessionRecord[] = [
  {
    successionId: 'succ-001',
    dynastyId: 'dynasty-founders-council',
    fromHolderId: 'holder-covenant-prime',
    toHolderId: 'holder-founders-second',
    year: 2,
    model: 'COVENANT_BOUND',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 500_000_000_000n,
    worldsInherited: ['world-prime-genesis'],
    contestedBy: [],
    resolution: 'Covenant bound succession proceeded without challenge.',
    notes: 'First Assembly-sanctioned succession under the Founding Charter.',
  },
  {
    successionId: 'succ-002',
    dynastyId: 'dynasty-okafor',
    fromHolderId: 'holder-okafor-prime',
    toHolderId: null,
    year: 3,
    model: 'PRIMOGENITURE',
    status: 'VOID',
    assemblyValidated: false,
    kalonInheritedMicro: 0n,
    worldsInherited: [],
    contestedBy: ['dynasty-ascendancy'],
    resolution:
      'Succession voided by Ascendancy suppression. Lineage severed from official record.',
    notes:
      'The founding wound. Okafor heir was suppressed before transfer could complete. Assets seized.',
  },
  {
    successionId: 'succ-003',
    dynastyId: 'dynasty-mwangi',
    fromHolderId: 'holder-mwangi-elder',
    toHolderId: 'holder-mwangi-second',
    year: 5,
    model: 'PRIMOGENITURE',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 120_000_000_000n,
    worldsInherited: ['world-mwangi-prime'],
    contestedBy: [],
    resolution: 'Clean primogeniture succession. Assembly witnessed.',
    notes: "Mwangi dynasty's first generational transfer.",
  },
  {
    successionId: 'succ-004',
    dynastyId: 'dynasty-vasquez-liang',
    fromHolderId: 'holder-vasquez-founder',
    toHolderId: 'holder-liang-joint',
    year: 12,
    model: 'BIFURCATED',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 300_000_000_000n,
    worldsInherited: ['world-vasquez-a', 'world-liang-b'],
    contestedBy: [],
    resolution: 'Bifurcated succession split world claims between two lineage branches.',
    notes: 'Joint dynasty formed. Both branches recognised by Assembly.',
  },
  {
    successionId: 'succ-005',
    dynastyId: 'dynasty-petrov',
    fromHolderId: 'holder-petrov-elder',
    toHolderId: 'holder-petrov-meritocrat',
    year: 18,
    model: 'MERITOCRATIC',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 85_000_000_000n,
    worldsInherited: ['world-petrov-core'],
    contestedBy: [],
    resolution: 'Meritocratic council selected heir by civic contribution index.',
    notes: 'First use of meritocratic model under Year-15 Succession Reform Act.',
  },
  {
    successionId: 'succ-006',
    dynastyId: 'dynasty-al-rashid',
    fromHolderId: 'holder-alrashid-patriarch',
    toHolderId: 'holder-alrashid-assembly-pick',
    year: 24,
    model: 'ASSEMBLY_APPOINTED',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 210_000_000_000n,
    worldsInherited: ['world-alrashid-primary'],
    contestedBy: [],
    resolution: 'Assembly appointed successor after holder died without named heir.',
    notes: 'Emergency appointment under Intestate Succession Protocol.',
  },
  {
    successionId: 'succ-007',
    dynastyId: 'dynasty-chen-oduya',
    fromHolderId: 'holder-chen-oduya-elder',
    toHolderId: 'holder-chen-oduya-chosen',
    year: 31,
    model: 'ELECTORAL',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 175_000_000_000n,
    worldsInherited: ['world-chen-oduya-1'],
    contestedBy: [],
    resolution: 'Electoral college of dynasty members chose successor.',
    notes: 'Smooth electoral transition, 12 electors, unanimous result.',
  },
  {
    successionId: 'succ-008',
    dynastyId: 'dynasty-novak',
    fromHolderId: 'holder-novak-founder',
    toHolderId: 'holder-novak-proxy',
    year: 43,
    model: 'PRIMOGENITURE',
    status: 'CONTESTED',
    assemblyValidated: false,
    kalonInheritedMicro: 95_000_000_000n,
    worldsInherited: ['world-novak-core'],
    contestedBy: ['dynasty-ascendancy', 'dynasty-iron-meridian'],
    resolution:
      'Proxy holder installed by Ascendancy manipulation. Assembly investigation ongoing.',
    notes: 'Ascendancy planted proxy heir via forged lineage documentation. Year-43 crisis.',
  },
  {
    successionId: 'succ-009',
    dynastyId: 'dynasty-tanaka-bisi',
    fromHolderId: 'holder-tanaka-bisi-elder',
    toHolderId: 'holder-tanaka-bisi-disputed',
    year: 51,
    model: 'PRIMOGENITURE',
    status: 'DISPUTED',
    assemblyValidated: false,
    kalonInheritedMicro: 140_000_000_000n,
    worldsInherited: ['world-tanaka-primary', 'world-bisi-secondary'],
    contestedBy: ['dynasty-ascendancy'],
    resolution: 'Disputed by Ascendancy claim of elder lineage precedence. Pending ruling.',
    notes: 'Ascendancy fabricated genealogical evidence to claim control of Tanaka-Bisi worlds.',
  },
  {
    successionId: 'succ-010',
    dynastyId: 'dynasty-osei',
    fromHolderId: 'holder-osei-patriarch',
    toHolderId: 'holder-osei-assembly-restored',
    year: 58,
    model: 'ASSEMBLY_APPOINTED',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 60_000_000_000n,
    worldsInherited: ['world-osei-main'],
    contestedBy: ['dynasty-ascendancy'],
    resolution: 'Assembly overrode Ascendancy contest. Legitimate heir confirmed.',
    notes:
      'Assembly invoked Emergency Succession Clause to protect smaller dynasty from Ascendancy.',
  },
  {
    successionId: 'succ-011',
    dynastyId: 'dynasty-varga-santos',
    fromHolderId: 'holder-varga-santos-prime',
    toHolderId: null,
    year: 63,
    model: 'COVENANT_BOUND',
    status: 'VOID',
    assemblyValidated: false,
    kalonInheritedMicro: 0n,
    worldsInherited: [],
    contestedBy: ['dynasty-ascendancy'],
    resolution: 'Covenant heir died before transfer. Line extinguished. Assets to Commons Fund.',
    notes: 'Suspected Ascendancy involvement in heir death. Inquiry unresolved.',
  },
  {
    successionId: 'succ-012',
    dynastyId: 'dynasty-ibrahim',
    fromHolderId: 'holder-ibrahim-elder',
    toHolderId: 'holder-ibrahim-meritocrat-2',
    year: 70,
    model: 'MERITOCRATIC',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 195_000_000_000n,
    worldsInherited: ['world-ibrahim-north', 'world-ibrahim-south'],
    contestedBy: [],
    resolution: 'Meritocratic council selected after extended deliberation.',
    notes: "Ibrahim dynasty's second meritocratic transfer, both successful.",
  },
  {
    successionId: 'succ-013',
    dynastyId: 'dynasty-bello-ferreira',
    fromHolderId: 'holder-okafor-hidden-lineage',
    toHolderId: 'holder-bello-ferreira-restored',
    year: 82,
    model: 'ASSEMBLY_APPOINTED',
    status: 'RESTORED',
    assemblyValidated: true,
    kalonInheritedMicro: 50_000_000_000n,
    worldsInherited: ['world-okafor-legacy-claim'],
    contestedBy: ['dynasty-ascendancy'],
    resolution:
      'Assembly Resolution 82-7: Okafor lineage recognised through Bello-Ferreira line. Partial restoration of seized assets.',
    notes:
      'Historical correction. The Okafor wound acknowledged. Bello-Ferreira confirmed as Okafor heir through matrilineal chain. Ascendancy objection overruled 71%.',
  },
  {
    successionId: 'succ-014',
    dynastyId: 'dynasty-chen-oduya',
    fromHolderId: 'holder-chen-oduya-chosen',
    toHolderId: 'holder-chen-oduya-third',
    year: 88,
    model: 'ELECTORAL',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 240_000_000_000n,
    worldsInherited: ['world-chen-oduya-1', 'world-chen-oduya-2'],
    contestedBy: [],
    resolution: 'Third generation electoral transfer. Smooth transition.',
    notes: 'Chen-Oduya dynasty demonstrates stability of electoral model over generations.',
  },
  {
    successionId: 'succ-015',
    dynastyId: 'dynasty-novak',
    fromHolderId: 'holder-novak-proxy',
    toHolderId: 'holder-novak-legitimate',
    year: 95,
    model: 'ASSEMBLY_APPOINTED',
    status: 'SETTLED',
    assemblyValidated: true,
    kalonInheritedMicro: 110_000_000_000n,
    worldsInherited: ['world-novak-core'],
    contestedBy: [],
    resolution:
      'Assembly finally resolved Year-43 Novak proxy crisis. Legitimate lineage restored.',
    notes: 'Took 52 years to undo Ascendancy manipulation. Proxy removed by Assembly decree.',
  },
];

// ΓöÇΓöÇΓöÇ Succession Disputes ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const SUCCESSION_DISPUTES: readonly SuccessionDispute[] = [
  {
    disputeId: 'disp-001',
    successionId: 'succ-002',
    challengerDynastyId: 'dynasty-ascendancy',
    challengerClaim: 'Okafor lineage is illegitimate under Founding Charter Article 7.',
    year: 3,
    resolved: true,
    resolution: 'Ascendancy claim accepted by compliant Assembly under duress.',
    assemblyRuling: 'Resolution 3-1: Okafor succession voided. Contested ruling.',
  },
  {
    disputeId: 'disp-002',
    successionId: 'succ-008',
    challengerDynastyId: 'dynasty-novak-true-heir',
    challengerClaim: 'Proxy heir installed without valid lineage documentation.',
    year: 43,
    resolved: false,
    resolution: null,
    assemblyRuling: null,
  },
  {
    disputeId: 'disp-003',
    successionId: 'succ-008',
    challengerDynastyId: 'dynasty-iron-meridian',
    challengerClaim: 'Iron Meridian held secondary inheritance rights per treaty of Year 40.',
    year: 44,
    resolved: true,
    resolution: 'Iron Meridian claim dismissed. Treaty clause did not cover forced successions.',
    assemblyRuling: 'Resolution 44-3: Secondary claim rejected.',
  },
  {
    disputeId: 'disp-004',
    successionId: 'succ-009',
    challengerDynastyId: 'dynasty-ascendancy',
    challengerClaim: 'Ascendancy holds elder lineage claim through Tanaka-Bisi founding merger.',
    year: 51,
    resolved: false,
    resolution: null,
    assemblyRuling: null,
  },
  {
    disputeId: 'disp-005',
    successionId: 'succ-010',
    challengerDynastyId: 'dynasty-ascendancy',
    challengerClaim: 'Osei dynasty forfeited inheritance rights under Year-50 debt obligations.',
    year: 58,
    resolved: true,
    resolution: 'Ascendancy claim rejected. Debt did not extinguish succession rights.',
    assemblyRuling: 'Resolution 58-9: Emergency Succession Clause invoked. Osei heir confirmed.',
  },
  {
    disputeId: 'disp-006',
    successionId: 'succ-011',
    challengerDynastyId: 'dynasty-commons-fund-trustee',
    challengerClaim: 'Varga-Santos assets should revert to dynasty heirs, not Commons Fund.',
    year: 64,
    resolved: true,
    resolution: 'Commons Fund trustee claim upheld. Extinct dynasty assets revert per Year-20 law.',
    assemblyRuling: 'Resolution 64-2: Intestate Succession to Commons Fund confirmed.',
  },
  {
    disputeId: 'disp-007',
    successionId: 'succ-013',
    challengerDynastyId: 'dynasty-ascendancy',
    challengerClaim:
      'Bello-Ferreira lineage connection to Okafor is unverified and politically motivated.',
    year: 82,
    resolved: true,
    resolution: 'Ascendancy challenge defeated 71% Assembly vote. Matrilineal chain verified.',
    assemblyRuling: 'Resolution 82-7: OkaforΓÇôBello-Ferreira lineage affirmed. Restoration ordered.',
  },
  {
    disputeId: 'disp-008',
    successionId: 'succ-013',
    challengerDynastyId: 'dynasty-vasquez-liang',
    challengerClaim:
      'Vasquez-Liang held partial claim to Okafor world through Year-12 bifurcation treaty.',
    year: 83,
    resolved: true,
    resolution:
      'Vasquez-Liang claim limited to economic rights only. World sovereignty restored to Bello-Ferreira.',
    assemblyRuling: 'Resolution 83-1: Partial economic right retained. Sovereignty transferred.',
  },
  {
    disputeId: 'disp-009',
    successionId: 'succ-015',
    challengerDynastyId: 'dynasty-ascendancy',
    challengerClaim:
      'Ascendancy claims the proxy holder accumulated legitimate succession rights over 52 years.',
    year: 95,
    resolved: true,
    resolution: 'Assembly rejected tenure-based proxy legitimation. Fraud cannot vest rights.',
    assemblyRuling: 'Resolution 95-4: Proxy removed. Legitimate lineage reinstated.',
  },
  {
    disputeId: 'disp-010',
    successionId: 'succ-004',
    challengerDynastyId: 'dynasty-petrov',
    challengerClaim:
      'Petrov dynasty holds cross-claim on Vasquez-Liang worlds through pre-Concord agreement.',
    year: 13,
    resolved: true,
    resolution: 'Pre-Concord agreements superseded by Founding Charter. Petrov claim dismissed.',
    assemblyRuling: 'Resolution 13-5: Charter supremacy confirmed. Bifurcated succession stands.',
  },
];

// ΓöÇΓöÇΓöÇ Succession Laws ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const SUCCESSION_LAWS: readonly SuccessionLaw[] = [
  {
    lawId: 'law-001',
    name: 'Founding Charter Succession Clause',
    enactedYear: 1,
    repealedYear: null,
    description:
      'All dynastic succession must be registered with the Assembly within 30 days of transfer. Unregistered successions are provisional only.',
    applicableTo: 'ALL_DYNASTIES',
  },
  {
    lawId: 'law-002',
    name: 'Intestate Succession Protocol',
    enactedYear: 10,
    repealedYear: null,
    description:
      'If a dynasty holder dies without a named heir and no Assembly appointment is made within 90 days, dynasty assets revert to the Commons Fund.',
    applicableTo: 'ALL_DYNASTIES',
  },
  {
    lawId: 'law-003',
    name: 'Founding Dynasty Lineage Protection Act',
    enactedYear: 15,
    repealedYear: null,
    description:
      'Founding dynasty lineages may not be extinguished by proxy manipulation or political suppression. Assembly must investigate any voided founding succession.',
    applicableTo: 'FOUNDING',
  },
  {
    lawId: 'law-004',
    name: 'Succession Reform Act ΓÇö Meritocratic Model',
    enactedYear: 15,
    repealedYear: null,
    description:
      'Dynasties may formally adopt the meritocratic succession model by filing with the Assembly. Meritocratic successions are exempt from primogeniture challenges.',
    applicableTo: 'ALL_DYNASTIES',
  },
  {
    lawId: 'law-005',
    name: 'Charter Member Inheritance Rights',
    enactedYear: 20,
    repealedYear: null,
    description:
      'Charter member dynasties retain inheritance rights over world claims for three generations even without active succession. Dormant claims may be revived.',
    applicableTo: 'CHARTER_MEMBER',
  },
  {
    lawId: 'law-006',
    name: 'Emergency Succession Clause',
    enactedYear: 50,
    repealedYear: null,
    description:
      'Assembly may invoke emergency appointment when a succession is under active hostile manipulation. Contested succession is suspended pending investigation.',
    applicableTo: 'ALL_DYNASTIES',
  },
  {
    lawId: 'law-007',
    name: 'Lineage Restoration Act',
    enactedYear: 75,
    repealedYear: null,
    description:
      'Dynasties suppressed or voided by political manipulation may petition the Assembly for lineage restoration within 100 years of the original voiding. Restored dynasties recover partial asset rights.',
    applicableTo: 'ALL_DYNASTIES',
  },
  {
    lawId: 'law-008',
    name: 'Early Settler Succession Continuity',
    enactedYear: 90,
    repealedYear: null,
    description:
      'Early settler dynasties (founding Years 1ΓÇô25) receive enhanced succession continuity protections. Their world claims persist through two void successions before escheating.',
    applicableTo: 'EARLY_SETTLER',
  },
];

// ΓöÇΓöÇΓöÇ Derived Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const VOID_SUCCESSION_COUNT: number = SUCCESSION_RECORDS.filter(
  (r) => r.status === 'VOID',
).length;

export const CONTESTED_COUNT: number = SUCCESSION_RECORDS.filter(
  (r) => r.status === 'CONTESTED' || r.status === 'DISPUTED',
).length;

export const TOTAL_KALON_INHERITED_MICRO: bigint = SUCCESSION_RECORDS.reduce(
  (sum, r) => sum + r.kalonInheritedMicro,
  0n,
);

// ΓöÇΓöÇΓöÇ Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getSuccessionRecord(successionId: string): SuccessionRecord | undefined {
  return SUCCESSION_RECORDS.find((r) => r.successionId === successionId);
}

export function getSuccessionsByDynasty(dynastyId: string): SuccessionRecord[] {
  return SUCCESSION_RECORDS.filter((r) => r.dynastyId === dynastyId);
}

export function getSuccessionsByStatus(status: SuccessionStatus): SuccessionRecord[] {
  return SUCCESSION_RECORDS.filter((r) => r.status === status);
}

export function getSuccessionsByModel(model: SuccessionModel): SuccessionRecord[] {
  return SUCCESSION_RECORDS.filter((r) => r.model === model);
}

export function getDisputesForSuccession(successionId: string): SuccessionDispute[] {
  return SUCCESSION_DISPUTES.filter((d) => d.successionId === successionId);
}

export function getSuccessionLawAtYear(year: number): SuccessionLaw[] {
  return SUCCESSION_LAWS.filter(
    (law) => law.enactedYear <= year && (law.repealedYear === null || law.repealedYear > year),
  );
}

export function getContestedSuccessions(): SuccessionRecord[] {
  return SUCCESSION_RECORDS.filter((r) => r.status === 'CONTESTED' || r.status === 'DISPUTED');
}

export function getAssemblyValidatedSuccessions(): SuccessionRecord[] {
  return SUCCESSION_RECORDS.filter((r) => r.assemblyValidated);
}

export function getTotalKalonInherited(): bigint {
  return TOTAL_KALON_INHERITED_MICRO;
}

export function computeSuccessionSummary(): SuccessionSummary {
  const okaforRestored = SUCCESSION_RECORDS.some(
    (r) => r.status === 'RESTORED' && r.dynastyId === 'dynasty-bello-ferreira',
  );

  return {
    totalSuccessions: SUCCESSION_RECORDS.length,
    contestedCount: CONTESTED_COUNT,
    voidCount: VOID_SUCCESSION_COUNT,
    totalKalonInheritedMicro: TOTAL_KALON_INHERITED_MICRO,
    okaforLineageRestored: okaforRestored,
  };
}
