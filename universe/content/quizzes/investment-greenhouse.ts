/**
 * Quiz Questions ΓÇö Investment Greenhouse (Jin-ho Park)
 * Economics / Investing / Risk & Reward
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const INVESTMENT_GREENHOUSE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-warren-buffett ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-buffett-t1',
    entryId: 'entry-warren-buffett',
    difficultyTier: 1,
    question: 'How old was Warren Buffett when he bought his very first stock?',
    options: [
      '25 years old',
      '18 years old',
      '11 years old',
      '30 years old',
    ],
    correctIndex: 2,
    explanation: 'Warren Buffett bought his first three shares of stock when he was just 11 years old. He bought them at a low price, watched them rise a little, and sold them for a $5 profit. Then the price went much higher. That early mistake ΓÇö selling too soon out of impatience ΓÇö taught him the most important lesson of his investing life: patience beats timing.',
  },
  {
    id: 'quiz-buffett-t2',
    entryId: 'entry-warren-buffett',
    difficultyTier: 2,
    question: 'Buffett sold his first shares after a small price increase. They then went much higher. What investing lesson did he take from this early mistake?',
    options: [
      'That he should have bought more shares to make a bigger profit on the small increase',
      'That patience ΓÇö holding good investments for a long time ΓÇö produces far better results than reacting to short-term price movements',
      'That young people should not invest until they have more experience',
      'That it is always better to sell quickly before prices can fall again',
    ],
    correctIndex: 1,
    explanation: 'Buffett later described this as one of his most important early lessons. By selling at a small gain, he missed out on far larger returns. He went on to build one of history\'s greatest investing records by doing the opposite ΓÇö buying good companies and holding them for decades, sometimes forever. His quote captures the principle: "The stock market is a device for transferring money from the impatient to the patient."',
  },
  {
    id: 'quiz-buffett-t3',
    entryId: 'entry-warren-buffett',
    difficultyTier: 3,
    question: 'Buffett filed his first tax return at 13, deducting his bicycle as a work expense (he used it for his newspaper delivery business). What does this tell us about how he approached money from a young age?',
    options: [
      'That Buffett was dishonest about deductions that should not be allowed',
      'That from a very young age he thought systematically about money, work, and the rules of financial systems ΓÇö treating every resource as something to be managed and optimised',
      'That newspaper delivery is an unusually good business for children',
      'That bicycle expenses are always tax-deductible in the United States',
    ],
    correctIndex: 1,
    explanation: 'Most 13-year-olds do not file tax returns, let alone strategically claim legitimate business deductions. Buffett\'s early tax filing reveals a mindset that would define his career: systematic, curious, and disciplined thinking about money and the rules governing it. Understanding the rules of financial systems ΓÇö not just how to earn, but how taxation, compounding, and business ownership interact ΓÇö was part of Buffett\'s advantage from the very beginning. Jin-ho places the greenhouse clock on "PATIENCE" to honour this lesson.',
  },

  // ΓöÇΓöÇΓöÇ entry-invention-of-insurance ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-insurance-t1',
    entryId: 'entry-invention-of-insurance',
    difficultyTier: 1,
    question: 'After the Great Fire of London burned down most of the city in 1666, people invented insurance. What is the basic idea behind insurance?',
    options: [
      'The government pays to rebuild anything that burns down',
      'Everyone pays a small amount into a shared pool, so if your home is destroyed, the pool covers the cost of rebuilding',
      'You pay a fee to firefighters before a fire, so they will come faster to your house',
      'Wealthy people lend money to poorer people after disasters',
    ],
    correctIndex: 1,
    explanation: 'Insurance works by spreading risk across many people. Nobody knows whose house will burn down, but statistics tell us roughly how often fires happen. If many people each pay a small amount into a shared pool, the pool will be large enough to help any individual who suffers a disaster ΓÇö without any single person having to face catastrophic loss alone. It is a bet on uncertainty, shared by a community.',
  },
  {
    id: 'quiz-insurance-t2',
    entryId: 'entry-invention-of-insurance',
    difficultyTier: 2,
    question: 'Lloyd\'s of London started as a coffee shop where ship owners gathered to share risk. How does sharing risk make everyone better off?',
    options: [
      'Sharing risk means nobody has to pay anything because the group absorbs all losses',
      'Each person faces a small certain cost (the premium) instead of a small chance of a catastrophic cost ΓÇö certainty, even at a price, has real value',
      'Ship owners at Lloyd\'s never lost their ships after joining',
      'Coffee shops with financial discussions always produce better outcomes than formal banks',
    ],
    correctIndex: 1,
    explanation: 'A ship owner sailing to the Americas might face a 5% chance of total loss ΓÇö catastrophic if it happens. Insurance turns this into a guaranteed small cost: the premium. The ship owner prefers the certainty of a modest, affordable payment to the uncertainty of a small chance of complete ruin. The insurer, by pooling many such bets, can afford to pay out on the 5% of claims because the other 95% of premiums cover the losses. Both sides benefit: security is worth paying for.',
  },
  {
    id: 'quiz-insurance-t3',
    entryId: 'entry-invention-of-insurance',
    difficultyTier: 3,
    question: 'Lloyd\'s today insures satellites, concert cancellations, and celebrity body parts. What does this expansion from ships to satellites reveal about the nature of risk management?',
    options: [
      'That modern insurance companies have run out of sensible things to insure',
      'That the mathematical principles underlying insurance ΓÇö probability, pooling, and pricing risk ΓÇö can be applied to almost any uncertain future event that has financial consequences',
      'That celebrities and satellite companies are careless and need more protection than ordinary people',
      'That insurance only works for very large, expensive objects',
    ],
    correctIndex: 1,
    explanation: 'The core of insurance is not ships or buildings ΓÇö it is the ability to estimate the probability of an event, calculate its potential cost, pool similar risks, and price coverage accordingly. These mathematical principles (actuarial science) generalise to any uncertain outcome. If something might happen, has a measurable probability, and carries a financial cost, insurance can in principle be written for it. From 17th-century coffee shop conversations came a toolkit for managing uncertainty that now covers almost every aspect of modern economic life.',
  },

  // ΓöÇΓöÇΓöÇ entry-zimbabwe-hyperinflation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-invest-zimbabwe-t1',
    entryId: 'entry-zimbabwe-hyperinflation',
    difficultyTier: 1,
    question: 'At the height of Zimbabwe\'s crisis, people needed wheelbarrows of cash to buy bread. Why did this happen?',
    options: [
      'A drought destroyed all the wheat crops so bread became incredibly rare',
      'The government printed so much money that prices doubled almost every day ΓÇö a trillion dollars was worth less than the paper it was printed on',
      'Foreign countries banned Zimbabwe from buying food',
      'All the bread bakers went on strike and refused to sell',
    ],
    correctIndex: 1,
    explanation: 'Zimbabwe\'s government printed enormous amounts of money to fund its spending. When more money chases the same goods, prices rise. In Zimbabwe\'s case, prices rose so fast ΓÇö at its peak, 79.6 billion percent per month ΓÇö that the currency became worthless before you could spend it. A 100-trillion-dollar banknote could not buy a bus ticket. This is called hyperinflation.',
  },
  {
    id: 'quiz-invest-zimbabwe-t2',
    entryId: 'entry-zimbabwe-hyperinflation',
    difficultyTier: 2,
    question: 'When Zimbabwe\'s currency became worthless, people started using US dollars and South African rand instead. What does this tell us about why money has value?',
    options: [
      'That only foreign money is truly valuable',
      'That money\'s value depends entirely on trust ΓÇö when people stopped trusting Zimbabwe\'s currency, they switched to ones they trusted instead',
      'That colourful banknotes are always worth less than plain ones',
      'That small countries cannot have their own currencies',
    ],
    correctIndex: 1,
    explanation: 'Zimbabweans did not stop needing to buy and sell things. They stopped trusting their own currency to hold value from one moment to the next. By switching to foreign currencies that millions of people still trusted, they could continue economic activity. This reveals that money\'s value is not in the paper or the numbers printed on it ΓÇö it is in the collective agreement to trust it. When that agreement breaks, the money becomes worthless regardless of what the government says it is worth.',
  },
  {
    id: 'quiz-invest-zimbabwe-t3',
    entryId: 'entry-zimbabwe-hyperinflation',
    difficultyTier: 3,
    question: 'Zimbabwe\'s 100-trillion-dollar banknote is now worth more as a collector\'s item than it ever was as currency. What does this irony illustrate about the difference between nominal value and real value?',
    options: [
      'That art collectors are foolish for paying money for old banknotes',
      'That nominal value (the number printed on something) and real value (what you can actually exchange it for) can diverge completely when trust collapses ΓÇö the collector pays for rarity and historical curiosity, not currency function',
      'That all old banknotes become valuable collector\'s items eventually',
      'That Zimbabwe should start printing its own currency again to sell to collectors',
    ],
    correctIndex: 1,
    explanation: 'A 100-trillion-dollar note that could not buy bread during hyperinflation now sells to collectors for tens of dollars. Its nominal value (100 trillion) was fictional ΓÇö backed by nothing but a collapsing government promise. Its current collector value is real ΓÇö backed by genuine demand for a historical curiosity. Jin-ho keeps one in the Greenhouse as a reminder that numbers on paper are only as meaningful as the trust and economic reality that backs them up.',
  },

  // ΓöÇΓöÇΓöÇ entry-index-funds ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-index-funds-t1',
    entryId: 'entry-index-funds',
    difficultyTier: 1,
    question: 'What is the main idea behind an index fund?',
    options: [
      'You pick the stocks you think will go up the most and buy only those',
      'Instead of trying to pick winning stocks, you buy a tiny piece of every company in the market at once',
      'You put your money in a savings account that tracks interest rates',
      'A professional investor picks stocks on your behalf for a large fee',
    ],
    correctIndex: 1,
    explanation: 'John Bogle\'s index fund idea is beautifully simple: instead of guessing which individual companies will do best, you buy a small share of every company in the market. If the whole economy grows, your investment grows too. You are not trying to beat the market ΓÇö you are buying the entire market. Bogle described it as: "Don\'t look for the needle in the haystack. Just buy the haystack."',
  },
  {
    id: 'quiz-index-funds-t2',
    entryId: 'entry-index-funds',
    difficultyTier: 2,
    question: 'Most professional fund managers cannot consistently beat a simple index fund over long periods. Why does this matter for ordinary investors?',
    options: [
      'It means ordinary investors should study harder to learn to pick stocks themselves',
      'It means that paying high fees to professionals who mostly fail to outperform the market is not good value ΓÇö a simple low-cost index fund often produces better results with less effort',
      'It means the stock market is random and nobody can make money from investing',
      'It means professional fund managers are dishonest and should not be trusted',
    ],
    correctIndex: 1,
    explanation: 'Actively managed funds charge high fees (1-2% per year) to have professionals pick stocks. But decades of data show that most fail to outperform a simple market index after fees are deducted. A 1% fee might sound small, but over 40 years of investing it can consume a third of your final wealth due to compounding. Bogle\'s insight was that the market average, minus tiny fees, outperforms the average professional manager. This democratised investing for people without large sums or financial expertise.',
  },
  {
    id: 'quiz-index-funds-t3',
    entryId: 'entry-index-funds',
    difficultyTier: 3,
    question: 'Bogle structured Vanguard so that investors own the company that manages their money ΓÇö not outside shareholders. Why was this structural decision as important as the index fund idea itself?',
    options: [
      'Because it made Vanguard the largest company in the world',
      'Because it eliminated the conflict of interest between investor returns and company profits ΓÇö when investors own the company, low fees serve both the investors and the company simultaneously',
      'Because owning the company meant investors did not have to pay any taxes',
      'Because the structure protected Vanguard from losing money during market crashes',
    ],
    correctIndex: 1,
    explanation: 'In a conventional fund company, there is a fundamental conflict: the company profits from high fees, but high fees reduce investor returns. The company\'s interest and the investor\'s interest are opposed. By making Vanguard client-owned ΓÇö so investors are simultaneously the customers and the owners ΓÇö Bogle removed this conflict entirely. Low fees became a structural feature, not a competitive choice that could be reversed when profitable to do so. Jin-ho considers it the most elegant financial design ever created: the incentives are perfectly aligned.',
  },
];
