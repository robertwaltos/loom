/**
 * Content Entries — Grammar Bridge
 * World: The Grammar Bridge | Guide: Lila Johansson-Park | Subject: Grammar / Sentence Structure
 *
 * Four published entries spanning the history of grammar and linguistic structure:
 *   1. Pāṇini — the first grammar, 4,000 rules for Sanskrit
 *   2. Noam Chomsky — Universal Grammar and the brain's built-in language machine
 *   3. The Great Vowel Shift — why English spelling is so strange
 *   4. Sign Language Grammar — structure without sound
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Pāṇini — The First Grammar (Tier 1) ─────────────────

export const ENTRY_PANINI_FIRST_GRAMMAR: RealWorldEntry = {
  id: 'entry-panini-first-grammar',
  type: 'person',
  title: "The Man Who Wrote Down Every Rule of a Language",
  year: -350,
  yearDisplay: '~4th century BCE',
  era: 'classical',
  descriptionChild:
    "Over 2,400 years ago, a scholar named Pāṇini wrote down every rule of the Sanskrit language — about 4,000 rules in total. It was the first complete grammar of any language. He described how words change, combine, and create meaning with a precision that still impresses scientists today.",
  descriptionOlder:
    "Pāṇini's Ashtadhyayi is the earliest known work of descriptive linguistics. His system of rules was so formally precise that it anticipated concepts in modern computer science — variables, recursion, and context-sensitive substitution. Noam Chomsky acknowledged Pāṇini as a foundational figure in linguistics, 2,300 years before the field existed.",
  descriptionParent:
    "Pāṇini's Ashtadhyayi (~4th century BCE) is the earliest extant grammar of any language and one of the most remarkable intellectual achievements of the ancient world. His 3,959 rules describe Sanskrit morphology and syntax with a precision that anticipated formal language theory by over two millennia. The notation system he created — using variables, meta-rules, and context-sensitive production rules — has been compared to Backus-Naur form in computer science. Noam Chomsky cited Pāṇini as a predecessor. The work demonstrates that rigorous analysis of language structure is a universal human impulse.",
  realPeople: ['Pāṇini'],
  quote: "He compressed 4,000 grammar rules into a text shorter than many modern instruction manuals.",
  quoteAttribution: 'Lila Johansson-Park, Guide of the Grammar Bridge',
  geographicLocation: { lat: 34.17, lng: 71.83, name: 'Gandhāra (modern Pakistan/Afghanistan)' },
  continent: 'Asia',
  subjectTags: ['grammar', 'Sanskrit', 'linguistics', 'Pāṇini', 'Ashtadhyayi'],
  worldId: 'grammar-bridge',
  guideId: 'lila-johansson-park',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-chomsky-universal-grammar'],
  funFact:
    "Pāṇini compressed 4,000 grammar rules into a text shorter than many modern instruction manuals. He may have been the greatest information compressor in human history.",
  imagePrompt:
    'Ancient Sanskrit manuscript glowing on the Bridge\'s central span, 4,000 interlocking rules illustrated as structural cables supporting the bridge, warm architect\'s light',
  status: 'published',
};

// ─── Entry 2: Noam Chomsky — Universal Grammar (Tier 2) ────────────

export const ENTRY_CHOMSKY_UNIVERSAL_GRAMMAR: RealWorldEntry = {
  id: 'entry-chomsky-universal-grammar',
  type: 'person',
  title: "The Grammar Machine Inside Every Brain",
  year: 1957,
  yearDisplay: '1957 CE',
  era: 'modern',
  descriptionChild:
    "A professor named Chomsky suggested that all human languages — no matter how different they sound — follow the same deep rules. Every baby is born with a built-in grammar machine in their brain. That's why children learn language so fast, long before anyone teaches them rules.",
  descriptionOlder:
    "Chomsky's theory of Universal Grammar proposed that the ability to learn language is hard-wired into the human brain. He proved that language isn't just learned by imitation — children produce sentences they've never heard, following rules no one explicitly taught them. His 1957 book Syntactic Structures revolutionised linguistics and influenced computer science, philosophy, and psychology.",
  descriptionParent:
    "Noam Chomsky's 1957 Syntactic Structures proposed that all human languages share a common underlying structure — a Universal Grammar — that is innate to the human brain. This 'nativist' position challenged behaviourist theories of language acquisition and launched the cognitive revolution. Chomsky demonstrated that children produce novel grammatical sentences far beyond their input, suggesting an innate language faculty. His work influenced artificial intelligence, philosophy of mind, and cognitive science. The theory remains debated but foundational.",
  realPeople: ['Noam Chomsky'],
  quote: "Colourless green ideas sleep furiously.",
  quoteAttribution: 'Noam Chomsky, demonstrating that grammar and meaning are independent systems',
  geographicLocation: { lat: 42.3601, lng: -71.0942, name: 'Cambridge, Massachusetts, USA' },
  continent: 'North America',
  subjectTags: ['Universal Grammar', 'Chomsky', 'linguistics', 'cognitive science', 'language acquisition'],
  worldId: 'grammar-bridge',
  guideId: 'lila-johansson-park',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-panini-first-grammar'],
  unlocks: ['entry-great-vowel-shift'],
  funFact:
    "Chomsky demonstrated his point with a famous sentence: \"Colourless green ideas sleep furiously.\" It's grammatically perfect but meaningless — proving that grammar and meaning are independent systems.",
  imagePrompt:
    'Children decoding invented language grammars on the Bridge\'s analysis panels, neural pathway patterns visible beneath the deck, clean modernist lighting',
  status: 'published',
};

// ─── Entry 3: The Great Vowel Shift (Tier 2) ───────────────────────

export const ENTRY_GREAT_VOWEL_SHIFT: RealWorldEntry = {
  id: 'entry-great-vowel-shift',
  type: 'event',
  title: "When English Changed Its Voice",
  year: 1400,
  yearDisplay: '~1400–1700 CE',
  era: 'renaissance',
  descriptionChild:
    "Hundreds of years ago, English vowels started changing. Words that used to sound one way slowly began to sound different. That's why English spelling is so strange today — the letters remember the old sounds, but our mouths make new ones.",
  descriptionOlder:
    "Between roughly 1400 and 1700, long vowels in English systematically shifted upward in the mouth. \"Name\" once rhymed with \"comma.\" \"Meat\" once rhymed with \"mate.\" The printing press froze spelling during the shift, creating the gap between written and spoken English that makes spelling so difficult today.",
  descriptionParent:
    "The Great Vowel Shift was a systematic phonological change in English between approximately 1400 and 1700 in which all long vowels raised their place of articulation. The coincidence of this shift with the introduction of the printing press (which standardised spelling before pronunciation had finished changing) is the primary reason English spelling is non-phonetic. The story teaches children that language is a living system — and that the 'rules' of spelling are historical accidents, not logical necessities.",
  realPeople: [],
  quote: "If you read Chaucer with original pronunciation, you suddenly recognise everything.",
  quoteAttribution: 'Lila Johansson-Park, Guide of the Grammar Bridge',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'England' },
  continent: 'Europe',
  subjectTags: ['vowel shift', 'English history', 'phonology', 'spelling', 'printing press'],
  worldId: 'grammar-bridge',
  guideId: 'lila-johansson-park',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-panini-first-grammar'],
  unlocks: ['entry-sign-language-grammar'],
  funFact:
    "If you read Chaucer aloud using modern pronunciation, it sounds like a foreign language. Read it with original pronunciation and you suddenly recognise everything. The words didn't change — only the sounds.",
  imagePrompt:
    'Bridge girders physically shifting position as vowel sounds change, Middle English text morphing into Modern English, warm amber historical light',
  status: 'published',
};

// ─── Entry 4: Sign Language Grammar (Tier 3) ───────────────────────

export const ENTRY_SIGN_LANGUAGE_GRAMMAR: RealWorldEntry = {
  id: 'entry-sign-language-grammar',
  type: 'cultural_milestone',
  title: "Grammar That Lives in the Body",
  year: 1620,
  yearDisplay: '1620–present',
  era: 'modern',
  descriptionChild:
    "Sign languages have grammar just like spoken languages — but they use space, movement, and facial expressions instead of sounds. A raised eyebrow can turn a statement into a question. Grammar lives in the body, not just on paper.",
  descriptionOlder:
    "ASL and other sign languages are not \"translated English.\" They have independent grammar systems with rules that differ fundamentally from any spoken language. ASL places the topic first, uses spatial relationships for verb agreement, and deploys facial grammar markers the way spoken languages use tone. Linguists confirmed sign languages as full, complex languages in the 1960s — a fact Deaf communities had known for centuries.",
  descriptionParent:
    "Sign languages are complete, independent languages with their own grammar, syntax, and morphology — not visual codes for spoken languages. ASL grammar uses three-dimensional space for verb agreement, classifiers, and discourse structure in ways that have no parallel in spoken language. Linguistic recognition of sign languages as full languages came through William Stokoe's work at Gallaudet University in the 1960s, though Deaf communities had always known this. Nicaraguan Sign Language, spontaneously created by deaf children in the 1980s, provides compelling evidence for innate language acquisition — children invented a fully grammatical language from scratch.",
  realPeople: ['Pedro Ponce de León', 'Laurent Clerc', 'Thomas Gallaudet'],
  quote: "Grammar lives in the body, not just on paper.",
  quoteAttribution: 'Lila Johansson-Park, Guide of the Grammar Bridge',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['sign language', 'ASL', 'grammar', 'Deaf culture', 'Nicaraguan Sign Language'],
  worldId: 'grammar-bridge',
  guideId: 'lila-johansson-park',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-chomsky-universal-grammar', 'entry-great-vowel-shift'],
  unlocks: [],
  funFact:
    "Nicaraguan Sign Language was spontaneously created by deaf children in the 1980s when Nicaragua opened its first deaf schools. No adult taught them — they invented a fully grammatical language from scratch. It's one of the strongest proofs that grammar is built into the human brain.",
  imagePrompt:
    'Silent section of the Bridge where no sound carries, children communicating in sign language, spatial grammar visible as glowing trajectories in the air',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const GRAMMAR_BRIDGE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_PANINI_FIRST_GRAMMAR,
  ENTRY_CHOMSKY_UNIVERSAL_GRAMMAR,
  ENTRY_GREAT_VOWEL_SHIFT,
  ENTRY_SIGN_LANGUAGE_GRAMMAR,
] as const;

export const GRAMMAR_BRIDGE_ENTRY_IDS: readonly string[] =
  GRAMMAR_BRIDGE_ENTRIES.map((e) => e.id);
