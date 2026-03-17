/**
 * Player Initiation System ΓÇö The Concord's formal player onboarding and Initiation ritual.
 *
 * Bible v1.2: In The Concord, players do not simply "log in" ΓÇö they undergo an Initiation.
 * This is the moment a new consciousness enters the Lattice and claims a Dynasty name.
 * The ritual has evolved across the Concord's 105-year arc, shaped by governance crises,
 * the founding wound revelation, and ongoing reparations obligations.
 *
 * Five distinct eras mark how the Initiation has changed:
 *  - FOUNDING_ERA     (Years  0ΓÇô27): Simple oath and chronicle entry.
 *  - GOVERNANCE_CRISIS(Years 28ΓÇô44): Assembly witness required after crisis of proxy dynasties.
 *  - REFORM_ERA       (Years 45ΓÇô74): Remembrance Pledge added after wound archives opened.
 *  - REPARATIONS_ERA  (Years 75ΓÇô99): KALON bond increased to fund reparations commons pool.
 *  - PRESENT          (Year  100+ ): All seven rites required. No waivers without supermajority.
 *
 * "You do not simply arrive at the Concord. You are woven into it."
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type InitiationEra =
  | 'FOUNDING_ERA'
  | 'GOVERNANCE_CRISIS'
  | 'REFORM_ERA'
  | 'REPARATIONS_ERA'
  | 'PRESENT';

export type InitiationRite =
  | 'LATTICE_PULSE_TEST'
  | 'DYNASTY_OATH'
  | 'ASSEMBLY_WITNESS'
  | 'CHRONICLE_ENTRY'
  | 'KALON_BOND'
  | 'REMEMBRANCE_PLEDGE'
  | 'FIRST_SURVEY';

export type InitiationOutcome = 'ACCEPTED' | 'DEFERRED' | 'REJECTED' | 'PROVISIONAL';

export interface InitiationRecord {
  readonly initiationId: string;
  readonly dynastyId: string;
  readonly era: InitiationEra;
  readonly year: number;
  readonly rites: InitiationRite[];
  readonly outcome: InitiationOutcome;
  readonly genesisWorldId: string;
  readonly sponsorDynastyId: string | null;
  readonly kalonBondMicro: bigint;
  readonly assemblyWitnessId: string | null;
  readonly chronicleEntryHash: string | null;
  readonly notes: string;
}

export interface InitiationProtocol {
  readonly protocolId: string;
  readonly era: InitiationEra;
  readonly yearRange: { from: number; to: number | null };
  readonly requiredRites: InitiationRite[];
  readonly optionalRites: InitiationRite[];
  readonly kalonBondRequiredMicro: bigint;
  readonly assemblyWitnessRequired: boolean;
  readonly description: string;
}

export interface InitiationSummary {
  readonly totalInitiations: number;
  readonly acceptedCount: number;
  readonly deferredCount: number;
  readonly rejectedCount: number;
  readonly provisionalCount: number;
  readonly byEra: Record<InitiationEra, number>;
}

// ΓöÇΓöÇΓöÇ Protocol Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** KALON bond required during the FOUNDING_ERA (50 KALON ├ù 10^6 micro) */
const FOUNDING_ERA_KALON_BOND_MICRO = 50_000_000n;

/** KALON bond required during GOVERNANCE_CRISIS (50 KALON ΓÇö unchanged) */
const GOVERNANCE_CRISIS_KALON_BOND_MICRO = 50_000_000n;

/** KALON bond required during REFORM_ERA (100 KALON ├ù 10^6 micro) */
const REFORM_ERA_KALON_BOND_MICRO = 100_000_000n;

/** KALON bond required during REPARATIONS_ERA (250 KALON ├ù 10^6 micro) ΓÇö exported for tests */
export const REPARATIONS_ERA_KALON_BOND_MICRO = 250_000_000n;

/** KALON bond required in PRESENT era (250 KALON ΓÇö maintained from REPARATIONS) */
const PRESENT_ERA_KALON_BOND_MICRO = 250_000_000n;

