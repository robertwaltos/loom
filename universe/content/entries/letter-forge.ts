/**
 * Content Entries — Letter Forge
 * World: Letter Forge | Guide: Amara Diallo | Subject: Phonics / Letter Recognition
 *
 * Four published entries tracing the history of writing systems:
 *   1. Sumerian cuneiform — the first writing: tax receipts changed the world
 *   2. The Phoenician alphabet — the ancestor of every letter you know
 *   3. Louis Braille's alphabet — a 15-year-old's invention that changed access forever
 *   4. Champollion decodes hieroglyphs — the greatest code-breaking in history
 *
 * NOTE: Entry 3 (Braille) deliberately connects to Riku in Starfall Observatory
 * and Henrietta Leavitt's hearing aids — disability as innovation, not limitation.
 * Entry 4 connects to entry-rosetta-stone in story-tree.
 */

import type { RealWorldEntry } from '../types.js';

// ─── Entry 1: Sumerian Cuneiform (Tier 1 — ages 5-6) ───────────────

export const ENTRY_CUNEIFORM_CLAY: RealWorldEntry = {
  id: 'entry-cuneiform-clay',
  type: 'invention',
  title: "The First Writing: A Tax Receipt Changed the World",
  year: -3200,
  yearDisplay: 'c. 3200 BCE',
  era: 'ancient',
  descriptionChild:
    "The very first writing wasn't poetry or stories. It was a list. Someone in ancient Mesopotamia (today's Iraq) needed to record how much grain was stored in a temple. They pressed a reed into wet clay to make marks — cuneiform. These clay tablets are the oldest writing we've ever found. They are 5,200 years old. And the first message? It says: '29,086 measures of barley received over 37 months.'",
  descriptionOlder:
    "Cuneiform (from Latin 'cuneus' — wedge) emerged in Sumerian Mesopotamia c. 3200 BCE, initially as an accounting system for tracking grain, livestock, and other goods at temple complexes. Early pictographic tokens evolved into abstract wedge-shaped impressions made by a stylus on wet clay tablets. Over centuries, cuneiform evolved to record syllables (not just objects) — enabling literature. The Epic of Gilgamesh, the world's oldest narrative story, was written in cuneiform c. 2100 BCE. Libraries of clay tablets from Nineveh contain over 30,000 tablets.",
  descriptionParent:
    "The origin of writing as an accounting technology — not art — is counterintuitive and productive. Children can discuss: if you were living 5,000 years ago, what would YOU need to memorize every year? (Harvests, trades, agreements.) Writing emerges from the need to extend human memory beyond individual brains. Cuneiform also demonstrates that the concept of 'letters' (phonetic symbols for sounds) took thousands of years to develop from pictograms representing objects. This history makes the abstract alphabet seem like a genuine achievement.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 30.9622, lng: 46.1043, name: 'Uruk, Mesopotamia (modern Iraq)' },
  continent: 'Asia',
  subjectTags: ['cuneiform', 'Sumerian', 'writing origins', 'ancient Mesopotamia', 'phonics origins'],
  worldId: 'letter-forge',
  guideId: 'amara-diallo',
  adventureType: 'artifact_hunt',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-phoenician-alphabet'],
  funFact: "Ancient Sumerian scribes went to school for years to learn cuneiform — there were hundreds of signs to memorize. The school was called the 'edubba' (tablet house). Archaeologists found ancient Sumerian homework tablets — including one where a student complained that school was hard.",
  imagePrompt:
    "Ancient Sumerian city Uruk at warm dusk, a clay tablet workshop where a scribe presses a reed stylus into a fresh clay tablet, the marks forming neat rows of wedge shapes, shelves of finished tablets behind organized by category, grain stores visible outside through an open arch, oil lamps lighting the space, the weight and permanence of clay, Ghibli painterly warmth with the sense of something new being born, dust motes in honey-colored light",
  status: 'published',
};

// ─── Entry 2: The Phoenician Alphabet (Tier 1 — ages 5-6) ──────────

