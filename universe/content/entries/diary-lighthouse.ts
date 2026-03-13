/**
 * Content Entries — Diary Lighthouse
 * World: The Diary Lighthouse | Guide: Nadia Volkov | Subject: Creative Writing / Journaling
 *
 * Four published entries spanning the history of diary and journal writing:
 *   1. Anne Frank's Diary — writing as survival and witness
 *   2. Samuel Pepys — eyewitness to the Great Fire of London
 *   3. Sei Shōnagon's Pillow Book — the oldest personal lists
 *   4. Frida Kahlo's Diary — where art and words merge
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Anne Frank's Diary (Tier 1) ──────────────────────────

export const ENTRY_ANNE_FRANK_DIARY: RealWorldEntry = {
  id: 'entry-anne-frank-diary',
  type: 'person',
  title: "The Girl Who Wrote in Hiding",
  year: 1942,
  yearDisplay: '1942–1944 CE',
  era: 'modern',
  descriptionChild:
    "Anne Frank was a Jewish girl who hid from the Nazis in a secret room behind a bookcase for two years. She wrote a diary about her life in hiding — her fears, her hopes, her arguments with her mother, her dreams for the future. She didn't survive the war, but her diary did. Millions of people have read it.",
  descriptionOlder:
    "Anne's diary is extraordinary not because of what happened to her, but because of how precisely she observed and recorded it. She revised her diary with publication in mind, creating a second, literary draft alongside the raw original. She was writing both for herself and for the future. Her entry from July 15, 1944 — \"I still believe, in spite of everything, that people are really good at heart\" — is one of the most quoted sentences in literature.",
  descriptionParent:
    "Anne Frank's diary (1942–1944) is simultaneously a personal journal and a consciously crafted literary document. Anne revised her entries with publication in mind after hearing a radio broadcast calling for preservation of wartime diaries. The coexistence of the raw and revised versions reveals a thirteen-year-old developing as both a person and a writer in real time. Otto Frank, the sole surviving family member, published the diary in 1947. Translated into over 70 languages, it remains the most widely read first-person account of the Holocaust. The story teaches children about witness, memory, and the power of writing to outlast its author.",
  realPeople: ['Anne Frank', 'Otto Frank'],
  quote: "I still believe, in spite of everything, that people are really good at heart.",
  quoteAttribution: 'Anne Frank, diary entry, July 15, 1944',
  geographicLocation: { lat: 52.3752, lng: 4.8840, name: 'Amsterdam, Netherlands' },
  continent: 'Europe',
  subjectTags: ['Anne Frank', 'diary', 'Holocaust', 'witness', 'creative writing'],
  worldId: 'diary-lighthouse',
  guideId: 'nadia-volkov',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-pepys-diary'],
  funFact:
    "Anne's diary was found scattered on the floor of the annex after the family was arrested. Otto Frank, Anne's father and the only family member to survive, spent years deciding whether to publish it. It's been translated into over 70 languages.",
  imagePrompt:
    'Candlelit attic in the Diary Lighthouse, a bookcase-door slightly ajar, diary pages glowing with handwritten words, warm intimate light',
  status: 'published',
};

// ─── Entry 2: Samuel Pepys (Tier 2) ────────────────────────────────

export const ENTRY_PEPYS_DIARY: RealWorldEntry = {
  id: 'entry-pepys-diary',
  type: 'person',
  title: "The Man Who Wrote Down Everything",
  year: 1660,
  yearDisplay: '1660–1669 CE',
  era: 'enlightenment',
  descriptionChild:
    "Samuel Pepys kept a diary for nine years and wrote down everything — the Great Fire of London, the plague, what he ate for dinner, arguments with his wife, parties, and the sound of the city. He wrote it in a secret code that took 200 years to crack.",
  descriptionOlder:
    "Pepys' diary is the most important first-person account of 17th-century London. His entries on the Great Fire (September 1666) are used by historians as primary sources — he describes burying his wine and Parmesan cheese in the garden to save them from the flames. His frankness about his own failings makes the diary feel shockingly modern.",
  descriptionParent:
    "Samuel Pepys' diary (1660–1669) is the most vivid eyewitness account of Restoration London. His entries during the Great Plague (1665) and Great Fire (1666) are primary historical sources of extraordinary detail. His use of Thomas Shelton's shorthand system, supplemented by foreign-language words for private matters, kept the diary secret until decipherment in the 1820s. The candour of his self-examination — recording his failings, vanities, and marital conflicts alongside great historical events — makes his diary feel remarkably modern and teaches children that honest observation is the foundation of good writing.",
  realPeople: ['Samuel Pepys'],
  quote: "He describes burying his wine and Parmesan cheese in the garden to save them from the flames.",
  quoteAttribution: 'Nadia Volkov, Guide of the Diary Lighthouse',
  geographicLocation: { lat: 51.5074, lng: -0.1278, name: 'London, England' },
  continent: 'Europe',
  subjectTags: ['Pepys', 'diary', 'Great Fire', 'London', 'eyewitness account'],
  worldId: 'diary-lighthouse',
  guideId: 'nadia-volkov',
  adventureType: 'time_window',
  difficultyTier: 2,
  prerequisites: ['entry-anne-frank-diary'],
  unlocks: ['entry-sei-shonagon-pillow-book'],
  funFact:
    "Pepys used a shorthand system called Thomas Shelton's tachygraphy, plus words from Spanish, French, and Italian when writing about things he didn't want anyone to read. Scholars took until the 1820s to fully decode it.",
  imagePrompt:
    'Time window opening to 1666 London ablaze, Pepys Chamber in the Lighthouse with shorthand manuscripts, warm firelight contrasting with cool maritime light',
  status: 'published',
};

// ─── Entry 3: Sei Shōnagon's Pillow Book (Tier 2) ─────────────────

export const ENTRY_SEI_SHONAGON_PILLOW_BOOK: RealWorldEntry = {
  id: 'entry-sei-shonagon-pillow-book',
  type: 'person',
  title: "A Thousand-Year-Old Book of Beautiful Lists",
  year: 1002,
  yearDisplay: '~1002 CE',
  era: 'medieval',
  descriptionChild:
    "A thousand years ago, a Japanese woman at the emperor's court kept a book of lists — \"Things that make the heart beat faster,\" \"Hateful things,\" \"Elegant things.\" She wrote about snow on red plum blossoms and what annoys her about boring visitors. It's one of the oldest personal books ever written.",
  descriptionOlder:
    "The Pillow Book is a \"zuihitsu\" — a uniquely Japanese literary form meaning \"follow the brush.\" Sei Shōnagon mixed diary entries, lists, observations, and opinions with no particular structure. Her wit is sharp: \"A preacher should be good-looking\" is one of her opinions. The Pillow Book and Murasaki Shikibu's Tale of Genji (written at the same court around the same time, by a rival) are the twin foundations of Japanese literature.",
  descriptionParent:
    "Sei Shōnagon's Makura no Sōshi (~1002 CE) is the founding text of the zuihitsu ('follow the brush') form — a uniquely Japanese genre combining diary entries, lists, observations, opinions, and anecdotes in no prescribed order. Written at the Heian court, it stands alongside Murasaki Shikibu's Tale of Genji as the foundation of Japanese literary culture. The two women were contemporaries and rivals; Murasaki called Sei Shōnagon 'dreadfully conceited.' The work teaches children that personal observation — especially in list form — is a legitimate and powerful mode of expression.",
  realPeople: ['Sei Shōnagon'],
  quote: "A preacher should be good-looking.",
  quoteAttribution: 'Sei Shōnagon, The Pillow Book',
  geographicLocation: { lat: 35.0116, lng: 135.7681, name: 'Kyoto, Japan' },
  continent: 'Asia',
  subjectTags: ['Sei Shōnagon', 'Pillow Book', 'zuihitsu', 'Japanese literature', 'lists'],
  worldId: 'diary-lighthouse',
  guideId: 'nadia-volkov',
  adventureType: 'reenactment',
  difficultyTier: 2,
  prerequisites: ['entry-anne-frank-diary'],
  unlocks: ['entry-frida-kahlo-diary'],
  funFact:
    "Sei Shōnagon and Murasaki Shikibu disliked each other. Murasaki wrote in her diary that Sei Shōnagon was \"dreadfully conceited.\" Their literary rivalry produced two of the greatest works in Japanese history.",
  imagePrompt:
    'Journal Room in the Lighthouse with Japanese screen paintings, children writing personal lists on scroll paper, snow on plum blossoms visible outside, soft Heian lighting',
  status: 'published',
};

// ─── Entry 4: Frida Kahlo's Diary (Tier 3) ─────────────────────────

export const ENTRY_FRIDA_KAHLO_DIARY: RealWorldEntry = {
  id: 'entry-frida-kahlo-diary',
  type: 'person',
  title: "Words and Paint on the Same Page",
  year: 1944,
  yearDisplay: '1944–1954 CE',
  era: 'modern',
  descriptionChild:
    "Frida Kahlo was an artist who kept a diary full of paintings, drawings, and words all mixed together. Some pages are bright with colour. Some are full of pain. She didn't separate her art from her writing — they were the same voice.",
  descriptionOlder:
    "Kahlo's diary combines ink and watercolour illustrations, love letters (many to Diego Rivera), political reflections, and explorations of chronic pain from a childhood bus accident. It's a document of a mind that refused to separate visual and written expression. For Kahlo, a self-portrait and a diary entry served the same purpose: unflinching self-examination.",
  descriptionParent:
    "Frida Kahlo's diary (1944–1954) is one of the most intimate creative documents of the 20th century, combining ink and watercolour illustration, love letters, political reflection, and candid exploration of chronic pain. Published in 1995, forty-one years after her death, it reveals a practice where visual art and written expression are inseparable modes of the same inquiry. The diary teaches children that self-expression need not conform to a single medium — drawing and writing can coexist on the same page, each enriching the other.",
  realPeople: ['Frida Kahlo'],
  quote: "She didn't separate her art from her writing — they were the same voice.",
  quoteAttribution: 'Nadia Volkov, Guide of the Diary Lighthouse',
  geographicLocation: { lat: 19.3594, lng: -99.1626, name: 'Mexico City, Mexico' },
  continent: 'North America',
  subjectTags: ['Frida Kahlo', 'diary', 'visual journal', 'art and writing', 'self-expression'],
  worldId: 'diary-lighthouse',
  guideId: 'nadia-volkov',
  adventureType: 'reenactment',
  difficultyTier: 3,
  prerequisites: ['entry-pepys-diary', 'entry-sei-shonagon-pillow-book'],
  unlocks: [],
  funFact:
    "Kahlo's diary was not published until 1995, forty-one years after her death. When it was finally released, critics called it one of the most intimate creative documents of the 20th century. Nadia keeps a copy on the top shelf of the Lighthouse. She has read it eleven times.",
  imagePrompt:
    'Letter Desk in the Lighthouse with art supplies and writing tools side by side, a Kahlo-style page combining watercolour and handwriting, vibrant colour and warm studio light',
  status: 'published',
};

// ─── Collected Exports ──────────────────────────────────────────────

export const DIARY_LIGHTHOUSE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_ANNE_FRANK_DIARY,
  ENTRY_PEPYS_DIARY,
  ENTRY_SEI_SHONAGON_PILLOW_BOOK,
  ENTRY_FRIDA_KAHLO_DIARY,
] as const;

export const DIARY_LIGHTHOUSE_ENTRY_IDS: readonly string[] =
  DIARY_LIGHTHOUSE_ENTRIES.map((e) => e.id);
