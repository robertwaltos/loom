/**
 * Quiz Questions ΓÇö Entrepreneur's Workshop (Diego Montoya-Silva)
 * Economics / Entrepreneurship / Innovation
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const ENTREPRENEUR_WORKSHOP_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-madam-cj-walker ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-walker-t1',
    entryId: 'entry-madam-cj-walker',
    difficultyTier: 1,
    question: 'How much money did Madam C. J. Walker earn per day when she started her working life?',
    options: [
      '$100 a day as a seamstress',
      '$1.50 a day as a washerwoman',
      '$50 a day selling food at a market stall',
      'She did not work before starting her business',
    ],
    correctIndex: 1,
    explanation: 'Sarah Breedlove ΓÇö later known as Madam C. J. Walker ΓÇö was born to parents who had been enslaved and spent years working as a washerwoman earning $1.50 a day. From that starting point, she created her own hair care products and built a business empire that made her a millionaire. It is one of the most remarkable stories of entrepreneurship in American history.',
  },
  {
    id: 'quiz-walker-t2',
    entryId: 'entry-madam-cj-walker',
    difficultyTier: 2,
    question: 'Walker\'s breakthrough was not just the hair care product itself ΓÇö it was how she sold it. What was the innovation in her business model?',
    options: [
      'She opened the largest shop in Indianapolis and sold everything in one location',
      'She trained thousands of "Walker Agents" ΓÇö mostly Black women ΓÇö to sell her products and earn their own income through commissions',
      'She advertised on radio stations, which was new technology at the time',
      'She gave the products away free for a year to build a loyal customer base',
    ],
    correctIndex: 1,
    explanation: 'Walker did not just sell a product ΓÇö she built a distribution network that gave economic independence to the people who sold it. By training thousands of agents, mostly Black women who faced their own economic exclusion, she multiplied both her reach and their opportunity. Her model anticipated modern direct sales by decades and made her agents as important as the product itself.',
  },
  {
    id: 'quiz-walker-t3',
    entryId: 'entry-madam-cj-walker',
    difficultyTier: 3,
    question: 'Walker donated heavily to Black schools, orphanages, and anti-lynching campaigns. How does this extend the definition of "entrepreneurship"?',
    options: [
      'It does not ΓÇö donating money is separate from business and should be kept apart',
      'It shows that entrepreneurship can be a tool for social change ΓÇö building wealth not just for oneself but to reshape the conditions that held others back',
      'It shows that successful businesses must donate to charity to stay popular',
      'It means Walker was more of a politician than an entrepreneur',
    ],
    correctIndex: 1,
    explanation: 'Walker used business as a deliberate instrument of social justice ΓÇö building personal wealth, redistributing it into community institutions, and creating economic opportunity for other Black women. Her portrait above Diego\'s door with the caption "Started with $1.50" captures the starting point. Her donations capture the purpose: entrepreneurship at its most powerful is not just about personal gain but about reshaping the world.',
  },

  // ΓöÇΓöÇΓöÇ entry-failure-wall ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-failure-wall-t1',
    entryId: 'entry-failure-wall',
    difficultyTier: 1,
    question: 'How many times did Thomas Edison fail before inventing the working light bulb?',
    options: [
      'About 10 times',
      'Exactly 100 times',
      'About 10,000 times',
      'He never failed ΓÇö he got it right on the first try',
    ],
    correctIndex: 2,
    explanation: 'Thomas Edison is said to have tried approximately 10,000 approaches before finding one that worked for the light bulb. Rather than calling these "failures," he famously described them as finding 10,000 ways that didn\'t work ΓÇö each one a piece of learning that brought him closer to the answer. Diego frames his own failures and hangs them on the Workshop wall for the same reason.',
  },
  {
    id: 'quiz-failure-wall-t2',
    entryId: 'entry-failure-wall',
    difficultyTier: 2,
    question: 'About 90% of new businesses fail. What is the most common reason?',
    options: [
      'The owners were not intelligent enough to run a business',
      'Building something that nobody actually wants ΓÇö about 42% of startup failures',
      'Running out of ideas after the first year',
      'Governments making it too expensive to start a business',
    ],
    correctIndex: 1,
    explanation: 'The number one reason startups fail ΓÇö around 42% of cases ΓÇö is building something nobody wants. Not bad management, not lack of money, not competition. Simply solving a problem that does not exist or that customers do not care about enough to pay for. This is why Diego teaches that every failed prototype in the Workshop has a tag explaining what went wrong. The most important thing to learn first is whether anyone actually needs what you are building.',
  },
  {
    id: 'quiz-failure-wall-t3',
    entryId: 'entry-failure-wall',
    difficultyTier: 3,
    question: 'James Dyson made 5,127 vacuum prototypes before his design worked. How does systematic failure analysis ΓÇö recording what went wrong each time ΓÇö differ from just trying again randomly?',
    options: [
      'Systematic failure analysis takes longer and usually produces worse results',
      'Recording what failed and why means each attempt builds on the last ΓÇö you eliminate known dead ends and move methodically toward what works',
      'It is only useful in manufacturing, not in other kinds of businesses or ideas',
      'Systematic analysis stops you from being creative because it makes you follow rules',
    ],
    correctIndex: 1,
    explanation: 'Random retrying wastes effort because you might repeat the same mistake. Systematic failure analysis ΓÇö what engineers call a "post-mortem" and what Diego demonstrates with his tagged prototypes ΓÇö ensures that each failure teaches you something permanent. Dyson\'s 5,127 prototypes were not 5,127 random attempts; each was a documented experiment that narrowed the space of possibilities. This is the scientific method applied to invention.',
  },

  // ΓöÇΓöÇΓöÇ entry-the-pivot ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-pivot-t1',
    entryId: 'entry-the-pivot',
    difficultyTier: 1,
    question: 'What did the team building the video game accidentally create instead ΓÇö which became one of the most popular work tools in the world?',
    options: [
      'A social media website called Twitter',
      'A messaging tool called Slack, used by millions of people for work',
      'A photo-sharing app called Instagram',
      'A video-sharing website called YouTube',
    ],
    correctIndex: 1,
    explanation: 'A team at a video game company built an internal messaging tool to help their team communicate while making the game. When the game failed, they looked at what they had built and realised the messaging tool itself was far more useful. They turned it into Slack ΓÇö a "pivot" from game to communication software. Slack\'s full name stands for Searchable Log of All Conversation and Knowledge.',
  },
  {
    id: 'quiz-pivot-t2',
    entryId: 'entry-the-pivot',
    difficultyTier: 2,
    question: 'Instagram started as a location check-in app called Burbn. YouTube started as a video dating site. What do these pivots suggest about the relationship between original ideas and successful outcomes?',
    options: [
      'That original ideas are always wrong and should be abandoned as fast as possible',
      'That some of the most successful products emerged from noticing what actually worked in an early version, not from sticking rigidly to the original plan',
      'That location apps and dating sites are bad business ideas',
      'That the best entrepreneurs are lucky rather than skilled',
    ],
    correctIndex: 1,
    explanation: 'The pivot is not about abandoning good thinking ΓÇö it is about using evidence. The Burbn team noticed that users ignored the check-in features but loved uploading and sharing photos. They pivoted to Instagram by following what their users were actually doing. Diego calls the pivot "the entrepreneur\'s most underrated skill" because it requires both the humility to admit the original plan is not working and the vision to see what could work instead.',
  },
  {
    id: 'quiz-pivot-t3',
    entryId: 'entry-the-pivot',
    difficultyTier: 3,
    question: 'Eric Ries formalised the concept of the pivot in "The Lean Startup" by saying that plans are hypotheses, not commitments. Why is this mental shift important for entrepreneurs?',
    options: [
      'Because it gives entrepreneurs an excuse to give up on hard problems',
      'Because treating a plan as a hypothesis means gathering evidence before fully committing resources ΓÇö reducing waste and increasing the chance of finding what actually works',
      'Because academic books always improve business outcomes when followed carefully',
      'Because entrepreneurs who change plans are better liked by investors',
    ],
    correctIndex: 1,
    explanation: 'A hypothesis is something you test. A commitment is something you are locked into regardless of evidence. Treating a business plan as a hypothesis means running small, cheap experiments to check whether your assumptions are correct ΓÇö and changing direction when the evidence tells you to. This approach ΓÇö "validated learning" ΓÇö dramatically reduces the cost of being wrong, because you discover mistakes when they are still affordable to fix.',
  },

  // ΓöÇΓöÇΓöÇ entry-patent-law ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-patent-t1',
    entryId: 'entry-patent-law',
    difficultyTier: 1,
    question: 'What does a patent do for an inventor?',
    options: [
      'It gives the inventor free materials to build their invention',
      'It officially protects the inventor\'s idea so nobody else can copy it for a certain number of years',
      'It guarantees that the invention will be successful in the market',
      'It pays the inventor a salary while they work on their invention',
    ],
    correctIndex: 1,
    explanation: 'A patent is a legal agreement between an inventor and the public. The inventor reveals exactly how their invention works ΓÇö adding knowledge to the world ΓÇö and in exchange, nobody else can use or copy that invention without permission for about 20 years. This gives inventors time to benefit from their own ideas before others can compete with the same design.',
  },
  {
    id: 'quiz-patent-t2',
    entryId: 'entry-patent-law',
    difficultyTier: 2,
    question: 'The US Patent Act of 1790 was one of America\'s very first laws, and Thomas Jefferson personally reviewed the first patents. Why did a new nation make intellectual property protection one of its first priorities?',
    options: [
      'Because the founding fathers were all inventors who wanted to protect themselves',
      'Because encouraging innovation was seen as essential to the new nation\'s economic strength ΓÇö inventors needed the security to take risks',
      'Because Britain had banned all US patents and America needed to fight back',
      'Because the first president required all citizens to file a patent for their job',
    ],
    correctIndex: 1,
    explanation: 'The founders understood that new nations grow through innovation, and innovation requires risk. If anyone could immediately copy your invention the moment you revealed it, few would invest the time and money to invent in the first place. Patent protection gives inventors the security to share their knowledge publicly ΓÇö disclosure in exchange for temporary exclusivity. America\'s first patent was for a method of making potash. Thomas Jefferson reviewed it personally.',
  },
  {
    id: 'quiz-patent-t3',
    entryId: 'entry-patent-law',
    difficultyTier: 3,
    question: 'Critics argue that patents on medicines can price life-saving drugs beyond the reach of patients who need them. What fundamental tension does this reveal about the patent system?',
    options: [
      'That medicine should never be invented by private companies',
      'That the patent bargain ΓÇö temporary exclusivity in exchange for public knowledge ΓÇö can conflict with public welfare when the protected product is essential to life',
      'That patents only work for physical inventions, not medicines',
      'That pharmaceutical companies have always been dishonest about drug prices',
    ],
    correctIndex: 1,
    explanation: 'The patent system was designed to balance two goods: rewarding inventors (so innovation happens) and spreading knowledge (so society benefits). This balance works well for most inventions. But when the protected product is a medicine that people will die without, the temporary monopoly can become a barrier to life. Patent trolls ΓÇö companies that buy patents purely to sue others rather than to build anything ΓÇö show another way the system can be exploited. Diego teaches that every protection system has trade-offs that society must keep watching.',
  },
];
