/**
 * Content Entries — Vocabulary Jungle
 * World: The Vocabulary Jungle | Guide: Kwame Asante | Subject: Vocabulary / Word Roots
 *
 * Four published entries spanning the history of words and dictionaries:
 *   1. The Oxford English Dictionary — every word that ever was
 *   2. Shakespeare's invented words — coining the English language
 *   3. Loanwords — how languages borrow
 *   4. How new words enter the dictionary — survival of the fittest
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: The Oxford English Dictionary (Tier 1) ────────────────

export const ENTRY_OXFORD_ENGLISH_DICTIONARY: RealWorldEntry = {
  id: 'entry-oxford-english-dictionary',
  type: 'invention',
  title: "Every Word That Ever Was",
  year: 1884,
  yearDisplay: '1884–1928 CE',
  era: 'industrial',
  descriptionChild:
    "The Oxford English Dictionary tried to collect every word in the English language — and the story of where each one came from. It took over 70 years to finish and filled 12 enormous volumes. One of the most prolific contributors turned out to be a patient in a hospital for the criminally insane.",
  descriptionOlder:
    "James Murray, the chief editor, was largely self-taught. He issued a public call for volunteers to read every English book ever written and mail in quotations illustrating word usage. W. C. Minor, who submitted over 10,000 quotations, was a former army surgeon confined to Broadmoor asylum after committing murder. The OED now contains over 600,000 entries.",
  descriptionParent:
    "The Oxford English Dictionary is the most comprehensive historical dictionary of the English language, documenting every word's etymology, evolution, and usage through literary quotation. James Murray, largely self-educated, led the project from 1879 until his death in 1915. The crowd-sourced citation model — volunteers reading and excerpting from the entire published corpus of English — is a precursor to modern collaborative knowledge projects like Wikipedia. W. C. Minor's prolific contributions from Broadmoor reveal that intellectual contribution has no prerequisites of social standing.",
  realPeople: ['James Murray', 'W. C. Minor'],
  quote: "The word 'set' has over 430 different senses. It's the most versatile vine in the Jungle.",
  quoteAttribution: 'Kwame Asante, Guide of the Vocabulary Jungle',
  geographicLocation: { lat: 51.7520, lng: -1.2577, name: 'Oxford, England' },
  continent: 'Europe',
  subjectTags: ['OED', 'dictionary', 'English language', 'etymology', 'James Murray'],
  worldId: 'vocabulary-jungle',
  guideId: 'kwame-asante',
  adventureType: 'artifact_hunt',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-shakespeare-invented-words'],
  funFact:
    "The word \"set\" has the most definitions in the OED — over 430 different senses. Kwame says it's the most versatile vine in the Jungle.",
  imagePrompt:
    'Jungle canopy with OED citation slips hanging from branches like leaves, each word displaying its family tree of quotations, dappled light filtering through',
  status: 'published',
};

// ─── Entry 2: Shakespeare's Invented Words (Tier 2) ────────────────

export const ENTRY_SHAKESPEARE_INVENTED_WORDS: RealWorldEntry = {
  id: 'entry-shakespeare-invented-words',
  type: 'person',
  title: "The Man Who Made Up 1,700 Words We Still Use",
  year: 1590,
  yearDisplay: '~1590–1613 CE',
  era: 'renaissance',
  descriptionChild:
    "Shakespeare invented over 1,700 words that we still use today — \"eyeball,\" \"bedroom,\" \"lonely,\" \"generous,\" \"gloomy,\" \"hurry.\" He made up words whenever English didn't have the one he needed. And people liked them enough to keep using them forever.",
  descriptionOlder:
    "Shakespeare didn't invent these words from nothing — he combined existing roots, converted nouns into verbs, added prefixes, and compressed phrases into single words. \"Assassination,\" \"lacklustre,\" \"fashionable,\" \"uncomfortable.\" His real genius was popularisation: his plays were so widely performed that his coinages became permanent fixtures.",
  descriptionParent:
    "Shakespeare's lexical creativity demonstrates how individual speakers can permanently alter a language through cultural influence. His neologisms typically followed productive morphological patterns — compounding, conversion, affixation — rather than pure invention. The survival of his coinages owes as much to the cultural dominance of his works as to the words' utility. The story teaches children about word formation processes and the relationship between cultural influence and linguistic change.",
  realPeople: ['William Shakespeare'],
  quote: "He made up words whenever English didn't have the one he needed.",
  quoteAttribution: 'Kwame Asante, Guide of the Vocabulary Jungle',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['Shakespeare', 'neologisms', 'word formation', 'English language', 'literature'],
  worldId: 'vocabulary-jungle',
  guideId: 'kwame-asante',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-oxford-english-dictionary'],
  unlocks: ['entry-loanwords'],
  funFact:
    "Shakespeare also invented insults. \"You are not worth the dust which the rude wind blows in your face\" is from King Lear. Kwame approves.",
  imagePrompt:
    'Vine bearing Shakespeare\'s coined words as glowing fruit, children inventing new words by combining roots, Jungle canopy above, theatrical warm light',
  status: 'published',
};

// ─── Entry 3: Loanwords — How Languages Borrow (Tier 2) ────────────

export const ENTRY_LOANWORDS: RealWorldEntry = {
  id: 'entry-loanwords',
  type: 'cultural_milestone',
  title: "How Languages Share Their Best Words",
  year: 1066,
  yearDisplay: 'Ongoing (accelerated after 1066 CE)',
  era: 'medieval',
  descriptionChild:
    "English borrows words from everywhere. \"Piano\" is Italian. \"Kindergarten\" is German. \"Safari\" is Swahili. \"Typhoon\" comes from Chinese and Arabic. Languages are generous — they share their best words freely.",
  descriptionOlder:
    "About 80% of English vocabulary is borrowed from other languages. French contributed the most (after the Norman Conquest of 1066), followed by Latin, Greek, and dozens of others. English is essentially a linguistic magpie — it takes what it likes and rarely gives anything back. This is both its strength and its strangeness.",
  descriptionParent:
    "Lexical borrowing is a universal linguistic process, but English has engaged in it more extensively than virtually any other major language. The Norman Conquest introduced thousands of French words, creating systematic doublets (pig/pork, cow/beef) where Anglo-Saxon words survived for the living animal and French words for the prepared food — reflecting the social hierarchy of who raised versus who ate. The story teaches children that vocabulary is a record of cultural contact, trade, and power.",
  realPeople: [],
  quote: "The word 'ketchup' traveled further than most humans ever will.",
  quoteAttribution: 'Kwame Asante, Guide of the Vocabulary Jungle',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['loanwords', 'etymology', 'language contact', 'Norman Conquest', 'borrowing'],
  worldId: 'vocabulary-jungle',
  guideId: 'kwame-asante',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: ['entry-oxford-english-dictionary'],
  unlocks: ['entry-how-words-enter-dictionary'],
  funFact:
    "The word \"ketchup\" likely comes from the Hokkien Chinese word \"kê-tsiap,\" which referred to a fermented fish sauce. It traveled through Malay traders to British colonists before becoming tomato-based in America. The word traveled further than most humans ever will.",
  imagePrompt:
    'Root paths crossing language borders in the Jungle, each loanword carrying a passport showing its origin, warm multilingual lighting',
  status: 'published',
};

// ─── Entry 4: How New Words Enter the Dictionary (Tier 3) ──────────

export const ENTRY_HOW_WORDS_ENTER_DICTIONARY: RealWorldEntry = {
  id: 'entry-how-words-enter-dictionary',
  type: 'cultural_milestone',
  title: "The Survival of the Fittest Word",
  year: 2013,
  yearDisplay: 'Ongoing',
  era: 'contemporary',
  descriptionChild:
    "New words enter the dictionary every year. \"Selfie\" was added in 2013. \"Emoji\" in 2015. \"Doomscrolling\" in 2020. A word gets in when enough people use it, for long enough, in enough different situations. There's no test. Just survival.",
  descriptionOlder:
    "Dictionary editors don't decide what's a \"real word.\" They monitor language usage through enormous digital corpora — billions of words of published text. When a new word appears consistently across multiple independent sources over several years, it earns an entry. Words that don't sustain get dropped. The dictionary is an ecosystem, not a museum.",
  descriptionParent:
    "Modern lexicography is corpus-driven: editors analyse billions of words of published text to identify new entries. A word qualifies when it demonstrates sustained, independent usage across multiple sources over several years. The process is descriptive rather than prescriptive — dictionaries record how language is used, not how it should be used. This makes the dictionary a living ecosystem subject to the same evolutionary pressures as biological populations: variation, selection, and extinction.",
  realPeople: [],
  quote: "The word 'unfriend' was used in 1659. It disappeared for 350 years, then Facebook brought it back.",
  quoteAttribution: 'Kwame Asante, Guide of the Vocabulary Jungle',
  geographicLocation: null,
  continent: 'Global',
  subjectTags: ['neologisms', 'lexicography', 'corpus linguistics', 'language evolution', 'dictionaries'],
  worldId: 'vocabulary-jungle',
  guideId: 'kwame-asante',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-shakespeare-invented-words', 'entry-loanwords'],
  unlocks: [],
  funFact:
    "The word \"unfriend\" was used by Thomas Fuller in 1659. It disappeared for 350 years, then Facebook brought it back. Words can go extinct and evolve again — like species.",
  imagePrompt:
    'Coining Canopy in the Jungle where children propose new words, survival vines growing from adopted coinages, ecosystem-style natural light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const VOCABULARY_JUNGLE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_OXFORD_ENGLISH_DICTIONARY,
  ENTRY_SHAKESPEARE_INVENTED_WORDS,
  ENTRY_LOANWORDS,
  ENTRY_HOW_WORDS_ENTER_DICTIONARY,
] as const;

export const VOCABULARY_JUNGLE_ENTRY_IDS: readonly string[] =
  VOCABULARY_JUNGLE_ENTRIES.map((e) => e.id);
