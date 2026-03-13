/**
 * Content Entries — Calculation Caves
 * World: The Calculation Caves | Guide: Cal | Subject: Arithmetic / Mental Math
 *
 * Four published entries spanning the history of mathematics:
 *   1. The Ishango Bone — the oldest known mathematical artifact
 *   2. Al-Khwarizmi and algebra — the birth of algebra and algorithms
 *   3. The Babylonian number system — why we have 60 seconds
 *   4. Goldbach's Conjecture — an unsolved 280-year-old puzzle
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Ishango Bone (Tier 1 — ages 5-6) ─────────────────

export const ENTRY_ISHANGO_BONE: RealWorldEntry = {
  id: 'entry-ishango-bone',
  type: 'discovery',
  title: "The Oldest Math Homework in the World",
  year: -20000,
  yearDisplay: '~20,000 BCE',
  era: 'ancient',
  descriptionChild:
    "A 20,000-year-old bone found in Africa has careful groups of notches carved into it. Someone was counting long before writing existed. This bone might be the oldest math homework ever done — and nobody knows the teacher's name.",
  descriptionOlder:
    "The Ishango Bone's notches may represent a lunar calendar, or groupings of prime numbers, or something else entirely. Multiple hypotheses exist and none is proven. Cal loves that the first known mathematical object is still debated. Math always has open questions.",
  descriptionParent:
    "The Ishango Bone (~20,000 BCE) was discovered in 1950 at a fishing settlement in the Democratic Republic of Congo. Its carved notch patterns have been interpreted as a lunar calendar, a record of prime numbers, or a tallying system. It represents the earliest known evidence of deliberate mathematical recording and demonstrates that abstract numerical thinking predates written language by millennia. The ongoing scholarly debate teaches children that science welcomes open questions.",
  realPeople: [],
  quote: "The bone that counted before writing could speak.",
  quoteAttribution: 'Cal, Guide of the Calculation Caves',
  geographicLocation: { lat: -1.2, lng: 29.6, name: 'Ishango, Democratic Republic of Congo' },
  continent: 'Africa',
  subjectTags: ['counting', 'ancient mathematics', 'archaeology', 'number patterns', 'tally marks'],
  worldId: 'calculation-caves',
  guideId: 'cal',
  adventureType: 'artifact_hunt',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-al-khwarizmi-algebra'],
  funFact:
    'The bone was discovered in 1950 at a fishing settlement. The lake that settlement stood on still exists today.',
  imagePrompt:
    'Ancient carved bone with notch patterns displayed in a glowing crystal cave chamber, bioluminescent blue light illuminating the artifact',
  status: 'published',
};

// ─── Entry 2: Al-Khwarizmi and Algebra (Tier 2 — ages 7-8) ─────────

export const ENTRY_AL_KHWARIZMI_ALGEBRA: RealWorldEntry = {
  id: 'entry-al-khwarizmi-algebra',
  type: 'person',
  title: "The Man Who Gave Us Algebra and Algorithms",
  year: 830,
  yearDisplay: '830 CE',
  era: 'medieval',
  descriptionChild:
    "A mathematician in Baghdad wrote a book about a new way of solving problems — using unknown numbers as placeholders. His method could solve puzzles that had stumped people for centuries. We still use his method today. We call it algebra.",
  descriptionOlder:
    "Al-Khwarizmi's book 'Al-Kitab al-mukhtasar fi hisab al-jabr wal-muqabala' gave us the word 'algebra' (from al-jabr). His own name, latinised as 'Algoritmi,' gave us the word 'algorithm.' Two of the most powerful concepts in modern computing come from one mathematician.",
  descriptionParent:
    "Muhammad ibn Musa al-Khwarizmi (c. 780–850 CE) worked at the House of Wisdom in Baghdad, the greatest centre of learning in the medieval world. His systematic treatment of linear and quadratic equations in 'Al-Kitab al-mukhtasar fi hisab al-jabr wal-muqabala' (The Compendious Book on Calculation by Completion and Balancing) established algebra as a discipline. The Latin transliteration of his name gave us 'algorithm.' His work demonstrates how knowledge flows across civilisations — from Babylonian and Indian mathematics through Arabic scholarship to medieval Europe.",
  realPeople: ['Muhammad ibn Musa al-Khwarizmi'],
  quote: "When I considered what people generally want in calculating, I found that it always is a number.",
  quoteAttribution: 'Al-Khwarizmi, c. 830 CE',
  geographicLocation: { lat: 33.3152, lng: 44.3661, name: 'Baghdad, Iraq' },
  continent: 'Asia',
  subjectTags: ['algebra', 'algorithms', 'Islamic Golden Age', 'mathematics history', 'equations'],
  worldId: 'calculation-caves',
  guideId: 'cal',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-ishango-bone'],
  unlocks: ['entry-babylonian-base60'],
  funFact:
    'The House of Wisdom in Baghdad where al-Khwarizmi worked held a greater collection of scientific texts than any European library of the time.',
  imagePrompt:
    'Crystal cave chamber with glowing amber equation symbols floating in the air, a golden book on a stone pedestal',
  status: 'published',
};

// ─── Entry 3: Babylonian Base-60 (Tier 2 — ages 7-8) ───────────────

export const ENTRY_BABYLONIAN_BASE60: RealWorldEntry = {
  id: 'entry-babylonian-base60',
  type: 'discovery',
  title: "Why We Have 60 Seconds in a Minute",
  year: -2000,
  yearDisplay: '~2000 BCE',
  era: 'ancient',
  descriptionChild:
    "The Babylonians counted in groups of 60, not 10 like we do. We still use their system every single day — 60 seconds in a minute, 60 minutes in an hour, 360 degrees in a circle. Ancient math is running your life right now.",
  descriptionOlder:
    "Base-60 was likely chosen because 60 has many divisors (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60), making division and fractions cleaner with whole numbers. It was a practical optimisation, not an accident.",
  descriptionParent:
    "The Babylonian sexagesimal (base-60) numeral system, developed around 2000 BCE in Mesopotamia, is one of the most enduring mathematical legacies in human history. Its persistence in timekeeping (60 seconds, 60 minutes) and geometry (360 degrees) demonstrates how deeply embedded mathematical conventions become in civilisation. The choice of base-60 was pragmatic — its high divisibility made fractional calculations simpler for trade, astronomy, and engineering. Teaching children that 'ancient math is running your life' makes abstract number theory tangible.",
  realPeople: [],
  quote: "Some things don't get replaced — just inherited.",
  quoteAttribution: 'Cal, Guide of the Calculation Caves',
  geographicLocation: { lat: 32.5, lng: 44.4, name: 'Mesopotamia (modern Iraq)' },
  continent: 'Asia',
  subjectTags: ['number systems', 'base-60', 'Babylonian mathematics', 'timekeeping', 'divisibility'],
  worldId: 'calculation-caves',
  guideId: 'cal',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-ishango-bone'],
  unlocks: ['entry-goldbach-conjecture'],
  funFact:
    "When you check a clock at 3:45:30, you are using a number system invented in Mesopotamia 4,000 years ago.",
  imagePrompt:
    'Glowing cuneiform numerals carved into crystal cave walls, an ancient abacus with 60 beads per rail illuminated by amber light',
  status: 'published',
};

// ─── Entry 4: Goldbach's Conjecture (Tier 3 — ages 9-10) ───────────

export const ENTRY_GOLDBACH_CONJECTURE: RealWorldEntry = {
  id: 'entry-goldbach-conjecture',
  type: 'scientific_principle',
  title: "An Unsolved 280-Year-Old Puzzle",
  year: 1742,
  yearDisplay: '1742 CE',
  era: 'enlightenment',
  descriptionChild:
    "In 1742, a mathematician said he thought every even number bigger than 2 could be written as two prime numbers added together. For example: 10 = 3 + 7. It works for every number anyone has ever tried. But nobody has ever proved it always works, for every number, forever.",
  descriptionOlder:
    "Goldbach's Conjecture has been verified up to 4 × 10¹⁸ — four quintillion. For every single one of those numbers, it holds. But 'it works for every number we've tried' is not the same as proof. The Caves have a chamber dedicated to problems mathematics hasn't solved yet.",
  descriptionParent:
    "Goldbach's Conjecture (1742) is one of the oldest unsolved problems in number theory and mathematics. It states that every even integer greater than 2 can be expressed as the sum of two primes. Despite computational verification to 4 × 10¹⁸, no general proof exists. The conjecture teaches children a profound lesson: in mathematics, empirical evidence is not proof. 'It works for every case we've tried' and 'it always works' are fundamentally different statements — a distinction that underpins all of science.",
  realPeople: ['Christian Goldbach'],
  quote: "Trying and failing beautifully is part of the mathematical tradition.",
  quoteAttribution: 'Cal, Guide of the Calculation Caves',
  geographicLocation: { lat: 52.5200, lng: 13.4050, name: 'Germany / Russia' },
  continent: 'Europe',
  subjectTags: ['prime numbers', 'number theory', 'unsolved problems', 'mathematical proof', 'conjecture'],
  worldId: 'calculation-caves',
  guideId: 'cal',
  adventureType: 'guided_expedition',
  difficultyTier: 3,
  prerequisites: ['entry-al-khwarizmi-algebra', 'entry-babylonian-base60'],
  unlocks: [],
  funFact:
    "A publisher once offered a $1 million prize for solving Goldbach's Conjecture. The prize window expired in 2002, unclaimed.",
  imagePrompt:
    'A vast crystal chamber with prime numbers glowing on every surface, an infinite corridor stretching into darkness with even numbers splitting into pairs',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const CALCULATION_CAVES_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_ISHANGO_BONE,
  ENTRY_AL_KHWARIZMI_ALGEBRA,
  ENTRY_BABYLONIAN_BASE60,
  ENTRY_GOLDBACH_CONJECTURE,
] as const;

export const CALCULATION_CAVES_ENTRY_IDS: readonly string[] =
  CALCULATION_CAVES_ENTRIES.map((e) => e.id);
