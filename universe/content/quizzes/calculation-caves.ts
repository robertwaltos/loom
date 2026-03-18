/**
 * Quiz Questions ΓÇö Calculation Caves (Cal)
 * Arithmetic / Mental Math
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const CALCULATION_CAVES_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-ishango-bone ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-ishango-t1',
    entryId: 'entry-ishango-bone',
    difficultyTier: 1,
    question: 'Where was the Ishango Bone found, and roughly how old is it?',
    options: [
      'In Egypt, about 5,000 years old',
      'In the Democratic Republic of Congo, about 20,000 years old',
      'In China, about 10,000 years old',
      'In England, about 50,000 years old',
    ],
    correctIndex: 1,
    explanation: 'The Ishango Bone was found in 1950 at a fishing settlement near Lake Edward in what is now the Democratic Republic of Congo. It is about 20,000 years old, making it one of the oldest known mathematical objects ever discovered.',
  },
  {
    id: 'quiz-ishango-t2',
    entryId: 'entry-ishango-bone',
    difficultyTier: 2,
    question: 'Scientists still debate what the carved notches on the Ishango Bone actually mean. What might the notches represent?',
    options: [
      'The bone was used as a knife handle and the notches are grip marks',
      'A lunar calendar, a record of prime numbers, or a tallying system ΓÇö scholars have not agreed on one answer',
      'The number of fish caught each day by the settlement',
      'A prayer message in a very early form of writing',
    ],
    correctIndex: 1,
    explanation: 'Three main hypotheses exist: the notches could be a lunar calendar tracking the Moon\'s phases, a grouping of prime numbers, or a simple tallying system for counting objects. The debate is not settled. Cal loves this ΓÇö mathematics has open questions going back 20,000 years, and the oldest maths artifact we know of is still a mystery.',
  },
  {
    id: 'quiz-ishango-t3',
    entryId: 'entry-ishango-bone',
    difficultyTier: 3,
    question: 'The Ishango Bone predates writing by thousands of years. What does this tell us about the relationship between mathematical thinking and language?',
    options: [
      'Mathematics had to wait for written language before it could develop',
      'Abstract numerical thinking ΓÇö counting, recording, and pattern-making ΓÇö evolved in humans long before written language, suggesting it is a deep and fundamental cognitive ability',
      'The people who made the Ishango Bone had no spoken language either',
      'Mathematics was invented independently after writing in every culture',
    ],
    correctIndex: 1,
    explanation: 'Writing developed roughly 5,000 years ago. The Ishango Bone is 20,000 years old. The person who carved those notches was engaging in deliberate, abstract numerical recording ΓÇö without any writing system. This suggests that counting and mathematical thinking are not products of literacy but a deeper part of how human minds work, shared by people everywhere long before civilisations appeared.',
  },

  // ΓöÇΓöÇΓöÇ entry-al-khwarizmi-algebra ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-al-khwarizmi-t1',
    entryId: 'entry-al-khwarizmi-algebra',
    difficultyTier: 1,
    question: 'What two words used in maths and computing every day come from al-Khwarizmi\'s name and his book?',
    options: [
      'Calculus and geometry',
      'Algebra and algorithm',
      'Equation and theorem',
      'Number and calculation',
    ],
    correctIndex: 1,
    explanation: 'The word "algebra" comes from "al-jabr" in the title of al-Khwarizmi\'s book. The word "algorithm" ΓÇö the set of steps a computer follows ΓÇö comes from the Latin version of his own name, "Algoritmi." Two of the most important concepts in computing today trace back to one mathematician working in Baghdad around 830 CE.',
  },
  {
    id: 'quiz-al-khwarizmi-t2',
    entryId: 'entry-al-khwarizmi-algebra',
    difficultyTier: 2,
    question: 'Al-Khwarizmi worked at the House of Wisdom in Baghdad. What was the House of Wisdom?',
    options: [
      'A royal palace where kings were educated',
      'The greatest centre of learning in the medieval world, where scholars from many cultures collected and expanded scientific knowledge',
      'A religious school that only taught the Quran',
      'A trading post where merchants shared knowledge from different countries',
    ],
    correctIndex: 1,
    explanation: 'The House of Wisdom in Baghdad was a major intellectual centre during the Islamic Golden Age. Scholars there translated works from Greek, Persian, and Indian traditions, and built upon them with new discoveries. It held more scientific texts than any European library of the time. Al-Khwarizmi\'s algebra drew on this rich accumulation of knowledge from across the world.',
  },
  {
    id: 'quiz-al-khwarizmi-t3',
    entryId: 'entry-al-khwarizmi-algebra',
    difficultyTier: 3,
    question: 'Al-Khwarizmi\'s algebra used "unknown numbers as placeholders" to solve problems systematically. Why was this such a powerful idea?',
    options: [
      'It allowed mathematicians to avoid working with large numbers',
      'It turned problem-solving into a general method ΓÇö the same steps could solve any equation of the same form, regardless of the specific numbers involved',
      'It let merchants count money more quickly at markets',
      'It replaced all other mathematical systems that came before it',
    ],
    correctIndex: 1,
    explanation: 'Before algebra, each mathematical problem was solved on its own merits. Al-Khwarizmi\'s insight was to treat the unknown quantity as a placeholder ΓÇö "x" ΓÇö and define systematic steps (an algorithm) to find it. Suddenly, the same procedure could solve any linear or quadratic problem. This moved mathematics from solving individual puzzles to discovering general methods ΓÇö the foundation of every formula and equation used in science and computing today.',
  },

  // ΓöÇΓöÇΓöÇ entry-babylonian-base60 ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-babylonian-t1',
    entryId: 'entry-babylonian-base60',
    difficultyTier: 1,
    question: 'The Babylonians counted in groups of 60. Where do we still use their system today?',
    options: [
      'In the way we count money ΓÇö 100 cents to the dollar',
      'In time ΓÇö 60 seconds in a minute, 60 minutes in an hour ΓÇö and in angles ΓÇö 360 degrees in a circle',
      'In measuring height ΓÇö 60 centimetres per foot',
      'In counting fingers ΓÇö 60 on both hands combined',
    ],
    correctIndex: 1,
    explanation: 'Every time you look at a clock, you are using a number system invented in Mesopotamia about 4,000 years ago. Sixty seconds in a minute, sixty minutes in an hour, 360 degrees in a circle ΓÇö all of these come directly from the Babylonian base-60 system. Ancient mathematics is running your daily life right now.',
  },
  {
    id: 'quiz-babylonian-t2',
    entryId: 'entry-babylonian-base60',
    difficultyTier: 2,
    question: 'Why did the Babylonians choose 60 as their counting base instead of something simpler like 10?',
    options: [
      'They had 60 fingers and toes if you count very carefully',
      '60 has many divisors ΓÇö 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60 ΓÇö making division and fractions simpler with whole numbers',
      'The Babylonian king had 60 children',
      'They used reed bundles to count, and each bundle held 60 reeds',
    ],
    correctIndex: 1,
    explanation: 'Sixty was a practical choice. Because 60 can be divided evenly by so many numbers, it made fractions and calculations cleaner for trade, astronomy, and construction. Our base-10 system can only divide evenly by 1, 2, 5, and 10. The Babylonians chose 60 because it made their mathematics more flexible ΓÇö a brilliant engineering decision that lasted 4,000 years.',
  },
  {
    id: 'quiz-babylonian-t3',
    entryId: 'entry-babylonian-base60',
    difficultyTier: 3,
    question: 'Our clocks, angle measurements, and GPS coordinates all still use the Babylonian base-60 system. What does the persistence of this system reveal about how mathematical conventions work?',
    options: [
      'Base-60 is objectively the best number system and will never be replaced',
      'Once a mathematical convention becomes deeply embedded in technology and society, it persists even as the civilisation that created it disappears ΓÇö systems inherit mathematics across thousands of years',
      'The Babylonians must have had contact with modern scientists who helped preserve their work',
      'All number systems are equally good, so it does not matter which one we use',
    ],
    correctIndex: 1,
    explanation: 'The Babylonian civilisation fell over two thousand years ago, but their number system for time and angles survived because it was embedded in astronomy, navigation, and architecture. Each generation taught the next, and the system was incorporated into new technologies. This is mathematical inheritance: a decision made 4,000 years ago quietly shapes your phone\'s GPS coordinates today.',
  },

  // ΓöÇΓöÇΓöÇ entry-goldbach-conjecture ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-goldbach-t1',
    entryId: 'entry-goldbach-conjecture',
    difficultyTier: 1,
    question: 'Goldbach\'s Conjecture says that every even number bigger than 2 can be written as two prime numbers added together. Which of these is a correct example?',
    options: [
      '10 = 4 + 6',
      '10 = 3 + 7',
      '10 = 5 + 6',
      '10 = 2 + 9',
    ],
    correctIndex: 1,
    explanation: '3 and 7 are both prime numbers (only divisible by 1 and themselves), and 3 + 7 = 10. That fits Goldbach\'s Conjecture exactly. You can check many even numbers ΓÇö 4 = 2+2, 6 = 3+3, 8 = 3+5, 12 = 5+7 ΓÇö it always works for every number anyone has ever tried. But nobody has ever proved it works for every even number forever.',
  },
  {
    id: 'quiz-goldbach-t2',
    entryId: 'entry-goldbach-conjecture',
    difficultyTier: 2,
    question: 'Goldbach\'s Conjecture has been checked for every even number up to 4 quintillion and it has always worked. Why is this not considered a mathematical proof?',
    options: [
      'Computers make calculation errors, so none of those results can be trusted',
      'In mathematics, checking many examples proves the pattern holds for those cases only ΓÇö not that it holds for all possible numbers, including infinitely large ones that have never been tested',
      '4 quintillion is not a large enough number to be mathematically meaningful',
      'The conjecture has actually been disproved but the result was not published',
    ],
    correctIndex: 1,
    explanation: 'Mathematics requires proof that something works for every case, without exception, including numbers far larger than any computer could ever check. "It worked for every number I tried" establishes a pattern but leaves open the possibility that some enormous number, far beyond any computation, might break the rule. A mathematical proof must show why it is true for all numbers ΓÇö and no one has found that proof yet.',
  },
  {
    id: 'quiz-goldbach-t3',
    entryId: 'entry-goldbach-conjecture',
    difficultyTier: 3,
    question: 'A publisher once offered $1 million for a proof of Goldbach\'s Conjecture ΓÇö but the prize expired unclaimed in 2002. What does an unsolved 280-year-old puzzle teach us about mathematics?',
    options: [
      'Mathematics is basically finished ΓÇö only minor details remain to be sorted out',
      'Even the simplest-sounding questions in mathematics can resist centuries of effort, and living with open questions is a fundamental part of what mathematicians do',
      'Modern mathematicians are less capable than those in the 1700s',
      'Goldbach\'s Conjecture is probably false ΓÇö otherwise someone would have proved it by now',
    ],
    correctIndex: 1,
    explanation: 'Goldbach\'s Conjecture is just one sentence long and can be understood by a child ΓÇö yet it has defeated every mathematician who has tried to prove it for 280 years. Mathematics is full of questions like this. Some of the oldest and simplest-sounding problems are the hardest. This is not a failure of mathematics ΓÇö it is what makes it endlessly alive. Cal keeps the Conjecture displayed proudly in the Caves because open questions are invitations, not embarrassments.',
  },
];
