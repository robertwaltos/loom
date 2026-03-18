/**
 * Quiz Questions ΓÇö Needs & Wants Bridge (Nia Oduya)
 * Economics / Decision-Making / Values / Consumer Psychology
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const NEEDS_WANTS_BRIDGE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-maslows-hierarchy ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-maslow-t1',
    entryId: 'entry-maslows-hierarchy',
    difficultyTier: 1,
    question: 'Abraham Maslow said human needs come in layers, like a pyramid. What is at the very bottom ΓÇö the most basic layer?',
    options: [
      'Becoming the best version of yourself',
      'Having lots of friends who like you',
      'Food, water, and shelter ΓÇö the basics needed to survive',
      'Feeling respected and admired by others',
    ],
    correctIndex: 2,
    explanation: 'At the bottom of Maslow\'s pyramid are physiological needs ΓÇö food, water, warmth, and shelter. These are the foundations: if they are not met, everything else becomes much harder to think about. Above these come safety, belonging and friendship, self-esteem, and finally self-actualisation ΓÇö becoming the best version of yourself. Nia\'s Bridge is shaped like this pyramid, with stronger stone blocks at the base.',
  },
  {
    id: 'quiz-maslow-t2',
    entryId: 'entry-maslows-hierarchy',
    difficultyTier: 2,
    question: 'Some cultures prioritise community and belonging above individual achievement. Why has Maslow\'s pyramid been criticised for this reason?',
    options: [
      'Because Maslow was not a real psychologist and his ideas have never been tested',
      'Because the pyramid assumes individual self-actualisation is the highest goal ΓÇö but many cultures value community contribution equally or more highly',
      'Because community is always less important than personal achievement in modern life',
      'Because Maslow wrote the hierarchy before psychology existed as a proper science',
    ],
    correctIndex: 1,
    explanation: 'Maslow developed his hierarchy in 1940s America, which has an individualist cultural tradition. In many Indigenous, East Asian, and African cultural contexts, the highest form of human development is understood as community contribution, collective harmony, or spiritual connection ΓÇö not individual self-actualisation. The hierarchy is a useful starting framework, but treating it as a universal truth ignores the genuine diversity in how different cultures understand human flourishing.',
  },
  {
    id: 'quiz-maslow-t3',
    entryId: 'entry-maslows-hierarchy',
    difficultyTier: 3,
    question: 'Nia owns exactly 42 possessions. She says above 42, each item takes more time to manage than the joy it gives. How does this connect to the idea of needs versus wants?',
    options: [
      'Because 42 is a scientifically proven maximum for human happiness',
      'Because it illustrates that possessions have diminishing returns ΓÇö at some point, more stuff creates more management burden than satisfaction, suggesting many "wants" do not actually improve life',
      'Because people with fewer possessions are always happier than people with many',
      'Because owning fewer things is required by Maslow\'s hierarchy to reach self-actualisation',
    ],
    correctIndex: 1,
    explanation: 'Nia\'s 42-possession rule is not a universal truth ΓÇö she says the number is arbitrary. The principle it demonstrates is real: beyond a certain point, possessions require maintenance, storage, organisation, and mental attention that exceeds the pleasure they provide. This is the practical case for distinguishing needs from wants: not moral judgment, but honest accounting of whether acquiring something will actually improve your life, or just create more complexity.',
  },

  // ΓöÇΓöÇΓöÇ entry-planned-obsolescence ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-planned-obsolescence-t1',
    entryId: 'entry-planned-obsolescence',
    difficultyTier: 1,
    question: 'What does "planned obsolescence" mean?',
    options: [
      'When a company plans to go out of business in the future',
      'When products are deliberately made to break or become outdated faster, so customers buy new ones more often',
      'When a product is so popular it runs out and becomes hard to find',
      'When companies plan new products years in advance before releasing them',
    ],
    correctIndex: 1,
    explanation: 'Planned obsolescence is the practice of deliberately designing products to stop working or become outdated sooner than they technically need to ΓÇö so that customers need to buy replacements. The Phoebus Cartel of 1924 was a group of light bulb manufacturers who secretly agreed to limit their bulbs\' lifespans to 1,000 hours, even though technology existed for 2,500-hour bulbs. More frequent replacements meant more sales.',
  },
  {
    id: 'quiz-planned-obsolescence-t2',
    entryId: 'entry-planned-obsolescence',
    difficultyTier: 2,
    question: 'A light bulb in a Livermore, California fire station has been burning since 1901 ΓÇö over 120 years. The Phoebus Cartel formed in 1924 to shorten bulb lifespans. What does this timeline prove?',
    options: [
      'That old light bulbs are better than modern ones in every way',
      'That the technology for very long-lasting bulbs existed before manufacturers deliberately chose to shorten lifespans ΓÇö planned obsolescence was a commercial choice, not a technical limitation',
      'That the fire station\'s electricity supply is so strong it keeps the bulb burning',
      'That Livermore has a special type of glass that makes bulbs last longer',
    ],
    correctIndex: 1,
    explanation: 'The Livermore bulb predates the cartel\'s lifespan limits by over two decades and has outlasted them by over a century. This is Nia\'s most powerful evidence: the engineers already knew how to make long-lasting bulbs. The short lifespan of modern bulbs was a deliberate design choice made to protect profit margins, not the best engineering could do. Understanding this transforms the question from "why does my phone battery die?" to "who decided it should?"',
  },
  {
    id: 'quiz-planned-obsolescence-t3',
    entryId: 'entry-planned-obsolescence',
    difficultyTier: 3,
    question: 'The "right to repair" movement campaigns for laws requiring manufacturers to provide replacement parts and repair manuals. How does this movement connect to planned obsolescence?',
    options: [
      'It is unrelated ΓÇö the right to repair is about recycling, not product lifespan',
      'It is a direct consumer response to planned obsolescence: if repair is easy and cheap, products last longer and companies cannot profit as much from artificially shortened lifespans',
      'The right to repair movement wants to make all products free',
      'It is supported by manufacturers because repairs generate more revenue than replacements',
    ],
    correctIndex: 1,
    explanation: 'Planned obsolescence is most effective when products are impossible or expensive to repair ΓÇö if parts are unavailable, if the product is glued shut, or if the software is locked. The right to repair movement challenges this by demanding that consumers have access to the tools, parts, and information needed to fix their own devices. A repaired product is a product not repurchased. By making repair practical, the movement directly counters the commercial logic of planned obsolescence and forces consideration of lifetime cost and environmental impact.',
  },

  // ΓöÇΓöÇΓöÇ entry-diderot-effect ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-diderot-t1',
    entryId: 'entry-diderot-effect',
    difficultyTier: 1,
    question: 'Denis Diderot received a beautiful new dressing gown. What happened next?',
    options: [
      'He was so happy with the gown that he stopped buying anything else',
      'His old furniture suddenly looked shabby next to the gown, so he replaced everything in his home one piece at a time',
      'He gave the gown away to someone who needed it more',
      'He sold the gown and used the money to buy books',
    ],
    correctIndex: 1,
    explanation: 'The new scarlet gown was so fine that Diderot\'s old furniture, desk, curtains, and decorations suddenly looked inadequate by comparison. He replaced them one by one ΓÇö spending far more money than he could afford ΓÇö until his home matched the gown\'s elegance. He later wrote an essay regretting it: "I was the master of my old gown. I am the slave of my new one." This cascade of purchases from one upgrade is now called the Diderot Effect.',
  },
  {
    id: 'quiz-diderot-t2',
    entryId: 'entry-diderot-effect',
    difficultyTier: 2,
    question: 'Have you ever gotten new trainers and then felt your old bag looked wrong? Or upgraded your phone and then wanted new headphones? What is the Diderot Effect doing here?',
    options: [
      'Making you confused about what you actually like',
      'Creating a cascade: one upgrade makes everything around it look inadequate, generating pressure to upgrade everything else in the same "set"',
      'Making you more likely to return the new item to the shop',
      'Teaching you that old items are always inferior to new ones',
    ],
    correctIndex: 1,
    explanation: 'The Diderot Effect works by creating a perceived mismatch: if one item in your "set" (clothes, room, gadgets) is much better than the others, the contrast makes the others feel inadequate. Your brain wants coherence. Marketers understand this well ΓÇö it is why phone companies release coordinated accessories, why fashion brands sell complete outfits, and why home improvement projects always seem to expand. Recognising the pattern is the first step to deciding consciously whether the cascade is worth starting.',
  },
  {
    id: 'quiz-diderot-t3',
    entryId: 'entry-diderot-effect',
    difficultyTier: 3,
    question: 'Anthropologist Grant McCracken named the Diderot Effect in 1988. He noted that it explains "lifestyle inflation" ΓÇö spending more as income rises. How does understanding this pattern help with financial decision-making?',
    options: [
      'It helps people feel better about spending more money as they earn more',
      'It reveals that many spending decisions are driven by social comparison and perceived mismatch rather than genuine need ΓÇö awareness of the pattern allows you to pause before starting a cascade',
      'It explains why rich people are always happier than poor people',
      'It proves that buying things is always psychologically harmful',
    ],
    correctIndex: 1,
    explanation: 'Once you can name the Diderot Effect, you can spot when it is happening to you. The next time a new purchase makes your existing possessions feel inadequate, you can ask: "Is this feeling genuinely telling me something is wrong, or is my brain running the Diderot cascade?" Often the older items are objectively fine ΓÇö only the comparison has changed. This awareness does not require not buying anything new; it requires buying from deliberate intention rather than reactive cascade. Nia has the quote inscribed on the Bridge\'s centre beam as a constant prompt.',
  },

  // ΓöÇΓöÇΓöÇ entry-hedonic-treadmill ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-hedonic-treadmill-t1',
    entryId: 'entry-hedonic-treadmill',
    difficultyTier: 1,
    question: 'You get a new toy and it feels amazing for a week. Then it feels ordinary. This is called hedonic adaptation. What does it mean?',
    options: [
      'That the toy was secretly broken and stopped working',
      'That people get used to new things and return to their normal level of happiness',
      'That you only enjoy toys when they are brand new',
      'That expensive toys always feel better than cheap ones for longer',
    ],
    correctIndex: 1,
    explanation: 'Hedonic adaptation means that after any change ΓÇö getting something new, or losing something ΓÇö humans tend to return to their baseline level of happiness. The excitement of something new fades as it becomes the new normal. This is why the next new thing always seems like it will make you happier than it actually does. Recognising this cycle is the first step to getting off the treadmill.',
  },
  {
    id: 'quiz-hedonic-treadmill-t2',
    entryId: 'entry-hedonic-treadmill',
    difficultyTier: 2,
    question: 'Researchers found that lottery winners and people who became paraplegic both returned to roughly their baseline happiness within a year. What does this striking result reveal?',
    options: [
      'That big events never have any real impact on how people feel',
      'That humans are remarkably adaptable ΓÇö both to dramatic good fortune and to serious loss ΓÇö and that long-term happiness depends more on personality and mindset than on circumstances',
      'That winning the lottery is no better than not winning it in any way',
      'That happiness is impossible to study scientifically',
    ],
    correctIndex: 1,
    explanation: 'Philip Brickman and Donald Campbell\'s famous 1978 study found that both groups ΓÇö despite their radically different life changes ΓÇö returned to near their original happiness levels. This does not mean the events had no impact; it means baseline happiness is remarkably stable. The implication for spending is significant: the thing you buy to make yourself happy will deliver a temporary boost, then happiness returns to where it was. The treadmill keeps you running but never lets you arrive.',
  },
  {
    id: 'quiz-hedonic-treadmill-t3',
    entryId: 'entry-hedonic-treadmill',
    difficultyTier: 3,
    question: 'Studies show that experiences (a trip, a concert, a meal with friends) produce longer-lasting happiness than material purchases. Why would experiences resist hedonic adaptation better than objects?',
    options: [
      'Because experiences always cost more money and higher cost means higher value',
      'Because memories of experiences improve over time and cannot become "ordinary" the way a physical object sitting on a shelf can',
      'Because experiences are only available to wealthy people, making them feel more special',
      'Because objects cause allergies in many people, reducing long-term satisfaction',
    ],
    correctIndex: 1,
    explanation: 'An object sits in your environment and becomes background. A memory lives in your mind and is reconstructed each time you recall it ΓÇö often growing warmer with time as difficult details fade and good ones remain. The meal you had with friends cannot turn into wallpaper. Research also shows that anticipating an experience generates happiness in advance, and that shared experiences create social bonds that compound in value. Nia points toward the "Experiences" path on the Bridge for exactly this reason.',
  },
];
