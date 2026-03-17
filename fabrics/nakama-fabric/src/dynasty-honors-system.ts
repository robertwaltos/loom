/**
 * Dynasty Honors System ΓÇö Formal honors, awards, and distinctions granted
 * by the Assembly, Architect, and Survey Corps to dynasties for exceptional
 * contributions to the Concord.
 *
 * Honors are not cosmetic. They carry real Assembly weight bonuses,
 * KALON grants, and special access privileges.
 *
 * "A civilization that remembers what it owes will not repeat what it forgot."
 */

// ΓöÇΓöÇΓöÇ Port Interfaces ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HonorsClockPort {
  readonly nowMicroseconds: () => number;
}

export interface HonorsIdGeneratorPort {
  readonly next: () => string;
}

export interface HonorsDeps {
  readonly clock: HonorsClockPort;
  readonly idGenerator: HonorsIdGeneratorPort;
}

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type HonorTier =
  | 'RECOGNITION'
  | 'COMMENDATION'
  | 'DISTINCTION'
  | 'FOUNDING_HONOR'
  | 'ETERNAL_MARK';

export type HonorCategory =
  | 'CHRONICLE_CONTRIBUTION'
  | 'ECONOMIC_STEWARDSHIP'
  | 'SURVEY_CORPS_SERVICE'
  | 'GOVERNANCE_REFORM'
  | 'WOUND_RECOGNITION'
  | 'LATTICE_STEWARDSHIP'
  | 'FOUNDING_SERVICE';

export interface HonorBenefit {
  readonly assemblyWeightBonus: number; // basis points
  readonly kalonGrantMicro: bigint;
  readonly specialAccessUnlocked: ReadonlyArray<string>;
  readonly chronicleClassificationLift: boolean;
  readonly permanentRecord: boolean;
}

export interface DynastyHonor {
  readonly id: string;
  readonly name: string;
  readonly tier: HonorTier;
  readonly category: HonorCategory;
  readonly grantedYear: number;
  readonly recipientDynastyId: string;
  readonly grantedBy: 'ASSEMBLY' | 'ARCHITECT' | 'SURVEY_CORPS';
  readonly description: string;
  readonly benefit: HonorBenefit;
  readonly precedingCitation: string;
  readonly isHistoric: boolean;
}

// ΓöÇΓöÇΓöÇ Honor Summary ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HonorSummary {
  readonly total: number;
  readonly byTier: Readonly<Record<HonorTier, number>>;
  readonly byCategory: Readonly<Record<HonorCategory, number>>;
  readonly totalKalonGrantedMicro: bigint;
}

// ΓöÇΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DynastyHonorsService {
  readonly getHonor: (id: string) => DynastyHonor | undefined;
  readonly getHonorsByTier: (tier: HonorTier) => ReadonlyArray<DynastyHonor>;
  readonly getHonorsByCategory: (category: HonorCategory) => ReadonlyArray<DynastyHonor>;
  readonly getHonorsByDynasty: (dynastyId: string) => ReadonlyArray<DynastyHonor>;
  readonly getHistoricHonors: () => ReadonlyArray<DynastyHonor>;
  readonly getEternalMarks: () => ReadonlyArray<DynastyHonor>;
  readonly computeTotalAssemblyWeightBonus: (dynastyId: string) => number;
  readonly computeTotalKalonGranted: (dynastyId: string) => bigint;
  readonly getHonorTimeline: () => ReadonlyArray<DynastyHonor>;
  readonly getHonorSummary: () => HonorSummary;
}

// ΓöÇΓöÇΓöÇ Benefit Builders ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function benefit(
  assemblyWeightBonus: number,
  kalonGrantMicro: bigint,
  specialAccessUnlocked: ReadonlyArray<string> = [],
  chronicleClassificationLift: boolean = false,
  permanentRecord: boolean = false,
): HonorBenefit {
  return {
    assemblyWeightBonus,
    kalonGrantMicro,
    specialAccessUnlocked,
    chronicleClassificationLift,
    permanentRecord,
  };
}

