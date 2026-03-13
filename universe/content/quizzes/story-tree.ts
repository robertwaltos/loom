/**
 * Quiz Questions — The Story Tree (Grandmother Anaya)
 * Storytelling / Narrative
 *
 * 3 questions per entry, distributed across difficulty tiers:
 *  - Tier 1: concrete fact, character name, basic "who/what"
 *  - Tier 2: concept, "why it matters," narrative structure
 *  - Tier 3: historical depth, cross-world connection, synthesis
 */
import type { EntryQuizQuestion } from '../types.js';

export const STORY_TREE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-gilgamesh ─────────────────────────────────────────────────────────
  {
    id: 'quiz-gilgamesh-t1',
    entryId: 'entry-gilgamesh',
    difficultyTier: 1,
    question: 'The Epic of Gilgamesh is the oldest story ever written. Where was it found?',
    options: [
      'Papyrus scrolls in Egypt',
      'Clay tablets in ancient Mesopotamia (modern Iraq)',
      'Stone carvings in ancient Greece',
      'Silk scrolls in ancient China',
    ],
    correctIndex: 1,
    explanation: 'The Epic of Gilgamesh was written on clay tablets in cuneiform script in ancient Mesopotamia around 2100 BCE. The tablets were buried under Nineveh for thousands of years until archaeologists found them in 1853.',
  },
  {
    id: 'quiz-gilgamesh-t2',
    entryId: 'entry-gilgamesh',
    difficultyTier: 2,
    question: 'Gilgamesh goes on a quest for immortality and does not find it. What does he learn instead?',
    options: [
      'That kings are stronger than gods',
      'That human connection and friendship matter more than living forever',
      'That immortality can be found through war',
      'That writing preserves memory and is a form of immortality',
    ],
    correctIndex: 1,
    explanation: 'After traveling to the ends of the earth searching for eternal life, Gilgamesh returns home empty-handed — but changed. The poem suggests that friendship, love, and building things for your community is what makes life worth living. This theme will still be in stories 4,000 years from now.',
  },
  {
    id: 'quiz-gilgamesh-t3',
    entryId: 'entry-gilgamesh',
    difficultyTier: 3,
    question: 'The Epic of Gilgamesh contains a flood story. This matters to scholars because:',
    options: [
      'It proves the Biblical flood happened',
      'It is older than the Biblical flood narrative by over 1,000 years, showing flood myths exist across many cultures',
      'It is less detailed than the Bible\'s version',
      'It was written by the same person who wrote Genesis',
    ],
    correctIndex: 1,
    explanation: 'Gilgamesh\'s flood story predates the Biblical Noah narrative by over 1,000 years. This does not prove either story is "real" — it shows that flood myths are a cross-cultural human pattern. Multiple civilizations created flood narratives independently, suggesting shared concerns about catastrophe, survival, and divine power.',
  },

  // ─── entry-scheherazade ──────────────────────────────────────────────────────
  {
    id: 'quiz-scheherazade-t1',
    entryId: 'entry-scheherazade',
    difficultyTier: 1,
    question: 'How many nights did Scheherazade tell stories?',
    options: ['100 nights', '365 nights', '1001 nights', '500 nights'],
    correctIndex: 2,
    explanation: 'Scheherazade told stories for 1001 nights (also called One Thousand and One Nights or the Arabian Nights). Each night she stopped at the most exciting moment so the king would spare her life to hear the ending the next morning.',
  },
  {
    id: 'quiz-scheherazade-t2',
    entryId: 'entry-scheherazade',
    difficultyTier: 2,
    question: 'Scheherazade used stories as a survival strategy. Which storytelling technique did she use every night?',
    options: [
      'She always ended her story with "The End" so the king felt satisfied',
      'She stopped at the most exciting moment — a "cliffhanger" — so the king needed to hear what happened next',
      'She told the same story differently each night',
      'She had a musician play while she spoke, so the king fell asleep happy',
    ],
    correctIndex: 1,
    explanation: 'Scheherazade invented the cliffhanger. Ending each night at the most exciting moment exploited the king\'s curiosity — and human curiosity about narrative endings is nearly irresistible. This technique is still used in every TV series, novel, and podcast today.',
  },
  {
    id: 'quiz-scheherazade-t3',
    entryId: 'entry-scheherazade',
    difficultyTier: 3,
    question: 'The stories of Aladdin and Ali Baba are NOT in the original Arabic manuscripts. How did they get into "Arabian Nights"?',
    options: [
      'They were discovered on lost tablets in 1900',
      'A French translator named Antoine Galland added them from oral sources in 1704',
      'They were always in the original but in a secret chapter',
      'Scheherazade\'s daughter added them after her mother\'s death',
    ],
    correctIndex: 1,
    explanation: 'Antoine Galland, a French Orientalist, collected and published the first European translation of the Arabian Nights (1704–1717). He added stories like "Aladdin" and "Ali Baba" from Syrian oral sources or invented them himself. For 300 years, Western audiences thought these were ancient Arabic originals.',
  },

  // ─── entry-gutenberg-press ───────────────────────────────────────────────────
  {
    id: 'quiz-gutenberg-t1',
    entryId: 'entry-gutenberg-press',
    difficultyTier: 1,
    question: 'What did Gutenberg\'s printing press change about books?',
    options: [
      'Books became smaller and easier to carry',
      'Books could be made much faster — hundreds instead of one per year',
      'Books finally had pictures for the first time',
      'Books became free for everyone',
    ],
    correctIndex: 1,
    explanation: 'Before Gutenberg, monks hand-copied books — one book per year. A printing press could produce hundreds of books in the same time. Within 50 years of the press\'s invention, over 20 million books were in circulation across Europe. Information became accessible to far more people.',
  },
  {
    id: 'quiz-gutenberg-t2',
    entryId: 'entry-gutenberg-press',
    difficultyTier: 2,
    question: 'What happened to Gutenberg after his printing press became famous?',
    options: [
      'He became the wealthiest man in Germany',
      'He was knighted by the King of Germany',
      'He was sued by his financier and lost his printing equipment to pay debts',
      'He published the first newspaper and retired',
    ],
    correctIndex: 2,
    explanation: 'Johannes Gutenberg did not get rich from his invention. His business partner Johann Fust sued him in 1455, and Gutenberg lost his press and workshop to pay the debt. Fust continued the printing business with his son-in-law. Gutenberg may have died in poverty.',
  },
  {
    id: 'quiz-gutenberg-t3',
    entryId: 'entry-gutenberg-press',
    difficultyTier: 3,
    question: 'The printing press accelerated three major historical events. Which are they?',
    options: [
      'The Black Death, the Crusades, and the Age of Exploration',
      'The Renaissance, the Reformation, and the Scientific Revolution',
      'The French Revolution, the Industrial Revolution, and the American Revolution',
      'The fall of Rome, the rise of Islam, and the invention of universities',
    ],
    correctIndex: 1,
    explanation: 'Cheap printing made it possible to spread the ideas of the Renaissance (humanist texts), Martin Luther\'s Reformation (his 95 Theses spread across Europe in weeks), and the Scientific Revolution (Copernicus, Newton, and Galileo could publish and share discoveries). The press created the modern world of shared public knowledge.',
  },

  // ─── entry-rosetta-stone ─────────────────────────────────────────────────────
  {
    id: 'quiz-rosetta-t1',
    entryId: 'entry-rosetta-stone',
    difficultyTier: 1,
    question: 'What makes the Rosetta Stone special?',
    options: [
      'It is the oldest stone ever found',
      'It says the same thing in three different writing systems',
      'It is the biggest rock in the British Museum',
      'It was written by Cleopatra',
    ],
    correctIndex: 1,
    explanation: 'The Rosetta Stone (196 BCE) has the same royal decree written in three scripts: hieroglyphic (Egyptian sacred script), Demotic (everyday Egyptian), and Ancient Greek. Because scholars could read Greek, they used it as a key to decode hieroglyphics for the first time in 1,400 years.',
  },
  {
    id: 'quiz-rosetta-t2',
    entryId: 'entry-rosetta-stone',
    difficultyTier: 2,
    question: 'Who finally decoded Egyptian hieroglyphs using the Rosetta Stone, in what year?',
    options: [
      'Napoleon Bonaparte, in 1799',
      'Jean-François Champollion, in 1822',
      'Thomas Young, in 1818',
      'Howard Carter, in 1922',
    ],
    correctIndex: 1,
    explanation: 'Jean-François Champollion, a French scholar who had studied Coptic (ancient Egyptian language) since childhood, cracked the hieroglyphic code in 1822. Using the Rosetta Stone\'s parallel texts, he realized hieroglyphs were phonetic AND symbolic — a hybrid system. He reportedly fainted from excitement.',
  },
  {
    id: 'quiz-rosetta-t3',
    entryId: 'entry-rosetta-stone',
    difficultyTier: 3,
    question: 'The Rosetta Stone is currently in the British Museum. Why is this controversial?',
    options: [
      'Because the stone belongs to France, who found it',
      'Because Egypt has been asking for its return since 2003, arguing it was taken during colonization',
      'Because it should be in Mesopotamia, where hieroglyphs were invented',
      'Because three countries claim to have found it simultaneously',
    ],
    correctIndex: 1,
    explanation: 'British forces took the Rosetta Stone from French soldiers in 1801 after Napoleon\'s Egyptian campaign. Egypt considers it a cultural artifact that was removed during the colonial era. Since 2003, Egypt has formally requested its return. The British Museum argues it serves global scholarship in London. This is an ongoing debate about who owns ancient heritage.',
  },
];