// ΓöÇΓöÇΓöÇ Five Era Protocols ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const INITIATION_PROTOCOLS: ReadonlyArray<InitiationProtocol> = [
  {
    protocolId: 'protocol:founding-era',
    era: 'FOUNDING_ERA',
    yearRange: { from: 0, to: 27 },
    requiredRites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY'],
    optionalRites: ['KALON_BOND', 'ASSEMBLY_WITNESS', 'FIRST_SURVEY'],
    kalonBondRequiredMicro: FOUNDING_ERA_KALON_BOND_MICRO,
    assemblyWitnessRequired: false,
    description:
      'Early Concord Initiation. Three rites required: Lattice Pulse Test, Dynasty Oath, ' +
      'Chronicle Entry. Assembly witness optional. KALON bond modest. The Concord was still ' +
      'establishing trust infrastructure and many dynasties were admitted on goodwill alone.',
  },
  {
    protocolId: 'protocol:governance-crisis',
    era: 'GOVERNANCE_CRISIS',
    yearRange: { from: 28, to: 44 },
    requiredRites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
    ],
    optionalRites: ['REMEMBRANCE_PLEDGE', 'FIRST_SURVEY'],
    kalonBondRequiredMicro: GOVERNANCE_CRISIS_KALON_BOND_MICRO,
    assemblyWitnessRequired: true,
    description:
      'Post-crisis Initiation following discovery of proxy dynasties acting on behalf of the ' +
      'Ascendancy. Assembly witness became mandatory to verify identity and intent. KALON bond ' +
      'unchanged but now formally required. Remembrance Pledge introduced as optional precursor.',
  },
  {
    protocolId: 'protocol:reform-era',
    era: 'REFORM_ERA',
    yearRange: { from: 45, to: 74 },
    requiredRites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
    ],
    optionalRites: ['FIRST_SURVEY'],
    kalonBondRequiredMicro: REFORM_ERA_KALON_BOND_MICRO,
    assemblyWitnessRequired: true,
    description:
      'Reform Era Initiation following the Wound Archive opening and the constitutional ' +
      'amendments of Year 45. Remembrance Pledge became mandatory to ensure all new dynasties ' +
      'acknowledge the founding wounds. KALON bond doubled to 100 KALON to fund memorial commons.',
  },
  {
    protocolId: 'protocol:reparations-era',
    era: 'REPARATIONS_ERA',
    yearRange: { from: 75, to: 99 },
    requiredRites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    optionalRites: [],
    kalonBondRequiredMicro: REPARATIONS_ERA_KALON_BOND_MICRO,
    assemblyWitnessRequired: true,
    description:
      'Reparations Era Initiation mandating all seven rites including the First Survey ' +
      'obligation. KALON bond raised to 250 KALON with proceeds directed to the Reparations ' +
      'Commons Fund. First Survey rite signals commitment to opening new worlds rather than ' +
      'extracting from existing ones.',
  },
  {
    protocolId: 'protocol:present',
    era: 'PRESENT',
    yearRange: { from: 100, to: null },
    requiredRites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    optionalRites: [],
    kalonBondRequiredMicro: PRESENT_ERA_KALON_BOND_MICRO,
    assemblyWitnessRequired: true,
    description:
      'Present era Initiation. All seven rites required with no waivers granted below ' +
      "Assembly supermajority (75%). The full weight of the Concord's 105-year history " +
      'is carried into every Initiation. The ritual takes one full in-game day.',
  },
];

const presentProtocol = INITIATION_PROTOCOLS.find((p) => p.era === 'PRESENT');
if (presentProtocol === undefined) {
  throw new Error('PRESENT era protocol missing from INITIATION_PROTOCOLS');
}
export const CURRENT_PROTOCOL: InitiationProtocol = presentProtocol;

