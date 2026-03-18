/**
 * Quiz Questions ΓÇö Tax Office (Sam Worthington)
 * Economics / Taxation / Public Finance
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const TAX_OFFICE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-why-taxes-exist ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-why-taxes-t1',
    entryId: 'entry-why-taxes-exist',
    difficultyTier: 1,
    question: 'What do taxes pay for?',
    options: [
      'Presents for the king or president',
      'Things everyone shares ΓÇö roads, schools, hospitals, fire trucks, and parks',
      'Wages for the soldiers only, and nothing else',
      'The taxes stay in a vault and are never spent',
    ],
    correctIndex: 1,
    explanation: 'Taxes are the money a community pools together to pay for shared services that nobody could afford to build alone. Roads connect everyone. Schools educate everyone\'s children. Fire trucks protect every neighbourhood. By each person contributing a little, the whole community gets a lot ΓÇö things that would be impossible for any individual to provide for themselves.',
  },
  {
    id: 'quiz-why-taxes-t2',
    entryId: 'entry-why-taxes-exist',
    difficultyTier: 2,
    question: 'Philosophers John Locke and Jean-Jacques Rousseau called taxes part of the "Social Contract." What does that term mean?',
    options: [
      'A written document that all citizens must sign before paying taxes',
      'The agreement between citizens and government: people give up some money and freedom, and in return the government provides protection and public services',
      'A law that forces everyone to pay the same amount in taxes',
      'A contract that only wealthy people must sign',
    ],
    correctIndex: 1,
    explanation: 'The Social Contract is the idea that societies work because of an implicit agreement: citizens give the government the authority to collect taxes and make rules, and in exchange the government uses that money and authority to protect people and provide services that benefit everyone. If the government breaks the contract ΓÇö for example by spending taxes corruptly ΓÇö citizens have the right to demand change or resist.',
  },
  {
    id: 'quiz-why-taxes-t3',
    entryId: 'entry-why-taxes-exist',
    difficultyTier: 3,
    question: 'Sam keeps a giant jar where everyone deposits a token, and at the end of the day the jar buys something for the whole group. What economic concept does this demonstrate?',
    options: [
      'That larger groups always make better decisions than smaller ones',
      'Collective action: individually small contributions can pool into resources large enough to provide goods that no individual could afford alone',
      'That tokens are more reliable than money',
      'That children are better at saving than adults',
    ],
    correctIndex: 1,
    explanation: 'The jar demonstration shows the core logic of taxation in miniature. No single child\'s token could buy much. But combined, the tokens create purchasing power that benefits the whole group. This is why public goods ΓÇö like road networks, defence systems, or national health services ΓÇö can only exist through collective contribution. The math works because the benefit is shared by everyone, which means each person\'s share of the cost is small relative to their share of the benefit.',
  },

  // ΓöÇΓöÇΓöÇ entry-progressive-vs-flat-tax ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-progressive-tax-t1',
    entryId: 'entry-progressive-vs-flat-tax',
    difficultyTier: 1,
    question: 'What is the difference between a progressive tax and a flat tax?',
    options: [
      'Progressive taxes are paid monthly; flat taxes are paid once a year',
      'In a progressive tax, people who earn more pay a higher percentage; in a flat tax, everyone pays the same percentage',
      'Progressive taxes are only for businesses; flat taxes are only for people',
      'In a flat tax, the amount owed stays the same even if prices go up',
    ],
    correctIndex: 1,
    explanation: 'A progressive tax scales with income ΓÇö the more you earn, the higher the percentage you pay. A flat tax applies the same percentage to everyone regardless of income. Most countries use progressive systems on the principle that people with higher incomes can afford to contribute a larger share. Flat tax advocates argue that equal percentages are fairer because everyone is treated identically.',
  },
  {
    id: 'quiz-progressive-tax-t2',
    entryId: 'entry-progressive-vs-flat-tax',
    difficultyTier: 2,
    question: 'Critics of flat tax say that charging the same percentage to everyone is not truly fair. What is the argument?',
    options: [
      'That identical percentages are mathematically impossible to calculate',
      'That 10% of a small income leaves very little for necessities, while 10% of a large income still leaves plenty ΓÇö the same rate has very different real impacts on rich and poor',
      'That flat taxes always cause governments to run out of money',
      'That nobody who earns a lot would agree to pay the same percentage as a poor person',
    ],
    correctIndex: 1,
    explanation: 'The "ability to pay" principle is the core argument for progressive taxation. If someone earns ┬ú10,000 a year and pays 10%, they have ┬ú9,000 left ΓÇö barely enough to live. If someone earns ┬ú1,000,000 and pays 10%, they have ┬ú900,000 left ΓÇö a very comfortable life. Equal percentages create unequal real burdens. Progressive taxation attempts to match the burden to the capacity to absorb it.',
  },
  {
    id: 'quiz-progressive-tax-t3',
    entryId: 'entry-progressive-vs-flat-tax',
    difficultyTier: 3,
    question: 'Sam runs a simulation where children vote on flat versus progressive taxation ΓÇö and every class votes differently. What does this consistent variation reveal about the nature of tax policy debates?',
    options: [
      'That children are not educated enough to make the correct choice',
      'That tax fairness involves genuine value trade-offs ΓÇö between equal treatment and equal impact ΓÇö and that reasonable people can disagree depending on what they prioritise',
      'That flat taxes are more popular in younger age groups',
      'That the simulation is designed to produce random results',
    ],
    correctIndex: 1,
    explanation: 'The consistent variation across classes is the lesson, not a problem. Tax policy is not a maths problem with one right answer ΓÇö it is a values question. People who prioritise equal treatment (everyone faces the same rules) tend to favour flat taxes. People who prioritise equal burden (everyone makes a comparable sacrifice) tend to favour progressive taxes. Both are coherent positions. Understanding that legitimate disagreement on values exists ΓÇö and that it drives real policy differences ΓÇö is essential civic literacy.',
  },

  // ΓöÇΓöÇΓöÇ entry-boston-tea-party ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-boston-tea-t1',
    entryId: 'entry-boston-tea-party',
    difficultyTier: 1,
    question: 'What did American colonists do to protest the Tea Act in 1773?',
    options: [
      'They wrote a polite letter to the King asking him to lower taxes',
      'They dumped 342 chests of tea into Boston Harbor',
      'They refused to drink tea and switched to drinking coffee',
      'They sailed to England to argue their case in Parliament',
    ],
    correctIndex: 1,
    explanation: 'On the night of December 16, 1773, a group of colonists disguised as Mohawk Indians boarded three ships in Boston Harbor and threw 342 chests of tea into the water. The tea was worth roughly $1.7 million in today\'s money. This act of protest directly helped spark the American Revolution.',
  },
  {
    id: 'quiz-boston-tea-t2',
    entryId: 'entry-boston-tea-party',
    difficultyTier: 2,
    question: 'The colonists\' rallying cry was "No taxation without representation." What did this actually mean?',
    options: [
      'That the colonists refused to pay any taxes whatsoever under any circumstances',
      'That the colonists were not against taxes in principle ΓÇö they were against being taxed by a Parliament they had no vote in and no way to influence',
      'That the colonists wanted to tax British merchants in return',
      'That representation in Parliament was a tax that the colonists did not want to pay',
    ],
    correctIndex: 1,
    explanation: 'This is the key distinction Sam emphasises: the issue was voice, not money. The colonists accepted that governments need taxes to function. What they rejected was being taxed by a body ΓÇö the British Parliament ΓÇö that they had no representatives in and therefore no power to influence or hold accountable. "No taxation without representation" is a statement about democratic consent, not a statement against taxation itself. It became a founding principle of American democracy.',
  },
  {
    id: 'quiz-boston-tea-t3',
    entryId: 'entry-boston-tea-party',
    difficultyTier: 3,
    question: 'The Boston Tea Party established that taxation requires the consent of the governed. How does this principle appear in modern democratic systems?',
    options: [
      'Most countries no longer follow this principle and governments can tax without elections',
      'Citizens vote for representatives who set tax rates on their behalf ΓÇö elected governments have consent to tax; unelected ones do not',
      'The principle was abandoned after the American Revolution ended',
      'Citizens vote directly on every individual tax law in a referendum',
    ],
    correctIndex: 1,
    explanation: 'The revolutionary principle ΓÇö that those who are taxed must have a say in how taxes are set ΓÇö is now embedded in democratic systems worldwide through representative government. You vote for legislators, and those legislators decide tax rates. If you dislike their decisions, you vote them out. This is the chain of consent: not direct approval of every tax, but elected representatives who are accountable to voters. The colonial objection was that this chain was broken ΓÇö they were taxed by people they had no power to elect or remove.',
  },

  // ΓöÇΓöÇΓöÇ entry-how-countries-spend-taxes ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-tax-spending-t1',
    entryId: 'entry-how-countries-spend-taxes',
    difficultyTier: 1,
    question: 'How can you tell what a country cares about most without reading their speeches or laws?',
    options: [
      'By looking at how many people live there',
      'By looking at where the government spends its tax money',
      'By counting how many wars it has fought',
      'By checking how big the capital city is',
    ],
    correctIndex: 1,
    explanation: 'Government budgets are moral documents ΓÇö they reveal priorities in numbers. A country that spends heavily on schools and healthcare values education and public wellbeing. One that spends heavily on defence values military security. You can say anything in a speech, but where the money goes reflects the actual choices. Sam teaches that reading a budget is more informative than reading campaign promises.',
  },
  {
    id: 'quiz-tax-spending-t2',
    entryId: 'entry-how-countries-spend-taxes',
    difficultyTier: 2,
    question: 'Nordic countries like Sweden and Norway collect taxes worth 45-55% of their GDP but rank at the top of global happiness surveys. What does this suggest about the relationship between tax rates and quality of life?',
    options: [
      'That higher taxes always make people happier, so every country should raise taxes',
      'That high tax rates can be associated with high quality of life when the money funds universal services that reduce anxiety and inequality',
      'That people in Nordic countries do not mind paying taxes because they earn very high wages',
      'That happiness surveys are not reliable measures of anything real',
    ],
    correctIndex: 1,
    explanation: 'Nordic countries use high tax revenue to provide universal healthcare, free university education, generous parental leave, and strong social safety nets. These services remove financial anxiety from many of life\'s biggest stress points ΓÇö illness, education costs, job loss. The result is a population with high baseline security. This does not mean all high-tax systems produce happiness ΓÇö how the money is spent matters as much as how much is collected.',
  },
  {
    id: 'quiz-tax-spending-t3',
    entryId: 'entry-how-countries-spend-taxes',
    difficultyTier: 3,
    question: 'Sam gives children 100 coins to allocate as a national budget, and no two groups ever spend it the same way. What does this exercise reveal about democracy and taxation?',
    options: [
      'That children should not be involved in decisions about money',
      'That budget allocation reflects underlying value choices ΓÇö and in a democracy, citizens with different values will always reach different conclusions about the right way to spend public money',
      'That tax policy is too complicated for ordinary people to understand',
      'That governments should let children set national budgets',
    ],
    correctIndex: 1,
    explanation: 'Every budget allocation requires choosing between competing goods: more on education means less on defence, more on healthcare means less on infrastructure. These are not technical errors ΓÇö they are value trade-offs. In a democracy, the role of elections is to put people in office who reflect the community\'s values on these trade-offs. Understanding that budgets are value statements ΓÇö not neutral technical documents ΓÇö is the foundation of informed civic participation.',
  },
];
