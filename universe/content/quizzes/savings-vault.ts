/**
 * Quiz Questions ΓÇö The Savings Vault (Mr. Abernathy)
 * Economics / Saving / Compound Interest
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const SAVINGS_VAULT_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-piggy-bank-history ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-piggy-bank-t1',
    entryId: 'entry-piggy-bank-history',
    difficultyTier: 1,
    question: 'Why did potters in England start shaping savings jars like pigs?',
    options: [
      'Because pigs are the fastest animals and money grows fast',
      'Because the cheap orange clay was called "pygg" ΓÇö which sounded just like "pig"',
      'Because farmers kept their coins inside real pig pens',
      'Because King Henry ordered all jars to be shaped like pigs',
    ],
    correctIndex: 1,
    explanation: 'In medieval England, cheap orange clay was called "pygg." People stored spare coins in pygg clay jars. Potters eventually started shaping them like actual pigs because the two words sounded alike ΓÇö and a fun tradition was born. The pig shape stuck for over 600 years.',
  },
  {
    id: 'quiz-piggy-bank-t2',
    entryId: 'entry-piggy-bank-history',
    difficultyTier: 2,
    question: 'Why does putting money into a physical piggy bank help people save more?',
    options: [
      'Because coins earn more interest inside a clay jar than a real bank',
      'Because the act of physically separating saved money makes it feel different from spending money',
      'Because piggy banks lock automatically so you cannot take the money out',
      'Because the clay keeps coins cool so they do not wear out',
    ],
    correctIndex: 1,
    explanation: 'Behavioural economics shows that people treat money differently based on which "mental account" it belongs to. Once money goes into the pig, the brain starts thinking of it as saved rather than spendable. The friction of physically breaking the bank to access the money also slows down impulse spending.',
  },
  {
    id: 'quiz-piggy-bank-t3',
    entryId: 'entry-piggy-bank-history',
    difficultyTier: 3,
    question: 'In Guatemala piggy banks are shaped like chickens, and in the Philippines like water buffalo. What does this tell us about the piggy bank principle?',
    options: [
      'That every culture invented saving at a different time',
      'That the specific animal does not matter ΓÇö what matters is the universal human principle of separating saved money from spending money',
      'That chickens and water buffalo are worth more money than pigs',
      'That saving was only invented in countries with farm animals',
    ],
    correctIndex: 1,
    explanation: 'Different cultures chose different animals ΓÇö whatever felt prosperous or familiar to them. But every version of the savings jar uses the same underlying principle: physically isolate your savings so your brain treats them differently. The form varies; the function is universal. This is a powerful example of one idea appearing independently across many cultures.',
  },

  // ΓöÇΓöÇΓöÇ entry-bank-of-amsterdam ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-bank-amsterdam-t1',
    entryId: 'entry-bank-of-amsterdam',
    difficultyTier: 1,
    question: 'What problem did the Bank of Amsterdam solve in 1609?',
    options: [
      'There were too many different coins with different values, making trade very confusing',
      'People were spending too much money on food',
      'Ships kept sinking with gold on board',
      'The king kept stealing everyone\'s coins',
    ],
    correctIndex: 0,
    explanation: 'Every city in Europe had its own coins with different weights and values. Merchants had to spend enormous effort figuring out what each coin was worth. The Bank of Amsterdam accepted all coins, converted them into a standard recorded value, and kept track of everyone\'s balance in a trusted ledger. No more coin chaos.',
  },
  {
    id: 'quiz-bank-amsterdam-t2',
    entryId: 'entry-bank-of-amsterdam',
    difficultyTier: 2,
    question: 'The Bank of Amsterdam\'s "money" was entries in a ledger book, not physical coins. Why was this such an important invention?',
    options: [
      'Because paper is lighter than metal and easier to carry',
      'Because it showed that money could be a record of value rather than a physical object ΓÇö the foundation of modern banking',
      'Because writing in ledgers was faster than counting coins',
      'Because coins went rusty if kept in a vault too long',
    ],
    correctIndex: 1,
    explanation: 'By separating money from physical metal, the Wisselbank showed that money is really just information ΓÇö a trusted record of what you are owed. This abstraction is the foundation of everything from cheques to credit cards to digital payments. Your bank balance today works on exactly the same principle as the Wisselbank\'s ledger did in 1609.',
  },
  {
    id: 'quiz-bank-amsterdam-t3',
    entryId: 'entry-bank-of-amsterdam',
    difficultyTier: 3,
    question: 'The Bank of Amsterdam operated for 170 years, then collapsed due to undisclosed loans to the Dutch East India Company. What does this collapse reveal about financial systems?',
    options: [
      'That money stored in ledgers is always less safe than physical coins',
      'That financial systems are fundamentally trust systems ΓÇö and that trust collapses when records are found to be dishonest',
      'That banks should never lend money to trading companies',
      'That Amsterdam\'s merchants were careless with their savings',
    ],
    correctIndex: 1,
    explanation: 'The bank worked for 170 years because people trusted its records. The moment it was discovered that the bank had made secret loans without depositors\' knowledge ΓÇö and could not repay them ΓÇö trust collapsed entirely. The lesson carries through history to every bank run and financial crisis: financial systems are trust systems, and hidden dishonesty is the most dangerous force they face.',
  },

  // ΓöÇΓöÇΓöÇ entry-compound-interest ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-compound-interest-t1',
    entryId: 'entry-compound-interest',
    difficultyTier: 1,
    question: 'What makes compound interest different from regular interest?',
    options: [
      'You earn interest on your savings AND on the interest you already earned ΓÇö money grows money',
      'Compound interest only works if you have more than $1,000',
      'You get compound interest only if you leave your money in for exactly ten years',
      'Compound interest means the bank pays you every day instead of every year',
    ],
    correctIndex: 0,
    explanation: 'With simple interest, you earn the same amount each year based on your original savings. With compound interest, your earnings get added to your balance ΓÇö so next year you earn interest on a bigger number. Then bigger still. Like Mr. Abernathy\'s savings trees: each tree drops seeds that grow into more trees.',
  },
  {
    id: 'quiz-compound-interest-t2',
    entryId: 'entry-compound-interest',
    difficultyTier: 2,
    question: 'A 25-year-old who saves $5,000 per year ends up with about twice as much at retirement as a 35-year-old who saves the same amount. What explains this big difference?',
    options: [
      'The 25-year-old gets a higher interest rate because they are younger',
      'The extra ten years means each dollar has more time to compound ΓÇö and early money grows the most',
      'The 35-year-old forgets to deposit money some years',
      'The bank rewards people who start early with bonus payments',
    ],
    correctIndex: 1,
    explanation: 'Time is the most powerful ingredient in compound interest. The earliest dollars you save have the most years to compound, so they grow dramatically more than dollars saved later. The Rule of 72 helps show this: divide 72 by your interest rate to find how many years it takes your money to double. At 7%, money doubles every 10 years ΓÇö which means a dollar saved at 25 doubles three times more than one saved at 25 versus one saved at 35.',
  },
  {
    id: 'quiz-compound-interest-t3',
    entryId: 'entry-compound-interest',
    difficultyTier: 3,
    question: '"Compound interest is the eighth wonder of the world" is a famous quote often attributed to Einstein. He probably never said it. Why does Mr. Abernathy still keep the quote?',
    options: [
      'Because Einstein was famous and famous quotes attract attention',
      'Because the quote being apocryphal does not change the underlying mathematical truth ΓÇö compound interest really does produce extraordinary results over time',
      'Because Mr. Abernathy has not yet verified whether Einstein said it',
      'Because children find it easier to remember facts connected to famous people',
    ],
    correctIndex: 1,
    explanation: 'The attribution to Einstein is almost certainly false ΓÇö no verified source links the quote to him. But the math is completely real: exponential growth produces results that feel almost magical. Mr. Abernathy keeps it as a reminder that the principle is powerful regardless of who said it ΓÇö and as a lesson that even great-sounding "facts" should be verified before being trusted.',
  },

  // ΓöÇΓöÇΓöÇ entry-freedmans-bank ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-freedmans-bank-t1',
    entryId: 'entry-freedmans-bank',
    difficultyTier: 1,
    question: 'Why was the Freedman\'s Savings Bank created in 1865?',
    options: [
      'To store gold found after the Civil War',
      'To help formerly enslaved people save money and build financial stability after emancipation',
      'To lend money to Southern plantation owners after the war',
      'To fund the rebuilding of buildings destroyed in the war',
    ],
    correctIndex: 1,
    explanation: 'When formerly enslaved people gained their freedom, they also gained the right to earn and save money for the first time. The Freedman\'s Savings Bank was created by Congress to help them do exactly that ΓÇö to build financial stability and security. At its peak, over 61,000 people had deposited their savings there.',
  },
  {
    id: 'quiz-freedmans-bank-t2',
    entryId: 'entry-freedmans-bank',
    difficultyTier: 2,
    question: 'What happened to the Freedman\'s Bank, and why did it matter so much to its depositors?',
    options: [
      'The bank moved to a different city, making it hard to access',
      'White trustees made reckless investments and committed fraud, causing the bank to collapse and wiping out 61,000 depositors\' savings',
      'The bank ran out of space for all the gold depositors brought in',
      'The US government took the bank\'s money to fund reconstruction projects',
    ],
    correctIndex: 1,
    explanation: 'The bank\'s white trustees made reckless investments and committed fraud. When the bank collapsed in 1874, over 61,000 people ΓÇö many of whom had just recently gained economic freedom for the first time in their lives ΓÇö lost their savings completely. Frederick Douglass, briefly its president, used his own money trying to save it. The betrayal was devastating, and its effects were felt for generations.',
  },
  {
    id: 'quiz-freedmans-bank-t3',
    entryId: 'entry-freedmans-bank',
    difficultyTier: 3,
    question: 'Research shows the Freedman\'s Bank collapse contributed to lasting distrust of financial institutions in Black communities. What does this teach us about financial systems?',
    options: [
      'That Black Americans were wrong to distrust banks after the collapse',
      'That when a financial institution betrays vulnerable people, the damage to trust extends far beyond the money ΓÇö it can shape economic decisions for generations',
      'That financial institutions should only serve people who already have wealth',
      'That bank fraud was unavoidable before modern computers existed',
    ],
    correctIndex: 1,
    explanation: 'The Freedman\'s Bank story shows that financial access is not just about money ΓÇö it is about trust, safety, and the conditions under which people feel secure enough to participate in the financial system. Broken trust is one of the most lasting and damaging outcomes of financial injustice. Mr. Abernathy keeps the bank\'s ledger as a reminder that every vault must earn and maintain the trust of every depositor, especially the most vulnerable.',
  },
];
