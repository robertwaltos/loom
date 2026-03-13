/**
 * Content Entries — Spelling Mines
 * World: The Spelling Mines | Guide: Benny Okafor-Williams | Subject: Spelling / Word Patterns
 *
 * Four published entries spanning the history of spelling systems:
 *   1. Noah Webster's Dictionary — inventing American spelling
 *   2. The Norman Conquest — spelling chaos from two languages colliding
 *   3. The Scripps Spelling Bee — competitive spelling as spectacle
 *   4. The International Phonetic Alphabet — a symbol for every sound
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Noah Webster's Dictionary (Tier 1) ───────────────────

export const ENTRY_NOAH_WEBSTER_DICTIONARY: RealWorldEntry = {
  id: 'entry-noah-webster-dictionary',
  type: 'person',
  title: "The Man Who Spelled America Differently",
  year: 1828,
  yearDisplay: '1828 CE',
  era: 'industrial',
  descriptionChild:
    "Noah Webster thought that a new country needed its own way of spelling. So he changed \"colour\" to \"color,\" \"centre\" to \"center,\" and \"defence\" to \"defense.\" He spent 26 years writing a dictionary. When he finished, America had its own spelling rules.",
  descriptionOlder:
    "Webster believed that language was tied to national identity. His American Dictionary of the English Language (1828) didn't just record how Americans spoke — it actively reformed spelling to distinguish American English from British English. Some changes stuck (color, center, defense). Others didn't (he wanted \"tongue\" spelled \"tung\" and \"women\" spelled \"wimmen\"). His dictionary defined American English for two centuries.",
  descriptionParent:
    "Noah Webster's American Dictionary of the English Language (1828) was an act of linguistic nation-building. Webster deliberately reformed spelling to create a distinct American orthographic identity separate from British norms. His successful reforms (color, center, defense, traveled) and failed proposals (tung, wimmen, ake for ache) together reveal the tension between logical reform and social convention. The project took 26 years and required Webster to learn 26 languages to trace etymologies. The story teaches children that spelling is not a natural law but a human creation, subject to deliberate change.",
  realPeople: ['Noah Webster'],
  quote: "A new country needed its own way of spelling.",
  quoteAttribution: 'Benny Okafor-Williams, Guide of the Spelling Mines',
  geographicLocation: { lat: 41.3083, lng: -72.9279, name: 'New Haven, Connecticut' },
  continent: 'North America',
  subjectTags: ['Noah Webster', 'dictionary', 'American English', 'spelling reform', 'orthography'],
  worldId: 'spelling-mines',
  guideId: 'benny-okafor-williams',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-norman-conquest-spelling'],
  funFact:
    "Webster wanted to spell \"tongue\" as \"tung\" and \"women\" as \"wimmen.\" Those changes didn't catch on. But over 200 years later, Americans still write \"center\" and \"color\" thanks to him.",
  imagePrompt:
    'Deep mine shaft in the Spelling Mines, crystal-embedded walls spelling words differently, Webster with pickaxe revealing letter seams, warm amber lantern light',
  status: 'published',
};

// ─── Entry 2: The Norman Conquest Spelling Chaos (Tier 2) ──────────

export const ENTRY_NORMAN_CONQUEST_SPELLING: RealWorldEntry = {
  id: 'entry-norman-conquest-spelling',
  type: 'event',
  title: "When Two Languages Crashed Together",
  year: 1066,
  yearDisplay: '1066 CE',
  era: 'medieval',
  descriptionChild:
    "In 1066, the Normans invaded England, and suddenly the people in charge spoke French while everyone else spoke English. Words from both languages got mixed together, and nobody could agree how to spell anything. That's why English spelling is so weird today.",
  descriptionOlder:
    "The Norman Conquest created a language pileup. French-speaking rulers governed Anglo-Saxon-speaking communities for three hundred years. English absorbed thousands of French words — beef, parliament, justice, castle — but kept its Germanic grammar. Scribes wrote the same words different ways depending on where they lived. By the time English stabilised, it had two or three spellings for many sounds (\"night\" vs. \"knight\" vs. \"nite\") and French-influenced oddities (\"debt\" has a silent b added by scholars who wanted it to look like Latin \"debitum\").",
  descriptionParent:
    "The Norman Conquest of 1066 produced the single most chaotic period in English spelling history. For approximately 300 years, Norman French functioned as the language of law, governance, and aristocratic culture while Anglo-Saxon remained the vernacular. The resulting linguistic merger gave English its characteristic split vocabulary (e.g., cow/beef, sheep/mutton — Germanic words for the animals tended by English-speaking peasants, French words for the meat served to Norman lords). Scribal variation was enormous; the word 'church' alone appears as circe, chirche, cherche, and kyrke in period manuscripts. The silent 'b' in 'debt' was inserted by Renaissance scholars to show Latin etymology. The story teaches children that English spelling is not arbitrary — it's archaeological, preserving the fossils of historical collisions.",
  realPeople: ['William the Conqueror'],
  quote: "English spelling is not arbitrary — it's archaeological.",
  quoteAttribution: 'Benny Okafor-Williams, Guide of the Spelling Mines',
  geographicLocation: { lat: 50.9112, lng: 0.4887, name: 'Hastings, England' },
  continent: 'Europe',
  subjectTags: ['Norman Conquest', 'spelling', 'French', 'English history', 'language collision'],
  worldId: 'spelling-mines',
  guideId: 'benny-okafor-williams',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-noah-webster-dictionary'],
  unlocks: ['entry-scripps-spelling-bee'],
  funFact:
    "The word \"church\" alone appears in medieval manuscripts as circe, chirche, cherche, and kyrke. The silent 'b' in 'debt' was added by Renaissance scholars who wanted it to look more like the Latin word 'debitum.' It was never pronounced.",
  imagePrompt:
    'Time window showing 1066 England, Norman and Saxon scribes arguing over manuscripts with different spellings, mine shaft linking two language-crystal veins',
  status: 'published',
};

// ─── Entry 3: The Scripps Spelling Bee (Tier 2) ────────────────────

export const ENTRY_SCRIPPS_SPELLING_BEE: RealWorldEntry = {
  id: 'entry-scripps-spelling-bee',
  type: 'cultural_milestone',
  title: "The Championship of Words",
  year: 1925,
  yearDisplay: '1925 CE – present',
  era: 'modern',
  descriptionChild:
    "Every year, kids from across America compete to see who can spell the hardest words. The National Spelling Bee has been going since 1925. Winners have to spell words like \"knaidel\" (a dumpling) and \"stichomythia\" (a type of dialogue). It's been on TV since the 1990s.",
  descriptionOlder:
    "The Scripps National Spelling Bee turned spelling into competitive spectacle. Champions study Latin roots, Greek prefixes, and language-of-origin patterns — essentially reverse-engineering the archaeology of English. The competition has been broadcast live on ESPN since 1994. In 2019, eight co-champions tied for the first time, defeating every word the judges could throw at them. The Bee reveals that mastery of spelling requires understanding etymology, phonetics, and the history of English itself.",
  descriptionParent:
    "The Scripps National Spelling Bee (founded 1925 by The Courier-Journal in Louisville) has evolved from a literacy-promotion event into a nationally televised academic competition. Champions employ systematic study of etymology, language-of-origin patterns, and phonological rules rather than rote memorisation. The competition's word list, drawn from Webster's Third New International Dictionary, becomes progressively more arcane, requiring knowledge of Greek, Latin, French, German, Arabic, Japanese, and other source languages. The unprecedented eight-way co-championship in 2019 prompted rules changes. The story teaches children that spelling mastery is a form of linguistic detective work.",
  realPeople: [],
  quote: "Mastery of spelling requires understanding etymology, phonetics, and the history of English itself.",
  quoteAttribution: 'Benny Okafor-Williams, Guide of the Spelling Mines',
  geographicLocation: { lat: 38.9072, lng: -77.0369, name: 'Washington, D.C., USA' },
  continent: 'North America',
  subjectTags: ['Scripps', 'Spelling Bee', 'competition', 'etymology', 'English spelling'],
  worldId: 'spelling-mines',
  guideId: 'benny-okafor-williams',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-noah-webster-dictionary'],
  unlocks: ['entry-ipa-phonetic-alphabet'],
  funFact:
    "In 2019, eight kids tied to win the Spelling Bee — they got every single word right and the judges ran out of hard words. They were called the \"Octochamps.\" The rules were changed after that.",
  imagePrompt:
    'Spelling Bee arena carved into a crystal mine cavern, children at podiums surrounded by floating letter-crystals, spotlights on shimmering mineral walls',
  status: 'published',
};

// ─── Entry 4: The International Phonetic Alphabet (Tier 3) ─────────

export const ENTRY_IPA_PHONETIC_ALPHABET: RealWorldEntry = {
  id: 'entry-ipa-phonetic-alphabet',
  type: 'invention',
  title: "A Symbol for Every Sound in Every Language",
  year: 1888,
  yearDisplay: '1888 CE',
  era: 'industrial',
  descriptionChild:
    "What if you could write down every sound any human can make? That's what the International Phonetic Alphabet does. It has a symbol for every click, whistle, and pop that any language uses. Even the click sounds in some African languages have their own symbols.",
  descriptionOlder:
    "The IPA was created in 1888 by a group of French and British language teachers who needed a way to teach pronunciation across languages. Each symbol represents exactly one sound — no ambiguity, no silent letters, no spelling rules. The symbol /ʃ/ always means the \"sh\" sound, whether it appears in English \"ship,\" French \"chat,\" or Mandarin \"shí.\" The IPA reveals that English uses about 44 distinct sounds but maps them onto only 26 letters — which is why spelling is so inconsistent.",
  descriptionParent:
    "The International Phonetic Alphabet (1888), created by the International Phonetic Association under Paul Passy and Henry Sweet (the model for Professor Henry Higgins in Shaw's Pygmalion), provides a one-to-one mapping between symbols and speech sounds. It currently contains 107 base letters, 31 diacritics, and 19 additional signs. The IPA demonstrates that English uses approximately 44 phonemes mapped onto 26 graphemes — the fundamental mismatch that makes English spelling notoriously difficult. The system is used in linguistics, speech therapy, language teaching, and dictionary pronunciation guides. The story teaches children that sound and spelling are different systems, and that understanding this difference is the key to spelling mastery.",
  realPeople: ['Paul Passy', 'Henry Sweet'],
  quote: "English uses about 44 distinct sounds but maps them onto only 26 letters — which is why spelling is so inconsistent.",
  quoteAttribution: 'Benny Okafor-Williams, Guide of the Spelling Mines',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['IPA', 'phonetics', 'pronunciation', 'linguistics', 'spelling'],
  worldId: 'spelling-mines',
  guideId: 'benny-okafor-williams',
  adventureType: 'artifact_hunt',
  difficultyTier: 3,
  prerequisites: ['entry-norman-conquest-spelling', 'entry-scripps-spelling-bee'],
  unlocks: [],
  funFact:
    "Henry Sweet, one of the IPA's key developers, was the real-life model for Professor Henry Higgins in George Bernard Shaw's Pygmalion (later adapted as My Fair Lady). The IPA currently contains 107 base letters, 31 diacritics, and 19 additional signs.",
  imagePrompt:
    'Deepest chamber of the Spelling Mines with crystals shaped like IPA symbols, each emitting a different sound when touched, prismatic light from phonetic formations',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const SPELLING_MINES_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_NOAH_WEBSTER_DICTIONARY,
  ENTRY_NORMAN_CONQUEST_SPELLING,
  ENTRY_SCRIPPS_SPELLING_BEE,
  ENTRY_IPA_PHONETIC_ALPHABET,
] as const;

export const SPELLING_MINES_ENTRY_IDS: readonly string[] =
  SPELLING_MINES_ENTRIES.map((e) => e.id);
