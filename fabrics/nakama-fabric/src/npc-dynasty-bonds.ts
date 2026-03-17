/**
 * NPC Dynasty Bonds ΓÇö The 8 canonical NPCs and their bonds with specific dynasties.
 *
 * Patronage, betrayal, mentorship, rivalry, and blood debt shape the
 * political landscape of the Concord. These 25 bonds span all 8 NPCs and
 * form the invisible architecture beneath the Assembly's public face.
 *
 * NPC death years: Amara=55, Ikenna=60, Kwame=62, Nnamdi=68, Falaye=72,
 * Architect=75, Luca=78, Dagna=85
 *
 * Thread: silk
 * Tier: 2
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type BondType =
  | 'PATRONAGE'
  | 'BLOOD_DEBT'
  | 'MENTORSHIP'
  | 'RIVALRY'
  | 'BETRAYAL'
  | 'ALLIANCE'
  | 'ESTRANGEMENT';

export type BondStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'BINDING';

export type BondStatus = 'ACTIVE' | 'SEVERED' | 'TRANSFORMED' | 'HONOURED_IN_DEATH';

// ΓöÇΓöÇΓöÇ Interfaces ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface NpcDynastyBond {
  readonly bondId: string;
  readonly npcId: string;
  readonly dynastyId: string;
  readonly bondType: BondType;
  readonly strength: BondStrength;
  readonly formedYear: number;
  readonly endYear?: number;
  readonly status: BondStatus;
  readonly description: string;
  readonly kalonExchangedMicro?: bigint;
  readonly assemblyWitness: boolean;
}

export interface NpcBondProfile {
  readonly npcId: string;
  readonly bonds: ReadonlyArray<NpcDynastyBond>;
  readonly activeBonds: number;
  readonly severedBonds: number;
  readonly totalKalonExchangedMicro: bigint;
}

// ΓöÇΓöÇΓöÇ Bond Records ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * All 25 canonical NPCΓÇôdynasty bonds.
 * At least 3 bonds per NPC. Ordered by NPC then by formedYear.
 */