// ΓöÇΓöÇΓöÇ Canonical Initiation Records ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const INITIATION_RECORDS: ReadonlyArray<InitiationRecord> = [
  // FOUNDING_ERA ΓÇö Years 0ΓÇô27
  {
    initiationId: 'init:0001',
    dynastyId: 'dynasty-founders',
    era: 'FOUNDING_ERA',
    year: 0,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY'],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: null,
    kalonBondMicro: 0n,
    assemblyWitnessId: null,
    chronicleEntryHash: 'sha256:abc0001founding',
    notes: 'First dynasty initiated at the founding of the Concord. Year Zero.',
  },
  {
    initiationId: 'init:0002',
    dynastyId: 'dynasty-alkahest',
    era: 'FOUNDING_ERA',
    year: 1,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY'],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-founders',
    kalonBondMicro: 0n,
    assemblyWitnessId: null,
    chronicleEntryHash: 'sha256:abc0002alkahest',
    notes: 'Second dynasty. Sponsored by the Founders. Primary architects of early governance.',
  },
  {
    initiationId: 'init:0003',
    dynastyId: 'dynasty-verenthis',
    era: 'FOUNDING_ERA',
    year: 3,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY', 'KALON_BOND'],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: null,
    kalonBondMicro: FOUNDING_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: null,
    chronicleEntryHash: 'sha256:abc0003verenthis',
    notes: 'Early dynasty that voluntarily posted KALON bond before it was required.',
  },
  {
    initiationId: 'init:0004',
    dynastyId: 'dynasty-solquine',
    era: 'FOUNDING_ERA',
    year: 8,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY'],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-014',
    sponsorDynastyId: 'dynasty-alkahest',
    kalonBondMicro: 0n,
    assemblyWitnessId: null,
    chronicleEntryHash: 'sha256:abc0004solquine',
    notes: 'First dynasty founded on world-014. Alkahest sponsored.',
  },
  {
    initiationId: 'init:0005',
    dynastyId: 'dynasty-marchenveld',
    era: 'FOUNDING_ERA',
    year: 15,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY', 'ASSEMBLY_WITNESS'],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: null,
    kalonBondMicro: 0n,
    assemblyWitnessId: 'witness:assembly:0005',
    chronicleEntryHash: 'sha256:abc0005marchenveld',
    notes: 'Voluntarily requested Assembly witness even before it became mandatory.',
  },
  {
    initiationId: 'init:0006',
    dynastyId: 'dynasty-ostermund',
    era: 'FOUNDING_ERA',
    year: 22,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'CHRONICLE_ENTRY'],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-verenthis',
    kalonBondMicro: 0n,
    assemblyWitnessId: null,
    chronicleEntryHash: 'sha256:abc0006ostermund',
    notes: 'Late Founding Era. Verenthis-sponsored.',
  },

  // GOVERNANCE_CRISIS ΓÇö Years 28ΓÇô44
  {
    initiationId: 'init:0007',
    dynastyId: 'dynasty-pellucid',
    era: 'GOVERNANCE_CRISIS',
    year: 29,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: null,
    kalonBondMicro: GOVERNANCE_CRISIS_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0031',
    chronicleEntryHash: 'sha256:abc0007pellucid',
    notes: 'First Initiation under the new crisis protocol with mandatory Assembly witness.',
  },
  {
    initiationId: 'init:0008',
    dynastyId: 'dynasty-calthren-proxy',
    era: 'GOVERNANCE_CRISIS',
    year: 32,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
    ],
    outcome: 'REJECTED',
    genesisWorldId: 'world-014',
    sponsorDynastyId: 'dynasty-ostermund',
    kalonBondMicro: GOVERNANCE_CRISIS_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0031',
    chronicleEntryHash: null,
    notes:
      'Rejected by Assembly vote after intelligence revealed dynasty to be an Ascendancy ' +
      'proxy. Sponsor dynasty Ostermund later placed under investigation.',
  },
  {
    initiationId: 'init:0009',
    dynastyId: 'dynasty-thornvast',
    era: 'GOVERNANCE_CRISIS',
    year: 35,
    rites: ['LATTICE_PULSE_TEST', 'DYNASTY_OATH', 'ASSEMBLY_WITNESS', 'CHRONICLE_ENTRY'],
    outcome: 'DEFERRED',
    genesisWorldId: 'world-014',
    sponsorDynastyId: null,
    kalonBondMicro: 0n,
    assemblyWitnessId: 'witness:assembly:0044',
    chronicleEntryHash: null,
    notes:
      'Deferred pending KALON bond verification. Thornvast had insufficient funds on record. ' +
      'Later re-initiated in Year 37 under the same protocol.',
  },
  {
    initiationId: 'init:0010',
    dynastyId: 'dynasty-veldrian',
    era: 'GOVERNANCE_CRISIS',
    year: 38,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
    ],
    outcome: 'PROVISIONAL',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-marchenveld',
    kalonBondMicro: GOVERNANCE_CRISIS_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0044',
    chronicleEntryHash: 'sha256:abc0010veldrian',
    notes:
      "Provisional status due to Veldrian's senior member later found to have Ascendancy " +
      'connections. Status downgraded retroactively. Never upgraded to ACCEPTED.',
  },
  {
    initiationId: 'init:0011',
    dynastyId: 'dynasty-caermark',
    era: 'GOVERNANCE_CRISIS',
    year: 42,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-014',
    sponsorDynastyId: 'dynasty-pellucid',
    kalonBondMicro: GOVERNANCE_CRISIS_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0059',
    chronicleEntryHash: 'sha256:abc0011caermark',
    notes: 'Accepted after thorough review. Caermark became a pillar of the Reform Era.',
  },

  // REFORM_ERA ΓÇö Years 45ΓÇô74
  {
    initiationId: 'init:0012',
    dynastyId: 'dynasty-lorvaine',
    era: 'REFORM_ERA',
    year: 46,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-caermark',
    kalonBondMicro: REFORM_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0072',
    chronicleEntryHash: 'sha256:abc0012lorvaine',
    notes: 'First Initiation under the full Reform Era protocol with Remembrance Pledge.',
  },
  {
    initiationId: 'init:0013',
    dynastyId: 'dynasty-sethanel',
    era: 'REFORM_ERA',
    year: 55,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-394',
    sponsorDynastyId: null,
    kalonBondMicro: REFORM_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0091',
    chronicleEntryHash: 'sha256:abc0013sethanel',
    notes: 'First dynasty to initiate with world-394 as genesis world. Survey Corps pioneer.',
  },
  {
    initiationId: 'init:0014',
    dynastyId: 'dynasty-nullmere',
    era: 'REFORM_ERA',
    year: 61,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-lorvaine',
    kalonBondMicro: REFORM_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0099',
    chronicleEntryHash: 'sha256:abc0014nullmere',
    notes: 'Lorvaine-sponsored. Nullmere became prominent in the Reparations Era governance.',
  },

  // REPARATIONS_ERA ΓÇö Years 75ΓÇô99
  {
    initiationId: 'init:0015',
    dynastyId: 'dynasty-corvinus',
    era: 'REPARATIONS_ERA',
    year: 76,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-394',
    sponsorDynastyId: 'dynasty-sethanel',
    kalonBondMicro: REPARATIONS_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0141',
    chronicleEntryHash: 'sha256:abc0015corvinus',
    notes: 'First dynasty accepted under the full seven-rite Reparations Era protocol.',
  },
  {
    initiationId: 'init:0016',
    dynastyId: 'dynasty-halveth',
    era: 'REPARATIONS_ERA',
    year: 84,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-014',
    sponsorDynastyId: null,
    kalonBondMicro: REPARATIONS_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0158',
    chronicleEntryHash: 'sha256:abc0016halveth',
    notes: 'Independent application. Halveth later became an Assembly delegate.',
  },
  {
    initiationId: 'init:0017',
    dynastyId: 'dynasty-ilthric-shell',
    era: 'REPARATIONS_ERA',
    year: 91,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    outcome: 'REJECTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-veldrian',
    kalonBondMicro: REPARATIONS_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0177',
    chronicleEntryHash: null,
    notes:
      'Rejected. Ilthric-shell identified as a new proxy structure for Ascendancy interests. ' +
      'Sponsor Veldrian (still in PROVISIONAL status) had its status permanently locked.',
  },

  // PRESENT ΓÇö Year 100+
  {
    initiationId: 'init:0018',
    dynastyId: 'dynasty-earneth',
    era: 'PRESENT',
    year: 100,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-394',
    sponsorDynastyId: 'dynasty-corvinus',
    kalonBondMicro: PRESENT_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0200',
    chronicleEntryHash: 'sha256:abc0018earneth',
    notes: 'First dynasty initiated in the Present era. Year 100 milestone.',
  },
  {
    initiationId: 'init:0019',
    dynastyId: 'dynasty-quelris',
    era: 'PRESENT',
    year: 103,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-001',
    sponsorDynastyId: 'dynasty-nullmere',
    kalonBondMicro: PRESENT_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0211',
    chronicleEntryHash: 'sha256:abc0019quelris',
    notes: 'Nullmere-sponsored. Quelris took the full ritual day as intended.',
  },
  {
    initiationId: 'init:0020',
    dynastyId: 'dynasty-thornvast-reformed',
    era: 'PRESENT',
    year: 105,
    rites: [
      'LATTICE_PULSE_TEST',
      'DYNASTY_OATH',
      'ASSEMBLY_WITNESS',
      'CHRONICLE_ENTRY',
      'KALON_BOND',
      'REMEMBRANCE_PLEDGE',
      'FIRST_SURVEY',
    ],
    outcome: 'ACCEPTED',
    genesisWorldId: 'world-014',
    sponsorDynastyId: 'dynasty-halveth',
    kalonBondMicro: PRESENT_ERA_KALON_BOND_MICRO,
    assemblyWitnessId: 'witness:assembly:0225',
    chronicleEntryHash: 'sha256:abc0020thornvast-reformed',
    notes:
      'Descendants of the deferred dynasty-thornvast from Year 35 successfully initiated ' +
      'under the Present era protocol, closing a 70-year family arc.',
  },
];

