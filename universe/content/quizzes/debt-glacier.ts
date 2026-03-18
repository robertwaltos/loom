/**
 * Quiz Questions ΓÇö Debt Glacier (Elsa Lindgren)
 * Economics / Borrowing / Debt Management
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const DEBT_GLACIER_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-concept-of-interest ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-interest-t1',
    entryId: 'entry-concept-of-interest',
    difficultyTier: 1,
    question: 'When you borrow money, why do you have to pay back more than you borrowed?',
    options: [
      'Because lenders are greedy and take advantage of borrowers',
      'Because the extra amount ΓÇö called interest ΓÇö is like rent for using someone else\'s money while they wait to get it back',
      'Because money loses value over time if it sits still',
      'Because banks add a fee to help pay for the building',
    ],
    correctIndex: 1,
    explanation: 'Interest is the cost of borrowing ΓÇö essentially, rent for money. When someone lends you their money, they cannot use it for something else while you have it. Interest compensates them for this opportunity cost and for the risk that you might not pay it back. The Sumerians invented this idea 5,000 years ago. Their word for interest ΓÇö "mas" ΓÇö also meant "calf": borrow a cow, return it with a calf. The concept has not changed since.',
  },
  {
    id: 'quiz-interest-t2',
    entryId: 'entry-concept-of-interest',
    difficultyTier: 2,
    question: 'Islam prohibits interest (called "riba") and uses profit-sharing arrangements instead. What does the existence of alternative systems teach us about interest?',
    options: [
      'That interest is wrong in all economic systems and should be abolished',
      'That interest is one solution to the problem of compensating lenders ΓÇö but not the only possible solution, and different cultures have developed different answers based on their values',
      'That Islamic banking never works as well as interest-based banking',
      'That profit-sharing is a newer invention that will eventually replace interest everywhere',
    ],
    correctIndex: 1,
    explanation: 'The existence of Islamic finance alongside interest-based finance shows that the underlying problem ΓÇö how to share economic benefit fairly between lenders and borrowers ΓÇö can be solved in different ways. Profit-sharing arrangements (where the lender receives a proportion of profits rather than a fixed interest payment) distribute risk differently: if the business fails, both lender and borrower share the loss. Interest does not have to be the only model. Elsa respects all systems and teaches the principles behind each.',
  },
  {
    id: 'quiz-interest-t3',
    entryId: 'entry-concept-of-interest',
    difficultyTier: 3,
    question: 'Evidence of interest payments appears on Sumerian clay tablets from 3000 BCE ΓÇö 5,000 years ago. What does the independent discovery of interest across many ancient civilisations suggest?',
    options: [
      'That ancient civilisations traded with each other and copied the idea',
      'That the need to compensate lenders for time, risk, and opportunity cost is a universal economic problem that every complex society must solve ΓÇö and most arrive at similar solutions',
      'That Sumerian priests invented interest as a religious practice that spread globally',
      'That ancient interest rates were lower than modern ones because life was simpler',
    ],
    correctIndex: 1,
    explanation: 'Interest emerged independently in Mesopotamia, ancient Greece, Rome, China, and South Asia ΓÇö because the underlying economic problem it solves (compensating a lender for the use of their resources over time) exists in any society complex enough to have lending. When the same solution appears independently across civilisations, it suggests the solution is not arbitrary but reflects a genuine structural need. Understanding why interest exists ΓÇö not just that it does ΓÇö is the foundation of understanding debt.',
  },

  // ΓöÇΓöÇΓöÇ entry-credit-score ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-credit-score-t1',
    entryId: 'entry-credit-score',
    difficultyTier: 1,
    question: 'What is a credit score, and what is it used for?',
    options: [
      'A score in a card game that determines how much credit you win',
      'A number based on your history of paying back money that lenders use to decide whether to lend to you, and at what interest rate',
      'A score given by the government measuring how good a citizen you are',
      'A measure of how much money you currently have in your bank account',
    ],
    correctIndex: 1,
    explanation: 'A credit score is a three-digit number (typically 300-850 on the FICO scale) that summarises your borrowing history ΓÇö whether you repay on time, how much you owe, and how long you have been borrowing. Lenders use it to estimate how risky it is to lend to you. A higher score means more trust, which means you can borrow at lower interest rates. A lower score means higher rates ΓÇö or being refused entirely.',
  },
  {
    id: 'quiz-credit-score-t2',
    entryId: 'entry-credit-score',
    difficultyTier: 2,
    question: 'Before the FICO score was invented in 1956, banks made loan decisions based on "gut feeling." What problem did this create, and how did the FICO score attempt to solve it?',
    options: [
      'Gut feelings took too long, causing queues at banks. Scores made lending faster',
      'Gut feelings allowed banker prejudice ΓÇö discrimination based on race, gender, or neighbourhood. The score replaced personal judgment with data about actual repayment behaviour',
      'Gut feelings were too accurate and banks did not want to lend to safe borrowers',
      'The FICO score was invented to help people who had never borrowed money before',
    ],
    correctIndex: 1,
    explanation: 'Pre-FICO lending was highly subjective ΓÇö and that subjectivity allowed systematic discrimination. Black Americans, women, and people from certain neighbourhoods were routinely denied credit regardless of their actual financial responsibility. The FICO score replaced personal judgment with a data-driven formula based on actual repayment history. This reduced some forms of discrimination. However, it also preserved historical inequities: communities denied credit for decades started the scoring era with thinner, weaker credit histories, creating a new form of systemic disadvantage.',
  },
  {
    id: 'quiz-credit-score-t3',
    entryId: 'entry-credit-score',
    difficultyTier: 3,
    question: 'Credit scoring reduced some discrimination but created new problems. Communities historically denied credit ended up with lower scores due to thinner credit histories. What does this illustrate about algorithmic systems?',
    options: [
      'That algorithms are always fairer than human judgment',
      'That algorithms can encode and perpetuate historical injustices ΓÇö if the data they are trained on reflects a discriminatory past, the algorithm reproduces that discrimination in new form',
      'That credit scores should be abolished because no system can be fair',
      'That algorithmic systems are only unfair when deliberately designed to be',
    ],
    correctIndex: 1,
    explanation: 'The FICO score illustrates a fundamental challenge in algorithmic decision-making: if a system is trained on historical data produced by an unjust system, it will learn and reproduce the injustices embedded in that data. Communities excluded from credit for decades have shorter credit histories; shorter histories produce lower scores; lower scores continue to restrict credit access. The score improved fairness by removing overt personal prejudice ΓÇö but did not eliminate structural disadvantage. This is a lesson that applies far beyond finance, to hiring algorithms, school admission systems, and anywhere data from an imperfect past is used to make decisions about the future.',
  },

  // ΓöÇΓöÇΓöÇ entry-2008-financial-crisis ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-2008-crisis-t1',
    entryId: 'entry-2008-financial-crisis',
    difficultyTier: 1,
    question: 'In 2008, banks lent money to many people who could not afford to pay it back. What happened when those people could not make their payments?',
    options: [
      'The banks just wrote off the loans and everything was fine',
      'The banks ran out of money, causing a chain of failures that spread problems around the whole world',
      'The government arrested all the borrowers for not paying',
      'The housing prices went up and the loans became more valuable',
    ],
    correctIndex: 1,
    explanation: 'Banks had lent huge amounts to homebuyers who could not actually afford the payments ΓÇö called subprime mortgages. When millions of borrowers defaulted, the banks holding those loans found that the loans were worthless. Banks that had borrowed heavily to fund these loans went bankrupt. Because banks around the world had bought bundled versions of these bad loans, the crisis spread globally. Millions of people lost their homes. It was the worst financial crisis since the 1930s.',
  },
  {
    id: 'quiz-2008-crisis-t2',
    entryId: 'entry-2008-financial-crisis',
    difficultyTier: 2,
    question: 'Banks bundled thousands of risky mortgages into complex financial products called CDOs and sold them to investors. Why did this make the crisis worse when it came?',
    options: [
      'Because CDOs were illegal and the government had to confiscate them',
      'Because bundling spread the risk invisibly throughout the global financial system ΓÇö when the mortgages failed, losses appeared everywhere simultaneously and nobody knew who was exposed',
      'Because CDOs could only be sold in America, concentrating all the risk in one place',
      'Because investors refused to buy CDOs, leaving banks with no cash',
    ],
    correctIndex: 1,
    explanation: 'CDOs were marketed as safe by hiding risky mortgages inside complex bundles rated as low-risk. Investors worldwide bought them believing they were safe. When the underlying mortgages failed, every institution holding CDOs suffered losses simultaneously. Because nobody knew exactly how exposed each bank was, banks stopped lending to each other ΓÇö fear froze the entire financial system. The opacity of the product turned a housing problem into a global financial collapse.',
  },
  {
    id: 'quiz-2008-crisis-t3',
    entryId: 'entry-2008-financial-crisis',
    difficultyTier: 3,
    question: 'Iceland\'s response to its bank collapse was unusual: it let the banks fail, protected regular depositors, and jailed some bankers. Most other countries bailed out their banks. Why did Iceland\'s approach differ, and what were the consequences?',
    options: [
      'Iceland could not afford to bail out banks because it is a small country',
      'Iceland prioritised protecting its citizens over protecting its financial institutions, accepting short-term economic pain in exchange for faster recovery and genuine accountability for wrongdoing',
      'Iceland\'s banks were too small to be worth saving',
      'The Icelandic government did not understand how banking worked',
    ],
    correctIndex: 1,
    explanation: 'Most countries chose to bail out their banks with public money to prevent a total collapse ΓÇö a decision that prevented immediate catastrophe but rewarded reckless behaviour and left ordinary citizens paying for bankers\' mistakes. Iceland chose differently: let the banks fail, protect depositors, prosecute the wrongdoers. Iceland suffered a sharp recession but recovered faster than many countries that chose bailouts. Elsa keeps an Icelandic kr├│na as a reminder that there are different ways to respond to a financial crisis ΓÇö and that accountability matters.',
  },

  // ΓöÇΓöÇΓöÇ entry-student-debt ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-student-debt-t1',
    entryId: 'entry-student-debt',
    difficultyTier: 1,
    question: 'Why do many students borrow money to go to university?',
    options: [
      'Because universities require all students to take out loans regardless of their wealth',
      'Because in many countries university costs are high, and students borrow money now to pay for education they hope will help them earn more later',
      'Because student loans have zero interest and are essentially free money',
      'Because studying is so time-consuming that students cannot work while learning',
    ],
    correctIndex: 1,
    explanation: 'University education can cost tens of thousands of pounds or dollars. Most students do not have that money upfront, so they borrow it ΓÇö taking on debt now with the expectation that the education will help them earn more in the future. This is an investment in yourself: you are betting that your future earnings will more than cover the cost of the loan. But it is still debt, with interest, and it takes years to repay.',
  },
  {
    id: 'quiz-student-debt-t2',
    entryId: 'entry-student-debt',
    difficultyTier: 2,
    question: 'Germany and Norway offer free or very low-cost university education funded by taxes. The US has very high student debt. What question lies at the heart of this difference?',
    options: [
      'Whether universities in Europe are as good as universities in America',
      'Who should pay for education ΓÇö the individual student who benefits, or society as a whole through taxation, because society also benefits from an educated population',
      'Whether taxes are higher in Germany than in the United States',
      'How many universities a country needs to have',
    ],
    correctIndex: 1,
    explanation: 'The student debt debate is really a debate about what kind of good education is. If education is primarily a private benefit (the graduate earns more), then the graduate should pay. If education is primarily a public good (society benefits from educated doctors, engineers, and teachers), then society should fund it through taxes. Neither position is obviously wrong ΓÇö the difference is a value judgment about who benefits and who should bear the cost. Elsa presents both sides honestly.',
  },
  {
    id: 'quiz-student-debt-t3',
    entryId: 'entry-student-debt',
    difficultyTier: 3,
    question: 'In medieval Europe, the Church funded universities and education was largely free. Elsa says: "The history of education funding is the history of who society believes deserves to learn." What does she mean?',
    options: [
      'That medieval education was better than modern education',
      'That every funding model reflects a set of assumptions about which people are entitled to education, what education is for, and who is responsible for providing it',
      'That all education should be funded by religious institutions',
      'That free education always existed and was only recently made expensive',
    ],
    correctIndex: 1,
    explanation: 'Medieval Church-funded universities educated clergy ΓÇö a specific, chosen group. Later, fee-paying institutions educated those who could pay. Public universities opened access to the middle class. Student debt systems now extend access but load individuals with the cost. Each model reflects who the society thought deserved education and who should pay. A society that funds education through taxes is saying: everyone who qualifies deserves access, and all taxpayers share responsibility. One that charges tuition is saying: education is an individual investment and individuals should bear the cost. Both are values choices, not neutral technical decisions.',
  },
];