export const NPC_DYNASTY_BONDS: ReadonlyArray<NpcDynastyBond> = [
  // ΓöÇΓöÇ Amara Osei-Nti (death year 55) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-amara-001',
    npcId: 'npc-amara',
    dynastyId: 'dynasty-sunrise-compact',
    bondType: 'MENTORSHIP',
    strength: 'STRONG',
    formedYear: 3,
    endYear: 22,
    status: 'TRANSFORMED',
    description:
      'Amara guided the Sunrise Compact through their first decade of lattice governance. The mentorship ended when the dynasty outgrew her model and charted its own constitutional path ΓÇö a divergence Amara considers her greatest success.',
    kalonExchangedMicro: 0n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-amara-002',
    npcId: 'npc-amara',
    dynastyId: 'dynasty-ember-ridge',
    bondType: 'PATRONAGE',
    strength: 'BINDING',
    formedYear: 8,
    status: 'ACTIVE',
    description:
      'Amara undervrote the Ember Ridge colonisation license personally, staking her Assembly standing as surety. The dynasty has never forgotten this. Three of their council seats are informally pledged to her recommendations.',
    kalonExchangedMicro: 4_200_000_000n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-amara-003',
    npcId: 'npc-amara',
    dynastyId: 'dynasty-hollow-gate',
    bondType: 'BLOOD_DEBT',
    strength: 'MODERATE',
    formedYear: 19,
    endYear: 44,
    status: 'HONOURED_IN_DEATH',
    description:
      'Hollow Gate sheltered Amara during the Concord Audit Crisis of Year 19, absorbing Assembly scrutiny at significant cost. She repaid the debt over 25 years in incremental advocacy ΓÇö the ledger was finally closed the year before her death.',
    kalonExchangedMicro: 1_800_000_000n,
    assemblyWitness: false,
  },

  // ΓöÇΓöÇ Ikenna Oduya-Voss (death year 60) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-ikenna-001',
    npcId: 'npc-ikenna',
    dynastyId: 'dynasty-iron-meridian',
    bondType: 'RIVALRY',
    strength: 'BINDING',
    formedYear: 12,
    status: 'ACTIVE',
    description:
      'Iron Meridian filed the intelligence complaint that nearly ended Ikenna\'s career in Year 12. He survived the inquiry and has spent four decades treating them as the sharpest available whetstone ΓÇö his threat models have been more accurate ever since.',
    kalonExchangedMicro: 0n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-ikenna-002',
    npcId: 'npc-ikenna',
    dynastyId: 'dynasty-voss-meridian',
    bondType: 'PATRONAGE',
    strength: 'STRONG',
    formedYear: 5,
    endYear: 30,
    status: 'SEVERED',
    description:
      'The Voss Meridian dynasty sponsored Ikenna\'s early intelligence career, expecting a loyal instrument. He severed the relationship at Year 30 when they asked him to suppress an assessment. He filed the assessment in full.',
    kalonExchangedMicro: 620_000_000n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-ikenna-003',
    npcId: 'npc-ikenna',
    dynastyId: 'dynasty-pale-standard',
    bondType: 'ALLIANCE',
    strength: 'MODERATE',
    formedYear: 40,
    status: 'ACTIVE',
    description:
      'Pale Standard has quietly forwarded Ascendancy intelligence to Ikenna outside normal Assembly channels for twenty years. Neither party has acknowledged the arrangement publicly. It is the most productive intelligence relationship Ikenna has.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },

  // ΓöÇΓöÇ Kwame Osei-Adeyemi (death year 62) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-kwame-001',
    npcId: 'npc-kwame',
    dynastyId: 'dynasty-first-light',
    bondType: 'PATRONAGE',
    strength: 'BINDING',
    formedYear: 1,
    endYear: 45,
    status: 'HONOURED_IN_DEATH',
    description:
      'First Light was the founding dynasty that placed Kwame in his constitutional role. He served their interests for 44 years before the constitutional weight of his signature outlasted them. They dissolved before he died; the patronage was honoured without a patron.',
    kalonExchangedMicro: 9_100_000_000n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-kwame-002',
    npcId: 'npc-kwame',
    dynastyId: 'dynasty-ascendancy-proximate',
    bondType: 'ALLIANCE',
    strength: 'STRONG',
    formedYear: 55,
    status: 'ACTIVE',
    description:
      'A private alliance formed after Ikenna\'s Version 13 assessment ΓÇö Kwame has communicated to Ascendancy-adjacent dynasties that his signature, when invoked, will carry the constitutional weight they require. He has told no one in the Assembly.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-kwame-003',
    npcId: 'npc-kwame',
    dynastyId: 'dynasty-covenant-anchor',
    bondType: 'BLOOD_DEBT',
    strength: 'STRONG',
    formedYear: 20,
    status: 'ACTIVE',
    description:
      'Covenant Anchor protected the constitutional precedent Kwame set in Year 20 from a retroactive challenge. Without their archival testimony, the precedent would have been erased. Kwame\'s signature carries their survival now as part of its weight.',
    kalonExchangedMicro: 0n,
    assemblyWitness: true,
  },

  // ΓöÇΓöÇ Nnamdi Achebe-Strom (death year 68) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-nnamdi-001',
    npcId: 'npc-nnamdi',
    dynastyId: 'dynasty-first-light',
    bondType: 'ESTRANGEMENT',
    strength: 'STRONG',
    formedYear: 2,
    endYear: 35,
    status: 'SEVERED',
    description:
      'First Light mentored Nnamdi through his first decade of Assembly practice. The mentorship became estrangement when Nnamdi published his Year 35 governance paper ΓÇö a direct critique of First Light\'s constitutional model that he would not retract.',
    kalonExchangedMicro: 250_000_000n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-nnamdi-002',
    npcId: 'npc-nnamdi',
    dynastyId: 'dynasty-deep-meridian',
    bondType: 'MENTORSHIP',
    strength: 'STRONG',
    formedYear: 38,
    status: 'ACTIVE',
    description:
      'After the First Light estrangement, Nnamdi poured the mentorship energy into Deep Meridian ΓÇö a younger dynasty willing to test his revised governance model in practice. Three of their constitutional clauses are verbatim Nnamdi.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-nnamdi-003',
    npcId: 'npc-nnamdi',
    dynastyId: 'dynasty-calcite-ledger',
    bondType: 'RIVALRY',
    strength: 'MODERATE',
    formedYear: 50,
    status: 'ACTIVE',
    description:
      'Calcite Ledger has published four governance analyses that methodically dismantle Nnamdi\'s constitutional framework. He attends every presentation. He has never publicly responded, but his private annotations run to 300 pages.',
    kalonExchangedMicro: 0n,
    assemblyWitness: true,
  },

  // ΓöÇΓöÇ Falaye Okonkwo-Saarinen (death year 72) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-falaye-001',
    npcId: 'npc-falaye',
    dynastyId: 'dynasty-okafor',
    bondType: 'BETRAYAL',
    strength: 'BINDING',
    formedYear: 4,
    status: 'ACTIVE',
    description:
      'The founding wound. Falaye redirected dynasty-okafor\'s issuance claim during the Year 4 Survey Corps allocation ΓÇö diverting 12 billion micro-KALON from their founding grant to the Commons Fund under a procedural reclassification. The dynasty has never recovered its original economic standing. Falaye has never apologised. She believes it was correct.',
    kalonExchangedMicro: 12_000_000_000n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-falaye-002',
    npcId: 'npc-falaye',
    dynastyId: 'dynasty-survey-anchor',
    bondType: 'PATRONAGE',
    strength: 'STRONG',
    formedYear: 10,
    status: 'ACTIVE',
    description:
      'Falaye has consistently routed the most productive Survey Corps contracts to Survey Anchor, building them into the premier first-contact dynasty. They are her instrument of choice when a new world needs a particular kind of first impression.',
    kalonExchangedMicro: 7_500_000_000n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-falaye-003',
    npcId: 'npc-falaye',
    dynastyId: 'dynasty-okafor',
    bondType: 'BLOOD_DEBT',
    strength: 'BINDING',
    formedYear: 15,
    status: 'ACTIVE',
    description:
      'A second bond with the same dynasty ΓÇö distinct from the betrayal. An Okafor heir saved Falaye\'s Survey team on World-118 in Year 15, refusing to leave despite the lattice collapse risk. Falaye has carried this privately for decades. She has never told the heir she remembers.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-falaye-004',
    npcId: 'npc-falaye',
    dynastyId: 'dynasty-pale-frontier',
    bondType: 'ALLIANCE',
    strength: 'MODERATE',
    formedYear: 28,
    status: 'ACTIVE',
    description:
      'Pale Frontier operates in zones Falaye cannot reach through official Survey Corps channels. They forward world-condition reports in exchange for prioritised lattice integrity assessments. The arrangement has no paperwork.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },

  // ΓöÇΓöÇ The Architect (death year 75) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-architect-001',
    npcId: 'npc-architect',
    dynastyId: 'dynasty-iron-meridian',
    bondType: 'PATRONAGE',
    strength: 'BINDING',
    formedYear: 1,
    status: 'ACTIVE',
    description:
      'Iron Meridian was the Architect\'s first commission ΓÇö he designed their governance charter, their economic instruments, and their succession law. They owe their institutional form entirely to him. He considers them his most literal work.',
    kalonExchangedMicro: 15_000_000_000n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-architect-002',
    npcId: 'npc-architect',
    dynastyId: 'dynasty-sunrise-compact',
    bondType: 'PATRONAGE',
    strength: 'STRONG',
    formedYear: 3,
    status: 'ACTIVE',
    description:
      'The Architect wrote the Sunrise Compact\'s foundational economic model before Amara began her mentorship of them. His patronage predates hers by months. He has never told Amara this, and she has never asked.',
    kalonExchangedMicro: 8_800_000_000n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-architect-003',
    npcId: 'npc-architect',
    dynastyId: 'dynasty-deep-meridian',
    bondType: 'PATRONAGE',
    strength: 'MODERATE',
    formedYear: 40,
    status: 'ACTIVE',
    description:
      'Deep Meridian came to the Architect after their first governance crisis. He rebuilt their constitutional framework on a more stable base. He notes privately that this is the third rebuild he has done for dynasties that rejected good advice the first time.',
    kalonExchangedMicro: 3_200_000_000n,
    assemblyWitness: false,
  },
  // ΓöÇΓöÇ Luca Okonkwo-Reinholt (death year 78) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-luca-001',
    npcId: 'npc-luca',
    dynastyId: 'dynasty-outer-reach-seven',
    bondType: 'ALLIANCE',
    strength: 'BINDING',
    formedYear: 22,
    status: 'ACTIVE',
    description:
      'Luca\'s hidden outer-zone alliance. Outer Reach Seven receives advance notice of KALON issuance scheduling, allowing them to position trade routes before the data is public. In exchange, they route economic productivity data to Luca\'s models without Assembly attribution.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-luca-002',
    npcId: 'npc-luca',
    dynastyId: 'dynasty-far-lattice-consortium',
    bondType: 'ALLIANCE',
    strength: 'STRONG',
    formedYear: 31,
    status: 'ACTIVE',
    description:
      'Far Lattice Consortium operates eight worlds beyond current Survey Corps priority zones. Luca has directed small issuance adjustments their way for a decade ΓÇö not enough to trigger audit thresholds, enough to keep them solvent. They know. Neither party discusses it.',
    kalonExchangedMicro: 2_400_000_000n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-luca-003',
    npcId: 'npc-luca',
    dynastyId: 'dynasty-continuationist-core',
    bondType: 'PATRONAGE',
    strength: 'BINDING',
    formedYear: 6,
    status: 'ACTIVE',
    description:
      'Luca built the Continuationist Core\'s economic doctrine. Their entire KALON management philosophy ΓÇö reserve-first, issuance-second ΓÇö is his. The RESERVE_CACHE_001 is the doctrine\'s logical conclusion. They do not know about the cache.',
    kalonExchangedMicro: 11_000_000_000n,
    assemblyWitness: true,
  },

  // ΓöÇΓöÇ Dagna Eriksen-Obi (death year 85) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    bondId: 'bond-dagna-001',
    npcId: 'npc-dagna',
    dynastyId: 'dynasty-chronicle-house',
    bondType: 'ALLIANCE',
    strength: 'STRONG',
    formedYear: 14,
    status: 'ACTIVE',
    description:
      'Chronicle House archives Dagna\'s audit findings in formats that cannot be altered, redacted, or lost. The arrangement is mutual ΓÇö Dagna provides early access to economic anomaly reports; Chronicle House provides the immutable record that makes her findings unchallengeable.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },
  {
    bondId: 'bond-dagna-002',
    npcId: 'npc-dagna',
    dynastyId: 'dynasty-iron-meridian',
    bondType: 'RIVALRY',
    strength: 'STRONG',
    formedYear: 27,
    status: 'ACTIVE',
    description:
      'Iron Meridian has attempted to have Dagna removed from audit oversight three times. Each attempt has produced a more thorough audit than the one before. She keeps a running count. The current tally is three attempts, forty-two anomaly flags.',
    kalonExchangedMicro: 0n,
    assemblyWitness: true,
  },
  {
    bondId: 'bond-dagna-003',
    npcId: 'npc-dagna',
    dynastyId: 'dynasty-pale-standard',
    bondType: 'MENTORSHIP',
    strength: 'MODERATE',
    formedYear: 55,
    status: 'ACTIVE',
    description:
      'Pale Standard\'s third-generation auditors trained under Dagna\'s methodology. She does not offer mentorship lightly ΓÇö they earned it by flagging an anomaly she had missed. She noted the correction in the Remembrance and considers the debt paid, but the mentorship continues.',
    kalonExchangedMicro: 0n,
    assemblyWitness: false,
  },
] as const;

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const TOTAL_BONDS: number = NPC_DYNASTY_BONDS.length;