// ΓöÇΓöÇΓöÇ Canonical Honors ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const CANONICAL_HONORS: ReadonlyArray<DynastyHonor> = [
  {
    id: 'honor-survey-first',
    name: 'The First World Honor',
    tier: 'FOUNDING_HONOR',
    category: 'SURVEY_CORPS_SERVICE',
    grantedYear: 1,
    recipientDynastyId: 'assembly-grantee-001',
    grantedBy: 'SURVEY_CORPS',
    description:
      'Granted to the commanding dynasty of EXP-0001, the first successful survey expedition. The honor carries permanent Survey Corps advisory access and a 5000 KALON grant.',
    benefit: benefit(500, 5_000_000_000n, ['survey-corps-command'], false, true),
    precedingCitation:
      'In the first year of the Concord, a dynasty stepped beyond the known boundary and returned with proof of another world. They did not know what they would find. They went anyway. The Survey Corps recognizes this act not as courage ΓÇö courage implies certainty overcome ΓÇö but as faith in what the Concord could become. The First World Honor is permanent. It cannot be revoked.',
    isHistoric: false,
  },
  {
    id: 'honor-chronicle-century',
    name: 'The Century Chronicle',
    tier: 'DISTINCTION',
    category: 'CHRONICLE_CONTRIBUTION',
    grantedYear: 15,
    recipientDynastyId: 'dynasty-chronicle-pioneer',
    grantedBy: 'ASSEMBLY',
    description:
      'Granted to the first dynasty to reach 100,000 Chronicle entries. Carries Assembly seat weight bonus and public recognition.',
    benefit: benefit(250, 500_000_000n, [], false, true),
    precedingCitation:
      'One hundred thousand entries. The Assembly has reviewed the completeness, the depth, and the honesty of this Chronicle. What was recorded here was not performance. It was testimony. The century mark is not a number. It is a demonstration that some dynasties believe the record matters more than the appearance of the record. The Concord is better for this.',
    isHistoric: false,
  },
  {
    id: 'honor-bone-chorus-witness',
    name: 'The Bone Chorus Witness',
    tier: 'FOUNDING_HONOR',
    category: 'LATTICE_STEWARDSHIP',
    grantedYear: 5,
    recipientDynastyId: 'dynasty-world-014-first',
    grantedBy: 'ARCHITECT',
    description:
      'Granted by the Architect personally to the first dynasty to document a Bone Chorus resonance frequency. Access to restricted Bone Chorus Archive.',
    benefit: benefit(300, 1_000_000_000n, ['bone-chorus-archive'], true, false),
    precedingCitation:
      'The Bone Chorus speaks in frequencies that most dynasties do not know how to hear. This dynasty listened. They did not understand what they were recording ΓÇö no one did, not fully ΓÇö but they recorded it anyway with the precision that the Lattice deserved. The Architect grants this honor personally, because some discoveries cannot wait for the Assembly to convene. This one could not wait.',
    isHistoric: false,
  },
  {
    id: 'honor-founding-mark-legacy',
    name: 'The Founding Mark Legacy',
    tier: 'FOUNDING_HONOR',
    category: 'FOUNDING_SERVICE',
    grantedYear: 1,
    recipientDynastyId: 'founding-mark-dynasty-001',
    grantedBy: 'ASSEMBLY',
    description:
      'Granted to the first 100 Founding Mark dynasties on the tenth anniversary of their registration. Carries increased Assembly standing.',
    benefit: benefit(400, 2_000_000_000n, [], false, true),
    precedingCitation:
      'Ten years ago, these dynasties chose the Concord before the Concord had proven itself. They registered when the institutions were new, the economy was untested, and the Survey Corps had not yet returned from the first expedition. Their presence in the founding record is not an accident of timing. It is the earliest evidence that the Concord was worth believing in.',
    isHistoric: false,
  },
  {
    id: 'honor-kalon-steward',
    name: 'The KALON Stewardship Citation',
    tier: 'COMMENDATION',
    category: 'ECONOMIC_STEWARDSHIP',
    grantedYear: 25,
    recipientDynastyId: 'dynasty-zero-levy',
    grantedBy: 'ASSEMBLY',
    description:
      'Granted to dynasties that have operated within the Active Wealth Zone for 25 consecutive years without triggering levy redistribution ΓÇö while maintaining active Chronicle contribution.',
    benefit: benefit(150, 200_000_000n, [], false, false),
    precedingCitation:
      'The levy exists because concentration is a failure mode, not a feature. This dynasty operated for 25 years within the Active Wealth Zone without requiring redistribution ΓÇö not by accident, and not by poverty. They maintained active Chronicle contribution throughout. The Assembly recognizes that responsible economic behavior sustained over a generation is not small. It is the baseline the economy was designed to reward.',
    isHistoric: false,
  },
  {
    id: 'honor-world-394-vigil',
    name: 'The Vigil of 394',
    tier: 'ETERNAL_MARK',
    category: 'WOUND_RECOGNITION',
    grantedYear: 85,
    recipientDynastyId: 'world-394-survivors-coalition',
    grantedBy: 'ASSEMBLY',
    description:
      "Granted to the survivor coalition of World 394. The Eternal Mark is irreversible and carries the highest Assembly weight of any single honor. 'They did not choose to witness. They were made witnesses.'",
    benefit: benefit(1000, 10_000_000_000n, [], false, true),
    precedingCitation:
      "World 394 collapsed in Year 83. The Assembly did not prevent it. The Concord's institutions did not prevent it. The dynasties who survived did not survive because of anything the Concord built ΓÇö they survived in spite of what it failed to build. The Vigil of 394 is granted not as consolation. It is granted as acknowledgment. They did not choose to witness. They were made witnesses. The Eternal Mark is permanent and irreversible.",
    isHistoric: true,
  },
  {
    id: 'honor-okafor-restoration',
    name: 'The Okafor Restoration Honor',
    tier: 'ETERNAL_MARK',
    category: 'WOUND_RECOGNITION',
    grantedYear: 68,
    recipientDynastyId: 'okafor-eze-dynasty',
    grantedBy: 'ASSEMBLY',
    description:
      "Granted to the Okafor-Eze dynasty upon Nnamdi's death and the full restoration of Dr. Emeka Okafor to the founding record. 'A lineage that carried an erasure for 68 years and chose not to become what erased them.'",
    benefit: benefit(1000, 50_000_000_000n, [], true, true),
    precedingCitation:
      "For 68 years, the Okafor-Eze dynasty carried the knowledge of their ancestor's erasure from the founding record. They carried it without becoming the thing that erased him. They chose testimony over vengeance, and disclosure over silence. Dr. Emeka Okafor is restored to the founding record in full. The Assembly grants the Eternal Mark to the dynasty that made this restoration possible ΓÇö not by demanding it, but by surviving long enough to ask.",
    isHistoric: true,
  },
  {
    id: 'honor-governance-architect',
    name: 'The Governance Architecture Award',
    tier: 'DISTINCTION',
    category: 'GOVERNANCE_REFORM',
    grantedYear: 60,
    recipientDynastyId: 'ikenna-osei-dynasty',
    grantedBy: 'ASSEMBLY',
    description:
      "Granted posthumously to the Ikenna Osei dynasty for the Governance Reform Act. 'He designed the house. Others built it.'",
    benefit: benefit(400, 2_000_000_000n, [], false, true),
    precedingCitation:
      "Ikenna Osei did not live to see the Governance Reform Act ratified. He spent 22 years drafting it, revising it, and presenting it to Assemblies that were not yet ready to hear it. The Act passed in Year 59, one year after his death. The Concord's governance is more equitable because of work that was completed after the man who began it was no longer present. He designed the house. Others built it. The Assembly honors the design.",
    isHistoric: false,
  },
  {
    id: 'honor-survey-century',
    name: 'The Century of Worlds',
    tier: 'DISTINCTION',
    category: 'SURVEY_CORPS_SERVICE',
    grantedYear: 62,
    recipientDynastyId: 'survey-corps-centennial-dynasty',
    grantedBy: 'SURVEY_CORPS',
    description:
      'Granted to the dynasty that led the expedition surveying the 100th world. Carries Survey Corps command access.',
    benefit: benefit(350, 3_000_000_000n, ['survey-corps-command'], false, false),
    precedingCitation:
      'One hundred worlds. The Survey Corps has been operating for 62 years, and this dynasty commanded the expedition that closed the first century of discovery. They did not know, when they departed, that they would be the hundredth. They returned to find that they were. The Concord is 100 worlds larger because of them. The Survey Corps grants the Century of Worlds, and with it, permanent command access.',
    isHistoric: false,
  },
  {
    id: 'honor-chronicle-depth-master',
    name: 'The Deep Chronicle',
    tier: 'FOUNDING_HONOR',
    category: 'CHRONICLE_CONTRIBUTION',
    grantedYear: 47,
    recipientDynastyId: 'dynasty-chamber-seven-first',
    grantedBy: 'ASSEMBLY',
    description:
      'Granted to the first dynasty to reach Chamber Seven. Carries the only active Chronicle depth certification above 90th percentile.',
    benefit: benefit(
      600,
      5_000_000_000n,
      ['chamber-seven-access', 'chronicle-deep-archive'],
      true,
      true,
    ),
    precedingCitation:
      'Chamber Seven has existed in the Chronicle architecture since Year 1. No dynasty had reached it in 47 years. This dynasty did not announce their approach. They did not seek the distinction. They simply continued deeper than anyone else, for longer than anyone else, with more honesty than anyone else. Chamber Seven is open. The Assembly certifies this dynasty as the first. The Deep Chronicle honor carries the only active depth certification above the 90th percentile.',
    isHistoric: false,
  },
  {
    id: 'honor-lattice-guardian',
    name: 'The Lattice Guardian',
    tier: 'DISTINCTION',
    category: 'LATTICE_STEWARDSHIP',
    grantedYear: 35,
    recipientDynastyId: 'dynasty-world-044-restoration',
    grantedBy: 'ASSEMBLY',
    description:
      "Granted to dynasties that voluntarily funded World 44 lattice restoration after the Year 31 collapse. 'They did not cause the collapse. They chose to repair it.'",
    benefit: benefit(300, 1_500_000_000n, [], false, false),
    precedingCitation:
      "World 44's lattice collapsed in Year 31. The cause was diffuse ΓÇö decades of small decisions, no single dynasty responsible. The dynasties receiving this honor did not cause the collapse. They chose to fund the restoration anyway, without being asked, without being compensated at the time. Lattice integrity is not a personal asset. It is shared infrastructure. These dynasties acted as if they understood that before the Assembly had finished explaining it.",
    isHistoric: false,
  },
  {
    id: 'honor-bello-ferreira-witness',
    name: 'The Bello-Ferreira Witness',
    tier: 'ETERNAL_MARK',
    category: 'WOUND_RECOGNITION',
    grantedYear: 72,
    recipientDynastyId: 'bello-ferreira-lineage',
    grantedBy: 'ASSEMBLY',
    description:
      "Granted to the Bello-Ferreira dynasty upon Falaye's disclosure of their founding lineage. 'A dynasty that did not know their ancestor was erased. A civilization that is learning to restore what it removed.'",
    benefit: benefit(1000, 25_000_000_000n, [], true, true),
    precedingCitation:
      'The Bello-Ferreira dynasty did not know. Falaye discovered in Year 71 that their founding ancestor had been erased from the Concord record before they were born. They disclosed this immediately, publicly, and without condition. The Assembly is granting the Eternal Mark not because they suffered ΓÇö though they did ΓÇö but because they chose transparency when silence was available to them. A dynasty that did not know their ancestor was erased. A civilization that is learning to restore what it removed.',
    isHistoric: true,
  },
  {
    id: 'honor-ubk-pioneer',
    name: 'The Commons Pioneer',
    tier: 'COMMENDATION',
    category: 'ECONOMIC_STEWARDSHIP',
    grantedYear: 10,
    recipientDynastyId: 'dynasty-ubk-founding',
    grantedBy: 'ASSEMBLY',
    description:
      'Granted to the dynasties that advocated for the Universal Basic KALON system in Years 1-10. Carries historical record.',
    benefit: benefit(100, 500_000_000n, [], false, false),
    precedingCitation:
      'The Universal Basic KALON system did not exist in Year 1. It existed by Year 12 because specific dynasties argued for it before it was popular, before the economy had demonstrated its necessity, and before the Assembly was ready to vote on it. The Commons Pioneer is granted to those who advocated before the outcome was certain. The UBK now distributes to every registered dynasty in the Concord. It began here.',
    isHistoric: false,
  },
  {
    id: 'honor-kwame-transparency',
    name: 'The Transparency Citation',
    tier: 'DISTINCTION',
    category: 'GOVERNANCE_REFORM',
    grantedYear: 62,
    recipientDynastyId: 'kwame-asante-dynasty',
    grantedBy: 'ASSEMBLY',
    description:
      "Granted to the Kwame Asante dynasty for the Year 67 dataset confession. 'He told the truth when the truth was 30 years old. He told it anyway.'",
    benefit: benefit(400, 2_000_000_000n, [], false, true),
    precedingCitation:
      'In Year 62, the Kwame Asante dynasty disclosed a dataset that had been in their possession since Year 32 ΓÇö 30 years of holding information that implicated their founding generation in a governance irregularity they had not caused but had benefited from. They disclosed it without legal compulsion. They disclosed it knowing it would reduce their Assembly standing. The Transparency Citation is granted because honesty that costs something is the only honesty the Concord can trust.',
    isHistoric: true,
  },
  {
    id: 'honor-founding-covenant-first',
    name: 'The Covenant Foundation',
    tier: 'ETERNAL_MARK',
    category: 'FOUNDING_SERVICE',
    grantedYear: 1,
    recipientDynastyId: 'concord-founding-council',
    grantedBy: 'ARCHITECT',
    description:
      "Granted by the Architect to the original founding council. The oldest honor in the Concord. Carries full founding rights and the Architect's personal endorsement.",
    benefit: benefit(2000, 100_000_000_000n, [], false, true),
    precedingCitation:
      "Before the Chronicle existed, before the KALON supply was issued, before the Survey Corps had a name ΓÇö these dynasties agreed to build the Concord together. They agreed on the shape of the Assembly, the structure of the economy, and the idea that a civilization of 600 worlds was worth attempting. The Architect grants the Covenant Foundation as the oldest honor in the Concord's record. Everything that followed began with this council. Everything that follows still will.",
    isHistoric: true,
  },
];