export const ENTRY_PHOENICIAN_ALPHABET: RealWorldEntry = {
  id: 'entry-phoenician-alphabet',
  type: 'invention',
  title: "The Ancestor of Every Letter You Know",
  year: -1050,
  yearDisplay: 'c. 1050 BCE',
  era: 'ancient',
  descriptionChild:
    "Look at the letter A. It came from a letter the Phoenicians used 3,000 years ago called 'aleph' — which means 'ox.' They turned the ox head sideways and upside down until it became a shape for a sound. Then the Greeks borrowed their letters, the Romans borrowed from the Greeks, and we borrowed from the Romans. Every letter you know has a 3,000-year-old ancestor. Aleph became alpha became A.",
  descriptionOlder:
    "The Phoenician alphabet (c. 1050 BCE) was the first widely-used phonemic alphabet — each symbol representing a consonant sound rather than a word, syllable, or object. Developed by the Phoenicians (modern Lebanon/Syria) for trade documentation, it had 22 consonant signs and no vowels (vowels were inferred from context). The Greeks adapted this c. 800 BCE, adding vowel signs — creating the first complete phonetic alphabet. The Romans adapted from the Greek, producing the Latin alphabet. Hebrew, Arabic, and Greek alphabets all trace directly to the Phoenician original. The word 'alphabet' comes from the first two Greek letters: alpha (from Phoenician 'aleph') and beta (from Phoenician 'beth').",
  descriptionParent:
    "The Phoenician alphabet story demonstrates that writing systems are not invented in isolation — they spread, adapt, and evolve through trade and cultural contact. For phonics instruction, children can physically trace the transformation: 'aleph' (ox head) → Phoenician symbol → Greek alpha → Latin A. The journey of a single letter across 3,000 years and multiple civilizations makes abstract letter-sound correspondence feel like inheritance rather than arbitrary convention.",
  realPeople: [],
  quote: null,
  quoteAttribution: null,
  geographicLocation: { lat: 33.8886, lng: 35.4955, name: 'Byblos, Phoenicia (modern Lebanon)' },
  continent: 'Asia',
  subjectTags: ['Phoenician alphabet', 'phonics', 'letter origins', 'alphabet history', 'writing systems'],
  worldId: 'letter-forge',
  guideId: 'amara-diallo',
  adventureType: 'artifact_hunt',
  difficultyTier: 1,
  prerequisites: ['entry-cuneiform-clay'],
  unlocks: ['entry-braille-invention'],
  funFact: "The letter 'H' comes from the Phoenician symbol 'heth' — which originally looked like a fence drawn with two upright posts and three horizontal bars. Turn an ancient Phoenician H sideways and you can see the fence.",
  imagePrompt:
    "Phoenician trading port 1050 BCE, a merchant's stone-walled office, merchant tablets inscribed with 22 clean angular symbols — the Phoenician alphabet — alongside trade goods from multiple civilizations: Egyptian papyrus, Mesopotamian cylinder seals, Mycenaean pottery, the alphabet letters lined up on one wall in order with small pictograms of their origin meaning above each, warm Mediterranean light, sense of a communication technology that will travel the world, Ghibli painterly warmth",
  status: 'published',
};

// ─── Entry 3: Louis Braille's Alphabet (Tier 2 — ages 7-8) ──────────

export const ENTRY_BRAILLE_INVENTION: RealWorldEntry = {
  id: 'entry-braille-invention',
  type: 'invention',
  title: "What a Fifteen-Year-Old Built With Six Dots",
  year: 1824,
  yearDisplay: '1824 CE',
  era: 'enlightenment',
  descriptionChild:
    "Louis Braille lost his sight at age 3 in an accident with his father's tool. By age 15, he had invented a new alphabet that blind people could read with their fingertips. Six raised dots, arranged in patterns. His school didn't use it at first — the director thought it was childish. Louis kept teaching it to other students anyway, secretly. After Louis died, the world finally noticed he had solved a problem nobody else had come close to solving. Braille is now used in over 200 languages.",
  descriptionOlder:
    "Louis Braille (1809-1852) became blind at 3 from a workshop accident. At 15, he adapted a military 'night writing' system invented by Charles Barbier — originally designed for soldiers to read orders in the dark — into a 6-dot cell system representing letters, numbers, and musical notation. Each character is a unique arrangement of raised dots in a 2×3 matrix, giving 64 possible combinations. The French National Institute for Blind Youth (where Braille was student then teacher) refused to adopt it officially during his lifetime. He died believing his system had failed. France formally adopted it two years after his death. The World Braille Day is January 4, his birthday.",
  descriptionParent:
    "Braille's story combines phonics (alternate encoding of letter sounds), disability rights history, and the theme of a young person's innovation dismissed by institutions — then eventually vindicated. For children with visual impairments, Braille is living technology making this entry especially resonant. The system's elegance (six dots yield 64 combinations, sufficient for an entire language) demonstrates combinatorial mathematics. Connect to Riku Osei at Starfall Observatory, who reads sonified star data — different encoding of the same underlying information.",
  realPeople: ['Louis Braille', 'Charles Barbier'],
  quote: "Access to communication in the widest sense is access to knowledge.",
  quoteAttribution: 'Louis Braille',
  geographicLocation: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
  continent: 'Europe',
  subjectTags: ['Braille', 'tactile writing', 'disability', 'letters', 'phonics', 'accessibility'],
  worldId: 'letter-forge',
  guideId: 'amara-diallo',
  adventureType: 'artifact_hunt',
  difficultyTier: 2,
  prerequisites: ['entry-phoenician-alphabet'],
  unlocks: ['entry-champollion-hieroglyphs'],
  funFact: "The musical notation version of Braille (Braille music) is so precise that a blind musician can learn an entire symphony from a Braille score — and perform it without any visual notation reference at all. Louis Braille was an accomplished organist. He encoded music before he encoded literature.",
  imagePrompt:
    "Paris 1824, a small dormitory room at the Institut National des Jeunes Aveugles, Louis Braille age 15 at a wooden desk covered in paper samples, his fingers moving over a grid of six raised dots he is punching with a stylus, expression of intense concentration and dawning certainty, his blind classmates at adjacent desks also practicing with the new dot system, oil lamp casting warm light, the school director's disapproving figure faintly visible at the door, Ghibli painterly intimacy",
  status: 'published',
};