export const BETRAYAL_COUNT: number = NPC_DYNASTY_BONDS.filter(
  (b) => b.bondType === 'BETRAYAL',
).length;

export const BLOOD_DEBT_COUNT: number = NPC_DYNASTY_BONDS.filter(
  (b) => b.bondType === 'BLOOD_DEBT',
).length;

export const TOTAL_KALON_EXCHANGED_MICRO: bigint = NPC_DYNASTY_BONDS.reduce(
  (sum, b) => sum + (b.kalonExchangedMicro ?? 0n),
  0n,
);

// ΓöÇΓöÇΓöÇ Lookups ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Returns the bond with the given ID, or undefined if not found. */
export function getBond(id: string): NpcDynastyBond | undefined {
  return NPC_DYNASTY_BONDS.find((b) => b.bondId === id);
}

/** Returns all bonds for a given NPC. */
export function getBondsByNpc(npcId: string): ReadonlyArray<NpcDynastyBond> {
  return NPC_DYNASTY_BONDS.filter((b) => b.npcId === npcId);
}

/** Returns all bonds involving a given dynasty (as patron, rival, or debtor). */
export function getBondsByDynasty(dynastyId: string): ReadonlyArray<NpcDynastyBond> {
  return NPC_DYNASTY_BONDS.filter((b) => b.dynastyId === dynastyId);
}