// ΓöÇΓöÇΓöÇ Export Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ETERNAL_MARK_COUNT = 4;
export const HISTORIC_HONOR_COUNT = 5;
export const HIGHEST_ASSEMBLY_BONUS_HONOR_ID = 'honor-founding-covenant-first';

// ΓöÇΓöÇΓöÇ Index Builders ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function buildHonorIndex(honors: ReadonlyArray<DynastyHonor>): Map<string, DynastyHonor> {
  const index = new Map<string, DynastyHonor>();
  for (const honor of honors) {
    index.set(honor.id, honor);
  }
  return index;
}

// ΓöÇΓöÇΓöÇ Service Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function getHonorsByTier(
  honors: ReadonlyArray<DynastyHonor>,
  tier: HonorTier,
): ReadonlyArray<DynastyHonor> {
  return honors.filter((h) => h.tier === tier);
}

function getHonorsByCategory(
  honors: ReadonlyArray<DynastyHonor>,
  category: HonorCategory,
): ReadonlyArray<DynastyHonor> {
  return honors.filter((h) => h.category === category);
}

function getHonorsByDynasty(
  honors: ReadonlyArray<DynastyHonor>,
  dynastyId: string,
): ReadonlyArray<DynastyHonor> {
  return honors.filter((h) => h.recipientDynastyId === dynastyId);
}

