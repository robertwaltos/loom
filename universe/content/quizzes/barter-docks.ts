/**
 * Quiz Questions ΓÇö Barter Docks (Tom├ís Reyes)
 * Economics / History of Money / Trade
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const BARTER_DOCKS_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-double-coincidence ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-double-coincidence-t1',
    entryId: 'entry-double-coincidence',
    difficultyTier: 1,
    question: 'You have apples and want fish. The fisherman wants shoes, not apples. What problem does this show?',
    options: [
      'You need to find a farmer to grow more apples',
      'Pure barter only works when both people want exactly what the other has ΓÇö and that is very hard to arrange',
      'The fisherman is being unfair and should accept apples',
      'Fish and apples cannot be traded because they are both food',
    ],
    correctIndex: 1,
    explanation: 'This is the "double coincidence of wants" problem ΓÇö the reason money was invented. For barter to work, you need to find someone who has exactly what you want AND wants exactly what you have. In a big economy with many products, this is nearly impossible. Money solves this by being something everyone accepts, so you can trade with anyone without needing a perfect match.',
  },
  {
    id: 'quiz-double-coincidence-t2',
    entryId: 'entry-double-coincidence',
    difficultyTier: 2,
    question: 'How does money solve the "double coincidence of wants" problem?',
    options: [
      'Money forces everyone to grow the same crops so there is no confusion',
      'Money acts as a universal intermediary ΓÇö you sell to anyone who wants your goods and buy from anyone who has what you need, without needing a perfect swap partner',
      'Money means you never have to trade at all, only buy things you find on the ground',
      'Money forces traders to agree on prices before they meet',
    ],
    correctIndex: 1,
    explanation: 'Instead of needing a direct swap between two people who each want exactly what the other has, money allows you to sell your apples to whoever wants apples and use the money to buy fish from whoever has fish ΓÇö even if the fisherman has no interest in apples. Money decouples the two sides of every transaction, making trade vastly more efficient.',
  },
  {
    id: 'quiz-double-coincidence-t3',
    entryId: 'entry-double-coincidence',
    difficultyTier: 3,
    question: 'Societies have used salt, tea bricks, cowrie shells, giant stone discs, and cigarettes as money. What does this variety tell us about what makes something "money"?',
    options: [
      'That money must always be made of metal to have real value',
      'That any object can function as money as long as everyone in a community agrees to accept it ΓÇö the material does not determine the value, the agreement does',
      'That ancient people were poor at inventing things and used whatever was nearby',
      'That money must be edible so it has practical value if trade breaks down',
    ],
    correctIndex: 1,
    explanation: 'The astonishing diversity of money forms across history points to one thing: money is defined by collective agreement, not by physical properties. Salt is money when everyone agrees salt is money. Cigarettes are money in prisons when prisoners agree to treat them as currency. The material matters only in that it should be scarce enough not to be easily counterfeited and durable enough to be stored ΓÇö the rest is agreement. Tom├ís keeps a collection of 200 different "monies" to make this point vivid.',
  },

  // ΓöÇΓöÇΓöÇ entry-yapese-rai-stones ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-rai-stones-t1',
    entryId: 'entry-yapese-rai-stones',
    difficultyTier: 1,
    question: 'The people of Yap Island used enormous stone discs as money ΓÇö some as big as a car. How did they use them if the stones were too heavy to move?',
    options: [
      'They only traded with people who lived right next to the stones',
      'They just agreed on who owned which stone ΓÇö the stone stayed in place but ownership changed',
      'They broke the stones into smaller pieces for each trade',
      'They moved the stones using hundreds of people pushing together',
    ],
    correctIndex: 1,
    explanation: 'The Yapese solution was elegant: the stone never moved, but the record of who owned it changed. Everyone in the community knew which stone belonged to which family. When it was traded, everyone simply updated their shared understanding of ownership. The money was the community\'s agreement, not the stone itself.',
  },
  {
    id: 'quiz-rai-stones-t2',
    entryId: 'entry-yapese-rai-stones',
    difficultyTier: 2,
    question: 'One famous rai stone sank to the ocean floor during transport but was still considered valid currency. What does this prove about how money works?',
    options: [
      'That rocks are indestructible and ocean water cannot damage them',
      'That money\'s value comes from collective trust and shared record-keeping, not from the physical presence of the object',
      'That Yapese divers could retrieve the stone whenever needed for a trade',
      'That ocean stones are more valuable than land stones',
    ],
    correctIndex: 1,
    explanation: 'The sunken stone\'s continued validity is one of the most striking demonstrations of monetary theory in history. No one could see or touch it. But everyone on the island knew it existed, knew its history (the effort required to carve and transport it from Palau), and knew who owned it. The collective memory served as the ledger. This anticipates digital money by thousands of years: value stored in a shared record rather than in a physical object.',
  },
  {
    id: 'quiz-rai-stones-t3',
    entryId: 'entry-yapese-rai-stones',
    difficultyTier: 3,
    question: 'A rai stone\'s value was determined partly by its size but also by the story of how hard it was to quarry and transport from Palau, hundreds of kilometres away. How does this compare to how gold gets its value?',
    options: [
      'It does not compare ΓÇö stone and gold are completely different money systems',
      'Both systems assign value based partly on scarcity and partly on the effort and difficulty required to obtain the material ΓÇö effort itself becomes part of the value',
      'Gold is different because it is shiny and stones are not attractive',
      'Gold is more valuable because governments chose it, while rai stones were chosen by ordinary people',
    ],
    correctIndex: 1,
    explanation: 'Gold\'s value has always depended partly on how hard it is to mine and refine ΓÇö scarcity plus effort equals value. The Yapese rai system worked on the same principle: the difficulty of quarrying limestone on Palau and the danger of transporting it by canoe across open ocean was embedded in the stone\'s social value. Both systems reveal that "value" in a monetary object is not arbitrary ΓÇö it is backed by a story of cost, effort, and scarcity that the community recognises.',
  },

  // ΓöÇΓöÇΓöÇ entry-trans-saharan-salt-trade ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-salt-trade-t1',
    entryId: 'entry-trans-saharan-salt-trade',
    difficultyTier: 1,
    question: 'In ancient West Africa, traders exchanged salt pound-for-pound with gold. Why was salt worth so much?',
    options: [
      'Salt was rare everywhere and nobody knew how to make it',
      'In areas with plenty of gold but no salt, salt was scarce and essential ΓÇö its value came from being hard to get there',
      'Salt was used as a weapon in battles and armies needed huge amounts',
      'The king of Mali declared salt the official currency by law',
    ],
    correctIndex: 1,
    explanation: 'Value depends on relative scarcity. West African forests were rich in gold but had no local salt ΓÇö and salt is essential for preserving food and for human health. Meanwhile, the Saharan salt mines had plenty of salt but no gold. Traders who moved between the two regions could exchange salt for gold at remarkable rates, because each commodity was precious where the other was plentiful. Geography created the opportunity.',
  },
  {
    id: 'quiz-salt-trade-t2',
    entryId: 'entry-trans-saharan-salt-trade',
    difficultyTier: 2,
    question: 'The trans-Saharan trade routes financed entire empires ΓÇö Ghana, Mali, and Songhai ΓÇö and the great learning centres at Timbuktu. What does this tell us about the relationship between trade and civilization?',
    options: [
      'That all powerful civilisations were built on salt specifically',
      'That controlling valuable trade routes generates the wealth needed to build institutions, cities, and centres of knowledge',
      'That large empires always develop near deserts',
      'That the scholars at Timbuktu were also merchants who sold salt',
    ],
    correctIndex: 1,
    explanation: 'Trade generates wealth, and wealth funds the infrastructure of civilisation ΓÇö libraries, universities, armies that maintain order, and bureaucracies that can govern large territories. Mali and Songhai controlled the salt-gold exchange routes and became among the wealthiest and most powerful states in the medieval world. Mansa Musa of Mali, considered one of the richest people in all of history, built his fortune on this trade. Timbuktu\'s libraries held hundreds of thousands of manuscripts.',
  },
  {
    id: 'quiz-salt-trade-t3',
    entryId: 'entry-trans-saharan-salt-trade',
    difficultyTier: 3,
    question: 'Timbuktu traders used "silent barter" ΓÇö one side laid out goods and left; the other placed a counter-offer and left. Trades happened without the two sides ever meeting. What economic principle does this demonstrate?',
    options: [
      'That trade is impossible without a shared language',
      'That trade requires mutual trust and established conventions, not necessarily face-to-face interaction or even a shared language',
      'That silent trades always result in unfair prices because no one can negotiate',
      'That the Saharan traders were afraid to speak to each other',
    ],
    correctIndex: 1,
    explanation: 'Silent barter shows that the fundamental requirements of trade are not shared language, personal acquaintance, or even direct negotiation ΓÇö they are trust in the process and agreement on the rules. If you leave your goods and come back to find a counter-offer, you know the other party has respected the convention. Convention replaces conversation. This principle underlies modern stock exchanges, online auctions, and many forms of automated trading where parties never interact directly.',
  },

  // ΓöÇΓöÇΓöÇ entry-barter-modern-crises ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-barter-crises-t1',
    entryId: 'entry-barter-modern-crises',
    difficultyTier: 1,
    question: 'When Argentina\'s money stopped working in 2001, what did millions of people do to keep trading?',
    options: [
      'They used American dollars instead of Argentinian pesos',
      'They joined "trueque" barter clubs and traded skills and goods directly with each other',
      'They stopped buying anything and lived only on food they grew themselves',
      'They waited for the government to fix the money before trading again',
    ],
    correctIndex: 1,
    explanation: 'Over 6 million Argentinians joined community barter clubs called "trueque" ΓÇö Spanish for swap or barter. Instead of money, they traded directly: a plumber fixing your sink in exchange for piano lessons, a baker trading bread for haircuts. These clubs proved that economic life can continue without official currency, as long as community trust and mutual need exist.',
  },
  {
    id: 'quiz-barter-crises-t2',
    entryId: 'entry-barter-modern-crises',
    difficultyTier: 2,
    question: 'Argentina\'s barter clubs also created their own community-made vouchers to use instead of money. How is this similar to how official money works?',
    options: [
      'It is not similar ΓÇö real money is printed by governments and vouchers are not',
      'Both are tokens whose value depends entirely on the trust of the people who agree to use them ΓÇö official currency and community vouchers work on the same principle',
      'Community vouchers are safer than official money because communities are smaller',
      'Vouchers can only be used for food while official money can buy anything',
    ],
    correctIndex: 1,
    explanation: 'Official money and community vouchers work on exactly the same principle: they are tokens that only have value because a group of people agrees they do. When the Argentine government-backed peso lost that trust, communities created their own alternative tokens and backed them with their own trust. The economic activity continued; only the backing changed. This is why Tom├ís says "money is a convenience, not a necessity" ΓÇö what is truly necessary is trust and mutual need.',
  },
  {
    id: 'quiz-barter-crises-t3',
    entryId: 'entry-barter-modern-crises',
    difficultyTier: 3,
    question: 'Similar barter networks emerged in Greece in 2012 and Venezuela during hyperinflation. What does this pattern ΓÇö barter communities forming independently whenever official money fails ΓÇö reveal about economics?',
    options: [
      'That people instinctively return to primitive behaviour in a crisis',
      'That the human need to exchange skills and goods is more fundamental than any particular currency ΓÇö communities will always invent exchange systems when existing ones fail',
      'That barter is always more reliable than money and should replace it everywhere',
      'That economic crises are caused by people choosing to barter instead of using money',
    ],
    correctIndex: 1,
    explanation: 'The independent re-emergence of barter networks in crises around the world reveals something profound: the drive to trade, cooperate, and exchange value is a deep feature of human communities, not a product of any particular economic system. When official systems fail, people build new ones. This shows that money is the technology, but the underlying economic reality is people with different skills and resources finding ways to benefit each other. The tech can be replaced; the need cannot.',
  },
];