/** Returns all bonds of a given type across all NPCs. */
export function getBondsByType(type: BondType): ReadonlyArray<NpcDynastyBond> {
  return NPC_DYNASTY_BONDS.filter((b) => b.bondType === type);
}

/** Returns all bonds with ACTIVE status. */
export function getActiveBonds(): ReadonlyArray<NpcDynastyBond> {
  return NPC_DYNASTY_BONDS.filter((b) => b.status === 'ACTIVE');
}

/** Returns all bonds with SEVERED status. */
export function getSeveredBonds(): ReadonlyArray<NpcDynastyBond> {
  return NPC_DYNASTY_BONDS.filter((b) => b.status === 'SEVERED');
}

// ΓöÇΓöÇΓöÇ Profile Aggregation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Builds the bond profile for a single NPC from the canonical bond list. */
export function getNpcBondProfile(npcId: string): NpcBondProfile {
  const bonds = getBondsByNpc(npcId);
  const activeBonds = bonds.filter((b) => b.status === 'ACTIVE').length;
  const severedBonds = bonds.filter((b) => b.status === 'SEVERED').length;
  const totalKalonExchangedMicro = bonds.reduce(
    (sum, b) => sum + (b.kalonExchangedMicro ?? 0n),
    0n,
  );
  return { npcId, bonds, activeBonds, severedBonds, totalKalonExchangedMicro };
}

