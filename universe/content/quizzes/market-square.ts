/**
 * Quiz Questions — The Market Square (Tía Carmen Herrera)
 * Financial Literacy / Economics
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const MARKET_SQUARE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ─── entry-lydian-coin ───────────────────────────────────────────────────────
  {
    id: 'quiz-lydian-coin-t1',
    entryId: 'entry-lydian-coin',
    difficultyTier: 1,
    question: 'Who made the world\'s first coins?',
    options: [
      'The Romans, around 300 BCE',
      'The Lydians, in ancient Turkey, around 600 BCE',
      'The Egyptians, when building the pyramids',
      'The Greeks, at the time of the Olympics',
    ],
    correctIndex: 1,
    explanation: 'The Lydians of ancient Anatolia (modern Turkey) minted the world\'s first standardized coins from electrum — a natural gold-silver alloy — around 600 BCE. Their coins were stamped with a lion\'s head to guarantee their value.',
  },
  {
    id: 'quiz-lydian-coin-t2',
    entryId: 'entry-lydian-coin',
    difficultyTier: 2,
    question: 'Why did coins make trade easier than bartering?',
    options: [
      'Coins were lighter than most goods and could be used for anything',
      'Coins made it possible to buy only luxury items',
      'Coins replaced the need for writing contracts',
      'Coins were prettier than grain or cloth',
    ],
    correctIndex: 0,
    explanation: 'Barter requires a "double coincidence of wants" — you need to find someone who has what you want AND wants what you have. Coins with a standard value can be traded for anything. This is called a "medium of exchange" — one of money\'s three core functions.',
  },
  {
    id: 'quiz-lydian-coin-t3',
    entryId: 'entry-lydian-coin',
    difficultyTier: 3,
    question: 'King Croesus, son of the Lydian coin inventor, became so famous for wealth that his name became a saying. What saying?',
    options: [
      '"Croesus\'s folly" — meaning spending too much',
      '"Rich as Croesus" — meaning extraordinarily wealthy',
      '"Croesus\'s coin" — meaning counterfeit money',
      '"Trading like Croesus" — meaning dishonest dealing',
    ],
    correctIndex: 1,
    explanation: '"Rich as Croesus" (sometimes "richer than Croesus") is a phrase still used today for extreme wealth. Croesus, king of Lydia around 560 BCE, controlled trade across the ancient world. His kingdom was eventually conquered by Cyrus the Great of Persia — a reminder that wealth does not equal invincibility.',
  },

  // ─── entry-silk-road ─────────────────────────────────────────────────────────
  {
    id: 'quiz-silk-road-t1',
    entryId: 'entry-silk-road',
    difficultyTier: 1,
    question: 'The Silk Road was not actually one road. What was it?',
    options: [
      'A single path paved with stone from China to Rome',
      'A web of trade routes connecting China, India, the Middle East, and Europe',
      'A canal network in the Persian Empire',
      'A series of ports along the Mediterranean coast',
    ],
    correctIndex: 1,
    explanation: 'The Silk Road (~130 BCE–1453 CE) was a network of overland and maritime trade routes spanning 4,000 miles. Multiple routes went through different cities. Merchants rarely traveled the whole distance — goods passed from trader to trader like a relay.',
  },
  {
    id: 'quiz-silk-road-t2',
    entryId: 'entry-silk-road',
    difficultyTier: 2,
    question: 'Merchants on the Silk Road traded more than goods. What else traveled along these routes?',
    options: [
      'Only silk, since that is what the road was named for',
      'Only spices and precious metals',
      'Religions, technologies, languages, mathematics — and diseases',
      'Only letters and royal messages',
    ],
    correctIndex: 2,
    explanation: 'The Silk Road transmitted Buddhism, Islam, and Christianity across continents. Paper and gunpowder traveled west from China. The Black Death (bubonic plague) also traveled these routes in the 1340s, killing a third of Europe. Trade routes carry both civilization and catastrophe.',
  },
  {
    id: 'quiz-silk-road-t3',
    entryId: 'entry-silk-road',
    difficultyTier: 3,
    question: 'Romans valued silk so highly they imported vast quantities from China — but believed something completely wrong about where it came from. What did they think silk was?',
    options: [
      'Ground-up precious gemstones woven into thread',
      'Hair combed from giant animals in the East',
      'Fiber that grew on trees, like fine wool from a plant',
      'Thread spun from river plants by Chinese monks',
    ],
    correctIndex: 2,
    explanation: 'Romans thought silk grew on trees — they called the Chinese "Seres" (people of the silk tree). They had no idea silk came from silkworm cocoons. China guarded the secret of silk production under penalty of death for centuries. The silk trade created one of history\'s most powerful information asymmetries.',
  },

  // ─── entry-first-paper-money ─────────────────────────────────────────────────
  {
    id: 'quiz-paper-money-t1',
    entryId: 'entry-first-paper-money',
    difficultyTier: 1,
    question: 'Why did China invent paper money in the Tang Dynasty?',
    options: [
      'Because trees were more valuable than metal',
      'Because carrying heavy copper coins for large trades was impractical',
      'Because the emperor wanted a new art form',
      'Because they ran out of metal for coins',
    ],
    correctIndex: 1,
    explanation: 'Chinese merchants used the Silk Road for enormous trade deals. Carrying enough copper coins to pay for a large silk order was physically impossible — too heavy. Paper certificates that could be exchanged for metal at a government bank solved the problem instantly.',
  },
  {
    id: 'quiz-paper-money-t2',
    entryId: 'entry-first-paper-money',
    difficultyTier: 2,
    question: 'Paper money only works if people believe in it. This is called "institutional trust." What makes people trust paper money?',
    options: [
      'The paper itself has value because it is rare',
      'A government or bank promises it can be exchanged for real goods or metal',
      'The pictures on the notes are very beautiful',
      'Paper is lighter than gold, so it is more convenient',
    ],
    correctIndex: 1,
    explanation: 'A paper note has no intrinsic value — it is a promise. The promise is backed by an institution (a bank, a government) that agrees to honor it. When the Mongol Empire printed paper money without enough gold to back it, people stopped trusting it — causing history\'s first documented hyperinflation.',
  },
  {
    id: 'quiz-paper-money-t3',
    entryId: 'entry-first-paper-money',
    difficultyTier: 3,
    question: 'The Mongols caused history\'s first hyperinflation using paper money. What is hyperinflation?',
    options: [
      'When prices fall so low that people stop buying things',
      'When money is printed without real value backing it, causing prices to rise and money to become worthless',
      'When a country invents a new currency',
      'When foreign traders refuse to accept a country\'s money',
    ],
    correctIndex: 1,
    explanation: 'Hyperinflation happens when more money is created than the goods and services it is supposed to represent. More money chasing the same goods means each note buys less. The Mongols\' money-printing caused prices to skyrocket until paper money was worthless. This same cycle has repeated in Zimbabwe (2008) and Venezuela (2018).',
  },

  // ─── entry-double-entry-bookkeeping ─────────────────────────────────────────
  {
    id: 'quiz-bookkeeping-t1',
    entryId: 'entry-double-entry-bookkeeping',
    difficultyTier: 1,
    question: 'What is the main rule of double-entry bookkeeping?',
    options: [
      'Every purchase must be approved by two people',
      'Every time money moves, write it down twice — once where it came from, once where it went',
      'You must have double the money in the bank before spending',
      'Every account must be checked twice a year',
    ],
    correctIndex: 1,
    explanation: 'Double-entry bookkeeping records every transaction in two accounts: a debit in one place, a credit in another. If the two sides don\'t balance, there is an error. This made financial fraud much harder and allowed businesses to know their exact financial health at any time.',
  },
  {
    id: 'quiz-bookkeeping-t2',
    entryId: 'entry-double-entry-bookkeeping',
    difficultyTier: 2,
    question: 'Luca Pacioli codified double-entry bookkeeping in 1494. What else was he?',
    options: [
      'A merchant who invented the stock market',
      'A monk and mathematician — and best friends with Leonardo da Vinci',
      'A Medici banker who went bankrupt',
      'The first governor of the Bank of Florence',
    ],
    correctIndex: 1,
    explanation: 'Luca Pacioli was a Franciscan friar and mathematics professor who published the first comprehensive accounting textbook in 1494. He was close friends with Leonardo da Vinci — Leonardo illustrated the geometric figures in Pacioli\'s next book on proportions.',
  },
  {
    id: 'quiz-bookkeeping-t3',
    entryId: 'entry-double-entry-bookkeeping',
    difficultyTier: 3,
    question: 'Double-entry bookkeeping powered the Italian Renaissance. How?',
    options: [
      'It made art more affordable by reducing trade costs',
      'It enabled banking families like the Medici to lend money across Europe, funding art, architecture, and science',
      'It forced churches to become transparent about their finances',
      'It replaced the Roman numeral system with Arabic numerals',
    ],
    correctIndex: 1,
    explanation: 'Accurate bookkeeping let the Medici Bank (founded 1397) track loans made across multiple cities and countries simultaneously. This reliable financial system generated enormous wealth, which the Medici then spent on patronizing Botticelli, Donatello, Michelangelo, Brunelleschi, and Leonardo da Vinci. Without accounting, no Renaissance.',
  },
];