// ─── Entry 4: Champollion Decodes Hieroglyphs (Tier 3 — ages 9-10) ──

export const ENTRY_CHAMPOLLION_HIEROGLYPHS: RealWorldEntry = {
  id: 'entry-champollion-hieroglyphs',
  type: 'discovery',
  title: "The Greatest Secret That Was Hidden in Plain Sight",
  year: 1822,
  yearDisplay: 'September 22, 1822',
  era: 'industrial',
  descriptionChild:
    "For 1,400 years, Egyptian hieroglyphs were a mystery no one could read. Scholars tried everything — they thought the pictures were symbolic, like codes. Then in 1799, French soldiers found the Rosetta Stone — the same text in three scripts, including Greek, which scholars could read. Jean-François Champollion spent 23 years working on it. On September 22, 1822, he burst into his brother's office, threw a stack of notes on the desk, shouted 'I've got it!' — and fainted. He'd figured out that hieroglyphs were LETTERS, not just symbols.",
  descriptionOlder:
    "Champollion's breakthrough came from a methodological insight: hieroglyphs weren't purely symbolic (as most scholars assumed) but were a mixed system — some signs were phonetic (representing sounds), some were ideographic (representing concepts), and some were determinatives (category markers). The Rosetta Stone's cartouches — oval rings around royal names — allowed him to map phonetic signs to known Greek names (Ptolemy, Cleopatra). He used 13 languages in his analysis, including Coptic, which he realized was the direct descendant of ancient Egyptian. This cross-language approach is his great methodological contribution.",
  descriptionParent:
    "Champollion's story is ideal for advanced phonics instruction because it demonstrates that 'reading' is not universal — different scripts encode language differently, and understanding a writing system requires understanding its logic first. The hieroglyphs-as-symbols misconception that persisted for 1,400 years shows how assumptions block understanding. Connect this to the Rosetta Stone entry in the Story Tree world — Grandmother Anaya covers the moment of the stone's creation; Amara covers the moment of its decoding. Cross-world connection.",
  realPeople: ['Jean-François Champollion', 'Thomas Young'],
  quote: "I've got it — this is the foundation of a new science.",
  quoteAttribution: 'Jean-François Champollion, September 22, 1822',
  geographicLocation: { lat: 45.1878, lng: 5.7241, name: 'Grenoble, France (Champollion\'s home)' },
  continent: 'Europe',
  subjectTags: ['hieroglyphs', 'decoding', 'Rosetta Stone', 'writing systems', 'code-breaking', 'phonetics'],
  worldId: 'letter-forge',
  guideId: 'amara-diallo',
  adventureType: 'artifact_hunt',
  difficultyTier: 3,
  prerequisites: ['entry-braille-invention'],
  unlocks: [],
  funFact: "Champollion knew 13 languages before age 20. When he presented his decipherment at the Académie, many scholars refused to believe a writing system that had been 'lost' for 1,400 years could be recovered. He spent the rest of his life proving it — and then traveled to Egypt in 1828, the first time since childhood, to read the walls of every temple himself.",
  imagePrompt:
    "Paris 1822, a scholar's apartment overflowing with notebooks, papyrus copies, and sketched cartouche tables, Jean-François Champollion just standing having recovered from fainting, papers scattered around his feet, his brother Jacques-Joseph catching him from behind, the open notebook on the desk showing columns of hieroglyph symbols with their phonetic equivalents mapped in red ink, triumph and exhaustion on his face, morning light flooding in after a long night of work, Ghibli painterly realism with the drama of discovery",
  status: 'published',
};

// ─── Export ────────────────────────────────────────────────────────

export const LETTER_FORGE_ENTRIES: readonly RealWorldEntry[] = [
  ENTRY_CUNEIFORM_CLAY,
  ENTRY_PHOENICIAN_ALPHABET,
  ENTRY_BRAILLE_INVENTION,
  ENTRY_CHAMPOLLION_HIEROGLYPHS,
];

export const LETTER_FORGE_ENTRY_IDS = LETTER_FORGE_ENTRIES.map((e) => e.id);