function computeTotalAssemblyWeightBonus(
  honors: ReadonlyArray<DynastyHonor>,
  dynastyId: string,
): number {
  return getHonorsByDynasty(honors, dynastyId).reduce(
    (sum, h) => sum + h.benefit.assemblyWeightBonus,
    0,
  );
}

function computeTotalKalonGranted(honors: ReadonlyArray<DynastyHonor>, dynastyId: string): bigint {
  return getHonorsByDynasty(honors, dynastyId).reduce(
    (sum, h) => sum + h.benefit.kalonGrantMicro,
    0n,
  );
}

function buildHonorSummary(honors: ReadonlyArray<DynastyHonor>): HonorSummary {
  const byTier = buildTierCounts(honors);
  const byCategory = buildCategoryCounts(honors);
  const totalKalonGrantedMicro = honors.reduce((sum, h) => sum + h.benefit.kalonGrantMicro, 0n);
  return { total: honors.length, byTier, byCategory, totalKalonGrantedMicro };
}

function buildTierCounts(honors: ReadonlyArray<DynastyHonor>): Readonly<Record<HonorTier, number>> {
  const counts: Record<HonorTier, number> = {
    RECOGNITION: 0,
    COMMENDATION: 0,
    DISTINCTION: 0,
    FOUNDING_HONOR: 0,
    ETERNAL_MARK: 0,
  };
  for (const honor of honors) {
    counts[honor.tier]++;
  }
  return counts;
}