// ΓöÇΓöÇΓöÇ Summary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface BondSummary {
  readonly totalBonds: number;
  readonly activeBonds: number;
  readonly severedBonds: number;
  readonly transformedBonds: number;
  readonly honouredInDeathBonds: number;
  readonly betrayalCount: number;
  readonly bloodDebtCount: number;
  readonly totalKalonExchangedMicro: bigint;
  readonly npcCount: number;
}

/** Returns an aggregate summary across all 25 canonical bonds. */
export function computeBondSummary(): BondSummary {
  const active = NPC_DYNASTY_BONDS.filter((b) => b.status === 'ACTIVE').length;
  const severed = NPC_DYNASTY_BONDS.filter((b) => b.status === 'SEVERED').length;
  const transformed = NPC_DYNASTY_BONDS.filter((b) => b.status === 'TRANSFORMED').length;
  const honouredInDeath = NPC_DYNASTY_BONDS.filter((b) => b.status === 'HONOURED_IN_DEATH').length;
  const npcIds = new Set(NPC_DYNASTY_BONDS.map((b) => b.npcId));
  return {
    totalBonds: TOTAL_BONDS,
    activeBonds: active,
    severedBonds: severed,
    transformedBonds: transformed,
    honouredInDeathBonds: honouredInDeath,
    betrayalCount: BETRAYAL_COUNT,
    bloodDebtCount: BLOOD_DEBT_COUNT,
    totalKalonExchangedMicro: TOTAL_KALON_EXCHANGED_MICRO,
    npcCount: npcIds.size,
  };
}

// ΓöÇΓöÇΓöÇ NPC Bond Profiles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** The canonical bond profile for each of the 8 NPCs. Computed once at module load. */
export const NPC_BOND_PROFILES: ReadonlyArray<NpcBondProfile> = [
  getNpcBondProfile('npc-amara'),
  getNpcBondProfile('npc-ikenna'),
  getNpcBondProfile('npc-kwame'),
  getNpcBondProfile('npc-nnamdi'),
  getNpcBondProfile('npc-falaye'),
  getNpcBondProfile('npc-architect'),
  getNpcBondProfile('npc-luca'),
  getNpcBondProfile('npc-dagna'),
] as const;
