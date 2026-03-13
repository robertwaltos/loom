/**
 * Content Entries — Punctuation Station
 * World: The Punctuation Station | Guide: Rosie Chen | Subject: Punctuation / Writing Mechanics
 *
 * Four published entries spanning the history of punctuation:
 *   1. Aristophanes of Byzantium — inventor of punctuation dots
 *   2. Gutenberg — how printing standardised marks
 *   3. The Semicolon — the most misunderstood mark
 *   4. The Interrobang — lost and proposed punctuation marks
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Aristophanes of Byzantium (Tier 1) ───────────────────

export const ENTRY_ARISTOPHANES_PUNCTUATION: RealWorldEntry = {
  id: 'entry-aristophanes-punctuation',
  type: 'person',
  title: "The Librarian Who Taught Us Where to Breathe",
  year: -200,
  yearDisplay: '~200 BCE',
  era: 'classical',
  descriptionChild:
    "Ancient Greek texts had no spaces between words, no commas, and no periods. Everything was one long stream of letters. A librarian named Aristophanes invented dots at different heights to show readers where to breathe and where to pause. It was the beginning of punctuation.",
  descriptionOlder:
    "Aristophanes' system used three types of dot: a high dot (·) for a full stop, a middle dot (·) for a medium pause, and a low dot (.) for a short pause. It was designed for readers reading aloud — punctuation was originally a breathing guide, not a grammar system. The system evolved over centuries into the marks we use today.",
  descriptionParent:
    "Aristophanes of Byzantium, head of the Library of Alexandria (~200 BCE), created the first known punctuation system: three dots placed at different heights to indicate pause length. This system was pragmatic — designed for oral performance, not silent reading. It reveals that the original purpose of punctuation was phonological (controlling the voice), not syntactic (clarifying structure). Modern punctuation serves both functions, but the shift from breathing guide to grammar tool happened gradually over nearly two millennia.",
  realPeople: ['Aristophanes of Byzantium'],
  quote: "ANCIENTLATINTEXTSLOOKEDLIKETHIS. Reading was a specialist skill.",
  quoteAttribution: 'Rosie Chen, Guide of the Punctuation Station',
  geographicLocation: { lat: 31.2001, lng: 29.9187, name: 'Alexandria, Egypt' },
  continent: 'Africa',
  subjectTags: ['punctuation', 'Aristophanes', 'Library of Alexandria', 'dots', 'breathing marks'],
  worldId: 'punctuation-station',
  guideId: 'rosie-chen',
  adventureType: 'reenactment',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-gutenberg-punctuation'],
  funFact:
    "ANCIENTLATINTEXTSLOOKEDLIKETHIS. No spaces. No punctuation. Reading was a specialist skill partly because the text gave you no help at all.",
  imagePrompt:
    'Grand Concourse of the Punctuation Station, unpunctuated text projected on departure boards, children inserting dots at different heights, warm station amber light',
  status: 'published',
};

// ─── Entry 2: Gutenberg and Standardisation (Tier 2) ────────────────

export const ENTRY_GUTENBERG_PUNCTUATION: RealWorldEntry = {
  id: 'entry-gutenberg-punctuation',
  type: 'event',
  title: "When Printing Forced Punctuation to Agree",
  year: 1450,
  yearDisplay: '1450s CE',
  era: 'renaissance',
  descriptionChild:
    "Before the printing press, every writer used different marks. Once Gutenberg started printing books, the marks had to be standardised — every copy had to be identical. Printing forced punctuation to become consistent for the first time in history.",
  descriptionOlder:
    "Manuscript culture tolerated variation because each copy was unique. The printing press demanded uniformity — typesetters needed fixed sets of punctuation blocks. This standardisation process took about 200 years, during which the comma, period, semicolon, colon, question mark, and exclamation point settled into roughly their modern forms.",
  descriptionParent:
    "The printing press revolutionised punctuation by requiring consistency across identical copies. Manuscript scribes had used personal systems; typesetters needed standardised blocks. The roughly 200-year standardisation period (1450–1650) produced the modern punctuation inventory. The question mark's evolution is illustrative: some early printers used a tilde, others a semicolon. The modern '?' may derive from the Latin 'quaestio' — 'qo' stacked vertically and stylised over time. This history reveals that punctuation marks are technological artefacts, not natural features of language.",
  realPeople: ['Johannes Gutenberg'],
  quote: "Early printers couldn't agree on the question mark for over a century.",
  quoteAttribution: 'Rosie Chen, Guide of the Punctuation Station',
  geographicLocation: { lat: 49.9929, lng: 8.2473, name: 'Mainz, Germany' },
  continent: 'Europe',
  subjectTags: ['printing press', 'Gutenberg', 'standardisation', 'punctuation history', 'typography'],
  worldId: 'punctuation-station',
  guideId: 'rosie-chen',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-aristophanes-punctuation'],
  unlocks: ['entry-semicolon'],
  funFact:
    "Early printers couldn't agree on the question mark for over a century. Some used a tilde. Some used a semicolon. The modern \"?\" may derive from the Latin word \"quaestio\" — \"qo\" stacked vertically and stylised over time.",
  imagePrompt:
    'Signal Tower type shop with movable punctuation blocks, children arranging marks into a printed page, steam and warm mechanical precision lighting',
  status: 'published',
};

// ─── Entry 3: The Semicolon (Tier 2) ───────────────────────────────

export const ENTRY_SEMICOLON: RealWorldEntry = {
  id: 'entry-semicolon',
  type: 'invention',
  title: "The Most Misunderstood Mark",
  year: 1494,
  yearDisplay: '1494 CE',
  era: 'renaissance',
  descriptionChild:
    "The semicolon is half comma, half period. Aldus Manutius, a famous printer in Venice, invented it because sometimes you need a pause that's longer than a comma but shorter than a full stop. It's the mark people are most afraid of using — but there's nothing to be afraid of; it just connects two complete thoughts.",
  descriptionOlder:
    "The semicolon was Manutius's attempt to fill a gap in the pause hierarchy. It separates independent clauses that are related but complete on their own. Writers like Kurt Vonnegut famously hated it (\"All they do is show you've been to college\"), while others consider it the most elegant tool in punctuation. Its controversy reveals that punctuation carries social meaning, not just grammatical function.",
  descriptionParent:
    "Aldus Manutius's semicolon (1494) filled a genuine gap in the pause hierarchy between comma and period. Its subsequent history reveals how punctuation acquires social and aesthetic meaning beyond function. Vonnegut's dismissal and literary champions' defence illustrate that punctuation choices signal identity and education. The semicolon tattoo movement — symbolising mental health and suicide prevention ('my story isn't over yet; the author chose to continue the sentence') — demonstrates how deeply punctuation metaphors can resonate in human culture.",
  realPeople: ['Aldus Manutius'],
  quote: "A semicolon tattoo has become a symbol of mental health awareness. The meaning: my story isn't over yet.",
  quoteAttribution: 'Rosie Chen, Guide of the Punctuation Station',
  geographicLocation: { lat: 45.4408, lng: 12.3155, name: 'Venice, Italy' },
  continent: 'Europe',
  subjectTags: ['semicolon', 'Aldus Manutius', 'punctuation', 'Venice', 'typography'],
  worldId: 'punctuation-station',
  guideId: 'rosie-chen',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-aristophanes-punctuation'],
  unlocks: ['entry-interrobang'],
  funFact:
    "A semicolon tattoo has become a symbol of mental health awareness and suicide prevention. The meaning: \"My story isn't over yet.\" The author chose to continue the sentence instead of ending it.",
  imagePrompt:
    'Platform 3½ of the Punctuation Station between Platforms 3 and 4, trains passing smoothly through connected semicolon gates, warm railway lighting',
  status: 'published',
};

// ─── Entry 4: The Interrobang and Lost Marks (Tier 3) ──────────────

export const ENTRY_INTERROBANG: RealWorldEntry = {
  id: 'entry-interrobang',
  type: 'invention',
  title: "The Punctuation Marks That Almost Existed",
  year: 1962,
  yearDisplay: '1962 CE',
  era: 'modern',
  descriptionChild:
    "What do you write when you're asking a question AND shouting at the same time?! An advertising man named Martin Speckter invented a mark for exactly that: the interrobang (‽). It combines a question mark and an exclamation point into one symbol. It never quite caught on — but maybe it should have.",
  descriptionOlder:
    "The interrobang is just one of many proposed marks that didn't survive. Others include the irony mark (⸮), the sarcasm point, and the love point. Their failure reveals something: punctuation changes reluctantly. New marks need widespread, sustained use to stick, and the existing system is \"good enough\" for most writers. The interrobang survives in some fonts and in dedicated communities.",
  descriptionParent:
    "The interrobang (1962) and other proposed marks illustrate why punctuation systems resist expansion. New marks require widespread adoption across publishing, education, and typography simultaneously — a coordination problem that most innovations cannot overcome. The existing inventory is 'good enough,' creating a strong status quo bias. The irony mark (⸮), sarcasm point, and various proposed rhetorical marks all failed despite clear communicative utility. The story teaches children about the difference between invention and adoption, and why systems are harder to change than individual practices.",
  realPeople: ['Martin K. Speckter'],
  quote: "The name 'interrobang' combines 'interrogation' and 'bang' — printer's slang for the exclamation point.",
  quoteAttribution: 'Rosie Chen, Guide of the Punctuation Station',
  geographicLocation: { lat: 40.7128, lng: -74.0060, name: 'New York, USA' },
  continent: 'North America',
  subjectTags: ['interrobang', 'lost punctuation', 'typography', 'language change', 'adoption'],
  worldId: 'punctuation-station',
  guideId: 'rosie-chen',
  adventureType: 'artifact_hunt',
  difficultyTier: 3,
  prerequisites: ['entry-gutenberg-punctuation', 'entry-semicolon'],
  unlocks: [],
  funFact:
    "Rosie's favourite lost mark is the percontation point (⸮) — a reversed question mark meant to signal a rhetorical question. She thinks rhetoric deserves its own signal.",
  imagePrompt:
    'Lost and Found Office at the far end of the Punctuation Station, retired and rejected marks in display cases, children examining each one under warm investigative light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const PUNCTUATION_STATION_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_ARISTOPHANES_PUNCTUATION,
  ENTRY_GUTENBERG_PUNCTUATION,
  ENTRY_SEMICOLON,
  ENTRY_INTERROBANG,
] as const;

export const PUNCTUATION_STATION_ENTRY_IDS: readonly string[] =
  PUNCTUATION_STATION_ENTRIES.map((e) => e.id);
