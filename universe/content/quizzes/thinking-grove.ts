/**
 * Quiz Questions ΓÇö Thinking Grove (Old Rowan)
 * Ethics / Critical Thinking
 *
 * 3 questions per entry, distributed across difficulty tiers.
 */
import type { EntryQuizQuestion } from '../types.js';

export const THINKING_GROVE_QUIZZES: readonly EntryQuizQuestion[] = [

  // ΓöÇΓöÇΓöÇ entry-ship-of-theseus ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-ship-of-theseus-t1',
    entryId: 'entry-ship-of-theseus',
    difficultyTier: 1,
    question: 'In the Ship of Theseus puzzle, what happens to the ship?',
    options: [
      'It sails so far away that nobody can find it',
      'Every single plank is replaced one at a time until no original plank is left',
      'It is painted a new colour and given a new name',
      'It is broken apart and used to build a house',
    ],
    correctIndex: 1,
    explanation: 'The puzzle goes like this: Theseus had a famous ship. People began replacing its old planks as they rotted. Eventually, every single plank had been replaced with a new one. The question that has puzzled philosophers for 2,500 years is: is it still the same ship? There is no easy answer ΓÇö and that is exactly the point.',
  },
  {
    id: 'quiz-ship-of-theseus-t2',
    entryId: 'entry-ship-of-theseus',
    difficultyTier: 2,
    question: 'The Ship of Theseus question applies to more than just ships. Where else does this same puzzle appear?',
    options: [
      'Only in ancient stories about heroes',
      'In your own body ΓÇö which replaces most of its cells every seven to ten years',
      'Only in shipbuilding and carpentry',
      'Only in libraries, when old books are replaced with new editions',
    ],
    correctIndex: 1,
    explanation: 'Your body replaces nearly all of its cells over seven to ten years through normal biological processes. The atoms that made up your hand a decade ago are mostly gone and replaced. So are you the same person you were at age three? The puzzle of identity ΓÇö what makes something (or someone) the same thing over time ΓÇö is one of philosophy\'s oldest and most important questions, and it shows up everywhere.',
  },
  {
    id: 'quiz-ship-of-theseus-t3',
    entryId: 'entry-ship-of-theseus',
    difficultyTier: 3,
    question: 'Old Rowan has been thinking about the Ship of Theseus for 200 years and still hasn\'t decided on an answer. What does this tell us about some philosophical questions?',
    options: [
      'Old Rowan is not very clever',
      'Philosophy is a waste of time since it never produces answers',
      'Some questions are valuable precisely because they resist final answers ΓÇö sitting with them sharpens our thinking more than any single answer could',
      'The question will eventually be solved by scientists with the right equipment',
    ],
    correctIndex: 2,
    explanation: 'Old Rowan considers 200 years of thinking "progress" ΓÇö not failure. Some questions are not meant to be resolved but used as tools. The Ship of Theseus has helped philosophers think more carefully about identity, continuity, legal ownership, and what makes something "the same." A question that stays alive for 2,500 years is doing important work. Learning to sit with uncertainty, rather than demanding immediate answers, is itself a form of intellectual maturity.',
  },

  // ΓöÇΓöÇΓöÇ entry-hammurabis-code ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-hammurabis-code-t1',
    entryId: 'entry-hammurabis-code',
    difficultyTier: 1,
    question: 'Why was Hammurabi\'s Code important when it was created about 4,000 years ago?',
    options: [
      'It was the first time anyone had a king',
      'It was the first time laws were written down where everyone could see them',
      'It listed all the animals that lived in Babylon',
      'It was used to teach children how to read',
    ],
    correctIndex: 1,
    explanation: 'Before Hammurabi\'s Code (~1754 BCE), laws were often decided on the spot by rulers or judges ΓÇö and people couldn\'t easily challenge them. By carving 282 laws onto a public stone stele over two metres tall, Hammurabi made the rules visible to everyone. This was a major step: if you could see the law, you could know in advance what was fair and what wasn\'t.',
  },
  {
    id: 'quiz-hammurabis-code-t2',
    entryId: 'entry-hammurabis-code',
    difficultyTier: 2,
    question: 'Hammurabi\'s Code included some ideas that seem fair today, but also some that seem very unfair. What does this tell us about justice?',
    options: [
      'That Hammurabi was a bad person who should not be studied',
      'That justice is perfect and does not change',
      'That ideas of justice evolve over time ΓÇö what counts as "fair" in one era may look very unfair in another',
      'That ancient laws are always more fair than modern ones',
    ],
    correctIndex: 2,
    explanation: 'Hammurabi\'s Code introduced the idea of "innocent until proven guilty" and matched punishments to the severity of crimes ΓÇö both progressive ideas for 1754 BCE. But it also had very different rules for rich and poor people, and for men and women. This dual nature is a lesson: every era has blind spots. Old Rowan teaches that studying past injustices helps us ask hard questions about the rules we live under today.',
  },
  {
    id: 'quiz-hammurabis-code-t3',
    entryId: 'entry-hammurabis-code',
    difficultyTier: 3,
    question: 'The stele with Hammurabi\'s Code is now in the Louvre in Paris. Old Rowan says: "They carved justice into stone so it couldn\'t be changed. But justice is a living thing." What is the tension Old Rowan is pointing to?',
    options: [
      'That stone is a bad material for carving',
      'That laws written in stone represent a tension between needing stability and needing the ability to grow and correct injustice over time',
      'That the Louvre should return the stele to Iraq',
      'That Hammurabi wanted his laws to last forever because he was vain',
    ],
    correctIndex: 1,
    explanation: 'Laws need to be stable enough to be trusted ΓÇö you can\'t have them change every day ΓÇö but they also need to be correctable when they are unjust. Stone laws cannot be edited. Written constitutions can be amended. Democratic legal systems can be challenged and reformed. The history of justice is a history of societies wrestling with exactly this tension: the need for permanence versus the need to grow. Old Rowan considers this question unfinished ΓÇö and necessary.',
  },

  // ΓöÇΓöÇΓöÇ entry-golden-rule-across-cultures ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-golden-rule-t1',
    entryId: 'entry-golden-rule-across-cultures',
    difficultyTier: 1,
    question: 'What is the Golden Rule?',
    options: [
      'Whoever has the most gold makes the rules',
      'Treat other people the way you want to be treated',
      'Always be first in line to get the best things',
      'Never share your belongings with anyone',
    ],
    correctIndex: 1,
    explanation: 'The Golden Rule is one of the simplest and most powerful ideas in the world: treat others the way you want to be treated. If you want kindness, be kind. If you want fairness, be fair. It\'s a rule that turns moral thinking into something any person can apply in any moment.',
  },
  {
    id: 'quiz-golden-rule-t2',
    entryId: 'entry-golden-rule-across-cultures',
    difficultyTier: 2,
    question: 'The Golden Rule appears independently in cultures all over the world ΓÇö in China, India, the Middle East, Africa, and the Americas. Nobody copied it from anyone else. Why is this so surprising and important?',
    options: [
      'It\'s a coincidence and doesn\'t mean anything',
      'It proves that a Chinese traveller must have shared it with every culture',
      'It suggests that this principle reflects something fundamental about how humans naturally think about fairness and how to live together',
      'It proves that all cultures are exactly the same',
    ],
    correctIndex: 2,
    explanation: 'When unconnected cultures independently arrive at the same idea ΓÇö across thousands of years with no contact between them ΓÇö it suggests the idea is rooted in something deep about human nature. Confucius, the Buddha, Hillel, Jesus, Muhammad, and indigenous traditions across multiple continents all arrived at essentially the same principle. This convergence is the strongest kind of evidence that the Golden Rule reflects genuine moral intuition, not just cultural habit.',
  },
  {
    id: 'quiz-golden-rule-t3',
    entryId: 'entry-golden-rule-across-cultures',
    difficultyTier: 3,
    question: 'The oldest known version of the Golden Rule comes from ancient Egypt, around 2000 BCE ΓÇö predating all major world religions. What does this tell us about morality and religion?',
    options: [
      'That religion invented morality and nothing moral existed before it',
      'That the Golden Rule is wrong because it predates religion',
      'That human moral reasoning can arrive at important ethical principles independently of any specific religious tradition',
      'That Egyptian people were more advanced than everyone else',
    ],
    correctIndex: 2,
    explanation: 'The Golden Rule\'s appearance in ancient Egypt before any of the major world religions existed suggests that moral reasoning is a human capacity, not something any single tradition owns. Every major religion later incorporated the principle ΓÇö which is why Old Rowan says "they all grew toward the same light." This matters for how we talk about ethics: it allows people of different faiths, and people with no faith, to find genuine common moral ground.',
  },

  // ΓöÇΓöÇΓöÇ entry-prisoners-dilemma ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  {
    id: 'quiz-prisoners-dilemma-t1',
    entryId: 'entry-prisoners-dilemma',
    difficultyTier: 1,
    question: 'In the Prisoner\'s Dilemma, two people each face a choice. What are the two options?',
    options: [
      'Run away or stay still',
      'Cooperate with the other person or only help yourself',
      'Tell the truth or lie to a judge',
      'Choose a prize or give it away',
    ],
    correctIndex: 1,
    explanation: 'Each person can either cooperate ΓÇö act in a way that helps both of them ΓÇö or defect ΓÇö act in a way that only helps themselves. If both cooperate, both do well. If one defects while the other cooperates, the defector wins big and the cooperator loses. If both defect, both lose. The puzzle is deciding which to choose when you don\'t know what the other person will do.',
  },
  {
    id: 'quiz-prisoners-dilemma-t2',
    entryId: 'entry-prisoners-dilemma',
    difficultyTier: 2,
    question: 'In tournaments where players could choose any strategy, one very simple strategy won most consistently. What was it?',
    options: [
      'Always defect ΓÇö never cooperate with anyone',
      'Always cooperate ΓÇö never look after yourself',
      'Choose randomly ΓÇö sometimes cooperate, sometimes defect',
      'Cooperate first, then copy whatever the other player did in the previous round',
    ],
    correctIndex: 3,
    explanation: 'This strategy is called "tit-for-tat." It starts by cooperating (giving trust) and then mirrors whatever the other player did. If they cooperated, cooperate again. If they defected, defect once to signal consequences ΓÇö then go back to cooperating if they do. Researcher Robert Axelrod found this strategy reliably outperformed purely selfish and purely generous strategies. Old Rowan calls it: start kind, stay fair, forgive quickly.',
  },
  {
    id: 'quiz-prisoners-dilemma-t3',
    entryId: 'entry-prisoners-dilemma',
    difficultyTier: 3,
    question: 'The Prisoner\'s Dilemma appears in real life outside of games. Which of these is a real-world example?',
    options: [
      'Choosing what to eat for lunch',
      'Deciding which colour to paint a wall',
      'Climate change ΓÇö every country can pollute less (cooperate) or keep polluting (defect), knowing that one country\'s sacrifice helps everyone but one country\'s defection harms everyone',
      'Picking a team name for a school project',
    ],
    correctIndex: 2,
    explanation: 'Climate negotiations are a classic Prisoner\'s Dilemma at a global scale. Every nation benefits if all nations reduce pollution ΓÇö but any single nation can "defect" by continuing to pollute, getting short-term economic benefits while others bear the cost of reducing emissions. Without mechanisms that reward cooperation and penalise defection, the individually rational choice leads to collective disaster. The Prisoner\'s Dilemma explains why global cooperation is so hard ΓÇö and why trust-building agreements matter so much.',
  },
];
