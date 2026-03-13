/**
 * Curriculum Mappings — Koydo Worlds Content to Educational Standards
 *
 * Maps every published RealWorldEntry to its relevant educational standards:
 * - Common Core State Standards (CCSS) for Math and ELA
 * - Next Generation Science Standards (NGSS)
 * - State Financial Literacy Standards (Jump$tart Coalition / NGPF)
 * - AASL Standards Framework for Learners (library/information literacy)
 *
 * Standard format: <authority>.<subject>.<grade>.<strand>.<standard>
 */
import type { EntryCurriculumMap } from '../types.js';

// ─── Number Garden — Mathematics ─────────────────────────────────

const NUMBER_GARDEN_MAPS: readonly EntryCurriculumMap[] = [
  // entry-fibonacci-rabbit-problem
  {
    id: 'map-fibonacci-ccss-patterns',
    entryId: 'entry-fibonacci-rabbit-problem',
    standard: 'common_core',
    standardCode: 'CCSS.MATH.CONTENT.4.OA.C.5',
    description: 'Generate a number or shape pattern that follows a given rule. Identify apparent features of the pattern that were not explicit in the rule itself.',
  },
  {
    id: 'map-fibonacci-ccss-analyze',
    entryId: 'entry-fibonacci-rabbit-problem',
    standard: 'common_core',
    standardCode: 'CCSS.MATH.CONTENT.5.OA.B.3',
    description: 'Analyze relationships by generating two corresponding numerical sequences following two different rules. Identify the apparent relationship between the terms.',
  },
  {
    id: 'map-fibonacci-ccss-ri',
    entryId: 'entry-fibonacci-rabbit-problem',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.4.3',
    description: 'Explain events, procedures, ideas, or concepts in a historical or scientific text — including what happened and why, based on specific information in the text.',
  },

  // entry-zero-invention
  {
    id: 'map-zero-ccss-cc',
    entryId: 'entry-zero-invention',
    standard: 'common_core',
    standardCode: 'CCSS.MATH.CONTENT.K.CC.A.1',
    description: 'Count to 100 by ones and by tens. Understanding zero as the starting point of counting and as a quantity.',
  },
  {
    id: 'map-zero-ccss-nbt',
    entryId: 'entry-zero-invention',
    standard: 'common_core',
    standardCode: 'CCSS.MATH.CONTENT.2.NBT.A.1',
    description: 'Understand that the three digits of a three-digit number represent amounts of hundreds, tens, and ones — foundational to place value, which zero makes possible.',
  },
  {
    id: 'map-zero-ccss-ri',
    entryId: 'entry-zero-invention',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.3.3',
    description: 'Describe the relationship between a series of historical events or concepts using language that pertains to time, sequence, and cause/effect.',
  },

  // entry-hypatia-alexandria
  {
    id: 'map-hypatia-ccss-ri4',
    entryId: 'entry-hypatia-alexandria',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.4.3',
    description: 'Explain events and ideas in a historical text, including what happened and why. Hypatia\'s life connects mathematical achievement to historical circumstance.',
  },
  {
    id: 'map-hypatia-ccss-ri4-9',
    entryId: 'entry-hypatia-alexandria',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.4.9',
    description: 'Integrate information from two texts on the same topic in order to write or speak about the subject knowledgeably. (Hypatia + Alexandria cross-world connection.)',
  },

  // entry-ada-lovelace-program
  {
    id: 'map-ada-ccss-ri5',
    entryId: 'entry-ada-lovelace-program',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.5.3',
    description: 'Explain the relationships or interactions between two or more individuals, events, ideas, or concepts in a text (Lovelace + Babbage collaboration, mechanical → digital computing).',
  },
  {
    id: 'map-ada-cs-framework',
    entryId: 'entry-ada-lovelace-program',
    standard: 'ngss',
    standardCode: 'K12CS.AP.A.1',
    description: 'K-12 Computer Science Framework — Algorithms and Programming: Describe an algorithm (sequence of steps to solve a problem), connecting to Lovelace\'s first published algorithm.',
  },
];

// ─── Story Tree — Narrative & ELA ─────────────────────────────────