// ΓöÇΓöÇΓöÇ Derived Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Number of records in the FOUNDING_ERA */
export const FOUNDING_ERA_COUNT: number = INITIATION_RECORDS.filter(
  (r) => r.era === 'FOUNDING_ERA',
).length;

/** Total number of ACCEPTED initiation records */
export const TOTAL_ACCEPTED_COUNT: number = INITIATION_RECORDS.filter(
  (r) => r.outcome === 'ACCEPTED',
).length;

// ΓöÇΓöÇΓöÇ Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Retrieve the protocol defined for a specific era.
 *
 * @param era The era to look up
 */
export function getProtocolForEra(era: InitiationEra): InitiationProtocol | undefined {
  return INITIATION_PROTOCOLS.find((p) => p.era === era);
}

/**
 * Retrieve the protocol that was active during a given Concord year.
 * Finds the protocol whose yearRange.from <= year and yearRange.to >= year (or to is null).
 *
 * @param year Concord year to look up
 */
export function getProtocolForYear(year: number): InitiationProtocol | undefined {
  return INITIATION_PROTOCOLS.find((p) => {
    const afterStart = year >= p.yearRange.from;
    const beforeEnd = p.yearRange.to === null || year <= p.yearRange.to;
    return afterStart && beforeEnd;
  });
}