function buildCategoryCounts(
  honors: ReadonlyArray<DynastyHonor>,
): Readonly<Record<HonorCategory, number>> {
  const counts: Record<HonorCategory, number> = {
    CHRONICLE_CONTRIBUTION: 0,
    ECONOMIC_STEWARDSHIP: 0,
    SURVEY_CORPS_SERVICE: 0,
    GOVERNANCE_REFORM: 0,
    WOUND_RECOGNITION: 0,
    LATTICE_STEWARDSHIP: 0,
    FOUNDING_SERVICE: 0,
  };
  for (const honor of honors) {
    counts[honor.category]++;
  }
  return counts;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createHonorsService(_deps: HonorsDeps): DynastyHonorsService {
  const honors = CANONICAL_HONORS;
  const index = buildHonorIndex(honors);

  return {
    getHonor: (id) => index.get(id),
    getHonorsByTier: (tier) => getHonorsByTier(honors, tier),
    getHonorsByCategory: (category) => getHonorsByCategory(honors, category),
    getHonorsByDynasty: (dynastyId) => getHonorsByDynasty(honors, dynastyId),
    getHistoricHonors: () => honors.filter((h) => h.isHistoric),
    getEternalMarks: () => honors.filter((h) => h.tier === 'ETERNAL_MARK'),
    computeTotalAssemblyWeightBonus: (dynastyId) =>
      computeTotalAssemblyWeightBonus(honors, dynastyId),
    computeTotalKalonGranted: (dynastyId) => computeTotalKalonGranted(honors, dynastyId),
    getHonorTimeline: () => [...honors].sort((a, b) => a.grantedYear - b.grantedYear),
    getHonorSummary: () => buildHonorSummary(honors),
  };
}