const STORY_TREE_MAPS: readonly EntryCurriculumMap[] = [
  // entry-gilgamesh
  {
    id: 'map-gilgamesh-ccss-rl4-9',
    entryId: 'entry-gilgamesh',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RL.4.9',
    description: 'Compare and contrast the themes and patterns of events in myths and traditional literature from different cultures (Gilgamesh as the foundational mythic text).',
  },
  {
    id: 'map-gilgamesh-ccss-rl3-2',
    entryId: 'entry-gilgamesh',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RL.3.2',
    description: 'Recount stories, including myths from diverse cultures; determine the central message, lesson, or moral, and explain how it is conveyed through key details.',
  },

  // entry-scheherazade
  {
    id: 'map-scheherazade-ccss-rl4-3',
    entryId: 'entry-scheherazade',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RL.4.3',
    description: 'Describe in depth a character, setting, or event in a story or drama, drawing on specific details. Scheherazade\'s character motivation is a rich study in narrative agency.',
  },
  {
    id: 'map-scheherazade-ccss-rl3-5',
    entryId: 'entry-scheherazade',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RL.3.5',
    description: 'Refer to parts of stories, dramas, and poems when writing or speaking; use terms such as chapter, scene, stanza; describe how each successive part builds on earlier sections. (Frame narrative structure.)',
  },

  // entry-gutenberg-press
  {
    id: 'map-gutenberg-ccss-ri4-3',
    entryId: 'entry-gutenberg-press',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.4.3',
    description: 'Explain events, procedures, ideas, or concepts in a historical or scientific text, including what happened and why, based on specific information in the text.',
  },
  {
    id: 'map-gutenberg-ccss-ri5-3',
    entryId: 'entry-gutenberg-press',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.5.3',
    description: 'Explain the relationships or interactions between two or more individuals, events, ideas, or concepts: how Gutenberg\'s press caused the Reformation, Renaissance, and Scientific Revolution.',
  },

  // entry-rosetta-stone
  {
    id: 'map-rosetta-ccss-ri4-7',
    entryId: 'entry-rosetta-stone',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.4.7',
    description: 'Interpret information presented visually, orally, or quantitatively. Decoding the Rosetta Stone used multiple text forms (three scripts) and types of evidence simultaneously.',
  },
  {
    id: 'map-rosetta-ccss-l4-4',
    entryId: 'entry-rosetta-stone',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.L.4.4',
    description: 'Determine or clarify the meaning of unknown and multiple-meaning words and phrases. Connects to understanding how language decoding and word-meaning works across scripts.',
  },
];

// ─── Market Square — Financial Literacy ───────────────────────────

const MARKET_SQUARE_MAPS: readonly EntryCurriculumMap[] = [
  // entry-lydian-coin
  {
    id: 'map-lydian-jstk-k2-money',
    entryId: 'entry-lydian-coin',
    standard: 'state_financial_literacy',
    standardCode: 'JUMPSTART.K-2.MONEY.1',
    description: 'Jump$tart Coalition K-2: Describe the purpose of money and how it is used in every day life. Lydian coin origin story makes this concrete and historical.',
  },
  {
    id: 'map-lydian-ccss-math-money',
    entryId: 'entry-lydian-coin',
    standard: 'common_core',
    standardCode: 'CCSS.MATH.CONTENT.2.MD.C.8',
    description: 'Solve word problems involving dollar bills, quarters, dimes, nickels, and pennies, using $ and ¢ symbols. Entry provides historical context for why standardized coin values matter.',
  },

  // entry-silk-road
  {
    id: 'map-silkroad-jstk-35-trade',
    entryId: 'entry-silk-road',
    standard: 'state_financial_literacy',
    standardCode: 'JUMPSTART.3-5.SPENDING.1',
    description: 'Jump$tart Coalition 3-5: Explain how people exchange goods and services. The Silk Road is the foundational example of voluntary, mutually beneficial long-distance trade.',
  },
  {
    id: 'map-silkroad-ccss-ri5-3',
    entryId: 'entry-silk-road',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.5.3',
    description: 'Explain the relationships or interactions between two or more events: how the Silk Road created cultural exchange, spread religion and technology, and caused economic interdependence.',
  },

  // entry-first-paper-money
  {
    id: 'map-papermoney-jstk-35-money',
    entryId: 'entry-first-paper-money',
    standard: 'state_financial_literacy',
    standardCode: 'JUMPSTART.3-5.MONEY.1',
    description: 'Jump$tart Coalition 3-5: Explain why money exists and how it functions (medium of exchange, store of value, unit of account). Paper money adds the dimension of institutional trust.',
  },
  {
    id: 'map-papermoney-ngpf',
    entryId: 'entry-first-paper-money',
    standard: 'state_financial_literacy',
    standardCode: 'NGPF.FL.1.A',
    description: 'NGPF Financial Literacy Standard 1A: Understand the function of currency and the role of banks and institutional trust in making money valuable.',
  },

  // entry-double-entry-bookkeeping
  {
    id: 'map-bookkeeping-jstk-35-saving',
    entryId: 'entry-double-entry-bookkeeping',
    standard: 'state_financial_literacy',
    standardCode: 'JUMPSTART.3-5.SAVING.1',
    description: 'Jump$tart Coalition 3-5: Develop a plan for saving and tracking money. Double-entry bookkeeping is the historical foundation of personal and business financial tracking.',
  },
  {
    id: 'map-bookkeeping-ccss-math-oa',
    entryId: 'entry-double-entry-bookkeeping',
    standard: 'common_core',
    standardCode: 'CCSS.MATH.CONTENT.4.OA.A.3',
    description: 'Solve multi-step word problems using the four operations. Bookkeeping uses exactly this skill: adding and subtracting across multiple transactions to find a balance.',
  },
];