/**
 * Look up a single initiation record by its unique ID.
 *
 * @param initiationId The initiation ID to look up
 */
export function getInitiationRecord(initiationId: string): InitiationRecord | undefined {
  return INITIATION_RECORDS.find((r) => r.initiationId === initiationId);
}

/**
 * Retrieve all initiation records for a given dynasty.
 *
 * @param dynastyId The dynasty whose records to return
 */
export function getInitiationsByDynasty(dynastyId: string): InitiationRecord[] {
  return INITIATION_RECORDS.filter((r) => r.dynastyId === dynastyId);
}

/**
 * Retrieve all initiation records from a given era.
 *
 * @param era The era to filter by
 */
export function getInitiationsByEra(era: InitiationEra): InitiationRecord[] {
  return INITIATION_RECORDS.filter((r) => r.era === era);
}

/**
 * Retrieve all initiation records with a given outcome.
 *
 * @param outcome The outcome to filter by
 */
export function getInitiationsByOutcome(outcome: InitiationOutcome): InitiationRecord[] {
  return INITIATION_RECORDS.filter((r) => r.outcome === outcome);
}

/**
 * Retrieve all initiation records where the genesis world matches the given ID.
 *
 * @param worldId The world ID to filter by
 */
export function getInitiationsByWorld(worldId: string): InitiationRecord[] {
  return INITIATION_RECORDS.filter((r) => r.genesisWorldId === worldId);
}

/**
 * Compute a summary of all initiation records, counting by outcome and era.
 */
export function computeInitiationSummary(): InitiationSummary {
  const byEra = buildEraCountMap();

  for (const record of INITIATION_RECORDS) {
    byEra[record.era] += 1;
  }

  return {
    totalInitiations: INITIATION_RECORDS.length,
    acceptedCount: INITIATION_RECORDS.filter((r) => r.outcome === 'ACCEPTED').length,
    deferredCount: INITIATION_RECORDS.filter((r) => r.outcome === 'DEFERRED').length,
    rejectedCount: INITIATION_RECORDS.filter((r) => r.outcome === 'REJECTED').length,
    provisionalCount: INITIATION_RECORDS.filter((r) => r.outcome === 'PROVISIONAL').length,
    byEra,
  };
}

function buildEraCountMap(): Record<InitiationEra, number> {
  return {
    FOUNDING_ERA: 0,
    GOVERNANCE_CRISIS: 0,
    REFORM_ERA: 0,
    REPARATIONS_ERA: 0,
    PRESENT: 0,
  };
}

/**
 * Check whether a set of rites satisfies all required rites of a protocol.
 * Optional rites are not checked ΓÇö presence of extras is allowed.
 *
 * @param rites    The rites performed during the initiation
 * @param protocol The protocol whose requirements to validate against
 */
export function validateRitesForProtocol(
  rites: InitiationRite[],
  protocol: InitiationProtocol,
): boolean {
  return protocol.requiredRites.every((required) => rites.includes(required));
}

/**
 * Sum the kalonBondMicro of all ACCEPTED initiation records.
 * Returns a BigInt representing total micro-KALON bonded across all accepted dynasties.
 */
export function computeTotalKalonBonded(): bigint {
  return INITIATION_RECORDS.filter((r) => r.outcome === 'ACCEPTED').reduce(
    (sum, r) => sum + r.kalonBondMicro,
    0n,
  );
}
