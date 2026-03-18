/**
 * Quiz Questions ΓÇö Debate Arena (Theo Papadopoulos)
 * Persuasive Writing
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const DEBATE_ARENA_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-aristotle-persuasion ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-aristotle-t1',
    entryId: 'entry-aristotle-persuasion',
    difficultyTier: 1,
    question: 'Aristotle identified three main ways to persuade people. Which of the following are his three pillars?',
    options: [
      'Volume, speed, and repetition',
      'Logos (logic and evidence), pathos (emotion), and ethos (trustworthiness)',
      'Writing, speaking, and drawing',
      'Facts, threats, and rewards',
    ],
    correctIndex: 1,
    explanation: 'Aristotle\'s three pillars of persuasion are logos (using facts and logic), pathos (appealing to emotions), and ethos (using the speaker\'s credibility and trustworthiness). Every argument you have ever heard uses at least one of these ΓÇö the best arguments use all three in balance.',
  },
  {
    id: 'quiz-aristotle-t2',
    entryId: 'entry-aristotle-persuasion',
    difficultyTier: 2,
    question: 'Aristotle argued that an effective argument needs all three pillars in balance. What goes wrong if a speaker uses only emotions (pathos) without any evidence (logos)?',
    options: [
      'The argument becomes too long and the audience gets bored',
      'The argument becomes manipulation rather than persuasion ΓÇö it bypasses reason and exploits feeling',
      'The audience will always believe an emotional speaker, making the argument too powerful',
      'Without logos, the speaker won\'t sound confident enough to be believed',
    ],
    correctIndex: 1,
    explanation: 'Pure emotional appeal without evidence can make audiences feel strongly about something without giving them any rational basis for the belief. This is manipulation ΓÇö it exploits feelings rather than informing judgment. Aristotle saw the balance of all three pillars as the mark of honest, effective communication.',
  },
  {
    id: 'quiz-aristotle-t3',
    entryId: 'entry-aristotle-persuasion',
    difficultyTier: 3,
    question: 'Aristotle\'s Rhetoric was written in 4th century BCE and is still taught in every debate and communications programme today. What does this longevity tell us?',
    options: [
      'That communication has not changed at all in 2,400 years',
      'That some insights about human persuasion are fundamental enough to remain true across radically different cultures, technologies, and time periods',
      'That modern teachers are simply too conservative to find newer and better frameworks',
      'That Greek philosophy is the only valid foundation for studying communication',
    ],
    correctIndex: 1,
    explanation: 'Some frameworks describe something so fundamental about human nature ΓÇö how we reason, how we feel, why we trust ΓÇö that they outlast their cultural moment. Aristotle identified patterns that appear because of how human minds work, not because of anything specific to his time. That is the definition of a foundational insight.',
  },

  // ΓöÇΓöÇΓöÇ entry-lincoln-douglas-debates ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-lincoln-douglas-t1',
    entryId: 'entry-lincoln-douglas-debates',
    difficultyTier: 1,
    question: 'What were Abraham Lincoln and Stephen Douglas debating about in their seven famous debates in 1858?',
    options: [
      'Whether America should fight a war against Mexico',
      'Whether slavery should be allowed to spread to new states',
      'Whether the United States should build a transcontinental railroad',
      'Whether women should be allowed to vote',
    ],
    correctIndex: 1,
    explanation: 'Lincoln and Douglas debated whether slavery should be permitted to expand into new western territories. Lincoln argued against it. Douglas argued for popular sovereignty ΓÇö letting each new state decide for itself. Lincoln lost the Senate election but his arguments were powerful enough to help him win the presidency two years later.',
  },
  {
    id: 'quiz-lincoln-douglas-t2',
    entryId: 'entry-lincoln-douglas-debates',
    difficultyTier: 2,
    question: 'Each Lincoln-Douglas debate lasted three hours, with an hour-long opening, an hour-and-a-half rebuttal, and a 30-minute closing. What does this format demand from both speakers and audience?',
    options: [
      'That both sides memorise their speeches before the debate begins',
      'That arguments are fully developed, evidence is presented carefully, and both sides must engage with each other\'s actual points rather than simply repeating slogans',
      'That the speakers use simple language so ordinary farmers can understand',
      'That judges have time to write detailed scores for each section',
    ],
    correctIndex: 1,
    explanation: 'A three-hour format cannot be filled with slogans and attack lines. It requires sustained, substantive argument. The long rebuttal period means each speaker must actually respond to what the other said rather than ignore it. This depth is why the debates are still studied as primary documents of democratic discourse.',
  },
  {
    id: 'quiz-lincoln-douglas-t3',
    entryId: 'entry-lincoln-douglas-debates',
    difficultyTier: 3,
    question: 'Lincoln lost the 1858 Senate race to Douglas but won the moral argument ΓÇö and the 1860 presidential election. What does this reveal about the relationship between winning a debate and winning an argument?',
    options: [
      'That elections are more important than debates in deciding who is right',
      'That the impact of a well-made argument can extend far beyond the immediate outcome ΓÇö truth can win in history even when it loses in the room',
      'That Lincoln was lucky the political situation changed between 1858 and 1860',
      'That Douglas must have used unfair debate tactics that eventually backfired',
    ],
    correctIndex: 1,
    explanation: 'Lincoln\'s arguments about the moral problem of slavery were read across the country in newspaper transcripts of the debates. They built his reputation as a principled thinker. The immediate vote went to Douglas, but the long argument ΓÇö the one history judges ΓÇö went to Lincoln. Some arguments take time to win.',
  },

  // ΓöÇΓöÇΓöÇ entry-logical-fallacies ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-fallacies-t1',
    entryId: 'entry-logical-fallacies',
    difficultyTier: 1,
    question: 'What is a logical fallacy?',
    options: [
      'A very long and complicated argument that is hard to understand',
      'A pattern of reasoning that sounds convincing but is actually broken or wrong',
      'An argument made by someone who is not very educated',
      'A disagreement between two people who both think they are right',
    ],
    correctIndex: 1,
    explanation: 'A logical fallacy is an argument that looks valid on the surface but has a hidden flaw in its reasoning. Learning to recognise fallacies is like learning to spot counterfeit money ΓÇö it protects you from being persuaded by arguments that only feel convincing.',
  },
  {
    id: 'quiz-fallacies-t2',
    entryId: 'entry-logical-fallacies',
    difficultyTier: 2,
    question: 'An ad hominem fallacy is when someone attacks the person making an argument instead of addressing the argument itself. Why is this a logical error?',
    options: [
      'Because insulting people is always wrong and polite debaters never do it',
      'Because whether a person is good or bad has no bearing on whether their argument is correct or incorrect',
      'Because personal attacks distract the audience and make them feel uncomfortable',
      'Because the person being attacked might be someone important',
    ],
    correctIndex: 1,
    explanation: 'Even an unpleasant or dishonest person can make a correct argument. If I claim the Earth orbits the Sun and you respond by calling me stupid, you have not addressed whether the Earth orbits the Sun. The truth of an argument is independent of the character of the person making it.',
  },
  {
    id: 'quiz-fallacies-t3',
    entryId: 'entry-logical-fallacies',
    difficultyTier: 3,
    question: 'Logical fallacies appear constantly in advertising, politics, and social media ΓÇö not because people are stupid, but because these patterns exploit predictable features of how human brains process information. What does this suggest about critical thinking?',
    options: [
      'That critical thinking is only needed by scientists and philosophers',
      'That critical thinking is an active skill that requires deliberate effort ΓÇö our default responses can be fooled, and we must consciously override them',
      'That social media should be banned to protect people from fallacies',
      'That most people cannot be taught to recognise fallacies',
    ],
    correctIndex: 1,
    explanation: 'Our brains evolved shortcuts ΓÇö we trust people who are confident, we agree with popular views, we prefer simple two-option choices. Fallacies exploit exactly these shortcuts. Critical thinking is the habit of pausing and asking: "Does this argument actually follow?" It is a learnable skill, not a natural gift, and learning it makes you harder to manipulate.',
  },

  // ΓöÇΓöÇΓöÇ entry-malala-un-speech ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-malala-t1',
    entryId: 'entry-malala-un-speech',
    difficultyTier: 1,
    question: 'What was Malala Yousafzai speaking about when she addressed the United Nations in 2013?',
    options: [
      'The importance of reducing pollution in developing countries',
      'Every child\'s right to an education',
      'The need for more women in politics',
      'Peace between India and Pakistan',
    ],
    correctIndex: 1,
    explanation: 'Malala spoke about every child\'s right to education. She had been shot by the Taliban for attending school and continued advocating for girls\' education after surviving. She addressed the UN Youth Assembly nine months after the attack, at sixteen years old.',
  },
  {
    id: 'quiz-malala-t2',
    entryId: 'entry-malala-un-speech',
    difficultyTier: 2,
    question: 'Malala said: "They thought that the bullets would silence us. But they failed." How does this sentence use pathos, and what makes it effective?',
    options: [
      'It uses pathos by making the audience feel afraid of the Taliban',
      'It uses pathos by transforming personal suffering into universal defiance ΓÇö turning her specific experience into a statement about the unstoppable nature of human determination',
      'It uses pathos by describing the physical pain she experienced',
      'It uses pathos by blaming specific people for causing harm',
    ],
    correctIndex: 1,
    explanation: 'The sentence moves from "they tried to silence me" to "but they failed" ΓÇö from violence to resilience, from specific to universal. It does not ask for sympathy; it asserts strength. This makes it emotionally powerful not through pity but through inspiration. Theo calls this "controlled pathos" ΓÇö emotion shaped into a point rather than spilled.',
  },
  {
    id: 'quiz-malala-t3',
    entryId: 'entry-malala-un-speech',
    difficultyTier: 3,
    question: 'Malala\'s speech used all three of Aristotle\'s pillars: ethos (she was a survivor), pathos (controlled emotion), and logos (citing the Universal Declaration of Human Rights). Why is the combination of all three more persuasive than any one alone?',
    options: [
      'Because using three arguments is always better than using one',
      'Because different audience members respond to different modes ΓÇö some are moved by evidence, some by emotion, some by the speaker\'s credibility ΓÇö and reaching all three means reaching everyone',
      'Because the UN requires all speakers to use all three rhetorical forms',
      'Because three-part speeches are easier to remember than single-argument speeches',
    ],
    correctIndex: 1,
    explanation: 'A purely logical argument may not move someone who is not already engaged. Pure emotion without evidence can be dismissed as sentimentality. Credibility alone may not provide direction. When ethos establishes why the speaker should be trusted, pathos creates emotional engagement, and logos provides the rational case, the combined effect is far more robust than any element alone.',
  },
];