// ─── Great Archive — Information Literacy ─────────────────────────

const GREAT_ARCHIVE_MAPS: readonly EntryCurriculumMap[] = [
  // entry-great-library-alexandria
  {
    id: 'map-alexandria-ccss-ri4-3',
    entryId: 'entry-great-library-alexandria',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.4.3',
    description: 'Explain events and ideas in a historical text, including what happened and why. Alexandria\'s gradual decline (not a single fire) is a rich cause-and-effect study.',
  },
  {
    id: 'map-alexandria-aasl-inquire',
    entryId: 'entry-great-library-alexandria',
    standard: 'ngss',
    standardCode: 'AASL.INQUIRE.1.1',
    description: 'AASL Standards for Learners — Inquire 1.1: Formulate questions for investigation. Alexandria demonstrates the human drive to systematically gather and investigate all knowledge.',
  },

  // entry-first-encyclopedia
  {
    id: 'map-encyclopedia-ccss-ri5-3',
    entryId: 'entry-first-encyclopedia',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.5.3',
    description: 'Explain the relationships or interactions between two or more individuals, events, ideas, or concepts: the Yongle Emperor\'s vision, 2,169 scholars\' execution, and the tragic loss — all connected.',
  },
  {
    id: 'map-encyclopedia-aasl-curate',
    entryId: 'entry-first-encyclopedia',
    standard: 'ngss',
    standardCode: 'AASL.CURATE.2.1',
    description: 'AASL Standards for Learners — Curate 2.1: Organize information to represent understanding. The Yongle Dadian represents the largest pre-modern curation project in history.',
  },

  // entry-internet-birth
  {
    id: 'map-internet-cs-framework',
    entryId: 'entry-internet-birth',
    standard: 'ngss',
    standardCode: 'K12CS.NI.N.1',
    description: 'K-12 CS Framework — Networks and the Internet: Explain how the internet transmits information. ARPANET is the direct origin of that transmission infrastructure.',
  },
  {
    id: 'map-internet-ccss-ri5-3',
    entryId: 'entry-internet-birth',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.5.3',
    description: 'Explain the relationships between historical events: how ARPANET\'s distributed design responded to Cold War threats and accidentally created the architecture of the modern internet.',
  },

  // entry-wikipedia
  {
    id: 'map-wikipedia-ccss-ri5-8',
    entryId: 'entry-wikipedia',
    standard: 'common_core',
    standardCode: 'CCSS.ELA-LITERACY.RI.5.8',
    description: 'Explain how an author uses reasons and evidence to support particular points. Wikipedia as a source — understanding why checking citations and edit history matters.',
  },
  {
    id: 'map-wikipedia-aasl-engage',
    entryId: 'entry-wikipedia',
    standard: 'ngss',
    standardCode: 'AASL.ENGAGE.6.1',
    description: 'AASL Standards for Learners — Engage 6.1: Use ethical and responsible practices in the creation of information. Wikipedia\'s collaborative authorship model demonstrates digital citizenship and information ethics.',
  },
];

// ─── Master Export ─────────────────────────────────────────────────

export const ALL_CURRICULUM_MAPS: readonly EntryCurriculumMap[] = [
  ...NUMBER_GARDEN_MAPS,
  ...STORY_TREE_MAPS,
  ...MARKET_SQUARE_MAPS,
  ...GREAT_ARCHIVE_MAPS,
];

/**
 * Get all curriculum mappings for a specific entry.
 */
export function getMapsForEntry(entryId: string): readonly EntryCurriculumMap[] {
  return ALL_CURRICULUM_MAPS.filter((m) => m.entryId === entryId);
}

/**
 * Get all entries mapped to a specific standard code.
 */
export function getEntriesForStandardCode(standardCode: string): readonly EntryCurriculumMap[] {
  return ALL_CURRICULUM_MAPS.filter((m) => m.standardCode === standardCode);
}
