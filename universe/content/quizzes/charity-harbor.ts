/**
 * Quiz Questions ΓÇö Charity Harbor (Mei-Lin Wu)
 * Economics / Giving / Philanthropy / Compassion
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const CHARITY_HARBOR_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-effective-altruism ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-effective-altruism-t1',
    entryId: 'entry-effective-altruism',
    difficultyTier: 1,
    question: 'What does "effective altruism" mean?',
    options: [
      'Giving money to whichever charity asks you first',
      'Thinking carefully about how to do the most good with what you have ΓÇö giving where it will help the most people the most',
      'Only giving money to charities you have personally visited',
      'Giving as much money as possible regardless of where it goes',
    ],
    correctIndex: 1,
    explanation: 'Effective altruism is the idea that being generous is most powerful when you also think carefully about where your help will have the biggest impact. If $5,000 can save one life through bed-net distribution to prevent malaria, but the same $5,000 might only provide a single expensive piece of equipment to a local charity, the same generosity does far more good in one place than the other. Mei-Lin keeps a jar of 5,000 glowing pebbles at the harbor entrance to make this concrete.',
  },
  {
    id: 'quiz-effective-altruism-t2',
    entryId: 'entry-effective-altruism',
    difficultyTier: 2,
    question: 'GiveWell found that some charities are hundreds of times more effective than others at saving lives. How is this possible?',
    options: [
      'Less effective charities are dishonest and steal the money',
      'The cost of addressing different problems varies enormously ΓÇö preventing a malaria death costs far less than treating many medical conditions in wealthy countries',
      'More effective charities have larger marketing budgets and therefore receive more donations',
      'Effectiveness only matters for medical charities ΓÇö all other types are equally good',
    ],
    correctIndex: 1,
    explanation: 'The cost of saving a life through different interventions varies dramatically because of differences in the underlying problem. Malaria bed nets are inexpensive, proven to work, and prevent a disease that kills hundreds of thousands of children per year in regions where a few dollars makes an enormous difference. Medical interventions in wealthy countries cost far more per life saved because the conditions are rarer and the treatments are expensive. Same generosity, very different outcomes depending on where it is directed.',
  },
  {
    id: 'quiz-effective-altruism-t3',
    entryId: 'entry-effective-altruism',
    difficultyTier: 3,
    question: 'Effective altruism has been criticised for focusing on measurable outcomes while neglecting systemic change that is harder to quantify. What is the tension this reveals about how to do good?',
    options: [
      'That measuring impact is always wrong and charities should never track their outcomes',
      'That interventions with measurable short-term impact (saving individual lives) can sometimes compete with harder-to-measure systemic changes (addressing root causes) that might help far more people in the long run',
      'That only doctors and scientists can evaluate charity effectiveness',
      'That evidence and compassion are fundamentally incompatible values',
    ],
    correctIndex: 1,
    explanation: 'Effective altruism is strongest at evaluating interventions where outcomes are measurable: lives saved, diseases prevented, incomes raised. It is weaker at evaluating systemic change ΓÇö advocacy, institutional reform, changing power structures ΓÇö where cause and effect are diffuse and the timescale is long. Critics argue that a focus on measurable interventions can distract from addressing the root causes of the problems those interventions treat. Mei-Lin teaches that evidence and impact matter ΓÇö and also that the hardest problems may not be the most easily measured.',
  },

  // ΓöÇΓöÇΓöÇ entry-red-cross-geneva ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-red-cross-t1',
    entryId: 'entry-red-cross-geneva',
    difficultyTier: 1,
    question: 'What did Henry Dunant decide after witnessing the Battle of Solferino in 1859?',
    options: [
      'That wars should be fought faster so fewer soldiers were wounded',
      'That wounded soldiers deserved to be helped regardless of which side they fought on',
      'That armies should carry their own doctors and not need outside help',
      'That Switzerland should never take part in any wars',
    ],
    correctIndex: 1,
    explanation: 'Henry Dunant was a Swiss businessman who came upon the aftermath of the Battle of Solferino and found 40,000 wounded and dying soldiers, largely without medical care. He was horrified. He organised local villagers to help anyone, regardless of which side they fought for, and returned to Switzerland to write a book proposing neutral humanitarian organisations to care for war wounded. By 1863 the Red Cross was founded, and by 1864 the first Geneva Convention provided legal protection for the wounded and for those caring for them.',
  },
  {
    id: 'quiz-red-cross-t2',
    entryId: 'entry-red-cross-geneva',
    difficultyTier: 2,
    question: 'The Red Cross operates under three principles: neutrality, impartiality, and independence. Why are these principles essential to its work?',
    options: [
      'Because governments pay the Red Cross to follow these principles',
      'Because organisations helping in conflict zones can only gain access to all sides if all sides trust that the helpers have no political agenda ΓÇö neutrality is what makes the humanitarian mission possible',
      'Because Red Cross volunteers are not allowed to have any personal opinions',
      'Because the Geneva Conventions legally require all aid organisations to follow these principles',
    ],
    correctIndex: 1,
    explanation: 'In a war, every armed faction controls territory and decides who is allowed in. An organisation that favours one side will be denied access by the other. The Red Cross can operate on all sides of any conflict precisely because all sides trust that it will treat their wounded the same way it treats the enemy\'s wounded. Neutrality is not moral indifference ΓÇö it is the operational requirement for being useful in the worst places. Compromise these principles once and the access that makes the work possible collapses.',
  },
  {
    id: 'quiz-red-cross-t3',
    entryId: 'entry-red-cross-geneva',
    difficultyTier: 3,
    question: 'Dunant won the first Nobel Peace Prize in 1901 but died in a hospice having spent all his money on humanitarian work. What does his story reveal about individual moral conviction and institutional change?',
    options: [
      'That people who give everything to a cause inevitably fail',
      'That one person\'s conviction ΓÇö pursued persistently enough ΓÇö can create institutions that outlast them by centuries and protect millions of people they never met',
      'That Nobel Prize winners are always recognised too late to benefit from the honour',
      'That humanitarian work should be left to governments rather than individuals',
    ],
    correctIndex: 1,
    explanation: 'Dunant had no army, no government backing, no wealth by the end of his life. He had moral conviction and the ability to communicate it clearly enough to persuade others. From one man\'s revulsion at a single battlefield, came an institution that now operates in over 100 countries, has shaped international law through the Geneva Conventions, and has protected millions of people in every major conflict since 1863. Individual conviction, persistently expressed, can become institutional change that lasts for generations. Mei-Lin says: "He gave everything ΓÇö including the prize money."',
  },

  // ΓöÇΓöÇΓöÇ entry-carnegie-gospel-of-wealth ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-carnegie-t1',
    entryId: 'entry-carnegie-gospel-of-wealth',
    difficultyTier: 1,
    question: 'Andrew Carnegie became very wealthy making steel, then gave most of it away. What is he most famous for building?',
    options: [
      '2,509 public libraries around the world',
      'The largest steel factory in America',
      'A hospital for steel workers in Pennsylvania',
      'Schools for children in Scotland',
    ],
    correctIndex: 0,
    explanation: 'Carnegie gave away approximately $350 million (worth roughly $10 billion today), and his most visible legacy is 2,509 public libraries that he funded in countries around the world ΓÇö including many he never visited. He believed that libraries gave ordinary people access to the knowledge they needed to improve their lives, regardless of wealth. Mei-Lin keeps a model Carnegie library at the harbor dock because she believes every port needs a library.',
  },
  {
    id: 'quiz-carnegie-t2',
    entryId: 'entry-carnegie-gospel-of-wealth',
    difficultyTier: 2,
    question: 'Carnegie\'s "Gospel of Wealth" (1889) argued that wealthy people have a moral duty to give away their surplus riches. But the Homestead Strike of 1892 showed workers being killed in his steel mills. What tension does this create?',
    options: [
      'No tension ΓÇö what happens in a factory is completely separate from what owners do with their profits',
      'Carnegie built wealth through labour exploitation while arguing that wealth redistribution through philanthropy fulfils the rich person\'s moral obligation ΓÇö raising the question of whether giving can substitute for justice in how the wealth was made',
      'The tension is easily resolved by the fact that Carnegie gave more than he kept',
      'Workers at Carnegie\'s mills supported the Homestead Strike to protest his philanthropy',
    ],
    correctIndex: 1,
    explanation: 'Carnegie paid workers as little as possible, broke strikes with hired guards, and workers died at Homestead in 1892. Then he gave away his fortune to build libraries and universities. This raises a persistent ethical question in philanthropy: can generous giving compensate for the harm done in the accumulation of the wealth being given away? The libraries are genuinely valuable ΓÇö they democratised access to knowledge for millions. But they do not undo the conditions in Carnegie\'s mills. Mei-Lin teaches both his generosity and his contradictions.',
  },
  {
    id: 'quiz-carnegie-t3',
    entryId: 'entry-carnegie-gospel-of-wealth',
    difficultyTier: 3,
    question: 'Carnegie\'s Gospel of Wealth influenced the modern "Giving Pledge" where billionaires promise to give away most of their wealth. Critics say philanthropy should not substitute for systemic change. What is the argument?',
    options: [
      'That billionaire philanthropy is always dishonest and should be banned',
      'That privately directed philanthropy concentrates power to shape public goods (education, medicine, policy) in the hands of a few unelected individuals ΓÇö even when the intentions are good, this raises democratic accountability concerns',
      'That philanthropy can only work when billionaires have earned their money ethically',
      'That the Giving Pledge should require billionaires to give to government tax funds instead',
    ],
    correctIndex: 1,
    explanation: 'When a billionaire funds universities, shapes medical research priorities, or backs policy advocacy through their foundation, they are making decisions that affect large numbers of people ΓÇö without those people having any democratic say. Even genuinely well-intentioned philanthropy concentrates decision-making power over public goods in private hands. The critique is not that giving is bad; it is that some decisions should be made through democratic processes accountable to citizens, not through private wealth deployment accountable only to the donor\'s values and priorities.',
  },

  // ΓöÇΓöÇΓöÇ entry-zakat ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-zakat-t1',
    entryId: 'entry-zakat',
    difficultyTier: 1,
    question: 'What is Zakat, and who must give it?',
    options: [
      'A voluntary donation Muslims make when they feel like being generous',
      'A mandatory 2.5% annual donation on accumulated savings, required of every Muslim who has wealth above a minimum threshold',
      'A tax paid to the government in Muslim-majority countries',
      'A gift given at religious festivals to family members',
    ],
    correctIndex: 1,
    explanation: 'Zakat is one of the Five Pillars of Islam ΓÇö the core practices that define the faith. It requires every Muslim who has wealth above a minimum amount (called nisab) to give 2.5% of their accumulated savings each year to people in need. Unlike optional charity (sadaqah), Zakat is a religious obligation. The word "Zakat" comes from the Arabic root meaning "to purify" ΓÇö the idea is that giving away part of your wealth purifies the rest.',
  },
  {
    id: 'quiz-zakat-t2',
    entryId: 'entry-zakat',
    difficultyTier: 2,
    question: 'Zakat has operated as a structured wealth redistribution system for over 1,400 years ΓÇö predating modern welfare states by centuries. What does this reveal about Islamic economic thought?',
    options: [
      'That Islam was invented as an economic system rather than a religion',
      'That Islamic tradition embedded care for the vulnerable structurally into religious obligation, recognising long before modern governments that systematic redistribution is necessary for social cohesion',
      'That 1,400 years ago economies were so simple that 2.5% could solve all poverty',
      'That modern welfare states copied the Zakat system directly',
    ],
    correctIndex: 1,
    explanation: 'Zakat makes wealth redistribution not a personal virtue but a structural feature of the faith. By embedding it in religious obligation, it operates consistently regardless of whether individuals feel generous in any particular year. The system predates modern income tax and social security by over a millennium. This is a sophisticated solution to the problem of social solidarity: make care for others a duty rather than a discretionary act, and it becomes reliable rather than dependent on goodwill.',
  },
  {
    id: 'quiz-zakat-t3',
    entryId: 'entry-zakat',
    difficultyTier: 3,
    question: 'Mei-Lin explores Zakat alongside Christian tithing, Buddhist dana, and secular progressive taxation. What does this cross-cultural comparison reveal about human societies?',
    options: [
      'That all religions have identical economic teachings',
      'That every major human civilisation has developed structured systems for redistributing wealth ΓÇö suggesting that care for the vulnerable is a universal human value, even though the mechanisms differ widely',
      'That religious systems of giving are always more effective than secular ones',
      'That comparing religious practices is disrespectful and should be avoided',
    ],
    correctIndex: 1,
    explanation: 'Zakat, Christian tithing, Buddhist dana, Jewish tzedakah, and secular progressive taxation are radically different in their theological grounding, mechanisms, and percentages ΓÇö but they all address the same fundamental question: how should a society ensure that those who have less are not simply abandoned by those who have more? The independent emergence of structured giving systems across unconnected civilisations suggests this is a universal human concern. The form varies; the underlying moral intuition ΓÇö that society has obligations to its vulnerable members ΓÇö is found almost everywhere humans have organised themselves into communities.',
  },
];
