/**
 * Quiz Questions — Letter Forge (Amara Diallo)
 * Phonics / Letter Recognition / Writing Systems
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const LETTER_FORGE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-cuneiform-clay ─────────────────────────────────────────────────────
  {
    id: 'quiz-cuneiform-t1',
    entryId: 'entry-cuneiform-clay',
    difficultyTier: 1,
    question: 'The very first writing in human history was invented for what purpose?',
    options: [
      'To write poems and love letters',
      'To record stories of gods and kings',
      'To keep track of grain, beer, and goats — basically accounting records',
      'To communicate orders between army generals',
    ],
    correctIndex: 2,
    explanation: 'Sumerian cuneiform (~3200 BCE) was invented not for literature, but for accounting. The oldest clay tablets record things like "29 goats delivered to the temple." Writing began as a business tool. Stories and poems came much later. This surprises almost everyone — and it helps us understand that writing is a technology, not just art.',
  },
  {
    id: 'quiz-cuneiform-t2',
    entryId: 'entry-cuneiform-clay',
    difficultyTier: 2,
    question: 'Cuneiform was written by pressing a reed stylus into wet clay. What does "cuneiform" mean?',
    options: [
      'Ancient Sumerian for "the marks of the gods"',
      '"Wedge-shaped" in Latin — describing the triangular impressions the reed made',
      '"Clay writing" in ancient Akkadian',
      '"Sacred symbols" in early Babylonian',
    ],
    correctIndex: 1,
    explanation: '"Cuneiform" comes from the Latin "cuneus" (wedge) and "forma" (shape). Pressing a cut reed into soft clay at different angles creates wedge-shaped marks. This simple tool — a reed and wet clay — could express thousands of different sounds and concepts. It was used for over 3,000 years across multiple civilizations.',
  },
  {
    id: 'quiz-cuneiform-t3',
    entryId: 'entry-cuneiform-clay',
    difficultyTier: 3,
    question: 'Cuneiform clay tablets have survived for 5,000 years while paper manuscripts have mostly rotted. What does this tell us about how writing materials affect what history we know?',
    options: [
      'Clay was a conscious archival choice — Sumerians knew their records would outlast paper',
      'The accident of material durability means we know more about Sumerian accounting than Greek poetry from the same era',
      'Clay tablets were only used for the most important records, so we have a complete picture of Sumerian life',
      'Paper simply has not yet been excavated from Mesopotamian sites',
    ],
    correctIndex: 1,
    explanation: 'We know more about Sumerian grain prices than we know about entire centuries of other civilizations — simply because clay fired in the destruction of Mesopotamian cities survived while papyrus and vellum did not. What gets written down AND what survives are different filters. History is always partial, shaped by what materials, languages, and civilizations happened to leave evidence we can find.',
  },

  // ─── entry-phoenician-alphabet ───────────────────────────────────────────────
  {
    id: 'quiz-phoenician-t1',
    entryId: 'entry-phoenician-alphabet',
    difficultyTier: 1,
    question: 'The Phoenician alphabet is special because:',
    options: [
      'It was the first alphabet with both letters and numbers',
      'It became the ancestor of nearly every alphabet in use today — Greek, Latin, Arabic, Hebrew',
      'It was the first writing system that used pictures for each word',
      'It was the first alphabet written from left to right',
    ],
    correctIndex: 1,
    explanation: 'The Phoenician alphabet (~1050 BCE) had 22 letters representing consonant sounds. The Greeks adapted it, adding vowel letters. The Greeks\' version became the Latin alphabet (which you\'re reading now) and influenced Cyrillic, Arabic, Hebrew, and dozens of others. Every letter in this sentence is a descendant of a Phoenician letter.',
  },
  {
    id: 'quiz-phoenician-t2',
    entryId: 'entry-phoenician-alphabet',
    difficultyTier: 2,
    question: 'Why did the Phoenicians need a simple alphabet when earlier writing systems like cuneiform had hundreds of symbols?',
    options: [
      'Phoenician scribes were not as well educated as Sumerian scribes',
      'Phoenicians were sea traders who needed simple, portable writing anyone could learn quickly for commercial records',
      'Cuneiform was banned in Phoenician territories by the Persian Empire',
      'The Phoenician language had only 22 possible sounds, matching the 22-letter alphabet',
    ],
    correctIndex: 1,
    explanation: 'Cuneiform required years of scribal training to learn thousands of signs. The Phoenicians were seafaring merchants trading across the entire Mediterranean — they needed a writing system that crew members and foreign traders could learn quickly. 22 letters that could spell any word was revolutionary. Practical need drove the most important simplification in communication history.',
  },
  {
    id: 'quiz-phoenician-t3',
    entryId: 'entry-phoenician-alphabet',
    difficultyTier: 3,
    question: 'The Phoenician letter "aleph" (𐤀) represented an ox head — it came from a picture of an ox. Which letter did it become in the Greek and then Latin alphabets?',
    options: [
      'The letter B',
      'The letter A',
      'The letter O',
      'The letter V',
    ],
    correctIndex: 1,
    explanation: 'Phoenician "aleph" (ox head) → Greek "alpha" (flipped sideways) → Latin "A." The original picture of an ox head, rotated 90 degrees, became the pointed "A" shape we still use. "B" came from "beth" (a house floor plan). "C" and "G" came from "gimel" (a camel). Every letter you know contains a 3,000-year-old picture.',
  },

  // ─── entry-braille-invention ─────────────────────────────────────────────────
  {
    id: 'quiz-braille-t1',
    entryId: 'entry-braille-invention',
    difficultyTier: 1,
    question: 'How old was Louis Braille when he invented the Braille system?',
    options: ['7 years old', '15 years old', '30 years old', '21 years old'],
    correctIndex: 1,
    explanation: 'Louis Braille lost his sight in an accident at age 3. He attended the Royal Institute for Blind Youth in Paris, where he encountered a military communication system using raised dots. He adapted and improved it into the 6-dot cell system we still use today — completing his version at approximately age 15.',
  },
  {
    id: 'quiz-braille-t2',
    entryId: 'entry-braille-invention',
    difficultyTier: 2,
    question: 'Braille represents letters using a 6-dot cell — any combination of 6 dots raised or flat. How many different patterns does this create?',
    options: ['12 patterns', '36 patterns', '63 patterns', '64 patterns (63 plus the blank cell)'],
    correctIndex: 3,
    explanation: 'Each of 6 positions can be either raised (1) or flat (0), giving 2⁶ = 64 combinations, including the blank cell. This is enough to encode all letters, numbers, punctuation, and mathematical symbols. Louis Braille intuitively invented a 6-bit binary system — the same mathematical logic that underlies how computers store information today.',
  },
  {
    id: 'quiz-braille-t3',
    entryId: 'entry-braille-invention',
    difficultyTier: 3,
    question: 'Louis Braille invented a complete tactile writing system at 15. Yet the school where he invented it refused to officially adopt Braille until two years after his death. Why does this pattern — brilliant invention, slow institutional adoption — keep repeating throughout history?',
    options: [
      'Schools are especially conservative organizations that resist all changes',
      'Institutions protect existing systems because change is costly and uncertain, even when the new system is clearly better',
      'Braille was not actually better than existing methods and the school was right to be cautious',
      'The legal barriers to changing educational curricula were extremely high in 19th-century France',
    ],
    correctIndex: 1,
    explanation: 'The school\'s sighted teachers had already invested in embossed Latin letters (a system blind readers found harder). Switching to Braille required retraining teachers, reprinting materials, and admitting the old system was inferior. This "institutional inertia" applies to Gutenberg\'s press, Semmelweis\'s handwashing, and countless other innovations: the new idea is not the bottleneck — changing existing systems is. Louis Braille died in 1852; France officially adopted Braille in 1854.',
  },

  // ─── entry-champollion-hieroglyphs ───────────────────────────────────────────
  {
    id: 'quiz-champollion-t1',
    entryId: 'entry-champollion-hieroglyphs',
    difficultyTier: 1,
    question: 'How long had Egyptian hieroglyphs been unreadable before Champollion decoded them in 1822?',
    options: ['About 100 years', 'About 400 years', 'About 1,400 years', 'About 3,000 years'],
    correctIndex: 2,
    explanation: 'Egyptian hieroglyphs fell out of use roughly around 400 CE, when the last known hieroglyphic inscription was carved. By 1822, when Champollion cracked the code, they had been unreadable for approximately 1,400 years. Thousands of years of Egyptian history were locked away in writing no one alive could read.',
  },
  {
    id: 'quiz-champollion-t2',
    entryId: 'entry-champollion-hieroglyphs',
    difficultyTier: 2,
    question: 'What was the key insight that unlocked hieroglyphs for Champollion?',
    options: [
      'Hieroglyphs are a purely pictorial system — each picture means one thing',
      'Hieroglyphs are purely symbolic — each symbol represents an idea, not a sound',
      'Hieroglyphs are a hybrid: some symbols represent sounds (phonetic), others represent ideas (logographic)',
      'Hieroglyphs read right-to-left, not left-to-right like previously assumed',
    ],
    correctIndex: 2,
    explanation: 'Earlier researchers assumed hieroglyphs were purely symbolic (each symbol = a concept). Champollion realized they encoded phonetic sounds AND logographic ideas — a hybrid system. The royal names written inside cartouches (ovals) were spelled phonetically, giving him a foothold. Once he found the sound values, the rest unlocked rapidly.',
  },
  {
    id: 'quiz-champollion-t3',
    entryId: 'entry-champollion-hieroglyphs',
    difficultyTier: 3,
    question: 'Champollion decoding hieroglyphs connects directly to two other entries in Koydo Worlds. Which ones?',
    options: [
      'The Silk Road (trade spread writing systems) and Wikipedia (collaborative decoding)',
      'The Rosetta Stone in the Story Tree (the tool that made decoding possible) and cuneiform clay in the Letter Forge (the context that hieroglyphs were one of several early writing systems)',
      'Zero\'s invention (Champollion used Indian mathematics) and Gutenberg\'s press (he printed his key findings)',
      'Phillis Wheatley (both decoded a system that excluded them) and Homer (both worked in oral tradition before writing)',
    ],
    correctIndex: 1,
    explanation: 'The Rosetta Stone (story-tree world) was the physical key — it had the same text in hieroglyphic, Demotic, and Greek, giving Champollion the parallel texts he needed. Cuneiform clay (letter-forge world, same world as this entry) provides context: multiple independent civilizations developed writing around the same time for similar reasons. Cross-world connections reveal that writing systems are a human universal, not a single invention.',
  },
];
