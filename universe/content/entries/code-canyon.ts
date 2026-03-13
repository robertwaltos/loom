/**
 * Content Entries — Code Canyon
 * World: Code Canyon | Guide: Pixel | Subject: Coding / Logic
 *
 * Four published entries spanning the history of computing:
 *   1. Margaret Hamilton's Apollo software — the code that saved the Moon landing
 *   2. The first video game (Spacewar!) — a student project that founded an industry
 *   3. The ENIAC programmers — six women who invented programming
 *   4. The Y2K Bug — when the world raced to fix a two-digit year
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Margaret Hamilton's Apollo Software (Tier 1 — ages 5-6)

export const ENTRY_HAMILTON_APOLLO_SOFTWARE: RealWorldEntry = {
  id: 'entry-hamilton-apollo-software',
  type: 'invention',
  title: "The Code That Saved the Moon Landing",
  year: 1969,
  yearDisplay: '1969 CE',
  era: 'modern',
  descriptionChild:
    "Margaret Hamilton wrote the software that landed humans on the Moon. During the landing, her code caught an error that could have crashed everything. The code she wrote saved the mission.",
  descriptionOlder:
    "She coined the term 'software engineering.' Her code had built-in error handling that nobody thought was necessary — until it saved Apollo 11 from aborting the landing.",
  descriptionParent:
    "Margaret Hamilton led the team at MIT's Instrumentation Laboratory that developed the Apollo Guidance Computer software. During Apollo 11's descent, the computer triggered 1202 and 1203 alarms — executive overflow caused by a hardware switch left in the wrong position. Hamilton's asynchronous priority scheduling system automatically shed lower-priority tasks, allowing the landing to continue. Her insistence on robust error handling — derided as overkill by engineers at the time — saved the mission. She coined 'software engineering' to gain respect for the discipline.",
  realPeople: ['Margaret Hamilton'],
  quote: "There was no second chance. We all knew it.",
  quoteAttribution: 'Margaret Hamilton',
  geographicLocation: { lat: 42.3601, lng: -71.0942, name: 'MIT, Cambridge, Massachusetts, USA' },
  continent: 'North America',
  subjectTags: ['software engineering', 'Apollo 11', 'error handling', 'Moon landing', 'women in STEM'],
  worldId: 'code-canyon',
  guideId: 'pixel',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-spacewar-first-game'],
  funFact:
    "There's a famous photo of Hamilton standing next to a stack of printed code as tall as she is. That's the Apollo guidance software.",
  imagePrompt:
    'Digital canyon wall with code cascading like a waterfall, a Moon lander descending through neon-lit rock formations',
  status: 'published',
};

// ─── Entry 2: Spacewar! — The First Video Game (Tier 2 — ages 7-8) ──

export const ENTRY_SPACEWAR_FIRST_GAME: RealWorldEntry = {
  id: 'entry-spacewar-first-game',
  type: 'invention',
  title: "The Student Project That Built an Industry",
  year: 1962,
  yearDisplay: '1962 CE',
  era: 'modern',
  descriptionChild:
    "The first real video game was made by students at MIT in 1962. Two spaceships fought near a star with real gravity. It was played on a computer the size of a large refrigerator.",
  descriptionOlder:
    "Spacewar! was never sold — it was shared freely among universities. The entire video game industry grew from a student project that was given away for free.",
  descriptionParent:
    "Spacewar! (1962), created by Steve Russell and colleagues at MIT, was the first widely distributed interactive computer game. It featured Newtonian gravity simulation, two-player combat, and authentic star-field backgrounds. The game was freely shared among research institutions — making it arguably the first open-source software project. The entire commercial video game industry, now larger than film and music combined, traces its lineage to this freely distributed student project. The story teaches children about open sharing and unintended consequences.",
  realPeople: ['Steve Russell'],
  quote: "We just wanted to make something fun on the new computer.",
  quoteAttribution: 'Steve Russell (paraphrased)',
  geographicLocation: { lat: 42.3601, lng: -71.0942, name: 'MIT, Cambridge, Massachusetts, USA' },
  continent: 'North America',
  subjectTags: ['video games', 'open source', 'programming history', 'Newtonian physics', 'MIT'],
  worldId: 'code-canyon',
  guideId: 'pixel',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-hamilton-apollo-software'],
  unlocks: ['entry-eniac-programmers'],
  funFact:
    'The game used real star charts and actual Newtonian gravity calculations.',
  imagePrompt:
    'Retro spaceship sprites battling near a digital star in a canyon made of stacked code blocks, pixel art meets natural rock',
  status: 'published',
};

// ─── Entry 3: The ENIAC Programmers (Tier 2 — ages 7-8) ────────────

export const ENTRY_ENIAC_PROGRAMMERS: RealWorldEntry = {
  id: 'entry-eniac-programmers',
  type: 'event',
  title: "Six Women Who Invented Programming",
  year: 1945,
  yearDisplay: '1945 CE',
  era: 'modern',
  descriptionChild:
    "The first general-purpose computer was programmed entirely by six women. They figured out how to make it work without any instruction manuals, because none existed yet.",
  descriptionOlder:
    "The ENIAC programmers were mathematicians recruited during WWII. They invented programming techniques (subroutines, breakpoints) still used today. Their contributions were largely forgotten until the 1980s.",
  descriptionParent:
    "The six ENIAC programmers — Kay McNulty, Betty Jennings, Betty Snyder, Marlyn Meltzer, Fran Bilas, and Ruth Lichterman — were among the first professional programmers in history. They developed fundamental techniques including subroutines, nesting, and breakpoints without documentation or precedent. Despite their foundational contributions, they were uncredited for decades — often mistaken for 'models' in photographs with the machine. Their story was rediscovered by historian Kathy Kleiman in the 1980s. The lesson: credit matters, and history is not always written by those who did the work.",
  realPeople: ['Kay McNulty', 'Betty Jennings', 'Betty Snyder', 'Marlyn Meltzer', 'Fran Bilas', 'Ruth Lichterman'],
  quote: "We had to figure it out ourselves. There was no manual.",
  quoteAttribution: 'Betty Holberton (née Snyder)',
  geographicLocation: { lat: 39.9526, lng: -75.1652, name: 'Philadelphia, USA' },
  continent: 'North America',
  subjectTags: ['ENIAC', 'women programmers', 'subroutines', 'computer history', 'WWII'],
  worldId: 'code-canyon',
  guideId: 'pixel',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-hamilton-apollo-software'],
  unlocks: ['entry-y2k-bug'],
  funFact:
    'Programming ENIAC involved physically rewiring cables. There was no keyboard or screen.',
  imagePrompt:
    'Six women standing before a wall of cables and vacuum tubes in a canyon carved from circuit boards, warm golden light',
  status: 'published',
};

// ─── Entry 4: The Y2K Bug (Tier 3 — ages 9-10) ─────────────────────

export const ENTRY_Y2K_BUG: RealWorldEntry = {
  id: 'entry-y2k-bug',
  type: 'event',
  title: "When the World Raced to Fix a Two-Digit Year",
  year: 1999,
  yearDisplay: '1999 CE',
  era: 'modern',
  descriptionChild:
    "Old computers stored years with only two digits. When the year 2000 arrived, computers might think it was 1900. Programmers around the world worked together to fix it before midnight.",
  descriptionOlder:
    "The Y2K bug was the first global technology crisis. It cost over $300 billion to fix. Some people think it was overblown, but programmers argue that it was fixed precisely because people took it seriously.",
  descriptionParent:
    "The Year 2000 problem (Y2K) arose because early computers stored years as two digits to save memory. As 1999 approached 2000, systems risked interpreting '00' as 1900, potentially crashing financial, utility, and military systems worldwide. The remediation effort cost over $300 billion globally and involved checking an estimated 3 billion lines of code. The fact that the transition was largely uneventful is cited as evidence that the preparation worked — not that the threat was exaggerated. Y2K teaches children about technical debt and the importance of planning for edge cases.",
  realPeople: [],
  quote: "It was fixed because people took it seriously.",
  quoteAttribution: 'Pixel, Guide of Code Canyon',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['Y2K', 'debugging', 'technical debt', 'global cooperation', 'date formatting'],
  worldId: 'code-canyon',
  guideId: 'pixel',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-spacewar-first-game', 'entry-eniac-programmers'],
  unlocks: [],
  funFact:
    'An estimated 3 billion lines of code were checked and corrected worldwide for Y2K.',
  imagePrompt:
    'Countdown clock at 23:59:59 in a canyon of cascading code, programmers racing to fix glowing red date fields before midnight',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const CODE_CANYON_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_HAMILTON_APOLLO_SOFTWARE,
  ENTRY_SPACEWAR_FIRST_GAME,
  ENTRY_ENIAC_PROGRAMMERS,
  ENTRY_Y2K_BUG,
] as const;

export const CODE_CANYON_ENTRY_IDS: readonly string[] =
  CODE_CANYON_ENTRIES.map((e) => e.id);
